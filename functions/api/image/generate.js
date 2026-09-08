// Cloudflare Workers AI 生图接口
// 使用 Flux 1 Schnell 模型，免费额度每天约230张
// 直接返回图片二进制数据，前端用 Blob URL 显示

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
    // Flux 1 Schnell 只接受 prompt 参数
    const imageBuffer = await env.AI.run(
      '@cf/black-forest-labs/flux-1-schnell',
      { prompt: prompt }
    );

    // 直接返回图片二进制数据
    return new Response(imageBuffer, {
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
