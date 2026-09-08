// /api/llm/chat - 大模型 API 代理（解决浏览器 CORS 问题，兼容流式与非流式）
export async function onRequestPost(context) {
    const { request, env } = context;
    try {
        const body = await request.json();
        const apiKey = env.LLM_API_KEY || request.headers.get('X-Local-LLM-Key');
        const baseUrl = body.baseUrl || 'https://api.deepseek.com';
        const model = body.model || 'deepseek-v4-flash';

        if (!apiKey) {
            return new Response(JSON.stringify({ error: "Missing LLM API Key" }), {
                status: 401,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
        }

        // 构建请求体：用 ?? 避免 0 被覆盖，兼容 thinking/reasoning_effort/stream_options
        const requestBody = {
            model: model,
            messages: body.messages,
            temperature: body.temperature ?? 0.8,
            top_p: body.top_p ?? 0.9,
            stream: body.stream === true
        };
        if (body.thinking !== undefined) {
            requestBody.thinking = body.thinking;
        }
        if (body.reasoning_effort !== undefined) {
            requestBody.reasoning_effort = body.reasoning_effort;
        }
        if (body.stream_options !== undefined) {
            requestBody.stream_options = body.stream_options;
        }

        const res = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        if (!res.ok) {
            const errText = await res.text();
            return new Response(JSON.stringify({ error: `LLM API error: ${errText}` }), {
                status: res.status,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
        }

        // 流式请求：用 TransformStream 逐块转发 SSE
        if (body.stream === true) {
            const headers = new Headers(res.headers);
            headers.set("Content-Type", "text/event-stream; charset=utf-8");
            headers.set("Cache-Control", "no-cache, no-transform");
            headers.set("Connection", "keep-alive");
            headers.set("X-Accel-Buffering", "no");
            headers.set("Access-Control-Allow-Origin", "*");
            headers.delete("Content-Length");

            const { readable, writable } = new TransformStream();
            res.body.pipeTo(writable);
            return new Response(readable, {
                status: res.status,
                statusText: res.statusText,
                headers: headers
            });
        }

        // 非流式：一次性返回 JSON
        const data = await res.json();
        return new Response(JSON.stringify(data), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
    }
}

// 处理 OPTIONS 预检请求
export async function onRequestOptions(context) {
    return new Response(null, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, X-Local-LLM-Key"
        }
    });
}
