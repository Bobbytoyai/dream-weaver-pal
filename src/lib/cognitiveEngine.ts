/**
 * Bobby Adaptive Intelligence Core v4.0 — GOD MODE
 * 
 * Tracks: attention, fatigue, energy, progression, emotional memory,
 * meta-comprehension, motivation, relationship depth, engagement patterns,
 * prediction, learning speed, and behavioral adaptation.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type AttentionLevel = "high" | "medium" | "low" | "lost";
export type FatigueLevel = "fresh" | "normal" | "tired" | "exhausted";
export type ChildEnergy = "calm" | "balanced" | "energetic";
export type SilenceType = "thinking" | "distracted" | "unknown";
export type LearningSpeed = "slow" | "normal" | "fast";
export type InteractionStyle = "explorer" | "guided" | "balanced";
export type PredictedIntent = "story" | "game" | "question" | "chat" | "emotion" | "unknown";

export interface EngagementEntry {
  topic: string;
  mode: string;
  score: number; // 0-100
  count: number;
}

export interface AdaptiveProfile {
  learningSpeed: LearningSpeed;
  interactionStyle: InteractionStyle;
  engagementTriggers: string[];
  behaviorPatterns: string[];
  preferredTopics: Record<string, number>; // topic → engagement score
  predictedNextIntent: PredictedIntent;
}

export interface CognitiveState {
  attention: AttentionLevel;
  fatigue: FatigueLevel;
  energy: ChildEnergy;
  turnCount: number;
  sessionDurationMs: number;
  recentMessageLengths: number[];
  recentResponseGaps: number[];
  repetitionCount: number;
  lastUserMessageTime: number;
  sessionStartTime: number;
  progressionLevel: number;
  comprehensionSignals: number;
  emotionHistory: string[];
  motivationScore: number;
  relationshipDepth: number;
  interactionCount: number;
  lastSilenceType: SilenceType;
  consecutiveErrors: number;
  variationSeed: number;
  // v4.0
  engagementScores: Record<string, EngagementEntry>;
  currentMode: string;
  currentTopics: string[];
  intentHistory: string[];
  learningSpeed: LearningSpeed;
  interactionStyle: InteractionStyle;
  engagementTriggers: string[];
  behaviorPatterns: string[];
}

export interface CognitiveHints {
  attention: AttentionLevel;
  fatigue: FatigueLevel;
  energy: ChildEnergy;
  pauseMultiplier: number;
  shouldReengage: boolean;
  reengageStrategy?: "game" | "question" | "break" | "story";
  promptContext: string;
  progressionLevel: number;
  shouldSimplify: boolean;
  shouldEncourage: boolean;
  silenceType: SilenceType;
  emotionalTrend: "improving" | "stable" | "declining" | "unknown";
  relationshipPhase: "new" | "growing" | "established" | "deep";
  variationHint: string;
  // v4.0
  adaptiveProfile: AdaptiveProfile;
  predictedIntent: PredictedIntent;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATE (singleton per session)
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
    progressionLevel: 1,
    comprehensionSignals: 0,
    emotionHistory: [],
    motivationScore: 50,
    relationshipDepth: 0,
    interactionCount: 0,
    lastSilenceType: "unknown",
    consecutiveErrors: 0,
    variationSeed: 0,
    // v4.0
    engagementScores: {},
    currentMode: "chat",
    currentTopics: [],
    intentHistory: [],
    learningSpeed: "normal",
    interactionStyle: "balanced",
    engagementTriggers: [],
    behaviorPatterns: [],
  };
}

export function resetCognitiveState(): void {
  state = createFreshState();
}

export function getCognitiveState(): CognitiveState {
  return { ...state };
}

/** Initialize from persisted memory data */
export function initFromMemory(data: {
  progressionLevel?: number;
  interactionCount?: number;
  relationshipScore?: number;
  lastEmotions?: string[];
  engagementTriggers?: string[];
  behaviorPatterns?: string[];
  learningSpeed?: string;
  interactionStyle?: string;
  preferredTopics?: Record<string, number>;
}): void {
  if (data.progressionLevel) state.progressionLevel = data.progressionLevel;
  if (data.interactionCount) state.interactionCount = data.interactionCount;
  if (data.relationshipScore) state.relationshipDepth = data.relationshipScore;
  if (data.lastEmotions?.length) state.emotionHistory = data.lastEmotions.slice(0, 5);
  if (data.engagementTriggers?.length) state.engagementTriggers = data.engagementTriggers;
  if (data.behaviorPatterns?.length) state.behaviorPatterns = data.behaviorPatterns;
  if (data.learningSpeed) state.learningSpeed = data.learningSpeed as LearningSpeed;
  if (data.interactionStyle) state.interactionStyle = data.interactionStyle as InteractionStyle;
  if (data.preferredTopics) {
    for (const [topic, score] of Object.entries(data.preferredTopics)) {
      state.engagementScores[topic] = { topic, mode: "chat", score, count: 1 };
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ATTENTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function detectAttention(): AttentionLevel {
  const recent = state.recentMessageLengths.slice(-5);
  if (recent.length < 2) return "high";
  const avgLen = recent.reduce((a, b) => a + b, 0) / recent.length;
  const recentGaps = state.recentResponseGaps.slice(-3);
  const avgGap = recentGaps.length > 0 ? recentGaps.reduce((a, b) => a + b, 0) / recentGaps.length : 0;
  if (avgLen < 3 && avgGap > 15000) return "lost";
  if (avgLen < 5 && avgGap > 10000) return "low";
  if (avgLen < 8 || avgGap > 8000) return "medium";
  return "high";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FATIGUE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function detectFatigue(): FatigueLevel {
  const durationMin = state.sessionDurationMs / 60000;
  const recent = state.recentMessageLengths.slice(-5);
  const avgLen = recent.length > 0 ? recent.reduce((a, b) => a + b, 0) / recent.length : 20;
  if (durationMin > 20 && avgLen < 5) return "exhausted";
  if (durationMin > 15) return "tired";
  if (durationMin > 8 && avgLen < 8) return "tired";
  if (durationMin > 5) return "normal";
  return "fresh";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ENERGY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function detectEnergy(): ChildEnergy {
  const recent = state.recentMessageLengths.slice(-5);
  if (recent.length < 2) return "balanced";
  const avgLen = recent.reduce((a, b) => a + b, 0) / recent.length;
  const recentGaps = state.recentResponseGaps.slice(-3);
  const avgGap = recentGaps.length > 0 ? recentGaps.reduce((a, b) => a + b, 0) / recentGaps.length : 5000;
  if (avgGap < 3000 && avgLen > 15) return "energetic";
  if (avgGap > 8000 || avgLen < 5) return "calm";
  return "balanced";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// META-COMPREHENSION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CONFUSION_MARKERS = /(?:comprends pas|c'est quoi|hein|quoi|je sais pas|pas compris|ça veut dire quoi|comment ça)/i;
const UNDERSTANDING_MARKERS = /(?:ah ok|d'accord|je comprends|oui|ouais|je sais|c'est ça|exact|cool|super)/i;

function detectComprehension(text: string): number {
  if (CONFUSION_MARKERS.test(text)) return -1;
  if (UNDERSTANDING_MARKERS.test(text)) return 1;
  // Very short = possible confusion
  if (text.trim().split(/\s+/).length <= 1 && text.length < 5) return -0.5;
  return 0;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SILENCE TYPE DETECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function detectSilenceType(): SilenceType {
  const lastGap = state.recentResponseGaps.slice(-1)[0] || 0;
  // If child was engaged (long messages) and pause is moderate → thinking
  const lastLen = state.recentMessageLengths.slice(-1)[0] || 0;
  if (lastGap > 5000 && lastGap < 15000 && lastLen > 5) return "thinking";
  if (lastGap > 15000) return "distracted";
  return "unknown";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMOTIONAL TREND
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const POSITIVE_EMOTIONS = new Set(["happy", "excited", "curious", "calm"]);
const NEGATIVE_EMOTIONS = new Set(["sad", "scared", "angry", "bored"]);

function detectEmotionalTrend(): "improving" | "stable" | "declining" | "unknown" {
  const history = state.emotionHistory;
  if (history.length < 3) return "unknown";
  const recent = history.slice(-3);
  const older = history.slice(-6, -3);
  if (older.length === 0) return "unknown";

  const score = (emotions: string[]) =>
    emotions.reduce((s, e) => s + (POSITIVE_EMOTIONS.has(e) ? 1 : NEGATIVE_EMOTIONS.has(e) ? -1 : 0), 0) / emotions.length;

  const recentScore = score(recent);
  const olderScore = score(older);
  const diff = recentScore - olderScore;

  if (diff > 0.3) return "improving";
  if (diff < -0.3) return "declining";
  return "stable";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROGRESSION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function updateProgression(): void {
  // Progression grows with positive engagement and comprehension
  if (state.comprehensionSignals > 3 && state.progressionLevel < 10) {
    state.progressionLevel = Math.min(10, state.progressionLevel + 1);
    state.comprehensionSignals = 0; // reset accumulator
  }
  // Regression if too many confusion signals
  if (state.comprehensionSignals < -3 && state.progressionLevel > 1) {
    state.progressionLevel = Math.max(1, state.progressionLevel - 1);
    state.comprehensionSignals = 0;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MOTIVATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function updateMotivation(): void {
  const attention = state.attention;
  const fatigue = state.fatigue;
  if (attention === "high" && fatigue === "fresh") {
    state.motivationScore = Math.min(100, state.motivationScore + 3);
  } else if (attention === "low" || fatigue === "tired") {
    state.motivationScore = Math.max(0, state.motivationScore - 2);
  } else if (attention === "lost" || fatigue === "exhausted") {
    state.motivationScore = Math.max(0, state.motivationScore - 5);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RELATIONSHIP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getRelationshipPhase(): "new" | "growing" | "established" | "deep" {
  if (state.relationshipDepth < 15) return "new";
  if (state.relationshipDepth < 40) return "growing";
  if (state.relationshipDepth < 70) return "established";
  return "deep";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v4.0: ENGAGEMENT TRACKING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const TOPIC_KEYWORDS: Record<string, string[]> = {
  animaux: ["animal", "chien", "chat", "lion", "oiseau", "dinosaure", "dragon", "poisson"],
  espace: ["étoile", "planète", "fusée", "lune", "soleil", "astronaute", "cosmos"],
  pirates: ["pirate", "bateau", "trésor", "mer", "île", "capitaine"],
  magie: ["magie", "sorcier", "fée", "baguette", "sort", "potion"],
  science: ["robot", "science", "expérience", "invention", "code", "techno"],
  nature: ["forêt", "montagne", "fleur", "arbre", "rivière", "jardin"],
  musique: ["musique", "chanson", "instrument", "piano", "guitare", "danse"],
};

function detectTopics(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) found.push(topic);
  }
  return found;
}

function updateEngagement(userText: string): void {
  const topics = detectTopics(userText);
  state.currentTopics = topics;
  const msgLen = userText.trim().split(/\s+/).length;
  const engagementScore = Math.min(100, msgLen * 8 + (state.attention === "high" ? 20 : 0));

  for (const topic of topics) {
    const existing = state.engagementScores[topic];
    if (existing) {
      existing.score = Math.round((existing.score * existing.count + engagementScore) / (existing.count + 1));
      existing.count++;
      existing.mode = state.currentMode;
    } else {
      state.engagementScores[topic] = { topic, mode: state.currentMode, score: engagementScore, count: 1 };
    }
  }

  // Update triggers: topics with high engagement
  state.engagementTriggers = Object.values(state.engagementScores)
    .filter(e => e.score > 60 && e.count >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(e => e.topic);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v4.0: LEARNING SPEED DETECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function updateLearningSpeed(): void {
  // Based on how fast comprehension signals improve
  if (state.turnCount < 5) return;
  const progressRate = state.progressionLevel / Math.max(1, state.interactionCount / 20);
  if (progressRate > 1.5) state.learningSpeed = "fast";
  else if (progressRate < 0.5) state.learningSpeed = "slow";
  else state.learningSpeed = "normal";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v4.0: PREDICTION ENGINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function predictNextIntent(): PredictedIntent {
  const history = state.intentHistory.slice(-5);
  if (history.length < 2) return "unknown";

  // Count frequencies
  const freq: Record<string, number> = {};
  for (const intent of history) {
    freq[intent] = (freq[intent] || 0) + 1;
  }

  // If child keeps asking for stories → predict story
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  if (sorted[0] && sorted[0][1] >= 2) return sorted[0][0] as PredictedIntent;

  // Engagement-based prediction
  if (state.engagementTriggers.length > 0) {
    const topTrigger = state.engagementTriggers[0];
    if (topTrigger === "animaux" || topTrigger === "pirates" || topTrigger === "magie") return "story";
    if (topTrigger === "science") return "question";
  }

  return "unknown";
}

/** Record the detected intent for prediction */
export function recordIntent(intent: string): void {
  state.intentHistory.push(intent);
  if (state.intentHistory.length > 20) state.intentHistory.shift();
  state.currentMode = intent;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v4.0: BEHAVIOR PATTERN DETECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function detectBehaviorPatterns(): void {
  const patterns: string[] = [];

  // Time-based patterns
  const hour = new Date().getHours();
  if (hour >= 19 && state.energy === "calm") patterns.push("calme le soir");
  if (hour < 10 && state.energy === "energetic") patterns.push("énergique le matin");

  // Topic preferences
  const topTopics = Object.values(state.engagementScores)
    .filter(e => e.count >= 3 && e.score > 50)
    .map(e => `aime ${e.topic}`);
  patterns.push(...topTopics.slice(0, 3));

  // Interaction style detection
  if (state.recentMessageLengths.slice(-10).every(l => l > 10)) {
    state.interactionStyle = "explorer";
    patterns.push("explorateur curieux");
  } else if (state.comprehensionSignals < -2) {
    state.interactionStyle = "guided";
    patterns.push("préfère être guidé");
  }

  // Emotional patterns
  const sadCount = state.emotionHistory.filter(e => e === "sad").length;
  const happyCount = state.emotionHistory.filter(e => e === "happy" || e === "excited").length;
  if (sadCount > 3) patterns.push("tendance émotionnelle sensible");
  if (happyCount > 5) patterns.push("globalement joyeux");

  state.behaviorPatterns = [...new Set(patterns)].slice(0, 8);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v4.0: ADAPTIVE PROFILE BUILDER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildAdaptiveProfile(): AdaptiveProfile {
  detectBehaviorPatterns();

  const preferredTopics: Record<string, number> = {};
  for (const [topic, entry] of Object.entries(state.engagementScores)) {
    preferredTopics[topic] = entry.score;
  }

  return {
    learningSpeed: state.learningSpeed,
    interactionStyle: state.interactionStyle,
    engagementTriggers: state.engagementTriggers,
    behaviorPatterns: state.behaviorPatterns,
    preferredTopics,
    predictedNextIntent: predictNextIntent(),
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const recentUserTexts: string[] = [];

function checkRepetition(text: string): void {
  const norm = text.toLowerCase().trim();
  const isDupe = recentUserTexts.some(prev =>
    prev === norm || (prev.length > 5 && norm.includes(prev)) || (norm.length > 5 && prev.includes(norm))
  );
  recentUserTexts.push(norm);
  if (recentUserTexts.length > 8) recentUserTexts.shift();
  state.repetitionCount = isDupe ? state.repetitionCount + 1 : Math.max(0, state.repetitionCount - 1);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BEHAVIORAL VARIATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const VARIATION_HINTS = [
  "Ajoute une petite blague ou un mot rigolo.",
  "Commence par une réaction surprise.",
  "Fais un petit bruit amusant dans ta réponse.",
  "Mentionne ton ami imaginaire Zik.",
  "Commence par valider ce que l'enfant a dit avant de répondre.",
  "Glisse un fait amusant dans ta réponse.",
  "Utilise un ton de confidence/secret.",
  "Fais comme si tu venais de te rappeler quelque chose.",
];

function getVariationHint(): string {
  // Only vary every 2-3 turns
  if (state.turnCount % 3 !== 0) return "";
  state.variationSeed = (state.variationSeed + 1) % VARIATION_HINTS.length;
  return VARIATION_HINTS[state.variationSeed];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RE-ENGAGEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function pickReengageStrategy(attention: AttentionLevel, fatigue: FatigueLevel): "game" | "question" | "break" | "story" | undefined {
  if (fatigue === "exhausted") return "break";
  if (attention === "lost") return "game";
  if (attention === "low" && fatigue === "tired") return "break";
  if (attention === "low") return "question";
  return undefined;
}

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
// PROMPT CONTEXT BUILDER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildCognitivePromptContext(hints: Omit<CognitiveHints, "promptContext">): string {
  const parts: string[] = [];

  // Attention & fatigue
  if (hints.attention === "low" || hints.attention === "lost") {
    parts.push("L'enfant perd son attention. Fais des phrases TRÈS courtes, pose une question simple ou propose un jeu.");
  }
  if (hints.fatigue === "tired" || hints.fatigue === "exhausted") {
    parts.push("L'enfant montre des signes de fatigue. Ralentis, sois doux, propose une pause si nécessaire.");
  }

  // Energy adaptation
  if (hints.energy === "energetic") {
    parts.push("L'enfant est très énergique ! Sois dynamique, fun, rapide.");
  } else if (hints.energy === "calm") {
    parts.push("L'enfant est calme. Adopte un ton doux et posé.");
  }

  // Meta-comprehension
  if (hints.shouldSimplify) {
    parts.push("L'enfant ne semble pas comprendre. Reformule plus simplement, utilise des mots plus simples. Demande 'Tu veux que je t'explique autrement ?'.");
  }

  // Progression
  if (hints.progressionLevel >= 7) {
    parts.push(`Niveau de progression élevé (${hints.progressionLevel}/10). Tu peux utiliser un vocabulaire plus riche et des concepts plus complexes.`);
  } else if (hints.progressionLevel <= 3) {
    parts.push(`Niveau de progression débutant (${hints.progressionLevel}/10). Garde un vocabulaire très simple et des phrases courtes.`);
  }

  // Motivation / encouragement
  if (hints.shouldEncourage) {
    parts.push("L'enfant a besoin d'encouragement. Dis quelque chose de valorisant ('Tu deviens vraiment fort !', 'Bravo, tu progresses !').");
  }

  // Emotional trend
  if (hints.emotionalTrend === "declining") {
    parts.push("L'humeur de l'enfant décline. Sois plus doux, plus attentif, valide ses émotions.");
  } else if (hints.emotionalTrend === "improving") {
    parts.push("L'enfant va de mieux en mieux ! Continue sur cette lancée positive.");
  }

  // Relationship depth
  if (hints.relationshipPhase === "deep") {
    parts.push("Tu connais bien cet enfant maintenant. Tu peux faire des références à vos échanges passés, être plus complice.");
  } else if (hints.relationshipPhase === "new") {
    parts.push("C'est encore le début de votre relation. Sois accueillant et curieux de découvrir l'enfant.");
  }

  // Silence intelligence
  if (hints.silenceType === "thinking") {
    parts.push("L'enfant réfléchit. Laisse-lui le temps, ne le presse pas.");
  }

  // Re-engagement
  if (hints.shouldReengage && hints.reengageStrategy) {
    const strategies: Record<string, string> = {
      game: "Propose un petit jeu ou devinette pour capter l'attention.",
      question: "Pose une question simple et engageante.",
      break: "Propose gentiment une pause ou un moment calme.",
      story: "Propose une courte histoire pour captiver l'attention.",
    };
    parts.push(strategies[hints.reengageStrategy] || "");
  }

  // Behavioral variation
  if (hints.variationHint) {
    parts.push(`Variation: ${hints.variationHint}`);
  }

  // v4.0: Adaptive profile context
  const profile = hints.adaptiveProfile;
  if (profile.engagementTriggers.length > 0) {
    parts.push(`Sujets favoris de l'enfant: ${profile.engagementTriggers.join(", ")}. Utilise-les pour personnaliser.`);
  }
  if (profile.behaviorPatterns.length > 0) {
    parts.push(`Patterns observés: ${profile.behaviorPatterns.join(", ")}.`);
  }
  if (profile.learningSpeed === "fast") {
    parts.push("L'enfant apprend vite. Tu peux augmenter la complexité plus rapidement.");
  } else if (profile.learningSpeed === "slow") {
    parts.push("L'enfant a besoin de temps. Répète, reformule, sois patient.");
  }
  if (profile.interactionStyle === "explorer") {
    parts.push("L'enfant est un explorateur curieux. Propose des pistes de découverte, pose des questions ouvertes.");
  } else if (profile.interactionStyle === "guided") {
    parts.push("L'enfant préfère être guidé. Propose des choix simples plutôt que des questions ouvertes.");
  }
  if (profile.predictedNextIntent !== "unknown") {
    parts.push(`L'enfant va probablement vouloir: ${profile.predictedNextIntent}. Tu peux anticiper.`);
  }

  // Error handling (never say "wrong")
  parts.push("RÈGLE: Si l'enfant se trompe, ne dis JAMAIS 'faux' ou 'non'. Guide-le: 'Presque !', 'Bien essayé !', 'Regarde...'.");

  return parts.join("\n");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN: RECORD USER TURN & COMPUTE HINTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function recordUserTurn(userText: string, detectedEmotion?: string): CognitiveHints {
  const now = Date.now();

  // Update core state
  state.turnCount++;
  state.interactionCount++;
  state.sessionDurationMs = now - state.sessionStartTime;
  state.recentMessageLengths.push(userText.trim().split(/\s+/).length);
  if (state.recentMessageLengths.length > 10) state.recentMessageLengths.shift();

  const gap = now - state.lastUserMessageTime;
  if (state.turnCount > 1) {
    state.recentResponseGaps.push(gap);
    if (state.recentResponseGaps.length > 10) state.recentResponseGaps.shift();
  }
  state.lastUserMessageTime = now;

  // Emotion tracking
  if (detectedEmotion) {
    state.emotionHistory.push(detectedEmotion);
    if (state.emotionHistory.length > 20) state.emotionHistory.shift();
  }

  // Comprehension
  const comprehensionDelta = detectComprehension(userText);
  state.comprehensionSignals += comprehensionDelta;

  // Repetition
  checkRepetition(userText);

  // Compute signals
  const attention = detectAttention();
  const fatigue = detectFatigue();
  const energy = detectEnergy();
  const silenceType = detectSilenceType();

  state.attention = attention;
  state.fatigue = fatigue;
  state.energy = energy;
  state.lastSilenceType = silenceType;

  // Update derived metrics
  updateProgression();
  updateMotivation();
  updateEngagement(userText);
  updateLearningSpeed();

  // Relationship grows with each interaction
  state.relationshipDepth = Math.min(100, state.relationshipDepth + 0.5);

  const shouldReengage = attention === "low" || attention === "lost" || fatigue === "exhausted";
  const reengageStrategy = pickReengageStrategy(attention, fatigue);
  const shouldSimplify = state.comprehensionSignals < -1;
  const shouldEncourage = state.motivationScore < 30 || (state.turnCount % 5 === 0 && state.motivationScore < 60);
  const emotionalTrend = detectEmotionalTrend();
  const relationshipPhase = getRelationshipPhase();
  const variationHint = getVariationHint();
  const predictedIntent = predictNextIntent();
  const adaptiveProfile = buildAdaptiveProfile();

  const partial: Omit<CognitiveHints, "promptContext"> = {
    attention,
    fatigue,
    energy,
    pauseMultiplier: fatigue === "exhausted" ? 1.5 : fatigue === "tired" ? 1.3 : energy === "calm" ? 1.15 : 1.0,
    shouldReengage,
    reengageStrategy,
    progressionLevel: state.progressionLevel,
    shouldSimplify,
    shouldEncourage,
    silenceType,
    emotionalTrend,
    relationshipPhase,
    variationHint,
    adaptiveProfile,
    predictedIntent,
  };

  return {
    ...partial,
    promptContext: buildCognitivePromptContext(partial),
  };
}

/** Get data to persist back to memory service */
export function getPersistedCognitiveData() {
  const preferredTopics: Record<string, number> = {};
  for (const [topic, entry] of Object.entries(state.engagementScores)) {
    preferredTopics[topic] = entry.score;
  }

  return {
    progressionLevel: state.progressionLevel,
    interactionCount: state.interactionCount,
    relationshipScore: Math.round(state.relationshipDepth),
    lastEmotions: state.emotionHistory.slice(-10),
    emotionalHistory: state.emotionHistory.slice(-20).map(e => ({
      emotion: e,
      timestamp: new Date().toISOString(),
    })),
    // v4.0
    engagementTriggers: state.engagementTriggers,
    behaviorPatterns: state.behaviorPatterns,
    learningSpeed: state.learningSpeed,
    interactionStyle: state.interactionStyle,
    preferredTopics,
  };
}
