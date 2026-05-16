// @bobby/sdk-js — minimal client for Bobby cloud API.
//
// Usage:
//   const bobby = createBobbyClient({ apiKey: '…' })
//   const safety = await bobby.safety({ text: 'salut' })
//   const reply = await bobby.brain({ text: 'pourquoi ?', child_id: '…' })

import {
  type BrainRequest,
  type BrainResponsePayload,
  BrainResponsePayloadSchema,
  type SafetyRequest,
  type SafetyResponse,
  SafetyResponseSchema,
} from '@bobby/shared-types'

export interface BobbyClientConfig {
  /** Cloud base URL. Defaults to prod. */
  baseUrl?: string
  /** Supabase anon or service key (depending on caller). */
  apiKey: string
  /** Optional fetch implementation (for testing). */
  fetch?: typeof globalThis.fetch
}

const DEFAULT_BASE = 'https://zvvyuxgqbuooifowjcqc.supabase.co'

export class BobbyClient {
  private baseUrl: string
  private apiKey: string
  private fetchImpl: typeof globalThis.fetch

  constructor(config: BobbyClientConfig) {
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE
    this.apiKey = config.apiKey
    this.fetchImpl = config.fetch ?? globalThis.fetch
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}/functions/v1${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new BobbyError(`${path} returned ${res.status}: ${text}`, res.status)
    }
    return (await res.json()) as T
  }

  async safety(req: SafetyRequest): Promise<SafetyResponse> {
    const raw = await this.post<unknown>('/safety', req)
    return SafetyResponseSchema.parse(raw)
  }

  async brain(req: BrainRequest): Promise<BrainResponsePayload> {
    const raw = await this.post<unknown>('/bobby-brain', req)
    return BrainResponsePayloadSchema.parse(raw)
  }
}

export class BobbyError extends Error {
  status: number
  constructor(msg: string, status: number) {
    super(msg)
    this.name = 'BobbyError'
    this.status = status
  }
}

export function createBobbyClient(config: BobbyClientConfig): BobbyClient {
  return new BobbyClient(config)
}
