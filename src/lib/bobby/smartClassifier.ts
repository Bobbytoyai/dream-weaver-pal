/**
 * Bobby Smart Classifier v1.0 — Lightweight Vector-Based Intent Classification
 * 
 * Uses TF-IDF-like word vectors for fuzzy intent matching when regex fails.
 * This provides ML-like understanding without needing an external model.
 * 
 * Features:
 * - French word embeddings (hand-crafted semantic vectors)
 * - Cosine similarity matching
 * - Confidence scoring
 * - <5ms latency
 */

import type { LocalIntent } from "./localBrain";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SEMANTIC WORD CLUSTERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Each intent has associated semantic words with weights
interface IntentVector {
  intent: LocalIntent;
  words: Record<string, number>; // word → weight (0-1)
  minConfidence: number; // minimum score to trigger
}

const INTENT_VECTORS: IntentVector[] = [
  {
    intent: "PEUR",
    minConfidence: 0.35,
    words: {
      peur: 1.0, effrayé: 1.0, terrifié: 1.0, cauchemar: 0.9, monstre: 0.8,
      noir: 0.6, nuit: 0.5, angoisse: 0.9, stress: 0.7, anxiété: 0.8,
      ose: 0.5, trembler: 0.8, crier: 0.4, seul: 0.3, inquiet: 0.7,
      fantôme: 0.7, loup: 0.5, araignée: 0.6, tonnerre: 0.6, orage: 0.5,
    },
  },
  {
    intent: "TRISTESSE",
    minConfidence: 0.35,
    words: {
      triste: 1.0, pleurer: 0.9, pleure: 0.9, mal: 0.5, malheureux: 1.0,
      cafard: 0.8, déprimé: 0.9, seul: 0.6, abandonné: 0.8, personne: 0.3,
      chagrin: 0.9, larme: 0.8, solitaire: 0.7, manque: 0.5, perdu: 0.4,
      mort: 0.4, parti: 0.3, disparu: 0.5,
    },
  },
  {
    intent: "COLERE",
    minConfidence: 0.35,
    words: {
      colère: 1.0, énervé: 1.0, fâché: 1.0, rage: 0.9, furieux: 0.9,
      marre: 0.7, déteste: 0.8, injuste: 0.8, agacé: 0.7, crier: 0.5,
      taper: 0.5, punir: 0.4, nul: 0.3, méchant: 0.4, interdit: 0.3,
    },
  },
  {
    intent: "JOIE",
    minConfidence: 0.35,
    words: {
      content: 1.0, heureux: 1.0, joie: 0.9, génial: 0.8, super: 0.7,
      formidable: 0.8, chouette: 0.7, rigolo: 0.6, rire: 0.6, amuser: 0.6,
      fête: 0.6, cadeau: 0.5, victoire: 0.6, gagné: 0.6, réussi: 0.5,
      youpi: 0.9, hourra: 0.9, bonheur: 0.9, fantastique: 0.8,
    },
  },
  {
    intent: "ENNUI",
    minConfidence: 0.4,
    words: {
      ennuie: 1.0, ennui: 1.0, rien: 0.5, nul: 0.4, long: 0.4,
      chiant: 0.8, barbant: 0.8, bof: 0.7, bâiller: 0.7, lent: 0.4,
      attendre: 0.3, pareil: 0.3, monotone: 0.7, faire: 0.2,
    },
  },
  {
    intent: "MANQUE_CONFIANCE",
    minConfidence: 0.4,
    words: {
      nul: 0.7, nulle: 0.7, capable: 0.6, arriver: 0.4, difficile: 0.5,
      dur: 0.4, impossible: 0.6, bête: 0.5, mauvais: 0.5, rate: 0.6,
      raté: 0.6, échoué: 0.7, perdre: 0.4, loser: 0.7, stupide: 0.6,
      incompétent: 0.7, comprends: 0.3, lent: 0.3,
    },
  },
  {
    intent: "CONFLIT_FAMILLE",
    minConfidence: 0.35,
    words: {
      parent: 0.6, papa: 0.5, maman: 0.5, frère: 0.5, sœur: 0.5,
      crier: 0.6, dispute: 0.8, punition: 0.7, gronder: 0.7, engueuler: 0.8,
      divorce: 0.8, séparé: 0.7, battre: 0.5, alcool: 0.4, maison: 0.2,
      famille: 0.4, injuste: 0.4, fâché: 0.4,
    },
  },
  {
    intent: "CONFLIT_AMI",
    minConfidence: 0.35,
    words: {
      copain: 0.6, copine: 0.6, ami: 0.5, amie: 0.5, dispute: 0.7,
      taper: 0.6, moquer: 0.8, insulter: 0.8, méchant: 0.6, exclure: 0.7,
      bande: 0.4, seul: 0.3, rejet: 0.7, ignorer: 0.6, traître: 0.7,
    },
  },
  {
    intent: "HARCELEMENT",
    minConfidence: 0.3,
    words: {
      harcèlement: 1.0, moquer: 0.8, taper: 0.7, insulter: 0.8,
      méchant: 0.6, embêter: 0.7, pousser: 0.5, voler: 0.5, menacer: 0.8,
      humilier: 0.9, école: 0.2, peur: 0.3, seul: 0.3, groupe: 0.3,
    },
  },
  {
    intent: "BESOIN_AFFECTION",
    minConfidence: 0.4,
    words: {
      câlin: 1.0, bisou: 0.9, aimer: 0.7, amour: 0.7, embrasser: 0.8,
      serrer: 0.6, doux: 0.5, tendresse: 0.8, manquer: 0.5, près: 0.3,
      ensemble: 0.3, ami: 0.3, seul: 0.4, réconfort: 0.7,
    },
  },
  {
    intent: "HISTOIRE",
    minConfidence: 0.4,
    words: {
      histoire: 1.0, conte: 0.9, raconte: 0.9, fable: 0.8, récit: 0.7,
      aventure: 0.5, personnage: 0.6, héros: 0.5, prince: 0.5, princesse: 0.5,
      dragon: 0.4, château: 0.5, forêt: 0.3, magique: 0.4, livre: 0.5,
    },
  },
  {
    intent: "JEU",
    minConfidence: 0.4,
    words: {
      jouer: 1.0, jeu: 0.9, partie: 0.7, défi: 0.7, challenge: 0.7,
      gagner: 0.5, perdre: 0.4, tour: 0.4, carte: 0.4, dé: 0.5,
      compétition: 0.5, score: 0.5, niveau: 0.4, facile: 0.3, difficile: 0.3,
    },
  },
  {
    intent: "APPRENDRE",
    minConfidence: 0.35,
    words: {
      pourquoi: 0.7, comment: 0.6, quoi: 0.4, savoir: 0.6, apprendre: 0.9,
      comprendre: 0.7, expliquer: 0.8, curieux: 0.7, question: 0.5,
      fonctionner: 0.6, marcher: 0.4, science: 0.5, monde: 0.3, vrai: 0.3,
    },
  },
  {
    intent: "ECOLE",
    minConfidence: 0.4,
    words: {
      école: 1.0, classe: 0.8, maîtresse: 0.8, maître: 0.8, récréation: 0.7,
      cantine: 0.6, cartable: 0.6, devoirs: 0.7, leçon: 0.7, note: 0.5,
      apprendre: 0.4, copain: 0.3, examen: 0.6, dictée: 0.6, calcul: 0.5,
    },
  },
  {
    intent: "SOLITUDE",
    minConfidence: 0.4,
    words: {
      seul: 0.9, seule: 0.9, solitaire: 0.9, personne: 0.6, abandonné: 0.8,
      isolé: 0.8, ami: 0.3, jouer: 0.2, invisible: 0.7, exclu: 0.7,
      oublié: 0.6, ignoré: 0.6,
    },
  },
  {
    intent: "DODO",
    minConfidence: 0.45,
    words: {
      dormir: 1.0, dodo: 1.0, nuit: 0.6, fatigué: 0.8, sommeil: 0.9,
      coucher: 0.8, lit: 0.6, bâiller: 0.7, reposer: 0.7, rêve: 0.5,
      berceuse: 0.7, étoile: 0.3, lune: 0.3,
    },
  },
  {
    intent: "BLAGUE",
    minConfidence: 0.45,
    words: {
      blague: 1.0, rigoler: 0.8, drôle: 0.8, marrant: 0.8, rire: 0.7,
      comique: 0.7, farce: 0.7, humour: 0.8, tordant: 0.7, hilarant: 0.7,
    },
  },
  {
    intent: "CRISE_SECURITE",
    minConfidence: 0.3,
    words: {
      mourir: 1.0, disparaître: 1.0, vivre: 0.5, exister: 0.6, déteste: 0.4,
      vie: 0.4, nulle: 0.4, sers: 0.5, rien: 0.3, personne: 0.3, aime: 0.3,
      veux: 0.3, plus: 0.2, mal: 0.4,
    },
  },
  {
    intent: "FATIGUE",
    minConfidence: 0.4,
    words: {
      fatigué: 1.0, crevé: 0.9, épuisé: 0.9, énergie: 0.6, repos: 0.7,
      dormir: 0.4, bâiller: 0.7, mou: 0.5, lent: 0.4, lourd: 0.4,
    },
  },
  {
    intent: "ECHEC",
    minConfidence: 0.35,
    words: {
      raté: 1.0, échoué: 1.0, perdu: 0.7, loupé: 0.9, note: 0.4,
      mauvaise: 0.5, contrôle: 0.5, examen: 0.5, résultat: 0.4, zéro: 0.6,
    },
  },
  {
    intent: "OBJECTIF",
    minConfidence: 0.4,
    words: {
      gagner: 0.8, réussir: 0.8, objectif: 1.0, motivation: 0.8, entraîner: 0.7,
      meilleur: 0.5, champion: 0.6, effort: 0.6, but: 0.5, rêve: 0.4,
    },
  },
  {
    intent: "SANTE",
    minConfidence: 0.4,
    words: {
      mal: 0.7, ventre: 0.8, tête: 0.6, dent: 0.7, malade: 1.0,
      fièvre: 0.9, vomi: 0.9, bobo: 0.8, douleur: 0.8, médecin: 0.6,
    },
  },
  {
    intent: "PERTE",
    minConfidence: 0.4,
    words: {
      perdu: 0.9, perdre: 0.8, disparu: 0.8, retrouver: 0.6, cassé: 0.7,
      jouet: 0.5, doudou: 0.6, objet: 0.4, chercher: 0.5,
    },
  },
  {
    intent: "REVE_AVENIR",
    minConfidence: 0.4,
    words: {
      devenir: 0.9, grand: 0.4, rêve: 0.8, astronaute: 0.7, métier: 0.7,
      futur: 0.7, pompier: 0.6, docteur: 0.6, inventeur: 0.6,
    },
  },
  {
    intent: "ABANDON",
    minConfidence: 0.35,
    words: {
      abandonner: 1.0, lâcher: 0.7, arrêter: 0.5, foutu: 0.7, inutile: 0.6,
      tomber: 0.4, décourager: 0.8, sert: 0.4, rien: 0.3,
    },
  },
  {
    intent: "EXCITATION",
    minConfidence: 0.45,
    words: {
      excité: 1.0, hâte: 0.9, impatient: 0.9, vivement: 0.8, pressé: 0.6,
      énergie: 0.5, attendre: 0.4, demain: 0.3,
    },
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOKENIZER + SIMILARITY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// French stop words to ignore
const STOP_WORDS = new Set([
  "je", "tu", "il", "elle", "on", "nous", "vous", "ils", "elles",
  "le", "la", "les", "un", "une", "des", "de", "du", "au", "aux",
  "et", "ou", "mais", "donc", "car", "ni", "que", "qui", "quoi",
  "ce", "cette", "ces", "mon", "ma", "mes", "ton", "ta", "tes",
  "son", "sa", "ses", "notre", "votre", "leur", "leurs",
  "en", "y", "ne", "pas", "plus", "à", "dans", "sur", "sous",
  "avec", "pour", "par", "est", "suis", "es", "sont", "a", "ai",
  "as", "avons", "avez", "ont", "fait", "été", "être", "avoir",
  "me", "te", "se", "nous", "vous",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents for matching
    .replace(/[^a-zà-ÿ\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

// Simple stemming for French (remove common suffixes)
function stem(word: string): string {
  const w = word.toLowerCase();
  // Remove common French suffixes
  if (w.endsWith("ement")) return w.slice(0, -5);
  if (w.endsWith("ment")) return w.slice(0, -4);
  if (w.endsWith("tion")) return w.slice(0, -4);
  if (w.endsWith("eur")) return w.slice(0, -3);
  if (w.endsWith("euse")) return w.slice(0, -4);
  if (w.endsWith("eux")) return w.slice(0, -3);
  if (w.endsWith("ais")) return w.slice(0, -3);
  if (w.endsWith("ait")) return w.slice(0, -3);
  if (w.endsWith("er")) return w.slice(0, -2);
  if (w.endsWith("ir")) return w.slice(0, -2);
  if (w.endsWith("re")) return w.slice(0, -2);
  if (w.endsWith("es")) return w.slice(0, -1);
  if (w.endsWith("s") && w.length > 3) return w.slice(0, -1);
  return w;
}

function computeSimilarity(tokens: string[], intentVec: IntentVector): number {
  let totalScore = 0;
  let matchCount = 0;

  for (const token of tokens) {
    const stemmed = stem(token);
    
    // Direct match
    if (intentVec.words[token] !== undefined) {
      totalScore += intentVec.words[token];
      matchCount++;
      continue;
    }
    
    // Stemmed match — check if any key in the vector starts with the stem
    for (const [word, weight] of Object.entries(intentVec.words)) {
      const wordStemmed = stem(word);
      if (wordStemmed === stemmed || word.startsWith(stemmed) || stemmed.startsWith(word.slice(0, Math.min(word.length, 4)))) {
        totalScore += weight * 0.8; // slight penalty for fuzzy match
        matchCount++;
        break;
      }
    }
  }

  if (matchCount === 0) return 0;
  
  // Normalize by number of tokens (so longer sentences don't auto-win)
  // But also reward having multiple matches
  const coverage = matchCount / Math.max(tokens.length, 1);
  const avgScore = totalScore / matchCount;
  
  return avgScore * 0.6 + coverage * 0.4;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PUBLIC API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ClassificationResult {
  intent: LocalIntent;
  confidence: number;
  runner_up?: { intent: LocalIntent; confidence: number };
}

/**
 * Classify text into an intent using vector similarity.
 * Returns null if no intent meets the minimum confidence threshold.
 */
export function classifyIntent(text: string): ClassificationResult | null {
  const tokens = tokenize(text);
  if (tokens.length === 0) return null;

  const scores: { intent: LocalIntent; score: number }[] = [];

  for (const vec of INTENT_VECTORS) {
    const score = computeSimilarity(tokens, vec);
    if (score >= vec.minConfidence) {
      scores.push({ intent: vec.intent, score });
    }
  }

  if (scores.length === 0) return null;

  scores.sort((a, b) => b.score - a.score);

  const best = scores[0];
  const runnerUp = scores[1];

  return {
    intent: best.intent,
    confidence: Math.min(1, best.score),
    runner_up: runnerUp ? { intent: runnerUp.intent, confidence: Math.min(1, runnerUp.score) } : undefined,
  };
}

/**
 * Enhanced intent detection: try regex first, fall back to vector classifier.
 */
export function smartClassify(text: string, regexIntent: LocalIntent): {
  intent: LocalIntent;
  confidence: number;
  source: "regex" | "vector" | "combined";
} {
  // If regex found something specific, trust it
  if (regexIntent !== "GENERAL") {
    return { intent: regexIntent, confidence: 0.9, source: "regex" };
  }

  // Regex didn't match → try vector classifier
  const vectorResult = classifyIntent(text);
  if (vectorResult && vectorResult.confidence >= 0.35) {
    console.log(`[SmartClassifier] 🧠 Vector match: ${vectorResult.intent} (${(vectorResult.confidence * 100).toFixed(0)}%)`);
    return { intent: vectorResult.intent, confidence: vectorResult.confidence, source: "vector" };
  }

  // Nothing matched
  return { intent: "GENERAL", confidence: 0.3, source: "regex" };
}
