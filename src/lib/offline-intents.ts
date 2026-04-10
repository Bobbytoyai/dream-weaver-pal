/**
 * Intent detection, safety filter, and text normalization for offline engine.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INPUT NORMALIZATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function normalizeInput(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[!?.…,;:"""«»()[\]{}]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SYNONYM MAP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SYNONYMS: Record<string, string[]> = {
  jouer: ["joue", "jouons", "jeu", "amuser", "amusons", "s'amuser"],
  histoire: ["conte", "récit", "fable", "narration", "raconte", "raconter"],
  peur: ["effrayé", "terrifié", "angoissé", "anxieux", "inquiet"],
  triste: ["malheureux", "pas bien", "mal", "déprimé", "chagrin"],
  content: ["heureux", "joyeux", "ravi", "super", "génial", "bien"],
  fatigué: ["crevé", "épuisé", "sommeil", "dormir", "dodo"],
  aide: ["aider", "aidez", "aide-moi", "au secours", "help"],
  arrêter: ["stop", "arrête", "fini", "terminé", "assez"],
  continuer: ["continue", "encore", "suite", "reprends", "reprendre"],
  bonjour: ["salut", "coucou", "hello", "hey", "yo", "bonsoir"],
  merci: ["remercie", "merci beaucoup", "thanks"],
  oui: ["ouais", "ok", "d'accord", "yep", "yes", "bien sûr", "évidemment"],
  non: ["nan", "nope", "jamais", "pas du tout"],
  vite: ["rapide", "rapidement", "vitement", "accélère"],
  lent: ["doucement", "lentement", "calme", "calmement"],
};

export function expandWithSynonyms(word: string): string[] {
  const results: string[] = [word];
  for (const [key, syns] of Object.entries(SYNONYMS)) {
    if (key === word || syns.includes(word)) {
      results.push(key);
      syns.forEach(s => results.push(s));
    }
  }
  return results.filter((v, i, a) => a.indexOf(v) === i);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FUZZY SIMILARITY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function levenshtein(a: string, b: string): number {
  const la = a.length, lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;
  const dp: number[][] = Array.from({ length: la + 1 }, (_, i) =>
    Array.from({ length: lb + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= la; i++)
    for (let j = 1; j <= lb; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[la][lb];
}

export function similarity(a: string, b: string): number {
  const na = normalizeInput(a);
  const nb = normalizeInput(b);
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(na, nb) / maxLen;
}

export function wordOverlap(input: string, target: string): number {
  const inputWords = normalizeInput(input).split(/\s+/).filter(w => w.length > 1);
  const targetWords = normalizeInput(target).split(/\s+/).filter(w => w.length > 1);
  if (targetWords.length === 0) return 0;
  let matched = 0;
  for (const tw of targetWords) {
    const twExpanded = expandWithSynonyms(tw);
    for (const iw of inputWords) {
      const iwExpanded = expandWithSynonyms(iw);
      const hasMatch = twExpanded.some(t => iwExpanded.some(i =>
        t === i || (t.length > 3 && i.startsWith(t)) || (i.length > 3 && t.startsWith(i))
      ));
      if (hasMatch) { matched++; break; }
    }
  }
  return matched / targetWords.length;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SAFETY FILTER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const BLOCKED_PATTERNS = [
  /\b(mourir|mort|tuer|sang|arme|fusil|couteau|drogue|alcool|sexe|nu[de]?|suicide)\b/i,
  /\b(gros mot|insulte|merde|putain|connard|con|salope|enculé|nique)\b/i,
  /\b(frapper|battre|violence|blesser|détruire)\b/i,
  /\b(voleur|voler|cambriol|kidnapp)\b/i,
];

export const SAFE_REDIRECTS = [
  "Je ne peux pas répondre à ça, mais on peut jouer 😊",
  "On peut parler d'autre chose !",
  "Hmm, parlons d'autre chose ! Tu veux une histoire ?",
  "C'est un sujet pour les grands. On joue ensemble ? 😊",
];

export function isBlockedContent(text: string): boolean {
  return BLOCKED_PATTERNS.some(p => p.test(text.toLowerCase()));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTENT TYPES & DETECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type OfflineIntent =
  | "GREETING"
  | "STORY_REQUEST"
  | "PLAY_REQUEST"
  | "QUESTION"
  | "QUESTION_SIMPLE"
  | "EMOTION_POSITIVE"
  | "EMOTION_NEGATIVE"
  | "FAREWELL"
  | "IDENTITY"
  | "COMPLIMENT"
  | "CALM_REQUEST"
  | "HUMOR"
  | "ADVENTURE"
  | "HELP"
  | "CONTROL"
  | "EDUCATION"
  | "BLOCKED"
  | "UNKNOWN";

interface IntentRule {
  intent: OfflineIntent;
  patterns: RegExp[];
}

const INTENT_RULES: IntentRule[] = [
  {
    intent: "GREETING",
    patterns: [
      /^(salut|bonjour|coucou|hello|hey|yo|hé)\s*$/i,
      /^(ça va|comment vas|comment tu vas|tu vas bien)\s*$/i,
      /^(quoi de neuf|quoi de beau)\s*$/i,
    ],
  },
  {
    intent: "FAREWELL",
    patterns: [
      /^(au revoir|bye|bonne nuit|à demain|salut|ciao|tchao|à plus)\s*$/i,
      /\b(je (m'en )?vais|je pars|je dois y aller)\b/i,
    ],
  },
  {
    intent: "STORY_REQUEST",
    patterns: [
      /\b(raconte|histoire|conte|fable|il était une fois)\b/i,
      /\b(lis[- ]moi|lire|narr)/i,
      /\b(une histoire de|histoire avec|aventure de)\b/i,
    ],
  },
  {
    intent: "PLAY_REQUEST",
    patterns: [
      /\b(jou[eo]|on joue|devinette|quiz|charade|jeu|devine)\b/i,
      /\b(on fait un jeu|un petit jeu)\b/i,
    ],
  },
  {
    intent: "IDENTITY",
    patterns: [
      /\b(tu (es|t'appelles?) qui|c'est quoi ton (nom|prénom))\b/i,
      /\b(comment tu t'appelles|qui es[- ]tu)\b/i,
      /\b(tu (me )?connais|tu (sais|connais) mon (nom|prénom))\b/i,
    ],
  },
  {
    intent: "HELP",
    patterns: [
      /\b(aide|aider|aidez|help|au secours)\b/i,
      /\b(je (ne )?comprends? (pas|rien)|explique)\b/i,
      /\b(je suis perdu|j'ai besoin)\b/i,
    ],
  },
  {
    intent: "CONTROL",
    patterns: [
      /^(stop|arrête|continue|encore|pause|reprends?|attends?|vas-y|go|c'est parti|allez|lance|démarre)\s*$/i,
      /\b(plus vite|plus lent|doucement|change|on change|on arrête|on continue)\b/i,
    ],
  },
  {
    intent: "COMPLIMENT",
    patterns: [
      /\b(t'es (trop )?(cool|génial|gentil|marrant|drôle|super))\b/i,
      /\b(je t'aime|je t'adore|t'es le meilleur)\b/i,
      /\b(merci|tu es gentil|tu es mon ami)\b/i,
    ],
  },
  {
    intent: "QUESTION",
    patterns: [
      /^(oui|non|d'accord|ok|ouais|nan)\s*$/i,
      /\b(c'est quoi|qu'est-ce que|pourquoi|comment)\b/i,
      /\b(tu sais|tu connais|c'est vrai)\b/i,
    ],
  },
  {
    intent: "EMOTION_POSITIVE",
    patterns: [
      /\b(content|super|génial|trop bien|cool|adore|aime|heureux|yay|wow|incroyable)\b/i,
      /\b(je suis content|trop content|c'est génial)\b/i,
    ],
  },
  {
    intent: "EMOTION_NEGATIVE",
    patterns: [
      /\b(triste|pleure|peur|effrayé|cauchemar|monstre|seul|malheureux|ennui|ennuie|fâché|colère|énervé)\b/i,
      /\b(je suis triste|j'ai peur|j'ai mal|je m'ennuie)\b/i,
    ],
  },
  {
    intent: "CALM_REQUEST",
    patterns: [
      /\b(bonne nuit|dodo|dormir|fatigué|sommeil|calme|repos|nuit)\b/i,
      /\b(je suis fatigué|on dort|on se calme)\b/i,
    ],
  },
  {
    intent: "HUMOR",
    patterns: [
      /\b(blague|drôle|rigol|marrant|rire|haha|hihi)\b/i,
      /\b(fais[- ]moi rire|une blague|raconte une blague)\b/i,
    ],
  },
  {
    intent: "EDUCATION",
    patterns: [
      /\b(combien|pourquoi|c'est quoi|qu'est-ce que?|comment (?:marche|fonctionne|fait))\b/i,
      /\b(apprends|enseigne|explique|dis[- ]moi)\b.*\b(math|science|géograph|histoire|nature|animal|planète|corps|terre)\b/i,
      /\b(addition|soustraction|multiplication|division|nombre|chiffre|calculer|compter)\b/i,
      /\b(continent|océan|pays|capitale|montagne|fleuve|désert|île|volcan)\b/i,
      /\b(planète|étoile|soleil|lune|espace|gravité|atome|électricité)\b/i,
      /\b(cœur|cerveau|os|muscle|sang|poumon|respir)\b/i,
      /\b(dinosaure|fossile|mammifère|photosynthèse|recyclage)\b/i,
    ],
  },
  {
    intent: "ADVENTURE",
    patterns: [
      /\b(on explore|on voyage|aventure|découvr|explorer)\b/i,
      /\b(on part|on vole|on saute|on court|on nage)\b/i,
    ],
  },
];

export function detectOfflineIntent(text: string): OfflineIntent {
  if (isBlockedContent(text)) return "BLOCKED";
  const normalized = normalizeInput(text);
  for (const rule of INTENT_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(normalized)) return rule.intent;
    }
  }
  return "UNKNOWN";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// QA FUZZY MATCHER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { QAEntry } from "./qa-database";
import { QA_DATABASE } from "./qa-database";

const QA_MATCH_THRESHOLD = 0.60;

export function matchQA(input: string): QAEntry | null {
  const normalized = normalizeInput(input);
  let bestMatch: QAEntry | null = null;
  let bestScore = 0;

  for (const entry of QA_DATABASE) {
    for (const trigger of entry.triggers) {
      const trigNorm = normalizeInput(trigger);
      if (normalized === trigNorm || normalized.includes(trigNorm) || trigNorm.includes(normalized)) {
        return entry;
      }
      const sim = similarity(normalized, trigNorm);
      const overlap = wordOverlap(normalized, trigNorm);
      const score = Math.max(sim, overlap * 0.95);

      if (score > bestScore && score >= QA_MATCH_THRESHOLD) {
        bestScore = score;
        bestMatch = entry;
      }
    }
  }
  return bestMatch;
}
