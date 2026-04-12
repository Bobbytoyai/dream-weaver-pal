/**
 * Interest Tracker — Détecte et suit les centres d'intérêt de l'enfant
 * pour générer des questions de suivi intelligentes et contextuelles.
 * 
 * Flux: chaque réponse → extractInterests() → accumuler scores → 
 *       getSmartFollowUp() génère une question basée sur les intérêts dominants
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTEREST CATEGORIES + DETECTION KEYWORDS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface InterestProfile {
  scores: Record<string, number>;       // topic → accumulated score
  recentMentions: string[];             // last 10 topics mentioned
  followUpsAsked: Set<string>;          // avoid repeating same follow-up
  lastFollowUpTopic: string | null;
  conversationDepth: number;            // how deep we are in a topic chain
  currentTopicChain: string | null;     // topic we're exploring in depth
}

const profile: InterestProfile = {
  scores: {},
  recentMentions: [],
  followUpsAsked: new Set(),
  lastFollowUpTopic: null,
  conversationDepth: 0,
  currentTopicChain: null,
};

export const INTEREST_KEYWORDS_PUBLIC: Record<string, { keywords: string[]; emoji: string }> = {
  animaux:    { keywords: ["animal", "animaux", "chat", "chien", "lapin", "ours", "loup", "dragon", "dinosaure", "cheval", "poisson", "oiseau", "tortue", "hamster", "serpent", "requin", "dauphin", "baleine", "lion", "tigre", "éléphant", "girafe", "singe", "perroquet", "papillon", "fourmi", "araignée", "abeille"], emoji: "🐾" },
  espace:     { keywords: ["espace", "astronaute", "fusée", "étoile", "planète", "lune", "soleil", "galaxie", "alien", "mars", "jupiter", "satellite", "comète", "trou noir", "nasa", "cosmonaute"], emoji: "🚀" },
  nature:     { keywords: ["forêt", "montagne", "rivière", "fleur", "arbre", "jardin", "mer", "océan", "plage", "volcan", "lac", "île", "cascade", "grotte", "désert", "jungle", "savane"], emoji: "🌿" },
  science:    { keywords: ["science", "expérience", "chimie", "physique", "atome", "molécule", "microscope", "laboratoire", "invention", "découverte", "robot", "machine", "électricité", "magnétique", "gravité"], emoji: "🔬" },
  musique:    { keywords: ["musique", "chanson", "chanter", "guitare", "piano", "batterie", "instrument", "concert", "danse", "danser", "rythme", "mélodie", "rap", "rock"], emoji: "🎵" },
  sport:      { keywords: ["foot", "football", "ballon", "courir", "nager", "vélo", "sport", "basket", "tennis", "judo", "karaté", "gym", "escalade", "ski", "natation", "match", "but", "gagner"], emoji: "⚽" },
  art:        { keywords: ["dessiner", "dessin", "peinture", "peindre", "couleur", "crayon", "art", "sculpture", "créer", "bricolage", "origami", "collage", "aquarelle"], emoji: "🎨" },
  aventure:   { keywords: ["aventure", "pirate", "trésor", "explorateur", "carte", "mission", "ninja", "super-héros", "chevalier", "épée", "magie", "sorcier", "quête", "mystère", "secret"], emoji: "⚔️" },
  technologie:{ keywords: ["ordinateur", "jeu vidéo", "console", "minecraft", "tablette", "téléphone", "internet", "code", "programmer", "application", "intelligence artificielle"], emoji: "💻" },
  histoire:   { keywords: ["histoire", "conte", "livre", "lire", "lecture", "personnage", "héros", "fée", "princesse", "roi", "reine", "château", "légende", "mythe"], emoji: "📖" },
  nourriture: { keywords: ["manger", "gâteau", "chocolat", "bonbon", "goûter", "pizza", "crêpe", "cuisine", "cuisiner", "recette", "fruit", "légume", "glace", "biscuit"], emoji: "🍰" },
  famille:    { keywords: ["maman", "papa", "frère", "sœur", "famille", "mamie", "papi", "cousin", "bébé", "grand-père", "grand-mère"], emoji: "👨‍👩‍👧" },
  école:      { keywords: ["école", "maîtresse", "maître", "copain", "copine", "classe", "apprendre", "devoir", "récréation", "cantine", "cartable"], emoji: "🏫" },
  émotions:   { keywords: ["peur", "triste", "content", "colère", "jaloux", "amour", "amitié", "confiance", "courage", "timide", "honte", "fier", "surprise"], emoji: "💛" },
  humour:     { keywords: ["blague", "rigoler", "drôle", "marrant", "rire", "comique", "farce", "bêtise", "devinette"], emoji: "😂" },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SMART FOLLOW-UP QUESTIONS (par intérêt)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const FOLLOW_UP_QUESTIONS: Record<string, string[]> = {
  animaux: [
    "Si tu pouvais avoir n'importe quel animal du monde, tu choisirais lequel ?",
    "Tu sais quel est l'animal le plus rapide du monde ? 🐆",
    "Tu préfères les animaux de la jungle ou de la mer ?",
    "Si ton animal préféré pouvait parler, qu'est-ce qu'il te dirait ?",
    "Tu connais un animal qui change de couleur ? 🦎",
    "Tu aimerais qu'on invente une histoire avec un animal magique ?",
    "Quel est le bruit d'animal que tu fais le mieux ? 😄",
    "Tu savais que les dauphins dorment avec un œil ouvert ? 🐬",
  ],
  espace: [
    "Si tu pouvais visiter une planète, laquelle tu choisirais ?",
    "Tu sais combien de lunes a Jupiter ? C'est fou ! 🌙",
    "Tu voudrais être astronaute ? Qu'est-ce que tu ferais dans l'espace ?",
    "Tu savais qu'on ne peut pas pleurer dans l'espace ? 🥲",
    "Imagine qu'on découvre une nouvelle planète, tu l'appellerais comment ?",
    "Tu préfères les fusées ou les vaisseaux spatiaux des films ?",
    "Tu sais pourquoi le ciel est bleu mais l'espace est noir ? 🤔",
  ],
  nature: [
    "Tu as déjà vu un arc-en-ciel ? Tu sais comment ça se forme ? 🌈",
    "Si tu étais un arbre, tu serais quel type d'arbre ?",
    "Tu préfères la montagne ou la mer ?",
    "Tu savais que certaines plantes mangent des insectes ? 🪴",
    "Quel est ton endroit préféré dans la nature ?",
    "Tu as déjà planté quelque chose ? Ça a poussé ?",
  ],
  science: [
    "Si tu pouvais inventer quelque chose, ce serait quoi ?",
    "Tu sais ce qui se passe quand on mélange du vinaigre et du bicarbonate ? 🌋",
    "Tu préfères les robots ou les expériences de chimie ?",
    "Tu savais que ton corps a assez de fer pour fabriquer un petit clou ? 🔩",
    "Quelle question scientifique tu te poses souvent ?",
    "Tu voudrais faire une expérience ensemble ? Laquelle ?",
  ],
  musique: [
    "Si tu pouvais jouer de n'importe quel instrument, ce serait lequel ? 🎸",
    "C'est quoi ta chanson préférée en ce moment ?",
    "Tu préfères chanter ou danser ?",
    "Tu savais que la musique peut rendre les plantes plus heureuses ? 🌱🎵",
    "Si tu composais une chanson, elle parlerait de quoi ?",
    "Tu aimes quel style de musique ?",
  ],
  sport: [
    "C'est quoi ton sport préféré ? ⚽",
    "Tu fais du sport à l'école ou en club ?",
    "Quel sportif tu admires le plus ?",
    "Tu préfères les sports d'équipe ou les sports individuels ?",
    "Tu as déjà gagné une compétition ? Raconte ! 🏆",
    "Si tu inventais un nouveau sport, il serait comment ?",
  ],
  art: [
    "Tu dessines souvent ? C'est quoi ton dernier dessin ? 🖍️",
    "Tu préfères dessiner, peindre ou bricoler ?",
    "Si tu devais dessiner Bobby, tu me ferais comment ? 😄",
    "Tu connais un artiste que tu aimes bien ?",
    "Quelle est ta couleur préférée pour dessiner ?",
    "Tu voudrais qu'on invente un personnage ensemble à dessiner ?",
  ],
  aventure: [
    "Si tu étais un super-héros, quel serait ton pouvoir ? 💪",
    "Tu préfères être un pirate ou un chevalier ?",
    "Quel est le trésor que tu rêverais de trouver ? 💎",
    "Si tu partais en aventure demain, où tu irais ?",
    "Tu voudrais qu'on crée une aventure ensemble ?",
    "Tu as déjà vécu une aventure pour de vrai ? Raconte !",
  ],
  technologie: [
    "C'est quoi ton jeu vidéo préféré ? 🎮",
    "Si tu pouvais créer une application, elle ferait quoi ?",
    "Tu voudrais apprendre à programmer ?",
    "Tu savais que le premier jeu vidéo date de 1958 ? 🕹️",
    "Tu préfères construire des trucs ou jouer des aventures dans les jeux ?",
  ],
  histoire: [
    "C'est quoi le meilleur livre que tu as lu ? 📚",
    "Tu préfères les histoires drôles ou les histoires d'aventure ?",
    "Si tu écrivais un livre, ça raconterait quoi ?",
    "Tu as un personnage de livre préféré ?",
    "Tu veux qu'on invente la suite d'une histoire ensemble ?",
    "Tu préfères qu'on te raconte des histoires ou les lire toi-même ?",
  ],
  nourriture: [
    "C'est quoi ton plat préféré au monde ? 🍕",
    "Tu aimes cuisiner ? Qu'est-ce que tu sais faire ?",
    "Si tu pouvais manger n'importe quoi ce soir, ce serait quoi ?",
    "Tu préfères le sucré ou le salé ?",
    "Tu as déjà goûté un plat d'un autre pays ?",
    "Quelle est la chose la plus bizarre que tu as mangée ? 😄",
  ],
  famille: [
    "C'est qui dans ta famille qui te fait le plus rigoler ? 😄",
    "Tu fais quoi avec ta famille le week-end ?",
    "Tu as un animal de compagnie à la maison ?",
    "C'est quoi ton meilleur souvenir en famille ?",
    "Tu as des frères et sœurs ? Vous jouez à quoi ensemble ?",
  ],
  école: [
    "C'est quoi ta matière préférée à l'école ? 📝",
    "Tu as un super copain ou une super copine ?",
    "C'est quoi le truc le plus cool que tu as appris récemment ?",
    "Tu préfères la récré ou les cours ? 😄",
    "Tu aimes ta maîtresse/ton maître ?",
  ],
  émotions: [
    "Comment tu te sens là, maintenant ? 💛",
    "Qu'est-ce qui te rend le plus heureux ?",
    "Tu savais que c'est normal d'être triste parfois ? Je suis là pour toi.",
    "De quoi tu es le plus fier dans ta vie ?",
    "Qu'est-ce qui te donne du courage quand tu as peur ?",
  ],
  humour: [
    "Tu connais une blague à me raconter ? 😂",
    "Tu préfères les blagues de toc-toc ou les devinettes ?",
    "C'est quoi le truc le plus drôle qui t'est arrivé ?",
    "Tu veux qu'on invente une blague ensemble ?",
    "Tu ris souvent ? C'est super important de rigoler ! 😄",
  ],
};

// Questions de transition entre sujets (quand on détecte un nouveau centre d'intérêt)
const TOPIC_BRIDGES: Record<string, Record<string, string[]>> = {
  animaux: {
    nature: ["Les animaux et la nature, t'adores ça ! Tu connais un animal de la forêt qu'on ne voit presque jamais ?"],
    science: ["Tu sais, les animaux c'est de la science aussi ! Lequel tu trouves le plus incroyable ?"],
  },
  espace: {
    science: ["L'espace c'est de la science ! Tu voudrais faire une expérience de fusée ? 🚀"],
    aventure: ["L'espace c'est la plus grande aventure ! Tu imagines explorer Mars ?"],
  },
  sport: {
    école: ["Tu fais du sport à l'école ? C'est quoi ton sport préféré en récré ?"],
  },
  art: {
    histoire: ["Tu pourrais dessiner les personnages de nos histoires ! Tu voudrais essayer ?"],
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PUBLIC API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Extract and track interests from user text */
export function trackInterests(text: string): string[] {
  const lower = text.toLowerCase();
  const detected: string[] = [];

  for (const [topic, { keywords }] of Object.entries(INTEREST_KEYWORDS_PUBLIC)) {
    if (keywords.some(kw => lower.includes(kw))) {
      detected.push(topic);
      profile.scores[topic] = (profile.scores[topic] || 0) + 1;
      
      if (!profile.recentMentions.includes(topic)) {
        profile.recentMentions.push(topic);
        if (profile.recentMentions.length > 10) profile.recentMentions.shift();
      }
    }
  }

  // Track depth: if same topic as current chain, go deeper
  if (detected.length === 1 && detected[0] === profile.currentTopicChain) {
    profile.conversationDepth++;
  } else if (detected.length > 0) {
    profile.currentTopicChain = detected[0];
    profile.conversationDepth = 1;
  }

  return detected;
}

/** Get the top N interests by score */
export function getTopInterests(n = 3): { topic: string; score: number; emoji: string }[] {
  return Object.entries(profile.scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([topic, score]) => ({
      topic,
      score,
      emoji: INTEREST_KEYWORDS_PUBLIC[topic]?.emoji || "📌",
    }));
}

/**
 * Generate a smart follow-up question based on:
 * 1. Current topic chain (go deeper if engaged)
 * 2. Top interests (revisit favorites)
 * 3. Topic bridges (connect related interests)
 * 4. Discovery (introduce new topics based on adjacent interests)
 */
export function getSmartFollowUp(childName?: string): string | null {
  const topInterests = getTopInterests(5);
  if (topInterests.length === 0) return null;

  const name = childName || "";
  let question: string | null = null;

  // Strategy 1: Deep dive — if child is deep in a topic, ask deeper questions
  if (profile.currentTopicChain && profile.conversationDepth >= 2) {
    const deepQuestions = FOLLOW_UP_QUESTIONS[profile.currentTopicChain];
    if (deepQuestions) {
      const fresh = deepQuestions.filter(q => !profile.followUpsAsked.has(q));
      if (fresh.length > 0) {
        question = fresh[Math.floor(Math.random() * fresh.length)];
      }
    }
  }

  // Strategy 2: Topic bridge — connect two recent interests
  if (!question && profile.recentMentions.length >= 2) {
    const last = profile.recentMentions[profile.recentMentions.length - 1];
    const prev = profile.recentMentions[profile.recentMentions.length - 2];
    const bridges = TOPIC_BRIDGES[last]?.[prev] || TOPIC_BRIDGES[prev]?.[last];
    if (bridges) {
      const fresh = bridges.filter(q => !profile.followUpsAsked.has(q));
      if (fresh.length > 0) {
        question = fresh[Math.floor(Math.random() * fresh.length)];
      }
    }
  }

  // Strategy 3: Top interest question — ask about their favorite topic
  if (!question) {
    // Prioritize topics with highest scores that haven't been followed up recently
    for (const { topic } of topInterests) {
      if (topic === profile.lastFollowUpTopic) continue; // don't repeat same topic
      const questions = FOLLOW_UP_QUESTIONS[topic];
      if (!questions) continue;
      const fresh = questions.filter(q => !profile.followUpsAsked.has(q));
      if (fresh.length > 0) {
        question = fresh[Math.floor(Math.random() * fresh.length)];
        profile.lastFollowUpTopic = topic;
        break;
      }
    }
  }

  // Strategy 4: Discovery — suggest a topic the child hasn't explored
  if (!question) {
    const unexplored = Object.keys(FOLLOW_UP_QUESTIONS).filter(
      t => !profile.scores[t] && t !== "émotions"
    );
    if (unexplored.length > 0) {
      const discoveryTopic = unexplored[Math.floor(Math.random() * unexplored.length)];
      const discoveryQs = FOLLOW_UP_QUESTIONS[discoveryTopic];
      if (discoveryQs && discoveryQs.length > 0) {
        const emoji = INTEREST_KEYWORDS_PUBLIC[discoveryTopic]?.emoji || "✨";
        question = `${emoji} Dis, ${name || "toi"}, ${discoveryQs[0].charAt(0).toLowerCase() + discoveryQs[0].slice(1)}`;
        profile.lastFollowUpTopic = discoveryTopic;
      }
    }
  }

  if (!question) return null;

  // Mark as asked
  profile.followUpsAsked.add(question);

  // Inject child name naturally (~50% of the time)
  if (name && !question.includes(name) && Math.random() > 0.5) {
    question = `${name}, ${question.charAt(0).toLowerCase() + question.slice(1)}`;
  }

  return question;
}

/**
 * Get a relaunch message based on interests (used after silence timeout)
 */
export function getInterestBasedRelaunch(childName?: string): string | null {
  const topInterests = getTopInterests(3);
  if (topInterests.length === 0) return null;

  const name = childName || "toi";
  const top = topInterests[0];
  const emoji = top.emoji;

  const relaunches = [
    `${emoji} Hey ${name} ! On parlait de ${top.topic} tout à l'heure, tu veux continuer ?`,
    `${emoji} ${name}, tu te rappelles quand on parlait de ${top.topic} ? J'ai encore plein de trucs à te dire !`,
    `${emoji} ${name} ! Puisque tu adores ${topicToFriendlyName(top.topic)}, tu veux que je te raconte un truc incroyable ?`,
  ];

  return relaunches[Math.floor(Math.random() * relaunches.length)];
}

function topicToFriendlyName(topic: string): string {
  const names: Record<string, string> = {
    animaux: "les animaux", espace: "l'espace", nature: "la nature",
    science: "la science", musique: "la musique", sport: "le sport",
    art: "l'art", aventure: "les aventures", technologie: "la technologie",
    histoire: "les histoires", nourriture: "la nourriture",
    famille: "ta famille", école: "l'école", émotions: "les émotions",
    humour: "les blagues",
  };
  return names[topic] || topic;
}

/** Reset tracker (on session end) */
export function resetInterestTracker() {
  profile.scores = {};
  profile.recentMentions = [];
  profile.followUpsAsked.clear();
  profile.lastFollowUpTopic = null;
  profile.conversationDepth = 0;
  profile.currentTopicChain = null;
}

/** Get current profile snapshot (for parent dashboard) */
export function getInterestSnapshot() {
  return {
    topInterests: getTopInterests(5),
    recentTopics: [...profile.recentMentions],
    conversationDepth: profile.conversationDepth,
    currentTopic: profile.currentTopicChain,
  };
}
