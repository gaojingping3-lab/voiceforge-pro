// functions/api/aliyun/clone.js - 阿里云声音复刻代理路由
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Local-Api-Key",
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost(context) {
  return new Response(
    JSON.stringify({
      error: "当前阿里云语音复刻需在阿里云智能语音交互控制台开通并预先训练音色模型。请将训练生成的 Voice ID 直接填入「模型 ID」输入框使用。",
      code: "ALIYUN_CLONE_NOT_DIRECTLY_SUPPORTED"
    }),
    {
      status: 501,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    }
  );
}
