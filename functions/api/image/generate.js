// 生图接口
// 只支持 Pollinations 系列模型（无审核、免费）
// 返回图片二进制数据

export async function onRequestPost(context) {
  try {
    const { request } = context;
    const body = await request.json();
    const prompt = body.prompt || '';
    const model = body.model || 'pollinations-flux';

    if (!prompt.trim()) {
      return new Response(JSON.stringify({ error: '提示词不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 只支持 Pollinations 系列模型
    if (!model.startsWith('pollinations-')) {
      return new Response(JSON.stringify({ error: `不支持的模型: ${model}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const pollinationsModel = model.replace('pollinations-', '');
    const encodedPrompt = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=${pollinationsModel}&width=1024&height=1024&nologo=true`;

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
