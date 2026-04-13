import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Voice IDs — native French (France) voices, child-safe
const VOICE_MAP: Record<string, string> = {
  female: "YxrwjAKoUKULGd0g8K9Y",   // Maman
  child:  "WQKwBV2Uzw1gSGr69N8I",    // Enfant (Mélodie)
  male:   "BVBq6HVJVdnwOMJOqvy9",    // Papa
  sister: "WQKwBV2Uzw1gSGr69N8I",    // Sœur (same as enfant)
  brother:"AqX3O1nij56oCicN2U6w",    // Frère
};

// Speed multiplier per profile
const SPEED_MAP: Record<string, number> = {
  female: 1.05,
  child:  1.05,
  male:   1.0,
  sister: 1.05,
  brother: 1.0,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing API key" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, voiceProfile } = await req.json();
    if (!text || text.trim().length < 1) {
      return new Response(JSON.stringify({ error: "No text provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const voiceId = VOICE_MAP[voiceProfile || "child"] || VOICE_MAP.child;
    const speed = SPEED_MAP[voiceProfile || "child"] || 1.05;

    // Turbo model for lowest latency + expressive cartoon-like settings
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_22050_32`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.slice(0, 2000),
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.7,
            style: 0.45,
            use_speaker_boost: true,
            speed,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("[ElevenLabs TTS] API error:", response.status, errText);
      return new Response(JSON.stringify({ error: "TTS API error", status: response.status }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream audio back for lowest time-to-first-byte
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("[ElevenLabs TTS] Error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
