/**
 * Bobby Cognitive & Behavioral Intelligence Engine v2.8
 * 
 * Tracks child attention, fatigue, conversation rhythm,
 * and provides adaptive personality signals.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type AttentionLevel = "high" | "medium" | "low" | "lost";
export type FatigueLevel = "fresh" | "normal" | "tired" | "exhausted";
export type ChildEnergy = "calm" | "balanced" | "energetic";

export interface CognitiveState {
  attention: AttentionLevel;
  fatigue: FatigueLevel;
  energy: ChildEnergy;
  turnCount: number;
  sessionDurationMs: number;
  /** Last N user message lengths */
  recentMessageLengths: number[];
  /** Time gaps between user messages (ms) */
  recentResponseGaps: number[];
  /** Repetition count (same/similar messages) */
  repetitionCount: number;
  lastUserMessageTime: number;
  sessionStartTime: number;
}

export interface CognitiveHints {
  attention: AttentionLevel;
  fatigue: FatigueLevel;
  energy: ChildEnergy;
  /** Suggested TTS pause multiplier (1.0 = normal, 1.3 = slower) */
  pauseMultiplier: number;
  /** Should Bobby proactively re-engage? */
  shouldReengage: boolean;
  /** Suggested re-engage strategy */
  reengageStrategy?: "game" | "question" | "break" | "story";
  /** Context string for AI prompt injection */
  promptContext: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATE MANAGEMENT (singleton per session)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let state: CognitiveState = createFreshState();

function createFreshState(): CognitiveState {
  return {
    attention: "high",
    fatigue: "fresh",
    energy: "balanced",
    turnCount: 0,
    sessionDurationMs: 0,
    recentMessageLengths: [],
    recentResponseGaps: [],
    repetitionCount: 0,
    lastUserMessageTime: Date.now(),
    sessionStartTime: Date.now(),
  };
}

export function resetCognitiveState(): void {
  state = createFreshState();
}

export function getCognitiveState(): CognitiveState {
  return { ...state };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ATTENTION DETECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function detectAttention(): AttentionLevel {
  const recent = state.recentMessageLengths.slice(-5);
  if (recent.length < 2) return "high";

  const avgLen = recent.reduce((a, b) => a + b, 0) / recent.length;
  const recentGaps = state.recentResponseGaps.slice(-3);
  const avgGap = recentGaps.length > 0
    ? recentGaps.reduce((a, b) => a + b, 0) / recentGaps.length
    : 0;

  // Very short answers + long gaps = attention lost
  if (avgLen < 3 && avgGap > 15000) return "lost";
  if (avgLen < 5 && avgGap > 10000) return "low";
  if (avgLen < 8 || avgGap > 8000) return "medium";
  return "high";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FATIGUE DETECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function detectFatigue(): FatigueLevel {
  const durationMin = state.sessionDurationMs / 60000;
  const recent = state.recentMessageLengths.slice(-5);
  const avgLen = recent.length > 0
    ? recent.reduce((a, b) => a + b, 0) / recent.length
    : 20;

  // Time-based fatigue
  if (durationMin > 20 && avgLen < 5) return "exhausted";
  if (durationMin > 15) return "tired";
  if (durationMin > 8 && avgLen < 8) return "tired";
  if (durationMin > 5) return "normal";
  return "fresh";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ENERGY DETECTION (adaptive personality)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function detectEnergy(): ChildEnergy {
  const recent = state.recentMessageLengths.slice(-5);
  if (recent.length < 2) return "balanced";

  const avgLen = recent.reduce((a, b) => a + b, 0) / recent.length;
  const recentGaps = state.recentResponseGaps.slice(-3);
  const avgGap = recentGaps.length > 0
    ? recentGaps.reduce((a, b) => a + b, 0) / recentGaps.length
    : 5000;

  // Fast responses + longer messages = energetic
  if (avgGap < 3000 && avgLen > 15) return "energetic";
  // Slow responses + short messages = calm
  if (avgGap > 8000 || avgLen < 5) return "calm";
  return "balanced";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REPETITION DETECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const recentUserTexts: string[] = [];

function checkRepetition(text: string): number {
  const norm = text.toLowerCase().trim();
  const isDupe = recentUserTexts.some(prev =>
    prev === norm || (prev.length > 5 && norm.includes(prev)) || (norm.length > 5 && prev.includes(norm))
  );
  recentUserTexts.push(norm);
  if (recentUserTexts.length > 8) recentUserTexts.shift();

  if (isDupe) {
    state.repetitionCount++;
  } else {
    state.repetitionCount = Math.max(0, state.repetitionCount - 1);
  }
  return state.repetitionCount;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RE-ENGAGEMENT STRATEGY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function pickReengageStrategy(attention: AttentionLevel, fatigue: FatigueLevel): "game" | "question" | "break" | "story" | undefined {
  if (fatigue === "exhausted") return "break";
  if (attention === "lost") return "game";
  if (attention === "low" && fatigue === "tired") return "break";
  if (attention === "low") return "question";
  return undefined;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROMPT CONTEXT BUILDER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildCognitivePromptContext(hints: Omit<CognitiveHints, "promptContext">): string {
  const parts: string[] = [];

  if (hints.attention === "low" || hints.attention === "lost") {
    parts.push("L'enfant perd son attention. Fais des phrases TRÈS courtes, pose une question simple ou propose un jeu.");
  }

  if (hints.fatigue === "tired" || hints.fatigue === "exhausted") {
    parts.push("L'enfant montre des signes de fatigue. Ralentis, sois doux, propose une pause si nécessaire.");
  }

  if (hints.energy === "energetic") {
    parts.push("L'enfant est très énergique ! Sois dynamique, fun, rapide dans tes réponses.");
  } else if (hints.energy === "calm") {
    parts.push("L'enfant est calme. Adopte un ton doux et posé.");
  }

  if (hints.shouldReengage) {
    switch (hints.reengageStrategy) {
      case "game": parts.push("Propose un petit jeu ou devinette pour capter l'attention."); break;
      case "question": parts.push("Pose une question simple et engageante."); break;
      case "break": parts.push("Propose gentiment une pause ou un moment calme."); break;
      case "story": parts.push("Propose une courte histoire pour captiver l'attention."); break;
    }
  }

  return parts.join("\n");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RE-ENGAGE PHRASES (local, for instant responses)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const REENGAGE_PHRASES: Record<string, string[]> = {
  game: [
    "Hé, on joue à un truc ? 😄",
    "J'ai une devinette pour toi !",
    "Tu veux qu'on joue ? 🎮",
  ],
  question: [
    "Tu es toujours là ? 😊",
    "Dis, qu'est-ce que tu préfères ?",
    "C'est quoi ton truc préféré en ce moment ?",
  ],
  break: [
    "On peut faire une petite pause si tu veux 😊",
    "Si tu es fatigué, on peut se reposer un peu.",
    "On reprend quand tu veux !",
  ],
  story: [
    "Tu veux que je te raconte une petite histoire ?",
    "J'ai une histoire rigolote, tu veux l'entendre ?",
  ],
};

let reengageIdx = 0;

export function getReengagePhrase(strategy: string): string {
  const phrases = REENGAGE_PHRASES[strategy] || REENGAGE_PHRASES.question;
  const phrase = phrases[reengageIdx % phrases.length];
  reengageIdx++;
  return phrase;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN: RECORD USER TURN & COMPUTE HINTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function recordUserTurn(userText: string): CognitiveHints {
  const now = Date.now();

  // Update state
  state.turnCount++;
  state.sessionDurationMs = now - state.sessionStartTime;
  state.recentMessageLengths.push(userText.trim().split(/\s+/).length);
  if (state.recentMessageLengths.length > 10) state.recentMessageLengths.shift();

  const gap = now - state.lastUserMessageTime;
  if (state.turnCount > 1) {
    state.recentResponseGaps.push(gap);
    if (state.recentResponseGaps.length > 10) state.recentResponseGaps.shift();
  }
  state.lastUserMessageTime = now;

  checkRepetition(userText);

  // Compute signals
  const attention = detectAttention();
  const fatigue = detectFatigue();
  const energy = detectEnergy();

  state.attention = attention;
  state.fatigue = fatigue;
  state.energy = energy;

  const shouldReengage = attention === "low" || attention === "lost" || fatigue === "exhausted";
  const reengageStrategy = pickReengageStrategy(attention, fatigue);

  const partial: Omit<CognitiveHints, "promptContext"> = {
    attention,
    fatigue,
    energy,
    pauseMultiplier: fatigue === "exhausted" ? 1.5 : fatigue === "tired" ? 1.3 : energy === "calm" ? 1.15 : 1.0,
    shouldReengage,
    reengageStrategy,
  };

  return {
    ...partial,
    promptContext: buildCognitivePromptContext(partial),
  };
}
