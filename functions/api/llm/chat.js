// /api/llm/chat - 大模型 API 代理（解决浏览器 CORS 问题）
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

        const res = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: model,
                messages: body.messages,
                temperature: body.temperature || 0.8,
                stream: false
            })
        });

        if (!res.ok) {
            const errText = await res.text();
            return new Response(JSON.stringify({ error: `LLM API error: ${errText}` }), {
                status: res.status,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
        }

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
