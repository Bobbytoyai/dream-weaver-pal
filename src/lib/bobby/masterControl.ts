/**
 * Bobby Brain V9 — Master Control Layer
 *
 * Applies parental mode overrides (Nuit, École, Calme, Éducatif)
 * BEFORE the AI pipeline runs. This layer has highest priority.
 *
 * Each mode modifies:
 *   - allowed intents (block/redirect certain requests)
 *   - energy level (override personality axes)
 *   - response constraints (length, tone)
 *   - proactive behavior (suppress or encourage)
 */

import type { ParentSettings } from "@/components/parentSettings";
import type { BobbyBrainReply } from "./types";
import type { PersonalityContext } from "./personality";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type ParentMode = "normal" | "nuit" | "ecole" | "calme" | "educatif";

export interface MasterControlDecision {
  /** true if the mode intercepts the message entirely */
  intercepted: boolean;
  /** pre-built reply when intercepted */
  reply?: BobbyBrainReply;
  /** personality overrides to apply */
  personalityOverrides?: Partial<PersonalityContext>;
  /** suppress proactive initiatives */
  suppressProactive: boolean;
  /** max response length in words (0 = no limit) */
  maxWords: number;
  /** log label */
  activeMode: ParentMode;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MODE DETECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function isNightTime(settings: ParentSettings): boolean {
  if (!settings.nightMode?.active) return false;
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const current = h * 60 + m;

  const [startH, startM] = (settings.nightMode.startHour || "20:00").split(":").map(Number);
  const [endH, endM] = (settings.nightMode.endHour || "07:00").split(":").map(Number);
  const start = startH * 60 + startM;
  const end = endH * 60 + endM;

  // Handle overnight range (e.g. 20:00 → 07:00)
  if (start > end) {
    return current >= start || current < end;
  }
  return current >= start && current < end;
}

export function resolveActiveMode(settings?: ParentSettings): ParentMode {
  if (!settings) return "normal";

  // Explicit parentMode has priority
  if (settings.parentMode && settings.parentMode !== "normal") {
    return settings.parentMode;
  }

  // Auto-detect night mode from time settings
  if (isNightTime(settings)) {
    return "nuit";
  }

  return "normal";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NIGHT MODE — calme, pas de jeux excitants, réponses courtes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const NIGHT_BLOCKED_INTENTS = new Set([
  "JEU", "BLAGUE", "CHANSON", "DEVINETTE", "AVENTURE", "EXCITATION",
]);

const NIGHT_REDIRECTS = [
  "C'est l'heure de se reposer… Tu veux une petite histoire douce pour t'endormir ? 🌙",
  "Bobby est en mode nuit. On se calme et on respire doucement… 💤",
  "Chut… Bobby parle tout doucement ce soir. Tu veux qu'on écoute une histoire ? 🌟",
];

function applyNightMode(userText: string, intent: string): MasterControlDecision {
  if (NIGHT_BLOCKED_INTENTS.has(intent)) {
    return {
      intercepted: true,
      reply: {
        text: NIGHT_REDIRECTS[Math.floor(Math.random() * NIGHT_REDIRECTS.length)],
        intent: "NIGHT_REDIRECT",
        source: "safety_filter",
        emotion: "calm",
        confidence: 1,
        isOffline: true,
      },
      suppressProactive: true,
      maxWords: 30,
      activeMode: "nuit",
    };
  }

  return {
    intercepted: false,
    personalityOverrides: {
      emotionType: "calm",
      parentPersonality: "calm",
    },
    suppressProactive: true,
    maxWords: 40,
    activeMode: "nuit",
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCHOOL MODE — éducatif uniquement, pas de jeux ni d'histoires
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SCHOOL_BLOCKED_INTENTS = new Set([
  "HISTOIRE", "JEU", "BLAGUE", "CHANSON", "AVENTURE", "IMAGINATION",
]);

const SCHOOL_REDIRECTS = [
  "Bobby est en mode école ! Pose-moi une question, je t'explique tout ! 📚",
  "C'est l'heure d'apprendre ! Tu veux qu'on fasse un exercice ensemble ? 🧠",
  "Mode école activé ! Je suis prêt à t'aider avec tes leçons ! ✏️",
];

function applySchoolMode(userText: string, intent: string): MasterControlDecision {
  if (SCHOOL_BLOCKED_INTENTS.has(intent)) {
    return {
      intercepted: true,
      reply: {
        text: SCHOOL_REDIRECTS[Math.floor(Math.random() * SCHOOL_REDIRECTS.length)],
        intent: "SCHOOL_REDIRECT",
        source: "safety_filter",
        emotion: "curious",
        confidence: 1,
        isOffline: true,
      },
      suppressProactive: false,
      maxWords: 60,
      activeMode: "ecole",
    };
  }

  return {
    intercepted: false,
    personalityOverrides: {
      parentPersonality: "educational",
    },
    suppressProactive: false,
    maxWords: 60,
    activeMode: "ecole",
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CALM MODE — réduit l'énergie, ton doux
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function applyCalmMode(_userText: string, _intent: string): MasterControlDecision {
  return {
    intercepted: false,
    personalityOverrides: {
      parentPersonality: "calm",
    },
    suppressProactive: true,
    maxWords: 50,
    activeMode: "calme",
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EDUCATIONAL MODE — priorise faits, leçons, curiosité
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function applyEducationalMode(_userText: string, _intent: string): MasterControlDecision {
  return {
    intercepted: false,
    personalityOverrides: {
      parentPersonality: "educational",
    },
    suppressProactive: false,
    maxWords: 80,
    activeMode: "educatif",
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PUBLIC API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Evaluate the Master Control Layer and return a decision.
 * Must be called BEFORE the AI pipeline.
 */
export function evaluateMasterControl(
  userText: string,
  intent: string,
  settings?: ParentSettings,
): MasterControlDecision {
  const mode = resolveActiveMode(settings);

  if (mode === "normal") {
    return {
      intercepted: false,
      suppressProactive: false,
      maxWords: 0,
      activeMode: "normal",
    };
  }

  console.log(`[MasterControl] 🎛️ Mode actif: ${mode}`);

  switch (mode) {
    case "nuit":
      return applyNightMode(userText, intent);
    case "ecole":
      return applySchoolMode(userText, intent);
    case "calme":
      return applyCalmMode(userText, intent);
    case "educatif":
      return applyEducationalMode(userText, intent);
    default:
      return { intercepted: false, suppressProactive: false, maxWords: 0, activeMode: "normal" };
  }
}

/**
 * Truncate a reply to a max word count if the mode imposes one.
 */
export function enforceWordLimit(text: string, maxWords: number): string {
  if (maxWords <= 0) return text;
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "…";
}
