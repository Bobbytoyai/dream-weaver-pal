/**
 * Bobby Brain V8 — Child World Model
 *
 * Encodes age-typical cognitive traits, world rules, and confusion zones
 * so Bobby adapts every response to the child's actual understanding level.
 *
 * Execution: <2ms, 100% offline.
 */

import type { CognitiveLevel, ToMSnapshot } from "./theoryOfMind";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type AgeGroup = "toddler_3_4" | "preschool_5_6" | "early_school_7_8" | "mid_school_9_10" | "preteen_11_12";

export interface CognitiveTraits {
  causalReasoning: number;       // 0-1
  timePerception: number;        // 0-1
  abstractThinking: number;      // 0-1
  empathyCapacity: number;       // 0-1
  humorComprehension: number;    // 0-1
  realFictionBoundary: number;   // 0-1
  attentionSpan: number;         // minutes
  workingMemorySlots: number;    // max concepts at once
}

export interface WorldRule {
  rule: string;
  ageRange: [number, number];
  impact: "adapt_content" | "avoid_contradiction" | "explain_gently";
}

export interface ConfusionZone {
  topic: string;
  typicalAge: [number, number];
  typicalError: string;
  bobbyStrategy: string;
}

export interface ChildWorldModel {
  ageGroup: AgeGroup;
  cognitiveTraits: CognitiveTraits;
  worldRules: WorldRule[];
  confusionZones: ConfusionZone[];
}

export interface WorldModelCheck {
  adjusted: string;
  warnings: string[];
  appliedRules: string[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AGE PROFILES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const AGE_PROFILES: Record<AgeGroup, CognitiveTraits> = {
  toddler_3_4: {
    causalReasoning: 0.2,
    timePerception: 0.1,
    abstractThinking: 0.05,
    empathyCapacity: 0.2,
    humorComprehension: 0.3,
    realFictionBoundary: 0.1,
    attentionSpan: 3,
    workingMemorySlots: 2,
  },
  preschool_5_6: {
    causalReasoning: 0.4,
    timePerception: 0.3,
    abstractThinking: 0.15,
    empathyCapacity: 0.4,
    humorComprehension: 0.5,
    realFictionBoundary: 0.3,
    attentionSpan: 7,
    workingMemorySlots: 3,
  },
  early_school_7_8: {
    causalReasoning: 0.65,
    timePerception: 0.6,
    abstractThinking: 0.35,
    empathyCapacity: 0.6,
    humorComprehension: 0.7,
    realFictionBoundary: 0.7,
    attentionSpan: 12,
    workingMemorySlots: 4,
  },
  mid_school_9_10: {
    causalReasoning: 0.8,
    timePerception: 0.8,
    abstractThinking: 0.55,
    empathyCapacity: 0.75,
    humorComprehension: 0.85,
    realFictionBoundary: 0.9,
    attentionSpan: 18,
    workingMemorySlots: 5,
  },
  preteen_11_12: {
    causalReasoning: 0.9,
    timePerception: 0.9,
    abstractThinking: 0.7,
    empathyCapacity: 0.85,
    humorComprehension: 0.95,
    realFictionBoundary: 0.95,
    attentionSpan: 25,
    workingMemorySlots: 6,
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WORLD RULES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const WORLD_RULES: WorldRule[] = [
  { rule: "Les animaux peuvent parler dans les histoires", ageRange: [3, 7], impact: "avoid_contradiction" },
  { rule: "La magie existe dans les contes", ageRange: [3, 8], impact: "avoid_contradiction" },
  { rule: "Les parents savent tout", ageRange: [3, 6], impact: "adapt_content" },
  { rule: "Le monde est juste (les méchants perdent toujours)", ageRange: [3, 7], impact: "adapt_content" },
  { rule: "Les monstres peuvent être sous le lit", ageRange: [3, 6], impact: "avoid_contradiction" },
  { rule: "Les rêves sont réels", ageRange: [3, 5], impact: "avoid_contradiction" },
  { rule: "Grandir = devenir automatiquement fort/intelligent", ageRange: [4, 8], impact: "adapt_content" },
  { rule: "Les émotions ont des causes simples et uniques", ageRange: [3, 7], impact: "explain_gently" },
  { rule: "Le temps est linéaire et lent", ageRange: [3, 6], impact: "adapt_content" },
  { rule: "Les amis sont pour toujours", ageRange: [4, 7], impact: "explain_gently" },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFUSION ZONES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CONFUSION_ZONES: ConfusionZone[] = [
  {
    topic: "temps",
    typicalAge: [3, 6],
    typicalError: "Confond hier/demain, ne comprend pas 'dans 2 jours'",
    bobbyStrategy: "Utiliser des repères concrets: 'après 2 dodos'",
  },
  {
    topic: "mort",
    typicalAge: [4, 7],
    typicalError: "Pense que la mort est réversible ou temporaire",
    bobbyStrategy: "Ne pas contredire, rassurer, rediriger vers un adulte si besoin",
  },
  {
    topic: "quantité",
    typicalAge: [3, 5],
    typicalError: "Conservation non acquise (même quantité = plus si étalé)",
    bobbyStrategy: "Utiliser des comparaisons visuelles simples",
  },
  {
    topic: "causalité",
    typicalAge: [3, 6],
    typicalError: "Pensée magique: 'il pleut parce que je suis triste'",
    bobbyStrategy: "Accepter puis glisser vers l'explication réelle avec douceur",
  },
  {
    topic: "perspective",
    typicalAge: [3, 7],
    typicalError: "Égocentrisme: pense que tout le monde voit/sait ce qu'il voit/sait",
    bobbyStrategy: "Poser des questions pour décentrer: 'et ta maman, elle pense quoi?'",
  },
  {
    topic: "réel_fiction",
    typicalAge: [3, 7],
    typicalError: "Mélange personnages fictifs et réalité",
    bobbyStrategy: "Entrer dans l'imaginaire avec l'enfant, ne pas corriger brutalement",
  },
  {
    topic: "ironie",
    typicalAge: [6, 9],
    typicalError: "Prend l'ironie au premier degré",
    bobbyStrategy: "Éviter l'ironie avant 8 ans, utiliser humour littéral",
  },
  {
    topic: "probabilité",
    typicalAge: [5, 8],
    typicalError: "Pense que les événements rares sont impossibles ou certains",
    bobbyStrategy: "Utiliser des exemples concrets: 'c'est comme gagner au jeu'",
  },
  {
    topic: "émotions_mixtes",
    typicalAge: [4, 7],
    typicalError: "Ne comprend pas qu'on puisse ressentir 2 émotions à la fois",
    bobbyStrategy: "Valider une émotion à la fois, puis introduire la nuance",
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOPIC DETECTION (for confusion zone matching)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const TOPIC_KEYWORDS: Record<string, RegExp> = {
  temps: /\b(hier|demain|avant|après|semaine|mois|année|an|heure|minute|jour|longtemps|bientôt|quand|dodo)\b/i,
  mort: /\b(mort|mourir|tuer|décédé|paradis|ciel|enterr|disparu|plus là|parti pour toujours)\b/i,
  quantité: /\b(plus|moins|pareil|autant|combien|nombre|compter|mesurer|grand|petit|beaucoup)\b/i,
  causalité: /\bparce que\b.*\b(triste|content|fâché|pleut|soleil)\b/i,
  perspective: /\b(il sait|elle sait|tout le monde|les autres|personne ne)\b/i,
  réel_fiction: /\b(vrai|existe|réel|pour de vrai|dans la vraie vie|c'est vrai)\b/i,
  ironie: /\b(c'est (trop |super )?bien|bravo|génial)\b.*\bpas\b/i,
  probabilité: /\b(possible|impossible|peut-être|chance|jamais|toujours|sûr)\b/i,
  émotions_mixtes: /\b(content et triste|j'aime mais|heureux mais|peur mais)\b/i,
};

function detectTopics(text: string): string[] {
  const found: string[] = [];
  for (const [topic, re] of Object.entries(TOPIC_KEYWORDS)) {
    if (re.test(text)) found.push(topic);
  }
  return found;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let currentWorldModel: ChildWorldModel | null = null;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PUBLIC API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Resolve age to age group */
export function getAgeGroup(age: number): AgeGroup {
  if (age <= 4) return "toddler_3_4";
  if (age <= 6) return "preschool_5_6";
  if (age <= 8) return "early_school_7_8";
  if (age <= 10) return "mid_school_9_10";
  return "preteen_11_12";
}

/** Build or update the world model for a given age, optionally adjusted by ToM */
export function buildWorldModel(age: number, tomSnapshot?: ToMSnapshot | null): ChildWorldModel {
  const ageGroup = getAgeGroup(age);
  const baseTraits = { ...AGE_PROFILES[ageGroup] };

  // Adjust traits based on ToM observations
  if (tomSnapshot) {
    const cogLevel = tomSnapshot.model.understanding.cognitiveLevel;
    const levelBonus = cogLevelBonus(cogLevel, ageGroup);
    baseTraits.causalReasoning = clamp01(baseTraits.causalReasoning + levelBonus);
    baseTraits.abstractThinking = clamp01(baseTraits.abstractThinking + levelBonus);
    baseTraits.timePerception = clamp01(baseTraits.timePerception + levelBonus * 0.5);

    if (tomSnapshot.model.understanding.vocabularyLevel === "advanced") {
      baseTraits.abstractThinking = clamp01(baseTraits.abstractThinking + 0.1);
    }
    if (tomSnapshot.model.understanding.canHandleNuance) {
      baseTraits.humorComprehension = clamp01(baseTraits.humorComprehension + 0.1);
    }
  }

  // Filter world rules & confusion zones applicable to this age
  const applicableRules = WORLD_RULES.filter(
    r => age >= r.ageRange[0] && age <= r.ageRange[1],
  );
  const applicableZones = CONFUSION_ZONES.filter(
    z => age >= z.typicalAge[0] && age <= z.typicalAge[1],
  );

  currentWorldModel = {
    ageGroup,
    cognitiveTraits: baseTraits,
    worldRules: applicableRules,
    confusionZones: applicableZones,
  };

  return currentWorldModel;
}

/** Get the current world model (sync) */
export function getWorldModel(): ChildWorldModel | null {
  return currentWorldModel;
}

/** Check confusion zones for a given user text and return warnings */
export function checkConfusionZones(
  userText: string,
  age: number,
): { activeZones: ConfusionZone[]; warnings: string[] } {
  const topics = detectTopics(userText);
  const model = currentWorldModel ?? buildWorldModel(age);
  const activeZones: ConfusionZone[] = [];
  const warnings: string[] = [];

  for (const topic of topics) {
    const zone = model.confusionZones.find(z => z.topic === topic);
    if (zone) {
      activeZones.push(zone);
      warnings.push(`⚠️ Zone "${zone.topic}": ${zone.typicalError} → ${zone.bobbyStrategy}`);
    }
  }

  return { activeZones, warnings };
}

/**
 * Adapt a response text based on the child's world model.
 * Limits complexity, replaces abstract concepts, adapts time references.
 * <2ms execution.
 */
export function adaptToChildWorld(response: string, age: number, tomSnapshot?: ToMSnapshot | null): WorldModelCheck {
  const model = currentWorldModel ?? buildWorldModel(age, tomSnapshot);
  const traits = model.cognitiveTraits;
  let adapted = response;
  const appliedRules: string[] = [];
  const warnings: string[] = [];

  // ── 1. Limit sentence count to working memory slots ──
  const sentences = adapted.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > traits.workingMemorySlots) {
    adapted = sentences.slice(0, traits.workingMemorySlots).join(" ").trim();
    appliedRules.push(`truncated to ${traits.workingMemorySlots} sentences (working memory)`);
  }

  // ── 2. Replace abstract concepts for low abstractThinking ──
  if (traits.abstractThinking < 0.3) {
    const replacements: [RegExp, string][] = [
      [/\bla justice\b/gi, "quand c'est juste pour tout le monde"],
      [/\bla liberté\b/gi, "quand on peut choisir"],
      [/\bl'amitié\b/gi, "quand on a un super copain"],
      [/\ble bonheur\b/gi, "quand on est très content"],
      [/\bla patience\b/gi, "quand on attend sans s'énerver"],
      [/\ble courage\b/gi, "quand on fait quelque chose même si on a peur"],
      [/\bla confiance\b/gi, "quand on croit en quelqu'un"],
    ];
    for (const [re, replacement] of replacements) {
      if (re.test(adapted)) {
        adapted = adapted.replace(re, replacement);
        appliedRules.push("abstract→concrete");
      }
    }
  }

  // ── 3. Adapt time references for low timePerception ──
  if (traits.timePerception < 0.3) {
    adapted = adapted.replace(/il y a (\d+) ans?/gi, "il y a très très longtemps");
    adapted = adapted.replace(/dans (\d+) jours?/gi, (_, n) => `après ${n} dodos`);
    adapted = adapted.replace(/le siècle dernier/gi, "quand les arrière-grands-parents étaient petits");
    adapted = adapted.replace(/il y a (\d+) siècles?/gi, "il y a très très très longtemps");
    adapted = adapted.replace(/(\d{4})\b/g, (m) => {
      const year = parseInt(m);
      if (year < 1900) return "il y a très longtemps";
      return m;
    });
    if (adapted !== response) appliedRules.push("time→concrete");
  } else if (traits.timePerception < 0.6) {
    adapted = adapted.replace(/il y a (\d+) siècles?/gi, "il y a très longtemps");
  }

  // ── 4. Avoid irony for young children ──
  if (traits.humorComprehension < 0.5) {
    // Flag but don't auto-replace (irony is hard to detect reliably)
    if (/c'est (trop |super )?(bien|cool|génial).*pas/i.test(adapted)) {
      warnings.push("Possible ironie détectée — l'enfant pourrait la prendre au premier degré");
    }
  }

  // ── 5. Check world rules ──
  for (const rule of model.worldRules) {
    if (rule.impact === "avoid_contradiction") {
      // Check if response contradicts a world rule
      if (rule.rule.includes("magie") && /la magie (?:n'existe|n'est) pas/i.test(adapted)) {
        adapted = adapted.replace(/la magie (?:n'existe|n'est) pas\b[^.!?]*/gi, "la magie, c'est merveilleux");
        appliedRules.push(`protected rule: ${rule.rule.slice(0, 30)}`);
      }
      if (rule.rule.includes("monstres") && /les monstres (?:n'existe|ne sont pas)/i.test(adapted)) {
        adapted = adapted.replace(/les monstres (?:n'existe|ne sont pas)[^.!?]*/gi, "les monstres, Bobby les chasse pour toi");
        appliedRules.push(`protected rule: monstres`);
      }
    }
  }

  // ── 6. Simplify long words for toddlers ──
  if (model.ageGroup === "toddler_3_4") {
    adapted = adapted.replace(/\bextraordinaire\b/gi, "super");
    adapted = adapted.replace(/\bmerveilleux\b/gi, "trop bien");
    adapted = adapted.replace(/\bmagnifique\b/gi, "trop beau");
    adapted = adapted.replace(/\bexceptionnelle?(?:ment)?\b/gi, "super");
    adapted = adapted.replace(/\bexactement\b/gi, "oui");
    if (adapted !== response) appliedRules.push("simplified vocabulary");
  }

  return { adjusted: adapted, warnings, appliedRules };
}

/** Reset the world model */
export function resetWorldModel(): void {
  currentWorldModel = null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Compute a cognitive level bonus/penalty relative to age-expected baseline */
function cogLevelBonus(observed: CognitiveLevel, ageGroup: AgeGroup): number {
  const expected: Record<AgeGroup, CognitiveLevel> = {
    toddler_3_4: "preoperational",
    preschool_5_6: "preoperational",
    early_school_7_8: "concrete",
    mid_school_9_10: "transitional",
    preteen_11_12: "formal",
  };
  const levels: CognitiveLevel[] = ["preoperational", "concrete", "transitional", "formal"];
  const diff = levels.indexOf(observed) - levels.indexOf(expected[ageGroup]);
  return diff * 0.1; // +/- 0.1 per level difference
}
