/**
 * Conversation Enricher — Contextual chaining & smart rebounds
 * 
 * 1. Builds a context summary from conversation history for the LLM
 * 2. Provides smart rebond (follow-up) questions for local brain
 */

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. CONTEXT SUMMARY — injected into the LLM system prompt
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Extract topics mentioned in conversation */
function extractTopics(messages: ConversationMessage[]): string[] {
  const topicPatterns: Record<string, RegExp> = {
    animaux: /\b(chat|chien|animal|animaux|lapin|oiseau|poisson|cheval|tortue|hamster|dinosaure|lion|tigre)\b/i,
    école: /\b(école|maîtresse|maître|devoirs?|classe|copain|copine|récré|cantine|cahier)\b/i,
    famille: /\b(maman|papa|frère|sœur|mamie|papi|famille|bébé|tonton|tata|cousin)\b/i,
    jeux: /\b(jeu[x]?|jouer|foot|ballon|lego|poupée|vélo|cache-cache|marelle)\b/i,
    espace: /\b(espace|étoile|lune|soleil|planète|fusée|astronaute|galaxie)\b/i,
    nature: /\b(nature|arbre|fleur|forêt|jardin|mer|montagne|rivière|pluie|neige)\b/i,
    nourriture: /\b(manger|gâteau|chocolat|bonbon|pizza|fruit|légume|cuisine|goûter|dîner)\b/i,
    émotions: /\b(triste|peur|content|fâché|colère|pleurer|câlin|bisou|ennui|seul)\b/i,
    histoires: /\b(histoire|conte|livre|lire|raconte|aventure|héros|princesse|dragon)\b/i,
    musique: /\b(musique|chanson|chanter|danser|instrument|guitare|piano)\b/i,
    sport: /\b(sport|courir|nager|sauter|gym|danse|karaté|match)\b/i,
  };

  const found = new Set<string>();
  for (const msg of messages) {
    for (const [topic, pattern] of Object.entries(topicPatterns)) {
      if (pattern.test(msg.content)) found.add(topic);
    }
  }
  return Array.from(found);
}

/** Detect the dominant mood from recent messages */
function detectMood(messages: ConversationMessage[]): string {
  const userMsgs = messages.filter(m => m.role === "user").map(m => m.content.toLowerCase());
  const recent = userMsgs.slice(-3).join(" ");

  if (/triste|pleure|mal|seul|peur|cauchemar/i.test(recent)) return "négatif";
  if (/super|génial|content|cool|youpi|adore|aime/i.test(recent)) return "positif";
  if (/ennui|bof|sais pas|rien/i.test(recent)) return "neutre/ennui";
  return "neutre";
}

/** Build a concise context block for the LLM system prompt */
export function buildContextSummary(messages: ConversationMessage[]): string {
  if (messages.length < 2) return "";

  const topics = extractTopics(messages);
  const mood = detectMood(messages);
  const turnCount = messages.filter(m => m.role === "user").length;

  // Last user message topic for continuity
  const lastUser = messages.filter(m => m.role === "user").pop();
  const lastBobby = messages.filter(m => m.role === "assistant").pop();

  const parts: string[] = [];
  parts.push(`[CONTEXTE DE CONVERSATION]`);
  parts.push(`- Tour n°${turnCount}`);
  if (topics.length > 0) parts.push(`- Sujets abordés : ${topics.join(", ")}`);
  parts.push(`- Humeur détectée : ${mood}`);
  if (lastUser) parts.push(`- Dernier message enfant : "${lastUser.content.slice(0, 80)}"`);
  if (lastBobby) parts.push(`- Dernière réponse Bobby : "${lastBobby.content.slice(0, 80)}"`);

  // Continuity instruction
  if (topics.length > 0) {
    parts.push(`\nIMPORTANT : L'enfant parle de ${topics[topics.length - 1]}. Reste sur CE sujet et fais référence à ce qui a été dit avant.`);
  }

  return parts.join("\n");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. SMART REBONDS — follow-up questions for local brain
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const REBOND_BY_TOPIC: Record<string, string[]> = {
  animaux: [
    "Tu as un animal préféré ? 🐾",
    "Si tu pouvais avoir n'importe quel animal, tu choisirais lequel ?",
    "Tu sais quel bruit il fait ? 😄",
    "Tu en as déjà vu un en vrai ?",
  ],
  école: [
    "C'est quoi ta matière préférée ? 📝",
    "Tu as un super copain à l'école ?",
    "Qu'est-ce que tu as appris de cool aujourd'hui ?",
    "C'est quoi le plus drôle qui s'est passé en classe ?",
  ],
  famille: [
    "Tu fais quoi de chouette avec ta famille ? 💛",
    "C'est qui qui te fait le plus rigoler chez toi ?",
    "Vous aimez jouer ensemble à quoi ?",
  ],
  jeux: [
    "C'est quoi ton jeu préféré en ce moment ? 🎮",
    "Tu préfères jouer seul ou avec quelqu'un ?",
    "Tu veux qu'on invente un jeu ensemble ?",
  ],
  espace: [
    "Tu aimerais aller sur quelle planète ? 🚀",
    "Tu sais laquelle est la plus grande ?",
    "Et si on imaginait un voyage dans l'espace ?",
  ],
  nature: [
    "Tu préfères la mer ou la montagne ? 🌿",
    "Tu as déjà vu un arc-en-ciel ?",
    "Quelle est ta fleur préférée ?",
  ],
  nourriture: [
    "Miam ! C'est quoi ton plat préféré ? 🍕",
    "Tu aimes cuisiner ? Qu'est-ce que tu sais faire ?",
    "Si tu pouvais manger un seul truc pour toujours, ce serait quoi ?",
  ],
  histoires: [
    "Tu préfères les histoires d'aventure ou les contes de fées ? 📖",
    "C'est quoi ta dernière histoire préférée ?",
    "Tu veux qu'on en invente une ensemble ?",
  ],
  émotions: [
    "Tu veux me raconter ce qui s'est passé ? 💛",
    "Qu'est-ce qui te ferait du bien là ?",
    "Tu sais quoi, c'est normal de ressentir ça.",
  ],
  sport: [
    "Tu fais du sport ? Lequel ? ⚽",
    "Tu préfères courir ou nager ?",
    "C'est trop cool ! Tu y vas souvent ?",
  ],
  musique: [
    "Tu aimes chanter ou danser ? 🎵",
    "C'est quoi ta chanson préférée ?",
    "Tu joues d'un instrument ?",
  ],
};

const REBOND_GENERAL: string[] = [
  "Et toi, tu en penses quoi ? 😊",
  "Tu veux me raconter autre chose ?",
  "Qu'est-ce qui t'a fait sourire aujourd'hui ?",
  "Tu veux qu'on joue à un jeu ou que je te raconte quelque chose ?",
  "Tu as fait quoi de chouette aujourd'hui ?",
  "Il y a un truc que tu adores en ce moment ?",
];

/** Pick a contextual follow-up question */
export function pickRebond(topic: string | null, usedRebonds: string[]): string | null {
  const pool = topic && REBOND_BY_TOPIC[topic]
    ? REBOND_BY_TOPIC[topic]
    : REBOND_GENERAL;

  const fresh = pool.filter(r => !usedRebonds.includes(r));
  if (fresh.length === 0) return null;
  return fresh[Math.floor(Math.random() * fresh.length)];
}

/** Detect topic from user text (lighter version for rebond matching) */
export function detectRebondTopic(text: string): string | null {
  const t = text.toLowerCase();
  if (/chat|chien|animal|lapin|oiseau|dinosaure|lion/.test(t)) return "animaux";
  if (/école|maîtresse|devoirs?|classe|copain|récré/.test(t)) return "école";
  if (/maman|papa|frère|sœur|famille|mamie/.test(t)) return "famille";
  if (/jouer|jeu|foot|lego|vélo/.test(t)) return "jeux";
  if (/espace|étoile|lune|planète|fusée/.test(t)) return "espace";
  if (/nature|arbre|fleur|forêt|mer|montagne/.test(t)) return "nature";
  if (/manger|gâteau|chocolat|bonbon|pizza/.test(t)) return "nourriture";
  if (/histoire|conte|livre|raconte|aventure/.test(t)) return "histoires";
  if (/triste|peur|content|colère|seul|câlin/.test(t)) return "émotions";
  if (/sport|courir|nager|danse|foot/.test(t)) return "sport";
  if (/musique|chanson|chanter|danser/.test(t)) return "musique";
  return null;
}
