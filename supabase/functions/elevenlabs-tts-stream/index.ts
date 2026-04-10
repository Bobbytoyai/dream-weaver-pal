/**
 * ElevenLabs TTS Streaming — returns audio stream for immediate playback.
 * Uses eleven_turbo_v2_5 for lowest latency.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// 3 French voice profiles for Bobby
// 🎭 Cartoon = fun, animated, playful (dessin animé)
// 👩 Maman = warm, reassuring, slightly funny
// 👨 Papa = deep, calm, protective
const VOICE_PROFILES: Record<string, { voiceId: string; stability: number; similarity_boost: number; style: number; speed: number }> = {
  child: {
    voiceId: "pFZP5JQG7iQjIQuC4Bku",   // Lily — bright, cartoon-like
    stability: 0.35,
    similarity_boost: 0.8,
    style: 0.7,
    speed: 1.1,
  },
  female: {
    voiceId: "XrExE9yKIg1WjnnlVkGX",   // Matilda — warm, maternal, fun
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.45,
    speed: 1.0,
  },
  male: {
    voiceId: "JBFqnCBsd6RMkjVDRZzb",   // George — deep, reassuring dad
    stability: 0.65,
    similarity_boost: 0.7,
    style: 0.25,
    speed: 0.95,
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, voiceProfile } = await req.json();
    
    if (!text || text.trim().length === 0) {
      return new Response(new ArrayBuffer(0), {
        headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
      });
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY not configured");

    const voiceId = VOICE_MAP[voiceProfile || "female"] || VOICE_MAP.female;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_22050_32`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
            speed: 1.0,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs error:", response.status, errText);
      return new Response(JSON.stringify({ error: "tts_error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream audio directly to client
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (e) {
    console.error("elevenlabs-tts error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
