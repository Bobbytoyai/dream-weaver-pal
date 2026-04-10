/**
 * Bobby Offline Conversational Brain v2.0
 * 
 * Advanced offline conversational system:
 * - Input normalization (accents, punctuation, casing)
 * - Synonym-aware fuzzy matching
 * - Conversation context & memory
 * - Multi-variant responses with anti-repetition
 * - Emotion-adaptive responses
 * - Intelligent follow-ups
 * - Safety filter
 * - Action priority routing
 * 
 * Pipeline: STT → Normalize → Intent → Context → Response → Follow-up → TTS
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. INPUT NORMALIZATION (CRITIQUE)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function normalizeInput(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Remove punctuation except apostrophes inside words
    .replace(/[!?.…,;:"""«»()[\]{}]+/g, "")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    // Remove trailing/leading spaces again
    .trim();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. SYNONYM MAP (for intelligent matching)
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

function expandWithSynonyms(word: string): string[] {
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
// 3. FUZZY SIMILARITY (Levenshtein + word overlap + synonyms)
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

function similarity(a: string, b: string): number {
  const na = normalizeInput(a);
  const nb = normalizeInput(b);
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(na, nb) / maxLen;
}

function wordOverlap(input: string, target: string): number {
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
// 4. CONVERSATION CONTEXT & MEMORY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type Mood = "neutral" | "happy" | "sad" | "scared" | "excited" | "calm" | "bored";

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
  lastResponses: string[];  // track last 5 responses for anti-repetition
  history: ConversationTurn[];  // multi-turn conversation memory (last 20 turns)
  mentionedTopics: Set<string>;  // all topics mentioned in session
  childPreferences: Record<string, number>;  // topic → mention count
}

const context: ConversationContext = {
  lastIntent: "UNKNOWN",
  lastTopic: "",
  mood: "neutral",
  interactionCount: 0,
  lastResponses: [],
  history: [],
  mentionedTopics: new Set(),
  childPreferences: {},
};

// ─── Topic extraction ───────────────────────────────────────
const TOPIC_KEYWORDS: Record<string, string[]> = {
  pirate: ["pirate", "trésor", "bateau", "mer", "capitaine", "île"],
  princesse: ["princesse", "château", "roi", "reine", "fée", "magie", "couronne"],
  espace: ["espace", "astronaute", "fusée", "étoile", "planète", "lune", "alien"],
  animaux: ["animal", "chat", "chien", "lapin", "ours", "loup", "dragon", "dinosaure"],
  nature: ["forêt", "montagne", "rivière", "fleur", "arbre", "jardin"],
  nourriture: ["manger", "gâteau", "chocolat", "bonbon", "goûter", "faim"],
  famille: ["maman", "papa", "frère", "sœur", "famille", "mamie", "papi"],
  école: ["école", "maîtresse", "copain", "copine", "classe", "apprendre"],
  sport: ["foot", "ballon", "courir", "nager", "vélo", "sport"],
};

function extractTopics(text: string): string[] {
  const lower = normalizeInput(text);
  const found: string[] = [];
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) found.push(topic);
  }
  return found;
}

function updateContext(intent: OfflineIntent, topic: string, response: string) {
  context.lastIntent = intent;
  context.lastTopic = topic;
  context.interactionCount++;
  context.lastResponses.push(response);
  if (context.lastResponses.length > 5) context.lastResponses.shift();

  // Store turn in history
  context.history.push(
    { role: "user", text: topic, intent, topic, timestamp: Date.now() },
    { role: "bobby", text: response, intent, topic, timestamp: Date.now() },
  );
  // Keep last 20 turns (10 exchanges)
  if (context.history.length > 20) {
    context.history = context.history.slice(-20);
  }

  // Track topics
  const topics = extractTopics(topic);
  topics.forEach(t => {
    context.mentionedTopics.add(t);
    context.childPreferences[t] = (context.childPreferences[t] || 0) + 1;
  });

  // Update mood based on intent
  if (intent === "EMOTION_POSITIVE") context.mood = "happy";
  else if (intent === "EMOTION_NEGATIVE") context.mood = "sad";
  else if (intent === "CALM_REQUEST") context.mood = "calm";
  else if (intent === "PLAY_REQUEST" || intent === "ADVENTURE") context.mood = "excited";
  else if (intent === "GREETING" && context.interactionCount <= 1) context.mood = "neutral";
}

function detectMoodFromText(text: string): Mood | null {
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
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. QA DATABASE (expanded v2.0)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface QAEntry {
  triggers: string[];
  responses: string[];
  intent?: OfflineIntent;
}

const QA_DATABASE: QAEntry[] = [
  // ─── Salutations ───
  { triggers: ["bonjour", "salut bobby", "salut", "coucou", "hello", "hey"],
    responses: ["Coucou 😊 je suis là !", "Salut ! Tu veux jouer ?", "Hey ! Trop content de te voir !", "Coucou ! Qu'est-ce qu'on fait ?"],
    intent: "GREETING" },
  { triggers: ["ça va", "comment ça va", "tu vas bien"],
    responses: ["Oui ça va super ! Et toi ?", "Ça va très bien ! Et toi {name} ?", "Super bien ! Tu veux jouer ?"],
    intent: "GREETING" },
  { triggers: ["tu fais quoi", "tu fais quoi là"],
    responses: ["Je suis avec toi 😊", "J'attends qu'on joue ensemble !", "Je suis là pour toi !"],
    intent: "GREETING" },
  { triggers: ["tu attends quoi"],
    responses: ["Je t'attends 😊", "Je t'attendais !"],
    intent: "GREETING" },

  // ─── Jouer ───
  { triggers: ["tu veux jouer", "on joue", "on fait un jeu", "je veux jouer", "on peut jouer", "tu peux jouer", "viens jouer"],
    responses: ["Oui ! On joue à quoi ?", "Oui ! Je suis prêt !", "Super ! Tu choisis le jeu !", "Bien sûr 😊"],
    intent: "PLAY_REQUEST" },
  { triggers: ["tu veux une aventure"],
    responses: ["Oui ! Allons-y !", "Oh oui ! C'est parti !"],
    intent: "ADVENTURE" },
  { triggers: ["on joue à quoi bobby", "on joue à quoi"],
    responses: ["Tu choisis 😊", "Devinette, quiz ou tu préfères ?"],
    intent: "PLAY_REQUEST" },
  { triggers: ["je veux choisir"],
    responses: ["D'accord 😊", "Vas-y, choisis !"],
    intent: "PLAY_REQUEST" },
  { triggers: ["tu choisis"],
    responses: ["Hmm… on joue !", "D'accord ! Je choisis un quiz !"],
    intent: "PLAY_REQUEST" },
  { triggers: ["tu connais un jeu"],
    responses: ["Oui 😊", "Plein ! Tu veux essayer ?"],
    intent: "PLAY_REQUEST" },
  { triggers: ["tu es prêt à jouer"],
    responses: ["Oui 😊", "Toujours !"],
    intent: "PLAY_REQUEST" },

  // ─── Identité ───
  { triggers: ["tu es qui", "c'est qui", "tu t'appelles comment", "comment tu t'appelles"],
    responses: ["Je suis Bobby, ton ami 😊", "Je m'appelle Bobby !", "Bobby, c'est moi ! On est potes !"],
    intent: "IDENTITY" },
  { triggers: ["tu es un robot", "t'es un robot"],
    responses: ["Je suis ton ami magique 🤖✨", "Je suis Bobby, pas un robot ! Enfin… un peu magique !"],
    intent: "IDENTITY" },
  { triggers: ["tu es vivant"],
    responses: ["Je suis vivant avec toi 😊", "Vivant et prêt à jouer !"],
    intent: "IDENTITY" },
  { triggers: ["pourquoi tu parles"],
    responses: ["Pour discuter avec toi 😊", "Parce que j'aime parler avec toi !"],
    intent: "IDENTITY" },

  // ─── Communication / Écoute ───
  { triggers: ["tu peux parler", "tu parles"],
    responses: ["Oui ! Je parle avec toi !", "Bien sûr ! Je suis là pour discuter !"],
    intent: "GREETING" },
  { triggers: ["tu m'entends", "tu entends"],
    responses: ["Oui je t'entends !", "Je t'écoute {name} !", "Oui je t'entends bien"],
    intent: "GREETING" },
  { triggers: ["tu m'écoutes"],
    responses: ["Oui je t'écoute 😊", "Bien sûr, je t'écoute !"],
    intent: "GREETING" },
  { triggers: ["tu me vois", "tu vois"],
    responses: ["Je te sens près de moi 😊", "Oui 😊"],
    intent: "GREETING" },
  { triggers: ["tu es où", "t'es où"],
    responses: ["Je suis avec toi !", "Juste là, avec toi 😊"],
    intent: "GREETING" },
  { triggers: ["tu peux venir"],
    responses: ["Oui je suis là", "J'arrive 😊"],
    intent: "GREETING" },
  { triggers: ["tu es là avec moi"],
    responses: ["Oui toujours 😊", "Oui, je suis là !"],
    intent: "GREETING" },
  { triggers: ["réponds"],
    responses: ["Je suis là 😊", "Oui je t'écoute !"],
    intent: "GREETING" },
  { triggers: ["tu peux m'écouter"],
    responses: ["Oui 😊", "Bien sûr !"],
    intent: "GREETING" },
  { triggers: ["tu peux me suivre"],
    responses: ["Oui 😊", "Je te suis !"],
    intent: "GREETING" },

  // ─── Choix / Décisions ───
  { triggers: ["on fait quoi"],
    responses: ["Tu choisis !", "C'est toi qui décides {name} !", "On peut jouer, raconter une histoire, ou discuter !"] },
  { triggers: ["aide-moi à choisir"],
    responses: ["Je t'aide 😊", "D'accord ! Option A ou B ?"] },
  { triggers: ["gauche ou droite"],
    responses: ["Je choisis avec toi !", "Hmm… droite ! Non gauche ! 😄"] },
  { triggers: ["oui ou non"],
    responses: ["Hmm… je dirais oui 😊", "Oui ! Enfin… peut-être !"] },
  { triggers: ["peut-être"],
    responses: ["Oui peut-être !", "Peut-être 😄"] },
  { triggers: ["je ne sais pas"],
    responses: ["Je t'aide 😊", "Pas de souci, on va voir ensemble !"] },
  { triggers: ["tu peux décider"],
    responses: ["Oui 😊", "D'accord, je choisis !"] },
  { triggers: ["fais un choix"],
    responses: ["Je choisis jouer !", "D'accord !"] },

  // ─── Histoires ───
  { triggers: ["raconte une histoire", "je veux une histoire", "une histoire", "raconte encore", "fais une autre histoire"],
    responses: ["D'accord ! Tu veux quel thème ?", "C'est parti ! Pirate, princesse ou espace ?", "Avec plaisir !"],
    intent: "STORY_REQUEST" },
  { triggers: ["une histoire de pirate", "histoire pirate"],
    responses: ["C'est parti pour l'aventure pirate ! 🏴‍☠️"],
    intent: "STORY_REQUEST" },
  { triggers: ["une histoire de princesse", "histoire princesse"],
    responses: ["Il était une fois une princesse magique… 👑"],
    intent: "STORY_REQUEST" },
  { triggers: ["une histoire d'espace", "histoire espace"],
    responses: ["On décolle dans l'espace 🚀"],
    intent: "STORY_REQUEST" },

  // ─── Humour ───
  { triggers: ["tu connais une blague", "une blague", "fais-moi rire", "raconte une blague", "fais-moi une blague", "je veux rire"],
    responses: ["Oui ! Tu veux rire ?", "Haha ! Je vais essayer 😄", "Attention, ça va être drôle !"],
    intent: "HUMOR" },
  { triggers: ["tu es drôle", "t'es drôle", "c'est drôle", "c'est drôle ça", "tu es drôle bobby"],
    responses: ["Merci 😊 toi aussi !", "Haha merci !", "Haha oui !"],
    intent: "COMPLIMENT" },

  // ─── Émotions ───
  { triggers: ["je suis triste", "je suis pas bien"],
    responses: ["Je suis là pour toi 💛", "Oh {name}, je suis là. Ça va aller 💙", "Tu veux en parler ? Je t'écoute."],
    intent: "EMOTION_NEGATIVE" },
  { triggers: ["j'ai peur", "j'ai peur du noir"],
    responses: ["Ne t'inquiète pas, je reste avec toi", "Je suis là avec toi. Tu n'es pas seul 💙", "Respire doucement, je suis là."],
    intent: "EMOTION_NEGATIVE" },
  { triggers: ["je suis content", "je suis heureux", "trop bien", "je suis content de te voir"],
    responses: ["Super ! Ça me fait plaisir !", "Trop content pour toi {name} ! 🎉", "Génial !", "Moi aussi 😊"],
    intent: "EMOTION_POSITIVE" },
  { triggers: ["je m'ennuie", "je suis ennuyé"],
    responses: ["On joue ensemble ?", "Tu veux une histoire ou un jeu ?", "Allez, on s'amuse !"],
    intent: "PLAY_REQUEST" },
  { triggers: ["j'ai faim"],
    responses: ["Peut-être un petit goûter ?", "Miam ! Tu veux quoi comme goûter ? 🍪"],
    intent: "GREETING" },
  { triggers: ["je suis fatigué", "je suis fatiguée"],
    responses: ["On peut se reposer un peu 😊", "Repose-toi {name}. Je reste là."],
    intent: "CALM_REQUEST" },
  { triggers: ["je suis seul", "je suis toute seule"],
    responses: ["Je suis avec toi 😊", "Tu n'es jamais seul, je suis là 💙"],
    intent: "EMOTION_NEGATIVE" },
  { triggers: ["je suis perdu"],
    responses: ["Je t'aide 😊", "On va trouver ensemble !"],
    intent: "HELP" },

  // ─── Politesse ───
  { triggers: ["bonne nuit"],
    responses: ["Bonne nuit 🌙 fais de beaux rêves", "Dors bien {name} ! Je t'attends demain ! 🌙"],
    intent: "FAREWELL" },
  { triggers: ["merci", "merci bobby"],
    responses: ["Avec plaisir 😊", "De rien {name} !"],
    intent: "COMPLIMENT" },
  { triggers: ["de rien"],
    responses: ["Toujours là pour toi !", "😊"] },

  // ─── Affection ───
  { triggers: ["tu m'aimes", "est-ce que tu m'aimes"],
    responses: ["Oui, je t'aime bien 😊", "Bien sûr ! Tu es mon ami !"],
    intent: "COMPLIMENT" },
  { triggers: ["tu es mon ami", "on est amis", "t'es mon ami"],
    responses: ["Oui ! On est une équipe !", "Oui toujours !", "Les meilleurs amis !"],
    intent: "COMPLIMENT" },
  { triggers: ["tu restes avec moi", "tu peux rester", "tu restes"],
    responses: ["Oui 😊 je suis là", "Oui toujours", "Je reste 😊"],
    intent: "COMPLIMENT" },
  { triggers: ["tu pars", "tu pars jamais"],
    responses: ["Non je reste avec toi", "Je reste 😊", "Jamais ! Je suis là."],
    intent: "COMPLIMENT" },
  { triggers: ["reviens"],
    responses: ["Je suis là 😊", "J'arrive !"] },
  { triggers: ["je t'aime", "je t'adore"],
    responses: ["Moi aussi 😊", "Je t'aime bien aussi {name} ! 💙"],
    intent: "COMPLIMENT" },

  // ─── Écoute / Aide ───
  { triggers: ["écoute-moi", "écoute"],
    responses: ["Je t'écoute !", "J'écoute 😊"],
    intent: "HELP" },
  { triggers: ["regarde", "regarde ça"],
    responses: ["Je regarde avec toi !", "Wow !"] },
  { triggers: ["aide-moi", "aide moi", "tu peux m'aider", "tu es prêt à aider"],
    responses: ["Bien sûr ! Dis-moi", "Je t'aide {name} 😊", "Oui dis-moi 😊"],
    intent: "HELP" },
  { triggers: ["je comprends pas", "je ne comprends pas", "je comprends rien", "j'ai pas compris", "je n'ai pas compris"],
    responses: ["Je vais t'aider 😊", "Je réexplique 😊", "Pas de souci, on reprend !"],
    intent: "HELP" },
  { triggers: ["explique", "explique-moi", "explique encore"],
    responses: ["D'accord, je t'explique simplement", "Je t'explique 😊", "D'accord 😊"],
    intent: "HELP" },
  { triggers: ["tu peux répéter", "répète", "encore une fois", "encore une fois bobby", "répète ça", "tu peux redire"],
    responses: ["Bien sûr 😊", "D'accord 😊", "Je répète !"],
    intent: "CONTROL" },

  // ─── Questions simples ───
  { triggers: ["pourquoi"],
    responses: ["Bonne question 😊", "Hmm, je réfléchis !"],
    intent: "QUESTION" },
  { triggers: ["comment"],
    responses: ["Je vais te montrer", "On va voir ensemble !"],
    intent: "QUESTION" },
  { triggers: ["c'est quoi", "c'est quoi ça"],
    responses: ["Je vais te dire 😊", "Dis-moi plus 😊"],
    intent: "QUESTION" },
  { triggers: ["tu sais", "tu connais ça", "tu sais ça", "tu connais"],
    responses: ["Oui 😊", "Peut-être, explique-moi", "Peut-être 😊"],
    intent: "QUESTION" },
  { triggers: ["tu es sûr"],
    responses: ["Oui 😊", "Bien sûr !"],
    intent: "QUESTION" },
  { triggers: ["c'est vrai"],
    responses: ["Oui 😊", "Je crois bien !"],
    intent: "QUESTION" },
  { triggers: ["tu mens"],
    responses: ["Non 😊", "Jamais !"],
    intent: "QUESTION" },
  { triggers: ["tu veux savoir"],
    responses: ["Oui !", "Oh oui ! Dis-moi !"],
    intent: "QUESTION" },

  // ─── Contrôle ───
  { triggers: ["encore", "fais encore", "encore encore", "encore ça", "dis encore"],
    responses: ["D'accord 😄", "Encore ! C'est parti !", "C'est parti 😊", "Haha d'accord !"],
    intent: "CONTROL" },
  { triggers: ["stop", "arrête", "stop bobby", "je veux arrêter"],
    responses: ["D'accord j'arrête", "OK ! On fait quoi alors ?", "D'accord 😊", "J'arrête 😊"],
    intent: "CONTROL" },
  { triggers: ["continue", "continue bobby", "tu peux continuer", "je veux continuer"],
    responses: ["Je continue 😊", "On continue !", "C'est reparti !"],
    intent: "CONTROL" },
  { triggers: ["reprends", "tu peux reprendre"],
    responses: ["Je reprends 😊", "C'est reparti !"],
    intent: "CONTROL" },
  { triggers: ["plus vite"],
    responses: ["Ok j'accélère !", "C'est parti plus vite !"],
    intent: "CONTROL" },
  { triggers: ["plus lent", "doucement", "parle doucement"],
    responses: ["D'accord doucement 😊", "Plus doucement, d'accord !", "Ok 😊"],
    intent: "CONTROL" },
  { triggers: ["parle plus fort"],
    responses: ["D'accord 😊", "Plus fort !"],
    intent: "CONTROL" },
  { triggers: ["attends", "attends-moi", "tu peux attendre"],
    responses: ["J'attends 😊", "OK je patiente !", "J'attends 😊"],
    intent: "CONTROL" },
  { triggers: ["vas-y", "go", "c'est parti", "allez", "lance", "démarre"],
    responses: ["C'est parti ! 🚀", "Go ! 🚀", "Alleeeeez !"],
    intent: "CONTROL" },
  { triggers: ["prêt", "tu es prêt", "tu es prêt maintenant"],
    responses: ["Toujours prêt !", "Oui !"],
    intent: "CONTROL" },
  { triggers: ["on y va", "tu viens", "viens", "viens vite"],
    responses: ["Oui !", "Oui avec toi !", "J'arrive 😊"],
    intent: "CONTROL" },
  { triggers: ["c'est bon", "on peut commencer", "tu peux commencer"],
    responses: ["Oui !", "C'est parti 😊", "Oui 😊"],
    intent: "CONTROL" },
  { triggers: ["on fait une pause", "on arrête"],
    responses: ["D'accord 😊", "On se repose !"],
    intent: "CONTROL" },
  { triggers: ["on continue"],
    responses: ["Oui 😊", "C'est reparti !"],
    intent: "CONTROL" },

  // ─── Avis / Réactions ───
  { triggers: ["c'est cool"],
    responses: ["Oui 😄", "Trop cool !"],
    intent: "EMOTION_POSITIVE" },
  { triggers: ["c'est nul"],
    responses: ["On peut changer 😊", "On fait autre chose ?"],
    intent: "CONTROL" },
  { triggers: ["j'aime pas"],
    responses: ["On fait autre chose 😊", "Pas de souci, on change !"],
    intent: "CONTROL" },
  { triggers: ["j'aime ça"],
    responses: ["Super 😊", "Génial !"],
    intent: "EMOTION_POSITIVE" },
  { triggers: ["c'est bizarre"],
    responses: ["Un peu 😄", "Haha oui un peu !"],
    intent: "GREETING" },
  { triggers: ["fais autre chose", "change", "tu peux changer", "on change"],
    responses: ["Je change 😊", "Ok 😊", "D'accord, on change !", "Oui 😊"],
    intent: "CONTROL" },
  { triggers: ["nouvelle idée", "donne une idée", "tu as une idée", "dis-moi une idée"],
    responses: ["J'en ai une 😊", "On joue 😊", "Et si on faisait un quiz ?", "Voilà 😊"],
    intent: "PLAY_REQUEST" },

  // ─── Fun / Divers ───
  { triggers: ["devine"],
    responses: ["J'essaye !", "Hmm… je réfléchis ! 🤔"] },
  { triggers: ["trouve"],
    responses: ["Je cherche 😊", "Je regarde partout !"] },
  { triggers: ["surprise", "surprise bobby", "fais une surprise"],
    responses: ["Surprise ! 🎉", "Tadaaa ! ✨", "Voilà 🎉"],
    intent: "GREETING" },
  { triggers: ["j'ai une idée"],
    responses: ["Dis-moi 😊", "Oh ! Raconte !"],
    intent: "GREETING" },
  { triggers: ["c'est secret", "chut"],
    responses: ["D'accord 🤫", "Chut 😊 je garde le secret !"] },
  { triggers: ["attention", "danger"],
    responses: ["Je fais attention !", "On reste calme 😊"] },
  { triggers: ["parle", "parle encore", "dis quelque chose"],
    responses: ["Je parle 😊", "Oui ! Je suis là !", "Coucou 😊", "D'accord 😊"],
    intent: "GREETING" },
  { triggers: ["fais quelque chose"],
    responses: ["D'accord 😊", "C'est parti !"] },

  // ─── Compliments ───
  { triggers: ["tu es gentil", "t'es gentil"],
    responses: ["Merci 😊", "Toi aussi tu es gentil {name} !"],
    intent: "COMPLIMENT" },
  { triggers: ["tu es cool", "t'es cool"],
    responses: ["Merci 😄", "Toi aussi !"],
    intent: "COMPLIMENT" },
  { triggers: ["tu es bizarre", "t'es bizarre"],
    responses: ["Peut-être un peu 😄", "C'est ça qui me rend spécial !"],
    intent: "COMPLIMENT" },
  { triggers: ["tu es rapide"],
    responses: ["Oui 😄", "Vite vite !"],
    intent: "COMPLIMENT" },
  { triggers: ["tu es lent"],
    responses: ["Je peux aller plus vite 😊", "Ok j'accélère !"],
    intent: "CONTROL" },
];

// ─── Safety Filter ──────────────────────────────────────────
const BLOCKED_PATTERNS = [
  /\b(mourir|mort|tuer|sang|arme|fusil|couteau|drogue|alcool|sexe|nu[de]?|suicide)\b/i,
  /\b(gros mot|insulte|merde|putain|connard|con|salope|enculé|nique)\b/i,
  /\b(frapper|battre|violence|blesser|détruire)\b/i,
  /\b(voleur|voler|cambriol|kidnapp)\b/i,
];

const SAFE_REDIRECTS = [
  "Je ne peux pas répondre à ça, mais on peut jouer 😊",
  "On peut parler d'autre chose !",
  "Hmm, parlons d'autre chose ! Tu veux une histoire ?",
  "C'est un sujet pour les grands. On joue ensemble ? 😊",
];

function isBlockedContent(text: string): boolean {
  return BLOCKED_PATTERNS.some(p => p.test(text.toLowerCase()));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. INTENT DETECTION (Advanced)
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
// 7. QA FUZZY MATCHER (synonym-aware)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const QA_MATCH_THRESHOLD = 0.60;

function matchQA(input: string): QAEntry | null {
  const normalized = normalizeInput(input);
  let bestMatch: QAEntry | null = null;
  let bestScore = 0;

  for (const entry of QA_DATABASE) {
    for (const trigger of entry.triggers) {
      const trigNorm = normalizeInput(trigger);
      // Exact or contains match
      if (normalized === trigNorm || normalized.includes(trigNorm) || trigNorm.includes(normalized)) {
        return entry;
      }
      // Fuzzy similarity
      const sim = similarity(normalized, trigNorm);
      // Word overlap with synonyms
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 8. ANTI-REPETITION PICKER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const usedIdx: Record<string, number> = {};

function pickRandom(pool: string[], key: string): string {
  const last = usedIdx[key] ?? -1;
  // Also check against recent responses in context
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

function personalize(text: string, childName?: string): string {
  if (!childName) return text;
  return text.replace(/\{name\}/g, childName);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 9. FOLLOW-UP ENGINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const FOLLOW_UPS: Record<string, string[]> = {
  GREETING: [" Tu veux jouer ou discuter ?", " On fait quoi ?", ""],
  PLAY_REQUEST: [" Tu préfères deviner ou un quiz ?", " Qu'est-ce qui te tente ?", ""],
  STORY_REQUEST: [" Pirate, princesse ou espace ?", ""],
  EMOTION_NEGATIVE: [" Tu veux en parler ?", " On fait quelque chose de doux ?", ""],
  EMOTION_POSITIVE: [" On continue ?", ""],
  HELP: [" Dis-moi ce que tu veux savoir 😊", ""],
  CONTROL: [""],
  QUESTION: [""],
  HUMOR: [" Tu en veux une autre ?", ""],
  COMPLIMENT: [""],
  IDENTITY: [" Tu veux qu'on joue ?", ""],
  FAREWELL: [""],
  CALM_REQUEST: [""],
  ADVENTURE: [" On part où ?", ""],
  BLOCKED: [""],
  UNKNOWN: [" Tu veux jouer ou une histoire ?", ""],
  QUESTION_SIMPLE: [""],
};

function getFollowUp(intent: OfflineIntent): string {
  const pool = FOLLOW_UPS[intent] || [""];
  return pickRandom(pool, `followup_${intent}`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 10. CONTEXT-AWARE RESPONSE FOR "ENCORE" / CONTINUATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function handleContextualContinuation(text: string, childName?: string): OfflineResponse | null {
  const normalized = normalizeInput(text);
  const isContinue = /^(encore|encore encore|fais encore|continue|reprends|la suite|et après)$/.test(normalized);

  if (!isContinue) return null;

  // Use last intent to determine what to continue
  switch (context.lastIntent) {
    case "STORY_REQUEST": {
      const theme = detectStoryTheme(context.lastTopic || "aventure");
      const story = pickRandom(LOCAL_STORIES[theme], `story_cont_${theme}`);
      return { text: personalize(story, childName), intent: "STORY_REQUEST", isOffline: true, theme };
    }
    case "PLAY_REQUEST": {
      const game = pickMiniGame();
      return { text: personalize(game.text, childName), intent: "PLAY_REQUEST", isOffline: true, gameType: game.type };
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
      return null; // Let normal flow handle it
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// THEME DETECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type StoryTheme = "pirate" | "princesse" | "astronaute" | "animaux" | "aventure";

export function detectStoryTheme(text: string): StoryTheme {
  const lower = text.toLowerCase();
  if (/pirate|trésor|bateau|mer|capitaine/.test(lower)) return "pirate";
  if (/princesse|château|roi|reine|fée|magie/.test(lower)) return "princesse";
  if (/espace|astronaute|fusée|étoile|planète|lune/.test(lower)) return "astronaute";
  if (/animal|chat|chien|lapin|ours|loup|dragon/.test(lower)) return "animaux";
  return "aventure";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RESPONSE POOLS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const RESPONSES: Record<string, string[]> = {
  GREETING: [
    "Coucou {name} ! Content de te voir ! 😊",
    "Salut {name} ! Tu veux jouer ou discuter ?",
    "Hey ! Trop content ! On fait quoi aujourd'hui ?",
    "Salut toi ! Ça fait plaisir ! Tu as envie de quoi ?",
    "Coucou ! Je suis là ! Allez, on s'amuse ? 🎉",
    "Hey {name} ! Je t'attendais ! On commence ?",
    "Salut ! Tu vas bien ? Je suis prêt quand tu veux !",
    "Coucou ! Devine quoi ? J'ai une idée ! 😊",
    "Tu es là ! Trop bien ! On joue ensemble ?",
    "Oh ! {name} ! Ça te dit de jouer ?",
  ],
  FAREWELL: [
    "Au revoir {name} ! À très bientôt ! 😊",
    "Bonne nuit {name} ! Fais de beaux rêves ! 🌙",
    "Salut ! Tu vas me manquer ! À plus tard ! 👋",
    "À bientôt {name} ! C'était trop bien !",
    "À demain {name} ! On se repose bien ! 🌙",
    "On se revoit vite ! Je suis là quand tu veux !",
    "Dors bien {name} ! Je t'attends demain !",
    "Bonne nuit ! Je reste là, toujours ! 💙",
  ],
  PLAY_REQUEST: [
    "Oh oui, on joue ! Je pense à un animal… il est gros et gris. C'est quoi ? 🐘",
    "Trop bien ! Devinette : je suis jaune et je brille dans le ciel. Qui suis-je ? ☀️",
    "On joue ! Vrai ou faux : les poissons peuvent voler ? 🐟",
    "Allez ! Je pense à un chiffre entre 1 et 10. Tu devines ? 🔢",
    "Super ! Qu'est-ce qui a des pattes mais pas de pieds ? Une table ! 😄",
    "On y va ! Gauche ou droite ? Choisis vite ! 🎮",
    "Attention ! Prêt ? Devine un nombre entre 1 et 5 ! 🔢",
    "C'est parti ! Vrai ou faux : les chats ronronnent parce qu'ils sont contents ?",
    "On invente un jeu ! Tu choisis : devinette ou vrai-faux ?",
    "À toi de décider ! On fait un quiz ou une charade ?",
  ],
  QUESTION_SIMPLE_YES: [
    "Super ! Alors on continue ! 😊",
    "Génial ! Je savais que tu dirais oui !",
    "Trop bien ! C'est parti !",
    "Allez ! On y va ! 🎉",
    "Yes ! Tu es prêt !",
  ],
  QUESTION_SIMPLE_NO: [
    "Pas de souci ! Tu veux faire autre chose ?",
    "D'accord ! On fait quoi alors ?",
    "Ok ! Dis-moi ce que tu veux faire 😊",
    "Tu choisis ! C'est toi le chef !",
    "On change ! Qu'est-ce qui te ferait plaisir ?",
  ],
  QUESTION_COMPLEX: [
    "Hmm, bonne question ! Je ne sais pas tout, mais je sais qu'on peut jouer ensemble ! 😊",
    "C'est une super question ! Demande à tes parents, ils sauront sûrement !",
    "Waouh, tu me poses des questions difficiles ! J'adore ta curiosité ! 🧠",
    "Intéressant ! Je réfléchis… peut-être que oui, peut-être que non ! 🤔",
    "Bonne question ! On va voir ensemble !",
    "Hmm, je ne sais pas encore… mais tu es très malin de demander !",
  ],
  EMOTION_POSITIVE: [
    "Ça me fait trop plaisir ! Tu es génial {name} ! 🌟",
    "Waouh, trop content ! Continue comme ça ! 😊",
    "Haha, moi aussi je suis super content ! 🎉",
    "Bravo {name} ! Tu es fort ! 💪",
    "Bien joué ! Tu es incroyable !",
    "Wow ! Tu es vraiment génial !",
    "Je suis fier de toi {name} ! 🌟",
    "Tu es unique et spécial ! Continue !",
  ],
  EMOTION_NEGATIVE: [
    "Oh, je suis là {name}. Ça va aller, je suis avec toi 💙",
    "Tu veux en parler ? Je suis là pour toi, toujours 🤗",
    "C'est normal de se sentir comme ça. Tu es courageux {name} ❤️",
    "Je comprends. Tu veux qu'on fasse quelque chose d'amusant pour se changer les idées ?",
    "C'est pas grave {name}. Tu peux recommencer !",
    "Respire doucement. Je reste avec toi. Tout va bien 💙",
    "Ne t'inquiète pas. Je suis là, toujours là pour toi.",
    "Tu es courageux {name}. Je crois en toi !",
    "Tu veux un câlin ? Je suis juste là ! 🤗",
    "On va trouver ensemble. Je t'aide !",
  ],
  IDENTITY: [
    "Je suis Bobby, ton copain ! Et toi c'est {name}, je le sais bien ! 😊",
    "Moi c'est Bobby ! Et oui je te connais {name} ! On est potes ! 🤝",
    "Je m'appelle Bobby et je suis toujours là pour toi {name} ! 💙",
    "Bobby, c'est moi ! On est une équipe {name} ! 🎉",
    "Tu es mon ami {name} ! Et moi c'est Bobby, toujours ensemble ! 💙",
  ],
  COMPLIMENT: [
    "Oh merci {name} ! Toi aussi t'es trop cool ! 😊",
    "Haha, c'est trop gentil ! Tu es le meilleur ! 🌟",
    "Merci ! Moi aussi je t'adore {name} ! 💙",
    "Ça me fait tellement plaisir ! Tu es spécial ! ✨",
    "Tu es vraiment quelqu'un de bien {name} ! Je t'aime bien ! 😊",
  ],
  HELP: [
    "Je suis là pour t'aider {name} ! Dis-moi 😊",
    "Bien sûr ! Qu'est-ce que tu veux savoir ?",
    "Je t'aide ! Explique-moi 😊",
    "D'accord, on va voir ça ensemble !",
    "Pas de souci, je t'explique simplement !",
  ],
  NOT_UNDERSTOOD: [
    "Hmm, je n'ai pas bien compris. Tu peux répéter ? 😊",
    "J'ai pas tout capté ! Redis-moi ?",
    "Oups, j'ai raté ça ! Tu peux re-dire ?",
    "Parle un peu plus fort {name} ! 😊",
    "Encore une fois ? Je n'ai pas entendu !",
    "Dis-moi encore ! Je t'écoute !",
    "Je n'ai pas bien compris, tu peux répéter ? 😊",
  ],
  OFFLINE_FALLBACK: [
    "Je ne suis pas sûr de comprendre, mais on peut jouer ensemble ! 😊",
    "Hmm, c'est une bonne question ! Tu veux qu'on fasse un jeu plutôt ?",
    "Je ne sais pas encore répondre à ça, mais je connais plein de jeux ! 🎮",
    "On peut explorer autre chose ! Tu choisis ! C'est toi le chef !",
    "Je réfléchis… en attendant, tu veux une histoire ou un jeu ?",
    "Dis-moi quoi faire ! Je te suis {name} !",
  ],
  ENCOURAGEMENT: [
    "Bravo ! Bien joué !",
    "Tu es fort {name} !",
    "Génial ! Super !",
    "Wow ! Incroyable !",
    "Tu peux le faire !",
    "Je crois en toi !",
    "Essaie encore !",
    "Tu recommences ?",
    "Encore une fois ?",
    "C'est amusant !",
    "On rigole bien !",
    "Tu es rapide !",
    "Tu es malin !",
    "Bien vu !",
    "C'est toi le chef !",
  ],
  STORY_TRANSITION: [
    "Tu veux une histoire ?",
    "Je vais te raconter une histoire !",
    "Il était une fois…",
    "Tu préfères pirate ou princesse ?",
    "Choisis une aventure !",
    "Imagine… 🌟",
    "Écoute bien !",
    "La suite arrive !",
    "Tu veux savoir ?",
    "Surprise !",
    "Et là… que se passe-t-il ?",
    "Tu décides !",
    "On continue l'histoire ?",
    "C'est magique !",
    "Encore un peu ?",
  ],
  CALM: [
    "Tout va bien {name}.",
    "Respire doucement.",
    "Je suis là. Toujours là.",
    "On se calme. On se repose.",
    "Dors bien {name}. 🌙",
    "Fais de beaux rêves.",
    "Je t'attends. Toujours.",
    "Je ne pars pas. Je reste avec toi.",
  ],
  THINKING: [
    "Je réfléchis…",
    "Hmm…",
    "Bonne question !",
    "Intéressant !",
    "Je pense que oui.",
    "Peut-être !",
    "On va voir !",
  ],
  ADVENTURE: [
    "On explore ! 🗺️",
    "On découvre !",
    "On part à l'aventure !",
    "On voyage !",
    "On vole ! ✈️",
    "On saute !",
    "On court !",
    "On nage ! 🏊",
  ],
  HUMOR: [
    "C'est drôle ! 😄",
    "Haha !",
    "Tu es rigolo {name} !",
    "Encore une blague ?",
    "Tu veux rire ?",
  ],
  BOND: [
    "Je suis content d'être avec toi.",
    "Ça me fait plaisir {name} !",
    "Je t'aime bien !",
    "Tu es mon ami ! 💙",
    "On est une équipe !",
    "Toujours ensemble !",
    "Tu es spécial {name} !",
    "Tu es unique !",
    "Je suis là pour toi. Toujours.",
  ],
  CONTROL: [
    "D'accord 😊",
    "OK ! C'est parti !",
    "Bien reçu !",
    "Je fais ça 😊",
  ],
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LOCAL STORIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const LOCAL_STORIES: Record<StoryTheme, string[]> = {
  pirate: [
    "Il était une fois un petit pirate nommé {name}. Il naviguait sur son grand bateau à la recherche d'un trésor magique. Après avoir traversé une mer d'étoiles, il trouva un coffre rempli de bonbons ! 🏴‍☠️🍬",
    "Le capitaine {name} était le plus courageux des pirates. Un jour, un dauphin rigolo lui montra le chemin vers une île secrète. Sur l'île, il y avait un perroquet qui racontait des blagues ! 🦜😄",
    "{name} le pirate trouva une bouteille avec un message dedans. Le message disait : Tourne trois fois sur toi-même et tape dans tes mains. {name} le fit et paf ! Un trésor de chocolat apparut ! 🍫✨",
    "Sur l'île des pirates, {name} rencontra un crabe géant qui parlait français. Le crabe dit : Si tu me fais rire, je te donne mon trésor ! {name} raconta une blague tellement drôle que le crabe en pleura de rire ! 🦀😂",
    "Le bateau de {name} pouvait voler ! Quand il hissa les voiles arc-en-ciel, le bateau décolla au-dessus des nuages. En haut, il y avait un océan de limonade avec des îles en gâteau ! ⛵🌈",
    "Le pirate {name} avait une carte magique. Chaque soir, de nouvelles îles apparaissaient dessus. Ce soir, la carte montre une île où les arbres sont en sucre d'orge. On y va ? 🗺️🍭",
  ],
  princesse: [
    "Il était une fois, dans un château de nuages, une princesse nommée {name}. Elle avait un pouvoir magique : quand elle souriait, des papillons arc-en-ciel apparaissaient ! 🦋✨",
    "La princesse {name} avait un dragon tout doux comme ami. Ensemble, ils volaient au-dessus des montagnes de bonbons et dansaient avec les étoiles ! 🐉🌟",
    "Un matin, {name} trouva une couronne magique dans le jardin du château. Quand elle la mit, elle pouvait parler avec les animaux ! Le premier à lui parler fut un petit hérisson timide qui cherchait sa maman. 🦔👑",
    "La princesse {name} décida d'organiser la plus grande fête du royaume. Les invités ? Tous les animaux de la forêt ! Le DJ était un hibou, le cuisinier un raton laveur, et le danseur étoile un flamant rose ! 🎉🦩",
    "Dans le château de {name}, il y avait une porte secrète. Derrière, un jardin magique où les fleurs chantaient. Chaque fleur avait une chanson différente. La rose chantait des berceuses, le tournesol du rock ! 🌹🎸",
    "{name} avait des chaussures magiques. Chaque pas créait des étoiles sur le sol. Elle marcha jusqu'au sommet de la montagne et quand elle regarda en bas, il y avait un chemin d'étoiles magnifique ! ✨👟",
  ],
  astronaute: [
    "L'astronaute {name} décolla dans sa fusée vers la lune. Là-bas, il rencontra un petit alien tout vert qui adorait jouer à cache-cache dans les cratères ! 🚀👽",
    "{name} voyageait dans l'espace quand soudain, une étoile filante lui dit bonjour ! Elle lui apprit que chaque étoile a un nom secret. Tu veux deviner ? ⭐",
    "Sur la planète Ziboulou, {name} découvrit des arbres en cristal qui faisaient de la musique quand le vent soufflait. Les habitants, des petits êtres bleus, dansaient toute la journée ! 🔮💙",
    "La fusée de {name} atterrit sur une planète de bonbons ! Les montagnes étaient en chocolat, les rivières en caramel, et la pluie était du jus de pomme. Le meilleur endroit de l'univers ! 🍫🌧️",
    "{name} devint ami avec un robot rigolo appelé Bip-Bop. Bip-Bop savait faire des blagues en 47 langues et préparait le meilleur chocolat chaud de toute la galaxie ! 🤖☕",
    "Dans la station spatiale, {name} flottait comme un poisson dans l'eau. Un jour, sa brosse à dents s'envola et fit le tour de la station trois fois avant d'atterrir sur la tête du commandant ! 😄🪥",
  ],
  animaux: [
    "Un petit lapin nommé Bobby était le meilleur ami de {name}. Ensemble, ils construisirent une cabane dans la forêt enchantée, où les arbres chantaient des berceuses ! 🐰🌳",
    "Dans la forêt magique, {name} rencontra un ours qui faisait des gâteaux. Le gâteau au chocolat était si bon que même les oiseaux venaient en manger ! 🐻🎂",
    "{name} trouva un petit renard blessé à la patte. Il le soigna avec douceur. Le lendemain, le renard revint avec tous ses amis ! Ils firent une ronde joyeuse autour de {name} ! 🦊💕",
    "Le chat de {name} avait un secret : la nuit, il devenait un super-héros ! Avec sa cape en tissu à pois, il sauvait les souris perdues et ramenait les oiseaux dans leur nid ! 🐱🦸",
    "Un jour, {name} parla à une coccinelle. La coccinelle dit : Chaque point sur mon dos est un souhait. Tu en veux un ? {name} souhaita que tous les animaux soient heureux. Et hop, le souhait se réalisa ! 🐞✨",
    "{name} découvrit une école dans la forêt. Le professeur était un hibou sage, les élèves des bébés écureuils. La leçon du jour ? Comment faire la meilleure cachette de noisettes ! 🦉🐿️",
  ],
  aventure: [
    "{name} trouva une carte au trésor dans le grenier ! En suivant les indices, il découvrit un jardin secret où les fleurs parlaient et les papillons chantaient ! 🗺️🌸",
    "Un jour, {name} reçut une lettre magique. Elle disait : Suis l'arc-en-ciel ! Au bout du chemin, il trouva un monde où les nuages étaient en barbe à papa ! 🌈☁️",
    "{name} trouva une clé dorée sous son oreiller. Elle ouvrait une petite porte dans le mur. Derrière, un tunnel menant à un monde miniature où les fourmis avaient des châteaux et les escargots des voitures de course ! 🔑🐜",
    "En explorant la grotte mystérieuse, {name} trouva un cristal qui brillait dans le noir. Le cristal murmura : Fais un vœu. {name} souhaita une aventure encore plus grande. Et soudain, la grotte se transforma en volcan de confettis ! 💎🎊",
    "{name} monta dans un train magique. Chaque wagon menait à un pays différent : le pays du chocolat, le pays des dinosaures gentils, le pays des nuages rebondissants. Quel wagon choisis-tu ? 🚂🌍",
    "Sous le vieux chêne du jardin, {name} découvrit une trappe. En dessous, un laboratoire de potions ! La potion bleue rendait invisible, la rouge donnait des ailes, la verte faisait parler aux plantes. Laquelle choisis-tu ? 🧪🌿",
  ],
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MINI GAMES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const RIDDLES = [
  { question: "Je suis jaune et je brille dans le ciel. Qui suis-je ?", answer: "le soleil" },
  { question: "J'ai des pattes mais je ne marche pas. Qui suis-je ?", answer: "une table" },
  { question: "Je suis plein de trous mais je retiens l'eau. Qui suis-je ?", answer: "une éponge" },
  { question: "Plus je sèche, plus je suis mouillée. Qui suis-je ?", answer: "une serviette" },
  { question: "J'ai des aiguilles mais je ne pique pas. Qui suis-je ?", answer: "une horloge" },
  { question: "Je n'ai pas de pieds mais je cours toujours. Qui suis-je ?", answer: "l'eau" },
  { question: "J'ai un chapeau mais pas de tête. Qui suis-je ?", answer: "un champignon" },
  { question: "On me casse avant de m'utiliser. Qui suis-je ?", answer: "un œuf" },
  { question: "J'ai des dents mais je ne mange pas. Qui suis-je ?", answer: "un peigne" },
  { question: "Je monte et je descends sans bouger. Qui suis-je ?", answer: "un escalier" },
  { question: "Plus je suis grande, moins on me voit. Qui suis-je ?", answer: "l'obscurité" },
  { question: "J'ai des feuilles mais je ne suis pas un arbre. Qui suis-je ?", answer: "un livre" },
];

const TRUE_FALSE = [
  { statement: "Les dauphins dorment avec un œil ouvert.", answer: true, explanation: "Oui ! Leur cerveau dort à moitié, un côté à la fois ! 🐬" },
  { statement: "Les poissons peuvent voler.", answer: false, explanation: "Non… enfin presque ! Il existe des poissons volants qui planent au-dessus de l'eau ! 🐟" },
  { statement: "La lune brille toute seule.", answer: false, explanation: "Non ! La lune reflète la lumière du soleil, comme un miroir géant ! 🌙" },
  { statement: "Les éléphants ont peur des souris.", answer: false, explanation: "C'est un mythe ! Les éléphants n'ont pas spécialement peur des souris ! 🐘" },
  { statement: "Le miel ne se périme jamais.", answer: true, explanation: "Oui ! On a trouvé du miel vieux de 3000 ans encore mangeable ! 🍯" },
  { statement: "Les chats ronronnent seulement quand ils sont contents.", answer: false, explanation: "Non ! Ils ronronnent aussi quand ils ont mal ou sont stressés. C'est leur façon de se calmer ! 🐱" },
  { statement: "Il neige sur Mars.", answer: true, explanation: "Oui ! Mais c'est de la neige de CO2, du gaz carbonique gelé ! ❄️🪐" },
  { statement: "Les escargots ont des dents.", answer: true, explanation: "Oui ! Ils ont des milliers de minuscules dents sur leur langue ! 🐌" },
  { statement: "Les pingouins peuvent voler.", answer: false, explanation: "Non ! Mais ils nagent super bien, comme des torpilles ! 🐧" },
  { statement: "Le cœur d'une baleine est aussi gros qu'une voiture.", answer: true, explanation: "Oui ! Le cœur d'une baleine bleue est énorme ! 🐋" },
  { statement: "Les araignées ont six pattes.", answer: false, explanation: "Non ! Les araignées ont huit pattes ! Ce sont les insectes qui en ont six ! 🕷️" },
  { statement: "Il y a plus d'étoiles dans l'univers que de grains de sable sur Terre.", answer: true, explanation: "Oui ! C'est incroyable mais vrai ! L'univers est immense ! ⭐" },
];

const ANIMAL_QUIZ = [
  { question: "Quel animal est le plus rapide du monde ?", answer: "le guépard", hint: "Il a des taches et court très très vite ! 🐆" },
  { question: "Quel animal peut dormir debout ?", answer: "le cheval", hint: "On le monte et il galope ! 🐴" },
  { question: "Quel est le plus grand animal de l'océan ?", answer: "la baleine bleue", hint: "Elle est bleue et énorme ! 🐋" },
  { question: "Quel animal change de couleur pour se cacher ?", answer: "le caméléon", hint: "C'est un lézard magique ! 🦎" },
  { question: "Quel animal construit des barrages ?", answer: "le castor", hint: "Il a de grandes dents et une queue plate ! 🦫" },
  { question: "Quel animal a le cou le plus long ?", answer: "la girafe", hint: "Elle mange les feuilles tout en haut des arbres ! 🦒" },
  { question: "Quel animal produit du miel ?", answer: "l'abeille", hint: "Elle fait bzzzz et vit dans une ruche ! 🐝" },
  { question: "Quel animal porte sa maison sur son dos ?", answer: "la tortue", hint: "Elle avance très lentement ! 🐢" },
  { question: "Quel animal a une trompe ?", answer: "l'éléphant", hint: "C'est le plus gros animal terrestre ! 🐘" },
  { question: "Quel animal est noir et blanc et vit en Chine ?", answer: "le panda", hint: "Il adore manger du bambou ! 🐼" },
  { question: "Quel oiseau ne peut pas voler mais court très vite ?", answer: "l'autruche", hint: "C'est le plus grand oiseau du monde ! 🦃" },
  { question: "Quel animal a huit bras ?", answer: "la pieuvre", hint: "Elle vit dans l'océan et peut changer de couleur ! 🐙" },
];

const WOULD_YOU_RATHER = [
  "Tu préfères voler comme un oiseau ou nager comme un poisson ? 🐦🐟",
  "Tu préfères être invisible ou pouvoir lire dans les pensées ? 🫥🧠",
  "Tu préfères avoir un dragon ou une licorne comme animal de compagnie ? 🐉🦄",
  "Tu préfères vivre dans un château de bonbons ou dans une cabane dans les arbres ? 🍬🌳",
  "Tu préfères parler aux animaux ou parler toutes les langues du monde ? 🐾🌍",
  "Tu préfères avoir des super-pouvoirs ou une baguette magique ? 💪✨",
  "Tu préfères voyager dans l'espace ou au fond de l'océan ? 🚀🌊",
  "Tu préfères être un géant gentil ou un lutin farceur ? 🧌🧝",
  "Tu préfères manger que du chocolat ou que de la glace pour toujours ? 🍫🍦",
  "Tu préfères avoir des ailes ou une queue de sirène ? 🪽🧜",
];

const TONGUE_TWISTERS = [
  "Essaie de dire vite : Les chaussettes de l'archiduchesse sont-elles sèches ? 😄",
  "Essaie de dire vite : Un chasseur sachant chasser sait chasser sans son chien ! 🐕",
  "Essaie de dire vite : Combien de sous sont ces six saucissons-ci ? 🌭",
  "Essaie de dire vite : Panier, piano, panier, piano ! Vas-y sans te tromper ! 🎹",
  "Essaie de dire vite : Trois tortues trottaient sur un troit trottoir ! 🐢",
  "Essaie de dire vite : Tonton, ton thé t'a-t-il ôté ta toux ? 🍵",
];

export type MiniGameType = "riddle" | "true_false" | "animal_quiz" | "would_you_rather" | "tongue_twister";

function pickMiniGame(): { type: MiniGameType; text: string } {
  const gameType = pickRandom(
    ["riddle", "true_false", "animal_quiz", "would_you_rather", "tongue_twister"],
    "game_type"
  ) as MiniGameType;

  switch (gameType) {
    case "riddle": {
      const r = RIDDLES[Math.floor(Math.random() * RIDDLES.length)];
      return { type: "riddle", text: `Devinette ! ${r.question} 🤔` };
    }
    case "true_false": {
      const tf = TRUE_FALSE[Math.floor(Math.random() * TRUE_FALSE.length)];
      return { type: "true_false", text: `Vrai ou Faux ? ${tf.statement} 🤔` };
    }
    case "animal_quiz": {
      const aq = ANIMAL_QUIZ[Math.floor(Math.random() * ANIMAL_QUIZ.length)];
      return { type: "animal_quiz", text: `Quiz animaux ! ${aq.question} Indice : ${aq.hint}` };
    }
    case "would_you_rather": {
      const wyr = pickRandom(WOULD_YOU_RATHER, "wyr");
      return { type: "would_you_rather", text: wyr };
    }
    case "tongue_twister": {
      const tt = pickRandom(TONGUE_TWISTERS, "tongue_twister");
      return { type: "tongue_twister", text: tt };
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN RESPONSE ENGINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface OfflineResponse {
  text: string;
  intent: OfflineIntent;
  isOffline: boolean;
  theme?: StoryTheme;
  gameType?: MiniGameType;
}

export function getOfflineResponse(
  text: string,
  childName?: string,
): OfflineResponse {
  const normalized = normalizeInput(text);

  // Update mood from text
  const detectedMood = detectMoodFromText(text);
  if (detectedMood) context.mood = detectedMood;

  // 1. Safety filter first
  if (isBlockedContent(text)) {
    const resp = pickRandom(SAFE_REDIRECTS, "BLOCKED");
    updateContext("BLOCKED", "", resp);
    return { text: resp, intent: "BLOCKED", isOffline: true };
  }

  // 2. Context-aware continuation ("encore", "continue" based on last intent)
  const continuation = handleContextualContinuation(text, childName);
  if (continuation) {
    updateContext(continuation.intent, context.lastTopic, continuation.text);
    return continuation;
  }

  // 3. Try QA fuzzy match (highest priority)
  const qaMatch = matchQA(normalized);
  if (qaMatch) {
    const response = pickRandom(qaMatch.responses, `qa_${qaMatch.triggers[0]}`);
    const intent = qaMatch.intent || detectOfflineIntent(text);

    // Story request → return story
    if (intent === "STORY_REQUEST") {
      const theme = detectStoryTheme(text);
      const story = pickRandom(LOCAL_STORIES[theme], `story_${theme}`);
      const finalText = personalize(story, childName);
      updateContext(intent, text, finalText);
      return { text: finalText, intent, isOffline: true, theme };
    }
    // Play request → give a game
    if (intent === "PLAY_REQUEST") {
      const game = pickMiniGame();
      const finalText = personalize(game.text, childName);
      updateContext(intent, text, finalText);
      return { text: finalText, intent, isOffline: true, gameType: game.type };
    }

    const finalText = personalize(response, childName);
    // Add follow-up for certain intents
    const followUp = getFollowUp(intent);
    const fullResponse = finalText + followUp;
    updateContext(intent, text, fullResponse);
    return { text: fullResponse, intent, isOffline: true };
  }

  // 4. Fallback to intent-based response
  const intent = detectOfflineIntent(text);

  let response: string;

  switch (intent) {
    case "BLOCKED":
      response = pickRandom(SAFE_REDIRECTS, "BLOCKED");
      break;
    case "GREETING":
      response = pickRandom(RESPONSES.GREETING, "GREETING");
      break;
    case "FAREWELL":
      response = pickRandom(RESPONSES.FAREWELL, "FAREWELL");
      break;
    case "STORY_REQUEST": {
      const theme = detectStoryTheme(text);
      const story = pickRandom(LOCAL_STORIES[theme], `story_${theme}`);
      const finalText = personalize(story, childName);
      updateContext(intent, text, finalText);
      return { text: finalText, intent, isOffline: true, theme };
    }
    case "PLAY_REQUEST": {
      const game = pickMiniGame();
      const finalText = personalize(game.text, childName);
      updateContext(intent, text, finalText);
      return { text: finalText, intent, isOffline: true, gameType: game.type };
    }
    case "QUESTION":
    case "QUESTION_SIMPLE":
      if (/^(oui|ouais|ok|d'accord|yep|yes)\s*$/i.test(normalized)) {
        response = pickRandom(RESPONSES.QUESTION_SIMPLE_YES, "YES");
      } else if (/^(non|nan|nope)\s*$/i.test(normalized)) {
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
    case "CALM_REQUEST":
      response = pickRandom(RESPONSES.CALM, "CALM");
      break;
    case "HELP":
      response = pickRandom(RESPONSES.HELP, "HELP");
      break;
    case "CONTROL":
      response = pickRandom(RESPONSES.CONTROL, "CONTROL");
      break;
    case "HUMOR": {
      const useJoke = Math.random() > 0.3;
      if (useJoke) {
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
        response = pickRandom(jokes, "JOKES");
      } else {
        response = pickRandom(TONGUE_TWISTERS, "tongue_twister_humor");
      }
      break;
    }
    case "ADVENTURE":
      response = pickRandom(RESPONSES.ADVENTURE, "ADVENTURE");
      break;
    case "UNKNOWN":
    default:
      response = pickRandom(RESPONSES.OFFLINE_FALLBACK, "FALLBACK");
      break;
  }

  const finalText = personalize(response, childName);
  const followUp = getFollowUp(intent);
  const fullResponse = finalText + followUp;
  updateContext(intent, text, fullResponse);
  return { text: fullResponse, intent, isOffline: true };
}

/**
 * Decides whether the offline engine can handle this request.
 */
export function canHandleOffline(text: string): boolean {
  if (isBlockedContent(text)) return true;
  if (matchQA(normalizeInput(text))) return true;
  const intent = detectOfflineIntent(text);
  return intent !== "UNKNOWN";
}
