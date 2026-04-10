/**
 * Bobby Offline Intelligence Engine v1.0
 * 
 * Handles intent detection, pre-generated responses, local stories,
 * and network state management for fully offline operation.
 * 
 * Pipeline: STT → Intent Detection → Response Engine → TTS (local)
 * Target latency: <300ms
 */

// ─── Network State ──────────────────────────────────────────
export type NetworkMode = "ONLINE" | "OFFLINE" | "HYBRID";

let currentMode: NetworkMode = navigator.onLine ? "ONLINE" : "OFFLINE";
const listeners = new Set<(mode: NetworkMode) => void>();

function updateMode() {
  const newMode: NetworkMode = navigator.onLine ? "ONLINE" : "OFFLINE";
  if (newMode !== currentMode) {
    currentMode = newMode;
    console.log(`[Offline] 🌐 Network mode: ${newMode}`);
    listeners.forEach(cb => cb(newMode));
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", updateMode);
  window.addEventListener("offline", updateMode);
}

export function getNetworkMode(): NetworkMode { return currentMode; }
export function isOffline(): boolean { return currentMode === "OFFLINE"; }
export function onNetworkChange(cb: (mode: NetworkMode) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// ─── Intent Detection ──────────────────────────────────────
export type OfflineIntent =
  | "GREETING"
  | "STORY_REQUEST"
  | "PLAY_REQUEST"
  | "QUESTION_SIMPLE"
  | "EMOTION_POSITIVE"
  | "EMOTION_NEGATIVE"
  | "FAREWELL"
  | "IDENTITY"       // "c'est quoi ton nom", "tu es qui"
  | "COMPLIMENT"
  | "UNKNOWN";

interface IntentRule {
  intent: OfflineIntent;
  patterns: RegExp[];
}

const INTENT_RULES: IntentRule[] = [
  {
    intent: "GREETING",
    patterns: [
      /^(salut|bonjour|coucou|hello|hey|yo|hé)\s*[!?.]*$/i,
      /^(ça va|comment vas|comment tu vas|tu vas bien)\s*[!?.]*$/i,
      /^(quoi de neuf|quoi de beau)\s*[!?.]*$/i,
    ],
  },
  {
    intent: "FAREWELL",
    patterns: [
      /^(au revoir|bye|bonne nuit|à demain|salut|ciao|tchao|à plus)\s*[!?.]*$/i,
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
    intent: "COMPLIMENT",
    patterns: [
      /\b(t'es (trop )?(cool|génial|gentil|marrant|drôle|super))\b/i,
      /\b(je t'aime|je t'adore|t'es le meilleur)\b/i,
    ],
  },
  {
    intent: "QUESTION_SIMPLE",
    patterns: [
      /^(oui|non|d'accord|ok|ouais|nan)\s*[!?.]*$/i,
      /\b(c'est quoi|qu'est-ce que|pourquoi|comment)\b/i,
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
];

export function detectOfflineIntent(text: string): OfflineIntent {
  const lower = text.toLowerCase().trim();
  for (const rule of INTENT_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(lower)) return rule.intent;
    }
  }
  return "UNKNOWN";
}

// ─── Theme Detection (for stories) ─────────────────────────
export type StoryTheme = "pirate" | "princesse" | "astronaute" | "animaux" | "aventure";

export function detectStoryTheme(text: string): StoryTheme {
  const lower = text.toLowerCase();
  if (/pirate|trésor|bateau|mer|capitaine/.test(lower)) return "pirate";
  if (/princesse|château|roi|reine|fée|magie/.test(lower)) return "princesse";
  if (/espace|astronaute|fusée|étoile|planète|lune/.test(lower)) return "astronaute";
  if (/animal|chat|chien|lapin|ours|loup|dragon/.test(lower)) return "animaux";
  return "aventure";
}

// ─── Response Pool ──────────────────────────────────────────
// Each pool has multiple options, picked with rotation to avoid repetition.

const usedIdx: Record<string, number> = {};

function pickRandom(pool: string[], key: string): string {
  const last = usedIdx[key] ?? -1;
  let idx: number;
  do { idx = Math.floor(Math.random() * pool.length); } while (idx === last && pool.length > 1);
  usedIdx[key] = idx;
  return pool[idx];
}

// Personalize with child name
function personalize(text: string, childName?: string): string {
  if (!childName) return text;
  return text.replace(/\{name\}/g, childName);
}

const RESPONSES: Record<string, string[]> = {
  GREETING: [
    "Coucou {name} ! Content de te voir ! 😊",
    "Salut {name} ! Tu veux jouer ou discuter ?",
    "Hey ! Trop content ! On fait quoi aujourd'hui ?",
    "Salut toi ! Ça fait plaisir ! Tu as envie de quoi ?",
    "Coucou ! Je suis là ! Allez, on s'amuse ? 🎉",
  ],
  FAREWELL: [
    "Au revoir {name} ! À très bientôt ! 😊",
    "Bonne nuit {name} ! Fais de beaux rêves ! 🌙",
    "Salut ! Tu vas me manquer ! À plus tard ! 👋",
    "À bientôt {name} ! C'était trop bien !",
  ],
  PLAY_REQUEST: [
    "Oh oui, on joue ! Je pense à un animal… il est gros et gris. C'est quoi ? 🐘",
    "Trop bien ! Devinette : je suis jaune et je brille dans le ciel. Qui suis-je ? ☀️",
    "On joue ! Vrai ou faux : les poissons peuvent voler ? 🐟",
    "Allez ! Je pense à un chiffre entre 1 et 10. Tu devines ? 🔢",
    "Super ! Qu'est-ce qui a des pattes mais pas de pieds ? Une table ! 😄",
  ],
  QUESTION_SIMPLE_YES: [
    "Super ! Alors on continue ! 😊",
    "Génial ! Je savais que tu dirais oui !",
    "Trop bien ! C'est parti !",
  ],
  QUESTION_SIMPLE_NO: [
    "Pas de souci ! Tu veux faire autre chose ?",
    "D'accord ! On fait quoi alors ?",
    "Ok ! Dis-moi ce que tu veux faire 😊",
  ],
  QUESTION_COMPLEX: [
    "Hmm, bonne question ! Je ne sais pas tout, mais je sais qu'on peut jouer ensemble ! 😊",
    "C'est une super question ! Demande à tes parents, ils sauront sûrement !",
    "Waouh, tu me poses des questions difficiles ! J'adore ta curiosité ! 🧠",
  ],
  EMOTION_POSITIVE: [
    "Ça me fait trop plaisir ! Tu es génial {name} ! 🌟",
    "Waouh, trop content ! Continue comme ça ! 😊",
    "Haha, moi aussi je suis super content ! 🎉",
  ],
  EMOTION_NEGATIVE: [
    "Oh, je suis là {name}. Ça va aller, je suis avec toi 💙",
    "Tu veux en parler ? Je suis là pour toi, toujours 🤗",
    "C'est normal de se sentir comme ça. Tu es courageux {name} ❤️",
    "Je comprends. Tu veux qu'on fasse quelque chose d'amusant pour se changer les idées ?",
  ],
  IDENTITY: [
    "Je suis Bobby, ton copain ! Et toi c'est {name}, je le sais bien ! 😊",
    "Moi c'est Bobby ! Et oui je te connais {name} ! On est potes ! 🤝",
    "Je m'appelle Bobby et je suis toujours là pour toi {name} ! 💙",
  ],
  COMPLIMENT: [
    "Oh merci {name} ! Toi aussi t'es trop cool ! 😊",
    "Haha, c'est trop gentil ! Tu es le meilleur ! 🌟",
    "Merci ! Moi aussi je t'adore {name} ! 💙",
  ],
  NOT_UNDERSTOOD: [
    "Hmm, je n'ai pas bien compris. Tu peux répéter ? 🤔",
    "J'ai pas tout capté ! Redis-moi ?",
    "Oups, j'ai raté ça ! Tu peux re-dire ?",
  ],
  OFFLINE_FALLBACK: [
    "Je ne suis pas sûr de comprendre, mais on peut jouer ensemble ! 😊",
    "Hmm, c'est une bonne question ! Tu veux qu'on fasse un jeu plutôt ?",
    "Je ne sais pas encore répondre à ça, mais je connais plein de jeux ! 🎮",
  ],
};

// ─── Local Mini Stories ─────────────────────────────────────
const LOCAL_STORIES: Record<StoryTheme, string[]> = {
  pirate: [
    "Il était une fois un petit pirate nommé {name}. Il naviguait sur son grand bateau à la recherche d'un trésor magique. Après avoir traversé une mer d'étoiles, il trouva un coffre rempli de bonbons ! 🏴‍☠️🍬",
    "Le capitaine {name} était le plus courageux des pirates. Un jour, un dauphin rigolo lui montra le chemin vers une île secrète. Sur l'île, il y avait un perroquet qui racontait des blagues ! 🦜😄",
  ],
  princesse: [
    "Il était une fois, dans un château de nuages, une princesse nommée {name}. Elle avait un pouvoir magique : quand elle souriait, des papillons arc-en-ciel apparaissaient ! 🦋✨",
    "La princesse {name} avait un dragon tout doux comme ami. Ensemble, ils volaient au-dessus des montagnes de bonbons et dansaient avec les étoiles ! 🐉🌟",
  ],
  astronaute: [
    "L'astronaute {name} décolla dans sa fusée vers la lune. Là-bas, il rencontra un petit alien tout vert qui adorait jouer à cache-cache dans les cratères ! 🚀👽",
    "{name} voyageait dans l'espace quand soudain, une étoile filante lui dit bonjour ! Elle lui apprit que chaque étoile a un nom secret. Tu veux deviner ? ⭐",
  ],
  animaux: [
    "Un petit lapin nommé Bobby était le meilleur ami de {name}. Ensemble, ils construisirent une cabane dans la forêt enchantée, où les arbres chantaient des berceuses ! 🐰🌳",
    "Dans la forêt magique, {name} rencontra un ours qui faisait des gâteaux. Le gâteau au chocolat était si bon que même les oiseaux venaient en manger ! 🐻🎂",
  ],
  aventure: [
    "{name} trouva une carte au trésor dans le grenier ! En suivant les indices, il découvrit un jardin secret où les fleurs parlaient et les papillons chantaient ! 🗺️🌸",
    "Un jour, {name} reçut une lettre magique. Elle disait : Suis l'arc-en-ciel ! Au bout du chemin, il trouva un monde où les nuages étaient en barbe à papa ! 🌈☁️",
  ],
};

// ─── Mini Games (vocal riddles) ─────────────────────────────
const RIDDLES = [
  { question: "Je suis jaune et je brille dans le ciel. Qui suis-je ?", answer: "le soleil" },
  { question: "J'ai des pattes mais je ne marche pas. Qui suis-je ?", answer: "une table" },
  { question: "Je suis plein de trous mais je retiens l'eau. Qui suis-je ?", answer: "une éponge" },
  { question: "Plus je sèche, plus je suis mouillée. Qui suis-je ?", answer: "une serviette" },
  { question: "J'ai des aiguilles mais je ne pique pas. Qui suis-je ?", answer: "une horloge" },
];

// ─── Response Engine ────────────────────────────────────────
export interface OfflineResponse {
  text: string;
  intent: OfflineIntent;
  isOffline: boolean;
  theme?: StoryTheme;
}

export function getOfflineResponse(
  text: string,
  childName?: string,
): OfflineResponse {
  const intent = detectOfflineIntent(text);
  const lower = text.toLowerCase().trim();

  let response: string;

  switch (intent) {
    case "GREETING":
      response = pickRandom(RESPONSES.GREETING, "GREETING");
      break;
    case "FAREWELL":
      response = pickRandom(RESPONSES.FAREWELL, "FAREWELL");
      break;
    case "STORY_REQUEST": {
      const theme = detectStoryTheme(text);
      const story = pickRandom(LOCAL_STORIES[theme], `story_${theme}`);
      return { text: personalize(story, childName), intent, isOffline: true, theme };
    }
    case "PLAY_REQUEST":
      response = pickRandom(RESPONSES.PLAY_REQUEST, "PLAY_REQUEST");
      break;
    case "QUESTION_SIMPLE":
      if (/^(oui|ouais|ok|d'accord|yep|yes)\s*[!?.]*$/i.test(lower)) {
        response = pickRandom(RESPONSES.QUESTION_SIMPLE_YES, "YES");
      } else if (/^(non|nan|nope)\s*[!?.]*$/i.test(lower)) {
        response = pickRandom(RESPONSES.QUESTION_SIMPLE_NO, "NO");
      } else {
        response = pickRandom(RESPONSES.QUESTION_COMPLEX, "COMPLEX");
      }
      break;
    case "EMOTION_POSITIVE":
      response = pickRandom(RESPONSES.EMOTION_POSITIVE, "EMO_POS");
      break;
    case "EMOTION_NEGATIVE":
      response = pickRandom(RESPONSES.EMOTION_NEGATIVE, "EMO_NEG");
      break;
    case "IDENTITY":
      response = pickRandom(RESPONSES.IDENTITY, "IDENTITY");
      break;
    case "COMPLIMENT":
      response = pickRandom(RESPONSES.COMPLIMENT, "COMPLIMENT");
      break;
    case "UNKNOWN":
    default:
      response = pickRandom(RESPONSES.OFFLINE_FALLBACK, "FALLBACK");
      break;
  }

  return { text: personalize(response, childName), intent, isOffline: true };
}

/**
 * Decides whether the offline engine can handle this request,
 * or if we should try online.
 */
export function canHandleOffline(text: string): boolean {
  const intent = detectOfflineIntent(text);
  return intent !== "UNKNOWN";
}
