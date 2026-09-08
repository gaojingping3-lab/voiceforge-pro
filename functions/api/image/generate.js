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
      console.log('[Agnes] model:', agnesModel);
      console.log('[Agnes] prompt length:', prompt.length);

      // 尝试两个 endpoint：.cn（国内）和 .com（国际）
      const endpoints = [
        'https://apihub.agnes-ai.cn/v1/images/generations',
        'https://apihub.agnes-ai.com/v1/images/generations'
      ];

      let lastError = null;
      let imageBytes = null;
      let imageContentType = 'image/png';

      for (let epIdx = 0; epIdx < endpoints.length; epIdx++) {
        const endpoint = endpoints[epIdx];
        console.log('[Agnes] trying endpoint:', endpoint);

        try {
          // 请求体：同时兼容 response_format 顶层和 extra_body 两种写法
          const requestBody = {
            model: agnesModel,
            prompt: prompt,
            size: '1024x1024',
            n: 1,
            response_format: 'b64_json',
            extra_body: { response_format: 'b64_json' }
          };

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${agnesApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });

          console.log('[Agnes] status:', response.status);

          if (!response.ok) {
            // 收集完整错误信息返回给前端
            let errDetail = '';
            try {
              const errData = await response.json();
              console.log('[Agnes] error response:', JSON.stringify(errData));
              errDetail = [
                errData.error?.message,
                errData.error?.code ? `(code: ${errData.error.code})` : '',
                errData.message,
                errData.code ? `(code: ${errData.code})` : ''
              ].filter(Boolean).join(' ');
            } catch (e) {
              try { errDetail = await response.text(); } catch (e2) {}
            }
            const fullErr = `Agnes API ${response.status}: ${errDetail || '未知错误'} [endpoint: ${epIdx === 0 ? '.cn' : '.com'}]`;
            lastError = new Error(fullErr);
            // 401/403 是Key问题，不重试下一个endpoint
            if (response.status === 401 || response.status === 403) break;
            continue; // 试下一个endpoint
          }

          const data = await response.json();
          console.log('[Agnes] response keys:', Object.keys(data));
          console.log('[Agnes] data[0] keys:', data.data?.[0] ? Object.keys(data.data[0]) : 'none');

          const item = data.data?.[0];
          if (!item) {
            lastError = new Error('Agnes 返回数据为空: ' + JSON.stringify(data).substring(0, 200));
            continue;
          }

          // 同时兼容 b64_json 和 url 两种返回格式
          if (item.b64_json) {
            let b64 = item.b64_json;
            // 处理 Data URI 前缀（data:image/png;base64,xxx）
            if (b64.startsWith('data:')) {
              const match = b64.match(/^data:([^;]+);base64,(.+)$/);
              if (match) {
                imageContentType = match[1] || 'image/png';
                b64 = match[2];
              }
            }
            // base64 转二进制
            const binaryString = atob(b64);
            imageBytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              imageBytes[i] = binaryString.charCodeAt(i);
            }
            console.log('[Agnes] got b64_json, bytes:', imageBytes.length, 'type:', imageContentType);
            break; // 成功，跳出endpoint循环
          } else if (item.url) {
            // 返回的是URL，需要下载图片
            console.log('[Agnes] got url, downloading:', item.url.substring(0, 80) + '...');
            const imgRes = await fetch(item.url);
            if (!imgRes.ok) {
              lastError = new Error(`Agnes 图片下载失败: ${imgRes.status}`);
              continue;
            }
            imageContentType = imgRes.headers.get('Content-Type') || 'image/png';
            const imgBuffer = await imgRes.arrayBuffer();
            imageBytes = new Uint8Array(imgBuffer);
            console.log('[Agnes] downloaded image, bytes:', imageBytes.length, 'type:', imageContentType);
            break; // 成功
          } else {
            lastError = new Error('Agnes 返回格式不支持，data[0]字段: ' + Object.keys(item).join(',') + ' 原始: ' + JSON.stringify(data).substring(0, 300));
            continue;
          }
        } catch (e) {
          console.log('[Agnes] fetch error:', e.message);
          lastError = e;
          continue;
        }
      }

      if (!imageBytes) {
        throw lastError || new Error('Agnes 生图失败，所有endpoint均不可用');
      }

      return new Response(imageBytes, {
        status: 200,
        headers: {
          'Content-Type': imageContentType,
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
