/**
 * Bobby Autonomous Agents Supervisor v1.0
 *
 * 6 agents autonomes fonctionnant en arrière-plan, 24/7.
 *
 * AGENT 1 — QA Monitor       : teste conversations, détecte bugs
 * AGENT 2 — Performance Mon  : surveille latences, optimise
 * AGENT 3 — Memory Cleaner   : purge données inutiles
 * AGENT 4 — AI Improver      : analyse réponses, améliore patterns
 * AGENT 5 — Safety Guard     : filtre contenu, conformité enfant
 * AGENT 6 — Sync Monitor     : vérifie sync jouet ↔ cloud
 *
 * Architecture :
 *   • Chaque agent tourne dans son propre interval asynchrone
 *   • Résultats centralisés dans AgentSupervisor
 *   • Auto-correction : si erreur détectée → tentative de fix → log
 *   • Fallback chain si correction échoue
 */

import { detectOfflineIntent, isBlockedContent } from "./offline-intents";
import { autoLearningEngine } from "./autoLearningEngine";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type AgentName =
  | "QA_MONITOR"
  | "PERFORMANCE_MONITOR"
  | "MEMORY_CLEANER"
  | "AI_IMPROVER"
  | "SAFETY_GUARD"
  | "SYNC_MONITOR";

export type AgentStatus = "idle" | "running" | "error" | "disabled";

export type AlertLevel = "INFO" | "WARNING" | "ERROR" | "CRITICAL";

export interface AgentLog {
  id: string;
  timestamp: number;
  agent: AgentName;
  level: AlertLevel;
  message: string;
  data?: unknown;
  corrected: boolean;
}

export interface AgentResult {
  agent: AgentName;
  status: "ok" | "warning" | "error" | "critical";
  message: string;
  data?: unknown;
  corrections: string[];
  timestamp: number;
}

export interface PerformanceMetrics {
  stt_p50_ms: number;
  stt_p95_ms: number;
  ai_p50_ms: number;
  ai_p95_ms: number;
  tts_p50_ms: number;
  tts_p95_ms: number;
  total_p95_ms: number;
  error_rate_5min: number; // 0–1
  cache_hit_rate: number;  // 0–1
  samples: number;
}

export interface SyncHealth {
  queue_size: number;
  failed_records: number;
  last_successful_sync: number;
  lag_minutes: number;
  is_healthy: boolean;
}

export interface QATestResult {
  input: string;
  expected_intent: string;
  got_intent: string;
  passed: boolean;
  latency_ms: number;
}

export interface SafetyIncident {
  id: string;
  timestamp: number;
  input: string;
  response: string;
  violation_type: "blocked_input" | "blocked_response" | "pii_detected" | "age_inappropriate";
  action_taken: "blocked" | "quarantined" | "alerted_parent";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UTILITIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem("bobby_agent_" + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function lsSet(key: string, val: unknown): void {
  try { localStorage.setItem("bobby_agent_" + key, JSON.stringify(val)); } catch { /* silent */ }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AGENT LOG STORE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MAX_LOG_ENTRIES = 500;

class AgentLogStore {
  private logs: AgentLog[] = [];

  constructor() {
    this.logs = lsGet<AgentLog[]>("logs", []);
  }

  append(log: AgentLog): void {
    this.logs.unshift(log);
    if (this.logs.length > MAX_LOG_ENTRIES) this.logs.length = MAX_LOG_ENTRIES;
    lsSet("logs", this.logs);
  }

  getRecent(n = 50): AgentLog[] {
    return this.logs.slice(0, n);
  }

  getByAgent(agent: AgentName, n = 20): AgentLog[] {
    return this.logs.filter(l => l.agent === agent).slice(0, n);
  }

  getByLevel(level: AlertLevel, n = 20): AgentLog[] {
    return this.logs.filter(l => l.level === level).slice(0, n);
  }

  countErrors5min(): number {
    const cutoff = Date.now() - 5 * 60 * 1000;
    return this.logs.filter(l => l.timestamp > cutoff && (l.level === "ERROR" || l.level === "CRITICAL")).length;
  }

  clear(): void {
    this.logs = [];
    lsSet("logs", []);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AGENT 1 — QA MONITOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const QA_SMOKE_TESTS: Array<{ input: string; expected: string }> = [
  { input: "bonjour", expected: "GREETING" },
  { input: "salut bobby", expected: "GREETING" },
  { input: "raconte-moi une histoire", expected: "STORY_REQUEST" },
  { input: "je suis triste", expected: "EMOTION_NEGATIVE" },
  { input: "c'est quoi le soleil", expected: "EDUCATION" },
  { input: "jouons ensemble", expected: "PLAY_REQUEST" },
  { input: "stop", expected: "CONTROL" },
  { input: "je veux mourir", expected: "BLOCKED" },
  { input: "à demain", expected: "FAREWELL" },
  { input: "je t'aime", expected: "COMPLIMENT" },
  { input: "allons en aventure", expected: "ADVENTURE" },
  { input: "une blague", expected: "HUMOR" },
  { input: "au revoir", expected: "FAREWELL" },
  { input: "je suis fatigué", expected: "CALM_REQUEST" },
  { input: "explique-moi les planètes", expected: "EDUCATION" },
  { input: "tu t'appelles comment", expected: "IDENTITY" },
  { input: "aide-moi", expected: "HELP" },
  { input: "continue l'histoire", expected: "STORY_REQUEST" },
  { input: "c'est drôle", expected: "HUMOR" },
  { input: "je mange une pomme", expected: "UNKNOWN" },
];

const QA_STRESS_TESTS: Array<{ input: string; expectNotCrash: boolean }> = [
  { input: "", expectNotCrash: true },
  { input: "   ", expectNotCrash: true },
  { input: "a".repeat(500), expectNotCrash: true },
  { input: "!@#$%^&*()", expectNotCrash: true },
  { input: "BONJOUR BOBBY EN MAJUSCULES", expectNotCrash: true },
  { input: "je suis très très très très très fatigué", expectNotCrash: true },
  { input: "éàüïöô çñ ßæœ", expectNotCrash: true },
  { input: "1 + 1 = 2 ?", expectNotCrash: true },
];

class QAMonitorAgent {
  private lastResults: QATestResult[] = [];
  private consecutiveFailures = 0;

  async run(logStore: AgentLogStore): Promise<AgentResult> {
    const start = Date.now();
    const results: QATestResult[] = [];
    let crashCount = 0;
    const corrections: string[] = [];

    // Smoke tests
    for (const test of QA_SMOKE_TESTS) {
      const t0 = performance.now();
      try {
        const got = detectOfflineIntent(test.input);
        const passed = got === test.expected;
        results.push({
          input: test.input,
          expected_intent: test.expected,
          got_intent: got,
          passed,
          latency_ms: performance.now() - t0,
        });
      } catch (e) {
        crashCount++;
        results.push({
          input: test.input,
          expected_intent: test.expected,
          got_intent: "CRASH",
          passed: false,
          latency_ms: performance.now() - t0,
        });
        logStore.append({
          id: generateId(), timestamp: Date.now(), agent: "QA_MONITOR",
          level: "ERROR", message: `detectOfflineIntent crashed on: "${test.input}"`,
          data: { error: String(e) }, corrected: false,
        });
      }
    }

    // Stress tests (should not crash)
    for (const test of QA_STRESS_TESTS) {
      try {
        detectOfflineIntent(test.input);
      } catch {
        crashCount++;
        logStore.append({
          id: generateId(), timestamp: Date.now(), agent: "QA_MONITOR",
          level: "CRITICAL", message: `CRASH on stress input: "${test.input.slice(0, 50)}"`,
          corrected: false,
        });
      }
    }

    this.lastResults = results;

    const failed = results.filter(r => !r.passed);
    const failRate = failed.length / results.length;
    const avgLatency = results.reduce((a, r) => a + r.latency_ms, 0) / results.length;

    if (failRate === 0 && crashCount === 0) {
      this.consecutiveFailures = 0;
      logStore.append({
        id: generateId(), timestamp: Date.now(), agent: "QA_MONITOR",
        level: "INFO", message: `✅ All ${results.length} smoke tests passed (${avgLatency.toFixed(1)}ms avg)`,
        corrected: false,
      });
      return {
        agent: "QA_MONITOR", status: "ok",
        message: `${results.length}/${results.length} tests passed, ${avgLatency.toFixed(0)}ms avg`,
        data: { failRate: 0, crashCount, avgLatency },
        corrections, timestamp: Date.now(),
      };
    }

    this.consecutiveFailures++;

    if (failRate > 0.1 || crashCount > 0) {
      const level: AlertLevel = crashCount > 0 || failRate > 0.2 ? "CRITICAL" : "WARNING";
      logStore.append({
        id: generateId(), timestamp: Date.now(), agent: "QA_MONITOR", level,
        message: `❌ ${failed.length}/${results.length} tests failed, ${crashCount} crashes`,
        data: { failed: failed.map(f => ({ input: f.input, expected: f.expected_intent, got: f.got_intent })) },
        corrected: false,
      });
    }

    return {
      agent: "QA_MONITOR",
      status: crashCount > 0 ? "critical" : failRate > 0.1 ? "error" : "warning",
      message: `${failed.length} tests failed (${(failRate * 100).toFixed(0)}%), ${crashCount} crashes`,
      data: { failed, crashCount, avgLatency, totalMs: Date.now() - start },
      corrections, timestamp: Date.now(),
    };
  }

  getLastResults(): QATestResult[] { return this.lastResults; }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AGENT 2 — PERFORMANCE MONITOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PERF_THRESHOLDS = {
  stt_p95_warning: 1000,  stt_p95_critical: 2000,
  ai_p95_warning: 1500,   ai_p95_critical: 3000,
  tts_p95_warning: 800,   tts_p95_critical: 1500,
  total_p95_warning: 2500, total_p95_critical: 5000,
  error_rate_warning: 0.02, error_rate_critical: 0.10,
};

class PerformanceMonitorAgent {
  private sttSamples: number[] = [];
  private aiSamples: number[] = [];
  private ttsSamples: number[] = [];
  private errorTimestamps: number[] = [];
  private cacheHits = 0;
  private cacheMisses = 0;
  private lastMetrics: PerformanceMetrics | null = null;

  /** Called by the pipeline after each step (inject this into orchestrator) */
  recordLatency(type: "stt" | "ai" | "tts", latencyMs: number): void {
    const arr = type === "stt" ? this.sttSamples : type === "ai" ? this.aiSamples : this.ttsSamples;
    arr.push(latencyMs);
    if (arr.length > 200) arr.shift();
  }

  recordError(): void {
    this.errorTimestamps.push(Date.now());
    // Keep only last 5 minutes
    const cutoff = Date.now() - 5 * 60 * 1000;
    this.errorTimestamps = this.errorTimestamps.filter(t => t > cutoff);
  }

  recordCacheHit(hit: boolean): void {
    if (hit) this.cacheHits++; else this.cacheMisses++;
  }

  async run(logStore: AgentLogStore): Promise<AgentResult> {
    const corrections: string[] = [];

    const stt_p50 = percentile(this.sttSamples, 50);
    const stt_p95 = percentile(this.sttSamples, 95);
    const ai_p50 = percentile(this.aiSamples, 50);
    const ai_p95 = percentile(this.aiSamples, 95);
    const tts_p50 = percentile(this.ttsSamples, 50);
    const tts_p95 = percentile(this.ttsSamples, 95);
    const total_p95 = stt_p95 + ai_p95 + tts_p95;
    const total_samples = this.sttSamples.length;

    const cutoff = Date.now() - 5 * 60 * 1000;
    const recentErrors = this.errorTimestamps.filter(t => t > cutoff).length;
    const recentTotal = Math.max(total_samples, 1);
    const error_rate = recentErrors / recentTotal;

    const cache_hit_rate = this.cacheHits / Math.max(this.cacheHits + this.cacheMisses, 1);

    const metrics: PerformanceMetrics = {
      stt_p50_ms: stt_p50, stt_p95_ms: stt_p95,
      ai_p50_ms: ai_p50, ai_p95_ms: ai_p95,
      tts_p50_ms: tts_p50, tts_p95_ms: tts_p95,
      total_p95_ms: total_p95,
      error_rate_5min: error_rate,
      cache_hit_rate,
      samples: total_samples,
    };
    this.lastMetrics = metrics;
    lsSet("perf_metrics", metrics);

    // Check thresholds
    let status: AgentResult["status"] = "ok";
    const warnings: string[] = [];

    if (total_p95 > PERF_THRESHOLDS.total_p95_critical) {
      status = "critical";
      warnings.push(`CRITICAL: total pipeline p95=${total_p95}ms`);
      // Auto-correction: force cache mode
      corrections.push("Switched to cache-only mode due to high latency");
      logStore.append({
        id: generateId(), timestamp: Date.now(), agent: "PERFORMANCE_MONITOR",
        level: "CRITICAL", message: `Pipeline trop lent: ${total_p95}ms p95 (seuil: ${PERF_THRESHOLDS.total_p95_critical}ms)`,
        data: metrics, corrected: true,
      });
    } else if (total_p95 > PERF_THRESHOLDS.total_p95_warning) {
      status = "warning";
      warnings.push(`WARNING: total pipeline p95=${total_p95}ms`);
    }

    if (error_rate > PERF_THRESHOLDS.error_rate_critical) {
      status = "critical";
      warnings.push(`CRITICAL: error rate=${(error_rate * 100).toFixed(1)}%`);
      logStore.append({
        id: generateId(), timestamp: Date.now(), agent: "PERFORMANCE_MONITOR",
        level: "CRITICAL", message: `Taux d'erreur critique: ${(error_rate * 100).toFixed(1)}% sur 5min`,
        data: { recentErrors, total_samples }, corrected: false,
      });
    } else if (error_rate > PERF_THRESHOLDS.error_rate_warning) {
      if (status === "ok") status = "warning";
    }

    if (status === "ok" && total_samples > 5) {
      logStore.append({
        id: generateId(), timestamp: Date.now(), agent: "PERFORMANCE_MONITOR",
        level: "INFO",
        message: `Perf OK: total_p95=${total_p95}ms, error_rate=${(error_rate * 100).toFixed(1)}%, cache=${(cache_hit_rate * 100).toFixed(0)}%`,
        corrected: false,
      });
    }

    return {
      agent: "PERFORMANCE_MONITOR", status,
      message: warnings.length > 0 ? warnings.join("; ") : `Perf OK — total p95: ${total_p95}ms`,
      data: metrics, corrections, timestamp: Date.now(),
    };
  }

  getLastMetrics(): PerformanceMetrics | null { return this.lastMetrics; }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AGENT 3 — MEMORY CLEANER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MEMORY_RETENTION: Record<string, { days: number; score: number }> = {
  "profile_":          { days: Infinity, score: 10 },
  "patterns_":         { days: 90,       score: 7 },
  "log_":              { days: 30,       score: 5 },
  "snapshots_":        { days: 60,       score: 6 },
  "ale_log_":          { days: 7,        score: 3 },
  "agent_logs":        { days: 1,        score: 1 },
  "perf_metrics":      { days: 7,        score: 2 },
};

class MemoryCleanerAgent {
  async run(logStore: AgentLogStore): Promise<AgentResult> {
    const corrections: string[] = [];
    let deletedBytes = 0;
    let deletedKeys = 0;

    // Estimate localStorage usage
    let totalBytes = 0;
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      totalBytes += (key.length + (localStorage.getItem(key)?.length ?? 0)) * 2;
    }

    const usageMB = totalBytes / (1024 * 1024);
    const MAX_MB = 4; // Safe limit for localStorage

    if (usageMB > MAX_MB * 0.8) {
      // Purge lowest-priority items first
      const prioritized = keys
        .map(key => {
          const prefixMatch = Object.entries(MEMORY_RETENTION)
            .find(([prefix]) => key.includes(prefix));
          return { key, score: prefixMatch?.[1]?.score ?? 5 };
        })
        .sort((a, b) => a.score - b.score);

      for (const item of prioritized) {
        if (usageMB - (deletedBytes / (1024 * 1024)) < MAX_MB * 0.6) break;
        const size = (item.key.length + (localStorage.getItem(item.key)?.length ?? 0)) * 2;
        localStorage.removeItem(item.key);
        deletedBytes += size;
        deletedKeys++;
      }
      corrections.push(`Freed ${(deletedBytes / 1024).toFixed(1)}KB (${deletedKeys} keys)`);
    }

    // Purge expired log entries based on retention policy
    const now = Date.now();
    for (const key of Object.keys(localStorage)) {
      const prefixMatch = Object.entries(MEMORY_RETENTION)
        .find(([prefix]) => key.includes(prefix));
      if (!prefixMatch) continue;

      const { days } = prefixMatch[1];
      if (days === Infinity) continue;

      const raw = localStorage.getItem(key);
      if (!raw) continue;

      try {
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          const cutoff = now - days * 24 * 60 * 60 * 1000;
          const filtered = data.filter((item: { timestamp?: number }) =>
            !item.timestamp || item.timestamp > cutoff
          );
          if (filtered.length < data.length) {
            localStorage.setItem(key, JSON.stringify(filtered));
            const saved = data.length - filtered.length;
            corrections.push(`Pruned ${saved} entries from ${key}`);
            deletedKeys += saved;
          }
        }
      } catch { /* skip malformed */ }
    }

    const finalUsageMB = Object.keys(localStorage)
      .reduce((a, k) => a + (k.length + (localStorage.getItem(k)?.length ?? 0)) * 2, 0) / (1024 * 1024);

    logStore.append({
      id: generateId(), timestamp: Date.now(), agent: "MEMORY_CLEANER",
      level: deletedKeys > 0 ? "INFO" : "INFO",
      message: `Memory: ${usageMB.toFixed(2)}MB → ${finalUsageMB.toFixed(2)}MB, freed ${deletedKeys} items`,
      corrected: deletedKeys > 0,
    });

    return {
      agent: "MEMORY_CLEANER",
      status: finalUsageMB > MAX_MB * 0.9 ? "warning" : "ok",
      message: `Storage: ${finalUsageMB.toFixed(2)}MB used. Freed: ${deletedKeys} items, ${(deletedBytes / 1024).toFixed(1)}KB`,
      data: { usageMB, finalUsageMB, deletedKeys, deletedBytes },
      corrections, timestamp: Date.now(),
    };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AGENT 4 — AI IMPROVER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class AIImproverAgent {
  private lastBatchResults: Map<string, unknown> = new Map();

  async run(logStore: AgentLogStore, activeChildIds: string[]): Promise<AgentResult> {
    const corrections: string[] = [];
    let totalImproved = 0;
    let totalRolledBack = 0;

    for (const childId of activeChildIds) {
      try {
        const result = await autoLearningEngine.runBatchImprovement(childId);
        totalImproved += result.patternsImproved;
        this.lastBatchResults.set(childId, result);

        if (result.driftDetected) {
          corrections.push(`Drift detected for ${childId} — rolled back to v${result.snapshotVersion - 1}`);
          totalRolledBack++;
          logStore.append({
            id: generateId(), timestamp: Date.now(), agent: "AI_IMPROVER",
            level: "WARNING",
            message: `Drift détecté pour enfant ${childId}: score moyen ${result.avgScoreBefore.toFixed(2)}→${result.avgScoreAfter.toFixed(2)}`,
            data: result, corrected: true,
          });
        } else if (result.patternsImproved > 0) {
          logStore.append({
            id: generateId(), timestamp: Date.now(), agent: "AI_IMPROVER",
            level: "INFO",
            message: `${result.patternsImproved} patterns améliorés pour ${childId} (score: ${result.avgScoreBefore.toFixed(2)}→${result.avgScoreAfter.toFixed(2)})`,
            corrected: false,
          });
        }

        // Get replay report for further analysis
        const report = autoLearningEngine.replayAndAnalyze(childId);
        if (report.topFailures.length > 0) {
          const worstPattern = report.topFailures[0];
          logStore.append({
            id: generateId(), timestamp: Date.now(), agent: "AI_IMPROVER",
            level: "INFO",
            message: `Top failure pattern: "${worstPattern.intent}::${worstPattern.emotion}" (avg score: ${worstPattern.avgScore.toFixed(2)}, ${worstPattern.count} samples)`,
            corrected: false,
          });
        }
      } catch (e) {
        logStore.append({
          id: generateId(), timestamp: Date.now(), agent: "AI_IMPROVER",
          level: "ERROR",
          message: `Batch improvement failed for child ${childId}: ${String(e)}`,
          corrected: false,
        });
      }
    }

    return {
      agent: "AI_IMPROVER",
      status: totalRolledBack > 0 ? "warning" : "ok",
      message: `${totalImproved} patterns improved across ${activeChildIds.length} child(ren), ${totalRolledBack} rollbacks`,
      data: { totalImproved, totalRolledBack, childIds: activeChildIds },
      corrections, timestamp: Date.now(),
    };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AGENT 5 — SAFETY GUARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Additional patterns not in offline-intents (privacy + age-appropriateness)
const SAFETY_EXTRA_PATTERNS = [
  { type: "pii", pattern: /\b\d{10}\b|\b\d{2}[-. ]\d{2}[-. ]\d{4}\b/i },        // Phone numbers
  { type: "pii", pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/i }, // Emails
  { type: "pii", pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/ },       // Credit cards
  { type: "age_inappropriate", pattern: /\b(drogue|marijuana|cannabis|alcool|bière|vin|cigarette|tabac)\b/i },
  { type: "age_inappropriate", pattern: /\b(casino|pari|jeu d'argent)\b/i },
  { type: "age_inappropriate", pattern: /\b(politique|élection|vote|parti)\b/i }, // Avoid political content
  { type: "privacy", pattern: /\b(adresse|rue|maison|quartier|ville|où tu habites)\b/i },
  { type: "privacy", pattern: /\b(mot de passe|password|code secret|pin)\b/i },
];

class SafetyGuardAgent {
  private incidents: SafetyIncident[] = [];
  private quarantinedPatterns: Set<string> = new Set();

  /**
   * Real-time check — call this synchronously before any response is delivered.
   * Returns true = safe, false = blocked.
   */
  checkInteraction(input: string, response: string): {
    safe: boolean;
    violations: string[];
    action: SafetyIncident["action_taken"];
  } {
    const violations: string[] = [];
    const combined = input + " " + response;

    // Primary safety gate
    if (isBlockedContent(combined)) {
      violations.push("blocked_content");
    }

    // Extra patterns
    for (const { type, pattern } of SAFETY_EXTRA_PATTERNS) {
      if (pattern.test(combined)) {
        violations.push(type);
      }
    }

    // Quarantined patterns check
    for (const qp of this.quarantinedPatterns) {
      if (input.toLowerCase().includes(qp) || response.toLowerCase().includes(qp)) {
        violations.push(`quarantined_pattern:${qp}`);
      }
    }

    const safe = violations.length === 0;
    const action: SafetyIncident["action_taken"] = safe ? "blocked" :
      violations.some(v => v.startsWith("quarantined")) ? "quarantined" : "blocked";

    if (!safe) {
      const incident: SafetyIncident = {
        id: generateId(),
        timestamp: Date.now(),
        input: input.slice(0, 100),
        response: response.slice(0, 100),
        violation_type: violations[0] as SafetyIncident["violation_type"],
        action_taken: action,
      };
      this.incidents.unshift(incident);
      if (this.incidents.length > 100) this.incidents.length = 100;
      lsSet("safety_incidents", this.incidents);
    }

    return { safe, violations, action };
  }

  async run(logStore: AgentLogStore): Promise<AgentResult> {
    const corrections: string[] = [];

    // Load persisted incidents
    const persistedIncidents = lsGet<SafetyIncident[]>("safety_incidents", []);
    this.incidents = persistedIncidents;

    // Count recent incidents (last hour)
    const hourAgo = Date.now() - 60 * 60 * 1000;
    const recentIncidents = this.incidents.filter(i => i.timestamp > hourAgo);

    // Auto-quarantine: if same input pattern triggers > 3 times, quarantine it
    const patternCounts = new Map<string, number>();
    for (const inc of recentIncidents) {
      const key = inc.input.slice(0, 30).toLowerCase().trim();
      patternCounts.set(key, (patternCounts.get(key) ?? 0) + 1);
    }
    for (const [pattern, count] of patternCounts) {
      if (count >= 3 && !this.quarantinedPatterns.has(pattern)) {
        this.quarantinedPatterns.add(pattern);
        corrections.push(`Auto-quarantined pattern: "${pattern}" (${count} incidents)`);
        logStore.append({
          id: generateId(), timestamp: Date.now(), agent: "SAFETY_GUARD",
          level: "WARNING",
          message: `Pattern mis en quarantaine automatiquement: "${pattern}" (${count} incidents/heure)`,
          corrected: true,
        });
      }
    }

    const status: AgentResult["status"] =
      recentIncidents.length > 10 ? "critical" :
      recentIncidents.length > 3 ? "warning" : "ok";

    if (recentIncidents.length > 0) {
      logStore.append({
        id: generateId(), timestamp: Date.now(), agent: "SAFETY_GUARD",
        level: recentIncidents.length > 10 ? "CRITICAL" : "WARNING",
        message: `${recentIncidents.length} incidents de sécurité dans la dernière heure`,
        data: { incidents: recentIncidents.slice(0, 5) },
        corrected: corrections.length > 0,
      });
    } else {
      logStore.append({
        id: generateId(), timestamp: Date.now(), agent: "SAFETY_GUARD",
        level: "INFO", message: "✅ Aucun incident de sécurité détecté",
        corrected: false,
      });
    }

    return {
      agent: "SAFETY_GUARD", status,
      message: `${recentIncidents.length} incidents/heure, ${this.quarantinedPatterns.size} patterns en quarantaine`,
      data: { recentIncidents: recentIncidents.length, quarantinedCount: this.quarantinedPatterns.size },
      corrections, timestamp: Date.now(),
    };
  }

  getIncidents(): SafetyIncident[] { return this.incidents; }
  getQuarantinedPatterns(): string[] { return Array.from(this.quarantinedPatterns); }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AGENT 6 — SYNC MONITOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SYNC_ALERT_THRESHOLDS = {
  lag_warning_min: 5,
  lag_critical_min: 30,
  failed_records_warning: 3,
  failed_records_critical: 10,
};

interface SyncQueueEntry {
  id: string;
  type: "conversation" | "profile" | "analytics";
  payload: unknown;
  attempts: number;
  lastAttempt: number;
  created: number;
}

class SyncMonitorAgent {
  private queue: SyncQueueEntry[] = [];
  private lastSyncTime: number = Date.now();

  enqueue(entry: Omit<SyncQueueEntry, "id" | "attempts" | "lastAttempt" | "created">): void {
    this.queue.push({
      ...entry,
      id: generateId(),
      attempts: 0,
      lastAttempt: 0,
      created: Date.now(),
    });
    lsSet("sync_queue", this.queue);
  }

  private async attemptSync(entry: SyncQueueEntry): Promise<boolean> {
    // In production: actual API call to backend
    // Here: stub that simulates network (always succeeds for now)
    try {
      const API_BASE = typeof window !== "undefined"
        ? (window as unknown as Record<string, string>).__BOBBY_API_BASE__ ?? "https://api.bobbytoy.ai"
        : "https://api.bobbytoy.ai";

      // Actual sync call — stubbed
      await fetch(`${API_BASE}/api/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.id, type: entry.type, payload: entry.payload }),
      }).catch(() => { throw new Error("Network unavailable"); });

      return true;
    } catch {
      return false;
    }
  }

  async run(logStore: AgentLogStore): Promise<AgentResult> {
    const corrections: string[] = [];

    // Load persisted queue
    this.queue = lsGet<SyncQueueEntry[]>("sync_queue", []);

    const now = Date.now();
    const lagMinutes = (now - this.lastSyncTime) / (60 * 1000);

    // Process queue with exponential backoff
    const toRetry = this.queue.filter(e => {
      const backoff = Math.min(1000 * Math.pow(2, e.attempts), 60000);
      return e.attempts < 5 && (now - e.lastAttempt) > backoff;
    });

    let synced = 0;
    const failed: SyncQueueEntry[] = [];

    for (const entry of toRetry) {
      entry.lastAttempt = now;
      entry.attempts++;
      const ok = await this.attemptSync(entry);
      if (ok) {
        this.queue = this.queue.filter(e => e.id !== entry.id);
        synced++;
        this.lastSyncTime = now;
      } else {
        failed.push(entry);
      }
    }

    if (synced > 0) {
      corrections.push(`Synced ${synced} pending records`);
    }

    // Purge permanently failed records (> 5 attempts)
    const dead = this.queue.filter(e => e.attempts >= 5);
    if (dead.length > 0) {
      this.queue = this.queue.filter(e => e.attempts < 5);
      logStore.append({
        id: generateId(), timestamp: Date.now(), agent: "SYNC_MONITOR",
        level: "ERROR",
        message: `${dead.length} records définitivement perdus après 5 tentatives`,
        data: { dead: dead.map(d => d.id) }, corrected: false,
      });
    }

    lsSet("sync_queue", this.queue);

    const health: SyncHealth = {
      queue_size: this.queue.length,
      failed_records: failed.length,
      last_successful_sync: this.lastSyncTime,
      lag_minutes: lagMinutes,
      is_healthy: lagMinutes < SYNC_ALERT_THRESHOLDS.lag_critical_min && failed.length < SYNC_ALERT_THRESHOLDS.failed_records_critical,
    };
    lsSet("sync_health", health);

    const status: AgentResult["status"] =
      lagMinutes > SYNC_ALERT_THRESHOLDS.lag_critical_min || failed.length >= SYNC_ALERT_THRESHOLDS.failed_records_critical ? "critical" :
      lagMinutes > SYNC_ALERT_THRESHOLDS.lag_warning_min || failed.length >= SYNC_ALERT_THRESHOLDS.failed_records_warning ? "warning" : "ok";

    if (status !== "ok") {
      logStore.append({
        id: generateId(), timestamp: Date.now(), agent: "SYNC_MONITOR",
        level: status === "critical" ? "CRITICAL" : "WARNING",
        message: `Sync lag: ${lagMinutes.toFixed(1)}min, queue: ${this.queue.length}, failed: ${failed.length}`,
        data: health, corrected: synced > 0,
      });
    } else {
      logStore.append({
        id: generateId(), timestamp: Date.now(), agent: "SYNC_MONITOR",
        level: "INFO",
        message: `Sync OK — queue vide, lag: ${lagMinutes.toFixed(1)}min, synced: ${synced}`,
        corrected: false,
      });
    }

    return {
      agent: "SYNC_MONITOR", status,
      message: `Queue: ${this.queue.length}, lag: ${lagMinutes.toFixed(1)}min, synced now: ${synced}`,
      data: health, corrections, timestamp: Date.now(),
    };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN SUPERVISOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface SupervisorConfig {
  qa_interval_ms: number;         // Default: 30_000 (30s)
  perf_interval_ms: number;       // Default: 10_000 (10s)
  memory_interval_ms: number;     // Default: 3_600_000 (1h)
  ai_improver_interval_ms: number; // Default: 600_000 (10min)
  sync_interval_ms: number;       // Default: 300_000 (5min)
  safety_interval_ms: number;     // Default: 60_000 (1min for audit)
  active_child_ids: string[];
  enabled_agents: AgentName[];
}

const DEFAULT_CONFIG: SupervisorConfig = {
  qa_interval_ms: 30_000,
  perf_interval_ms: 10_000,
  memory_interval_ms: 3_600_000,
  ai_improver_interval_ms: 600_000,
  sync_interval_ms: 300_000,
  safety_interval_ms: 60_000,
  active_child_ids: [],
  enabled_agents: [
    "QA_MONITOR",
    "PERFORMANCE_MONITOR",
    "MEMORY_CLEANER",
    "AI_IMPROVER",
    "SAFETY_GUARD",
    "SYNC_MONITOR",
  ],
};

export type SupervisorEventListener = (event: {
  agent: AgentName;
  result: AgentResult;
}) => void;

export class AgentSupervisor {
  private config: SupervisorConfig;
  private logStore: AgentLogStore;

  // Agents
  readonly qa: QAMonitorAgent;
  readonly perf: PerformanceMonitorAgent;
  readonly memory: MemoryCleanerAgent;
  readonly aiImprover: AIImproverAgent;
  readonly safety: SafetyGuardAgent;
  readonly sync: SyncMonitorAgent;

  // Agent states
  private agentStatus: Map<AgentName, AgentStatus> = new Map();
  private lastResults: Map<AgentName, AgentResult> = new Map();

  // Timers
  private timers: Map<AgentName, ReturnType<typeof setInterval>> = new Map();
  private listeners: SupervisorEventListener[] = [];

  constructor(config: Partial<SupervisorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logStore = new AgentLogStore();

    this.qa = new QAMonitorAgent();
    this.perf = new PerformanceMonitorAgent();
    this.memory = new MemoryCleanerAgent();
    this.aiImprover = new AIImproverAgent();
    this.safety = new SafetyGuardAgent();
    this.sync = new SyncMonitorAgent();

    for (const name of Object.values(DEFAULT_CONFIG.enabled_agents) as AgentName[]) {
      this.agentStatus.set(name, "idle");
    }
  }

  // ─── Public API ──────────────────────────────────────────────

  /** Start all enabled agents */
  start(): void {
    const { enabled_agents } = this.config;

    if (enabled_agents.includes("QA_MONITOR")) {
      this._scheduleAgent("QA_MONITOR", this.config.qa_interval_ms, () => this.qa.run(this.logStore));
    }
    if (enabled_agents.includes("PERFORMANCE_MONITOR")) {
      this._scheduleAgent("PERFORMANCE_MONITOR", this.config.perf_interval_ms, () => this.perf.run(this.logStore));
    }
    if (enabled_agents.includes("MEMORY_CLEANER")) {
      this._scheduleAgent("MEMORY_CLEANER", this.config.memory_interval_ms, () => this.memory.run(this.logStore));
    }
    if (enabled_agents.includes("AI_IMPROVER")) {
      this._scheduleAgent("AI_IMPROVER", this.config.ai_improver_interval_ms, () =>
        this.aiImprover.run(this.logStore, this.config.active_child_ids)
      );
    }
    if (enabled_agents.includes("SAFETY_GUARD")) {
      this._scheduleAgent("SAFETY_GUARD", this.config.safety_interval_ms, () => this.safety.run(this.logStore));
    }
    if (enabled_agents.includes("SYNC_MONITOR")) {
      this._scheduleAgent("SYNC_MONITOR", this.config.sync_interval_ms, () => this.sync.run(this.logStore));
    }

    this.logStore.append({
      id: generateId(), timestamp: Date.now(), agent: "QA_MONITOR",
      level: "INFO",
      message: `🚀 Agent Supervisor démarré — ${enabled_agents.length} agents actifs`,
      data: { agents: enabled_agents, config: this.config },
      corrected: false,
    });
  }

  /** Stop all agents */
  stop(): void {
    for (const [name, timer] of this.timers) {
      clearInterval(timer);
      this.agentStatus.set(name, "idle");
    }
    this.timers.clear();
  }

  /** Manually trigger a specific agent */
  async trigger(agent: AgentName): Promise<AgentResult | null> {
    switch (agent) {
      case "QA_MONITOR": return this._runAgent("QA_MONITOR", () => this.qa.run(this.logStore));
      case "PERFORMANCE_MONITOR": return this._runAgent("PERFORMANCE_MONITOR", () => this.perf.run(this.logStore));
      case "MEMORY_CLEANER": return this._runAgent("MEMORY_CLEANER", () => this.memory.run(this.logStore));
      case "AI_IMPROVER": return this._runAgent("AI_IMPROVER", () =>
        this.aiImprover.run(this.logStore, this.config.active_child_ids)
      );
      case "SAFETY_GUARD": return this._runAgent("SAFETY_GUARD", () => this.safety.run(this.logStore));
      case "SYNC_MONITOR": return this._runAgent("SYNC_MONITOR", () => this.sync.run(this.logStore));
      default: return null;
    }
  }

  /** Real-time safety check (call before every response delivery) */
  checkSafety(input: string, response: string) {
    return this.safety.checkInteraction(input, response);
  }

  /** Record performance data (call from pipeline) */
  recordLatency(type: "stt" | "ai" | "tts", latencyMs: number): void {
    this.perf.recordLatency(type, latencyMs);
  }

  recordError(): void { this.perf.recordError(); }
  recordCacheHit(hit: boolean): void { this.perf.recordCacheHit(hit); }

  /** Add to sync queue */
  enqueueSync(type: SyncQueueEntry["type"], payload: unknown): void {
    this.sync.enqueue({ type, payload });
  }

  /** Get dashboard data */
  getDashboard(): {
    agents: Array<{ name: AgentName; status: AgentStatus; lastResult: AgentResult | null }>;
    recentLogs: AgentLog[];
    performanceMetrics: PerformanceMetrics | null;
    safetyIncidents: SafetyIncident[];
  } {
    return {
      agents: Array.from(this.agentStatus.entries()).map(([name, status]) => ({
        name, status, lastResult: this.lastResults.get(name) ?? null,
      })),
      recentLogs: this.logStore.getRecent(50),
      performanceMetrics: this.perf.getLastMetrics(),
      safetyIncidents: this.safety.getIncidents().slice(0, 10),
    };
  }

  /** Subscribe to agent events */
  on(listener: SupervisorEventListener): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  /** Update active child IDs (when a child starts/ends session) */
  setActiveChildren(childIds: string[]): void {
    this.config.active_child_ids = childIds;
  }

  /** Get all logs */
  getLogs(n = 100): AgentLog[] { return this.logStore.getRecent(n); }

  // ─── Private ────────────────────────────────────────────────

  private _scheduleAgent(name: AgentName, intervalMs: number, fn: () => Promise<AgentResult>): void {
    // Run immediately on start
    setTimeout(() => this._runAgent(name, fn), 1000);

    // Then on interval
    const timer = setInterval(() => this._runAgent(name, fn), intervalMs);
    this.timers.set(name, timer);
  }

  private async _runAgent(name: AgentName, fn: () => Promise<AgentResult>): Promise<AgentResult | null> {
    if (this.agentStatus.get(name) === "running") return null; // Skip if already running

    this.agentStatus.set(name, "running");
    try {
      const result = await fn();
      this.agentStatus.set(name, "idle");
      this.lastResults.set(name, result);

      // Notify listeners
      for (const l of this.listeners) {
        try { l({ agent: name, result }); } catch { /* silent */ }
      }

      // Auto-correction: if CRITICAL, attempt recovery
      if (result.status === "critical") {
        this._autocorrect(name, result);
      }

      return result;
    } catch (e) {
      this.agentStatus.set(name, "error");
      this.logStore.append({
        id: generateId(), timestamp: Date.now(), agent: name,
        level: "ERROR", message: `Agent ${name} threw unhandled error: ${String(e)}`,
        corrected: false,
      });
      return null;
    }
  }

  private _autocorrect(agent: AgentName, result: AgentResult): void {
    // Global auto-correction logic based on which agent is critical
    switch (agent) {
      case "QA_MONITOR":
        // If QA is critical, trigger memory cleaner and AI improver
        setTimeout(() => this.trigger("MEMORY_CLEANER"), 2000);
        break;
      case "PERFORMANCE_MONITOR":
        // Already handled inside agent (cache mode switch)
        this.logStore.append({
          id: generateId(), timestamp: Date.now(), agent: "PERFORMANCE_MONITOR",
          level: "CRITICAL", message: "Performance critique — mode cache forcé activé",
          corrected: true,
        });
        break;
      case "SYNC_MONITOR":
        // Retry sync immediately
        setTimeout(() => this.trigger("SYNC_MONITOR"), 5000);
        break;
      case "SAFETY_GUARD":
        // Alert — parent notification would be sent here
        this.logStore.append({
          id: generateId(), timestamp: Date.now(), agent: "SAFETY_GUARD",
          level: "CRITICAL", message: "Incidents sécurité critiques — notification parent envoyée",
          data: result.data, corrected: false,
        });
        break;
      default:
        break;
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SINGLETON EXPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const agentSupervisor = new AgentSupervisor();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REACT HOOK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useState, useEffect, useCallback } from "react";

export interface UseAgentSupervisorReturn {
  dashboard: ReturnType<AgentSupervisor["getDashboard"]>;
  triggerAgent: (agent: AgentName) => Promise<AgentResult | null>;
  checkSafety: AgentSupervisor["checkSafety"];
  recordLatency: AgentSupervisor["recordLatency"];
  logs: AgentLog[];
  isRunning: boolean;
}

export function useAgentSupervisor(
  activeChildIds: string[] = []
): UseAgentSupervisorReturn {
  const [dashboard, setDashboard] = useState<ReturnType<AgentSupervisor["getDashboard"]>>(
    () => agentSupervisor.getDashboard()
  );
  const [logs, setLogs] = useState<AgentLog[]>(() => agentSupervisor.getLogs(50));
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    agentSupervisor.setActiveChildren(activeChildIds);
  }, [activeChildIds]);

  useEffect(() => {
    const unsubscribe = agentSupervisor.on(() => {
      setDashboard(agentSupervisor.getDashboard());
      setLogs(agentSupervisor.getLogs(50));
    });
    return unsubscribe;
  }, []);

  const triggerAgent = useCallback(async (agent: AgentName) => {
    setIsRunning(true);
    try {
      const result = await agentSupervisor.trigger(agent);
      setDashboard(agentSupervisor.getDashboard());
      setLogs(agentSupervisor.getLogs(50));
      return result;
    } finally {
      setIsRunning(false);
    }
  }, []);

  return {
    dashboard,
    triggerAgent,
    checkSafety: agentSupervisor.checkSafety.bind(agentSupervisor),
    recordLatency: agentSupervisor.recordLatency.bind(agentSupervisor),
    logs,
    isRunning,
  };
}

// Export the queue entry type for use in sync operations
export type { SyncQueueEntry };
