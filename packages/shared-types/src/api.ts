// API contracts shared between cloud functions and clients
import { z } from 'zod'

// ─── /v1/safety ─────────────────────────────────────────────
export const SafetyRequestSchema = z.object({
  text: z.string().min(1).max(5000),
  lang: z.enum(['fr', 'en', 'es', 'de', 'it']).default('fr'),
  direction: z.enum(['input', 'output']).default('input'),
})
export type SafetyRequest = z.infer<typeof SafetyRequestSchema>

export const SafetyResponseSchema = z.object({
  level: z.number().int().min(0).max(4),
  reason: z.string(),
  suggested_response: z.string().optional(),
  latency_ms: z.number(),
})
export type SafetyResponse = z.infer<typeof SafetyResponseSchema>

// ─── /v1/voice ──────────────────────────────────────────────
export const VoiceRequestSchema = z.object({
  device_id: z.string().uuid(),
  child_id: z.string().uuid(),
  audio: z.string().min(1), // base64 WebM Opus
  context: z
    .object({
      location: z.enum(['home', 'car', 'travel']).optional(),
      time_of_day: z.enum(['morning', 'day', 'evening', 'night']).optional(),
    })
    .optional(),
})
export type VoiceRequest = z.infer<typeof VoiceRequestSchema>

export const EmotionSchema = z.enum(['joie', 'tristesse', 'curieux', 'calme', 'fier'])
export type Emotion = z.infer<typeof EmotionSchema>

export const VoiceResponseSchema = z.object({
  session_id: z.string().uuid(),
  child_text: z.string(),
  bobby_text: z.string(),
  audio_url: z.string().url(),
  emotion: EmotionSchema,
  safety: z.object({
    input: z.number().int().min(0).max(4),
    output: z.number().int().min(0).max(4),
  }),
  latency_ms: z.object({
    stt: z.number(),
    brain: z.number(),
    tts: z.number(),
    total: z.number(),
  }),
})
export type VoiceResponse = z.infer<typeof VoiceResponseSchema>

// ─── /v1/bobby-brain ────────────────────────────────────────
export const BrainRequestSchema = z.object({
  text: z.string().min(1).max(2000),
  child_id: z.string().uuid(),
  session_context: z
    .object({
      turnCount: z.number().int().min(0).optional(),
      sessionMood: z.enum(['positive', 'neutral', 'negative']).optional(),
    })
    .optional(),
})
export type BrainRequest = z.infer<typeof BrainRequestSchema>

export const BrainResponsePayloadSchema = z.object({
  text: z.string(),
  emotion: z.string(),
  safetyLevel: z.number().int().min(0).max(4),
  telemetry: z.record(z.number()),
})
export type BrainResponsePayload = z.infer<typeof BrainResponsePayloadSchema>
