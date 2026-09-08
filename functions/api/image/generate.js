// Cloudflare Workers AI 生图接口
// 使用 Flux 1 Schnell 模型，免费额度每天约230张

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const prompt = body.prompt || '';
    const negativePrompt = body.negative_prompt || '';
    const numSteps = body.num_steps || 4;
    const width = body.width || 1024;
    const height = body.height || 1024;

    if (!prompt.trim()) {
      return new Response(JSON.stringify({ error: '提示词不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 调用 Cloudflare Workers AI 生图
    const inputs = {
      prompt: prompt,
      num_steps: numSteps,
      width: width,
      height: height
    };

    if (negativePrompt) {
      inputs.negative_prompt = negativePrompt;
    }

    const response = await env.AI.run(
      '@cf/black-forest-labs/flux-1-schnell',
      inputs
    );

    // response 是 ArrayBuffer，转成 base64 返回
    const base64 = btoa(
      new Uint8Array(response).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );

    return new Response(JSON.stringify({
      success: true,
      image: `data:image/png;base64,${base64}`,
      prompt: prompt,
      width: width,
      height: height
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
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
