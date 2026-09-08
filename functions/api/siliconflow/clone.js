// functions/api/siliconflow/clone.js - 硅基流动声音克隆代理路由
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
      error: "硅基流动暂未开放公开即时声音克隆接口，建议使用 Fish Audio 或将已部署的微调模型 ID 直接填入「模型 ID」使用。",
      code: "SILICONFLOW_CLONE_UNAVAILABLE"
    }),
    {
      status: 501,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    }
  );
}
