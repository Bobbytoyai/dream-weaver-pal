/**
 * ElevenLabs TTS Streaming — Emotional Voice Engine V2
 * 
 * 3 voice profiles optimized for emotional connection with children:
 * 🎭 Enfant (Lily) — cartoon authentique, joyeux, magique
 * 👩 Maman (Matilda) — ultra apaisante, enveloppante, maternelle
 * 👨 Papa (George) — calme, protecteur, rassurant
 * 
 * Emotion modifiers + calm mode for bedtime/stress situations.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Voice Profiles (V2 — Emotional Comfort) ───────────────
interface VoiceSettings {
  voiceId: string;
  stability: number;
  similarity_boost: number;
  style: number;
  speed: number;
}

const VOICE_PROFILES: Record<string, VoiceSettings> = {
  // 🎭 Enfant — cartoon authentique, pas caricature
  // Stability basse = variations naturelles, micro-rires, expressivité
  // Style élevé = personnalité cartoon vivante
  child: {
    voiceId: "pFZP5JQG7iQjIQuC4Bku",   // Lily
    stability: 0.28,
    similarity_boost: 0.85,
    style: 0.85,
    speed: 1.10,
  },
  // 👩 Maman — ultra apaisante, enveloppante
  // Stability très haute = voix régulière, calmante
  // Style bas = naturel, pas théâtral
  // Speed réduit = rythme lent, sécurisant
  female: {
    voiceId: "XrExE9yKIg1WjnnlVkGX",   // Matilda
    stability: 0.92,
    similarity_boost: 0.85,
    style: 0.10,
    speed: 0.82,
  },
  // 👨 Papa — calme, protecteur, confiant
  // Stability très haute = voix posée, stable
  // Speed légèrement lent = rythme rassurant
  male: {
    voiceId: "JBFqnCBsd6RMkjVDRZzb",   // George
    stability: 0.90,
    similarity_boost: 0.72,
    style: 0.15,
    speed: 0.90,
  },
};

// ─── Emotion Modifiers (V2 — Comfort-First) ────────────────
type Emotion = "happy" | "sad" | "scared" | "excited" | "calm" | "curious" | "angry" | "bored";

interface EmotionModifier {
  stabilityDelta: number;
  styleDelta: number;
  speedDelta: number;
}

const EMOTION_MODIFIERS: Record<Emotion, EmotionModifier> = {
  happy:   { stabilityDelta: -0.10, styleDelta: +0.15, speedDelta: +0.04 },
  excited: { stabilityDelta: -0.15, styleDelta: +0.20, speedDelta: +0.06 },
  sad:     { stabilityDelta: +0.15, styleDelta: -0.10, speedDelta: -0.10 },
  scared:  { stabilityDelta: +0.20, styleDelta: -0.05, speedDelta: -0.08 },
  calm:    { stabilityDelta: +0.10, styleDelta: -0.15, speedDelta: -0.12 },
  curious: { stabilityDelta: -0.05, styleDelta: +0.10, speedDelta: +0.02 },
  angry:   { stabilityDelta: +0.05, styleDelta: +0.08, speedDelta: +0.03 },
  bored:   { stabilityDelta: +0.10, styleDelta: -0.05, speedDelta: -0.04 },
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function applyEmotion(base: VoiceSettings, emotion?: string): VoiceSettings {
  if (!emotion || !(emotion in EMOTION_MODIFIERS)) return base;
  const mod = EMOTION_MODIFIERS[emotion as Emotion];
  return {
    ...base,
    stability: clamp(base.stability + mod.stabilityDelta, 0.10, 0.98),
    style: clamp(base.style + mod.styleDelta, 0.0, 0.90),
    speed: clamp(base.speed + mod.speedDelta, 0.70, 1.20),
  };
}

// ─── Main Handler ───────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, voiceProfile, emotion, speedOverride, calmMode } = await req.json();
    
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
      profile = { ...profile, speed: clamp(profile.speed - 0.12, 0.70, 1.20) };
    } else if (speedOverride === "fast") {
      profile = { ...profile, speed: clamp(profile.speed + 0.10, 0.70, 1.20) };
    }

    // Calm/night mode — override to ultra-soothing
    if (calmMode) {
      profile = {
        ...profile,
        stability: clamp(profile.stability + 0.15, 0.10, 0.98),
        style: clamp(profile.style - 0.15, 0.0, 0.90),
        speed: clamp(profile.speed - 0.10, 0.70, 1.20),
      };
    }

    console.log(`[TTS V2] profile=${voiceProfile} emotion=${emotion || "none"} speed=${profile.speed.toFixed(2)} stability=${profile.stability.toFixed(2)} style=${profile.style.toFixed(2)} calm=${!!calmMode}`);

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
