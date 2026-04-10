/**
 * Bobby Game Engine — Mission Mémoire 🧠✨
 *
 * Jeu vocal de mémoire séquentielle 100% offline.
 * Bobby énonce une liste de mots, l'enfant doit les répéter dans l'ordre.
 * La liste grandit à chaque niveau réussi.
 *
 * Modes : mots courants · animaux · nourriture
 * Adaptatif selon l'âge, toujours encourageant, jamais frustrant.
 */

import { recordAnswer } from "./gameEngine";

// ─── Word Banks ─────────────────────────────────────────────

const WORD_BANK_MOTS: string[] = [
  "chat", "chien", "pomme", "banane", "voiture",
  "avion", "maison", "étoile", "soleil", "lune",
  "bateau", "poisson", "fleur", "ballon", "cadeau",
  "arbre", "nuage", "chapeau", "chaussure", "montagne",
  "rivière", "robot", "fusée", "dragon", "bonbon",
  "gâteau", "papillon", "guitare", "trompette", "château",
];

const WORD_BANK_ANIMAUX: string[] = [
  "chat", "chien", "lion", "tigre", "girafe",
  "éléphant", "singe", "lapin", "cheval", "panda",
  "dauphin", "tortue", "oiseau", "crocodile", "poisson",
  "renard", "loup", "ours", "serpent", "aigle",
  "requin", "grenouille", "kangourou", "pingouin", "perroquet",
];

const WORD_BANK_NOURRITURE: string[] = [
  "pomme", "banane", "chocolat", "gâteau", "pizza",
  "fromage", "tomate", "carotte", "fraise", "orange",
  "bonbon", "crêpe", "glace", "biscuit", "pain",
  "cerise", "melon", "citron", "raisin", "ananas",
];

export type MemoryGameMode = "mots" | "animaux" | "nourriture";

const WORD_BANKS: Record<MemoryGameMode, string[]> = {
  mots: WORD_BANK_MOTS,
  animaux: WORD_BANK_ANIMAUX,
  nourriture: WORD_BANK_NOURRITURE,
};

// ─── Game State ─────────────────────────────────────────────

export interface MemoryGameState {
  active: boolean;
  phase: "INTRO" | "LISTEN" | "ANSWER" | "RESULT" | "ENDED";
  level: number;
  maxLevel: number;
  sequence: string[];
  lives: number;
  maxLives: number;
  mode: MemoryGameMode;
  childAge: number;
  totalCorrect: number;
  bestLevel: number;
}

let state: MemoryGameState = makeDefaultState();

function makeDefaultState(): MemoryGameState {
  return {
    active: false,
    phase: "ENDED",
    level: 1,
    maxLevel: 10,
    sequence: [],
    lives: 3,
    maxLives: 3,
    mode: "mots",
    childAge: 7,
    totalCorrect: 0,
    bestLevel: 0,
  };
}

// ─── Helpers ────────────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[!?.…,;:"""«»()[\]{}]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Levenshtein distance for fuzzy word matching */
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

/** Match a spoken word to the closest word in the sequence (fuzzy) */
function fuzzyMatch(spoken: string, target: string): boolean {
  if (spoken === target) return true;
  if (spoken.startsWith(target) || target.startsWith(spoken)) return true;
  const dist = levenshtein(spoken, target);
  const threshold = target.length <= 4 ? 1 : 2;
  return dist <= threshold;
}

// ─── Phrase Variants ────────────────────────────────────────

const INTRO_PHRASES = [
  "Super {name} ! On va jouer à Mission Mémoire 🧠✨ Je vais dire des mots… et tu dois les répéter dans le bon ordre ! Attention… ça va devenir de plus en plus difficile 😄",
  "Génial {name} ! C'est parti pour Mission Mémoire 🧠 ! Je dis des mots, tu les répètes dans l'ordre ! Tu es prêt ? 😊",
  "Youpi {name} ! Mission Mémoire ! 🧠✨ Écoute bien les mots et répète-les dans le bon ordre ! C'est parti !",
];

const LISTEN_PHRASES = [
  "Écoute bien {name}… 👂",
  "Attention, c'est parti… 🎯",
  "Concentre-toi bien {name}… 🧠",
  "Ouvre grand tes oreilles… 👂✨",
];

const YOUR_TURN_PHRASES = [
  "À toi {name} ! Répète la liste ! 😊",
  "C'est ton tour ! Redis les mots dans l'ordre ! 🎯",
  "Go {name} ! Répète dans l'ordre ! 💪",
];

const SUCCESS_PHRASES = [
  "Bravo {name} !! 🎉 Tu as une mémoire incroyable !",
  "Génial ! Tu as tout bon {name} ! 🌟",
  "Parfait ! Quelle mémoire {name} ! 🧠✨",
  "Excellent {name} ! Tu es un champion ! 🏆",
  "Trop fort {name} ! Tu retiens tout ! 💪",
];

const LEVEL_UP_PHRASES = [
  "On passe au niveau {level} ! Ça devient plus dur 😄",
  "Niveau {level} ! Tu es prêt {name} ? 🚀",
  "Attention, niveau {level} ! Plus de mots cette fois ! 🧠",
];

const FAIL_PHRASES = [
  "Oh presque {name} ! 😊 C'est pas grave, on réessaie !",
  "Pas tout à fait ! Mais tu étais proche {name} ! 💪",
  "Hmm, c'était pas exactement ça… On recommence ensemble ! 😊",
  "Presque ! La bonne liste c'était : {sequence}. On réessaie ! 🔄",
];

const GAME_OVER_PHRASES = [
  "Oh ! Plus de vies {name} ! 😊 Mais tu as atteint le niveau {level}, c'est super ! On recommence ? 🔄",
  "Fin de la mission ! Tu es arrivé au niveau {level} {name} ! 🌟 On rejoue ? 😊",
  "Mission terminée au niveau {level} ! C'était bien joué {name} ! On retente ? 💪",
];

const MAX_LEVEL_PHRASES = [
  "WOW {name} !! 🏆🎉 Tu as terminé TOUS les niveaux ! Tu es un génie de la mémoire !",
  "INCROYABLE {name} ! 🧠✨ Niveau max atteint ! Tu as la mémoire d'un super-héros !",
  "BRAVO CHAMPION {name} ! 🏆 Mission Mémoire accomplie à 100% ! Tu es extraordinaire !",
];

const REPLAY_PHRASES = [
  "On rejoue ? 🧠",
  "Tu veux retenter ta chance ? 😊",
  "Une autre partie ? 🎮",
];

// ─── Sequence Generation ────────────────────────────────────

function generateSequence(level: number, mode: MemoryGameMode): string[] {
  const bank = WORD_BANKS[mode];
  const shuffled = shuffle(bank);
  // Pick `level` words (e.g. level 1 = 1 word, level 5 = 5 words)
  const count = Math.min(level, shuffled.length);
  return shuffled.slice(0, count);
}

function formatSequence(seq: string[]): string {
  return seq.join("… ");
}

function personalize(text: string, childName?: string): string {
  let result = text.replace(/\{name\}/g, childName || "");
  result = result.replace(/\{level\}/g, String(state.level));
  result = result.replace(/\{sequence\}/g, formatSequence(state.sequence));
  return result;
}

// ─── Public API ─────────────────────────────────────────────

export function isMemoryGameActive(): boolean {
  return state.active;
}

export function getMemoryGameState(): MemoryGameState {
  return { ...state };
}

export function startMemoryGame(childName?: string, childAge = 7, mode: MemoryGameMode = "mots"): string {
  state = {
    ...makeDefaultState(),
    active: true,
    phase: "LISTEN",
    mode,
    childAge,
    maxLives: childAge <= 6 ? 4 : 3,
    lives: childAge <= 6 ? 4 : 3,
    maxLevel: childAge <= 6 ? 7 : 10,
  };

  state.sequence = generateSequence(state.level, state.mode);

  const intro = personalize(pickRandom(INTRO_PHRASES), childName);
  const listen = personalize(pickRandom(LISTEN_PHRASES), childName);
  const words = formatSequence(state.sequence);
  const yourTurn = personalize(pickRandom(YOUR_TURN_PHRASES), childName);

  state.phase = "ANSWER";

  return `${intro}\n\n${listen}\n${words}\n\n${yourTurn}`;
}

export function stopMemoryGame(childName?: string): string {
  const level = state.level;
  state = makeDefaultState();
  return `D'accord ${childName || ""} ! Tu es arrivé au niveau ${level}, c'est bien joué ! 😊 On rejouera quand tu veux !`;
}

export function handleMemoryGameInput(text: string, childName?: string): string {
  if (!state.active) {
    return startMemoryGame(childName, state.childAge, state.mode);
  }

  const n = normalize(text);

  // ── Stop intent ──
  if (/^(stop|arrête|fini|j'arrête|on arrête|fin|assez|non merci|non)$/.test(n)) {
    return stopMemoryGame(childName);
  }

  // ── Replay intent ──
  if (state.phase === "RESULT" || state.phase === "ENDED") {
    if (/^(oui|ouais|ok|d'accord|on rejoue|encore|allez|yes|yep|une autre|on recommence|rejouer)/.test(n)) {
      state.level = 1;
      state.lives = state.maxLives;
      state.totalCorrect = 0;
      return startNewLevel(childName);
    }
    // If they say no at end
    if (/^(non|nan|nope|pas maintenant|plus tard)/.test(n)) {
      return stopMemoryGame(childName);
    }
  }

  // ── Mode switch ──
  if (/mode animaux|animaux/.test(n) && state.phase !== "ANSWER") {
    state.mode = "animaux";
    return `Mode animaux activé 🐾 ! ${startNewLevel(childName)}`;
  }
  if (/mode nourriture|nourriture/.test(n) && state.phase !== "ANSWER") {
    state.mode = "nourriture";
    return `Mode nourriture activé 🍕 ! ${startNewLevel(childName)}`;
  }
  if (/mode mots|mots/.test(n) && state.phase !== "ANSWER") {
    state.mode = "mots";
    return `Mode mots activé 📝 ! ${startNewLevel(childName)}`;
  }

  // ── Answer phase: compare child's words to the sequence ──
  if (state.phase === "ANSWER") {
    return evaluateAnswer(text, childName);
  }

  // ── Fallback ──
  return `On joue à Mission Mémoire ${childName || ""} ! 🧠 Répète les mots dans l'ordre ! 😊`;
}

// ─── Answer Evaluation ──────────────────────────────────────

function evaluateAnswer(text: string, childName?: string): string {
  const n = normalize(text);
  // Split into individual words spoken by the child
  const spokenWords = n.split(/[\s,]+/).filter(w => w.length > 1);

  const sequence = state.sequence;
  let correctCount = 0;

  // Compare word by word with fuzzy matching
  for (let i = 0; i < sequence.length; i++) {
    if (i < spokenWords.length && fuzzyMatch(spokenWords[i], sequence[i])) {
      correctCount++;
    } else {
      break; // Stop at first mismatch (order matters)
    }
  }

  const isFullyCorrect = correctCount === sequence.length && spokenWords.length >= sequence.length;

  // Also check if all words are present regardless of strict order check
  // (for kids who mix up slightly, we still count partial credit)
  const allPresent = sequence.every(word =>
    spokenWords.some(spoken => fuzzyMatch(spoken, word))
  );

  if (isFullyCorrect || (allPresent && spokenWords.length === sequence.length)) {
    // SUCCESS!
    state.totalCorrect++;
    try { recordAnswer("mission_memoire", true); } catch { /* ignore */ }

    // Check for max level
    if (state.level >= state.maxLevel) {
      state.phase = "RESULT";
      state.active = false;
      const best = personalize(pickRandom(MAX_LEVEL_PHRASES), childName);
      return best + "\n\n" + pickRandom(REPLAY_PHRASES);
    }

    // Level up
    state.level++;
    if (state.level > state.bestLevel) state.bestLevel = state.level;

    const success = personalize(pickRandom(SUCCESS_PHRASES), childName);
    const levelUp = personalize(pickRandom(LEVEL_UP_PHRASES), childName);

    // Start next level immediately
    return `${success} ${levelUp}\n\n${startNewLevel(childName)}`;
  }

  // INCORRECT
  state.lives--;
  try { recordAnswer("mission_memoire", false); } catch { /* ignore */ }

  if (state.lives <= 0) {
    // Game over
    state.phase = "RESULT";
    state.active = false;
    const gameOver = personalize(pickRandom(GAME_OVER_PHRASES), childName);
    return gameOver;
  }

  // Still has lives — retry same level
  const fail = personalize(pickRandom(FAIL_PHRASES), childName);
  const livesText = `Il te reste ${state.lives} chance${state.lives > 1 ? "s" : ""} ! ❤️`;

  // Re-generate the sequence for variety (same length)
  state.sequence = generateSequence(state.level, state.mode);
  const listen = personalize(pickRandom(LISTEN_PHRASES), childName);
  const words = formatSequence(state.sequence);
  const yourTurn = personalize(pickRandom(YOUR_TURN_PHRASES), childName);

  return `${fail}\n${livesText}\n\n${listen}\n${words}\n\n${yourTurn}`;
}

// ─── Level Management ───────────────────────────────────────

function startNewLevel(childName?: string): string {
  state.phase = "LISTEN";
  state.sequence = generateSequence(state.level, state.mode);

  const listen = personalize(pickRandom(LISTEN_PHRASES), childName);
  const words = formatSequence(state.sequence);
  const yourTurn = personalize(pickRandom(YOUR_TURN_PHRASES), childName);

  state.phase = "ANSWER";

  // Add suspense for higher levels
  let suspense = "";
  if (state.level >= 5) {
    suspense = "Attention, ça devient sérieux ! 😄 ";
  } else if (state.level >= 8) {
    suspense = "Wow, niveau expert ! 🔥 ";
  }

  return `${suspense}${listen}\n${words}\n\n${yourTurn}`;
}

// ─── Trigger Detection ──────────────────────────────────────

export function isMemoryGameTrigger(text: string): boolean {
  const n = normalize(text);
  return /mission m[eé]moire|jeu (de )?m[eé]moire|jouer.*m[eé]moire|r[eé]p[eé]te.*mots|memory game/.test(n);
}
