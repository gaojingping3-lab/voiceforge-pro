// functions/api/chat.js - 大模型 API 同源中转（支持动态 Base URL + 流式输出）
export async function onRequest(context) {
  const { request } = context;

  // 1. 处理浏览器的 OPTIONS 跨域预检请求
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const bodyText = await request.text();
    const body = JSON.parse(bodyText);

    // 2. 从请求体读取动态 Base URL（支持切换任意 OpenAI 兼容接口）
    const baseUrl = body.baseUrl || "https://api.deepseek.com";
    // 移除 baseUrl 字段，不转发给目标 API
    delete body.baseUrl;

    // 3. 由 Cloudflare 边缘节点向目标 API 发起请求
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": request.headers.get("Authorization") || "",
      },
      body: JSON.stringify(body),
    });

    // 4. 流式响应：直接透传 body，确保不缓冲
    const isStream = body.stream === true;
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    if (isStream) {
      // 强制流式响应头，防止缓冲
      headers.set("Content-Type", "text/event-stream");
      headers.set("Cache-Control", "no-cache");
      headers.set("Connection", "keep-alive");
      headers.delete("Content-Length");
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: headers,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
