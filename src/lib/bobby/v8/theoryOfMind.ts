/**
 * Bobby Brain V8 — Theory of Mind Engine
 *
 * Models what the child BELIEVES, UNDERSTANDS, FEELS (not just says),
 * and EXPECTS from Bobby.
 *
 * Updated every turn in <3ms, 100% offline.
 */

import type { UnderstandingFrame } from "../v7/deepUnderstanding";
import type { EmotionType } from "../localBrain/types";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type CognitiveLevel = "preoperational" | "concrete" | "transitional" | "formal";

export interface Belief {
  content: string;
  type: "factual" | "emotional" | "social" | "fantasy";
  confidence: number;       // 0-1
  source: "stated" | "inferred" | "pattern";
  timestamp: number;
}

export interface MentalModel {
  // What the child BELIEVES to be true
  beliefs: {
    aboutSelf: Belief[];
    aboutWorld: Belief[];
    aboutBobby: Belief[];
    confidence: number;       // 0-1, overall model confidence
  };

  // What the child UNDERSTANDS
  understanding: {
    cognitiveLevel: CognitiveLevel;
    vocabularyLevel: "basic" | "moderate" | "advanced";
    canDistinguishRealFiction: boolean;
    canHandleNuance: boolean;
    conceptsGrasped: string[];
    conceptsStruggled: string[];
  };

  // What the child REALLY feels (surface vs inferred)
  emotionalState: {
    surfaceEmotion: EmotionType;
    inferredEmotion: EmotionType;
    emotionDelta: number;                               // 0 = coherent
    emotionalTrajectory: "improving" | "stable" | "declining";
  };

  // What the child EXPECTS from Bobby
  expectations: {
    wantsFun: number;         // 0-1
    wantsComfort: number;
    wantsKnowledge: number;
    wantsControl: number;
    expectationShift: string | null;
  };
}

export interface CognitiveSignals {
  usesCausalReasoning: boolean;
  confusesCausality: boolean;
  formulatesHypotheses: boolean;
  understandsIrony: boolean;
  canAbstract: boolean;
  usesComplexVocabulary: boolean;
}

export interface ToMSnapshot {
  model: MentalModel;
  tomInfluence: string;         // human-readable summary for cognition
  shouldSimplify: boolean;
  shouldProtectFantasy: boolean;
  respondToInferred: boolean;   // respond to inferred emotion, not surface
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONSTANTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MAX_BELIEFS = 30;
const BELIEF_DECAY_MS = 30 * 60 * 1000; // 30 min within session
const EMOTION_TRAJECTORY_WINDOW = 5;    // last N turns

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let currentModel: MentalModel = createEmptyModel();
let emotionHistory: EmotionType[] = [];

function createEmptyModel(): MentalModel {
  return {
    beliefs: { aboutSelf: [], aboutWorld: [], aboutBobby: [], confidence: 0.1 },
    understanding: {
      cognitiveLevel: "concrete",
      vocabularyLevel: "basic",
      canDistinguishRealFiction: false,
      canHandleNuance: false,
      conceptsGrasped: [],
      conceptsStruggled: [],
    },
    emotionalState: {
      surfaceEmotion: "neutral",
      inferredEmotion: "neutral",
      emotionDelta: 0,
      emotionalTrajectory: "stable",
    },
    expectations: {
      wantsFun: 0.5,
      wantsComfort: 0.2,
      wantsKnowledge: 0.3,
      wantsControl: 0.2,
      expectationShift: null,
    },
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COGNITIVE LEVEL INFERENCE (Piaget-adapted)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function inferCognitiveLevel(age: number, signals: CognitiveSignals): CognitiveLevel {
  // Baseline by age
  let level: CognitiveLevel;
  if (age <= 5) level = "preoperational";
  else if (age <= 8) level = "concrete";
  else if (age <= 10) level = "transitional";
  else level = "formal";

  // Upgrade signals
  if (signals.usesCausalReasoning && level === "preoperational") level = "concrete";
  if (signals.formulatesHypotheses && (level === "preoperational" || level === "concrete")) {
    level = level === "preoperational" ? "concrete" : "transitional";
  }
  if (signals.canAbstract && level !== "formal") level = "transitional";

  // Downgrade signals
  if (signals.confusesCausality && level !== "preoperational") {
    level = level === "formal" ? "transitional" : level === "transitional" ? "concrete" : "preoperational";
  }

  return level;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COGNITIVE SIGNAL DETECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CAUSAL_RE = /\bparce que\b|\bcar\b|\bdonc\b|\balors\b|\bdu coup\b/i;
const CONFUSED_CAUSALITY_RE = /il pleut parce que .*(triste|content)|la lune .*(dort|mange)|le soleil .*(fâché|content)/i;
const HYPOTHESIS_RE = /\bet si\b|\bimagine que\b|\bpeut-être que\b|\bje pense que\b/i;
const IRONY_RE = /\bc'est (trop |super )?(bien|cool|génial)\b.*\bpas\b|\blol\b|\bmdr\b/i;
const ABSTRACT_RE = /\bl'amitié\b|\bla vie\b|\ble bonheur\b|\bla liberté\b|\bla justice\b|\bl'amour c'est\b/i;
const COMPLEX_VOCAB_RE = /\bcependant\b|\bnéanmoins\b|\bpar conséquent\b|\ben revanche\b|\btoutefois\b/i;

export function detectCognitiveSignals(text: string): CognitiveSignals {
  return {
    usesCausalReasoning: CAUSAL_RE.test(text),
    confusesCausality: CONFUSED_CAUSALITY_RE.test(text),
    formulatesHypotheses: HYPOTHESIS_RE.test(text),
    understandsIrony: IRONY_RE.test(text),
    canAbstract: ABSTRACT_RE.test(text),
    usesComplexVocabulary: COMPLEX_VOCAB_RE.test(text),
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BELIEF EXTRACTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface BeliefPattern {
  pattern: RegExp;
  type: Belief["type"];
  category: "self" | "world" | "bobby";
  extract: (m: RegExpMatchArray) => string;
}

const BELIEF_PATTERNS: BeliefPattern[] = [
  // Self-beliefs
  { pattern: /je suis ([\w\sé]+)/i, type: "emotional", category: "self", extract: m => `croit être ${m[1].trim()}` },
  { pattern: /je (?:n'?arrive|ne sais?) pas (?:à )?([\w\s]+)/i, type: "emotional", category: "self", extract: m => `difficulté perçue: ${m[1].trim()}` },
  { pattern: /je suis (?:le |la )?(?:meilleur|plus fort|trop bien)/i, type: "emotional", category: "self", extract: () => "haute estime de soi" },
  { pattern: /je suis nul|je suis bête|je suis méchant/i, type: "emotional", category: "self", extract: m => `auto-critique: ${m[0]}` },

  // World beliefs — factual
  { pattern: /(?:les? |la |le |l')([\w]+ (?:existe|sont vraies?|c'est vrai))/i, type: "factual", category: "world", extract: m => m[1] },
  { pattern: /(?:les |des )(dinosaures?|extraterrestres?|fantômes?) (?:existe|sont vrais?)/i, type: "factual", category: "world", extract: m => `croit que ${m[1]} existent` },

  // World beliefs — fantasy
  { pattern: /(père noël|fée|monstre|dragon|licorne|magie|sorcière|lutin)/i, type: "fantasy", category: "world", extract: m => `croit en ${m[1].toLowerCase()}` },

  // Social beliefs
  { pattern: /(personne|tout le monde|les autres) (?:m'aime|me déteste|est méchant)/i, type: "social", category: "world", extract: m => `perception sociale: ${m[0]}` },
  { pattern: /mon (?:meilleur )?(?:ami|copain|copine) .{0,30}(méchant|gentil|parti|plus là)/i, type: "social", category: "world", extract: m => `relation amicale: ${m[0].slice(0, 50)}` },

  // Bobby beliefs
  { pattern: /tu (?:es|sais) (?:mon )?(?:ami|copain|meilleur ami)/i, type: "emotional", category: "bobby", extract: () => "considère Bobby comme ami" },
  { pattern: /tu sais tout|tu connais tout/i, type: "factual", category: "bobby", extract: () => "croit que Bobby sait tout" },
  { pattern: /tu (?:ne )?(?:comprends?|sais?) (?:pas|rien)/i, type: "factual", category: "bobby", extract: () => "doute des capacités de Bobby" },
];

export function extractBeliefs(text: string, frame: UnderstandingFrame): Belief[] {
  const beliefs: Belief[] = [];
  const now = Date.now();

  for (const { pattern, type, category, extract } of BELIEF_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      beliefs.push({
        content: extract(match),
        type,
        confidence: frame.intentConfidence * 0.8,
        source: "stated",
        timestamp: now,
      });
    }
  }

  // Inferred beliefs from implicit intent
  if (frame.implicitIntent === "seek_comfort" && frame.emotion.type !== "sadness") {
    beliefs.push({
      content: "besoin de réconfort non exprimé",
      type: "emotional",
      confidence: 0.5,
      source: "inferred",
      timestamp: now,
    });
  }

  if (frame.implicitIntent === "test_limits") {
    beliefs.push({
      content: "teste les limites de Bobby",
      type: "social",
      confidence: 0.6,
      source: "inferred",
      timestamp: now,
    });
  }

  return beliefs;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VOCABULARY LEVEL DETECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function detectVocabularyLevel(text: string, signals: CognitiveSignals): "basic" | "moderate" | "advanced" {
  const wordCount = text.split(/\s+/).length;
  const avgWordLen = text.replace(/\s+/g, "").length / Math.max(wordCount, 1);

  if (signals.usesComplexVocabulary || avgWordLen > 6) return "advanced";
  if (wordCount > 10 || avgWordLen > 4.5) return "moderate";
  return "basic";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPECTATION TRACKING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function updateExpectations(
  prev: MentalModel["expectations"],
  frame: UnderstandingFrame,
): MentalModel["expectations"] {
  const next = { ...prev, expectationShift: null as string | null };

  // Smooth update with momentum
  const alpha = 0.3;

  const goalMap: Record<string, keyof Pick<MentalModel["expectations"], "wantsFun" | "wantsComfort" | "wantsKnowledge" | "wantsControl">> = {
    have_fun: "wantsFun",
    be_reassured: "wantsComfort",
    learn_something: "wantsKnowledge",
    solve_problem: "wantsControl",
    get_help: "wantsControl",
    share_joy: "wantsFun",
    explore_topic: "wantsKnowledge",
    be_heard: "wantsComfort",
    wind_down: "wantsComfort",
    pass_time: "wantsFun",
  };

  const target = goalMap[frame.userGoal];
  if (target) {
    const oldVal = next[target];
    next[target] = oldVal + alpha * (1 - oldVal);

    // Decay others
    for (const key of ["wantsFun", "wantsComfort", "wantsKnowledge", "wantsControl"] as const) {
      if (key !== target) {
        next[key] = next[key] * (1 - alpha * 0.3);
      }
    }

    if (Math.abs(next[target] - oldVal) > 0.2) {
      next.expectationShift = `shift vers ${target}`;
    }
  }

  return next;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMOTIONAL TRAJECTORY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const POSITIVE_EMOTIONS: EmotionType[] = ["joy", "love", "pride", "excitement", "gratitude", "calm", "curiosity"];
const NEGATIVE_EMOTIONS: EmotionType[] = ["sadness", "fear", "anger", "shame", "jealousy", "boredom"];

function computeTrajectory(history: EmotionType[]): "improving" | "stable" | "declining" {
  if (history.length < 3) return "stable";

  const recent = history.slice(-EMOTION_TRAJECTORY_WINDOW);
  const half = Math.floor(recent.length / 2);
  const first = recent.slice(0, half);
  const second = recent.slice(half);

  const score = (arr: EmotionType[]) => {
    let s = 0;
    for (const e of arr) {
      if (POSITIVE_EMOTIONS.includes(e)) s++;
      else if (NEGATIVE_EMOTIONS.includes(e)) s--;
    }
    return s / Math.max(arr.length, 1);
  };

  const diff = score(second) - score(first);
  if (diff > 0.3) return "improving";
  if (diff < -0.3) return "declining";
  return "stable";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DYNAMIC MODEL UPDATE (called every turn)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function updateMentalModel(
  frame: UnderstandingFrame,
  userText: string,
  childAge: number,
): MentalModel {
  const updated = structuredClone(currentModel);
  const now = Date.now();

  // ── 1. Extract & merge beliefs ──
  const newBeliefs = extractBeliefs(userText, frame);
  for (const belief of newBeliefs) {
    const target =
      BELIEF_PATTERNS.find(p => p.pattern.test(userText) && p.extract === undefined)
        ? updated.beliefs.aboutWorld
        : belief.type === "emotional" && belief.content.startsWith("croit être")
          ? updated.beliefs.aboutSelf
          : belief.content.includes("Bobby")
            ? updated.beliefs.aboutBobby
            : updated.beliefs.aboutWorld;

    const existing = target.find(b => b.content === belief.content);
    if (existing) {
      existing.confidence = (existing.confidence + belief.confidence) / 2;
      existing.timestamp = now;
    } else {
      target.push(belief);
    }
  }

  // Categorize beliefs properly
  for (const b of newBeliefs) {
    // Re-route based on pattern category
    const matchedPattern = BELIEF_PATTERNS.find(p => {
      const m = userText.match(p.pattern);
      return m && p.extract(m) === b.content;
    });
    if (matchedPattern) {
      const targetArray =
        matchedPattern.category === "self" ? updated.beliefs.aboutSelf :
        matchedPattern.category === "bobby" ? updated.beliefs.aboutBobby :
        updated.beliefs.aboutWorld;
      if (!targetArray.find(x => x.content === b.content)) {
        targetArray.push(b);
      }
    }
  }

  // Prune old beliefs
  const pruneArray = (arr: Belief[]) =>
    arr.filter(b => now - b.timestamp < BELIEF_DECAY_MS || b.confidence > 0.7);
  updated.beliefs.aboutSelf = pruneArray(updated.beliefs.aboutSelf).slice(-MAX_BELIEFS);
  updated.beliefs.aboutWorld = pruneArray(updated.beliefs.aboutWorld).slice(-MAX_BELIEFS);
  updated.beliefs.aboutBobby = pruneArray(updated.beliefs.aboutBobby).slice(-10);

  // ── 2. Update cognitive understanding ──
  const signals = detectCognitiveSignals(userText);
  updated.understanding.cognitiveLevel = inferCognitiveLevel(childAge, signals);
  updated.understanding.vocabularyLevel = detectVocabularyLevel(userText, signals);
  updated.understanding.canDistinguishRealFiction = childAge >= 7 &&
    !updated.beliefs.aboutWorld.some(b => b.type === "fantasy" && b.confidence > 0.6);
  updated.understanding.canHandleNuance = signals.understandsIrony || childAge >= 10;

  // Track concepts
  if (frame.userGoal === "learn_something" || frame.userGoal === "explore_topic") {
    const topic = frame.explicitIntent;
    const struggled = updated.understanding.conceptsStruggled;
    if (struggled.includes(topic)) {
      // Still struggling — keep it
    } else if (!updated.understanding.conceptsGrasped.includes(topic)) {
      updated.understanding.conceptsGrasped.push(topic);
    }
  }

  // ── 3. Update emotional state ──
  updated.emotionalState.surfaceEmotion = frame.emotion.type;
  emotionHistory.push(frame.emotion.type);
  if (emotionHistory.length > 20) emotionHistory = emotionHistory.slice(-20);

  // Infer true emotion
  if (frame.implicitIntent === "seek_comfort" && !NEGATIVE_EMOTIONS.includes(frame.emotion.type)) {
    updated.emotionalState.inferredEmotion = "sadness";
    updated.emotionalState.emotionDelta = 0.5;
  } else if (frame.implicitIntent === "express_frustration" && frame.emotion.type === "neutral") {
    updated.emotionalState.inferredEmotion = "anger";
    updated.emotionalState.emotionDelta = 0.4;
  } else if (frame.implicitIntent === "seek_validation" && frame.emotion.type === "neutral") {
    updated.emotionalState.inferredEmotion = "fear";
    updated.emotionalState.emotionDelta = 0.3;
  } else {
    updated.emotionalState.inferredEmotion = frame.emotion.type;
    updated.emotionalState.emotionDelta = 0;
  }

  updated.emotionalState.emotionalTrajectory = computeTrajectory(emotionHistory);

  // ── 4. Update expectations ──
  updated.expectations = updateExpectations(updated.expectations, frame);

  // ── 5. Grow model confidence ──
  updated.beliefs.confidence = Math.min(1, updated.beliefs.confidence + 0.02);

  currentModel = updated;
  return updated;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SNAPSHOT (for cognition pipeline)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function getToMSnapshot(): ToMSnapshot {
  const m = currentModel;

  const shouldSimplify = m.understanding.cognitiveLevel === "preoperational" ||
    m.understanding.vocabularyLevel === "basic";

  const shouldProtectFantasy = m.beliefs.aboutWorld.some(
    b => b.type === "fantasy" && b.confidence > 0.4,
  );

  const respondToInferred = m.emotionalState.emotionDelta > 0.3;

  // Build human-readable influence summary
  const parts: string[] = [];
  if (shouldSimplify) parts.push("simplifier le vocabulaire");
  if (shouldProtectFantasy) parts.push("protéger les croyances imaginaires");
  if (respondToInferred) {
    parts.push(`répondre à l'émotion profonde (${m.emotionalState.inferredEmotion})`);
  }
  if (m.expectations.expectationShift) parts.push(m.expectations.expectationShift);
  if (m.emotionalState.emotionalTrajectory === "declining") {
    parts.push("trajectoire émotionnelle en baisse → priorité réconfort");
  }

  const tomInfluence = parts.length > 0 ? `ToM: ${parts.join(", ")}` : "ToM: modèle neutre";

  return { model: m, tomInfluence, shouldSimplify, shouldProtectFantasy, respondToInferred };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RESPONSE ADAPTATION (apply ToM to final text)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function applyToMToResponse(response: string, snapshot: ToMSnapshot): string {
  let adjusted = response;

  // ── Vocabulary simplification for young children ──
  if (snapshot.shouldSimplify) {
    adjusted = adjusted.replace(/cependant|néanmoins|toutefois/gi, "mais");
    adjusted = adjusted.replace(/en conséquence|par conséquent/gi, "donc");
    adjusted = adjusted.replace(/approximativement/gi, "environ");
    adjusted = adjusted.replace(/actuellement/gi, "maintenant");

    // Limit to 2 sentences for preoperational
    if (snapshot.model.understanding.cognitiveLevel === "preoperational") {
      const sentences = adjusted.match(/[^.!?]+[.!?]+/g);
      if (sentences && sentences.length > 2) {
        adjusted = sentences.slice(0, 2).join(" ").trim();
      }
    }
  }

  // ── Protect fantasy beliefs ──
  if (snapshot.shouldProtectFantasy) {
    adjusted = adjusted.replace(
      /(?:ça |ce |il |elle )n'existe pas|(?:ce n'est )?pas vrai|pas réel|n'est pas réel/gi,
      "c'est magique",
    );
    adjusted = adjusted.replace(
      /(?:les |le |la |l')(\w+) n'existe(?:nt)? pas/gi,
      "c'est un beau mystère",
    );
  }

  return adjusted;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INIT & RESET
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Initialize the model with a child's age for baseline */
export function initToM(childAge: number): void {
  currentModel = createEmptyModel();
  emotionHistory = [];

  // Set baseline from age
  if (childAge <= 5) {
    currentModel.understanding.cognitiveLevel = "preoperational";
    currentModel.understanding.canDistinguishRealFiction = false;
  } else if (childAge <= 8) {
    currentModel.understanding.cognitiveLevel = "concrete";
    currentModel.understanding.canDistinguishRealFiction = false;
  } else if (childAge <= 10) {
    currentModel.understanding.cognitiveLevel = "transitional";
    currentModel.understanding.canDistinguishRealFiction = true;
  } else {
    currentModel.understanding.cognitiveLevel = "formal";
    currentModel.understanding.canDistinguishRealFiction = true;
    currentModel.understanding.canHandleNuance = true;
  }

  console.log(`[ToM V8] 🧠 Initialized for age ${childAge}, baseline: ${currentModel.understanding.cognitiveLevel}`);
}

export function resetToM(): void {
  currentModel = createEmptyModel();
  emotionHistory = [];
}

export function getMentalModel(): MentalModel {
  return currentModel;
}
