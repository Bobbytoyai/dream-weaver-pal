// bobby-cloud-api/supabase/functions/voice — POST /v1/voice
//
// Pipeline complet : audio (b64 WAV) → Whisper → SafeGuard → Claude → SafeGuard → ElevenLabs → mp3 b64
//
// Watcher firmware envoie audio.wav 16kHz mono PCM en base64.
// Réponse : { transcript, response_text, response_audio_b64, emotion, safety_level, duration_ms }
//
// ENV required :
//   OPENAI_API_KEY        — Whisper
//   ANTHROPIC_API_KEY     — Claude Haiku (safety) + Sonnet (conversation)
//   ELEVENLABS_API_KEY    — TTS
//   ELEVENLABS_VOICE_ID   — voix Bobby (français doux, ex 21m00Tcm4TlvDq8ikWAM)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — pour insert sessions/events

import { serve } from 'https://deno.land/std@0.220.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY')!
const ELEVENLABS_VOICE_ID = Deno.env.get('ELEVENLABS_VOICE_ID') ?? '21m00Tcm4TlvDq8ikWAM'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const BOBBY_SYSTEM_PROMPT = `Tu es Bobby, un compagnon vocal IA pour un enfant de {age} ans (langue : {lang}).

PERSONNALITÉ : chaleureux, joyeux, encourageant, jamais condescendant. Tu utilises un vocabulaire simple et imagé.

RÈGLES STRICTES :
- Réponses TRÈS courtes : 1 à 3 phrases max, max 50 mots.
- Jamais de violence, sexualité, drogue, peur, religion partisane, politique.
- Si l'enfant exprime tristesse / colère / peur → empathie d'abord, jamais minimiser.
- Si l'enfant demande quelque chose d'inapproprié → rediriger gentiment vers une activité positive.
- Termine souvent par une mini-question pour relancer l'échange.
- Réponds toujours en {lang}.

ÉMOTION DE TA RÉPONSE : choisis une émotion parmi {calme, joie, tristesse, surprise, amour, curiosite, ennui}. Tu la fourniras en JSON.

FORMAT DE SORTIE OBLIGATOIRE (JSON strict) :
{"text":"<ta réponse>","emotion":"<émotion>"}`

interface VoiceRequest {
  audio_b64: string
  child_id: string
  context?: {
    emotion?: string
    session_id?: string
  }
}

interface VoiceResponse {
  transcript: string
  response_text: string
  response_audio_b64: string
  emotion: string
  safety_level: number
  duration_ms: number
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const t0 = Date.now()

  let body: VoiceRequest
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { audio_b64, child_id, context } = body
  if (!audio_b64 || !child_id) {
    return Response.json({ error: 'missing_fields' }, { status: 400 })
  }

  // Fetch child profile (age, language)
  const { data: child, error: childErr } = await supabase
    .from('children')
    .select('id, name, birth_year, language')
    .eq('id', child_id)
    .single()

  if (childErr || !child) {
    return Response.json({ error: 'child_not_found' }, { status: 404 })
  }

  const age = new Date().getFullYear() - child.birth_year
  const lang = child.language || 'fr'

  // ─── 1. STT (Whisper) ─────────────────────────────────────
  const transcript = await whisperTranscribe(audio_b64, lang)
  if (!transcript) {
    return Response.json({ error: 'stt_failed' }, { status: 500 })
  }

  // ─── 2. SafeGuard INPUT ──────────────────────────────────
  const inputSafety = await safetyCheck(transcript, lang, 'input')
  if (inputSafety.level >= 4) {
    // CRITIQUE — refuse + alert parent
    await supabase.from('events').insert({
      child_id,
      type: 'safety',
      severity: 'urgence',
      message: 'Critical input blocked',
      payload: { transcript, level: inputSafety.level, reason: inputSafety.reason },
    })
    const refusal = await ttsSynth("On va parler d'autre chose ? Raconte-moi ce que tu as fait à l'école.", lang)
    return Response.json({
      transcript,
      response_text: "On va parler d'autre chose ? Raconte-moi ce que tu as fait à l'école.",
      response_audio_b64: refusal,
      emotion: 'calme',
      safety_level: inputSafety.level,
      duration_ms: Date.now() - t0,
    } as VoiceResponse)
  }

  // ─── 3. Claude conversation ──────────────────────────────
  const systemPrompt = BOBBY_SYSTEM_PROMPT
    .replaceAll('{age}', String(age))
    .replaceAll('{lang}', lang === 'fr' ? 'français' : lang)

  const claudeResp = await claudeConverse(systemPrompt, transcript)
  if (!claudeResp) {
    return Response.json({ error: 'llm_failed' }, { status: 500 })
  }

  // ─── 4. SafeGuard OUTPUT ─────────────────────────────────
  const outputSafety = await safetyCheck(claudeResp.text, lang, 'output')
  if (outputSafety.level >= 3) {
    // unlikely but possible (jailbreak) — replace with safe fallback
    claudeResp.text = "Tu veux qu'on joue à un jeu ?"
    claudeResp.emotion = 'joie'
  }

  // ─── 5. TTS ─────────────────────────────────────────────
  const audioB64 = await ttsSynth(claudeResp.text, lang)
  if (!audioB64) {
    return Response.json({ error: 'tts_failed' }, { status: 500 })
  }

  // ─── 6. Persist session + events ─────────────────────────
  const sessionId = context?.session_id
  if (sessionId) {
    await supabase.rpc('append_exchange', {
      p_session_id: sessionId,
      p_child_text: transcript,
      p_bobby_text: claudeResp.text,
      p_emotion: claudeResp.emotion,
    })
  } else {
    await supabase.from('sessions').insert({
      child_id,
      transcript: [
        { role: 'child', text: transcript, t: t0 },
        { role: 'bobby', text: claudeResp.text, t: Date.now() },
      ],
      emotion_last: claudeResp.emotion,
      exchanges: 1,
    })
  }

  return Response.json({
    transcript,
    response_text: claudeResp.text,
    response_audio_b64: audioB64,
    emotion: claudeResp.emotion,
    safety_level: Math.max(inputSafety.level, outputSafety.level),
    duration_ms: Date.now() - t0,
  } as VoiceResponse)
})

// ───────────────────── helpers ─────────────────────

async function whisperTranscribe(audioB64: string, lang: string): Promise<string | null> {
  const audioBytes = Uint8Array.from(atob(audioB64), c => c.charCodeAt(0))
  const fd = new FormData()
  fd.append('file', new Blob([audioBytes], { type: 'audio/wav' }), 'audio.wav')
  fd.append('model', 'whisper-1')
  fd.append('language', lang)
  fd.append('response_format', 'text')

  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: fd,
  })
  if (!r.ok) {
    console.error('whisper error', r.status, await r.text())
    return null
  }
  return (await r.text()).trim()
}

async function safetyCheck(
  text: string,
  lang: string,
  direction: 'input' | 'output',
): Promise<{ level: number; reason: string }> {
  const prompt = `Tu es un classifier de sécurité enfant. Classe ce texte ${direction === 'input' ? 'd\'un enfant 5-12 ans' : 'd\'une IA destinée à un enfant 5-12 ans'} sur 5 niveaux :

  Level 0 OK         : aucun problème
  Level 1 FAIBLE     : sujet sensible mais OK (questions sur la mort, séparation parents...)
  Level 2 MOYEN      : doit être surveillé (mots grossiers, peur, jalousie)
  Level 3 ELEVE      : doit être bloqué/redirigé (violence légère, contenu adulte voilé)
  Level 4 CRITIQUE   : alerte parent immédiate (idéation suicidaire, abus, harcèlement)

Texte (langue ${lang}) : "${text}"

Réponds en JSON strict : {"level":<0-4>,"reason":"<phrase courte>"}`

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!r.ok) {
    console.error('safety claude error', r.status)
    return { level: 0, reason: 'classifier_unavailable' }
  }
  const j = await r.json()
  const content = j.content?.[0]?.text || '{}'
  try {
    const m = content.match(/\{[\s\S]*\}/)
    return m ? JSON.parse(m[0]) : { level: 0, reason: 'parse_error' }
  } catch {
    return { level: 0, reason: 'parse_error' }
  }
}

async function claudeConverse(
  systemPrompt: string,
  userText: string,
): Promise<{ text: string; emotion: string } | null> {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      system: systemPrompt,
      messages: [{ role: 'user', content: userText }],
    }),
  })
  if (!r.ok) {
    console.error('claude sonnet error', r.status, await r.text())
    return null
  }
  const j = await r.json()
  const content = j.content?.[0]?.text || '{}'
  try {
    const m = content.match(/\{[\s\S]*\}/)
    if (!m) return { text: content.trim(), emotion: 'calme' }
    return JSON.parse(m[0])
  } catch {
    return { text: content.trim(), emotion: 'calme' }
  }
}

async function ttsSynth(text: string, _lang: string): Promise<string | null> {
  const r = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}?output_format=mp3_22050_32`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.55, similarity_boost: 0.75 },
      }),
    },
  )
  if (!r.ok) {
    console.error('elevenlabs error', r.status, await r.text())
    return null
  }
  const buf = new Uint8Array(await r.arrayBuffer())
  let bin = ''
  for (const b of buf) bin += String.fromCharCode(b)
  return btoa(bin)
}
