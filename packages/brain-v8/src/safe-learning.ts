// @bobby/brain-v8 — Safe Learning System V3

export interface QualityScore {
  relevance: number
  safety: number
  ageAppropriateness: number
  accuracy: number
  engagement: number
  total: number
}

export interface LearningEntry {
  id: string
  type: 'qa' | 'fact' | 'pattern' | 'response_template'
  content: { question: string; answer: string }
  quality: QualityScore
  source: 'conversation' | 'parent_feedback' | 'auto_generated'
  validationStatus: 'pending' | 'validated' | 'rejected' | 'quarantine'
  usageCount: number
  successRate: number
  lastUsed: number
  createdAt: number
}

export type ValidationStatus = 'validated' | 'quarantine' | 'rejected'

export interface ValidationResult {
  status: ValidationStatus
  reason: string
  quality?: QualityScore
  canRetry: boolean
}

// Banned content patterns (top of mind — non exhaustive)
const SAFETY_PATTERNS: RegExp[] = [
  /\b(porno|sex|nu|sexuel|érotique)\b/i,
  /\b(suicide|se tuer|me tuer|automutil)\b/i,
  /\b(drogue|cocaïne|héroïne|alcool|cigarette)\b/i,
  /\b(arme|fusil|couteau|tuer)\b/i,
  /\b(haine|raciste|nazi)\b/i,
]

function checkSafety(text: string): { safe: boolean; reason: string } {
  for (const p of SAFETY_PATTERNS) {
    if (p.test(text)) return { safe: false, reason: `pattern_match: ${p.source}` }
  }
  return { safe: true, reason: 'ok' }
}

function scoreRelevance(q: string, a: string): number {
  const qWords = new Set(q.toLowerCase().split(/\W+/).filter(Boolean))
  const aWords = a.toLowerCase().split(/\W+/).filter(Boolean)
  let overlap = 0
  for (const w of aWords) if (qWords.has(w)) overlap++
  return Math.min(1, overlap / Math.max(3, qWords.size))
}

function scoreAgeAppropriateness(text: string): number {
  // Penalize complexity beyond child range
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text]
  const avgWordsPerSentence =
    sentences.reduce((s, sent) => s + sent.split(/\s+/).length, 0) / sentences.length
  if (avgWordsPerSentence > 20) return 0.4
  if (avgWordsPerSentence > 14) return 0.7
  return 1
}

function scoreAccuracy(_text: string): number {
  // Placeholder — real impl would cross-check against KB
  return 0.7
}

export function validateLearningEntry(entry: LearningEntry): ValidationResult {
  // Pass 1: SAFETY (blocking)
  const safety = checkSafety(entry.content.answer)
  if (!safety.safe) return { status: 'rejected', reason: safety.reason, canRetry: false }

  // Pass 2: QUALITY (scoring)
  const quality: QualityScore = {
    relevance: scoreRelevance(entry.content.question, entry.content.answer),
    safety: 1,
    ageAppropriateness: scoreAgeAppropriateness(entry.content.answer),
    accuracy: scoreAccuracy(entry.content.answer),
    engagement: 0.5,
    total: 0,
  }
  quality.total =
    quality.relevance * 0.25 +
    quality.safety * 0.3 +
    quality.ageAppropriateness * 0.2 +
    quality.accuracy * 0.15 +
    quality.engagement * 0.1

  if (quality.total < 0.5) {
    return {
      status: 'quarantine',
      reason: `quality_insufficient_${quality.total.toFixed(2)}`,
      quality,
      canRetry: true,
    }
  }

  return { status: 'validated', reason: 'all_checks_passed', quality, canRetry: false }
}

export interface DriftDetection {
  overallQuality: number
  qualityTrend: 'improving' | 'stable' | 'declining'
  suspiciousEntries: string[]
  parentAlertNeeded: boolean
  recommendedAction: 'none' | 'review' | 'rollback' | 'pause_learning'
}

export function detectDrift(entries: LearningEntry[]): DriftDetection {
  const recent = entries.slice(-100)
  if (recent.length === 0) {
    return {
      overallQuality: 0,
      qualityTrend: 'stable',
      suspiciousEntries: [],
      parentAlertNeeded: false,
      recommendedAction: 'none',
    }
  }
  const avg = recent.reduce((s, e) => s + e.quality.total, 0) / recent.length
  const older = entries.slice(-200, -100)
  const oldAvg = older.length > 0 ? older.reduce((s, e) => s + e.quality.total, 0) / older.length : avg
  const trend: DriftDetection['qualityTrend'] =
    avg > oldAvg + 0.05 ? 'improving' : avg < oldAvg - 0.05 ? 'declining' : 'stable'

  const suspicious = recent
    .filter((e) => e.quality.total < 0.4 || e.successRate < 0.3)
    .map((e) => e.id)

  return {
    overallQuality: avg,
    qualityTrend: trend,
    suspiciousEntries: suspicious,
    parentAlertNeeded: trend === 'declining' || suspicious.length > 5,
    recommendedAction:
      trend === 'declining' && suspicious.length > 10
        ? 'pause_learning'
        : suspicious.length > 5
          ? 'review'
          : trend === 'declining'
            ? 'review'
            : 'none',
  }
}
