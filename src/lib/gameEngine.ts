/**
 * Bobby Interactive Game Engine
 * Score tracking + interactive quiz/vrai-faux/devinettes with answer validation
 */

// ─── Score Persistence ──────────────────────────────────────
const SCORE_KEY = "bobby_game_scores";

export interface GameScore {
  totalPlayed: number;
  totalCorrect: number;
  streak: number;
  bestStreak: number;
  byCategory: Record<string, { played: number; correct: number }>;
  lastPlayed: string;
}

function defaultScore(): GameScore {
  return {
    totalPlayed: 0, totalCorrect: 0, streak: 0, bestStreak: 0,
    byCategory: {}, lastPlayed: new Date().toISOString(),
  };
}

export function loadScore(): GameScore {
  try {
    const raw = localStorage.getItem(SCORE_KEY);
    if (raw) return { ...defaultScore(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultScore();
}

function saveScore(s: GameScore) {
  localStorage.setItem(SCORE_KEY, JSON.stringify(s));
}

export function recordAnswer(category: string, correct: boolean): GameScore {
  const s = loadScore();
  s.totalPlayed++;
  if (correct) { s.totalCorrect++; s.streak++; }
  else s.streak = 0;
  if (s.streak > s.bestStreak) s.bestStreak = s.streak;
  if (!s.byCategory[category]) s.byCategory[category] = { played: 0, correct: 0 };
  s.byCategory[category].played++;
  if (correct) s.byCategory[category].correct++;
  s.lastPlayed = new Date().toISOString();
  saveScore(s);
  return s;
}

export function resetScores(): GameScore {
  const s = defaultScore();
  saveScore(s);
  return s;
}

// ─── Game Data ──────────────────────────────────────────────
export interface QuizQuestion {
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  category: "animaux" | "sciences" | "géographie" | "nature" | "culture";
}

export interface TrueFalseQuestion {
  statement: string;
  answer: boolean;
  explanation: string;
  category: string;
}

export interface Riddle {
  question: string;
  choices: string[];
  correctIndex: number;
  hint: string;
}

// ── Quiz Animaux (20 questions) ─────────────────────────────
export const QUIZ_ANIMAUX: QuizQuestion[] = [
  { question: "Quel animal est le plus rapide du monde ?", choices: ["Le lion", "Le guépard", "Le loup", "L'aigle"], correctIndex: 1, explanation: "Le guépard peut courir à 120 km/h ! 🐆", category: "animaux" },
  { question: "Combien de pattes a une araignée ?", choices: ["6", "8", "10", "4"], correctIndex: 1, explanation: "Les araignées ont 8 pattes ! Les insectes en ont 6 🕷️", category: "animaux" },
  { question: "Quel animal produit du miel ?", choices: ["La guêpe", "Le papillon", "L'abeille", "La mouche"], correctIndex: 2, explanation: "Les abeilles fabriquent le miel dans leur ruche ! 🐝🍯", category: "animaux" },
  { question: "Quel est le plus grand animal terrestre ?", choices: ["La girafe", "L'éléphant", "Le rhinocéros", "L'hippopotame"], correctIndex: 1, explanation: "L'éléphant d'Afrique est le plus gros animal terrestre ! 🐘", category: "animaux" },
  { question: "Quel animal a une trompe ?", choices: ["Le zèbre", "L'éléphant", "Le lion", "Le singe"], correctIndex: 1, explanation: "L'éléphant utilise sa trompe pour tout : boire, manger, se doucher ! 🐘", category: "animaux" },
  { question: "Quel animal porte sa maison sur son dos ?", choices: ["Le hérisson", "La tortue", "L'escargot", "La tortue et l'escargot"], correctIndex: 3, explanation: "La tortue ET l'escargot portent leur maison ! 🐢🐌", category: "animaux" },
  { question: "Quel oiseau ne peut pas voler ?", choices: ["Le perroquet", "L'aigle", "Le pingouin", "Le moineau"], correctIndex: 2, explanation: "Les pingouins ne volent pas mais nagent super bien ! 🐧", category: "animaux" },
  { question: "Quel animal a des rayures noires et blanches ?", choices: ["Le tigre", "Le zèbre", "La panthère", "Le lion"], correctIndex: 1, explanation: "Le zèbre est célèbre pour ses rayures uniques ! 🦓", category: "animaux" },
  { question: "Combien de cœurs a une pieuvre ?", choices: ["1", "2", "3", "4"], correctIndex: 2, explanation: "La pieuvre a 3 cœurs ! Incroyable non ? 🐙💙💙💙", category: "animaux" },
  { question: "Quel animal dort la tête en bas ?", choices: ["Le singe", "La chauve-souris", "Le paresseux", "Le koala"], correctIndex: 1, explanation: "Les chauves-souris dorment accrochées la tête en bas ! 🦇", category: "animaux" },
  { question: "Quel animal change de couleur ?", choices: ["Le lézard", "Le caméléon", "Le serpent", "La grenouille"], correctIndex: 1, explanation: "Le caméléon change de couleur selon son humeur ! 🦎", category: "animaux" },
  { question: "Quel est le plus petit oiseau du monde ?", choices: ["Le moineau", "Le colibri", "La mésange", "Le pinson"], correctIndex: 1, explanation: "Le colibri est minuscule et peut voler sur place ! 🐦", category: "animaux" },
  { question: "Quel animal a le cou le plus long ?", choices: ["L'autruche", "Le flamant rose", "La girafe", "Le cygne"], correctIndex: 2, explanation: "La girafe a un cou de 2 mètres pour manger les feuilles en haut ! 🦒", category: "animaux" },
  { question: "Quel animal construit des barrages ?", choices: ["L'ours", "Le castor", "Le raton laveur", "La loutre"], correctIndex: 1, explanation: "Les castors construisent des barrages avec des branches ! 🦫", category: "animaux" },
  { question: "Quel animal est le roi de la jungle ?", choices: ["Le tigre", "Le gorille", "Le lion", "L'éléphant"], correctIndex: 2, explanation: "Le lion est surnommé le roi des animaux ! 🦁👑", category: "animaux" },
  { question: "Quel animal mange du bambou ?", choices: ["Le koala", "Le panda", "Le gorille", "L'ours brun"], correctIndex: 1, explanation: "Le panda géant adore le bambou, il en mange 38 kg par jour ! 🐼🎋", category: "animaux" },
  { question: "Combien de bras a une étoile de mer ?", choices: ["3", "4", "5", "6"], correctIndex: 2, explanation: "La plupart des étoiles de mer ont 5 bras ! ⭐", category: "animaux" },
  { question: "Quel animal peut régénérer sa queue ?", choices: ["Le chat", "Le lézard", "Le serpent", "Le poisson"], correctIndex: 1, explanation: "Si un lézard perd sa queue, elle repousse ! 🦎✨", category: "animaux" },
  { question: "Quel est le plus grand poisson ?", choices: ["La baleine", "Le requin blanc", "Le requin baleine", "Le thon"], correctIndex: 2, explanation: "Le requin baleine est le plus grand poisson, jusqu'à 12m ! (La baleine n'est pas un poisson !) 🦈", category: "animaux" },
  { question: "Quel insecte brille dans la nuit ?", choices: ["La coccinelle", "La luciole", "Le scarabée", "Le papillon"], correctIndex: 1, explanation: "Les lucioles produisent leur propre lumière ! ✨🐛", category: "animaux" },
];

// ── Quiz Éducatif / Sciences (15 questions) ─────────────────
export const QUIZ_EDUCATIF: QuizQuestion[] = [
  { question: "Quelle planète est la plus proche du soleil ?", choices: ["La Terre", "Mars", "Mercure", "Vénus"], correctIndex: 2, explanation: "Mercure est la plus proche du soleil, elle est toute petite ! ☀️", category: "sciences" },
  { question: "Combien y a-t-il de continents ?", choices: ["5", "6", "7", "8"], correctIndex: 2, explanation: "Il y a 7 continents sur Terre ! 🌍", category: "géographie" },
  { question: "Quel est le plus grand océan ?", choices: ["Atlantique", "Indien", "Pacifique", "Arctique"], correctIndex: 2, explanation: "L'océan Pacifique est immense, il couvre un tiers de la Terre ! 🌊", category: "géographie" },
  { question: "De quelle couleur est le sang ?", choices: ["Bleu", "Rouge", "Violet", "Vert"], correctIndex: 1, explanation: "Le sang est toujours rouge grâce au fer qu'il contient ! ❤️", category: "sciences" },
  { question: "Combien de dents a un adulte ?", choices: ["20", "28", "32", "36"], correctIndex: 2, explanation: "Les adultes ont 32 dents (avec les dents de sagesse) ! 🦷", category: "sciences" },
  { question: "Quelle est la plus haute montagne du monde ?", choices: ["Le Mont Blanc", "Le Kilimandjaro", "L'Everest", "Le Fuji"], correctIndex: 2, explanation: "L'Everest mesure 8 849 mètres ! C'est géant ! 🏔️", category: "géographie" },
  { question: "Combien de couleurs a l'arc-en-ciel ?", choices: ["5", "6", "7", "8"], correctIndex: 2, explanation: "Il y a 7 couleurs : rouge, orange, jaune, vert, bleu, indigo, violet ! 🌈", category: "sciences" },
  { question: "Quel gaz les plantes absorbent-elles ?", choices: ["L'oxygène", "Le CO2", "L'azote", "L'hélium"], correctIndex: 1, explanation: "Les plantes absorbent le CO2 et nous donnent de l'oxygène ! 🌱", category: "nature" },
  { question: "Combien de jours dans une année ?", choices: ["360", "365", "370", "350"], correctIndex: 1, explanation: "Une année a 365 jours (et 366 les années bissextiles !) 📅", category: "sciences" },
  { question: "Quel est l'os le plus long du corps ?", choices: ["Le bras", "Le fémur", "La colonne", "Le tibia"], correctIndex: 1, explanation: "Le fémur (l'os de la cuisse) est le plus long et le plus solide ! 🦴", category: "sciences" },
  { question: "Quelle est la capitale de la France ?", choices: ["Lyon", "Marseille", "Paris", "Toulouse"], correctIndex: 2, explanation: "Paris est la capitale de la France ! 🗼🇫🇷", category: "géographie" },
  { question: "De quoi est fait le soleil ?", choices: ["De lave", "De gaz", "De roche", "De feu"], correctIndex: 1, explanation: "Le soleil est une boule de gaz très chaud (hydrogène et hélium) ! ☀️", category: "sciences" },
  { question: "Quel sens utilise-t-on pour lire ?", choices: ["L'ouïe", "Le toucher", "La vue", "L'odorat"], correctIndex: 2, explanation: "On utilise la vue pour lire ! Nos yeux sont incroyables 👀", category: "sciences" },
  { question: "Combien y a-t-il de planètes dans notre système solaire ?", choices: ["7", "8", "9", "10"], correctIndex: 1, explanation: "Il y a 8 planètes ! Pluton n'est plus considéré comme une planète 🪐", category: "sciences" },
  { question: "Qui a inventé l'ampoule électrique ?", choices: ["Einstein", "Edison", "Newton", "Pasteur"], correctIndex: 1, explanation: "Thomas Edison a inventé l'ampoule en 1879 ! 💡", category: "culture" },
];

// ── Vrai/Faux interactifs (20 questions) ────────────────────
export const VRAI_FAUX: TrueFalseQuestion[] = [
  { statement: "Les dauphins dorment avec un œil ouvert", answer: true, explanation: "Oui ! Leur cerveau dort à moitié, un côté à la fois ! 🐬", category: "animaux" },
  { statement: "La lune produit sa propre lumière", answer: false, explanation: "Non ! La lune reflète la lumière du soleil ! 🌙", category: "sciences" },
  { statement: "Le miel ne se périme jamais", answer: true, explanation: "Oui ! On a trouvé du miel vieux de 3000 ans encore bon ! 🍯", category: "nature" },
  { statement: "Les escargots ont des dents", answer: true, explanation: "Oui ! Ils ont des milliers de mini-dents sur leur langue ! 🐌", category: "animaux" },
  { statement: "Il neige sur Mars", answer: true, explanation: "Oui ! Mais c'est de la neige de CO2, du gaz gelé ! ❄️🪐", category: "sciences" },
  { statement: "Les pingouins peuvent voler", answer: false, explanation: "Non ! Mais ils nagent comme des champions ! 🐧", category: "animaux" },
  { statement: "Le cœur d'une baleine est gros comme une voiture", answer: true, explanation: "Oui ! Le cœur d'une baleine bleue est énorme ! 🐋💙", category: "animaux" },
  { statement: "L'eau bout à 100 degrés", answer: true, explanation: "Oui ! L'eau pure bout à 100°C au niveau de la mer ! 💧", category: "sciences" },
  { statement: "Les étoiles sont des boules de feu", answer: false, explanation: "Pas exactement ! Ce sont des boules de gaz très chaud ! ⭐", category: "sciences" },
  { statement: "Les chats ont 9 vies", answer: false, explanation: "Non ! C'est une légende. Les chats sont juste très agiles ! 🐱", category: "animaux" },
  { statement: "La Terre est ronde", answer: true, explanation: "Oui ! La Terre est un globe légèrement aplati aux pôles ! 🌍", category: "sciences" },
  { statement: "Les poissons boivent de l'eau", answer: true, explanation: "Oui ! Les poissons de mer boivent de l'eau salée et filtrent le sel ! 🐟", category: "animaux" },
  { statement: "Le bambou est une herbe", answer: true, explanation: "Oui ! Le bambou est la plus grande herbe du monde ! 🎋", category: "nature" },
  { statement: "Les flamants roses naissent roses", answer: false, explanation: "Non ! Ils naissent blancs/gris et deviennent roses grâce à leur nourriture ! 🦩", category: "animaux" },
  { statement: "La foudre est plus chaude que le soleil", answer: true, explanation: "Oui ! La foudre atteint 30 000°C, le soleil 5 500°C en surface ! ⚡", category: "sciences" },
  { statement: "Les arbres communiquent entre eux", answer: true, explanation: "Oui ! Par leurs racines et des champignons souterrains ! 🌳🍄", category: "nature" },
  { statement: "Un jour sur Vénus dure plus qu'une année sur Vénus", answer: true, explanation: "Oui ! Vénus tourne très lentement sur elle-même ! 🪐", category: "sciences" },
  { statement: "Les crocodiles peuvent grimper aux arbres", answer: true, explanation: "Oui ! Certains petits crocodiles grimpent aux arbres ! 🐊🌴", category: "animaux" },
  { statement: "Le son voyage plus vite que la lumière", answer: false, explanation: "Non ! La lumière est beaucoup plus rapide ! C'est pour ça qu'on voit l'éclair avant d'entendre le tonnerre ! ⚡", category: "sciences" },
  { statement: "Les humains et les bananes partagent 60% de leur ADN", answer: true, explanation: "Oui ! On a 60% d'ADN en commun avec les bananes ! 🍌🧬", category: "sciences" },
];

// ── Devinettes à choix (15) ─────────────────────────────────
export const DEVINETTES: Riddle[] = [
  { question: "Je suis jaune et je brille dans le ciel. Qui suis-je ?", choices: ["La lune", "Le soleil", "Une étoile"], correctIndex: 1, hint: "Je chauffe et j'éclaire la Terre ☀️" },
  { question: "J'ai des pattes mais je ne marche pas. Qui suis-je ?", choices: ["Un chien", "Une table", "Un oiseau"], correctIndex: 1, hint: "On mange dessus ! 🍽️" },
  { question: "Je suis plein de trous mais je retiens l'eau. Qui suis-je ?", choices: ["Un verre", "Une éponge", "Un seau"], correctIndex: 1, hint: "On fait la vaisselle avec ! 🧽" },
  { question: "J'ai des aiguilles mais je ne pique pas. Qui suis-je ?", choices: ["Un cactus", "Un hérisson", "Une horloge"], correctIndex: 2, hint: "Tic tac tic tac ! ⏰" },
  { question: "On me casse avant de m'utiliser. Qui suis-je ?", choices: ["Un verre", "Un œuf", "Un crayon"], correctIndex: 1, hint: "Je suis dans une omelette ! 🥚" },
  { question: "J'ai des dents mais je ne mange pas. Qui suis-je ?", choices: ["Un peigne", "Un requin", "Un crocodile"], correctIndex: 0, hint: "Je démêle les cheveux ! 💇" },
  { question: "Plus je suis grande, moins on me voit. Qui suis-je ?", choices: ["La lumière", "L'obscurité", "L'ombre"], correctIndex: 1, hint: "La nuit, tout est sombre ! 🌑" },
  { question: "J'ai des feuilles mais je ne suis pas un arbre. Qui suis-je ?", choices: ["Un cahier", "Un livre", "Une salade"], correctIndex: 1, hint: "On me lit ! 📖" },
  { question: "Je monte et je descends sans bouger. Qui suis-je ?", choices: ["Un ascenseur", "Un escalier", "Une montagne"], correctIndex: 1, hint: "On marche dessus pour changer d'étage ! 🪜" },
  { question: "J'ai un chapeau mais pas de tête. Qui suis-je ?", choices: ["Un épouvantail", "Un champignon", "Une bouteille"], correctIndex: 1, hint: "Je pousse dans la forêt ! 🍄" },
  { question: "Je suis toujours devant toi mais tu ne me vois jamais. Qui suis-je ?", choices: ["Le passé", "L'avenir", "L'air"], correctIndex: 1, hint: "Demain, après-demain... ⏳" },
  { question: "J'ai des villes mais pas de maisons, des forêts mais pas d'arbres. Qui suis-je ?", choices: ["Un rêve", "Une carte", "Un tableau"], correctIndex: 1, hint: "On me déplie pour trouver son chemin ! 🗺️" },
  { question: "Plus on me tire, plus je suis courte. Qui suis-je ?", choices: ["Une corde", "Une cigarette", "La vie"], correctIndex: 0, hint: "On s'en sert pour attacher ! 🪢" },
  { question: "Je peux voyager partout dans le monde en restant dans mon coin. Qui suis-je ?", choices: ["Un timbre", "Un astronaute", "Un avion"], correctIndex: 0, hint: "Je suis collé sur une enveloppe ! 📮" },
  { question: "J'ai un lit mais je ne dors jamais. Qui suis-je ?", choices: ["Un hôpital", "Une rivière", "Un bébé"], correctIndex: 1, hint: "L'eau coule dans mon lit ! 🏞️" },
];

// ── Blagues (20) ────────────────────────────────────────────
export const BLAGUES: string[] = [
  "Pourquoi les plongeurs plongent-ils toujours en arrière ? Parce que sinon ils tomberaient dans le bateau ! 😄",
  "Qu'est-ce qu'un canif ? Un petit fien ! 😂",
  "Quel est le comble pour un électricien ? De ne pas être au courant ! ⚡😄",
  "Pourquoi le livre de maths est triste ? Parce qu'il a trop de problèmes ! 📚😢",
  "Que dit une imprimante dans l'eau ? J'ai papier ! 🖨️😂",
  "Comment appelle-t-on un chat tombé dans un pot de peinture le jour de Noël ? Un chat-peint de Noël ! 🐱🎄",
  "Quel est le sport préféré des insectes ? Le criquet ! 🦗⚽",
  "Pourquoi les fantômes sont-ils de mauvais menteurs ? Parce qu'on voit à travers ! 👻😄",
  "Quel animal peut sauter plus haut qu'une maison ? Tous ! Les maisons ne sautent pas ! 🏠😂",
  "Que fait un crocodile quand il rencontre une femme super belle ? Il craque-odile ! 🐊💕",
  "Pourquoi les étoiles ne tombent-elles pas ? Parce qu'elles sont accrochées au ciel ! ⭐",
  "Qu'est-ce qu'un dinosaure avec un chapeau ? Un dino-sore élégant ! 🦕🎩",
  "Pourquoi le squelette n'a-t-il pas d'amis ? Parce qu'il n'a personne ! 💀😅",
  "Que dit un escargot sur le dos d'une tortue ? Youhouuu, ça va vite ! 🐌🐢",
  "Comment les abeilles vont à l'école ? En buzzzz scolaire ! 🐝🚌",
  "Pourquoi les poissons détestent l'ordinateur ? Parce qu'ils ont peur du net ! 🐟💻",
  "Que fait un pirate à l'ordinateur ? Il appuie sur les touches ! ARRRR ! 🏴‍☠️⌨️",
  "Pourquoi la tomate a-t-elle rougi ? Parce qu'elle a vu la salade se déshabiller ! 🍅😆",
  "Qu'est-ce qui est vert et qui monte et qui descend ? Un petit pois dans un ascenseur ! 🟢",
  "Quelle est la femelle du hamster ? L'Amsterdam ! 🐹😂",
];

// ─── Interactive Game Session ───────────────────────────────
export type GameCategory = "quiz_animaux" | "quiz_educatif" | "vrai_faux" | "devinettes" | "histoires" | "blagues";

export interface ActiveGame {
  category: GameCategory;
  questionIndex: number;
  currentQuestion: {
    text: string;
    choices?: string[];
    correctIndex?: number;
    isVraiFaux?: boolean;
    correctAnswer?: boolean;
    explanation?: string;
  } | null;
  score: { correct: number; total: number };
  finished: boolean;
}

const usedQuestions: Record<string, Set<number>> = {};

function pickUnused(pool: unknown[], key: string): number {
  if (!usedQuestions[key]) usedQuestions[key] = new Set();
  const used = usedQuestions[key];
  if (used.size >= pool.length) used.clear();
  let idx: number;
  do { idx = Math.floor(Math.random() * pool.length); } while (used.has(idx) && used.size < pool.length);
  used.add(idx);
  return idx;
}

export function startGame(category: GameCategory): ActiveGame {
  return { category, questionIndex: 0, currentQuestion: null, score: { correct: 0, total: 0 }, finished: false };
}

export function nextQuestion(game: ActiveGame): { game: ActiveGame; text: string } {
  const { category } = game;

  if (category === "blagues") {
    const idx = pickUnused(BLAGUES, "blagues");
    return {
      game: { ...game, questionIndex: game.questionIndex + 1, finished: false, currentQuestion: null },
      text: BLAGUES[idx],
    };
  }

  let q: ActiveGame["currentQuestion"] = null;
  let text = "";

  if (category === "quiz_animaux") {
    const idx = pickUnused(QUIZ_ANIMAUX, "quiz_animaux");
    const item = QUIZ_ANIMAUX[idx];
    const choicesText = item.choices.map((c, i) => `${i + 1}. ${c}`).join(", ");
    text = `Quiz animaux ! 🐾 ${item.question} ${choicesText}`;
    q = { text: item.question, choices: item.choices, correctIndex: item.correctIndex, explanation: item.explanation };
  } else if (category === "quiz_educatif") {
    const idx = pickUnused(QUIZ_EDUCATIF, "quiz_educatif");
    const item = QUIZ_EDUCATIF[idx];
    const choicesText = item.choices.map((c, i) => `${i + 1}. ${c}`).join(", ");
    text = `Quiz éducatif ! 🧠 ${item.question} ${choicesText}`;
    q = { text: item.question, choices: item.choices, correctIndex: item.correctIndex, explanation: item.explanation };
  } else if (category === "vrai_faux") {
    const idx = pickUnused(VRAI_FAUX, "vrai_faux");
    const item = VRAI_FAUX[idx];
    text = `Vrai ou Faux ? 🤔 ${item.statement}`;
    q = { text: item.statement, isVraiFaux: true, correctAnswer: item.answer, explanation: item.explanation };
  } else if (category === "devinettes") {
    const idx = pickUnused(DEVINETTES, "devinettes");
    const item = DEVINETTES[idx];
    const choicesText = item.choices.map((c, i) => `${i + 1}. ${c}`).join(", ");
    text = `Devinette ! 🤔 ${item.question} Indice : ${item.hint} Choix : ${choicesText}`;
    q = { text: item.question, choices: item.choices, correctIndex: item.correctIndex, explanation: item.hint };
  }

  return {
    game: { ...game, questionIndex: game.questionIndex + 1, currentQuestion: q, finished: false },
    text,
  };
}

/** Check answer from voice text. Returns feedback text + updated game */
export function checkAnswer(game: ActiveGame, answerText: string): { game: ActiveGame; text: string; correct: boolean } {
  const q = game.currentQuestion;
  if (!q) return { game, text: "Pas de question en cours ! On en lance une autre ?", correct: false };

  const lower = answerText.toLowerCase().trim();
  let correct = false;

  if (q.isVraiFaux) {
    const saidTrue = /\b(vrai|oui|exact|correct|juste|yes)\b/i.test(lower);
    const saidFalse = /\b(faux|non|incorrect|pas vrai|nope|nan)\b/i.test(lower);
    if (saidTrue) correct = q.correctAnswer === true;
    else if (saidFalse) correct = q.correctAnswer === false;
    else return { game, text: "Dis 'vrai' ou 'faux' ! 🤔", correct: false };
  } else if (q.choices && q.correctIndex !== undefined) {
    // Check by number ("1", "2", etc.) or by content match
    const numMatch = lower.match(/\b([1-4])\b/);
    if (numMatch) {
      correct = parseInt(numMatch[1]) - 1 === q.correctIndex;
    } else {
      // Fuzzy match on choice text
      const correctText = q.choices[q.correctIndex].toLowerCase();
      correct = lower.includes(correctText) || correctText.includes(lower);
    }
  }

  const newScore = { correct: game.score.correct + (correct ? 1 : 0), total: game.score.total + 1 };
  recordAnswer(game.category, correct);

  const streak = loadScore().streak;
  let feedback: string;
  if (correct) {
    const cheers = ["Bravo ! 🎉", "Super ! ✨", "Bien joué ! 💪", "Excellent ! 🌟", "Génial ! 🏆", "Tu gères ! 🔥"];
    feedback = cheers[Math.floor(Math.random() * cheers.length)];
    if (streak >= 3) feedback += ` ${streak} bonnes réponses d'affilée ! 🔥`;
  } else {
    const correctAnswer = q.isVraiFaux
      ? (q.correctAnswer ? "Vrai" : "Faux")
      : q.choices?.[q.correctIndex!] || "?";
    feedback = `Pas tout à fait ! La bonne réponse était : ${correctAnswer}.`;
  }
  if (q.explanation) feedback += ` ${q.explanation}`;
  feedback += ` Score : ${newScore.correct}/${newScore.total}`;

  return {
    game: { ...game, score: newScore, currentQuestion: null },
    text: feedback,
    correct,
  };
}

export function getScoreSummary(score: GameScore): string {
  const pct = score.totalPlayed > 0 ? Math.round((score.totalCorrect / score.totalPlayed) * 100) : 0;
  let msg = `Tu as joué ${score.totalPlayed} fois avec ${score.totalCorrect} bonnes réponses (${pct}%) !`;
  if (score.bestStreak > 0) msg += ` Record : ${score.bestStreak} d'affilée ! 🔥`;
  return msg;
}
