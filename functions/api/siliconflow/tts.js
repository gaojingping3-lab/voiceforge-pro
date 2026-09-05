
export async function onRequestPost(context) {
    const { request, env } = context;
    try {
        const body = await request.json();
        const apiKey = env.SILICONFLOW_API_KEY || request.headers.get('X-Local-Api-Key');
        
        if (!apiKey) {
            return new Response(JSON.stringify({ error: "Missing SiliconFlow API Key." }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }

        const payload = {
            model: body.voiceId || "FunAudioLLM/CosyVoice2-0.5B",
            input: body.text,
            response_format: body.format || "mp3",
            speed: body.speed || 1.0
        };

        const siliResponse = await fetch("https://api.siliconflow.cn/v1/audio/speech", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!siliResponse.ok) {
            const errText = await siliResponse.text();
            return new Response(JSON.stringify({ error: `SiliconFlow API error: ${errText}` }), {
                status: siliResponse.status,
                headers: { "Content-Type": "application/json" }
            });
        }

        return new Response(siliResponse.body, {
            headers: {
                "Content-Type": "audio/mpeg",
                "Access-Control-Allow-Origin": "*"
            }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
