/**
 * Bobby Offline Games — Multi-turn interactive games for long offline conversations
 * 
 * Games:
 * 1. Quiz progressif — themed quiz with 10 questions, difficulty scaling
 * 2. 20 Questions — Bobby thinks of something, child asks yes/no questions  
 * 3. Devinettes en chaîne — riddle chains with progressive clues
 * 4. Mot mystère — word guessing with letter clues
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type GameType = "quiz" | "20questions" | "devinettes" | "mot_mystere";

interface GameState {
  type: GameType;
  active: boolean;
  step: number;
  score: number;
  maxSteps: number;
  data: Record<string, unknown>;
}

let currentGame: GameState | null = null;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Public API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function isGameActive(): boolean {
  return currentGame?.active === true;
}

export function getGameType(): GameType | null {
  return currentGame?.type ?? null;
}

/** Check if user wants to start a game */
export function detectGameRequest(text: string): GameType | null {
  const t = text.toLowerCase();
  if (/quiz|questionnaire/i.test(t)) return "quiz";
  if (/20 questions?|vingt questions?|tu penses/i.test(t)) return "20questions";
  if (/devinette|devine|énigme|charade/i.test(t)) return "devinettes";
  if (/mot mystère|mot caché|mot secret/i.test(t)) return "mot_mystere";
  // Generic game request → pick randomly
  if (/jou(?:er|ons)|un jeu|on joue|partie/i.test(t)) {
    const games: GameType[] = ["quiz", "20questions", "devinettes", "mot_mystere"];
    return games[Math.floor(Math.random() * games.length)];
  }
  return null;
}

/** Start a new game */
export function startGame(type: GameType, childAge: number): string {
  switch (type) {
    case "quiz": return startQuiz(childAge);
    case "20questions": return start20Questions(childAge);
    case "devinettes": return startDevinettes(childAge);
    case "mot_mystere": return startMotMystere(childAge);
  }
}

/** Process a game turn — returns Bobby's response */
export function processGameTurn(userText: string): string {
  if (!currentGame?.active) return "";
  switch (currentGame.type) {
    case "quiz": return processQuizTurn(userText);
    case "20questions": return process20QuestionsTurn(userText);
    case "devinettes": return processDevinetteTurn(userText);
    case "mot_mystere": return processMotMystereTurn(userText);
  }
}

/** Force end current game */
export function endCurrentGame(): string {
  if (!currentGame?.active) return "";
  const score = currentGame.score;
  const max = currentGame.maxSteps;
  currentGame = null;
  return `C'était super ! Tu as eu ${score}/${max} points ! 🎉 Tu veux rejouer ou faire autre chose ?`;
}

export function resetGames(): void {
  currentGame = null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. QUIZ PROGRESSIF
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface QuizQuestion {
  question: string;
  answer: string;
  options?: string[];
  hint: string;
  funFact: string;
}

const QUIZ_BANKS: Record<string, QuizQuestion[]> = {
  animaux: [
    { question: "Quel est l'animal terrestre le plus rapide ?", answer: "guépard", hint: "Il a des taches et vit en Afrique", funFact: "Il peut courir à 120 km/h !" },
    { question: "Combien de pattes a une araignée ?", answer: "8", hint: "C'est plus que 6 mais moins que 10", funFact: "Les araignées ont aussi 8 yeux pour la plupart !" },
    { question: "Quel animal dort debout ?", answer: "cheval", hint: "On peut le monter", funFact: "Ils ne s'allongent que 30 minutes par jour !" },
    { question: "Quel est le plus grand animal du monde ?", answer: "baleine bleue", hint: "Il vit dans l'océan", funFact: "Son cœur est gros comme une voiture ! 🐋" },
    { question: "Quel oiseau ne vole pas mais court très vite ?", answer: "autruche", hint: "Elle vit en Afrique et pond de très gros œufs", funFact: "Ses œufs pèsent 1,5 kg, c'est 25 œufs de poule !" },
    { question: "Quel animal change de couleur pour se cacher ?", answer: "caméléon", hint: "C'est un reptile avec une longue langue", funFact: "Sa langue est plus longue que son corps ! 🦎" },
    { question: "Combien de dents a un requin en une vie ?", answer: "des milliers", hint: "Beaucoup plus que toi !", funFact: "Ils peuvent avoir 30 000 dents au cours de leur vie !" },
    { question: "Quel animal a le cou le plus long ?", answer: "girafe", hint: "Elle mange les feuilles en haut des arbres", funFact: "Son cou peut mesurer 2 mètres ! 🦒" },
    { question: "Quel insecte fabrique du miel ?", answer: "abeille", hint: "Elle vit dans une ruche", funFact: "Une abeille visite 5000 fleurs par jour ! 🐝" },
    { question: "Quel animal porte sa maison sur son dos ?", answer: "escargot", hint: "Il avance très lentement", funFact: "Un escargot peut dormir 3 ans ! 🐌" },
  ],
  espace: [
    { question: "Quelle est la planète la plus proche du Soleil ?", answer: "mercure", hint: "C'est aussi la plus petite", funFact: "Un jour sur Mercure dure 59 jours terrestres !" },
    { question: "Comment s'appelle notre galaxie ?", answer: "voie lactée", hint: "Son nom fait penser à du lait", funFact: "Elle contient plus de 200 milliards d'étoiles ! ✨" },
    { question: "Quelle planète a des anneaux magnifiques ?", answer: "saturne", hint: "C'est la 6ème planète", funFact: "Ses anneaux sont faits de glace et de roches !" },
    { question: "Combien de planètes dans notre système solaire ?", answer: "8", hint: "Pluton n'en fait plus partie", funFact: "Avant 2006, on en comptait 9 !" },
    { question: "Quel est le premier homme à avoir marché sur la Lune ?", answer: "neil armstrong", hint: "C'était en 1969", funFact: "Il a dit 'un petit pas pour l'homme, un grand pas pour l'humanité' 🌙" },
    { question: "Quelle est la planète rouge ?", answer: "mars", hint: "On y envoie des robots", funFact: "Mars a la plus grande montagne du système solaire : l'Olympus Mons !" },
    { question: "Qu'est-ce qu'une étoile filante ?", answer: "météore", hint: "C'est un caillou qui brûle", funFact: "Elles entrent dans l'atmosphère à 70 km/s ! 🌠" },
    { question: "Quelle est la plus grande planète ?", answer: "jupiter", hint: "Elle porte le nom du roi des dieux romains", funFact: "Jupiter est si grande qu'on pourrait y mettre 1300 Terre !" },
    { question: "Le Soleil est une étoile ou une planète ?", answer: "étoile", hint: "Il brille par lui-même", funFact: "Le Soleil a 4,6 milliards d'années ! ☀️" },
    { question: "Combien de temps met la Lune pour faire le tour de la Terre ?", answer: "28 jours", hint: "Environ un mois", funFact: "C'est pour ça que les mois font à peu près 30 jours !" },
  ],
  science: [
    { question: "De quoi est fait l'eau ? (molécule)", answer: "h2o", hint: "2 atomes d'hydrogène et 1 d'oxygène", funFact: "70% de ton corps c'est de l'eau ! 💧" },
    { question: "Qu'est-ce qui fait tomber les objets par terre ?", answer: "gravité", hint: "C'est une force invisible", funFact: "Newton a compris ça grâce à une pomme ! 🍎" },
    { question: "Combien d'os dans le corps humain adulte ?", answer: "206", hint: "Entre 200 et 210", funFact: "Un bébé en a 270 ! Certains fusionnent en grandissant." },
    { question: "Quel gaz respirons-nous ?", answer: "oxygène", hint: "Les arbres le fabriquent", funFact: "Les océans produisent 50% de l'oxygène de la planète ! 🌊" },
    { question: "À quelle température l'eau gèle-t-elle ?", answer: "0", hint: "C'est le début du thermomètre", funFact: "L'eau chaude gèle parfois plus vite que la froide ! C'est l'effet Mpemba ❄️" },
    { question: "Quel organe te permet de penser ?", answer: "cerveau", hint: "Il est dans ta tête", funFact: "Ton cerveau utilise 20% de l'énergie de ton corps ! 🧠" },
    { question: "Combien de couleurs dans un arc-en-ciel ?", answer: "7", hint: "Rouge, orange, jaune…", funFact: "En fait il y a une infinité de couleurs, on en voit 7 principales ! 🌈" },
    { question: "Pourquoi le ciel est bleu ?", answer: "diffusion lumière", hint: "C'est lié à la lumière du soleil", funFact: "Sur Mars le ciel est rose-orangé ! Le bleu c'est un truc de la Terre." },
    { question: "Quel est le métal le plus léger ?", answer: "lithium", hint: "On l'utilise dans les batteries", funFact: "Il flotte même sur l'eau !" },
    { question: "Combien de sens a l'être humain ?", answer: "5", hint: "Vue, ouïe…", funFact: "En fait on en a au moins 9 ! Dont l'équilibre et la perception du temps !" },
  ],
  nature: [
    { question: "Quel est le plus grand océan du monde ?", answer: "pacifique", hint: "Son nom veut dire 'calme'", funFact: "Il est plus grand que tous les continents réunis ! 🌊" },
    { question: "Comment s'appellent les bébés grenouilles ?", answer: "têtards", hint: "Ils ont une queue et vivent dans l'eau", funFact: "La transformation en grenouille s'appelle la métamorphose ! 🐸" },
    { question: "Quel est l'arbre le plus vieux du monde ?", answer: "pin bristlecone", hint: "Il a plus de 4000 ans", funFact: "Il est plus vieux que les pyramides d'Égypte ! 🌲" },
    { question: "Qu'est-ce qui cause les marées ?", answer: "lune", hint: "On la voit la nuit", funFact: "La Lune attire l'eau de la mer avec sa gravité ! 🌙" },
    { question: "Quel est le plus long fleuve du monde ?", answer: "nil", hint: "Il est en Afrique", funFact: "Il fait 6 650 km de long ! C'est comme traverser l'Europe !" },
    { question: "Combien de continents y a-t-il ?", answer: "7", hint: "Europe, Asie, Afrique…", funFact: "L'Antarctique est le plus froid : -89°C record ! 🥶" },
    { question: "Quel est le plus grand désert du monde ?", answer: "sahara", hint: "Il est en Afrique du Nord", funFact: "Il fait presque la taille des États-Unis ! 🏜️" },
    { question: "De quoi est faite la lave d'un volcan ?", answer: "roche fondue", hint: "C'est très très chaud", funFact: "La lave peut atteindre 1200°C ! 🌋" },
    { question: "Quel est le sommet le plus haut du monde ?", answer: "everest", hint: "Il est en Asie, dans l'Himalaya", funFact: "Il fait 8849 mètres ! C'est presque la hauteur où volent les avions ✈️" },
    { question: "Comment s'appelle la couche qui protège la Terre du soleil ?", answer: "ozone", hint: "C'est dans l'atmosphère", funFact: "Sans elle, on ne pourrait pas vivre sur Terre ! 🛡️" },
  ],
};

const QUIZ_THEMES = Object.keys(QUIZ_BANKS);

function startQuiz(childAge: number): string {
  const theme = QUIZ_THEMES[Math.floor(Math.random() * QUIZ_THEMES.length)];
  const questions = [...QUIZ_BANKS[theme]];
  // Shuffle
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }
  // Take 7 for younger, 10 for older
  const count = childAge <= 5 ? 5 : childAge <= 8 ? 7 : 10;
  
  currentGame = {
    type: "quiz",
    active: true,
    step: 0,
    score: 0,
    maxSteps: Math.min(count, questions.length),
    data: { theme, questions, hintUsed: false },
  };

  const emoji = theme === "animaux" ? "🐾" : theme === "espace" ? "🚀" : theme === "science" ? "🔬" : "🌿";
  return `${emoji} Super ! Quiz ${theme} ! ${currentGame.maxSteps} questions, c'est parti !\n\nQuestion 1 : ${questions[0].question}`;
}

function processQuizTurn(text: string): string {
  if (!currentGame || currentGame.type !== "quiz") return "";
  const t = text.toLowerCase().trim();
  
  // Check for quit
  if (/arrête|stop|fini|plus envie|autre chose/i.test(t)) return endCurrentGame();
  
  // Check for hint request
  if (/indice|aide|un peu d'aide|je sais pas/i.test(t)) {
    const q = (currentGame.data.questions as QuizQuestion[])[currentGame.step];
    currentGame.data.hintUsed = true;
    return `💡 Indice : ${q.hint}. Alors, tu trouves ?`;
  }

  const questions = currentGame.data.questions as QuizQuestion[];
  const q = questions[currentGame.step];
  const answer = q.answer.toLowerCase();
  
  // Check answer (flexible matching)
  const isCorrect = t.includes(answer) || 
    answer.split(" ").every(w => t.includes(w)) ||
    (answer.length <= 3 && t === answer);

  let response = "";
  if (isCorrect) {
    currentGame.score++;
    const cheers = ["Bravo ! 🎉", "Exact ! ⭐", "Super ! 👏", "Bien joué ! 🌟", "Génial ! 🎯"];
    response = `${cheers[Math.floor(Math.random() * cheers.length)]} ${q.funFact}`;
  } else {
    response = `Pas tout à fait ! La réponse c'était : ${q.answer}. ${q.funFact}`;
  }

  currentGame.step++;
  currentGame.data.hintUsed = false;

  if (currentGame.step >= currentGame.maxSteps) {
    const finalScore = currentGame.score;
    const max = currentGame.maxSteps;
    currentGame = null;
    const verdict = finalScore >= max * 0.8 ? "Tu es un champion ! 🏆" : 
                    finalScore >= max * 0.5 ? "Bien joué ! 👏" : "Continue de t'entraîner ! 💪";
    return `${response}\n\nFin du quiz ! Score : ${finalScore}/${max} ! ${verdict} Tu veux rejouer ?`;
  }

  const next = questions[currentGame.step];
  return `${response}\n\nQuestion ${currentGame.step + 1}/${currentGame.maxSteps} : ${next.question}`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. 20 QUESTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ThingToGuess {
  name: string;
  category: string;
  clues: Record<string, boolean | string>; // keyword → yes/no/detail
  finalHint: string;
}

const THINGS_TO_GUESS: ThingToGuess[] = [
  { name: "chat", category: "animal", clues: { "animal": true, "poils": true, "domestique": true, "gros": false, "vole": false, "nage": false, "miaule": true, "griffe": true, "ronronne": true, "ferme": false, "sauvage": false }, finalHint: "Il ronronne et miaule 🐱" },
  { name: "éléphant", category: "animal", clues: { "animal": true, "gros": true, "afrique": true, "domestique": false, "vole": false, "trompe": true, "nage": true, "herbivore": true, "poils": false, "défenses": true }, finalHint: "Il a une trompe et des grandes oreilles 🐘" },
  { name: "soleil", category: "objet", clues: { "animal": false, "chaud": true, "ciel": true, "rond": true, "toucher": false, "jaune": true, "nuit": false, "brille": true, "étoile": true, "vivant": false }, finalHint: "Il nous éclaire et nous réchauffe ☀️" },
  { name: "pizza", category: "nourriture", clues: { "animal": false, "mange": true, "sucré": false, "rond": true, "chaud": true, "fromage": true, "italie": true, "boisson": false, "fruit": false, "four": true }, finalHint: "C'est rond, avec du fromage et de la sauce tomate 🍕" },
  { name: "fusée", category: "véhicule", clues: { "animal": false, "vole": true, "espace": true, "roues": false, "rapide": true, "feu": true, "astronaute": true, "eau": false, "métal": true, "terre": false }, finalHint: "Elle transporte les astronautes dans l'espace 🚀" },
  { name: "arc-en-ciel", category: "phénomène", clues: { "animal": false, "couleur": true, "toucher": false, "ciel": true, "pluie": true, "soleil": true, "nuit": false, "7": true, "rond": true, "beau": true }, finalHint: "Il apparaît après la pluie quand le soleil brille 🌈" },
  { name: "robot", category: "objet", clues: { "animal": false, "vivant": false, "métal": true, "parle": true, "électricité": true, "intelligent": true, "mange": false, "ancien": false, "technologie": true, "construit": true }, finalHint: "C'est une machine intelligente faite de métal 🤖" },
  { name: "dauphin", category: "animal", clues: { "animal": true, "mer": true, "intelligent": true, "poils": false, "nage": true, "vole": false, "mammifère": true, "saute": true, "gentil": true, "poisson": false }, finalHint: "Il nage et saute dans l'océan, et il est très intelligent 🐬" },
  { name: "chocolat", category: "nourriture", clues: { "animal": false, "mange": true, "sucré": true, "marron": true, "chaud": false, "cacao": true, "fruit": false, "liquide": false, "fond": true, "dessert": true }, finalHint: "C'est marron, sucré et fait avec du cacao 🍫" },
  { name: "dinosaure", category: "animal", clues: { "animal": true, "vivant": false, "ancien": true, "gros": true, "vole": false, "os": true, "fossile": true, "effrayant": true, "éteint": true, "reptile": true }, finalHint: "Ils ont vécu il y a des millions d'années 🦕" },
];

function start20Questions(childAge: number): string {
  const thing = THINGS_TO_GUESS[Math.floor(Math.random() * THINGS_TO_GUESS.length)];
  currentGame = {
    type: "20questions",
    active: true,
    step: 0,
    score: 0,
    maxSteps: childAge <= 6 ? 15 : 20,
    data: { thing, questionsAsked: 0, hintGiven: false },
  };
  return `🤔 Je pense à quelque chose… Tu as ${currentGame.maxSteps} questions pour deviner ! Pose-moi des questions et je répondrai par oui ou non. C'est parti !`;
}

function process20QuestionsTurn(text: string): string {
  if (!currentGame || currentGame.type !== "20questions") return "";
  const t = text.toLowerCase().trim();
  const thing = currentGame.data.thing as ThingToGuess;

  if (/arrête|stop|fini|abandonne/i.test(t)) {
    const name = thing.name;
    currentGame = null;
    return `C'était : ${name} ! ${thing.finalHint} Tu veux rejouer ? 😊`;
  }

  // Check if child is guessing the answer
  if (/c'est (un |une |le |la |l'|des )?/i.test(t) || /je (dis|pense|crois|propose)/i.test(t)) {
    if (t.includes(thing.name.toLowerCase())) {
      currentGame.score = 1;
      const q = currentGame.data.questionsAsked as number;
      currentGame = null;
      return `🎉 OUI ! C'est bien ${thing.name} ! ${thing.finalHint} Bravo, tu as trouvé en ${q} questions ! Tu veux rejouer ?`;
    } else {
      (currentGame.data.questionsAsked as number)++;
      currentGame.step++;
      if (currentGame.step >= currentGame.maxSteps) {
        const name = thing.name;
        currentGame = null;
        return `Non ! C'était : ${name} ! ${thing.finalHint} C'était dur ! Tu veux retenter ? 😊`;
      }
      return `Non, ce n'est pas ça ! Il te reste ${currentGame.maxSteps - currentGame.step} questions 🤔`;
    }
  }

  // Answer yes/no based on clues
  (currentGame.data.questionsAsked as number)++;
  currentGame.step++;

  // Match against clues
  let answered = false;
  for (const [keyword, value] of Object.entries(thing.clues)) {
    if (t.includes(keyword)) {
      answered = true;
      const yesNo = value === true ? "Oui ! ✅" : value === false ? "Non ! ❌" : `${value}`;
      
      if (currentGame.step >= currentGame.maxSteps) {
        const name = thing.name;
        currentGame = null;
        return `${yesNo} C'est fini ! C'était : ${name} ! ${thing.finalHint} Tu veux rejouer ?`;
      }
      
      // Give hint at 75% of questions used
      const hintThreshold = Math.floor(currentGame.maxSteps * 0.75);
      let hint = "";
      if (currentGame.step >= hintThreshold && !(currentGame.data.hintGiven as boolean)) {
        currentGame.data.hintGiven = true;
        hint = ` 💡 Petit indice : ${thing.finalHint}`;
      }
      
      return `${yesNo}${hint} (${currentGame.maxSteps - currentGame.step} questions restantes)`;
    }
  }

  if (!answered) {
    // Can't match — give a generic response
    if (currentGame.step >= currentGame.maxSteps) {
      const name = thing.name;
      currentGame = null;
      return `Hmm, je ne sais pas trop comment répondre à ça ! C'est fini, c'était : ${name} ! ${thing.finalHint}`;
    }
    return `Hmm, reformule ta question pour que je puisse dire oui ou non ! 🤔 (${currentGame.maxSteps - currentGame.step} questions restantes)`;
  }

  return "";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. DEVINETTES EN CHAÎNE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface Riddle {
  question: string;
  answer: string;
  clues: string[];
  explanation: string;
}

const RIDDLES: Riddle[] = [
  { question: "Je suis blanc, je tombe du ciel, et je fonds dans ta main. Qui suis-je ?", answer: "neige", clues: ["Je suis froid", "Les enfants me lancent en boules"], explanation: "C'est la neige ! ❄️ Elle est faite de petits cristaux de glace." },
  { question: "J'ai des aiguilles mais je ne pique pas. Qui suis-je ?", answer: "horloge", clues: ["Je suis sur le mur", "Je donne l'heure"], explanation: "C'est une horloge ! ⏰ Ses aiguilles tournent pour donner l'heure." },
  { question: "Plus je sèche, plus je suis mouillée. Qui suis-je ?", answer: "serviette", clues: ["Tu m'utilises après le bain", "Je suis en tissu"], explanation: "C'est la serviette ! 🏖️ Plus elle sèche quelqu'un, plus elle est mouillée." },
  { question: "J'ai un chapeau mais pas de tête. Qui suis-je ?", answer: "champignon", clues: ["Je pousse dans la forêt", "Certains de mes frères sont dangereux"], explanation: "C'est le champignon ! 🍄 Son chapeau c'est la partie en haut." },
  { question: "J'ai des feuilles mais je ne suis pas un arbre. Qui suis-je ?", answer: "livre", clues: ["Tu peux me lire", "J'ai une couverture"], explanation: "C'est un livre ! 📚 Ses pages s'appellent aussi des feuilles." },
  { question: "Je monte et je descends mais je ne bouge pas. Qui suis-je ?", answer: "escalier", clues: ["J'ai des marches", "Tu me trouves dans les maisons"], explanation: "C'est un escalier ! 🪜 Il ne bouge pas mais toi tu montes et descends." },
  { question: "Je suis plein de trous mais je retiens l'eau. Qui suis-je ?", answer: "éponge", clues: ["Tu m'utilises pour nettoyer", "Je suis mou"], explanation: "C'est l'éponge ! 🧽 Pleine de trous mais elle absorbe l'eau !" },
  { question: "J'ai des dents mais je ne mange pas. Qui suis-je ?", answer: "peigne", clues: ["Tu m'utilises le matin", "Je sers pour les cheveux"], explanation: "C'est le peigne ! Les dents du peigne démêlent les cheveux." },
  { question: "On me prend mais on ne m'emporte pas. Qui suis-je ?", answer: "photo", clues: ["Je capture un moment", "On dit 'cheese' devant moi"], explanation: "C'est une photo ! 📸 On la 'prend' sans rien emporter physiquement." },
  { question: "Je fais le tour du monde en restant dans mon coin. Qui suis-je ?", answer: "timbre", clues: ["Je suis sur une enveloppe", "Je coûte quelques centimes"], explanation: "C'est le timbre ! ✉️ Il voyage partout collé sur sa lettre." },
  { question: "J'ai un lit mais je ne dors pas. Qui suis-je ?", answer: "rivière", clues: ["Je coule", "Les poissons vivent chez moi"], explanation: "C'est la rivière ! 🏞️ Le 'lit' d'une rivière c'est le fond où coule l'eau." },
  { question: "Plus je suis grande, moins on me voit. Qui suis-je ?", answer: "obscurité", clues: ["Je viens la nuit", "La lumière me fait disparaître"], explanation: "C'est l'obscurité ! 🌑 Plus il fait sombre, moins on voit." },
];

function startDevinettes(_childAge: number): string {
  const shuffled = [...RIDDLES];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  currentGame = {
    type: "devinettes",
    active: true,
    step: 0,
    score: 0,
    maxSteps: Math.min(8, shuffled.length),
    data: { riddles: shuffled, clueIndex: 0 },
  };

  return `🧩 C'est parti pour les devinettes ! J'en ai ${currentGame.maxSteps} pour toi !\n\nDevinette 1 : ${shuffled[0].question}`;
}

function processDevinetteTurn(text: string): string {
  if (!currentGame || currentGame.type !== "devinettes") return "";
  const t = text.toLowerCase().trim();

  if (/arrête|stop|fini|plus envie/i.test(t)) return endCurrentGame();

  const riddles = currentGame.data.riddles as Riddle[];
  const riddle = riddles[currentGame.step];
  const clueIndex = currentGame.data.clueIndex as number;

  // Ask for clue
  if (/indice|aide|un peu d'aide|je sais pas|sais plus/i.test(t)) {
    if (clueIndex < riddle.clues.length) {
      currentGame.data.clueIndex = clueIndex + 1;
      return `💡 Indice : ${riddle.clues[clueIndex]}. Tu trouves ?`;
    }
    return `J'ai plus d'indices ! La réponse c'est : ${riddle.answer}. ${riddle.explanation}`;
  }

  // Check answer
  if (t.includes(riddle.answer.toLowerCase())) {
    currentGame.score++;
    currentGame.step++;
    currentGame.data.clueIndex = 0;

    if (currentGame.step >= currentGame.maxSteps) {
      const s = currentGame.score;
      const m = currentGame.maxSteps;
      currentGame = null;
      return `🎉 Bravo ! ${riddle.explanation}\n\nFin des devinettes ! Score : ${s}/${m} ! Tu veux recommencer ?`;
    }

    const next = riddles[currentGame.step];
    return `🎉 Bravo ! ${riddle.explanation}\n\nDevinette ${currentGame.step + 1}/${currentGame.maxSteps} : ${next.question}`;
  }

  // Wrong answer
  if (clueIndex < riddle.clues.length) {
    return `Pas tout à fait… Tu veux un indice ? 🤔`;
  }
  
  // All clues exhausted, reveal
  currentGame.step++;
  currentGame.data.clueIndex = 0;

  if (currentGame.step >= currentGame.maxSteps) {
    const s = currentGame.score;
    const m = currentGame.maxSteps;
    currentGame = null;
    return `C'était : ${riddle.answer} ! ${riddle.explanation}\n\nFin ! Score : ${s}/${m}. Tu veux retenter ?`;
  }

  const next = riddles[currentGame.step];
  return `C'était : ${riddle.answer} ! ${riddle.explanation}\n\nDevinette suivante : ${next.question}`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. MOT MYSTÈRE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface MysteryWord {
  word: string;
  category: string;
  description: string;
}

const MYSTERY_WORDS: MysteryWord[] = [
  { word: "PAPILLON", category: "animal", description: "Un insecte avec de belles ailes colorées 🦋" },
  { word: "DRAGON", category: "imaginaire", description: "Une créature qui crache du feu 🐉" },
  { word: "CHOCOLAT", category: "nourriture", description: "Le meilleur des desserts ! 🍫" },
  { word: "DINOSAURE", category: "animal", description: "Un géant disparu il y a très longtemps 🦕" },
  { word: "ETOILE", category: "espace", description: "Elle brille dans le ciel la nuit ⭐" },
  { word: "PIRATE", category: "aventure", description: "Il cherche des trésors sur les mers ! 🏴‍☠️" },
  { word: "VOLCAN", category: "nature", description: "Une montagne qui crache de la lave 🌋" },
  { word: "LICORNE", category: "imaginaire", description: "Un cheval magique avec une corne 🦄" },
  { word: "GUITARE", category: "musique", description: "Un instrument à cordes 🎸" },
  { word: "KANGOUROU", category: "animal", description: "Il saute et porte son bébé dans sa poche 🦘" },
  { word: "TRESOR", category: "aventure", description: "Quelque chose de précieux caché quelque part 💎" },
  { word: "REQUIN", category: "animal", description: "Le roi de l'océan avec plein de dents 🦈" },
];

function startMotMystere(childAge: number): string {
  const word = MYSTERY_WORDS[Math.floor(Math.random() * MYSTERY_WORDS.length)];
  const maxGuesses = childAge <= 6 ? 8 : 6;

  // Reveal first and last letter
  const revealed = new Set<number>([0, word.word.length - 1]);
  
  currentGame = {
    type: "mot_mystere",
    active: true,
    step: 0,
    score: 0,
    maxSteps: maxGuesses,
    data: { word, revealed: Array.from(revealed), wrongLetters: [] as string[] },
  };

  const display = buildWordDisplay(word.word, revealed);
  return `🔤 Mot mystère ! Catégorie : ${word.category}\n"${word.description}"\n\n${display}\n\nPropose une lettre ou le mot entier ! (${maxGuesses} essais)`;
}

function buildWordDisplay(word: string, revealed: Set<number>): string {
  return word.split("").map((c, i) => revealed.has(i) ? c : "_").join(" ");
}

function processMotMystereTurn(text: string): string {
  if (!currentGame || currentGame.type !== "mot_mystere") return "";
  const t = text.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (/arrête|stop|fini/i.test(t)) return endCurrentGame();

  const wordObj = currentGame.data.word as MysteryWord;
  const word = wordObj.word;
  const wordNorm = word.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const revealed = new Set<number>(currentGame.data.revealed as number[]);
  const wrongLetters = currentGame.data.wrongLetters as string[];

  // Full word guess
  if (t.length > 1 && t === wordNorm) {
    currentGame.score = 1;
    currentGame = null;
    return `🎉 BRAVO ! C'était bien "${word}" ! ${wordObj.description} Tu veux un autre mot ?`;
  }

  // Single letter guess
  const letter = t.length === 1 ? t : null;
  if (!letter) {
    if (t.length > 1) {
      currentGame.step++;
      if (currentGame.step >= currentGame.maxSteps) {
        currentGame = null;
        return `Non ! Le mot était "${word}" ! ${wordObj.description} Tu veux retenter ? 😊`;
      }
      return `Non, ce n'est pas ça ! Il te reste ${currentGame.maxSteps - currentGame.step} essais. Propose une lettre ou le mot entier !`;
    }
    return `Propose une lettre (A, B, C…) ou essaie de deviner le mot entier ! 🔤`;
  }

  // Check letter
  const letterNorm = letter.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let found = false;
  for (let i = 0; i < wordNorm.length; i++) {
    if (wordNorm[i] === letterNorm && !revealed.has(i)) {
      revealed.add(i);
      found = true;
    }
  }

  currentGame.data.revealed = Array.from(revealed);

  if (found) {
    const display = buildWordDisplay(word, revealed);
    // Check if word is fully revealed
    if (revealed.size === word.length) {
      currentGame.score = 1;
      currentGame = null;
      return `🎉 "${letter.toUpperCase()}" ! OUI ! Le mot est "${word}" ! ${wordObj.description} Bravo ! Tu veux un autre mot ?`;
    }
    return `✅ Oui, il y a un "${letter.toUpperCase()}" !\n\n${display}\n\n(${currentGame.maxSteps - currentGame.step} essais restants)`;
  }

  // Wrong letter
  wrongLetters.push(letter.toUpperCase());
  currentGame.step++;

  if (currentGame.step >= currentGame.maxSteps) {
    currentGame = null;
    return `❌ Pas de "${letter.toUpperCase()}" ! C'est fini, le mot était "${word}" ! ${wordObj.description} Tu veux retenter ?`;
  }

  const display = buildWordDisplay(word, revealed);
  return `❌ Pas de "${letter.toUpperCase()}" ! Lettres essayées : ${wrongLetters.join(", ")}\n\n${display}\n\n(${currentGame.maxSteps - currentGame.step} essais restants)`;
}
