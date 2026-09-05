
export async function onRequestPost(context) {
    const { request } = context;
    return new Response(JSON.stringify({ error: "Aliyun TTS requires token generation. Please use Fish Audio or SiliconFlow." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
    });
}
