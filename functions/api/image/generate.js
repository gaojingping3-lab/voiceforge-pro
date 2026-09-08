// Cloudflare Workers AI 生图接口
// 支持三个模型：DreamShaper 8 LCM / Flux 1 Schnell / Stable Diffusion XL
// 返回 PNG 图片二进制数据

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

    // 根据模型选择配置
    const modelConfigs = {
      dreamshaper: {
        id: '@cf/lykon/dreamshaper-8-lcm',
        params: { prompt: prompt, num_steps: 6 }
      },
      flux: {
        id: '@cf/black-forest-labs/flux-1-schnell',
        params: { prompt: prompt }
      },
      sdxl: {
        id: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
        params: { prompt: prompt, num_steps: 20, guidance: 7.5 }
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
