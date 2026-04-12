/**
 * Conversation context, memory, multi-turn handling, and contextual responses.
 */

import type { OfflineIntent } from "./offline-intents";
import { normalizeInput } from "./offline-intents";
import type { StoryTheme } from "./offline-stories";
import { detectStoryTheme, LOCAL_STORIES, RIDDLES, TRUE_FALSE, ANIMAL_QUIZ } from "./offline-stories";
import type { OfflineResponse } from "./offlineEngine";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type Mood = "neutral" | "happy" | "sad" | "scared" | "excited" | "calm" | "bored";

interface ConversationTurn {
  role: "user" | "bobby";
  text: string;
  intent: OfflineIntent;
  topic: string;
  timestamp: number;
}

interface ConversationContext {
  lastIntent: OfflineIntent;
  lastTopic: string;
  mood: Mood;
  interactionCount: number;
  lastResponses: string[];
  lastBobbyResponse: string;
  lastResponseTime: number;
  history: ConversationTurn[];
  mentionedTopics: Set<string>;
  childPreferences: Record<string, number>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONTEXT STATE (singleton)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const context: ConversationContext = {
  lastIntent: "UNKNOWN",
  lastTopic: "",
  mood: "neutral",
  interactionCount: 0,
  lastResponses: [],
  lastBobbyResponse: "",
  lastResponseTime: 0,
  history: [],
  mentionedTopics: new Set(),
  childPreferences: {},
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOPIC EXTRACTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const TOPIC_KEYWORDS: Record<string, string[]> = {
  pirate: ["pirate", "trésor", "bateau", "mer", "capitaine", "île"],
  princesse: ["princesse", "château", "roi", "reine", "fée", "magie", "couronne"],
  espace: ["espace", "astronaute", "fusée", "étoile", "planète", "lune", "alien"],
  animaux: ["animal", "chat", "chien", "lapin", "ours", "loup", "dragon", "dinosaure"],
  nature: ["forêt", "montagne", "rivière", "fleur", "arbre", "jardin"],
  nourriture: ["manger", "gâteau", "chocolat", "bonbon", "goûter", "faim", "sushi", "pizza", "frite", "pâte", "cuisine", "plat", "recette", "fruit", "légume", "dessert", "fromage", "poulet", "riz", "soupe"],
  famille: ["maman", "papa", "frère", "sœur", "famille", "mamie", "papi"],
  école: ["école", "maîtresse", "copain", "copine", "classe", "apprendre"],
  sport: ["foot", "ballon", "courir", "nager", "vélo", "sport"],
};

export function extractTopics(text: string): string[] {
  const lower = normalizeInput(text);
  const found: string[] = [];
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) found.push(topic);
  }
  return found;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONTEXT MANAGEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function updateContext(intent: OfflineIntent, topic: string, response: string) {
  context.lastIntent = intent;
  context.lastTopic = topic;
  context.interactionCount++;
  context.lastResponses.push(response);
  if (context.lastResponses.length > 5) context.lastResponses.shift();

  // Track for learning loop
  context.lastBobbyResponse = response;
  context.lastResponseTime = Date.now();

  context.history.push(
    { role: "user", text: topic, intent, topic, timestamp: Date.now() },
    { role: "bobby", text: response, intent, topic, timestamp: Date.now() },
  );
  if (context.history.length > 20) {
    context.history = context.history.slice(-20);
  }

  const topics = extractTopics(topic);
  topics.forEach(t => {
    context.mentionedTopics.add(t);
    context.childPreferences[t] = (context.childPreferences[t] || 0) + 1;
  });

  if (intent === "EMOTION_POSITIVE") context.mood = "happy";
  else if (intent === "EMOTION_NEGATIVE") context.mood = "sad";
  else if (intent === "CALM_REQUEST") context.mood = "calm";
  else if (intent === "PLAY_REQUEST" || intent === "ADVENTURE") context.mood = "excited";
  else if (intent === "GREETING" && context.interactionCount <= 1) context.mood = "neutral";
}

export function detectMoodFromText(text: string): Mood | null {
  const lower = normalizeInput(text);
  if (/triste|pleure|malheureux|pas bien|mal/.test(lower)) return "sad";
  if (/peur|effrayé|terrifié|cauchemar/.test(lower)) return "scared";
  if (/content|heureux|super|génial|trop bien|cool|yay/.test(lower)) return "happy";
  if (/excité|impatient|trop hâte|pressé/.test(lower)) return "excited";
  if (/fatigué|dodo|dormir|sommeil|calme/.test(lower)) return "calm";
  if (/ennui|ennuie|rien à faire/.test(lower)) return "bored";
  return null;
}

export function resetConversationContext() {
  context.lastIntent = "UNKNOWN";
  context.lastTopic = "";
  context.mood = "neutral";
  context.interactionCount = 0;
  context.lastResponses = [];
  context.lastBobbyResponse = "";
  context.lastResponseTime = 0;
  context.history = [];
  context.mentionedTopics.clear();
  context.childPreferences = {};
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ANTI-REPETITION PICKER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const usedIdx: Record<string, number> = {};

export function pickRandom(pool: string[], key: string): string {
  const last = usedIdx[key] ?? -1;
  let idx: number;
  let attempts = 0;
  do {
    idx = Math.floor(Math.random() * pool.length);
    attempts++;
  } while (
    (idx === last || context.lastResponses.includes(pool[idx])) &&
    pool.length > 1 &&
    attempts < 10
  );
  usedIdx[key] = idx;
  return pool[idx];
}

export function personalize(text: string, childName?: string): string {
  if (!childName) return text;
  return text.replace(/\{name\}/g, childName);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MULTI-TURN HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getRecentExchanges(n = 3): { user: string; bobby: string; intent: OfflineIntent; topic: string }[] {
  const exchanges: { user: string; bobby: string; intent: OfflineIntent; topic: string }[] = [];
  const hist = context.history;
  for (let i = hist.length - 1; i >= 1; i--) {
    if (hist[i].role === "bobby" && hist[i - 1].role === "user") {
      exchanges.unshift({
        user: hist[i - 1].text,
        bobby: hist[i].text,
        intent: hist[i - 1].intent,
        topic: hist[i - 1].topic,
      });
      i--;
    }
    if (exchanges.length >= n) break;
  }
  return exchanges;
}

function getFavoriteTopics(): string[] {
  return Object.entries(context.childPreferences)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => topic);
}

function makeContextReply(text: string, intent: OfflineIntent, topic: string): OfflineResponse {
  updateContext(intent, topic, text);
  return { text, intent, isOffline: true };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONVERSATIONAL CONTEXT HANDLER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function handleConversationalContext(text: string, childName?: string): OfflineResponse | null {
  const normalized = normalizeInput(text);
  const exchanges = getRecentExchanges(3);
  if (exchanges.length === 0) return null;

  const name = childName || "";

  // "pourquoi?" / "comment?" follow-up
  if (/^(pourquoi|comment|c'est quoi|explique|mais pourquoi|ah bon|vraiment)\s*\??$/.test(normalized)) {
    const last = exchanges[exchanges.length - 1];
    if (last) {
      const deeperResponses: Record<string, string[]> = {
        pirate: [`Parce que les pirates adoraient naviguer sur les océans pour chercher des trésors ${name} ! 🏴‍☠️`, `Les pirates étaient des aventuriers courageux qui vivaient sur la mer ! ⛵`],
        princesse: [`Parce que dans les contes, les princesses ont des pouvoirs magiques ${name} ! ✨`, `Les princesses vivent souvent de grandes aventures dans des châteaux merveilleux ! 🏰`],
        espace: [`Parce que l'espace est immense et plein de mystères ${name} ! 🚀`, `L'univers est tellement grand qu'on en découvre encore des choses tous les jours ! 🌌`],
        animaux: [`Parce que les animaux sont incroyables et chacun a ses super-pouvoirs ${name} ! 🦁`, `La nature a créé des animaux extraordinaires, chacun unique ! 🐾`],
        maths: [`Parce que les maths sont partout autour de nous ${name} ! On en a besoin pour compter, mesurer, construire… 🔢`, `Les maths c'est comme un super-pouvoir : ça aide à résoudre plein de problèmes ! 🧮`],
        sciences: [`Parce que la science explique comment marche le monde ${name} ! C'est fascinant ! 🔬`, `Les scientifiques posent des questions comme toi et cherchent les réponses ! 🧪`],
        géographie: [`Parce que notre planète Terre est incroyable avec tous ses pays et ses paysages ${name} ! 🌍`, `La géographie nous aide à comprendre où sont les choses sur notre belle planète ! 🗺️`],
      };

      const topics = extractTopics(last.user + " " + last.bobby);
      for (const t of topics) {
        if (deeperResponses[t]) {
          const resp = pickRandom(deeperResponses[t], `deeper_${t}`);
          updateContext(last.intent, last.topic, resp);
          return { text: resp, intent: last.intent, isOffline: true };
        }
      }

      const bobbyLower = last.bobby.toLowerCase();
      for (const [subject, responses] of Object.entries(deeperResponses)) {
        if (bobbyLower.includes(subject) || last.topic.toLowerCase().includes(subject)) {
          const resp = pickRandom(responses, `deeper_${subject}`);
          updateContext(last.intent, last.topic, resp);
          return { text: resp, intent: last.intent, isOffline: true };
        }
      }

      const generic = pickRandom([
        `Bonne question ${name} ! C'est parce que c'est comme ça dans la nature. Tu veux en savoir encore plus ? 🤔`,
        `Hmm, c'est une question intéressante ! Il y a plein de choses à découvrir là-dessus ${name} ! 💡`,
        `Ça c'est le genre de question que j'adore ${name} ! En fait, il y a beaucoup de raisons… Tu veux que je t'en dise plus ? 🌟`,
      ], "deeper_generic");
      updateContext(last.intent, last.topic, generic);
      return { text: generic, intent: last.intent, isOffline: true };
    }
  }

  // "et toi?"
  if (/^(et toi|toi aussi|tu aimes|t'aimes)\s*\??$/.test(normalized)) {
    const last = exchanges[exchanges.length - 1];
    if (last) {
      const topics = extractTopics(last.user);
      if (topics.includes("animaux")) return makeContextReply(`Moi j'adore les animaux aussi ${name} ! Surtout les dauphins ! 🐬`, last.intent, last.topic);
      if (topics.includes("nourriture")) return makeContextReply(`Si je pouvais manger, j'adorerais le chocolat ${name} ! 🍫`, last.intent, last.topic);
      if (topics.includes("sport")) return makeContextReply(`Si je pouvais bouger, j'adorerais jouer au foot ${name} ! ⚽`, last.intent, last.topic);
      return makeContextReply(pickRandom([
        `Moi j'aime plein de choses ${name} ! Surtout discuter avec toi ! 😊`,
        `Bonne question ! Moi j'aime les histoires et jouer avec toi ! 🌟`,
      ], "et_toi"), last.intent, last.topic);
    }
  }

  // Reference to earlier exchanges
  if (/tout à l'heure|avant|tu m'as dit|tu disais|on parlait de|tu avais dit/.test(normalized)) {
    if (exchanges.length >= 2) {
      const older = exchanges[0];
      const topicsOld = extractTopics(older.user);
      if (topicsOld.length > 0) {
        const resp = `Oui, on parlait de ${topicsOld[0]} ! Tu veux qu'on continue là-dessus ${name} ? 😊`;
        updateContext(older.intent, older.topic, resp);
        return { text: resp, intent: older.intent, isOffline: true };
      }
      const resp = `Oui je me souviens ! Tu veux qu'on en reparle ${name} ? 😊`;
      updateContext(older.intent, older.topic, resp);
      return { text: resp, intent: older.intent, isOffline: true };
    }
  }

  // "parle-moi encore de..."
  if (/encore de|plus sur|redis|re-?parle|raconte.+encore/.test(normalized)) {
    for (const ex of [...exchanges].reverse()) {
      const topics = extractTopics(ex.user + " " + ex.bobby);
      if (topics.length > 0) {
        const topic = topics[0];
        const moreInfo: Record<string, string[]> = {
          pirate: [`Tu savais que les pirates avaient des règles très strictes sur leur bateau ${name} ? Chacun avait un rôle ! 🏴‍☠️`, `Les pirates dessinaient des cartes au trésor avec des X pour marquer l'endroit secret ! 🗺️`],
          princesse: [`Tu savais que les princesses dans les vrais châteaux apprenaient plein de langues ${name} ? 👑`, `Dans les contes, les princesses sont souvent les plus courageuses de tous ! ✨`],
          espace: [`Tu savais qu'il fait super froid dans l'espace ${name} ? Moins 270 degrés ! 🥶🚀`, `Les astronautes dorment attachés parce qu'ils flottent dans l'espace ! 😴🌌`],
          animaux: [`Tu savais que les éléphants peuvent reconnaître leur reflet dans un miroir ${name} ? 🐘`, `Les dauphins dorment avec un seul œil fermé ! Incroyable non ? 🐬`],
          nature: [`Tu savais que les arbres communiquent entre eux par leurs racines ${name} ? 🌳`, `Un seul arbre peut produire l'oxygène pour 4 personnes ! 🌲💨`],
        };
        if (moreInfo[topic]) {
          const resp = pickRandom(moreInfo[topic], `more_${topic}`);
          updateContext(ex.intent, topic, resp);
          return { text: resp, intent: ex.intent, isOffline: true };
        }
      }
    }
  }

  return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FOLLOW-UP ANSWER HANDLER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function handleFollowUpAnswer(text: string, childName?: string): OfflineResponse | null {
  const normalized = normalizeInput(text);
  const lastBobbyTurn = [...context.history].reverse().find(t => t.role === "bobby");
  if (!lastBobbyTurn) return null;

  const lastBobbyText = lastBobbyTurn.text.toLowerCase();

  // Bobby asked "pirate, princesse ou espace ?"
  if (lastBobbyText.includes("pirate") && lastBobbyText.includes("princesse") && lastBobbyText.includes("espace")) {
    const theme = detectStoryTheme(text) || "aventure" as StoryTheme;
    if (theme !== "aventure" || /pirate|princesse|espace|animal/.test(normalized)) {
      const story = pickRandom(LOCAL_STORIES[theme], `story_followup_${theme}`);
      const finalText = personalize(story, childName);
      updateContext("STORY_REQUEST", text, finalText);
      return { text: finalText, intent: "STORY_REQUEST", isOffline: true, theme };
    }
  }

  // Bobby asked "devinette ou quiz ?"
  if (lastBobbyText.includes("devinette") || lastBobbyText.includes("quiz") || lastBobbyText.includes("tu choisis")) {
    if (/devinette|devine/.test(normalized)) {
      const r = RIDDLES[Math.floor(Math.random() * RIDDLES.length)];
      const resp = `Devinette ! ${r.question} 🤔`;
      updateContext("PLAY_REQUEST", text, resp);
      return { text: resp, intent: "PLAY_REQUEST", isOffline: true, gameType: "riddle" as any };
    }
    if (/quiz|vrai|faux/.test(normalized)) {
      const tf = TRUE_FALSE[Math.floor(Math.random() * TRUE_FALSE.length)];
      const resp = `Vrai ou Faux ? ${tf.statement} 🤔`;
      updateContext("PLAY_REQUEST", text, resp);
      return { text: resp, intent: "PLAY_REQUEST", isOffline: true, gameType: "true_false" as any };
    }
  }

  // Bobby asked a riddle → child answers
  if (lastBobbyText.includes("qui suis-je") || lastBobbyText.includes("devinette")) {
    const matchedRiddle = RIDDLES.find(r => lastBobbyText.includes(normalizeInput(r.question)));
    if (matchedRiddle) {
      const isCorrect = normalized.includes(normalizeInput(matchedRiddle.answer));
      if (isCorrect) {
        const resp = personalize(pickRandom(["Bravo {name} ! C'est ça ! 🎉", "Oui ! Bien joué ! Tu es trop fort ! 🌟", "Exact ! Tu es un champion ! 💪"], "riddle_correct"), childName);
        updateContext("EMOTION_POSITIVE", text, resp);
        return { text: resp, intent: "EMOTION_POSITIVE", isOffline: true };
      } else {
        const resp = personalize(pickRandom([
          `Presque ! La réponse c'était ${matchedRiddle.answer} ! On en fait une autre ? 😊`,
          `Non c'est ${matchedRiddle.answer} ! Mais c'était dur ! Encore une ? 🤔`,
          `C'était ${matchedRiddle.answer} ! Tu veux réessayer avec une autre ? 😊`,
        ], "riddle_wrong"), childName);
        updateContext("PLAY_REQUEST", text, resp);
        return { text: resp, intent: "PLAY_REQUEST", isOffline: true };
      }
    }
  }

  // Bobby asked vrai ou faux
  if (lastBobbyText.includes("vrai ou faux")) {
    const matchedTF = TRUE_FALSE.find(tf => lastBobbyText.includes(normalizeInput(tf.statement)));
    if (matchedTF) {
      const saidTrue = /vrai|oui|yes/.test(normalized);
      const saidFalse = /faux|non|nan/.test(normalized);
      if (saidTrue || saidFalse) {
        const isCorrect = (saidTrue && matchedTF.answer) || (saidFalse && !matchedTF.answer);
        const resp = isCorrect
          ? personalize(`Bravo {name} ! ${matchedTF.explanation}`, childName)
          : personalize(`Eh non ! ${matchedTF.explanation}`, childName);
        updateContext(isCorrect ? "EMOTION_POSITIVE" : "PLAY_REQUEST", text, resp);
        return { text: resp, intent: isCorrect ? "EMOTION_POSITIVE" : "PLAY_REQUEST", isOffline: true };
      }
    }
  }

  // Animal quiz
  if (lastBobbyText.includes("quiz animaux")) {
    const matchedAQ = ANIMAL_QUIZ.find(aq => lastBobbyText.includes(normalizeInput(aq.question)));
    if (matchedAQ) {
      const isCorrect = normalized.includes(normalizeInput(matchedAQ.answer));
      const resp = isCorrect
        ? personalize(pickRandom(["Bravo {name} ! C'est ça ! 🎉", "Oui ! Bien joué ! 🌟"], "aq_correct"), childName)
        : personalize(`C'est ${matchedAQ.answer} ! Bien essayé ! On continue ? 😊`, childName);
      updateContext(isCorrect ? "EMOTION_POSITIVE" : "PLAY_REQUEST", text, resp);
      return { text: resp, intent: isCorrect ? "EMOTION_POSITIVE" : "PLAY_REQUEST", isOffline: true };
    }
  }

  // "Would you rather" response
  if (lastBobbyText.includes("tu préfères")) {
    const resp = personalize(pickRandom([
      "Bonne réponse ! Moi aussi j'aurais peut-être choisi pareil ! 😊",
      "Intéressant ! Tu as bien choisi {name} ! 😄",
      "Oh cool ! Moi je sais pas ce que j'aurais choisi ! 🤔",
      "Super choix ! On fait autre chose ? 😊",
    ], "wyr_response"), childName);
    updateContext("EMOTION_POSITIVE", text, resp);
    return { text: resp, intent: "EMOTION_POSITIVE", isOffline: true };
  }

  return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONTEXTUAL CONTINUATION ("encore" / "continue")
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function handleContextualContinuation(text: string, childName?: string, pickMiniGameFn?: () => { type: string; text: string }): OfflineResponse | null {
  const normalized = normalizeInput(text);
  const isContinue = /^(encore|encore encore|fais encore|continue|reprends|la suite|et après)$/.test(normalized);
  if (!isContinue) return null;

  switch (context.lastIntent) {
    case "STORY_REQUEST": {
      const theme = detectStoryTheme(context.lastTopic || "aventure");
      const story = pickRandom(LOCAL_STORIES[theme], `story_cont_${theme}`);
      return { text: personalize(story, childName), intent: "STORY_REQUEST", isOffline: true, theme };
    }
    case "PLAY_REQUEST": {
      if (pickMiniGameFn) {
        const game = pickMiniGameFn();
        return { text: personalize(game.text, childName), intent: "PLAY_REQUEST", isOffline: true, gameType: game.type as any };
      }
      return null;
    }
    case "HUMOR": {
      const jokes = [
        "Pourquoi les plongeurs plongent-ils toujours en arrière ? Parce que sinon ils tomberaient dans le bateau ! 😄",
        "Qu'est-ce qu'un canif ? Un petit fien ! 😂",
        "Quel est le comble pour un électricien ? De ne pas être au courant ! ⚡😄",
        "Pourquoi le livre de maths est triste ? Parce qu'il a trop de problèmes ! 📚😢",
        "Que dit une imprimante dans l'eau ? J'ai papier ! 🖨️😂",
        "Comment appelle-t-on un chat tombé dans un pot de peinture le jour de Noël ? Un chat-peint de Noël ! 🐱🎄",
        "Quel est le sport préféré des insectes ? Le criquet ! 🦗⚽",
        "Pourquoi les fantômes sont-ils de mauvais menteurs ? Parce qu'on voit à travers ! 👻😄",
      ];
      return { text: pickRandom(jokes, "JOKES_CONT"), intent: "HUMOR", isOffline: true };
    }
    default:
      return null;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONTEXTUAL PREFIX BUILDER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function buildContextualPrefix(childName?: string): string | null {
  if (context.history.length < 4) return null;

  const exchanges = getRecentExchanges(3);
  const favTopics = getFavoriteTopics();
  const name = childName || "";

  if (favTopics.length > 0 && context.childPreferences[favTopics[0]] >= 3) {
    const topicPhrases: Record<string, string[]> = {
      pirate: [`Tu adores les pirates ${name} !`, `Encore des pirates ? Trop bien !`],
      princesse: [`Toi tu adores les princesses !`, `Encore une histoire de princesse !`],
      espace: [`L'espace te passionne ${name} !`, `Toi t'es un vrai astronaute !`],
      animaux: [`Toi tu adores les animaux !`, `Les animaux c'est ta passion !`],
      nature: [`Tu aimes la nature ${name} !`],
      nourriture: [`Tu as faim ou tu adores parler de nourriture ? 😄`],
      famille: [`Ta famille a l'air super !`],
      école: [`Tu me racontes l'école ?`],
      sport: [`Tu es sportif ${name} !`],
    };
    const phrases = topicPhrases[favTopics[0]];
    if (phrases && Math.random() > 0.6) {
      return pickRandom(phrases, `ctx_topic_${favTopics[0]}`);
    }
  }

  if (exchanges.length >= 2 && Math.random() > 0.5) {
    const older = exchanges[0];
    const olderTopics = extractTopics(older.user);
    if (olderTopics.length > 0) {
      const topicRefs: Record<string, string[]> = {
        pirate: [`D'ailleurs, tu m'avais parlé de pirates ! `, `On parlait de pirates tout à l'heure ! `],
        princesse: [`Comme les princesses dont on parlait ! `, `Ça me rappelle notre histoire de princesse ! `],
        espace: [`Comme dans l'espace dont on parlait ! `, `Tu te rappelles notre discussion sur l'espace ? `],
        animaux: [`Tu m'avais parlé des animaux ! `, `Les animaux c'est ta passion on dirait ! `],
        nature: [`Tu me parlais de la nature ! `],
        famille: [`Tu me parlais de ta famille tout à l'heure ! `],
        école: [`Tu m'as parlé de l'école ! `],
      };
      const refs = topicRefs[olderTopics[0]];
      if (refs) return pickRandom(refs, `ctx_ref_${olderTopics[0]}`);
    }
  }

  if (exchanges.length >= 3 && Math.random() > 0.6) {
    const intents = exchanges.map(e => e.intent);
    if (intents.every(i => i === "EDUCATION")) {
      return pickRandom([`Tu apprends plein de trucs aujourd'hui ${name} ! `, `Quelle curiosité ! T'es un vrai petit savant ${name} ! 🧠 `], "ctx_learning_streak");
    }
    if (intents.every(i => i === "PLAY_REQUEST" || i === "HUMOR")) {
      return pickRandom([`On s'éclate bien aujourd'hui ! `, `Tu adores jouer toi ! C'est super ${name} ! 🎮 `], "ctx_play_streak");
    }
    if (intents.every(i => i === "STORY_REQUEST")) {
      return pickRandom([`Encore une histoire ! Tu ne t'en lasses pas ${name} ! 📚 `, `T'es un vrai fan d'histoires toi ! `], "ctx_story_streak");
    }
  }

  if (exchanges.length >= 2 && Math.random() > 0.7) {
    const referenceBack = [`Tout à l'heure tu parlais de ça, j'ai bien aimé ! `, `On s'amuse bien aujourd'hui ! `, `Ça fait ${context.interactionCount} fois qu'on parle, c'est chouette ! `];
    return pickRandom(referenceBack, "ctx_ref");
  }

  if (context.mood === "happy" && Math.random() > 0.7) {
    return pickRandom(["Tu as l'air super content ! ", "Quelle bonne humeur ! "], "ctx_mood_happy");
  }
  if (context.mood === "sad" && Math.random() > 0.5) {
    return pickRandom(["Je suis toujours là pour toi. ", "On reste ensemble. "], "ctx_mood_sad");
  }

  return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FOLLOW-UP GETTER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { FOLLOW_UPS } from "./offline-stories";

export function getFollowUp(intent: OfflineIntent): string {
  // Only add follow-ups 30% of the time to keep responses short and natural
  if (Math.random() > 0.3) return "";
  const pool = FOLLOW_UPS[intent] || [""];
  return pickRandom(pool, `followup_${intent}`);
}
