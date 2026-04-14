/**
 * Bobby Brain V7 — Deep Understanding Module
 * 
 * Transforms raw text + context into a 4-level UnderstandingFrame:
 *   Level 1: Explicit Intent (reuses V6 intentEngine)
 *   Level 2: Implicit Intent (what the child REALLY wants)
 *   Level 3: Emotional Need (underlying psychological need)
 *   Level 4: User Goal (what the child is trying to accomplish)
 *   + Ambiguity scoring & confirmation logic
 * 
 * Execution: <15ms (100% local, regex + scoring)
 */

import { detectLocalIntent } from "../localBrain/intentEngine";
import { detectEmotion } from "../localBrain/emotionEngine";
import type { LocalIntent, EmotionType, DetectedEmotion } from "../localBrain/types";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type ImplicitIntent =
  | "seek_comfort"
  | "seek_attention"
  | "seek_validation"
  | "seek_knowledge"
  | "seek_fun"
  | "seek_connection"
  | "seek_autonomy"
  | "express_frustration"
  | "test_limits"
  | "share_experience"
  | "process_emotion";

export type EmotionalNeed =
  | "security"
  | "belonging"
  | "competence"
  | "autonomy"
  | "stimulation"
  | "recognition"
  | "calm"
  | "expression";

export type UserGoal =
  | "be_reassured"
  | "learn_something"
  | "have_fun"
  | "be_heard"
  | "solve_problem"
  | "pass_time"
  | "get_help"
  | "share_joy"
  | "explore_topic"
  | "wind_down";

export interface UnderstandingFrame {
  // Level 1 — Explicit (V6 reused)
  explicitIntent: LocalIntent;
  intentConfidence: number;

  // Level 2 — Implicit (V7)
  implicitIntent: ImplicitIntent;
  implicitConfidence: number;

  // Level 3 — Emotional Need (V7)
  emotionalNeed: EmotionalNeed;
  needIntensity: number; // 1-5

  // Level 4 — User Goal (V7)
  userGoal: UserGoal;

  // Detected emotion (pass-through)
  emotion: DetectedEmotion;

  // Meta
  ambiguityScore: number;          // 0 = clear, 1 = very ambiguous
  requiresConfirmation: boolean;
  alternativeIntents: string[];
  confirmationPrompt: string | null;
}

export interface SessionContext {
  turnCount: number;
  sessionMood: "positive" | "neutral" | "negative";
  currentTopic: string | null;
  topicDepth: number;
  lastExplicitIntent: LocalIntent | null;
  lastImplicitIntent: ImplicitIntent | null;
}

export interface ChildProfile {
  age: number;
  name: string;
  relationshipScore: number; // 0-100
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IMPLICIT DEDUCTION RULES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface DeductionRule {
  match: {
    intents?: LocalIntent[];
    emotions?: EmotionType[];
    patterns?: RegExp[];
  };
  result: {
    implicit: ImplicitIntent;
    need: EmotionalNeed;
    goal: UserGoal;
  };
  priority: number;
}

const DEDUCTION_RULES: DeductionRule[] = [
  // ── Fear / Anxiety → Seek comfort + Security ──
  {
    match: { intents: ["PEUR", "ANXIETE", "PEUR_ABANDON", "PEUR_ECHEC"], emotions: ["fear"] },
    result: { implicit: "seek_comfort", need: "security", goal: "be_reassured" },
    priority: 10,
  },
  // ── Crisis / Abandonment → Process emotion + Security ──
  {
    match: { intents: ["CRISE_SECURITE", "ABANDON", "FATIGUE_EMOTIONNELLE"] },
    result: { implicit: "process_emotion", need: "security", goal: "be_heard" },
    priority: 12,
  },
  // ── Sadness / Loneliness → Seek connection + Belonging ──
  {
    match: { intents: ["TRISTESSE", "SOLITUDE"], emotions: ["sadness"] },
    result: { implicit: "seek_connection", need: "belonging", goal: "be_heard" },
    priority: 10,
  },
  // ── Family conflicts → Process emotion + Security ──
  {
    match: { intents: ["CONFLIT_FAMILLE"], emotions: ["fear", "sadness", "anger"] },
    result: { implicit: "process_emotion", need: "security", goal: "be_heard" },
    priority: 10,
  },
  // ── Friend conflicts → Seek connection + Belonging ──
  {
    match: { intents: ["CONFLIT_AMI", "HARCELEMENT"] },
    result: { implicit: "seek_connection", need: "belonging", goal: "get_help" },
    priority: 10,
  },
  // ── Pride / Creation → Seek validation + Recognition ──
  {
    match: { intents: ["FIERTE", "CREATION"], emotions: ["pride", "excitement"] },
    result: { implicit: "seek_validation", need: "recognition", goal: "share_joy" },
    priority: 9,
  },
  // ── School pride → Share experience + Recognition ──
  {
    match: { intents: ["ECOLE", "FIERTE"], emotions: ["joy", "pride"] },
    result: { implicit: "share_experience", need: "recognition", goal: "share_joy" },
    priority: 8,
  },
  // ── Questions / Curiosity → Seek knowledge + Stimulation ──
  {
    match: { intents: ["QUESTION_SIMPLE", "QUESTION_COMPLEXE", "CURIOSITE", "QUESTION_ABSURDE", "QUESTION_EXISTENTIELLE"] },
    result: { implicit: "seek_knowledge", need: "stimulation", goal: "learn_something" },
    priority: 8,
  },
  // ── Games / Fun requests → Seek fun + Stimulation ──
  {
    match: { intents: ["JEU", "DEVINETTE", "AVENTURE", "BLAGUE", "CHANSON", "IMAGINATION"] },
    result: { implicit: "seek_fun", need: "stimulation", goal: "have_fun" },
    priority: 7,
  },
  // ── Stories → Seek fun or comfort depending on emotion ──
  {
    match: { intents: ["HISTOIRE"] },
    result: { implicit: "seek_fun", need: "stimulation", goal: "have_fun" },
    priority: 7,
  },
  // ── Sleep / Fatigue → Seek comfort + Calm ──
  {
    match: { intents: ["DODO", "FATIGUE"] },
    result: { implicit: "seek_comfort", need: "calm", goal: "wind_down" },
    priority: 9,
  },
  // ── Boredom → Seek attention + Stimulation ──
  {
    match: { intents: ["ENNUI"], emotions: ["neutral", "boredom"] },
    result: { implicit: "seek_attention", need: "stimulation", goal: "pass_time" },
    priority: 6,
  },
  // ── Anger / Frustration → Express frustration + Expression ──
  {
    match: { intents: ["COLERE", "RESISTANCE", "AVERSION"], emotions: ["anger"] },
    result: { implicit: "express_frustration", need: "expression", goal: "be_heard" },
    priority: 9,
  },
  // ── Shame / Guilt → Process emotion + Security ──
  {
    match: { intents: ["HONTE", "MENSONGE", "MAUVAIS_COMPORTEMENT"] },
    result: { implicit: "process_emotion", need: "security", goal: "be_reassured" },
    priority: 9,
  },
  // ── Failure / Self-doubt → Seek validation + Competence ──
  {
    match: { intents: ["ECHEC", "MANQUE_CONFIANCE", "PERFECTIONNISME", "COMPARAISON"] },
    result: { implicit: "seek_validation", need: "competence", goal: "be_reassured" },
    priority: 9,
  },
  // ── Love / Affection → Seek connection + Belonging ──
  {
    match: { intents: ["AMOUR", "BESOIN_AFFECTION", "AMOUREUX"] },
    result: { implicit: "seek_connection", need: "belonging", goal: "share_joy" },
    priority: 8,
  },
  // ── Joy / Excitement → Share experience + Recognition ──
  {
    match: { intents: ["JOIE", "EXCITATION", "SURPRISE"] },
    result: { implicit: "share_experience", need: "recognition", goal: "share_joy" },
    priority: 7,
  },
  // ── Future dreams → Seek autonomy + Competence ──
  {
    match: { intents: ["REVE_AVENIR", "OBJECTIF"] },
    result: { implicit: "seek_autonomy", need: "competence", goal: "explore_topic" },
    priority: 7,
  },
  // ── Withdrawal / People-pleasing → Process emotion + Autonomy ──
  {
    match: { intents: ["RETRAIT", "PEOPLE_PLEASING"] },
    result: { implicit: "process_emotion", need: "autonomy", goal: "be_heard" },
    priority: 8,
  },
  // ── Health → Seek comfort + Security ──
  {
    match: { intents: ["SANTE"] },
    result: { implicit: "seek_comfort", need: "security", goal: "get_help" },
    priority: 9,
  },
  // ── Loss (object) → Express frustration + Expression ──
  {
    match: { intents: ["PERTE"] },
    result: { implicit: "express_frustration", need: "expression", goal: "get_help" },
    priority: 7,
  },
  // ── Learning request → Seek knowledge + Stimulation ──
  {
    match: { intents: ["APPRENDRE"] },
    result: { implicit: "seek_knowledge", need: "stimulation", goal: "learn_something" },
    priority: 8,
  },
  // ── Daily sharing → Share experience + Belonging ──
  {
    match: { intents: ["PARTAGE_QUOTIDIEN", "NOURRITURE", "VACANCES", "ACTIVITE"] },
    result: { implicit: "share_experience", need: "belonging", goal: "be_heard" },
    priority: 5,
  },
  // ── Wants / Desires → Seek autonomy ──
  {
    match: { intents: ["ENVIE"] },
    result: { implicit: "seek_autonomy", need: "autonomy", goal: "pass_time" },
    priority: 5,
  },
  // ── Greetings → Seek connection ──
  {
    match: { intents: ["SALUT"] },
    result: { implicit: "seek_connection", need: "belonging", goal: "have_fun" },
    priority: 4,
  },
  // ── Goodbye → Wind down ──
  {
    match: { intents: ["AU_REVOIR"] },
    result: { implicit: "seek_connection", need: "calm", goal: "wind_down" },
    priority: 4,
  },
  // ── Compliment / Gratitude → Seek connection + Belonging ──
  {
    match: { intents: ["COMPLIMENT", "GRATITUDE"] },
    result: { implicit: "seek_connection", need: "belonging", goal: "share_joy" },
    priority: 6,
  },
  // ── Bobby identity questions → Seek knowledge ──
  {
    match: { intents: ["IDENTITE_BOBBY"] },
    result: { implicit: "seek_knowledge", need: "stimulation", goal: "explore_topic" },
    priority: 6,
  },
  // ── Confusion → Seek help ──
  {
    match: { intents: ["CONFUSION"] },
    result: { implicit: "seek_knowledge", need: "competence", goal: "get_help" },
    priority: 7,
  },
  // ── Identity fear → Process emotion ──
  {
    match: { intents: ["IDENTITE_PEUR"] },
    result: { implicit: "process_emotion", need: "belonging", goal: "be_reassured" },
    priority: 9,
  },
  // ── Test limits (patterns) ──
  {
    match: { patterns: [/\b(nul|méchant|bête|idiot|stupide|t'es nul|t'es bête)\b/i] },
    result: { implicit: "test_limits", need: "autonomy", goal: "be_heard" },
    priority: 7,
  },
  // ── Stress → Seek comfort ──
  {
    match: { intents: ["STRESS"] },
    result: { implicit: "seek_comfort", need: "calm", goal: "be_reassured" },
    priority: 8,
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LEVEL 2: IMPLICIT INTENT DEDUCTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ImplicitResult {
  type: ImplicitIntent;
  confidence: number;
  need: EmotionalNeed;
  goal: UserGoal;
}

function deduceImplicitIntent(
  explicitIntent: LocalIntent,
  emotion: DetectedEmotion,
  text: string,
  _session: SessionContext,
): ImplicitResult {
  // Sort by priority desc
  const sorted = [...DEDUCTION_RULES].sort((a, b) => b.priority - a.priority);

  for (const rule of sorted) {
    let matches = false;

    // Check intent match
    const intentMatch = rule.match.intents?.includes(explicitIntent);
    // Check emotion match
    const emotionMatch = rule.match.emotions?.includes(emotion.type);
    // Check pattern match
    const patternMatch = rule.match.patterns?.some(p => p.test(text));

    if (rule.match.intents && rule.match.emotions) {
      // Both specified: intent must match, emotion is a bonus
      matches = !!intentMatch && (emotionMatch !== false || !rule.match.emotions);
      // If intent matches but emotion doesn't, still match but lower confidence
      if (intentMatch && !emotionMatch) matches = true;
    } else if (rule.match.intents) {
      matches = !!intentMatch;
    } else if (rule.match.patterns) {
      matches = !!patternMatch;
    } else if (rule.match.emotions) {
      matches = !!emotionMatch;
    }

    if (matches) {
      // Compute confidence based on how many dimensions matched
      let confidence = 0.6;
      if (intentMatch) confidence += 0.2;
      if (emotionMatch) confidence += 0.15;
      if (patternMatch) confidence += 0.1;
      // High emotion intensity → higher confidence
      if (emotion.intensity >= 4) confidence += 0.05;

      return {
        type: rule.result.implicit,
        confidence: Math.min(1.0, confidence),
        need: rule.result.need,
        goal: rule.result.goal,
      };
    }
  }

  // Default fallback
  return {
    type: "share_experience",
    confidence: 0.3,
    need: "stimulation",
    goal: "pass_time",
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LEVEL 3: EMOTIONAL NEED REFINEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function refineEmotionalNeed(
  baseNeed: EmotionalNeed,
  emotion: DetectedEmotion,
  child: ChildProfile,
): { need: EmotionalNeed; intensity: number } {
  let intensity = emotion.intensity;

  // Young children (3-5) have amplified security needs
  if (child.age <= 5 && (baseNeed === "security" || baseNeed === "belonging")) {
    intensity = Math.min(5, intensity + 1);
  }

  // Low relationship score → belonging need amplified
  if (child.relationshipScore < 30 && baseNeed === "belonging") {
    intensity = Math.min(5, intensity + 1);
  }

  // High emotion intensity → amplify need
  if (emotion.intensity >= 4) {
    intensity = Math.min(5, intensity + 1);
  }

  // Calm/neutral emotions → lower intensity
  if (emotion.type === "neutral" || emotion.type === "calm") {
    intensity = Math.max(1, intensity - 1);
  }

  return { need: baseNeed, intensity };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LEVEL 4: USER GOAL REFINEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function refineUserGoal(
  baseGoal: UserGoal,
  implicit: ImplicitIntent,
  emotion: DetectedEmotion,
  session: SessionContext,
): UserGoal {
  // Override: if child is emotionally distressed, goal is always "be_heard" first
  if (emotion.intensity >= 4 && ["fear", "sadness", "anger"].includes(emotion.type)) {
    if (baseGoal !== "be_reassured") return "be_heard";
  }

  // If session is long and mood is negative, child may need a break
  if (session.turnCount > 15 && session.sessionMood === "negative") {
    if (implicit === "seek_fun" || implicit === "seek_attention") {
      return "wind_down";
    }
  }

  // If topic depth is high, child wants to explore
  if (session.topicDepth >= 3 && baseGoal === "learn_something") {
    return "explore_topic";
  }

  return baseGoal;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AMBIGUITY SCORING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Secondary intent detection: find all matching intents
function findAlternativeIntents(text: string, primaryIntent: LocalIntent): LocalIntent[] {
  const lower = text.toLowerCase().trim();
  const alternatives: LocalIntent[] = [];

  // Check if ambiguous short phrases match multiple emotional states
  const ambiguousPatterns: { pattern: RegExp; intents: LocalIntent[] }[] = [
    { pattern: /c'est nul/i, intents: ["ENNUI", "COLERE", "AVERSION"] },
    { pattern: /je sais pas/i, intents: ["CONFUSION", "ENNUI", "TRISTESSE"] },
    { pattern: /laisse-?moi/i, intents: ["RETRAIT", "COLERE", "FATIGUE"] },
    { pattern: /ça va/i, intents: ["SALUT", "TRISTESSE", "FATIGUE"] },
    { pattern: /non/i, intents: ["NON", "COLERE", "RESISTANCE"] },
    { pattern: /j'aime pas/i, intents: ["AVERSION", "COLERE", "ENNUI"] },
    { pattern: /pourquoi/i, intents: ["QUESTION_SIMPLE", "COLERE", "TRISTESSE"] },
  ];

  for (const { pattern, intents } of ambiguousPatterns) {
    if (pattern.test(lower)) {
      for (const intent of intents) {
        if (intent !== primaryIntent && !alternatives.includes(intent)) {
          alternatives.push(intent);
        }
      }
    }
  }

  return alternatives.slice(0, 3);
}

interface AmbiguityResult {
  score: number;
  alternatives: string[];
  confirmationPrompt: string | null;
}

const CONFIRMATION_PROMPTS: Record<string, string[]> = {
  emotion_mismatch: [
    "Tu veux m'en parler ? Comment tu te sens vraiment ?",
    "J'ai l'impression que quelque chose te tracasse, tu veux me dire ?",
  ],
  unclear_short: [
    "Tu peux m'en dire un peu plus ?",
    "Qu'est-ce que tu veux dire exactement ?",
  ],
  multi_intent: [
    "Hmm, tu veux qu'on en parle ou tu préfères faire autre chose ?",
    "D'accord ! Tu veux que je t'aide ou tu voulais juste me le dire ?",
  ],
};

function computeAmbiguity(
  explicitIntent: LocalIntent,
  implicitResult: ImplicitResult,
  emotion: DetectedEmotion,
  text: string,
  session: SessionContext,
): AmbiguityResult {
  let score = 0;
  const alternatives = findAlternativeIntents(text, explicitIntent);
  let promptCategory: string | null = null;

  // 1. Low implicit confidence → ambiguous
  if (implicitResult.confidence < 0.5) {
    score += 0.3;
  }

  // 2. Very short text (1-2 words)
  const wordCount = text.trim().split(/\s+/).length;
  if (wordCount <= 2) {
    score += 0.25;
    promptCategory = "unclear_short";
  }

  // 3. Emotion/intent mismatch (says "ça va" but detected sadness)
  const positiveIntents: LocalIntent[] = ["SALUT", "JOIE", "OUI", "COMPLIMENT"];
  const negativeEmotions: EmotionType[] = ["sadness", "fear", "anger"];
  if (positiveIntents.includes(explicitIntent) && negativeEmotions.includes(emotion.type)) {
    score += 0.3;
    promptCategory = "emotion_mismatch";
  }

  // 4. Multiple alternative intents found
  if (alternatives.length >= 2) {
    score += 0.2;
    if (!promptCategory) promptCategory = "multi_intent";
  }

  // 5. Generic/catch-all intent
  if (explicitIntent === "GENERAL" || explicitIntent === "NOT_UNDERSTOOD") {
    score += 0.3;
    if (!promptCategory) promptCategory = "unclear_short";
  }

  // 6. Context helps reduce ambiguity
  if (session.currentTopic && session.topicDepth >= 2) {
    score = Math.max(0, score - 0.15); // ongoing topic reduces ambiguity
  }

  const finalScore = Math.min(1.0, score);

  // Pick a confirmation prompt if ambiguity is high
  let confirmationPrompt: string | null = null;
  if (finalScore > 0.6 && promptCategory) {
    const prompts = CONFIRMATION_PROMPTS[promptCategory];
    if (prompts) {
      confirmationPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    }
  }

  return {
    score: finalScore,
    alternatives: alternatives.map(String),
    confirmationPrompt,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN EXPORT — extractDeepUnderstanding
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function extractDeepUnderstanding(
  text: string,
  session: SessionContext,
  child: ChildProfile,
): UnderstandingFrame {
  // Level 1: Explicit intent (V6 reused)
  const explicitIntent = detectLocalIntent(text);

  // Detect emotion
  const emotion = detectEmotion(text);

  // Level 2: Implicit intent
  const implicitResult = deduceImplicitIntent(explicitIntent, emotion, text, session);

  // Level 3: Emotional need (refined)
  const { need, intensity } = refineEmotionalNeed(
    implicitResult.need,
    emotion,
    child,
  );

  // Level 4: User goal (refined)
  const userGoal = refineUserGoal(
    implicitResult.goal,
    implicitResult.type,
    emotion,
    session,
  );

  // Ambiguity
  const ambiguity = computeAmbiguity(
    explicitIntent,
    implicitResult,
    emotion,
    text,
    session,
  );

  return {
    explicitIntent,
    intentConfidence: implicitResult.confidence, // Use implicit confidence as overall
    implicitIntent: implicitResult.type,
    implicitConfidence: implicitResult.confidence,
    emotionalNeed: need,
    needIntensity: intensity,
    userGoal,
    emotion,
    ambiguityScore: ambiguity.score,
    requiresConfirmation: ambiguity.score > 0.6,
    alternativeIntents: ambiguity.alternatives,
    confirmationPrompt: ambiguity.confirmationPrompt,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DEFAULT SESSION CONTEXT (for convenience)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function createDefaultSessionContext(): SessionContext {
  return {
    turnCount: 0,
    sessionMood: "neutral",
    currentTopic: null,
    topicDepth: 0,
    lastExplicitIntent: null,
    lastImplicitIntent: null,
  };
}
