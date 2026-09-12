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
    let baseUrl = body.baseUrl || "https://api.deepseek.com";
    // 移除 baseUrl 字段，不转发给目标 API
    delete body.baseUrl;

    // 2.2 安全校验：防止公开站点被当任意代理（SSRF）——只放行 https 公网域名，拒绝内网/本机/裸 IP
    try {
      const u = new URL(baseUrl);
      if (u.protocol !== "https:") throw new Error("protocol");
      const host = u.hostname.toLowerCase();
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) throw new Error("raw-ip");
      if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) throw new Error("localhost");
      if (/^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) throw new Error("private-ip");
    } catch (e) {
      return new Response(JSON.stringify({ error: `baseUrl 不合法或已被阻止（${e.message}）：仅支持 https 公网域名` }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // 2.5 滑动窗口截断：system人设永久保留，聊天历史只保留最近8条（4轮对话）
    if (body.useSlideWindow === true && Array.isArray(body.messages)) {
      const systemMsgs = body.messages.filter(m => m.role === "system");
      const chatMsgs = body.messages.filter(m => m.role !== "system");
      const maxKeep = 8;
      const trimmedChat = chatMsgs.length > maxKeep ? chatMsgs.slice(-maxKeep) : chatMsgs;
      body.messages = [...systemMsgs, ...trimmedChat];
    }
    delete body.useSlideWindow; // 不转发给目标API

    // 3. 由 Cloudflare 边缘节点向目标 API 发起请求
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": request.headers.get("Authorization") || "",
      },
      body: JSON.stringify(body),
    });

    // 4. 流式响应：用 TransformStream 强制逐块转发，防止缓冲
    const isStream = body.stream === true;
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", "*");

    if (isStream) {
      // 强制流式响应头
      headers.set("Content-Type", "text/event-stream; charset=utf-8");
      headers.set("Cache-Control", "no-cache, no-transform");
      headers.set("Connection", "keep-alive");
      headers.set("X-Accel-Buffering", "no");
      headers.delete("Content-Length");

      // 用 TransformStream 强制逐块转发
      const { readable, writable } = new TransformStream();
      response.body.pipeTo(writable);
      return new Response(readable, {
        status: response.status,
        statusText: response.statusText,
        headers: headers,
      });
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
