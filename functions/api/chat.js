// functions/api/chat.js - 大模型 API 同源中转（支持动态 Base URL，可切换任意 OpenAI 兼容接口）
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

    // 4. 返回响应并追加 CORS 允许头
    const newResponse = new Response(response.body, response);
    newResponse.headers.set("Access-Control-Allow-Origin", "*");
    return newResponse;
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
