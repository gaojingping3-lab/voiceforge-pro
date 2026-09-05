
// /api/fish/tts
export async function onRequestPost(context) {
    const { request, env } = context;
    try {
        const body = await request.json();
        const apiKey = env.FISH_API_KEY || request.headers.get('X-Local-Api-Key');
        
        if (!apiKey) {
            return new Response(JSON.stringify({ error: "Missing API Key" }), { status: 401 });
        }

        // Redirecting to Fish TTS API (V1)
        const res = await fetch("https://api.fish.audio/v1/tts", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text: body.text,
                reference_id: body.voiceId || "default"
            })
        });
        
        // Pass the audio buffer stream back to frontend
        return new Response(res.body, {
            headers: { "Content-Type": "audio/mpeg" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
