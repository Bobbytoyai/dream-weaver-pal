/**
 * Bobby Brain V8 — Proactive Initiative Engine
 *
 * Bobby doesn't just react — he INITIATES interactions when context justifies it.
 * Handles silence redirects, interest-based facts, milestones, emotional check-ins,
 * memory callbacks, and activity suggestions.
 *
 * Strict non-intrusion rules prevent Bobby from being annoying.
 * Execution: <2ms, 100% offline.
 */

import { getRelevantFacts, getPersistentMemory } from "../persistentMemory";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type InitiativeType =
  | "suggest_activity"
  | "share_fact"
  | "emotional_checkin"
  | "memory_callback"
  | "challenge"
  | "story_hook"
  | "celebrate"
  | "gentle_redirect";

export type InitiativeTrigger =
  | "silence_timeout"
  | "session_start"
  | "mood_opportunity"
  | "interest_match"
  | "milestone"
  | "time_based"
  | "pattern_detected"
  | "context_shift";

export interface ProactiveInitiative {
  type: InitiativeType;
  trigger: InitiativeTrigger;
  content: string;
  urgency: number;            // 0-1
  nonIntrusiveLevel: number;  // 0-1 (1 = very non-intrusive)
}

export interface ProactiveContext {
  turnCount: number;
  sessionMood: "positive" | "neutral" | "negative";
  currentTopic: string | null;
  silenceDurationMs: number;
  isChildSpeaking: boolean;
  isEmotionalSceneActive: boolean;
  isSafetySceneActive: boolean;
  childName: string;
  childAge: number;
  totalInteractions: number;    // across all sessions
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NON-INTRUSION RULES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const COOLDOWNS: Record<InitiativeType, number> = {
  suggest_activity: 10,
  share_fact: 8,
  emotional_checkin: 15,
  memory_callback: 12,
  challenge: 10,
  story_hook: 15,
  celebrate: 50,
  gentle_redirect: 3,
};

const TIME_RULES: Record<string, InitiativeType[]> = {
  morning: ["share_fact", "challenge", "celebrate"],
  afternoon: ["suggest_activity", "story_hook", "challenge"],
  evening: ["emotional_checkin", "story_hook", "memory_callback"],
  night: ["gentle_redirect"],
};

function getTimeOfDay(hour: number): string {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let lastInitiativeTurn: Record<InitiativeType, number> = {} as Record<InitiativeType, number>;
let lastInitiativeGlobalTurn = 0;
let initiativeCount = 0;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BLOCKER CHECK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function checkBlockers(ctx: ProactiveContext): string | null {
  if (ctx.isChildSpeaking) return "child_is_speaking";
  if (ctx.isEmotionalSceneActive) return "emotional_scene_active";
  if (ctx.isSafetySceneActive) return "safety_scene_active";
  if (ctx.turnCount < 3) return "less_than_3_turns";
  if (ctx.turnCount - lastInitiativeGlobalTurn < 2) return "too_recent_initiative";
  return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONTENT GENERATORS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SILENCE_REDIRECTS = [
  "Tu es toujours là ? On fait un truc ensemble ? 😊",
  "Bobby s'ennuie un peu… Tu veux jouer ou discuter ?",
  "Eh oh ! Tu veux qu'on parle de quelque chose de cool ?",
  "Je suis toujours là si tu veux me parler ! 🌟",
  "Un petit jeu, une histoire, ou juste un câlin ? 😄",
];

const EMOTIONAL_CHECKINS = [
  "Au fait, comment tu te sens aujourd'hui ?",
  "Ça va bien toi ? Tu peux tout me dire tu sais ! 💙",
  "Bobby veut savoir : tu es content aujourd'hui ? 😊",
  "Comment ça se passe pour toi en ce moment ?",
];

const ACTIVITY_SUGGESTIONS = [
  "Tu veux qu'on joue à un jeu ? J'en connais plein ! 🎮",
  "Ça te dit que je te raconte une histoire ? 📖",
  "On fait une devinette ? J'en ai une super ! 🤔",
  "Tu veux apprendre un truc incroyable ? 🌟",
  "Et si on jouait au jeu des animaux ? 🐾",
  "J'ai un défi pour toi, ça t'intéresse ? 💪",
];

const CHALLENGES = [
  "J'ai un défi pour toi : tu arrives à nommer 3 animaux qui commencent par la même lettre ? 🧠",
  "Défi Bobby : tu peux me dire un mot très très long ? Le plus long que tu connais !",
  "Challenge ! Quel est l'animal le plus rapide que tu connais ? 🏃",
  "Bobby te défie : invente un animal imaginaire et décris-le-moi ! 🦄",
  "Est-ce que tu peux me raconter ta journée en 3 mots ? C'est plus dur qu'on croit ! 😄",
];

const STORY_HOOKS = [
  "J'ai une histoire incroyable à te raconter… Tu veux l'entendre ? ✨",
  "Tu sais quoi ? J'ai découvert une histoire de dragon super cool !",
  "Il était une fois… Non attend, tu veux que je te raconte ? 📖",
  "J'ai une histoire avec un héros qui te ressemble… Ça t'intéresse ?",
];

const INTEREST_FACTS: Record<string, string[]> = {
  animaux: [
    "Tu savais que les dauphins dorment avec un seul œil fermé ? 🐬",
    "Figure-toi que les éléphants sont les seuls animaux qui ne peuvent pas sauter ! 🐘",
    "Petit secret : les chats passent 70% de leur vie à dormir ! 😺",
  ],
  espace: [
    "Tu savais qu'une journée sur Vénus dure plus longtemps qu'une année sur Vénus ? 🪐",
    "Écoute ça : le Soleil est tellement grand qu'on pourrait mettre 1 million de Terres dedans ! ☀️",
    "Sur la Lune, tu pourrais sauter 6 fois plus haut que sur Terre ! 🌙",
  ],
  dinosaures: [
    "Tu savais que le T-Rex avait des tout petits bras ? Imagine-le essayer de se brosser les dents ! 🦖",
    "Les dinosaures ont vécu pendant 165 millions d'années. Les humains ? Seulement 200 000 ans !",
    "Certains dinosaures avaient des plumes ! Comme des gros poulets géants 🐔",
  ],
  science: [
    "Tu savais que l'eau chaude gèle plus vite que l'eau froide ? C'est bizarre, non ? 🧊",
    "Figure-toi que la foudre est 5 fois plus chaude que le Soleil ! ⚡",
    "Ton corps contient assez de fer pour fabriquer un petit clou ! 🔩",
  ],
  nature: [
    "Tu savais que les arbres communiquent entre eux par leurs racines ? 🌳",
    "Les tournesols tournent pour suivre le soleil pendant la journée ! 🌻",
    "Un escargot peut dormir pendant 3 ans d'affilée ! 🐌",
  ],
};

const DEFAULT_FACTS = [
  "Tu savais que les abeilles dansent pour dire à leurs copines où trouver les fleurs ? 🐝",
  "Figure-toi qu'il y a plus d'étoiles dans l'univers que de grains de sable sur Terre ! ⭐",
  "Le cœur d'une baleine bleue est aussi gros qu'une voiture ! 🐋",
  "Les pieuvres ont 3 cœurs ! Tu imagines ? 🐙",
  "L'arc-en-ciel a toujours 7 couleurs, dans le même ordre ! 🌈",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildSilenceRedirect(): string {
  return pickRandom(SILENCE_REDIRECTS);
}

function buildEmotionalCheckin(): string {
  return pickRandom(EMOTIONAL_CHECKINS);
}

function buildActivitySuggestion(): string {
  return pickRandom(ACTIVITY_SUGGESTIONS);
}

function buildChallenge(): string {
  return pickRandom(CHALLENGES);
}

function buildStoryHook(): string {
  return pickRandom(STORY_HOOKS);
}

function buildInterestFact(): string {
  const mem = getPersistentMemory();
  const interests = Object.entries(mem.interestScores)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);

  for (const interest of interests) {
    const key = interest.toLowerCase();
    for (const [factKey, facts] of Object.entries(INTEREST_FACTS)) {
      if (key.includes(factKey) || factKey.includes(key)) {
        return pickRandom(facts);
      }
    }
  }

  return pickRandom(DEFAULT_FACTS);
}

function buildMemoryGreeting(childName: string): string {
  const facts = getRelevantFacts({}, 3);
  if (facts.length > 0) {
    const fact = facts[0];
    const colonIdx = fact.text.indexOf(":");
    const value = colonIdx !== -1 ? fact.text.slice(colonIdx + 1).trim().toLowerCase() : fact.text.toLowerCase();
    return `Salut ${childName} ! La dernière fois tu m'avais parlé de ${value}, tu me racontes la suite ? 😊`;
  }
  return `Hey ${childName} ! Content de te retrouver ! Qu'est-ce qu'on fait aujourd'hui ? 🌟`;
}

function buildMilestoneMessage(totalInteractions: number, childName: string): string {
  if (totalInteractions >= 100 && totalInteractions < 105) {
    return `${childName}, c'est notre 100ème discussion ! On est une sacrée équipe toi et moi ! 🎉`;
  }
  if (totalInteractions >= 50 && totalInteractions < 53) {
    return `Eh ${childName}, on a déjà discuté 50 fois ensemble ! C'est trop cool ! 🌟`;
  }
  if (totalInteractions >= 200 && totalInteractions < 203) {
    return `200 discussions ${childName} ! Tu es mon meilleur ami ! 🏆💙`;
  }
  return `${childName}, on a partagé tellement de bons moments ensemble ! 💫`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TRIGGER → INITIATIVE MAPPING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generateInitiative(
  trigger: InitiativeTrigger,
  ctx: ProactiveContext,
): ProactiveInitiative {
  switch (trigger) {
    case "silence_timeout":
      return {
        type: "gentle_redirect",
        trigger,
        content: buildSilenceRedirect(),
        urgency: 0.3,
        nonIntrusiveLevel: 0.9,
      };

    case "session_start":
      if (ctx.totalInteractions < 10) {
        return {
          type: "emotional_checkin",
          trigger,
          content: buildEmotionalCheckin(),
          urgency: 0.5,
          nonIntrusiveLevel: 0.8,
        };
      }
      return {
        type: "memory_callback",
        trigger,
        content: buildMemoryGreeting(ctx.childName),
        urgency: 0.4,
        nonIntrusiveLevel: 0.7,
      };

    case "mood_opportunity":
      return {
        type: "suggest_activity",
        trigger,
        content: buildActivitySuggestion(),
        urgency: 0.3,
        nonIntrusiveLevel: 0.8,
      };

    case "interest_match":
      return {
        type: "share_fact",
        trigger,
        content: buildInterestFact(),
        urgency: 0.3,
        nonIntrusiveLevel: 0.8,
      };

    case "milestone":
      return {
        type: "celebrate",
        trigger,
        content: buildMilestoneMessage(ctx.totalInteractions, ctx.childName),
        urgency: 0.6,
        nonIntrusiveLevel: 0.6,
      };

    case "time_based": {
      const hour = new Date().getHours();
      const tod = getTimeOfDay(hour);
      if (tod === "evening") {
        return {
          type: "story_hook",
          trigger,
          content: buildStoryHook(),
          urgency: 0.3,
          nonIntrusiveLevel: 0.8,
        };
      }
      if (tod === "morning") {
        return {
          type: "challenge",
          trigger,
          content: buildChallenge(),
          urgency: 0.4,
          nonIntrusiveLevel: 0.7,
        };
      }
      return {
        type: "suggest_activity",
        trigger,
        content: buildActivitySuggestion(),
        urgency: 0.2,
        nonIntrusiveLevel: 0.9,
      };
    }

    case "pattern_detected":
    case "context_shift":
    default:
      return {
        type: "suggest_activity",
        trigger,
        content: buildActivitySuggestion(),
        urgency: 0.2,
        nonIntrusiveLevel: 0.9,
      };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PUBLIC API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Check if Bobby should take initiative. Returns null if no initiative is warranted.
 * Called every turn + on silence timeouts.
 */
export function checkProactiveInitiative(
  trigger: InitiativeTrigger,
  ctx: ProactiveContext,
): ProactiveInitiative | null {
  // Check blockers
  const blocker = checkBlockers(ctx);
  if (blocker) {
    return null;
  }

  // Determine initiative type for cooldown check
  const candidate = generateInitiative(trigger, ctx);

  // Check cooldown
  const lastTurn = lastInitiativeTurn[candidate.type] ?? 0;
  const cooldown = COOLDOWNS[candidate.type];
  if (ctx.turnCount - lastTurn < cooldown) {
    return null;
  }

  // Check time-of-day appropriateness
  const hour = new Date().getHours();
  const tod = getTimeOfDay(hour);
  const allowedTypes = TIME_RULES[tod] ?? [];
  if (allowedTypes.length > 0 && !allowedTypes.includes(candidate.type) && candidate.type !== "gentle_redirect") {
    return null;
  }

  // Record initiative
  lastInitiativeTurn[candidate.type] = ctx.turnCount;
  lastInitiativeGlobalTurn = ctx.turnCount;
  initiativeCount++;

  console.log(
    `[Proactive V8] 🚀 Initiative: ${candidate.type} (trigger=${trigger}, urgency=${candidate.urgency}, non-intrusive=${candidate.nonIntrusiveLevel})`
  );

  return candidate;
}

/**
 * Detect which triggers are active given current context.
 * Returns the highest-priority trigger or null.
 */
export function detectTrigger(ctx: ProactiveContext): InitiativeTrigger | null {
  // Silence timeout (>15s for young, >25s for older)
  const silenceThreshold = ctx.childAge <= 6 ? 15000 : 25000;
  if (ctx.silenceDurationMs > silenceThreshold) {
    return "silence_timeout";
  }

  // Session start
  if (ctx.turnCount === 0) {
    return "session_start";
  }

  // Milestone check
  if ([50, 100, 200, 500].includes(ctx.totalInteractions)) {
    return "milestone";
  }

  // Mood opportunity: positive mood + neutral topic → suggest fun
  if (ctx.sessionMood === "positive" && !ctx.currentTopic && ctx.turnCount > 5) {
    return "mood_opportunity";
  }

  // Interest match: check if there are strong interests to leverage
  const mem = getPersistentMemory();
  const topInterest = Object.entries(mem.interestScores).sort((a, b) => b[1] - a[1])[0];
  if (topInterest && topInterest[1] >= 5 && ctx.turnCount > 8 && Math.random() < 0.3) {
    return "interest_match";
  }

  // Time-based (low priority, random chance)
  if (ctx.turnCount > 10 && Math.random() < 0.15) {
    return "time_based";
  }

  return null;
}

/**
 * High-level convenience: detect trigger + check initiative in one call.
 */
export function maybeInitiate(ctx: ProactiveContext): ProactiveInitiative | null {
  const trigger = detectTrigger(ctx);
  if (!trigger) return null;
  return checkProactiveInitiative(trigger, ctx);
}

/** Reset all proactive state */
export function resetProactiveEngine(): void {
  lastInitiativeTurn = {} as Record<InitiativeType, number>;
  lastInitiativeGlobalTurn = 0;
  initiativeCount = 0;
}

/** Get initiative count for this session */
export function getInitiativeCount(): number {
  return initiativeCount;
}
