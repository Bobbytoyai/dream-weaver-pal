// @bobby/brain-v8 — Performance Monitor
// Lightweight tracing wrapper. No I/O.

import type { BrainTelemetry } from './types.ts'

export type StageName = keyof BrainTelemetry['stage']

const BUDGETS: Record<StageName, number> = {
  preprocessing: 5,
  understanding: 15,
  decision: 10,
  contentGeneration: 300,
  shaping: 10,
  postProcessing: 5,
}

export class PerfTracker {
  private start: number = performance.now()
  private stages: Partial<Record<StageName, number>> = {}
  private stageStarts: Partial<Record<StageName, number>> = {}
  public usedLLM = false
  public cacheHit = false

  beginStage(stage: StageName): void {
    this.stageStarts[stage] = performance.now()
  }

  endStage(stage: StageName): void {
    const t0 = this.stageStarts[stage]
    if (t0 == null) return
    this.stages[stage] = performance.now() - t0
  }

  /** Run `fn` and record latency in `stage`. */
  async measure<T>(stage: StageName, fn: () => Promise<T> | T): Promise<T> {
    this.beginStage(stage)
    try {
      return await fn()
    } finally {
      this.endStage(stage)
    }
  }

  warnings(): string[] {
    const out: string[] = []
    for (const stage of Object.keys(BUDGETS) as StageName[]) {
      const t = this.stages[stage]
      const budget = BUDGETS[stage]
      if (t != null && t > budget * 2) {
        out.push(`stage ${stage}: ${t.toFixed(1)}ms > 2× budget ${budget}ms`)
      }
    }
    return out
  }

  build(): BrainTelemetry {
    return {
      totalMs: performance.now() - this.start,
      stage: {
        preprocessing: this.stages.preprocessing ?? 0,
        understanding: this.stages.understanding ?? 0,
        decision: this.stages.decision ?? 0,
        contentGeneration: this.stages.contentGeneration ?? 0,
        shaping: this.stages.shaping ?? 0,
        postProcessing: this.stages.postProcessing ?? 0,
      },
      usedLLM: this.usedLLM,
      cacheHit: this.cacheHit,
    }
  }
}
