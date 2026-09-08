// 生图接口
// 支持四个模型：DreamShaper / Flux(Cloudflare) / SDXL / Pollinations Flux
// 返回图片二进制数据

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const prompt = body.prompt || '';
    const model = body.model || 'dreamshaper';

    if (!prompt.trim()) {
      return new Response(JSON.stringify({ error: '提示词不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Pollinations.ai：第三方免费生图，几乎无内容审核，flux模型写实
    if (model === 'pollinations') {
      const encodedPrompt = encodeURIComponent(prompt);
      const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=flux&width=1024&height=1024&nologo=true`;

      // 最多重试3次，遇到429限流时等待后重试
      let lastError = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await fetch(url, {
            headers: { 'User-Agent': 'VoiceForge-Pro/1.0' }
          });

          if (response.status === 429) {
            // 被限流，等待2-4秒后重试
            const waitTime = 2000 + attempt * 1000;
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }

          if (!response.ok) {
            throw new Error(`Pollinations API 错误: ${response.status}`);
          }

          // 直接把第三方返回的图片流转发给前端
          return new Response(response.body, {
            status: 200,
            headers: {
              'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
              'Cache-Control': 'no-cache'
            }
          });
        } catch (e) {
          lastError = e;
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      throw lastError || new Error('Pollinations API 请求失败');
    }

    // Cloudflare Workers AI 模型
    const modelConfigs = {
      dreamshaper: {
        id: '@cf/lykon/dreamshaper-8-lcm',
        params: { prompt: prompt, num_steps: 8 }
      },
      flux: {
        id: '@cf/black-forest-labs/flux-1-schnell',
        params: { prompt: prompt }
      },
      sdxl: {
        id: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
        params: { prompt: prompt, num_steps: 15, guidance: 5.0 }
      }
    };

    const config = modelConfigs[model] || modelConfigs.dreamshaper;

    // 调用 Cloudflare Workers AI 生图
    const result = await env.AI.run(config.id, config.params);

    // 兼容多种返回格式：
    // 1. { image: "base64字符串" }（Flux格式）
    // 2. 直接返回二进制数据（Uint8Array 或 ReadableStream）
    let imageBytes;

    if (result && typeof result === 'object' && result.image) {
      // 格式1：base64 字符串
      const base64 = result.image;
      const binaryString = atob(base64);
      imageBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        imageBytes[i] = binaryString.charCodeAt(i);
      }
    } else if (result instanceof Uint8Array) {
      // 格式2a：Uint8Array
      imageBytes = result;
    } else if (result && result.arrayBuffer) {
      // 格式2b：ReadableStream 或 Blob
      const buffer = await result.arrayBuffer();
      imageBytes = new Uint8Array(buffer);
    } else {
      // 兜底：直接当二进制数据返回
      return new Response(result, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache'
        }
      });
    }

    // 返回 PNG 图片二进制数据
    return new Response(imageBytes, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('生图失败:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || '生图失败，请稍后重试'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
