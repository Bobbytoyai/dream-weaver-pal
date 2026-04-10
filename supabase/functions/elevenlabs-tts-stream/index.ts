/**
 * ElevenLabs TTS Streaming — Emotional Voice System
 * 
 * 3 voice profiles with emotion-aware settings:
 * 🎭 Enfant (Lily) — cartoon, animated, playful
 * 👩 Maman (Matilda) — warm, maternal, funny
 * 👨 Papa (George) — deep, calm, protective
 * 
 * Emotion modifiers adjust stability/style/speed per detected mood.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Voice Profiles ─────────────────────────────────────────
interface VoiceSettings {
  voiceId: string;
  stability: number;
  similarity_boost: number;
  style: number;
  speed: number;
}

const VOICE_PROFILES: Record<string, VoiceSettings> = {
  child: {
    voiceId: "pFZP5JQG7iQjIQuC4Bku",   // Lily — bright, cartoon-like, expressive
    stability: 0.38,
    similarity_boost: 0.82,
    style: 0.65,
    speed: 1.08,
  },
  female: {
    voiceId: "XrExE9yKIg1WjnnlVkGX",   // Matilda — warm, maternal, slightly fun
    stability: 0.52,
    similarity_boost: 0.78,
    style: 0.40,
    speed: 0.98,
  },
  male: {
    voiceId: "JBFqnCBsd6RMkjVDRZzb",   // George — deep, reassuring, protective
    stability: 0.68,
    similarity_boost: 0.72,
    style: 0.22,
    speed: 0.93,
  },
};

// ─── Emotion Modifiers ──────────────────────────────────────
// Adjust voice settings based on detected emotion for natural delivery
type Emotion = "happy" | "sad" | "scared" | "excited" | "calm" | "curious" | "angry" | "bored";

interface EmotionModifier {
  stabilityDelta: number;
  styleDelta: number;
  speedDelta: number;
}

const EMOTION_MODIFIERS: Record<Emotion, EmotionModifier> = {
  happy:   { stabilityDelta: -0.08, styleDelta: +0.15, speedDelta: +0.05 },
  excited: { stabilityDelta: -0.12, styleDelta: +0.20, speedDelta: +0.08 },
  sad:     { stabilityDelta: +0.15, styleDelta: -0.10, speedDelta: -0.08 },
  scared:  { stabilityDelta: +0.10, styleDelta: +0.05, speedDelta: -0.05 },
  calm:    { stabilityDelta: +0.20, styleDelta: -0.15, speedDelta: -0.10 },
  curious: { stabilityDelta: -0.05, styleDelta: +0.10, speedDelta: +0.03 },
  angry:   { stabilityDelta: +0.05, styleDelta: +0.10, speedDelta: +0.05 },
  bored:   { stabilityDelta: +0.10, styleDelta: -0.05, speedDelta: -0.03 },
};

function applyEmotion(base: VoiceSettings, emotion?: string): VoiceSettings {
  if (!emotion || !(emotion in EMOTION_MODIFIERS)) return base;
  const mod = EMOTION_MODIFIERS[emotion as Emotion];
  return {
    ...base,
    stability: Math.max(0.1, Math.min(1, base.stability + mod.stabilityDelta)),
    style: Math.max(0, Math.min(1, base.style + mod.styleDelta)),
    speed: Math.max(0.7, Math.min(1.2, base.speed + mod.speedDelta)),
  };
}

// ─── Main Handler ───────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, voiceProfile, emotion, speedOverride } = await req.json();
    
    if (!text || text.trim().length === 0) {
      return new Response(new ArrayBuffer(0), {
        headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
      });
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY not configured");

    const baseProfile = VOICE_PROFILES[voiceProfile || "female"] || VOICE_PROFILES.female;
    let profile = applyEmotion(baseProfile, emotion);

    // Apply speed override from parent settings
    if (speedOverride === "slow") {
      profile = { ...profile, speed: Math.max(0.7, profile.speed - 0.15) };
    } else if (speedOverride === "fast") {
      profile = { ...profile, speed: Math.min(1.2, profile.speed + 0.12) };
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${profile.voiceId}/stream?output_format=mp3_22050_32`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: profile.stability,
            similarity_boost: profile.similarity_boost,
            style: profile.style,
            use_speaker_boost: true,
            speed: profile.speed,
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
