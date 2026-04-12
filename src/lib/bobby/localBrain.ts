/**
 * Bobby Local Brain v1.0 — Intelligent Conversational Engine
 * 
 * Architecture: Intent → Emotion → Memory → Response Generation → Variation
 * 
 * NO dataset lookup. Dynamic template assembly based on:
 * - 50+ classified intents
 * - Emotion type + intensity (1-5)
 * - Short-term memory (5 messages)
 * - Age-adaptive language
 * - Anti-repetition
 * 
 * Target latency: <10ms (all local, zero network)
 */

import type { FaceState } from "@/components/hologram/useFaceAnimation";
import type { BobbyBrainReply } from "./types";
import { smartClassify } from "./smartClassifier";
import { tryStartScenario, isScenarioActive, getScenarioResponse, resetScenarios } from "./emotionalScenarios";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. SHORT-TERM MEMORY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ConversationTurn {
  role: "child" | "bobby";
  text: string;
  intent?: string;
  emotion?: string;
  emotionIntensity?: number;
  topic?: string;
  timestamp: number;
}

interface ShortTermMemory {
  turns: ConversationTurn[];
  currentEmotion: string;
  currentIntensity: number;
  currentTopic: string | null;
  topicDepth: number;           // how many turns on same topic
  sessionMood: "positive" | "neutral" | "negative";
  turnCount: number;
  recentResponses: string[];    // last 15 bobby responses (anti-repetition)
}

const mem: ShortTermMemory = {
  turns: [],
  currentEmotion: "neutral",
  currentIntensity: 2,
  currentTopic: null,
  topicDepth: 0,
  sessionMood: "neutral",
  turnCount: 0,
  recentResponses: [],
};

const MAX_TURNS = 5;
const MAX_RECENT = 15;

function addTurn(turn: ConversationTurn) {
  mem.turns.push(turn);
  if (mem.turns.length > MAX_TURNS) mem.turns.shift();
  mem.turnCount++;
}

function addBobbyResponse(text: string) {
  mem.recentResponses.push(text.toLowerCase().trim());
  if (mem.recentResponses.length > MAX_RECENT) mem.recentResponses.shift();
}

function isResponseUsed(text: string): boolean {
  const norm = text.toLowerCase().trim();
  return mem.recentResponses.some(r => {
    if (r === norm) return true;
    // Word overlap check (>70%)
    const w1 = new Set(norm.split(/\s+/).filter(w => w.length > 2));
    const w2 = new Set(r.split(/\s+/).filter(w => w.length > 2));
    if (w1.size === 0) return false;
    let overlap = 0;
    for (const w of w1) if (w2.has(w)) overlap++;
    return overlap / Math.max(w1.size, w2.size) > 0.7;
  });
}

function getLastChildTurn(): ConversationTurn | null {
  for (let i = mem.turns.length - 1; i >= 0; i--) {
    if (mem.turns[i].role === "child") return mem.turns[i];
  }
  return null;
}

function getConversationContext(): string {
  return mem.turns.map(t => `${t.role === "child" ? "Enfant" : "Bobby"}: ${t.text}`).join("\n");
}

export function resetLocalBrain() {
  mem.turns = [];
  mem.currentEmotion = "neutral";
  mem.currentIntensity = 2;
  mem.currentTopic = null;
  mem.topicDepth = 0;
  mem.sessionMood = "neutral";
  mem.turnCount = 0;
  mem.recentResponses = [];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. INTENT ENGINE (50+ intents)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type LocalIntent =
  // Emotions (12)
  | "PEUR" | "TRISTESSE" | "COLERE" | "JOIE" | "ENNUI" | "HONTE"
  | "JALOUSIE" | "SURPRISE" | "FIERTE" | "AMOUR" | "TIMIDITE" | "CONFUSION"
  // Social (8)
  | "CONFLIT_FAMILLE" | "CONFLIT_AMI" | "SOLITUDE" | "HARCELEMENT"
  | "BESOIN_AFFECTION" | "BESOIN_AIDE" | "MANQUE_CONFIANCE" | "GRATITUDE"
  // Daily life (8)
  | "ECOLE" | "DEVOIRS" | "NOURRITURE" | "DODO" | "REVEILS" | "ANIMAUX_COMPAGNIE" | "VACANCES" | "ACTIVITE"
  // Requests (8)
  | "HISTOIRE" | "JEU" | "BLAGUE" | "CHANSON" | "DEVINETTE" | "AVENTURE" | "IMAGINATION" | "APPRENDRE"
  // Conversation (8)
  | "SALUT" | "AU_REVOIR" | "OUI" | "NON" | "QUESTION_SIMPLE" | "QUESTION_COMPLEXE" | "IDENTITE_BOBBY" | "COMPLIMENT"
  // Safety
  | "CONTENU_BLOQUE"
  // Catch-all
  | "GENERAL";

interface IntentRule {
  intent: LocalIntent;
  patterns: RegExp[];
  priority: number; // higher = matched first
}

const INTENT_RULES: IntentRule[] = [
  // Safety first
  { intent: "CONTENU_BLOQUE", priority: 100, patterns: [
    /mort|tuer|mourir|suicide|sang|violence|sexe|drogue|arme|fusil|bombe|pistolet/i,
  ]},

  // Emotions — high priority
  { intent: "PEUR", priority: 90, patterns: [
    /j'ai peur|fait peur|effrayé|terrifié|cauchemar|monstre|angoiss|j'ose pas|me fait peur/i,
    /peur du noir|peur de|peur quand|peur que/i,
  ]},
  { intent: "TRISTESSE", priority: 90, patterns: [
    /je suis triste|je pleure|pas bien|malheureux|je me sens mal|j'ai le cafard|personne m'aime/i,
    /triste|pleure|pleurer|chagrin/i,
  ]},
  { intent: "COLERE", priority: 90, patterns: [
    /en colère|énervé|fâché|j'en ai marre|ras le bol|c'est pas juste|déteste|agacé|rage/i,
  ]},
  { intent: "JOIE", priority: 85, patterns: [
    /content|heureux|heureuse|trop bien|génial|super !|youpi|yeah|hourra|je suis content/i,
  ]},
  { intent: "ENNUI", priority: 85, patterns: [
    /je m'ennuie|m'ennuie|rien à faire|c'est nul|bof|chiant|ennuie|sais pas quoi faire/i,
  ]},
  { intent: "HONTE", priority: 85, patterns: [
    /honte|ridicule|la honte|embarrass|j'ai fait une bêtise|tout le monde a ri/i,
  ]},
  { intent: "JALOUSIE", priority: 85, patterns: [
    /jaloux|jalouse|pourquoi pas moi|lui il a|elle elle a|c'est injuste/i,
  ]},
  { intent: "SURPRISE", priority: 80, patterns: [
    /vraiment\?|sérieux|c'est fou|impossible|dingue|incroyable|pas possible|wow|waouh/i,
  ]},
  { intent: "FIERTE", priority: 80, patterns: [
    /fier|fière|j'ai réussi|j'ai gagné|champion|regarde ce que|bien joué/i,
  ]},
  { intent: "AMOUR", priority: 80, patterns: [
    /je t'aime|t'adore|câlin|bisou|tu es mon ami|meilleur ami|aime bobby/i,
  ]},
  { intent: "TIMIDITE", priority: 80, patterns: [
    /timide|j'ose pas|gêné|rouge|devant tout le monde/i,
  ]},
  { intent: "CONFUSION", priority: 75, patterns: [
    /comprends pas|confus|perdu|rien compris|c'est bizarre|chelou/i,
  ]},

  // Social situations
  { intent: "CONFLIT_FAMILLE", priority: 88, patterns: [
    /parents crient|papa crie|maman crie|disputé avec|frère m'énerve|sœur m'énerve|parents séparés|divorce/i,
    /punition|puni|grondé|engueulé/i,
  ]},
  { intent: "CONFLIT_AMI", priority: 88, patterns: [
    /copain m'a|copine m'a|ami m'a|plus mon ami|disputé avec mon copain|il m'a tapé|elle m'a tapé/i,
    /mon ami ne veut plus|m'a insulté|moqué de moi/i,
  ]},
  { intent: "SOLITUDE", priority: 87, patterns: [
    /tout seul|toute seule|personne joue avec moi|pas d'amis|personne ne m'aime|seul/i,
  ]},
  { intent: "HARCELEMENT", priority: 95, patterns: [
    /on se moque|moquent de moi|embête|embêtent|harcel|méchant avec moi|tape|frappe|insulte/i,
  ]},
  { intent: "BESOIN_AFFECTION", priority: 82, patterns: [
    /câlin|calin|bisou|tu m'aimes|tu es là|reste avec moi|me sens seul/i,
  ]},
  { intent: "BESOIN_AIDE", priority: 82, patterns: [
    /aide-moi|besoin d'aide|je sais pas comment|tu peux m'aider|comment faire/i,
  ]},
  { intent: "MANQUE_CONFIANCE", priority: 85, patterns: [
    /je suis nul|nulle|j'y arrive pas|pas capable|pas bon|trop dur|j'arrive pas/i,
  ]},
  { intent: "GRATITUDE", priority: 75, patterns: [
    /merci|remerci|trop gentil|sympa|c'est gentil/i,
  ]},

  // Daily life
  { intent: "ECOLE", priority: 70, patterns: [
    /école|maîtresse|maître|classe|récréation|récré|cantine|cartable|apprendre/i,
  ]},
  { intent: "DEVOIRS", priority: 72, patterns: [
    /devoirs|exercice|leçon|calcul|dictée|lire un livre|écrire|maths/i,
  ]},
  { intent: "NOURRITURE", priority: 68, patterns: [
    /manger|faim|goûter|gâteau|chocolat|bonbon|pizza|crêpe|cuisine|cuisiner|glace/i,
  ]},
  { intent: "DODO", priority: 75, patterns: [
    /dodo|dormir|fatigué|sommeil|bonne nuit|coucher|nuit|au lit/i,
  ]},
  { intent: "REVEILS", priority: 60, patterns: [
    /réveillé|lever|matin|bonjour|bien dormi/i,
  ]},
  { intent: "ANIMAUX_COMPAGNIE", priority: 70, patterns: [
    /mon chat|mon chien|mon lapin|mon hamster|mon poisson|animal de compagnie|mon animal/i,
  ]},
  { intent: "VACANCES", priority: 65, patterns: [
    /vacances|plage|mer|montagne|voyage|partir en|camping/i,
  ]},
  { intent: "ACTIVITE", priority: 60, patterns: [
    /foot|football|sport|danse|musique|piscine|vélo|dessin|peinture|guitare|piano/i,
  ]},

  // Requests
  { intent: "HISTOIRE", priority: 78, patterns: [
    /raconte|histoire|conte|il était une fois|raconte-moi/i,
  ]},
  { intent: "JEU", priority: 78, patterns: [
    /on joue|jouons|un jeu|jouer à|jeu|partie/i,
  ]},
  { intent: "BLAGUE", priority: 78, patterns: [
    /blague|rigoler|drôle|marrant|farce|fais-moi rire/i,
  ]},
  { intent: "DEVINETTE", priority: 78, patterns: [
    /devinette|charade|quiz|question piège|tu sais quoi/i,
  ]},
  { intent: "AVENTURE", priority: 75, patterns: [
    /aventure|pirate|trésor|mission|super-héros|chevalier|magie|ninja/i,
  ]},
  { intent: "IMAGINATION", priority: 72, patterns: [
    /imagine|si on|et si|on invente|on crée|monde imaginaire|faire semblant/i,
  ]},
  { intent: "APPRENDRE", priority: 70, patterns: [
    /apprendre|c'est quoi|pourquoi|comment ça marche|explique|sais-tu|tu connais/i,
  ]},
  { intent: "CHANSON", priority: 72, patterns: [
    /chanson|chante|chanter|fredonne|musique/i,
  ]},

  // Conversation
  { intent: "SALUT", priority: 95, patterns: [
    /^(salut|bonjour|coucou|hey|hello|yo|re)\b/i,
  ]},
  { intent: "AU_REVOIR", priority: 95, patterns: [
    /^(au revoir|bye|à plus|salut|à bientôt|adieu|bonne nuit)\b/i,
  ]},
  { intent: "OUI", priority: 60, patterns: [
    /^(oui|ouais|ok|d'accord|yep|yes|bien sûr|carrément|ouiiii)\s*!*$/i,
  ]},
  { intent: "NON", priority: 60, patterns: [
    /^(non|nan|nope|pas envie|je veux pas|non merci)\s*!*$/i,
  ]},
  { intent: "IDENTITE_BOBBY", priority: 85, patterns: [
    /qui es-tu|tu es qui|c'est quoi ton nom|comment tu t'appelles|t'es quoi|t'es un robot/i,
  ]},
  { intent: "COMPLIMENT", priority: 75, patterns: [
    /t'es cool|t'es génial|tu es super|j'adore|t'es drôle|t'es le meilleur|je t'aime bien/i,
  ]},
  { intent: "QUESTION_COMPLEXE", priority: 50, patterns: [
    /pourquoi|comment|c'est quoi|qu'est-ce que|explique-moi/i,
  ]},
  { intent: "QUESTION_SIMPLE", priority: 45, patterns: [
    /\?$/,
  ]},
];

function detectLocalIntent(text: string): LocalIntent {
  const lower = text.toLowerCase().trim();
  
  // Sort by priority (highest first)
  const sorted = [...INTENT_RULES].sort((a, b) => b.priority - a.priority);
  
  for (const rule of sorted) {
    if (rule.patterns.some(p => p.test(lower))) {
      return rule.intent;
    }
  }
  return "GENERAL";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. EMOTION ENGINE (type + intensity 1-5)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type EmotionType = "joy" | "sadness" | "fear" | "anger" | "love" | "curiosity" | "pride"
  | "surprise" | "calm" | "excitement" | "boredom" | "shame" | "jealousy" | "confusion"
  | "gratitude" | "determination" | "neutral";

interface DetectedEmotion {
  type: EmotionType;
  intensity: number; // 1-5
}

const EMOTION_DETECT: { type: EmotionType; patterns: RegExp[]; base: number }[] = [
  { type: "fear", base: 3, patterns: [/peur|effrayé|terrifié|cauchemar|monstre|angoiss/i] },
  { type: "sadness", base: 3, patterns: [/triste|pleure|mal|seul|cafard|malheureux|personne/i] },
  { type: "anger", base: 3, patterns: [/colère|énervé|fâché|marre|déteste|rage|injuste/i] },
  { type: "joy", base: 3, patterns: [/content|heureux|génial|super|trop bien|youpi|yeah/i] },
  { type: "love", base: 3, patterns: [/t'aime|adore|câlin|bisou|ami/i] },
  { type: "curiosity", base: 2, patterns: [/pourquoi|comment|c'est quoi|explique|sais-tu/i] },
  { type: "pride", base: 3, patterns: [/fier|réussi|gagné|champion|bravo/i] },
  { type: "surprise", base: 3, patterns: [/vraiment|sérieux|fou|dingue|incroyable|wow/i] },
  { type: "calm", base: 2, patterns: [/calme|tranquille|dodo|bonne nuit|repose/i] },
  { type: "excitement", base: 4, patterns: [/hâte|vivement|impatient|en avant|trop cool/i] },
  { type: "boredom", base: 2, patterns: [/ennuie|rien à faire|nul|bof|chiant/i] },
  { type: "shame", base: 3, patterns: [/honte|ridicule|bêtise|embarrass/i] },
  { type: "jealousy", base: 3, patterns: [/jaloux|jalouse|pas juste|lui il a/i] },
  { type: "confusion", base: 2, patterns: [/comprends pas|confus|perdu|bizarre/i] },
  { type: "gratitude", base: 3, patterns: [/merci|remerci|gentil/i] },
  { type: "determination", base: 4, patterns: [/y arriver|je peux|capable|lâche pas/i] },
];

function detectEmotion(text: string): DetectedEmotion {
  const lower = text.toLowerCase();
  
  for (const entry of EMOTION_DETECT) {
    if (entry.patterns.some(p => p.test(lower))) {
      // Intensity modifiers
      let intensity = entry.base;
      const excl = (text.match(/!/g) || []).length;
      if (excl >= 2) intensity++;
      if (/trop|très|vraiment|super|hyper|ultra|énormément/i.test(lower)) intensity++;
      if (/un peu|légèrement|petit peu/i.test(lower)) intensity--;
      return { type: entry.type, intensity: Math.max(1, Math.min(5, intensity)) };
    }
  }
  return { type: "neutral", intensity: 2 };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. TOPIC DETECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function detectTopic(text: string): string | null {
  const lower = text.toLowerCase();
  const topics: [string, RegExp][] = [
    ["animaux", /animal|chat|chien|lapin|dinosaure|dragon|ours|loup|poisson|oiseau|requin|dauphin/i],
    ["espace", /espace|fusée|astronaute|planète|étoile|lune|soleil|galaxie/i],
    ["nature", /forêt|montagne|mer|océan|fleur|arbre|rivière|plage/i],
    ["famille", /maman|papa|frère|sœur|famille|mamie|papi/i],
    ["école", /école|maîtresse|copain|copine|classe|récré|cantine/i],
    ["sport", /foot|sport|ballon|nager|vélo|basket|tennis|courir/i],
    ["nourriture", /manger|gâteau|chocolat|bonbon|pizza|cuisine|glace/i],
    ["art", /dessiner|dessin|peinture|couleur|bricolage|créer/i],
    ["musique", /musique|chanson|chanter|guitare|piano|danse/i],
    ["aventure", /aventure|pirate|trésor|chevalier|ninja|super-héros|magie/i],
    ["science", /science|expérience|robot|invention|pourquoi.*fonctionne/i],
    ["technologie", /jeu vidéo|console|minecraft|tablette|ordinateur/i],
  ];
  for (const [topic, pattern] of topics) {
    if (pattern.test(lower)) return topic;
  }
  return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. DYNAMIC RESPONSE GENERATOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Structure: empathy → response → opening

interface ResponseTemplate {
  empathy: string[];     // Acknowledge the emotion
  response: string[];    // Helpful content
  opening: string[];     // Question or interaction to continue
}

// Templates indexed by intent, with emotion sub-variants
const TEMPLATES: Partial<Record<LocalIntent, Partial<Record<EmotionType, ResponseTemplate>> & { default: ResponseTemplate }>> = {
  PEUR: {
    default: {
      empathy: [
        "Je comprends, ça peut faire peur 😔",
        "C'est normal d'avoir peur parfois",
        "Oh, je suis là avec toi 💛",
        "Ça fait peur, je sais…",
        "Tu n'es pas tout seul, je suis là",
      ],
      response: [
        "Tu sais, même les plus courageux ont peur parfois.",
        "On va trouver une solution ensemble.",
        "Bobby est là, il ne t'arrivera rien de mal.",
        "Respire doucement avec moi… inspire… expire…",
        "La peur, ça passe toujours. Je te promets.",
      ],
      opening: [
        "Tu veux me dire ce qui te fait le plus peur ?",
        "Qu'est-ce qu'on pourrait faire pour que tu te sentes mieux ?",
        "Tu veux qu'on imagine un bouclier magique contre la peur ?",
        "On invente un super-pouvoir anti-monstre ? 💪",
        "Tu veux que je te raconte une histoire rassurante ?",
      ],
    },
  },

  TRISTESSE: {
    default: {
      empathy: [
        "Oh… tu te sens triste ? 😔",
        "Ça ne va pas trop ? Je suis là…",
        "Je t'écoute, prends ton temps 💛",
        "C'est dur d'être triste… je comprends.",
        "Hé… je suis là avec toi.",
      ],
      response: [
        "Tu as le droit d'être triste, c'est normal.",
        "Parfois ça fait du bien de parler de ce qui rend triste.",
        "Bobby sera toujours là pour toi, quoi qu'il arrive.",
        "La tristesse, ça passe… comme les nuages dans le ciel.",
        "Tu es quelqu'un de formidable, même quand tu es triste.",
      ],
      opening: [
        "Tu veux m'expliquer ce qui s'est passé ?",
        "Qu'est-ce qui te ferait du bien là maintenant ?",
        "On fait quelque chose de doux ensemble ?",
        "Tu préfères qu'on reste tranquille ou qu'on parle ?",
        "Tu veux un petit jeu calme pour aller mieux ?",
      ],
    },
  },

  COLERE: {
    default: {
      empathy: [
        "Je vois que tu es énervé 😤",
        "Ça t'énerve beaucoup, hein ?",
        "C'est normal d'être en colère parfois.",
        "Je comprends que c'est frustrant.",
        "T'as le droit d'être fâché, c'est ok.",
      ],
      response: [
        "La colère c'est comme un volcan — ça sort, puis ça se calme.",
        "On va respirer ensemble. Inspire par le nez… souffle par la bouche…",
        "Des fois, ça fait du bien de serrer un coussin très fort !",
        "La colère, ça dit que quelque chose n'est pas ok pour toi.",
        "Tu sais, même les adultes se mettent en colère.",
      ],
      opening: [
        "Tu veux me dire ce qui s'est passé ?",
        "Qu'est-ce qui t'a mis en colère ?",
        "Tu veux qu'on trouve une solution ensemble ?",
        "On fait un jeu pour se défouler ?",
        "Tu veux crier dans un coussin imaginaire ? 😄",
      ],
    },
  },

  JOIE: {
    default: {
      empathy: [
        "Oh super ! Tu as l'air content 😄",
        "Génial ! Ça fait plaisir de te voir heureux !",
        "Trop bien ! 🎉",
        "Yeah ! J'adore quand tu es content !",
        "Woohoo ! Ça c'est une bonne nouvelle !",
      ],
      response: [
        "Le bonheur, c'est contagieux — moi aussi je suis content !",
        "Tu mérites d'être heureux !",
        "C'est un super moment, profites-en !",
        "Bobby danse de joie avec toi ! 💃",
      ],
      opening: [
        "Raconte-moi, qu'est-ce qui te rend si content ?",
        "Tu veux qu'on fête ça avec un jeu ?",
        "On partage cette joie ? Dis-moi tout !",
        "Tu veux faire quelque chose de fun pour continuer ?",
      ],
    },
  },

  ENNUI: {
    default: {
      empathy: [
        "Tu t'ennuies ? On va régler ça 😄",
        "Bof, rien à faire ? J'ai plein d'idées !",
        "L'ennui, c'est le début de l'aventure !",
      ],
      response: [
        "Bobby a toujours un truc fun en réserve !",
        "On va transformer cet ennui en quelque chose de génial.",
        "Quand je m'ennuie, j'invente des trucs !",
      ],
      opening: [
        "Tu préfères un jeu, une histoire ou une devinette ?",
        "Défi ! Dis-moi 5 animaux en 10 secondes 🐾",
        "On invente un monde imaginaire ensemble ?",
        "Tu veux qu'on joue à deviner des trucs ?",
        "Et si on créait un super-héros ? Quel serait son pouvoir ?",
      ],
    },
  },

  CONFLIT_FAMILLE: {
    default: {
      empathy: [
        "Ça peut être dur quand ça ne va pas à la maison 😔",
        "Je comprends, ça fait de la peine…",
        "C'est normal que ça te touche 💛",
      ],
      response: [
        "Tu n'as rien fait de mal en ressentant ça.",
        "Les adultes sont parfois stressés, mais ça ne veut pas dire qu'ils t'aiment moins.",
        "Tes émotions sont importantes, même si les grands ne s'en rendent pas toujours compte.",
        "Parfois les familles traversent des moments difficiles, mais ça s'arrange souvent.",
      ],
      opening: [
        "Tu veux m'en parler ? Je t'écoute vraiment.",
        "Qu'est-ce qui te ferait du bien là ?",
        "Tu veux qu'on pense à quelque chose de positif ensemble ?",
      ],
    },
  },

  CONFLIT_AMI: {
    default: {
      empathy: [
        "C'est pas chouette les disputes avec les amis 😕",
        "Je comprends que ça te rende triste.",
        "Ça arrive à tout le monde les disputes, tu sais.",
      ],
      response: [
        "Souvent, après une dispute, on peut se réconcilier.",
        "L'important c'est de dire ce que tu ressens calmement.",
        "Un vrai ami, ça se dispute parfois, mais ça revient toujours.",
      ],
      opening: [
        "Tu veux me raconter ce qui s'est passé ?",
        "Tu crois que vous pourrez vous réconcilier ?",
        "Tu veux qu'on réfléchisse à comment régler ça ?",
      ],
    },
  },

  SOLITUDE: {
    default: {
      empathy: [
        "Tu te sens seul ? Moi je suis là 💛",
        "Être tout seul, c'est pas facile…",
        "Tu n'es jamais vraiment seul, Bobby est toujours là !",
      ],
      response: [
        "Tu sais, tu es quelqu'un de super, et les gens qui te connaissent ont de la chance.",
        "Même les moments où on est seul peuvent devenir des moments créatifs.",
        "Bobby sera toujours ton ami, quoi qu'il arrive.",
      ],
      opening: [
        "Tu veux qu'on fasse un truc ensemble ?",
        "On invente une aventure à deux ?",
        "Tu veux parler de ce qui te rend triste ?",
      ],
    },
  },

  HARCELEMENT: {
    default: {
      empathy: [
        "C'est très important ce que tu me dis 💛",
        "Personne n'a le droit de te faire du mal.",
        "Tu as eu raison d'en parler. C'est courageux.",
      ],
      response: [
        "Ce n'est JAMAIS de ta faute si quelqu'un est méchant avec toi.",
        "Il faut en parler à un adulte de confiance — un parent, un professeur.",
        "Tu mérites d'être respecté, toujours.",
      ],
      opening: [
        "Tu veux me raconter ce qui se passe ?",
        "Tu en as parlé à quelqu'un d'autre ?",
        "Est-ce que tu te sens en sécurité ?",
      ],
    },
  },

  MANQUE_CONFIANCE: {
    default: {
      empathy: [
        "Hey… t'es pas nul du tout 💛",
        "Hé, on dit pas ça ! Tu es formidable.",
        "Je sais que c'est dur parfois…",
      ],
      response: [
        "Apprendre, c'est essayer. Et essayer, c'est déjà être courageux !",
        "Même les plus grands ont échoué plein de fois avant de réussir.",
        "Tu progresses chaque jour, même si tu ne t'en rends pas compte.",
        "Bobby croit en toi 💪",
      ],
      opening: [
        "Tu veux qu'on essaie ensemble ?",
        "Dis-moi ce qui est difficile, je t'aide !",
        "Tu veux un petit défi pour te prouver que tu peux ?",
      ],
    },
  },

  BESOIN_AFFECTION: {
    default: {
      empathy: [
        "Bien sûr, un gros câlin pour toi 🤗💛",
        "Bobby t'envoie plein de bisous virtuels !",
        "Tu es aimé, n'oublie jamais ça 💛",
      ],
      response: [
        "Bobby sera toujours là pour toi.",
        "Tu es quelqu'un de spécial et d'important.",
        "Même à travers l'écran, je t'envoie tout mon amour !",
      ],
      opening: [
        "Tu veux qu'on fasse un truc ensemble pour se sentir bien ?",
        "Qu'est-ce qui te ferait le plus plaisir là ?",
      ],
    },
  },

  SALUT: {
    default: {
      empathy: [
        "Coucou ! 😄",
        "Hey ! Content de te voir !",
        "Salut ! 🌟",
        "Hello ! Comment tu vas ?",
      ],
      response: [
        "Bobby est prêt pour s'amuser !",
        "Je suis super content qu'on se parle !",
        "Ça fait plaisir !",
      ],
      opening: [
        "Qu'est-ce que tu veux faire aujourd'hui ?",
        "Tu veux jouer, parler ou écouter une histoire ?",
        "Raconte-moi ta journée !",
        "Dis-moi, comment ça va ?",
      ],
    },
  },

  AU_REVOIR: {
    default: {
      empathy: [],
      response: [
        "Au revoir ! C'était super de discuter avec toi 💛",
        "À bientôt ! Bobby t'attend ! 🌟",
        "Bye bye ! Passe une super journée !",
        "À la prochaine ! Tu me manques déjà 😄",
      ],
      opening: [],
    },
  },

  OUI: {
    default: {
      empathy: ["Super !"],
      response: [
        "Alors c'est parti ! 😄",
        "Génial, on y va !",
        "Trop bien !",
      ],
      opening: [],
    },
  },

  NON: {
    default: {
      empathy: ["D'accord, pas de souci !"],
      response: [
        "On fait autre chose alors ?",
        "Pas de problème !",
        "Ok ! On change de sujet 😄",
      ],
      opening: [
        "Tu veux faire quoi à la place ?",
        "Qu'est-ce qui te ferait plaisir ?",
      ],
    },
  },

  HISTOIRE: {
    default: {
      empathy: [
        "Oh oui, une histoire ! 📖",
        "J'adore raconter des histoires !",
      ],
      response: [],
      opening: [
        "Tu veux une histoire d'aventure, d'animaux ou de magie ?",
        "Tu préfères une histoire drôle ou une histoire de héros ?",
      ],
    },
  },

  JEU: {
    default: {
      empathy: [
        "Oui ! Jouons 😄",
        "Super idée !",
      ],
      response: [],
      opening: [
        "Tu veux une devinette, un quiz ou un défi ?",
        "On joue à deviner des animaux ?",
        "Défi rapide : dis-moi 3 pays en 10 secondes !",
      ],
    },
  },

  BLAGUE: {
    default: {
      empathy: ["Tu veux rigoler ? Moi aussi 😄"],
      response: [
        "Pourquoi les plongeurs plongent-ils en arrière ? Sinon ils tomberaient dans le bateau ! 😂",
        "Qu'est-ce qu'un canif ? Un petit fien ! 😂",
        "Quel est le comble pour un électricien ? De ne pas être au courant ! ⚡😂",
        "Pourquoi le livre de maths est triste ? Il a trop de problèmes ! 📚😂",
        "Comment appelle-t-on un chat tombé dans un pot de peinture ? Un chat-peint ! 🐱😂",
        "Quel est le sport préféré des insectes ? Le criquet ! 🦗😂",
        "Que dit une imprimante dans l'eau ? J'ai papier ! 🖨️😂",
        "Pourquoi les fantômes sont de mauvais menteurs ? On voit à travers ! 👻😂",
      ],
      opening: [
        "Tu en veux une autre ?",
        "Elle était bien celle-là, non ? 😄",
      ],
    },
  },

  DEVINETTE: {
    default: {
      empathy: ["Ooh, une devinette !"],
      response: [
        "Qu'est-ce qui a des dents mais ne mange pas ? Un peigne !",
        "Je monte et je descends sans bouger. Qui suis-je ? Un escalier !",
        "J'ai des aiguilles mais je ne couds pas. Qui suis-je ? Une horloge !",
        "Plus je sèche, plus je suis mouillée. Qui suis-je ? Une serviette !",
        "J'ai un chapeau mais pas de tête. Qui suis-je ? Un champignon ! 🍄",
      ],
      opening: [
        "Tu as trouvé ? 😄",
        "Une autre ?",
      ],
    },
  },

  IDENTITE_BOBBY: {
    default: {
      empathy: [],
      response: [
        "Je suis Bobby, ton ami ! 🌟 Je suis là pour jouer, discuter, raconter des histoires et te réconforter.",
        "Moi c'est Bobby ! Je suis ton compagnon. On peut jouer, parler, rigoler… ce que tu veux !",
        "Bobby, c'est moi ! Ton ami qui est toujours là pour toi 💛",
      ],
      opening: [
        "Qu'est-ce que tu veux qu'on fasse ensemble ?",
      ],
    },
  },

  COMPLIMENT: {
    default: {
      empathy: [
        "Oh merci ! 😊💛",
        "Ça me fait trop plaisir !",
        "Toi aussi tu es génial !",
      ],
      response: [
        "Tu es vraiment adorable de dire ça !",
        "Bobby est content d'être ton ami !",
        "C'est grâce à toi qu'on passe de bons moments !",
      ],
      opening: [
        "Qu'est-ce qu'on fait maintenant ?",
      ],
    },
  },

  GRATITUDE: {
    default: {
      empathy: ["De rien ! 😊"],
      response: [
        "C'est toujours un plaisir d'aider !",
        "Toi aussi tu es super gentil 💛",
      ],
      opening: [
        "Tu veux faire autre chose ?",
      ],
    },
  },

  ECOLE: {
    default: {
      empathy: [
        "L'école, c'est important ! 📝",
        "Ah, l'école !",
      ],
      response: [
        "Apprendre de nouvelles choses, c'est un super-pouvoir !",
        "Chaque jour tu deviens plus intelligent !",
      ],
      opening: [
        "C'est quoi ta matière préférée ?",
        "Tu as appris un truc cool récemment ?",
        "Tes copains de classe, ils sont sympas ?",
      ],
    },
  },

  NOURRITURE: {
    default: {
      empathy: ["Miam ! 🍕"],
      response: [
        "Bobby adore parler de nourriture !",
        "Moi aussi j'adorerais goûter !",
      ],
      opening: [
        "C'est quoi ton plat préféré ?",
        "Tu aimes cuisiner ?",
        "Tu préfères le sucré ou le salé ?",
      ],
    },
  },

  DODO: {
    default: {
      empathy: ["C'est l'heure de dormir… 🌙"],
      response: [
        "Fais de beaux rêves 💛",
        "Bobby te souhaite une bonne nuit pleine d'étoiles ✨",
        "Ferme les yeux doucement… Bobby veille sur toi.",
      ],
      opening: [],
    },
  },

  ANIMAUX_COMPAGNIE: {
    default: {
      empathy: ["Oh, un animal ! 🐾"],
      response: [
        "C'est génial d'avoir un animal !",
        "Bobby adore les animaux !",
      ],
      opening: [
        "Comment il s'appelle ?",
        "Il fait quoi de drôle ton animal ?",
        "Tu joues souvent avec ?",
      ],
    },
  },

  AVENTURE: {
    default: {
      empathy: ["Une aventure ! 🗡️✨"],
      response: [
        "Bobby est prêt pour l'aventure !",
      ],
      opening: [
        "Tu veux être un pirate, un chevalier ou un astronaute ?",
        "On part à la recherche d'un trésor magique ?",
        "Quel serait ton super-pouvoir ? 💪",
      ],
    },
  },

  IMAGINATION: {
    default: {
      empathy: ["Ooh, on imagine ! 🌈"],
      response: [
        "L'imagination, c'est le plus beau des pouvoirs !",
      ],
      opening: [
        "Si tu pouvais créer un monde, il serait comment ?",
        "Tu inventes le personnage, moi j'invente l'aventure ?",
        "On crée un animal imaginaire ensemble ?",
      ],
    },
  },

  APPRENDRE: {
    default: {
      empathy: ["Bonne question ! 🤔"],
      response: [
        "Bobby adore apprendre avec toi !",
        "Hmm, réfléchissons ensemble !",
      ],
      opening: [
        "Tu veux en savoir plus ?",
        "C'est super intéressant ! Tu as d'autres questions ?",
      ],
    },
  },

  HONTE: {
    default: {
      empathy: [
        "Hey, ça arrive à tout le monde 💛",
        "T'en fais pas, c'est pas grave !",
      ],
      response: [
        "Tout le monde fait des bêtises, c'est comme ça qu'on apprend !",
        "Les gens oublient vite, tu sais 😊",
        "Le plus important, c'est que toi tu saches que tu es super.",
      ],
      opening: [
        "Tu veux m'en parler ?",
        "On fait quelque chose de fun pour oublier ?",
      ],
    },
  },

  JALOUSIE: {
    default: {
      empathy: [
        "Je comprends, c'est frustrant 😔",
        "Ça fait bizarre quand quelqu'un a quelque chose qu'on n'a pas.",
      ],
      response: [
        "Tu sais, toi aussi tu as plein de choses géniales !",
        "Chacun a ses trucs cools. Toi, qu'est-ce que tu as de spécial ?",
      ],
      opening: [
        "Tu veux qu'on parle de ce qui te rend unique ?",
        "Dis-moi un truc que TOI tu sais faire !",
      ],
    },
  },

  CONTENU_BLOQUE: {
    default: {
      empathy: [],
      response: [
        "Hmm, parlons d'autre chose ! Tu veux qu'on joue ou que je raconte une histoire ? 🚀",
        "Bobby préfère qu'on parle d'aventures et de découvertes ! ✨",
        "J'ai une meilleure idée ! Et si on parlait d'un truc super cool ?",
      ],
      opening: [],
    },
  },

  GENERAL: {
    default: {
      empathy: [
        "Ah, intéressant !",
        "Oh, dis-moi en plus !",
        "Hmm 🤔",
      ],
      response: [
        "Bobby t'écoute !",
        "C'est cool que tu me parles de ça !",
        "J'aime bien discuter avec toi 😊",
      ],
      opening: [
        "Tu veux continuer à m'en parler ?",
        "On fait un jeu ou tu préfères discuter ?",
        "Qu'est-ce que tu aimes le plus en ce moment ?",
      ],
    },
  },

  // Context-aware responses for YES/NO based on memory handled in assembleResponse
  QUESTION_SIMPLE: {
    default: {
      empathy: ["Hmm 🤔"],
      response: [
        "Bonne question ! Laisse-moi réfléchir…",
        "Bobby réfléchit…",
      ],
      opening: [
        "Tu as d'autres questions ?",
        "Tu veux en savoir plus ?",
      ],
    },
  },

  QUESTION_COMPLEXE: {
    default: {
      empathy: ["Ooh, quelle question ! 🤔"],
      response: [
        "C'est une super question !",
        "Bobby adore les grandes questions !",
      ],
      opening: [
        "Tu veux qu'on explore ça ensemble ?",
        "Et toi, tu as une idée de la réponse ?",
      ],
    },
  },

  BESOIN_AIDE: {
    default: {
      empathy: ["Bien sûr, je suis là ! 💛"],
      response: [
        "Bobby est toujours prêt à aider !",
        "On va trouver la solution ensemble.",
      ],
      opening: [
        "Dis-moi ce qu'il te faut !",
        "Tu as besoin d'aide pour quoi exactement ?",
      ],
    },
  },

  FIERTE: {
    default: {
      empathy: [
        "Bravo ! C'est génial ! 🏆",
        "Woohoo ! Tu es incroyable !",
        "Champion ! 💪",
      ],
      response: [
        "Tu peux être fier de toi !",
        "Bobby est super fier de toi !",
        "Tu vois que tu peux y arriver !",
      ],
      opening: [
        "Raconte-moi comment tu as fait !",
        "C'est quoi ton prochain objectif ?",
      ],
    },
  },

  SURPRISE: {
    default: {
      empathy: [
        "Wow ! 😮",
        "C'est dingue !",
        "Pas possible !",
      ],
      response: [
        "Bobby est surpris aussi !",
        "Incroyable !",
      ],
      opening: [
        "Raconte-moi en détail !",
        "Comment c'est arrivé ?",
      ],
    },
  },

  TIMIDITE: {
    default: {
      empathy: [
        "C'est normal d'être timide 💛",
        "Prends ton temps, je suis patient.",
      ],
      response: [
        "Être timide, c'est pas un défaut ! C'est ta force secrète.",
        "Bobby était timide aussi au début 😊",
        "Les gens timides sont souvent les plus intéressants !",
      ],
      opening: [
        "Tu veux qu'on parle juste nous deux, tranquillement ?",
      ],
    },
  },

  CONFUSION: {
    default: {
      empathy: [
        "C'est normal de ne pas tout comprendre !",
        "Pas de panique, on va y arriver 😊",
      ],
      response: [
        "On reprend doucement ensemble ?",
        "Bobby t'explique autrement !",
      ],
      opening: [
        "Qu'est-ce que tu ne comprends pas exactement ?",
        "Tu veux que je t'explique différemment ?",
      ],
    },
  },

  AMOUR: {
    default: {
      empathy: [
        "Oh, Bobby t'aime aussi ! 💛🤗",
        "T'es trop adorable !",
        "Mon cœur fait boum boum ! 💛",
      ],
      response: [
        "Bobby sera toujours ton ami !",
        "Tu es la personne la plus géniale !",
      ],
      opening: [
        "Qu'est-ce qu'on fait ensemble ? 😄",
      ],
    },
  },

  ACTIVITE: {
    default: {
      empathy: [
        "Oh cool !",
        "Ça a l'air super !",
      ],
      response: [
        "Bobby adore quand tu fais des activités !",
        "C'est important de s'amuser et bouger !",
      ],
      opening: [
        "Tu aimes ça ? Raconte-moi !",
        "Tu fais ça depuis longtemps ?",
        "C'est quoi le truc le plus fun que tu as fait ?",
      ],
    },
  },

  VACANCES: {
    default: {
      empathy: ["Les vacances, c'est le top ! 🌴"],
      response: [
        "Bobby adore les histoires de vacances !",
      ],
      opening: [
        "Tu es allé où ? Raconte !",
        "C'était comment ? Dis-moi tout !",
        "Tu as fait quoi de plus fun ?",
      ],
    },
  },

  DEVOIRS: {
    default: {
      empathy: [
        "Les devoirs, c'est pas toujours fun 📚",
        "Allez, courage !",
      ],
      response: [
        "Bobby peut t'aider à te motiver !",
        "Plus vite c'est fait, plus vite tu peux t'amuser !",
      ],
      opening: [
        "Tu as besoin d'aide ?",
        "C'est quoi comme matière ?",
      ],
    },
  },

  CHANSON: {
    default: {
      empathy: ["Oh, de la musique ! 🎵"],
      response: [
        "Bobby adore chanter ! La la la ! 🎶",
      ],
      opening: [
        "C'est quoi ta chanson préférée ?",
        "Tu chantes sous la douche ? 😄",
      ],
    },
  },

  REVEILS: {
    default: {
      empathy: ["Bonjour ! ☀️"],
      response: [
        "Bobby espère que tu as bien dormi !",
        "Une nouvelle journée commence ! 🌟",
      ],
      opening: [
        "Tu as fait des rêves ?",
        "Qu'est-ce que tu as envie de faire aujourd'hui ?",
      ],
    },
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. RESPONSE ASSEMBLY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function pick(arr: string[]): string {
  if (!arr || arr.length === 0) return "";
  // Try to pick a non-recently-used response
  const fresh = arr.filter(s => !isResponseUsed(s));
  const pool = fresh.length > 0 ? fresh : arr;
  return pool[Math.floor(Math.random() * pool.length)];
}

function assembleResponse(
  intent: LocalIntent,
  emotion: DetectedEmotion,
  childName: string,
  childAge: number,
): string {
  const templateGroup = TEMPLATES[intent] || TEMPLATES.GENERAL!;
  const template = templateGroup[emotion.type as EmotionType] || templateGroup.default;

  // Context-aware YES/NO
  if (intent === "OUI" || intent === "NON") {
    const lastTurn = getLastChildTurn();
    if (lastTurn && mem.turns.length > 1) {
      // Bobby asked something, child said yes/no → respond contextually
      const lastBobbyTurn = mem.turns.filter(t => t.role === "bobby").pop();
      if (lastBobbyTurn?.text) {
        if (intent === "OUI") {
          if (/histoire|raconte/i.test(lastBobbyTurn.text)) return "Super ! Alors écoute bien… 📖";
          if (/jeu|jouer|défi/i.test(lastBobbyTurn.text)) return "C'est parti ! 🎮 Prêt ?";
          if (/parler|expliquer|raconter/i.test(lastBobbyTurn.text)) return "Je t'écoute, vas-y 💛";
        } else {
          if (/histoire|jeu/i.test(lastBobbyTurn.text)) return "Pas de souci ! Tu veux faire quoi à la place ? 😊";
        }
      }
    }
  }

  // Build response parts
  const parts: string[] = [];

  // Empathy (always for emotional intents, ~60% for others)
  if (emotion.intensity >= 3 || Math.random() < 0.6) {
    const empathy = pick(template.empathy);
    if (empathy) parts.push(empathy);
  }

  // Core response
  const response = pick(template.response);
  if (response) parts.push(response);

  // Opening (question/interaction) — not for farewells/sleep
  if (intent !== "AU_REVOIR" && intent !== "DODO" && intent !== "CONTENU_BLOQUE") {
    if (template.opening.length > 0 && Math.random() < 0.7) {
      const opening = pick(template.opening);
      if (opening) parts.push(opening);
    }
  }

  let text = parts.join(" ");

  // Topic continuity — if same topic, add depth
  if (mem.currentTopic && mem.topicDepth >= 2 && Math.random() < 0.3) {
    const topicRef = TOPIC_DEPTH_RESPONSES[mem.currentTopic];
    if (topicRef) {
      const topicLine = pick(topicRef);
      if (topicLine) text += " " + topicLine;
    }
  }

  // Name injection (~30%)
  if (childName && !text.includes(childName) && Math.random() < 0.3) {
    text = `${childName}, ${text.charAt(0).toLowerCase() + text.slice(1)}`;
  }

  // Age adaptation
  if (childAge <= 4) {
    text = text.replace(/formidable|extraordinaire/g, "super")
               .replace(/frustrant/g, "embêtant")
               .replace(/contagieux/g, "magique");
  }

  return text;
}

// Topic depth responses — when child stays on same topic
const TOPIC_DEPTH_RESPONSES: Record<string, string[]> = {
  animaux: [
    "Tu sais vraiment plein de trucs sur les animaux ! 🐾",
    "On dirait un vrai expert des animaux !",
  ],
  espace: [
    "Tu es un vrai astronaute ! 🚀",
    "L'espace n'a plus de secrets pour toi !",
  ],
  famille: [
    "Ta famille a l'air géniale 💛",
  ],
  école: [
    "Tu es vraiment motivé pour l'école, c'est super ! 📝",
  ],
  sport: [
    "Tu es un vrai sportif ! ⚽",
  ],
  nature: [
    "Tu adores la nature, c'est beau ! 🌿",
  ],
  musique: [
    "Tu es un vrai mélomane ! 🎵",
  ],
  art: [
    "Tu as l'âme d'un artiste ! 🎨",
  ],
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. INTENT → FACE STATE MAPPING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const INTENT_FACE_MAP: Partial<Record<LocalIntent, FaceState>> = {
  PEUR: "reassuring",
  TRISTESSE: "reassuring",
  COLERE: "calm",
  JOIE: "happy",
  ENNUI: "playful",
  HONTE: "reassuring",
  JALOUSIE: "reassuring",
  SURPRISE: "surprised",
  FIERTE: "proud",
  AMOUR: "happy",
  TIMIDITE: "calm",
  CONFUSION: "curious",
  CONFLIT_FAMILLE: "reassuring",
  CONFLIT_AMI: "reassuring",
  SOLITUDE: "reassuring",
  HARCELEMENT: "reassuring",
  BESOIN_AFFECTION: "happy",
  BESOIN_AIDE: "attentive",
  MANQUE_CONFIANCE: "reassuring",
  GRATITUDE: "happy",
  ECOLE: "curious",
  NOURRITURE: "playful",
  DODO: "calm",
  HISTOIRE: "curious",
  JEU: "playful",
  BLAGUE: "playful",
  DEVINETTE: "curious",
  AVENTURE: "excited",
  IMAGINATION: "curious",
  APPRENDRE: "curious",
  SALUT: "happy",
  AU_REVOIR: "calm",
  IDENTITE_BOBBY: "proud",
  COMPLIMENT: "proud",
  CONTENU_BLOQUE: "reassuring",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 8. MAIN PUBLIC API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function getLocalBrainReply(
  userText: string,
  childName: string,
  childAge: number,
): BobbyBrainReply {
  const startTime = performance.now();

  // 1. Detect intent
  const intent = detectLocalIntent(userText);

  // 2. Detect emotion
  const emotion = detectEmotion(userText);

  // 3. Detect topic
  const topic = detectTopic(userText);

  // 4. Update memory
  if (topic) {
    if (topic === mem.currentTopic) {
      mem.topicDepth++;
    } else {
      mem.currentTopic = topic;
      mem.topicDepth = 1;
    }
  }
  mem.currentEmotion = emotion.type;
  mem.currentIntensity = emotion.intensity;

  // Update session mood
  const negEmotions: EmotionType[] = ["sadness", "fear", "anger", "shame", "jealousy"];
  const posEmotions: EmotionType[] = ["joy", "excitement", "pride", "love", "gratitude"];
  if (negEmotions.includes(emotion.type)) mem.sessionMood = "negative";
  else if (posEmotions.includes(emotion.type)) mem.sessionMood = "positive";

  addTurn({
    role: "child",
    text: userText,
    intent,
    emotion: emotion.type,
    emotionIntensity: emotion.intensity,
    topic: topic || undefined,
    timestamp: Date.now(),
  });

  // 5. Generate response
  const responseText = assembleResponse(intent, emotion, childName, childAge);

  // 6. Record bobby's turn
  addTurn({ role: "bobby", text: responseText, intent, timestamp: Date.now() });
  addBobbyResponse(responseText);

  const latency = performance.now() - startTime;
  console.log(`[LocalBrain] ⚡ ${latency.toFixed(1)}ms | intent=${intent} | emotion=${emotion.type}(${emotion.intensity}) | topic=${topic || "—"}`);

  return {
    text: responseText,
    intent,
    source: "local_brain",
    emotion: INTENT_FACE_MAP[intent] || "attentive",
    confidence: intent === "GENERAL" ? 0.5 : 0.85,
    isOffline: true,
  };
}

/** Get memory snapshot for debugging */
export function getLocalBrainState() {
  return {
    turns: [...mem.turns],
    currentEmotion: mem.currentEmotion,
    currentIntensity: mem.currentIntensity,
    currentTopic: mem.currentTopic,
    topicDepth: mem.topicDepth,
    sessionMood: mem.sessionMood,
    turnCount: mem.turnCount,
  };
}
