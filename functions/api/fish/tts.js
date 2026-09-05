
export async function onRequestPost(context) {
    const { request, env } = context;
    try {
        const body = await request.json();
        const apiKey = env.FISH_API_KEY || request.headers.get('X-Local-Api-Key');
        
        if (!apiKey) {
            return new Response(JSON.stringify({ error: "Missing Fish Audio API Key." }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }

        const payload = {
            text: body.text,
            format: body.format || "mp3",
            reference_id: body.voiceId || null,
            normalize: true
        };

        const fishResponse = await fetch("https://api.fish.audio/v1/tts", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "User-Agent": "VoiceForge/1.0"
            },
            body: JSON.stringify(payload)
        });

        if (!fishResponse.ok) {
            const errText = await fishResponse.text();
            return new Response(JSON.stringify({ error: `Fish Audio API error: ${errText}` }), {
                status: fishResponse.status,
                headers: { "Content-Type": "application/json" }
            });
        }

        return new Response(fishResponse.body, {
            headers: {
                "Content-Type": body.format === "wav" ? "audio/wav" : "audio/mpeg",
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
