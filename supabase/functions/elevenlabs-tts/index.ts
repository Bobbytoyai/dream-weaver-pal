import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Voice IDs for French voices (ElevenLabs)
// Voice IDs — cartoon-friendly animated French voices
const VOICE_MAP: Record<string, string> = {
  female: "XrExE9yKIg1WjnnlVkGX",   // Matilda - warm childlike (default cartoon feel)
  child:  "XrExE9yKIg1WjnnlVkGX",   // Matilda - animated & expressive
  male:   "IKne3meq5aSn9XLyUdCD",   // Charlie - young playful male
  sister: "EXAVITQu4vr4xnSDxMaL",   // Sarah - young female
  brother:"IKne3meq5aSn9XLyUdCD",   // Charlie - young male
};

// Speed multiplier per profile for natural pacing
const SPEED_MAP: Record<string, number> = {
  female: 1.05,
  child:  1.05,
  male:   1.0,
  sister: 1.05,
  brother: 1.0,
};

    const voiceId = VOICE_MAP[voiceProfile || "child"] || VOICE_MAP.child;
    const speed = SPEED_MAP[voiceProfile || "child"] || 1.05;

    // Use turbo model for lowest latency + cartoon-style voice settings
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
            stability: 0.35,         // Lower = more expressive/animated
            similarity_boost: 0.65,
            style: 0.55,             // Higher = more cartoon-like character
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

    // Stream the audio back
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
