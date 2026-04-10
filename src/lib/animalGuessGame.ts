/**
 * Bobby Game Engine — Devine l'Animal 🐾
 * 
 * Mini-jeu vocal interactif 100% offline.
 * L'enfant pose des questions ou devine l'animal que Bobby a choisi.
 * Adaptatif selon l'âge, toujours encourageant, jamais frustrant.
 */

import { recordAnswer } from "./gameEngine";

// ─── Animal Database ────────────────────────────────────────

export interface AnimalData {
  nom: string;
  aliases: string[];          // accepted answer variants
  taille: string;
  habitat: string;
  bruit: string;
  alimentation: string;
  couleur: string;
  pattes: string;
  particularite: string;
  indice_facile: string;
  indice_moyen: string;
  indice_difficile: string;
}

const ANIMALS: AnimalData[] = [
  {
    nom: "chien",
    aliases: ["chien", "toutou", "le chien", "un chien"],
    taille: "moyen",
    habitat: "Il vit dans les maisons avec les humains 🏠",
    bruit: "Il fait wouf wouf ! 🐕",
    alimentation: "Il mange des croquettes et de la pâtée",
    couleur: "Il peut être de plein de couleurs : marron, noir, blanc…",
    pattes: "Il a 4 pattes",
    particularite: "Il remue la queue quand il est content !",
    indice_facile: "Je suis le meilleur ami de l'homme 🐕",
    indice_moyen: "J'aboie et j'adore jouer à la balle",
    indice_difficile: "J'adore courir et me promener dehors",
  },
  {
    nom: "chat",
    aliases: ["chat", "minou", "le chat", "un chat", "chaton"],
    taille: "petit",
    habitat: "Il vit dans les maisons mais adore se balader dehors 🏠",
    bruit: "Il fait miaou ! 🐱",
    alimentation: "Il mange des croquettes et il adore le poisson",
    couleur: "Il peut être noir, blanc, gris, roux, tigré…",
    pattes: "Il a 4 pattes avec des griffes rétractables",
    particularite: "Il ronronne quand il est content !",
    indice_facile: "Je ronronne quand on me caresse 🐱",
    indice_moyen: "J'adore dormir et attraper les souris",
    indice_difficile: "Je suis indépendant et très agile",
  },
  {
    nom: "lion",
    aliases: ["lion", "le lion", "un lion"],
    taille: "très grand",
    habitat: "Il vit dans la savane en Afrique 🌍",
    bruit: "Il rugit très fort ! ROOAAAR ! 🦁",
    alimentation: "Il mange de la viande, c'est un carnivore",
    couleur: "Il est doré avec une grande crinière",
    pattes: "Il a 4 pattes très puissantes",
    particularite: "Le mâle a une grande crinière autour de la tête !",
    indice_facile: "Je suis le roi des animaux 👑🦁",
    indice_moyen: "J'ai une grande crinière et je rugis",
    indice_difficile: "Je vis en Afrique dans la savane",
  },
  {
    nom: "éléphant",
    aliases: ["éléphant", "elephant", "l'éléphant", "un éléphant"],
    taille: "énorme, le plus gros animal terrestre !",
    habitat: "Il vit en Afrique et en Asie, dans la savane et la forêt 🌿",
    bruit: "Il barrit ! C'est un son de trompette 🎺",
    alimentation: "Il mange des plantes, des feuilles et des fruits",
    couleur: "Il est gris",
    pattes: "Il a 4 grosses pattes comme des piliers",
    particularite: "Il a une trompe qui lui sert de main, de douche et de tuba !",
    indice_facile: "J'ai une grande trompe et de grandes oreilles 🐘",
    indice_moyen: "Je suis le plus gros animal sur terre",
    indice_difficile: "Je vis en troupeau et j'ai une très bonne mémoire",
  },
  {
    nom: "tigre",
    aliases: ["tigre", "le tigre", "un tigre"],
    taille: "grand",
    habitat: "Il vit dans les forêts d'Asie 🌲",
    bruit: "Il grogne et rugit !",
    alimentation: "Il mange de la viande, c'est un chasseur",
    couleur: "Il est orange avec des rayures noires",
    pattes: "Il a 4 pattes très musclées",
    particularite: "Chaque tigre a des rayures uniques, comme nos empreintes !",
    indice_facile: "J'ai des rayures oranges et noires 🐯",
    indice_moyen: "Je suis le plus grand félin du monde",
    indice_difficile: "J'adore nager, pas comme les autres chats !",
  },
  {
    nom: "girafe",
    aliases: ["girafe", "la girafe", "une girafe"],
    taille: "très grande, la plus grande !",
    habitat: "Elle vit dans la savane en Afrique 🌍",
    bruit: "Elle est presque silencieuse, elle fait de petits sons",
    alimentation: "Elle mange des feuilles tout en haut des arbres",
    couleur: "Elle est jaune avec des taches marron",
    pattes: "Elle a 4 très longues pattes",
    particularite: "Son cou peut mesurer 2 mètres de long !",
    indice_facile: "J'ai le cou le plus long de tous les animaux 🦒",
    indice_moyen: "Je mange les feuilles en haut des arbres",
    indice_difficile: "J'ai des taches uniques comme des empreintes",
  },
  {
    nom: "poisson",
    aliases: ["poisson", "le poisson", "un poisson"],
    taille: "petit à moyen",
    habitat: "Il vit dans l'eau : rivières, lacs ou la mer 🌊",
    bruit: "Il ne fait pas de bruit ! Il est silencieux",
    alimentation: "Il mange des algues ou d'autres petits poissons",
    couleur: "Il peut être de toutes les couleurs ! Rouge, bleu, jaune…",
    pattes: "Il n'a pas de pattes, il a des nageoires !",
    particularite: "Il respire sous l'eau grâce à des branchies !",
    indice_facile: "Je nage dans l'eau toute la journée 🐟",
    indice_moyen: "Je respire sous l'eau grâce à mes branchies",
    indice_difficile: "Je n'ai pas de pattes mais des nageoires",
  },
  {
    nom: "oiseau",
    aliases: ["oiseau", "l'oiseau", "un oiseau"],
    taille: "petit à moyen",
    habitat: "Il vit dans les arbres, le ciel et parfois dans les maisons 🌳",
    bruit: "Il chante et il gazouille ! Cui-cui ! 🎵",
    alimentation: "Il mange des graines, des insectes ou des vers",
    couleur: "Il peut être de plein de couleurs : rouge, bleu, vert…",
    pattes: "Il a 2 pattes et 2 ailes",
    particularite: "Il peut voler et faire des nids !",
    indice_facile: "J'ai des ailes et je vole dans le ciel 🐦",
    indice_moyen: "Je chante le matin pour te réveiller",
    indice_difficile: "Je construis des nids dans les arbres",
  },
  {
    nom: "singe",
    aliases: ["singe", "le singe", "un singe"],
    taille: "moyen",
    habitat: "Il vit dans les forêts tropicales et la jungle 🌴",
    bruit: "Il crie et fait des bruits rigolos !",
    alimentation: "Il mange des bananes et des fruits 🍌",
    couleur: "Il est marron ou noir",
    pattes: "Il a 2 bras et 2 jambes, comme nous !",
    particularite: "Il utilise sa queue pour s'accrocher aux branches !",
    indice_facile: "J'adore les bananes et je grimpe aux arbres 🐒",
    indice_moyen: "Je ressemble un peu aux humains",
    indice_difficile: "Je vis dans la jungle et je suis très malin",
  },
  {
    nom: "lapin",
    aliases: ["lapin", "le lapin", "un lapin"],
    taille: "petit",
    habitat: "Il vit dans des terriers ou dans les maisons 🏡",
    bruit: "Il est très silencieux, il fait de petits couinements",
    alimentation: "Il adore les carottes, la salade et le foin 🥕",
    couleur: "Il est blanc, gris, marron ou noir",
    pattes: "Il a 4 pattes dont 2 très grandes pour sauter !",
    particularite: "Il peut sauter très haut et très loin !",
    indice_facile: "J'ai de grandes oreilles et j'adore les carottes 🐰",
    indice_moyen: "Je saute partout avec mes grandes pattes arrière",
    indice_difficile: "Je vis dans un terrier sous la terre",
  },
  {
    nom: "cheval",
    aliases: ["cheval", "le cheval", "un cheval", "poney"],
    taille: "grand",
    habitat: "Il vit dans les prairies et les écuries 🐴",
    bruit: "Il hennit ! Hiiiiiii ! 🐎",
    alimentation: "Il mange de l'herbe, du foin et des pommes",
    couleur: "Il peut être marron, noir, blanc ou tacheté",
    pattes: "Il a 4 pattes avec des sabots",
    particularite: "On peut le monter et il galope très vite !",
    indice_facile: "On me monte et je galope très vite 🐴",
    indice_moyen: "J'ai des sabots et une belle crinière",
    indice_difficile: "Je vis dans une écurie et j'adore les pommes",
  },
  {
    nom: "panda",
    aliases: ["panda", "le panda", "un panda"],
    taille: "grand",
    habitat: "Il vit dans les forêts de bambou en Chine 🎋",
    bruit: "Il fait des petits cris et des bêlements !",
    alimentation: "Il mange du bambou, beaucoup de bambou ! 38 kg par jour !",
    couleur: "Il est noir et blanc",
    pattes: "Il a 4 pattes",
    particularite: "Il mange du bambou 14 heures par jour !",
    indice_facile: "Je suis noir et blanc et j'adore le bambou 🐼",
    indice_moyen: "Je vis en Chine et je suis très mignon",
    indice_difficile: "Je passe presque toute la journée à manger",
  },
  {
    nom: "crocodile",
    aliases: ["crocodile", "le crocodile", "un crocodile", "croco"],
    taille: "très grand",
    habitat: "Il vit dans les rivières et les marécages en Afrique et en Australie 🐊",
    bruit: "Il gronde et claque sa mâchoire !",
    alimentation: "Il mange de la viande et du poisson",
    couleur: "Il est vert foncé avec des écailles",
    pattes: "Il a 4 pattes courtes et une longue queue",
    particularite: "Ses dents repoussent toute sa vie !",
    indice_facile: "J'ai plein de dents et je vis dans l'eau 🐊",
    indice_moyen: "Je ressemble à un dinosaure avec mes écailles",
    indice_difficile: "Mes dents repoussent toute ma vie",
  },
  {
    nom: "dauphin",
    aliases: ["dauphin", "le dauphin", "un dauphin"],
    taille: "moyen à grand",
    habitat: "Il vit dans la mer et l'océan 🌊",
    bruit: "Il siffle et fait des clics !",
    alimentation: "Il mange du poisson et des calamars",
    couleur: "Il est gris avec le ventre blanc",
    pattes: "Il n'a pas de pattes mais des nageoires !",
    particularite: "Il est super intelligent et adore jouer !",
    indice_facile: "Je saute hors de l'eau et je suis très intelligent 🐬",
    indice_moyen: "Je vis dans la mer et j'adore jouer",
    indice_difficile: "Je communique avec des sifflements",
  },
  {
    nom: "tortue",
    aliases: ["tortue", "la tortue", "une tortue"],
    taille: "petit à grand",
    habitat: "Elle vit sur terre ou dans la mer, ça dépend de l'espèce 🐢",
    bruit: "Elle est très silencieuse !",
    alimentation: "Elle mange de la salade, des fruits et des insectes",
    couleur: "Elle est verte et marron avec une carapace",
    pattes: "Elle a 4 pattes (ou des nageoires pour les tortues de mer)",
    particularite: "Elle peut vivre plus de 100 ans !",
    indice_facile: "Je porte ma maison sur mon dos 🐢",
    indice_moyen: "Je suis lente mais je peux vivre très longtemps",
    indice_difficile: "J'ai une carapace qui me protège",
  },
];

// ─── Game State ─────────────────────────────────────────────

export interface AnimalGuessState {
  active: boolean;
  animal: AnimalData | null;
  tries: number;
  maxTries: number;
  cluesGiven: number;
  questionsAsked: string[];   // track questions to avoid repeats
  childAge: number;
}

let gameState: AnimalGuessState = {
  active: false,
  animal: null,
  tries: 0,
  maxTries: 5,
  cluesGiven: 0,
  questionsAsked: [],
  childAge: 7,
};

// ─── Phrase Variants ────────────────────────────────────────

const CORRECT_PHRASES = [
  "Bravo {name} !! 🎉 C'est ça, c'était {article}{animal} ! Tu es trop fort !",
  "Ouiii ! Bien joué {name} ! 🌟 C'était {article}{animal} !",
  "Génial {name} ! Tu as trouvé ! C'est {article}{animal} ! 🎊",
  "Exact ! Bravo champion ! 🏆 C'était bien {article}{animal} !",
  "Waouh {name} ! Tu l'as deviné ! C'est {article}{animal} ! 👏",
];

const INCORRECT_PHRASES = [
  "Hmm non, ce n'est pas ça {name} ! 😊 Mais tu vas trouver, j'en suis sûr !",
  "Pas tout à fait ! Essaie encore {name} ! 💪",
  "Presque ! Mais ce n'est pas ça. Tu veux un indice ? 🤔",
  "Non, c'est pas ça… Mais tu y es presque {name} ! Continue !",
  "Raté ! Mais ne t'inquiète pas, tu vas trouver ! 😄",
];

const REVEAL_PHRASES = [
  "C'était {article}{animal} ! 😊 C'est pas grave {name}, tu feras mieux la prochaine fois !",
  "La réponse était {article}{animal} ! Tu as bien joué quand même {name} ! 💪",
  "C'était {article}{animal} ! Rien à dire, c'était dur ! On recommence ? 😊",
];

const REPLAY_PHRASES = [
  "On rejoue ? J'ai un autre animal en tête ! 🐾",
  "Tu veux deviner un autre animal ? 😊",
  "Allez, une autre partie ? Je choisis un nouvel animal ! 🎮",
];

const INTRO_PHRASES = [
  "Super {name} ! On va jouer à Devine l'Animal ! 🐾 Je pense à un animal… et tu dois deviner ! Tu peux me poser des questions ou essayer de deviner directement 😊",
  "Génial {name} ! C'est parti pour Devine l'Animal ! 🐾 J'ai choisi un animal secret… pose-moi des questions ou propose une réponse ! 🤔",
  "Youpi {name} ! Devine l'Animal ! 🐾 J'ai un animal en tête… À toi de le trouver ! Pose des questions ou devine ! 😊",
];

// ─── Helpers ────────────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function normalize(text: string): string {
  return text.toLowerCase().trim()
    .replace(/[!?.…,;:"""«»()[\]{}]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getArticle(nom: string): string {
  const vowels = "aeéèêiïîoôuùûyh";
  const first = nom.charAt(0).toLowerCase();
  if (nom === "oiseau" || nom === "éléphant") return "un ";
  if (vowels.includes(first)) return "un ";
  if (["chat", "chien", "cheval", "crocodile", "chameau"].includes(nom)) return "un ";
  if (["girafe", "tortue"].includes(nom)) return "une ";
  if (["poisson", "singe", "lapin", "lion", "tigre", "panda", "dauphin"].includes(nom)) return "un ";
  return "un ";
}

function personalize(text: string, childName?: string, animal?: AnimalData): string {
  let result = text.replace(/\{name\}/g, childName || "");
  if (animal) {
    result = result
      .replace(/\{animal\}/g, animal.nom)
      .replace(/\{article\}/g, getArticle(animal.nom));
  }
  return result;
}

// ─── Intent Detection ───────────────────────────────────────

type GameIntent = "GUESS" | "QUESTION_HABITAT" | "QUESTION_BRUIT" | "QUESTION_ALIMENTATION" |
  "QUESTION_TAILLE" | "QUESTION_COULEUR" | "QUESTION_PATTES" | "QUESTION_PARTICULARITE" |
  "HELP" | "STOP" | "REPLAY" | "UNKNOWN";

function detectGameIntent(text: string): GameIntent {
  const n = normalize(text);

  // Stop
  if (/^(stop|arrête|fini|j'arrête|je veux arrêter|on arrête|fin du jeu|assez|non merci)/.test(n)) return "STOP";

  // Replay
  if (/^(oui|ouais|ok|on rejoue|encore|une autre|rejouer|d'accord|allez|yes|yep|oui on rejoue)/.test(n)) return "REPLAY";

  // Help / clue request
  if (/indice|aide|un indice|aide.moi|un coup de main|je sais pas|je ne sais pas|aucune idée|difficile|c'est dur|help/.test(n)) return "HELP";

  // Questions about the animal
  if (/où.*vi[tv]|habitat|il habite|elle habite|vit.*(où|ou)|il est (de|d'où)|maison/.test(n)) return "QUESTION_HABITAT";
  if (/bruit|son|cri|il fait (quel|quoi comme)|elle fait (quel|quoi comme)|il dit quoi|quel bruit|quel son/.test(n)) return "QUESTION_BRUIT";
  if (/mange|manger|nourriture|alimentation|il mange quoi|elle mange quoi|se nourrit/.test(n)) return "QUESTION_ALIMENTATION";
  if (/taille|grand|petit|gros|mesure|combien.*mesure|il est (grand|petit|gros)/.test(n)) return "QUESTION_TAILLE";
  if (/couleur|il est (quel|de quelle)|elle est (quel|de quelle).*couleur/.test(n)) return "QUESTION_COULEUR";
  if (/patte|jambe|combien de pattes|il a des pattes|des ailes|nageoires/.test(n)) return "QUESTION_PATTES";
  if (/particularit|spécial|il a quoi de spécial|c'est quoi son truc|original|unique/.test(n)) return "QUESTION_PARTICULARITE";

  // Guess — check if they mention an animal name
  if (/c'est (un|une|le|la|l')|je pense|je dis|je propose|c'est pas|est-ce (un|une|le|la|l')|c'est/.test(n)) return "GUESS";

  // If the input is just an animal name, it's a guess
  const allNames = ANIMALS.flatMap(a => a.aliases);
  if (allNames.some(name => n.includes(name))) return "GUESS";

  return "UNKNOWN";
}

// ─── Game Logic ─────────────────────────────────────────────

export function isAnimalGameActive(): boolean {
  return gameState.active;
}

export function startAnimalGame(childName?: string, childAge = 7): string {
  const animal = pickRandom(ANIMALS);
  gameState = {
    active: true,
    animal,
    tries: 0,
    maxTries: childAge <= 6 ? 7 : childAge <= 9 ? 6 : 5,
    cluesGiven: 0,
    questionsAsked: [],
    childAge,
  };

  const intro = personalize(pickRandom(INTRO_PHRASES), childName, animal);

  // Young kids get an automatic first clue
  if (childAge <= 6) {
    return intro + `\n\nPremier indice : ${animal.indice_facile}`;
  }

  return intro;
}

export function stopAnimalGame(): string {
  const animal = gameState.animal;
  gameState.active = false;
  gameState.animal = null;
  if (animal) {
    return `D'accord ! Mon animal secret c'était ${getArticle(animal.nom)}${animal.nom} ! 😊 On rejouera une prochaine fois !`;
  }
  return "D'accord, on arrête ! On rejouera quand tu veux ! 😊";
}

export function handleAnimalGameInput(text: string, childName?: string): string {
  if (!gameState.active || !gameState.animal) {
    return startAnimalGame(childName, gameState.childAge);
  }

  const intent = detectGameIntent(text);
  const animal = gameState.animal;

  switch (intent) {
    case "STOP":
      return stopAnimalGame();

    case "REPLAY":
      return startAnimalGame(childName, gameState.childAge);

    case "HELP":
      return giveClue(childName);

    case "QUESTION_HABITAT": {
      gameState.questionsAsked.push("habitat");
      return `${animal.habitat} 😊 Tu as une idée ?`;
    }
    case "QUESTION_BRUIT": {
      gameState.questionsAsked.push("bruit");
      return `${animal.bruit} Tu devines ?`;
    }
    case "QUESTION_ALIMENTATION": {
      gameState.questionsAsked.push("alimentation");
      return `${animal.alimentation} ! Alors, tu sais ? 🤔`;
    }
    case "QUESTION_TAILLE": {
      gameState.questionsAsked.push("taille");
      return `Cet animal est ${animal.taille} ! Ça t'aide ? 😊`;
    }
    case "QUESTION_COULEUR": {
      gameState.questionsAsked.push("couleur");
      return `${animal.couleur} ! Tu as deviné ? 🎨`;
    }
    case "QUESTION_PATTES": {
      gameState.questionsAsked.push("pattes");
      return `${animal.pattes} ! Tu vois de quel animal il s'agit ? 🤔`;
    }
    case "QUESTION_PARTICULARITE": {
      gameState.questionsAsked.push("particularite");
      return `${animal.particularite} Alors ? 😊`;
    }

    case "GUESS":
      return handleGuess(text, childName);

    case "UNKNOWN": {
      // Maybe they're trying to guess with just the animal name
      const n = normalize(text);
      if (ANIMALS.some(a => a.aliases.some(alias => n.includes(alias)))) {
        return handleGuess(text, childName);
      }
      // Redirect to game
      const remaining = gameState.maxTries - gameState.tries;
      return `On joue aux animaux ${childName || ""} ! 🐾 Pose-moi une question sur l'animal ou essaie de deviner ! Il te reste ${remaining} essais 😊`;
    }
  }
}

function handleGuess(text: string, childName?: string): string {
  const animal = gameState.animal!;
  const n = normalize(text);

  // Check if the guess matches
  const isCorrect = animal.aliases.some(alias => n.includes(alias));

  if (isCorrect) {
    const response = personalize(pickRandom(CORRECT_PHRASES), childName, animal);
    // Record score
    try {
      const { recordAnswer } = require("./gameEngine");
      const score = recordAnswer("devine_animal", true);
      const scoreText = score.streak > 1
        ? ` 🔥 Série de ${score.streak} bonnes réponses !`
        : "";
      gameState.active = false;
      return response + scoreText + "\n\n" + pickRandom(REPLAY_PHRASES);
    } catch {
      gameState.active = false;
      return response + "\n\n" + pickRandom(REPLAY_PHRASES);
    }
  }

  // Incorrect guess
  gameState.tries++;

  if (gameState.tries >= gameState.maxTries) {
    // Game over — but NEVER say "lost", always encourage
    const reveal = personalize(pickRandom(REVEAL_PHRASES), childName, animal);
    try {
      const { recordAnswer } = require("./gameEngine");
      recordAnswer("devine_animal", false);
    } catch { /* ignore */ }
    gameState.active = false;
    return reveal + "\n\n" + pickRandom(REPLAY_PHRASES);
  }

  const remaining = gameState.maxTries - gameState.tries;
  let response = personalize(pickRandom(INCORRECT_PHRASES), childName, animal);
  response += ` Il te reste ${remaining} essai${remaining > 1 ? "s" : ""} !`;

  // Auto-give a clue after 2 wrong guesses for young kids
  if (gameState.childAge <= 7 && gameState.tries >= 2 && gameState.cluesGiven < 3) {
    response += "\n\n" + giveClue(childName);
  }

  return response;
}

function giveClue(childName?: string): string {
  const animal = gameState.animal!;
  gameState.cluesGiven++;

  let clue: string;
  switch (gameState.cluesGiven) {
    case 1:
      clue = animal.indice_difficile;
      break;
    case 2:
      clue = animal.indice_moyen;
      break;
    case 3:
    default:
      clue = animal.indice_facile;
      break;
  }

  const prefixes = [
    `Indice ${gameState.cluesGiven} :`,
    `Voici un indice ${childName || ""} :`,
    `OK, un petit indice :`,
  ];

  return `${pickRandom(prefixes)} ${clue} 🤔`;
}

// ─── Trigger Detection ──────────────────────────────────────

/** Check if user text is asking to play "Devine l'Animal" */
export function isAnimalGameTrigger(text: string): boolean {
  const n = normalize(text);
  return /devine.*animal|deviner.*animal|jeu.*animal|jouer.*animal|animal.*deviner|guess.*animal|quel animal/.test(n);
}
