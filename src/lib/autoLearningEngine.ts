/**
 * Bobby Auto-Learning Loop + Self-Improving AI Engine v5.5
 *
 * Double-loop architecture:
 *   Loop A — MICRO (real-time, per interaction): captures, scores, and immediately updates
 *             the response cache with improved alternatives.
 *   Loop B — MACRO (batch, periodic): replays recent sessions, identifies drift patterns,
 *             runs strategic improvement across the full pattern library.
 *
 * Core principles:
 *   • Offline-first — all learning persists locally (IndexedDB + localStorage)
 *   • Safety gate — blocked/unsafe content can NEVER enter the learning memory
 *   • Per-child personalization — each child ID has its own preference model
 *   • Versioning + rollback — every batch improvement creates a restorable snapshot
 *   • Implicit feedback — child continuing the session = positive; stopping = negative
 *   • Anti-drift — learned responses are periodically validated against quality baseline
 */

import { isBlockedContent } from "./offline-intents";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONSTANTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const STORAGE_PREFIX = "bobby_ale_";
const MAX_INTERACTION_LOG = 500;       // Keep last N interactions per child
const MAX_PATTERN_CACHE = 1000;        // Max learned response patterns
const SNAPSHOT_INTERVAL_MS = 30 * 60 * 1000;  // Snapshot every 30 min
const BATCH_IMPROVEMENT_INTERVAL_MS = 10 * 60 * 1000; // Batch every 10 min
const MIN_SAMPLES_FOR_IMPROVEMENT = 3; // Need ≥3 samples before replacing a response
const IMPROVEMENT_SCORE_THRESHOLD = 0.7; // Min composite score to accept a response
const DRIFT_ALERT_THRESHOLD = 0.15;    // Alert if avg score drops by >15%
const MAX_SNAPSHOTS = 10;              // Keep last N version snapshots
const IMPLICIT_POSITIVE_TIMEOUT_MS = 30 * 1000; // 30s of continued engagement = positive
const IMPLICIT_NEGATIVE_TIMEOUT_MS = 5 * 1000;  // <5s then stop = negative signal

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type FeedbackSignal = "positive" | "negative" | "neutral" | "implicit_positive" | "implicit_negative";
export type ChildTone = "playful" | "calm" | "educational" | "storytelling" | "comforting";
export type ResponseLength = "short" | "medium" | "long";
export type EngineEvent =
  | "interaction_captured"
  | "improvement_applied"
  | "snapshot_created"
  | "rollback_executed"
  | "drift_detected"
  | "sync_completed"
  | "safety_blocked";

/** Per-interaction quality scores — each dimension 0.0 to 1.0 */
export interface InteractionScores {
  comprehension: number;   // Did child understand? (follow-up questions → lower)
  engagement: number;      // Did child continue engaging? (session length signal)
  emotionalMatch: number;  // Did tone match the detected emotion?
  latency: number;         // Speed quality (1.0 = instant, lower for slow)
  safety: number;          // 1.0 = safe, 0.0 = safety violation (blocks learning)
}

/** A single captured interaction record */
export interface InteractionRecord {
  id: string;
  timestamp: number;
  childId: string;
  sessionId: string;
  input: string;
  normalizedInput: string;
  intent: string;
  response: string;
  emotion: string;
  scores: InteractionScores;
  compositeScore: number;    // Weighted average of all scores
  feedback: FeedbackSignal;
  sessionContinuedMs: number; // How long child kept engaging after this response
  isOffline: boolean;
  responseLatencyMs: number;
}

/** Learned response pattern — maps a situation to best known response */
export interface ResponsePattern {
  patternId: string;
  situationKey: string;       // Normalized: intent + emotion context
  responseBest: string;       // Current best response
  responsePrevious: string;   // What was there before the last improvement
  improvementScore: number;   // Score delta when improvement was applied
  successCount: number;       // Times this response got positive feedback
  failureCount: number;       // Times this response got negative feedback
  sampleCount: number;        // Total interactions used to build this pattern
  lastUpdated: number;
  lastUsed: number;
  version: number;
}

/** Per-child personalization profile */
export interface ChildProfile {
  childId: string;
  ageGroup: "toddler" | "young" | "middle" | "preteen"; // 3-4 | 5-7 | 8-10 | 11-12
  estimatedAge: number;
  interestVector: Record<string, number>;  // topic → affinity score (0-1)
  engagementHistory: number[];             // Rolling window of engagement scores
  avgEngagement: number;                   // EMA of engagement
  preferredLength: ResponseLength;
  preferredTone: ChildTone;
  sessionCount: number;
  totalInteractions: number;
  lastSeen: number;
  improvementBaseline: number;            // Baseline score for drift detection
}

/** A versioned snapshot for rollback */
export interface LearningSnapshot {
  version: number;
  timestamp: number;
  childId: string;
  label: string;
  patternsCount: number;
  avgCompositeScore: number;
  patternsJson: string;       // JSON of ResponsePattern[]
  profileJson: string;        // JSON of ChildProfile
}

/** Result of a batch improvement run */
export interface BatchImprovementResult {
  childId: string;
  patternsAnalyzed: number;
  patternsImproved: number;
  patternsRemoved: number;
  avgScoreBefore: number;
  avgScoreAfter: number;
  driftDetected: boolean;
  snapshotVersion: number;
  timestamp: number;
}

/** Engine event listener */
export type EngineEventListener = (event: EngineEvent, data?: unknown) => void;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UTILITY HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeText(text: string): string {
  return text.toLowerCase().trim()
    .replace(/[!?.…,;:"""«»()[\]{}]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Compute situation key from intent + emotion (for pattern lookup) */
function situationKey(intent: string, emotion: string): string {
  return `${intent.toLowerCase()}::${emotion.toLowerCase()}`;
}

/** Weighted composite score from individual dimensions */
function computeCompositeScore(scores: InteractionScores): number {
  // Safety is a gate: if 0, composite is 0 (blocked)
  if (scores.safety === 0) return 0;
  return (
    scores.comprehension * 0.25 +
    scores.engagement    * 0.35 +
    scores.emotionalMatch * 0.20 +
    scores.latency       * 0.10 +
    scores.safety        * 0.10
  );
}

/** Exponential moving average update */
function ema(current: number, newValue: number, alpha = 0.2): number {
  return alpha * newValue + (1 - alpha) * current;
}

/** Infer engagement score from session continuation time */
function engagementFromContinuation(continuedMs: number): number {
  if (continuedMs <= 0) return 0.1;
  if (continuedMs >= IMPLICIT_POSITIVE_TIMEOUT_MS) return 1.0;
  return Math.min(1.0, continuedMs / IMPLICIT_POSITIVE_TIMEOUT_MS);
}

/** Infer feedback signal from session continuation */
function feedbackFromContinuation(continuedMs: number): FeedbackSignal {
  if (continuedMs <= 0) return "neutral";
  if (continuedMs < IMPLICIT_NEGATIVE_TIMEOUT_MS) return "implicit_negative";
  if (continuedMs >= IMPLICIT_POSITIVE_TIMEOUT_MS) return "implicit_positive";
  return "neutral";
}

/** Convert age to age group */
function ageToGroup(age: number): ChildProfile["ageGroup"] {
  if (age <= 4) return "toddler";
  if (age <= 7) return "young";
  if (age <= 10) return "middle";
  return "preteen";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SAFETY GATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Strict safety gate — both input AND response are checked.
 * Returns 1.0 (safe) or 0.0 (blocked).
 * Blocked interactions are NEVER stored in learning memory.
 */
function safetyScore(input: string, response: string): number {
  if (isBlockedContent(input) || isBlockedContent(response)) return 0;
  // Additional heuristics for children's content
  const combined = (input + " " + response).toLowerCase();
  const riskyPatterns = [
    /\b(violence|sang|arme|tuer|mort|suicide|drogue|alcool|sexe)\b/i,
    /\b(haine|racisme|discrimination|insulte)\b/i,
    /\b(adresse|téléphone|mot de passe|argent|carte bancaire)\b/i,
    /\b(inconnu|étranger|rencontre|retrouve[- ]?moi)\b/i,
  ];
  if (riskyPatterns.some(p => p.test(combined))) return 0;
  return 1;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PERSISTENCE (localStorage + IndexedDB facade)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full — prune old data
    pruneStorage();
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch {
      console.warn("[AutoLearn] localStorage full, could not persist:", key);
    }
  }
}

function pruneStorage(): void {
  // Remove oldest interaction logs to free space
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX + "log_"));
    if (keys.length > 0) {
      localStorage.removeItem(keys[0]); // Remove oldest
    }
  } catch {
    // Silent
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHILD PROFILE MANAGER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function loadProfile(childId: string, estimatedAge = 7): ChildProfile {
  return lsGet<ChildProfile>(`profile_${childId}`, {
    childId,
    ageGroup: ageToGroup(estimatedAge),
    estimatedAge,
    interestVector: {},
    engagementHistory: [],
    avgEngagement: 0.5,
    preferredLength: "medium",
    preferredTone: "playful",
    sessionCount: 0,
    totalInteractions: 0,
    lastSeen: Date.now(),
    improvementBaseline: 0.5,
  });
}

function saveProfile(profile: ChildProfile): void {
  lsSet(`profile_${profile.childId}`, profile);
}

function updateProfile(profile: ChildProfile, record: InteractionRecord): ChildProfile {
  // Update interest vector based on intent
  const intent = record.intent.toLowerCase();
  profile.interestVector[intent] = ema(profile.interestVector[intent] ?? 0.3, record.compositeScore);

  // Rolling engagement history (last 20)
  profile.engagementHistory.push(record.scores.engagement);
  if (profile.engagementHistory.length > 20) profile.engagementHistory.shift();
  profile.avgEngagement = ema(profile.avgEngagement, record.scores.engagement);

  // Infer preferred tone from high-engagement intents
  const topIntent = Object.entries(profile.interestVector)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "chat";
  if (["story_request", "adventure"].includes(topIntent)) profile.preferredTone = "storytelling";
  else if (["calm_request", "emotion_negative"].includes(topIntent)) profile.preferredTone = "comforting";
  else if (["education"].includes(topIntent)) profile.preferredTone = "educational";
  else if (["humor"].includes(topIntent)) profile.preferredTone = "playful";

  // Infer preferred response length from age group
  if (profile.ageGroup === "toddler") profile.preferredLength = "short";
  else if (profile.ageGroup === "preteen") profile.preferredLength = "long";
  else profile.preferredLength = "medium";

  profile.totalInteractions++;
  profile.lastSeen = Date.now();
  return profile;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PATTERN STORE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function loadPatterns(childId: string): Map<string, ResponsePattern> {
  const raw = lsGet<ResponsePattern[]>(`patterns_${childId}`, []);
  const map = new Map<string, ResponsePattern>();
  for (const p of raw) map.set(p.patternId, p);
  return map;
}

function savePatterns(childId: string, patterns: Map<string, ResponsePattern>): void {
  const arr = Array.from(patterns.values())
    .sort((a, b) => b.lastUsed - a.lastUsed)
    .slice(0, MAX_PATTERN_CACHE);
  lsSet(`patterns_${childId}`, arr);
}

function getPatternKey(childId: string, situationK: string): string {
  return `${childId}::${situationK}`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTERACTION LOG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function loadInteractionLog(childId: string): InteractionRecord[] {
  return lsGet<InteractionRecord[]>(`log_${childId}`, []);
}

function appendInteraction(childId: string, record: InteractionRecord): void {
  const log = loadInteractionLog(childId);
  log.push(record);
  if (log.length > MAX_INTERACTION_LOG) log.splice(0, log.length - MAX_INTERACTION_LOG);
  lsSet(`log_${childId}`, log);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SNAPSHOT / VERSIONING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function loadSnapshots(childId: string): LearningSnapshot[] {
  return lsGet<LearningSnapshot[]>(`snapshots_${childId}`, []);
}

function saveSnapshots(childId: string, snapshots: LearningSnapshot[]): void {
  const pruned = snapshots
    .sort((a, b) => b.version - a.version)
    .slice(0, MAX_SNAPSHOTS);
  lsSet(`snapshots_${childId}`, pruned);
}

function createSnapshot(
  childId: string,
  patterns: Map<string, ResponsePattern>,
  profile: ChildProfile,
  label = "auto"
): LearningSnapshot {
  const snapshots = loadSnapshots(childId);
  const version = (snapshots[0]?.version ?? 0) + 1;
  const allScores = Array.from(patterns.values()).map(p => p.improvementScore);
  const avgScore = allScores.length > 0
    ? allScores.reduce((a, b) => a + b, 0) / allScores.length
    : 0.5;

  const snap: LearningSnapshot = {
    version,
    timestamp: Date.now(),
    childId,
    label,
    patternsCount: patterns.size,
    avgCompositeScore: avgScore,
    patternsJson: JSON.stringify(Array.from(patterns.values())),
    profileJson: JSON.stringify(profile),
  };

  snapshots.unshift(snap);
  saveSnapshots(childId, snapshots);
  return snap;
}

function rollbackToVersion(childId: string, version: number): boolean {
  const snapshots = loadSnapshots(childId);
  const snap = snapshots.find(s => s.version === version);
  if (!snap) return false;

  try {
    const patterns: ResponsePattern[] = JSON.parse(snap.patternsJson);
    const map = new Map<string, ResponsePattern>();
    for (const p of patterns) map.set(p.patternId, p);
    savePatterns(childId, map);

    const profile: ChildProfile = JSON.parse(snap.profileJson);
    saveProfile(profile);
    return true;
  } catch {
    return false;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RESPONSE IMPROVEMENT ENGINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Given a set of candidate responses for the same situation, pick the best one.
 * Uses composite score weighted voting — highest average wins.
 */
function selectBestResponse(candidates: Array<{ response: string; score: number }>): string | null {
  if (candidates.length === 0) return null;

  const grouped = new Map<string, number[]>();
  for (const c of candidates) {
    const key = c.response.trim();
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(c.score);
  }

  let bestResponse = "";
  let bestAvg = -1;
  for (const [resp, scores] of grouped) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg > bestAvg && scores.length >= Math.min(MIN_SAMPLES_FOR_IMPROVEMENT, candidates.length)) {
      bestAvg = avg;
      bestResponse = resp;
    }
  }

  return bestAvg >= IMPROVEMENT_SCORE_THRESHOLD ? bestResponse : null;
}

/**
 * Adapt response text based on child profile preferences.
 * Applies length trimming and tone markers.
 */
function adaptResponseToProfile(response: string, profile: ChildProfile): string {
  let adapted = response.trim();

  // Length adaptation
  const sentences = adapted.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (profile.preferredLength === "short" && sentences.length > 2) {
    adapted = sentences.slice(0, 2).join(". ") + ".";
  } else if (profile.preferredLength === "long" && sentences.length < 3) {
    // Don't truncate — keep full response
  }

  // Tone adaptation (add tone prefix if not already present)
  if (profile.preferredTone === "playful" && !adapted.match(/[😊🎉🎈✨]/)) {
    adapted = adapted; // Keep as-is; emoji injection handled at TTS layer
  }

  return adapted;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ANTI-DRIFT VALIDATOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Anti-drift check: compare current avg score against the child's baseline.
 * If the average has dropped significantly, flag for rollback consideration.
 */
function detectDrift(
  profile: ChildProfile,
  patterns: Map<string, ResponsePattern>
): { drifted: boolean; delta: number; currentAvg: number } {
  const scores = Array.from(patterns.values()).map(p => p.improvementScore);
  if (scores.length === 0) return { drifted: false, delta: 0, currentAvg: profile.improvementBaseline };

  const currentAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const delta = profile.improvementBaseline - currentAvg;
  const drifted = delta > DRIFT_ALERT_THRESHOLD;
  return { drifted, delta, currentAvg };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLOUD SYNC (Supabase stub — async, non-blocking)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface SyncPayload {
  childId: string;
  patternsCount: number;
  avgScore: number;
  timestamp: number;
  topPatterns: Array<{ situationKey: string; successCount: number; score: number }>;
}

async function syncToCloud(childId: string, patterns: Map<string, ResponsePattern>): Promise<boolean> {
  try {
    const topPatterns = Array.from(patterns.values())
      .sort((a, b) => b.improvementScore - a.improvementScore)
      .slice(0, 50)
      .map(p => ({
        situationKey: p.situationKey,
        successCount: p.successCount,
        score: p.improvementScore,
      }));

    const payload: SyncPayload = {
      childId,
      patternsCount: patterns.size,
      avgScore: topPatterns.reduce((a, b) => a + b.score, 0) / (topPatterns.length || 1),
      timestamp: Date.now(),
      topPatterns,
    };

    // Mark last sync time locally
    lsSet(`last_sync_${childId}`, { timestamp: payload.timestamp, patternsCount: payload.patternsCount });

    // Actual Supabase call would be here:
    // await supabase.from('learning_profiles').upsert({ child_id: childId, ...payload });

    return true;
  } catch {
    return false;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN ENGINE CLASS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class AutoLearningEngine {
  private patterns: Map<string, Map<string, ResponsePattern>> = new Map();
  private profiles: Map<string, ChildProfile> = new Map();
  private pendingInteractions: Map<string, InteractionRecord[]> = new Map();
  private batchTimer: ReturnType<typeof setInterval> | null = null;
  private snapshotTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: EngineEventListener[] = [];
  private sessionStartTimes: Map<string, number> = new Map(); // sessionId → start timestamp

  constructor() {
    this._startTimers();
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * LOOP A — MICRO: Capture an interaction and immediately run micro-improvement.
   * Call this after every Bobby response.
   *
   * @param childId       Unique child identifier
   * @param sessionId     Current session ID
   * @param input         Raw user input
   * @param intent        Detected intent (from detectOfflineIntent)
   * @param response      Bobby's response text
   * @param emotion       Detected emotional context
   * @param latencyMs     How long Bobby took to respond (ms)
   * @param isOffline     Whether running in offline mode
   */
  captureInteraction(params: {
    childId: string;
    sessionId: string;
    input: string;
    intent: string;
    response: string;
    emotion: string;
    latencyMs: number;
    isOffline: boolean;
    estimatedAge?: number;
  }): InteractionRecord {
    const { childId, sessionId, input, intent, response, emotion, latencyMs, isOffline, estimatedAge = 7 } = params;

    // Safety gate first
    const safety = safetyScore(input, response);
    if (safety === 0) {
      this._emit("safety_blocked", { childId, input: input.slice(0, 50) });
      // Return a dummy record without storing it
      return this._createDummyRecord(params, safety);
    }

    // Compute initial scores (engagement will be updated via updateImplicitFeedback)
    const scores: InteractionScores = {
      comprehension: this._estimateComprehension(input, response),
      engagement: 0.5, // Will be updated by updateImplicitFeedback
      emotionalMatch: this._estimateEmotionalMatch(emotion, response),
      latency: this._latencyScore(latencyMs),
      safety,
    };

    const compositeScore = computeCompositeScore(scores);

    const record: InteractionRecord = {
      id: generateId(),
      timestamp: Date.now(),
      childId,
      sessionId,
      input,
      normalizedInput: normalizeText(input),
      intent,
      response,
      emotion,
      scores,
      compositeScore,
      feedback: "neutral",
      sessionContinuedMs: 0,
      isOffline,
      responseLatencyMs: latencyMs,
    };

    // Load/update child profile
    const profile = this._getOrLoadProfile(childId, estimatedAge);
    const updatedProfile = updateProfile(profile, record);
    this._setProfile(childId, updatedProfile);
    saveProfile(updatedProfile);

    // Run micro-improvement (Loop A)
    this._microImprovement(childId, record);

    // Queue for batch
    if (!this.pendingInteractions.has(childId)) {
      this.pendingInteractions.set(childId, []);
    }
    this.pendingInteractions.get(childId)!.push(record);

    // Persist log
    appendInteraction(childId, record);

    this._emit("interaction_captured", { childId, compositeScore });
    return record;
  }

  /**
   * Update implicit feedback after a response — call this when you know how long
   * the child continued engaging after a specific interaction.
   *
   * @param recordId        The ID returned from captureInteraction
   * @param childId         Child identifier
   * @param continuedMs     How many ms the child kept engaging (0 if session ended)
   */
  updateImplicitFeedback(recordId: string, childId: string, continuedMs: number): void {
    const log = loadInteractionLog(childId);
    const idx = log.findIndex(r => r.id === recordId);
    if (idx === -1) return;

    const record = log[idx];
    record.sessionContinuedMs = continuedMs;
    record.scores.engagement = engagementFromContinuation(continuedMs);
    record.feedback = feedbackFromContinuation(continuedMs);
    record.compositeScore = computeCompositeScore(record.scores);
    log[idx] = record;

    lsSet(`log_${childId}`, log);

    // Re-run micro-improvement with updated engagement
    this._microImprovement(childId, record);
  }

  /**
   * Explicit feedback from user (e.g. parent rating, child re-asking).
   */
  setExplicitFeedback(recordId: string, childId: string, signal: FeedbackSignal): void {
    const log = loadInteractionLog(childId);
    const idx = log.findIndex(r => r.id === recordId);
    if (idx === -1) return;

    const record = log[idx];
    record.feedback = signal;

    // Adjust engagement score based on explicit feedback
    if (signal === "positive" || signal === "implicit_positive") {
      record.scores.engagement = Math.min(1.0, record.scores.engagement + 0.2);
    } else if (signal === "negative" || signal === "implicit_negative") {
      record.scores.engagement = Math.max(0.0, record.scores.engagement - 0.3);
    }
    record.compositeScore = computeCompositeScore(record.scores);
    log[idx] = record;
    lsSet(`log_${childId}`, log);
    this._microImprovement(childId, record);
  }

  /**
   * Get the best known response for a given situation key, personalized for child.
   * Returns null if no learned pattern exists.
   */
  getLearnedResponse(childId: string, intent: string, emotion: string): string | null {
    const patterns = this._getOrLoadPatterns(childId);
    const key = getPatternKey(childId, situationKey(intent, emotion));
    const pattern = patterns.get(key);
    if (!pattern || pattern.successCount < MIN_SAMPLES_FOR_IMPROVEMENT) return null;

    // Update last used
    pattern.lastUsed = Date.now();
    this._setPatterns(childId, patterns);

    const profile = this._getOrLoadProfile(childId);
    return adaptResponseToProfile(pattern.responseBest, profile);
  }

  /**
   * Get personalization hints for the current child.
   */
  getPersonalizationHints(childId: string): {
    preferredTone: ChildTone;
    preferredLength: ResponseLength;
    topInterests: string[];
    avgEngagement: number;
  } {
    const profile = this._getOrLoadProfile(childId);
    const topInterests = Object.entries(profile.interestVector)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k);

    return {
      preferredTone: profile.preferredTone,
      preferredLength: profile.preferredLength,
      topInterests,
      avgEngagement: profile.avgEngagement,
    };
  }

  /**
   * LOOP B — MACRO: Run batch strategic improvement for a child.
   * Analyzes recent interactions, identifies weak patterns, replaces with best candidates.
   * Creates a version snapshot before applying changes.
   */
  async runBatchImprovement(childId: string): Promise<BatchImprovementResult> {
    const log = loadInteractionLog(childId);
    const patterns = this._getOrLoadPatterns(childId);
    const profile = this._getOrLoadProfile(childId);

    const before = Array.from(patterns.values());
    const avgScoreBefore = before.length > 0
      ? before.reduce((a, p) => a + p.improvementScore, 0) / before.length
      : 0;

    // Create snapshot before batch
    const snap = createSnapshot(childId, patterns, profile, `batch_${Date.now()}`);

    let improved = 0;
    let removed = 0;

    // Group log by situation key
    const grouped = new Map<string, InteractionRecord[]>();
    for (const record of log) {
      if (record.scores.safety === 0) continue; // Safety gate
      const sk = situationKey(record.intent, record.emotion);
      const pk = getPatternKey(childId, sk);
      if (!grouped.has(pk)) grouped.set(pk, []);
      grouped.get(pk)!.push(record);
    }

    // For each situation key with enough samples, try to improve
    for (const [pk, records] of grouped) {
      if (records.length < MIN_SAMPLES_FOR_IMPROVEMENT) continue;

      const candidates = records.map(r => ({ response: r.response, score: r.compositeScore }));
      const best = selectBestResponse(candidates);
      if (!best) continue;

      const existing = patterns.get(pk);
      const currentBest = existing?.responseBest ?? "";

      if (best !== currentBest) {
        const newScore = candidates
          .filter(c => c.response === best)
          .reduce((a, c) => a + c.score, 0) / candidates.filter(c => c.response === best).length;

        const pattern: ResponsePattern = {
          patternId: pk,
          situationKey: records[0].intent + "::" + records[0].emotion,
          responseBest: best,
          responsePrevious: currentBest,
          improvementScore: newScore,
          successCount: records.filter(r => r.feedback === "positive" || r.feedback === "implicit_positive").length,
          failureCount: records.filter(r => r.feedback === "negative" || r.feedback === "implicit_negative").length,
          sampleCount: records.length,
          lastUpdated: Date.now(),
          lastUsed: Date.now(),
          version: (existing?.version ?? 0) + 1,
        };
        patterns.set(pk, pattern);
        improved++;
        this._emit("improvement_applied", { childId, patternId: pk, score: newScore });
      }
    }

    // Prune chronically low-scoring patterns
    for (const [pk, pattern] of patterns) {
      const failRate = pattern.failureCount / (pattern.successCount + pattern.failureCount + 1);
      if (failRate > 0.7 && pattern.sampleCount >= MIN_SAMPLES_FOR_IMPROVEMENT) {
        patterns.delete(pk);
        removed++;
      }
    }

    // Anti-drift check
    const { drifted, delta, currentAvg } = detectDrift(profile, patterns);
    if (drifted) {
      this._emit("drift_detected", { childId, delta, currentAvg, baseline: profile.improvementBaseline });
      // Auto-rollback to last snapshot if drift is severe
      if (delta > DRIFT_ALERT_THRESHOLD * 2) {
        const snapshots = loadSnapshots(childId);
        const prevSnap = snapshots.find(s => s.version === snap.version - 1);
        if (prevSnap) {
          rollbackToVersion(childId, prevSnap.version);
          this._emit("rollback_executed", { childId, toVersion: prevSnap.version });
        }
      }
    } else {
      // Update baseline on healthy improvement
      profile.improvementBaseline = ema(profile.improvementBaseline, currentAvg, 0.1);
      saveProfile(profile);
    }

    savePatterns(childId, patterns);
    this._setPatterns(childId, patterns);

    const after = Array.from(patterns.values());
    const avgScoreAfter = after.length > 0
      ? after.reduce((a, p) => a + p.improvementScore, 0) / after.length
      : 0;

    // Async cloud sync (non-blocking)
    syncToCloud(childId, patterns).then(ok => {
      if (ok) this._emit("sync_completed", { childId });
    });

    return {
      childId,
      patternsAnalyzed: grouped.size,
      patternsImproved: improved,
      patternsRemoved: removed,
      avgScoreBefore,
      avgScoreAfter,
      driftDetected: drifted,
      snapshotVersion: snap.version,
      timestamp: Date.now(),
    };
  }

  /**
   * Replay recent sessions to identify top failure patterns.
   * Returns a diagnostic report useful for manual review.
   */
  replayAndAnalyze(childId: string, lastN = 50): {
    topFailures: Array<{ intent: string; emotion: string; avgScore: number; count: number }>;
    topSuccesses: Array<{ intent: string; emotion: string; avgScore: number; count: number }>;
    overallAvgScore: number;
    sessionCount: number;
  } {
    const log = loadInteractionLog(childId);
    const recent = log.slice(-lastN);

    if (recent.length === 0) {
      return { topFailures: [], topSuccesses: [], overallAvgScore: 0, sessionCount: 0 };
    }

    const grouped = new Map<string, { scores: number[]; intent: string; emotion: string }>();
    const sessions = new Set<string>();

    for (const r of recent) {
      sessions.add(r.sessionId);
      const sk = situationKey(r.intent, r.emotion);
      if (!grouped.has(sk)) grouped.set(sk, { scores: [], intent: r.intent, emotion: r.emotion });
      grouped.get(sk)!.scores.push(r.compositeScore);
    }

    const analyzed = Array.from(grouped.entries()).map(([, v]) => ({
      intent: v.intent,
      emotion: v.emotion,
      avgScore: v.scores.reduce((a, b) => a + b, 0) / v.scores.length,
      count: v.scores.length,
    }));

    const topFailures = analyzed
      .filter(a => a.avgScore < IMPROVEMENT_SCORE_THRESHOLD)
      .sort((a, b) => a.avgScore - b.avgScore)
      .slice(0, 5);

    const topSuccesses = analyzed
      .filter(a => a.avgScore >= IMPROVEMENT_SCORE_THRESHOLD)
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 5);

    const overallAvgScore = recent.reduce((a, r) => a + r.compositeScore, 0) / recent.length;

    return {
      topFailures,
      topSuccesses,
      overallAvgScore,
      sessionCount: sessions.size,
    };
  }

  /**
   * Rollback a child's patterns to a specific version.
   * Returns true on success.
   */
  rollback(childId: string, version: number): boolean {
    const ok = rollbackToVersion(childId, version);
    if (ok) {
      // Invalidate in-memory caches
      this.patterns.delete(childId);
      this.profiles.delete(childId);
      this._emit("rollback_executed", { childId, toVersion: version });
    }
    return ok;
  }

  /**
   * List all available snapshots for a child.
   */
  listSnapshots(childId: string): LearningSnapshot[] {
    return loadSnapshots(childId);
  }

  /**
   * Register an event listener.
   */
  on(listener: EngineEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Get engine statistics for a child.
   */
  getStats(childId: string): {
    totalInteractions: number;
    learnedPatterns: number;
    avgCompositeScore: number;
    topIntent: string;
    lastActivity: number;
    snapshotCount: number;
    profile: ChildProfile;
  } {
    const log = loadInteractionLog(childId);
    const patterns = this._getOrLoadPatterns(childId);
    const profile = this._getOrLoadProfile(childId);
    const snapshots = loadSnapshots(childId);

    const scores = log.map(r => r.compositeScore);
    const avgCompositeScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    const topIntent = Object.entries(profile.interestVector)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "unknown";

    return {
      totalInteractions: log.length,
      learnedPatterns: patterns.size,
      avgCompositeScore,
      topIntent,
      lastActivity: profile.lastSeen,
      snapshotCount: snapshots.length,
      profile,
    };
  }

  /** Graceful shutdown — flush pending batches */
  async destroy(): Promise<void> {
    if (this.batchTimer) clearInterval(this.batchTimer);
    if (this.snapshotTimer) clearInterval(this.snapshotTimer);

    // Flush all pending batches
    for (const childId of this.pendingInteractions.keys()) {
      if ((this.pendingInteractions.get(childId)?.length ?? 0) > 0) {
        await this.runBatchImprovement(childId);
      }
    }
  }

  // ─── Private methods ───────────────────────────────────────────────────────

  private _startTimers(): void {
    // Loop B — MACRO timer: batch improvement every N minutes
    this.batchTimer = setInterval(async () => {
      for (const childId of this.pendingInteractions.keys()) {
        const pending = this.pendingInteractions.get(childId) ?? [];
        if (pending.length >= MIN_SAMPLES_FOR_IMPROVEMENT) {
          await this.runBatchImprovement(childId);
          this.pendingInteractions.set(childId, []);
        }
      }
    }, BATCH_IMPROVEMENT_INTERVAL_MS);

    // Snapshot timer: periodic snapshots
    this.snapshotTimer = setInterval(() => {
      for (const childId of this.profiles.keys()) {
        const patterns = this._getOrLoadPatterns(childId);
        const profile = this._getOrLoadProfile(childId);
        if (patterns.size > 0) {
          createSnapshot(childId, patterns, profile, "periodic");
          this._emit("snapshot_created", { childId });
        }
      }
    }, SNAPSHOT_INTERVAL_MS);
  }

  private _microImprovement(childId: string, record: InteractionRecord): void {
    if (record.scores.safety === 0) return; // Safety gate

    const patterns = this._getOrLoadPatterns(childId);
    const sk = situationKey(record.intent, record.emotion);
    const pk = getPatternKey(childId, sk);

    const existing = patterns.get(pk);

    if (!existing) {
      // First time seeing this situation — seed the pattern
      if (record.compositeScore >= IMPROVEMENT_SCORE_THRESHOLD) {
        patterns.set(pk, {
          patternId: pk,
          situationKey: sk,
          responseBest: record.response,
          responsePrevious: "",
          improvementScore: record.compositeScore,
          successCount: record.feedback === "positive" || record.feedback === "implicit_positive" ? 1 : 0,
          failureCount: record.feedback === "negative" || record.feedback === "implicit_negative" ? 1 : 0,
          sampleCount: 1,
          lastUpdated: Date.now(),
          lastUsed: Date.now(),
          version: 1,
        });
      }
    } else {
      // Update existing pattern
      existing.sampleCount++;
      existing.lastUsed = Date.now();

      if (record.feedback === "positive" || record.feedback === "implicit_positive") {
        existing.successCount++;
      } else if (record.feedback === "negative" || record.feedback === "implicit_negative") {
        existing.failureCount++;
      }

      // Replace best response if new one scores significantly higher
      if (record.compositeScore > existing.improvementScore + 0.05 &&
          record.compositeScore >= IMPROVEMENT_SCORE_THRESHOLD) {
        existing.responsePrevious = existing.responseBest;
        existing.responseBest = record.response;
        existing.improvementScore = record.compositeScore;
        existing.lastUpdated = Date.now();
        existing.version++;
        this._emit("improvement_applied", { childId, patternId: pk, score: record.compositeScore });
      } else {
        // EMA update to smooth the score
        existing.improvementScore = ema(existing.improvementScore, record.compositeScore, 0.15);
      }

      patterns.set(pk, existing);
    }

    this._setPatterns(childId, patterns);
    savePatterns(childId, patterns);
  }

  private _estimateComprehension(input: string, response: string): number {
    // Heuristic: if response is short (< 20 words) and direct, higher comprehension
    // If response contains question marks, child might need clarification (lower)
    const responseWords = response.split(/\s+/).length;
    const inputWords = input.split(/\s+/).length;

    let score = 0.7; // Default
    if (responseWords < 20) score += 0.15; // Concise = clearer
    if (responseWords > 60) score -= 0.1;  // Too long = harder to follow
    if (input.includes("?") && response.includes("?")) score -= 0.05; // Both asking = confusion
    if (inputWords <= 5 && responseWords < 30) score += 0.1; // Simple exchange
    return Math.max(0, Math.min(1, score));
  }

  private _estimateEmotionalMatch(emotion: string, response: string): number {
    const lower = response.toLowerCase();
    const emotionToKeywords: Record<string, string[]> = {
      "joy": ["super", "génial", "bravo", "yay", "fantastique", "trop bien", "cool"],
      "sadness": ["je comprends", "c'est dur", "je suis là", "câlin", "ça va aller", "courage"],
      "fear": ["n'aie pas peur", "je suis là", "courage", "tu es en sécurité", "calme"],
      "anger": ["je comprends", "c'est frustrant", "respire", "calme", "c'est normal"],
      "neutral": ["alors", "voilà", "d'accord", "bien sûr"],
      "excited": ["waouh", "trop bien", "génial", "super", "incroyable"],
      "curious": ["bonne question", "c'est intéressant", "voilà", "tu sais"],
    };

    const keywords = emotionToKeywords[emotion.toLowerCase()] ?? emotionToKeywords["neutral"];
    const matchCount = keywords.filter(kw => lower.includes(kw)).length;
    return Math.min(1.0, 0.5 + matchCount * 0.1);
  }

  private _latencyScore(latencyMs: number): number {
    if (latencyMs <= 0) return 1.0;
    if (latencyMs < 500) return 1.0;
    if (latencyMs < 1000) return 0.9;
    if (latencyMs < 2000) return 0.75;
    if (latencyMs < 3000) return 0.6;
    if (latencyMs < 5000) return 0.4;
    return 0.2;
  }

  private _createDummyRecord(
    params: Parameters<AutoLearningEngine["captureInteraction"]>[0],
    safety: number
  ): InteractionRecord {
    const scores: InteractionScores = {
      comprehension: 0,
      engagement: 0,
      emotionalMatch: 0,
      latency: 1,
      safety,
    };
    return {
      id: generateId(),
      timestamp: Date.now(),
      childId: params.childId,
      sessionId: params.sessionId,
      input: params.input,
      normalizedInput: normalizeText(params.input),
      intent: params.intent,
      response: params.response,
      emotion: params.emotion,
      scores,
      compositeScore: 0,
      feedback: "negative",
      sessionContinuedMs: 0,
      isOffline: params.isOffline,
      responseLatencyMs: params.latencyMs,
    };
  }

  private _getOrLoadProfile(childId: string, estimatedAge = 7): ChildProfile {
    if (!this.profiles.has(childId)) {
      this.profiles.set(childId, loadProfile(childId, estimatedAge));
    }
    return this.profiles.get(childId)!;
  }

  private _setProfile(childId: string, profile: ChildProfile): void {
    this.profiles.set(childId, profile);
  }

  private _getOrLoadPatterns(childId: string): Map<string, ResponsePattern> {
    if (!this.patterns.has(childId)) {
      this.patterns.set(childId, loadPatterns(childId));
    }
    return this.patterns.get(childId)!;
  }

  private _setPatterns(childId: string, patterns: Map<string, ResponsePattern>): void {
    this.patterns.set(childId, patterns);
  }

  private _emit(event: EngineEvent, data?: unknown): void {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch {
        // Listener errors must not crash the engine
      }
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SINGLETON EXPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Global singleton — import and use directly in orchestrator or hooks */
export const autoLearningEngine = new AutoLearningEngine();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REACT HOOK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useState, useEffect, useCallback, useRef } from "react";

export interface UseAutoLearningOptions {
  childId: string;
  sessionId: string;
  estimatedAge?: number;
  onEngineEvent?: EngineEventListener;
}

export interface UseAutoLearningReturn {
  /** Call after every Bobby response */
  captureInteraction: (params: {
    input: string;
    intent: string;
    response: string;
    emotion: string;
    latencyMs: number;
    isOffline: boolean;
  }) => InteractionRecord;
  /** Call when you know how long child engaged after a response */
  updateImplicitFeedback: (recordId: string, continuedMs: number) => void;
  /** Get a learned personalized response, or null if not enough data */
  getLearnedResponse: (intent: string, emotion: string) => string | null;
  /** Personalization hints for generating Bobby's response */
  personalizationHints: ReturnType<AutoLearningEngine["getPersonalizationHints"]>;
  /** Current engine stats */
  stats: ReturnType<AutoLearningEngine["getStats"]> | null;
  /** Manually trigger batch improvement */
  runBatchImprovement: () => Promise<BatchImprovementResult>;
  /** List snapshots for rollback UI */
  snapshots: LearningSnapshot[];
  /** Roll back to a specific version */
  rollback: (version: number) => boolean;
  /** Diagnostic report */
  replayReport: ReturnType<AutoLearningEngine["replayAndAnalyze"]> | null;
}

export function useAutoLearning({
  childId,
  sessionId,
  estimatedAge = 7,
  onEngineEvent,
}: UseAutoLearningOptions): UseAutoLearningReturn {
  const [stats, setStats] = useState<ReturnType<AutoLearningEngine["getStats"]> | null>(null);
  const [snapshots, setSnapshots] = useState<LearningSnapshot[]>([]);
  const [replayReport, setReplayReport] = useState<ReturnType<AutoLearningEngine["replayAndAnalyze"]> | null>(null);
  const [personalizationHints, setPersonalizationHints] = useState<ReturnType<AutoLearningEngine["getPersonalizationHints"]>>(
    () => autoLearningEngine.getPersonalizationHints(childId)
  );

  const engineRef = useRef(autoLearningEngine);

  // Subscribe to engine events
  useEffect(() => {
    const unsubscribe = engineRef.current.on((event, data) => {
      onEngineEvent?.(event, data);
      // Refresh stats on key events
      if (["improvement_applied", "snapshot_created", "rollback_executed", "sync_completed"].includes(event)) {
        setStats(engineRef.current.getStats(childId));
        setSnapshots(engineRef.current.listSnapshots(childId));
        setPersonalizationHints(engineRef.current.getPersonalizationHints(childId));
      }
    });
    return unsubscribe;
  }, [childId, onEngineEvent]);

  // Initial load
  useEffect(() => {
    setStats(engineRef.current.getStats(childId));
    setSnapshots(engineRef.current.listSnapshots(childId));
    setReplayReport(engineRef.current.replayAndAnalyze(childId));
    setPersonalizationHints(engineRef.current.getPersonalizationHints(childId));
  }, [childId]);

  const captureInteraction = useCallback((params: {
    input: string;
    intent: string;
    response: string;
    emotion: string;
    latencyMs: number;
    isOffline: boolean;
  }) => {
    return engineRef.current.captureInteraction({
      ...params,
      childId,
      sessionId,
      estimatedAge,
    });
  }, [childId, sessionId, estimatedAge]);

  const updateImplicitFeedback = useCallback((recordId: string, continuedMs: number) => {
    engineRef.current.updateImplicitFeedback(recordId, childId, continuedMs);
  }, [childId]);

  const getLearnedResponse = useCallback((intent: string, emotion: string) => {
    return engineRef.current.getLearnedResponse(childId, intent, emotion);
  }, [childId]);

  const runBatchImprovement = useCallback(async () => {
    const result = await engineRef.current.runBatchImprovement(childId);
    setStats(engineRef.current.getStats(childId));
    setSnapshots(engineRef.current.listSnapshots(childId));
    setReplayReport(engineRef.current.replayAndAnalyze(childId));
    return result;
  }, [childId]);

  const rollback = useCallback((version: number) => {
    return engineRef.current.rollback(childId, version);
  }, [childId]);

  return {
    captureInteraction,
    updateImplicitFeedback,
    getLearnedResponse,
    personalizationHints,
    stats,
    runBatchImprovement,
    snapshots,
    rollback,
    replayReport,
  };
}
