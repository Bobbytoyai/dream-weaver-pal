/**
 * Bobby Stability Engine v2.6
 * 
 * Provides:
 * - Failsafe responses for any failure scenario
 * - Latency masking (micro-reactions while waiting)
 * - Soft auto-reset on bugs
 * - Low-power mode detection
 * - Module health watchdog
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FAILSAFE RESPONSES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const FAILSAFE_RESPONSES = [
  "On peut jouer si tu veux !",
  "Je suis là ! Tu veux qu'on fasse quelque chose ?",
  "Dis-moi ce que tu veux faire !",
  "On continue ensemble ?",
  "Tu veux une histoire ou un jeu ?",
  "Je t'écoute, vas-y !",
];

const LATENCY_FILLERS = [
  "Hmm, laisse-moi réfléchir…",
  "Attends une seconde…",
  "Je réfléchis…",
  "Bonne question, attends…",
];

const SOFT_RESET_PHRASES = [
  "On continue ?",
  "Allez, je suis prêt !",
  "C'est reparti !",
  "Je suis là, vas-y !",
];

let failsafeIdx = 0;
let fillerIdx = 0;
let resetIdx = 0;

function rotateIndex(idx: number, len: number): number {
  return (idx + 1) % len;
}

/** Get a failsafe response for any failure */
export function getFailsafeResponse(): string {
  const resp = FAILSAFE_RESPONSES[failsafeIdx];
  failsafeIdx = rotateIndex(failsafeIdx, FAILSAFE_RESPONSES.length);
  return resp;
}

/** Get a latency filler while AI is processing */
export function getLatencyFiller(): string {
  const resp = LATENCY_FILLERS[fillerIdx];
  fillerIdx = rotateIndex(fillerIdx, LATENCY_FILLERS.length);
  return resp;
}

/** Get a soft reset phrase (invisible recovery) */
export function getSoftResetPhrase(): string {
  const resp = SOFT_RESET_PHRASES[resetIdx];
  resetIdx = rotateIndex(resetIdx, SOFT_RESET_PHRASES.length);
  return resp;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MODULE HEALTH WATCHDOG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ModuleHealth {
  mic: boolean;
  audio: boolean;
  ai: boolean;
  animation: boolean;
  lastCheck: number;
}

let moduleHealth: ModuleHealth = {
  mic: true,
  audio: true,
  ai: true,
  animation: true,
  lastCheck: Date.now(),
};

const healthListeners = new Set<(h: ModuleHealth) => void>();

export function reportModuleHealth(module: keyof Omit<ModuleHealth, "lastCheck">, healthy: boolean) {
  const prev = moduleHealth[module];
  moduleHealth[module] = healthy;
  moduleHealth.lastCheck = Date.now();
  if (prev !== healthy) {
    console.log(`[Stability] ${module}: ${healthy ? "✅" : "❌"}`);
    healthListeners.forEach(cb => cb({ ...moduleHealth }));
  }
}

export function getModuleHealth(): ModuleHealth {
  return { ...moduleHealth };
}

export function onHealthChange(cb: (h: ModuleHealth) => void): () => void {
  healthListeners.add(cb);
  return () => healthListeners.delete(cb);
}

/** Check if any critical module is down */
export function hasCriticalFailure(): boolean {
  return !moduleHealth.mic && !moduleHealth.audio;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LATENCY MONITOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SLOW_THRESHOLD_MS = 2000;

/** 
 * Returns true if the elapsed time exceeds the "slow" threshold,
 * meaning we should show a latency filler to the child.
 */
export function isResponseSlow(startTime: number): boolean {
  return Date.now() - startTime > SLOW_THRESHOLD_MS;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LOW POWER MODE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let lowPowerMode = false;
const lowPowerListeners = new Set<(low: boolean) => void>();

export function isLowPower(): boolean { return lowPowerMode; }

export function setLowPower(low: boolean) {
  if (lowPowerMode === low) return;
  lowPowerMode = low;
  console.log(`[Stability] Low power mode: ${low ? "ON" : "OFF"}`);
  lowPowerListeners.forEach(cb => cb(low));
}

export function onLowPowerChange(cb: (low: boolean) => void): () => void {
  lowPowerListeners.add(cb);
  return () => lowPowerListeners.delete(cb);
}

// Auto-detect low power via battery API
if (typeof navigator !== "undefined" && "getBattery" in navigator) {
  (navigator as any).getBattery?.().then((battery: any) => {
    const check = () => setLowPower(battery.level < 0.15 && !battery.charging);
    battery.addEventListener("levelchange", check);
    battery.addEventListener("chargingchange", check);
    check();
  }).catch(() => {});
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RETRY WITH EXPONENTIAL BACKOFF
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelay = 500
): Promise<T> {
  let lastError: Error | undefined;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      if (e.name === "AbortError") throw e;
      if (i < maxRetries) {
        const delay = baseDelay * Math.pow(2, i) + Math.random() * 200;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONNECTION QUALITY TRACKER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let avgLatencyMs = 0;
let latencySamples = 0;

export function recordLatency(ms: number) {
  latencySamples++;
  avgLatencyMs = avgLatencyMs + (ms - avgLatencyMs) / latencySamples;
}

export function getAvgLatency(): number { return Math.round(avgLatencyMs); }

/** True if connection quality is poor (should prefer offline engine) */
export function isHighLatency(): boolean {
  return avgLatencyMs > 3000 && latencySamples >= 2;
}

export function resetLatencyStats() {
  avgLatencyMs = 0;
  latencySamples = 0;
}
