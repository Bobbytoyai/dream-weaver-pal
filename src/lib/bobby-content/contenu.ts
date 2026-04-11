/**
 * Bobby AI — Catégories de contenu + Analyse système parental v1.0
 * Définit toutes les catégories de contenu, les règles parentales,
 * les niveaux de filtrage et les sujets par tranche d'âge.
 */

// ─── CATÉGORIES DE CONTENU ──────────────────────────────────
export interface ContentCategory {
  id: string;
  nom: string;
  description: string;
  ageMin: number;
  ageMax: number;
  tags: string[];
  parentalRating: "tout_public" | "parental_guidance" | "parental_control";
  enabled: boolean;
}

export const CONTENU_CATEGORIES: ContentCategory[] = [
  {
    id: "histoires",
    nom: "Histoires",
    description: "Contes, aventures, histoires du soir adaptées à l'âge",
    ageMin: 3, ageMax: 12,
    tags: ["conte", "aventure", "imaginaire", "dodo"],
    parentalRating: "tout_public",
    enabled: true,
  },
  {
    id: "blagues",
    nom: "Blagues & Humour",
    description: "Blagues adaptées, jeux de mots, charades",
    ageMin: 5, ageMax: 12,
    tags: ["humour", "rire", "jeux de mots"],
    parentalRating: "tout_public",
    enabled: true,
  },
  {
    id: "science",
    nom: "Science & Découvertes",
    description: "Faits scientifiques, expériences, curiosités nature",
    ageMin: 6, ageMax: 12,
    tags: ["science", "nature", "expérience", "espace"],
    parentalRating: "tout_public",
    enabled: true,
  },
  {
    id: "education",
    nom: "Éducation",
    description: "Maths, lecture, géographie, langues",
    ageMin: 5, ageMax: 12,
    tags: ["maths", "lecture", "géographie", "langue"],
    parentalRating: "tout_public",
    enabled: true,
  },
  {
    id: "emotions",
    nom: "Émotions & Bien-être",
    description: "Gestion des émotions, confiance en soi, méditation",
    ageMin: 3, ageMax: 12,
    tags: ["émotions", "bien-être", "confiance", "méditation"],
    parentalRating: "tout_public",
    enabled: true,
  },
  {
    id: "jeux",
    nom: "Jeux & Activités",
    description: "Devinettes, quiz, jeux de mémoire, défis",
    ageMin: 4, ageMax: 12,
    tags: ["jeu", "quiz", "défi", "mémoire"],
    parentalRating: "tout_public",
    enabled: true,
  },
];

// ─── SYSTÈME PARENTAL ───────────────────────────────────────
export interface ParentalProfile {
  childName: string;
  childAge: number;
  allowedCategories: string[];
  blockedTopics: string[];
  maxSessionMinutes: number;
  nightModeStart: string; // "HH:MM"
  nightModeEnd: string;
  contentFilter: "standard" | "strict" | "educational_only";
  voicePersonality: "balanced" | "calm" | "energetic" | "educational";
  progressionEnabled: boolean;
}

export const DEFAULT_PARENTAL_PROFILE: Omit<ParentalProfile, "childName" | "childAge"> = {
  allowedCategories: ["histoires", "blagues", "science", "education", "emotions", "jeux"],
  blockedTopics: [],
  maxSessionMinutes: 30,
  nightModeStart: "20:00",
  nightModeEnd: "07:00",
  contentFilter: "standard",
  voicePersonality: "balanced",
  progressionEnabled: true,
};

// ─── RÈGLES PAR ÂGE ─────────────────────────────────────────
export interface AgeRules {
  maxResponseLength: number; // characters
  allowComplexVocab: boolean;
  allowAbstractConcepts: boolean;
  allowCompetition: boolean;
  humorStyle: "simple" | "wordplay" | "absurd" | "all";
  preferredThemes: string[];
}

export const AGE_RULES: Record<string, AgeRules> = {
  "3-5": {
    maxResponseLength: 80,
    allowComplexVocab: false,
    allowAbstractConcepts: false,
    allowCompetition: false,
    humorStyle: "simple",
    preferredThemes: ["animaux", "magie", "dodo", "famille"],
  },
  "6-8": {
    maxResponseLength: 150,
    allowComplexVocab: false,
    allowAbstractConcepts: false,
    allowCompetition: true,
    humorStyle: "wordplay",
    preferredThemes: ["aventure", "espace", "animaux", "science", "magie"],
  },
  "9-10": {
    maxResponseLength: 200,
    allowComplexVocab: true,
    allowAbstractConcepts: false,
    allowCompetition: true,
    humorStyle: "absurd",
    preferredThemes: ["science", "espace", "aventure", "histoire", "technologie"],
  },
  "11-12": {
    maxResponseLength: 250,
    allowComplexVocab: true,
    allowAbstractConcepts: true,
    allowCompetition: true,
    humorStyle: "all",
    preferredThemes: ["technologie", "science", "philosophie", "sport", "musique"],
  },
};

export function getAgeRules(age: number): AgeRules {
  if (age <= 5) return AGE_RULES["3-5"];
  if (age <= 8) return AGE_RULES["6-8"];
  if (age <= 10) return AGE_RULES["9-10"];
  return AGE_RULES["11-12"];
}
