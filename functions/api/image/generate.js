// 生图接口
// 支持 Pollinations（免费无密钥）和 Agnes Image（免费需注册API Key）
// 返回图片二进制数据

export async function onRequestPost(context) {
  try {
    const { request } = context;
    const body = await request.json();
    const prompt = body.prompt || '';
    const model = body.model || 'pollinations-flux';
    const agnesApiKey = body.agnesApiKey || '';

    if (!prompt.trim()) {
      return new Response(JSON.stringify({ error: '提示词不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ========== Agnes Image 2.1 Flash ==========
    if (model.startsWith('agnes-')) {
      if (!agnesApiKey) {
        return new Response(JSON.stringify({ error: 'Agnes API Key 未配置，请在生图页面输入' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const agnesModel = model === 'agnes-2.1' ? 'agnes-image-2.1-flash' : 'agnes-image-2.0-flash';

      const response = await fetch('https://apihub.agnes-ai.cn/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${agnesApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: agnesModel,
          prompt: prompt,
          size: '1024x1024',
          response_format: 'b64_json'
        })
      });

      if (!response.ok) {
        let errMsg = `Agnes API 错误: ${response.status}`;
        try {
          const errData = await response.json();
          errMsg = errData.error?.message || errData.message || errMsg;
        } catch (e) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      const b64 = data.data?.[0]?.b64_json;
      if (!b64) {
        throw new Error('Agnes 返回数据格式错误');
      }

      // base64 转二进制
      const binaryString = atob(b64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return new Response(bytes, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache'
        }
      });
    }

    // ========== Pollinations 系列 ==========
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
          const waitTime = 2000 + attempt * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        if (!response.ok) {
          throw new Error(`Pollinations API 错误: ${response.status}`);
        }

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
