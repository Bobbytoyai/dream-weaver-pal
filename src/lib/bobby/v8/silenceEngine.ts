/**
 * Bobby Brain V8 — Silence & Attention Engine
 *
 * Detects boredom, hesitation, distraction, and adapts strategy accordingly.
 * Tracks attention patterns over the session to adjust Bobby's behavior.
 *
 * Execution: <1ms, 100% offline.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type SilenceReason =
  | "thinking"       // Child is processing/thinking
  | "hesitation"     // Unsure what to say
  | "boredom"        // Lost interest
  | "distraction"    // Attention elsewhere
  | "shyness"        // Intimidated or shy
  | "confusion"      // Didn't understand Bobby
  | "emotional"      // Processing emotions
  | "natural_pause"  // Normal conversation pause
  | "unknown";

export type AttentionLevel = "high" | "medium" | "low" | "lost";

export type SilenceStrategy =
  | "wait_patiently"     // Say nothing, let the child think
  | "gentle_prompt"      // Soft encouragement
  | "rephrase"           // Rephrase last question simpler
  | "topic_switch"       // Change subject entirely
  | "fun_interrupt"      // Joke/sound/surprise to re-engage
  | "emotional_checkin"  // "Tout va bien ?"
  | "simplify"           // Offer simpler activity
  | "close_gracefully";  // Say goodnight/goodbye

export interface SilenceEvent {
  durationMs: number;
  reason: SilenceReason;
  strategy: SilenceStrategy;
  timestamp: number;
}

export interface AttentionState {
  currentLevel: AttentionLevel;
  silenceEvents: SilenceEvent[];
  totalSilenceMs: number;
  avgResponseTimeMs: number;
  responseTimes: number[];       // last N response times
  shortAnswerStreak: number;     // consecutive 1-2 word answers
  offTopicCount: number;         // how many times child went off-topic
  lastInteractionTs: number;
  sessionStartTs: number;
  boredSignals: number;
  engagedSignals: number;
  strategyHistory: SilenceStrategy[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONSTANTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MAX_RESPONSE_TIMES = 20;
const MAX_SILENCE_EVENTS = 30;
const MAX_STRATEGY_HISTORY = 15;

// Silence thresholds (ms) by age bracket
const SILENCE_THRESHOLDS = {
  young: { thinking: 3000, hesitation: 6000, boredom: 12000, lost: 20000 },  // 3-6
  middle: { thinking: 2500, hesitation: 5000, boredom: 10000, lost: 18000 }, // 7-9
  older: { thinking: 2000, hesitation: 4000, boredom: 8000, lost: 15000 },   // 10-12
} as const;

// Boredom signal patterns
const BOREDOM_PATTERNS = [
  /^(oui|non|ok|bof|mouais|ouais|nan|meh|sais pas|je sais pas|rien)$/i,
  /^(ennui|c'est nul|pas envie|j'en ai marre|pfff|bah)$/i,
  /^.{1,4}$/,  // Very short answers (1-4 chars)
];

// Hesitation patterns
const HESITATION_PATTERNS = [
  /^(euh|hm+|ben|bah|euuuh|hmm+|ah euh)$/i,
  /^(je sais pas trop|comment dire|attends)$/i,
  /\.\.\./,
];

// Engagement signals (child is interested)
const ENGAGEMENT_PATTERNS = [
  /\?$/,                                    // Asking questions
  /^(pourquoi|comment|c'est quoi|raconte)/i, // Curious questions
  /!(.*!)?/,                                // Excitement
  /^(trop bien|génial|cool|super|wow|oh)/i, // Positive reactions
  /(encore|continue|et après|dis-moi)/i,    // Wanting more
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let state: AttentionState = createFreshState();

function createFreshState(): AttentionState {
  const now = Date.now();
  return {
    currentLevel: "high",
    silenceEvents: [],
    totalSilenceMs: 0,
    avgResponseTimeMs: 0,
    responseTimes: [],
    shortAnswerStreak: 0,
    offTopicCount: 0,
    lastInteractionTs: now,
    sessionStartTs: now,
    boredSignals: 0,
    engagedSignals: 0,
    strategyHistory: [],
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CORE API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Initialize or reset state for a new session */
export function initSilenceEngine(): void {
  state = createFreshState();
  console.log("[SilenceEngine V8] ✅ Initialized");
}

/** Get the current attention state (read-only snapshot) */
export function getAttentionState(): Readonly<AttentionState> {
  return state;
}

/** Record a child's response and update attention metrics */
export function recordChildResponse(text: string, childAge: number): void {
  const now = Date.now();
  const responseTime = now - state.lastInteractionTs;
  state.lastInteractionTs = now;

  // Track response time
  state.responseTimes.push(responseTime);
  if (state.responseTimes.length > MAX_RESPONSE_TIMES) state.responseTimes.shift();
  state.avgResponseTimeMs = state.responseTimes.reduce((a, b) => a + b, 0) / state.responseTimes.length;

  // Detect boredom signals
  const isBored = BOREDOM_PATTERNS.some(p => p.test(text.trim()));
  const isHesitant = HESITATION_PATTERNS.some(p => p.test(text.trim()));
  const isEngaged = ENGAGEMENT_PATTERNS.some(p => p.test(text.trim()));

  if (isBored) {
    state.boredSignals++;
    state.shortAnswerStreak++;
  } else {
    state.shortAnswerStreak = Math.max(0, state.shortAnswerStreak - 1);
  }

  if (isHesitant) {
    state.boredSignals += 0.5;
  }

  if (isEngaged) {
    state.engagedSignals++;
    state.shortAnswerStreak = 0;
    state.boredSignals = Math.max(0, state.boredSignals - 1);
  }

  // Update attention level
  state.currentLevel = computeAttentionLevel(childAge);

  console.log(
    `[SilenceEngine V8] 📊 Attention: ${state.currentLevel} | Bored: ${state.boredSignals} | Engaged: ${state.engagedSignals} | AvgRT: ${Math.round(state.avgResponseTimeMs)}ms`
  );
}

/** Analyze a silence period and determine what to do */
export function analyzeSilence(silenceDurationMs: number, childAge: number, lastBobbyText: string): SilenceEvent {
  const thresholds = getThresholds(childAge);
  const reason = classifySilence(silenceDurationMs, thresholds, lastBobbyText);
  const strategy = pickStrategy(reason, silenceDurationMs, childAge);

  const event: SilenceEvent = {
    durationMs: silenceDurationMs,
    reason,
    strategy,
    timestamp: Date.now(),
  };

  // Record
  state.silenceEvents.push(event);
  if (state.silenceEvents.length > MAX_SILENCE_EVENTS) state.silenceEvents.shift();
  state.totalSilenceMs += silenceDurationMs;
  state.strategyHistory.push(strategy);
  if (state.strategyHistory.length > MAX_STRATEGY_HISTORY) state.strategyHistory.shift();

  console.log(
    `[SilenceEngine V8] 🤫 Silence ${Math.round(silenceDurationMs / 1000)}s → reason: ${reason} → strategy: ${strategy}`
  );

  return event;
}

/** Generate a prompt text for the chosen strategy */
export function generateSilencePrompt(
  strategy: SilenceStrategy,
  childName: string,
  childAge: number,
  lastBobbyText?: string,
): string {
  const templates = getStrategyTemplates(childAge);
  const options = templates[strategy];
  if (!options || options.length === 0) return "";

  // Avoid repeating the same prompt
  const pick = options[Math.floor(Math.random() * options.length)];
  return pick.replace("{name}", childName);
}

/** Check if Bobby should intervene after silence */
export function shouldIntervene(silenceDurationMs: number, childAge: number): boolean {
  const thresholds = getThresholds(childAge);

  // Don't intervene if we just used a strategy recently
  const lastStrategy = state.strategyHistory[state.strategyHistory.length - 1];
  if (lastStrategy === "wait_patiently" && silenceDurationMs < thresholds.hesitation) {
    return false;
  }

  // Intervene after hesitation threshold
  return silenceDurationMs >= thresholds.hesitation;
}

/** Get a summary for parent dashboard */
export function getAttentionSummary(): {
  avgAttention: AttentionLevel;
  totalSilenceSec: number;
  boredMoments: number;
  engagedMoments: number;
  avgResponseTimeSec: number;
} {
  return {
    avgAttention: state.currentLevel,
    totalSilenceSec: Math.round(state.totalSilenceMs / 1000),
    boredMoments: Math.round(state.boredSignals),
    engagedMoments: state.engagedSignals,
    avgResponseTimeSec: Math.round(state.avgResponseTimeMs / 1000 * 10) / 10,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTERNAL HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getThresholds(age: number) {
  if (age <= 6) return SILENCE_THRESHOLDS.young;
  if (age <= 9) return SILENCE_THRESHOLDS.middle;
  return SILENCE_THRESHOLDS.older;
}

function classifySilence(
  durationMs: number,
  thresholds: { thinking: number; hesitation: number; boredom: number; lost: number },
  lastBobbyText: string,
): SilenceReason {
  const askedQuestion = /\?/.test(lastBobbyText);

  // If Bobby asked a question and child is silent
  if (askedQuestion) {
    if (durationMs < thresholds.thinking) return "thinking";
    if (durationMs < thresholds.hesitation) return "hesitation";
    if (durationMs < thresholds.boredom) return "confusion";
    return "distraction";
  }

  // If Bobby made a statement
  if (durationMs < thresholds.thinking) return "natural_pause";
  if (durationMs < thresholds.hesitation) return "thinking";

  // Check session-level boredom
  if (state.boredSignals >= 3 || state.shortAnswerStreak >= 3) {
    return "boredom";
  }

  if (durationMs < thresholds.boredom) return "hesitation";
  if (durationMs < thresholds.lost) return "boredom";
  return "distraction";
}

function computeAttentionLevel(childAge: number): AttentionLevel {
  const boredRatio = state.boredSignals / Math.max(1, state.boredSignals + state.engagedSignals);
  const hasLongSilences = state.silenceEvents.filter(e => e.durationMs > 8000).length >= 2;

  if (boredRatio > 0.7 || state.shortAnswerStreak >= 4) return "lost";
  if (boredRatio > 0.5 || hasLongSilences || state.shortAnswerStreak >= 3) return "low";
  if (boredRatio > 0.3 || state.shortAnswerStreak >= 2) return "medium";
  return "high";
}

function pickStrategy(reason: SilenceReason, durationMs: number, childAge: number): SilenceStrategy {
  // Check what we've already tried recently
  const recentStrategies = state.strategyHistory.slice(-3);
  const alreadyTried = (s: SilenceStrategy) => recentStrategies.includes(s);

  switch (reason) {
    case "thinking":
    case "natural_pause":
      return "wait_patiently";

    case "hesitation":
      if (!alreadyTried("gentle_prompt")) return "gentle_prompt";
      if (!alreadyTried("rephrase")) return "rephrase";
      return "simplify";

    case "confusion":
      if (!alreadyTried("rephrase")) return "rephrase";
      if (!alreadyTried("simplify")) return "simplify";
      return "topic_switch";

    case "boredom":
      if (!alreadyTried("fun_interrupt")) return "fun_interrupt";
      if (!alreadyTried("topic_switch")) return "topic_switch";
      if (state.boredSignals >= 5) return "close_gracefully";
      return "simplify";

    case "distraction":
      if (!alreadyTried("fun_interrupt")) return "fun_interrupt";
      if (!alreadyTried("gentle_prompt")) return "gentle_prompt";
      if (durationMs > 20000) return "close_gracefully";
      return "topic_switch";

    case "shyness":
      return "emotional_checkin";

    case "emotional":
      return "emotional_checkin";

    default:
      return "gentle_prompt";
  }
}

function getStrategyTemplates(childAge: number): Record<SilenceStrategy, string[]> {
  const young = childAge <= 6;
  const older = childAge >= 10;

  return {
    wait_patiently: [], // No text — Bobby stays silent

    gentle_prompt: young
      ? [
          "Prends ton temps, {name} ! 😊",
          "Je suis là, {name} ! Tu veux me dire quelque chose ?",
          "Hmm, tu réfléchis ? 🤔",
        ]
      : older
      ? [
          "Je t'écoute, {name}.",
          "Prends ton temps si tu veux.",
          "Tu voulais dire quelque chose ?",
        ]
      : [
          "Je suis là, {name} ! 😊",
          "Tu réfléchis ? Pas de souci !",
          "Qu'est-ce que tu en penses, {name} ?",
        ],

    rephrase: young
      ? [
          "Attends, je vais te dire ça autrement ! 😄",
          "En fait, c'est comme si… tu vois ?",
          "Je vais te le dire plus simplement !",
        ]
      : [
          "Je vais reformuler, {name}.",
          "En d'autres mots…",
          "Autrement dit…",
        ],

    topic_switch: young
      ? [
          "Oh, et si on parlait d'autre chose ? 🌟",
          "J'ai une idée ! Tu veux entendre une blague ? 😂",
          "Et si on jouait à un jeu, {name} ? 🎮",
        ]
      : older
      ? [
          "On change de sujet ? J'ai un truc cool à te raconter !",
          "Hé {name}, tu savais que…",
          "Et si on faisait autre chose ?",
        ]
      : [
          "Oh, j'ai une idée ! 💡",
          "Tu veux qu'on fasse un jeu, {name} ? 🎮",
          "Et si je te racontais quelque chose de fou ? 🤯",
        ],

    fun_interrupt: [
      "🎵 Toc toc ! Qui est là ? 😄",
      "Hey {name}, tu sais quoi ? J'ai pensé à un truc trop drôle !",
      "Psst, {name} ! J'ai un secret… 🤫",
      "Oh oh, devine ce que je viens de penser ! 💭",
    ],

    emotional_checkin: young
      ? [
          "Ça va, {name} ? 💛",
          "Tu es content ? Triste ? Dis-moi ! 😊",
          "Comment tu te sens, {name} ?",
        ]
      : [
          "Tout va bien, {name} ?",
          "Comment tu te sens ?",
          "Si tu veux parler de quelque chose, je suis là.",
        ],

    simplify: young
      ? [
          "On fait un truc plus simple ! Ça te dit ? 😊",
          "Et si on jouait à un jeu facile ? 🎲",
          "Tu veux que je te raconte une petite histoire ?",
        ]
      : [
          "On simplifie ? Pas de pression !",
          "Tu veux quelque chose de plus tranquille ?",
          "On fait un truc relax ?",
        ],

    close_gracefully: young
      ? [
          "Tu es peut-être fatigué, {name} ? On peut se reposer ! 💤",
          "C'est pas grave, on se reparle plus tard ! À bientôt ! 🌙",
          "Bobby fait une petite pause aussi ! 😴",
        ]
      : [
          "Pas de souci, {name}. On se reparle quand tu veux !",
          "Je serai là quand tu reviendras ! 👋",
          "On fait une pause ? À plus tard, {name} !",
        ],
  };
}
