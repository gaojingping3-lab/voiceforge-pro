// Cloudflare Workers AI 生图接口
// 使用 DreamShaper 8 LCM 模型（SD微调，偏写实，审核宽松，生成快），免费
// 返回 PNG 图片二进制数据

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const prompt = body.prompt || '';

    if (!prompt.trim()) {
      return new Response(JSON.stringify({ error: '提示词不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 调用 Cloudflare Workers AI 生图
    // DreamShaper 8 LCM 是 SD 1.5 的微调模型，LCM版本生成速度快
    const result = await env.AI.run(
      '@cf/lykon/dreamshaper-8-lcm',
      {
        prompt: prompt,
        num_steps: 8,
        guidance: 1.5
      }
    );

    // 兼容两种返回格式：
    // 1. { image: "base64字符串" }（Flux格式）
    // 2. 直接返回二进制数据（SDXL格式，可能是 Uint8Array 或 ReadableStream）
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
