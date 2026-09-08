// Cloudflare Workers AI 生图接口
// 使用 Flux 1 Schnell 模型，免费额度每天约230张
// 返回 JPEG 图片二进制数据

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
    // Flux 1 Schnell 返回 { image: "base64字符串" }，格式是 JPEG
    const result = await env.AI.run(
      '@cf/black-forest-labs/flux-1-schnell',
      { prompt: prompt }
    );

    // 从 base64 转换成二进制
    const base64 = result.image;
    const binaryString = atob(base64);
    const imgBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      imgBytes[i] = binaryString.charCodeAt(i);
    }

    // 直接返回 JPEG 图片二进制数据
    return new Response(imgBytes, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
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
