/**
 * ElevenLabs TTS Streaming — Emotional Voice Engine V3
 * 
 * 5 voice profiles optimized for emotional connection with children:
 * 🎭 Enfant (Lily) — cartoon authentique, joyeux, magique
 * 👩 Maman (Matilda) — ultra apaisante, enveloppante, maternelle
 * 👨 Papa (George) — calme, protecteur, rassurant
 * 👧 Sœur (Alice) — ado bienveillante, complice, fun
 * 👦 Frère (Charlie) — ado cool, encourageant, dynamique
 * 
 * Emotion modifiers + calm mode for bedtime/stress situations.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Voice Profiles (V3 — 5 Profiles) ──────────────────────
interface VoiceSettings {
  voiceId: string;
  stability: number;
  similarity_boost: number;
  style: number;
  speed: number;
}

const VOICE_PROFILES: Record<string, VoiceSettings> = {
  // 🎒 Enfant — Mélodie (jeune, naturelle, française native)
  // Légèrement ralentie pour clarté enfantine, stabilité remontée pour moins de distorsion
  child: {
    voiceId: "MmLmgmAm7pKFUJBu1Lov",
    stability: 0.40,
    similarity_boost: 0.85,
    style: 0.70,
    speed: 1.0,
  },
  // 👩 Maman — Mila (douce, apaisante, maternelle)
  // Vitesse naturelle, très stable pour effet berceuse
  female: {
    voiceId: "hndZlkpVm5i9lXBY9CKj",
    stability: 0.80,
    similarity_boost: 0.82,
    style: 0.20,
    speed: 0.95,
  },
  // 👨 Papa — Vincent (calme, protecteur, narratif)
  // Remonté de 0.90 à 0.95 pour éviter l'effet "trop lent"
  male: {
    voiceId: "eDaM8z1udmnynsRHDkUP",
    stability: 0.82,
    similarity_boost: 0.78,
    style: 0.18,
    speed: 0.95,
  },
  // 👧 Sœur — Marine (jeune, complice, fun)
  // Stabilité remontée, vitesse ramenée à 1.0 pour clarté
  sister: {
    voiceId: "6FXyooAOTqUK8m2HWm32",
    stability: 0.42,
    similarity_boost: 0.80,
    style: 0.50,
    speed: 1.0,
  },
  // 👦 Frère — Yanis (jeune, casual, dynamique)
  // Stabilité remontée pour moins de distorsion, vitesse 1.0
  brother: {
    voiceId: "FRY6vOtGqwamgAf39SwP",
    stability: 0.45,
    similarity_boost: 0.78,
    style: 0.45,
    speed: 1.0,
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
  happy:   { stabilityDelta: -0.05, styleDelta: +0.10, speedDelta: +0.02 },
  excited: { stabilityDelta: -0.08, styleDelta: +0.12, speedDelta: +0.03 },
  sad:     { stabilityDelta: +0.10, styleDelta: -0.08, speedDelta: -0.06 },
  scared:  { stabilityDelta: +0.12, styleDelta: -0.05, speedDelta: -0.05 },
  calm:    { stabilityDelta: +0.08, styleDelta: -0.10, speedDelta: -0.08 },
  curious: { stabilityDelta: -0.03, styleDelta: +0.05, speedDelta: +0.01 },
  angry:   { stabilityDelta: +0.03, styleDelta: +0.05, speedDelta: +0.02 },
  bored:   { stabilityDelta: +0.05, styleDelta: -0.03, speedDelta: -0.02 },
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

    // Retry logic for transient errors (409 conflict, 429 rate limit, 5xx)
    let response: Response | null = null;
    const MAX_RETRIES = 2;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      response = await fetch(
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

      if (response.ok) break;

      const isRetryable = response.status === 409 || response.status === 429 || response.status >= 500;
      if (isRetryable && attempt < MAX_RETRIES) {
        const delay = (attempt + 1) * 500;
        console.warn(`[TTS] Retryable error ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      // Non-retryable or exhausted retries — return graceful fallback
      const errText = await response.text();
      console.error("ElevenLabs error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "TTS_SERVICE_UNAVAILABLE", fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
