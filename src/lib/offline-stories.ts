/**
 * Offline stories, mini-games, riddles, and response pools.
 */

import type { OfflineIntent } from "./offline-intents";
import {
  isAnimalGameActive,
  isAnimalGameTrigger,
  startAnimalGame,
  handleAnimalGameInput,
} from "./animalGuessGame";
import {
  isMemoryGameActive,
  isMemoryGameTrigger,
  startMemoryGame,
  handleMemoryGameInput,
} from "./memoryGame";
import {
  isLearningActive,
  isLearningTrigger,
  startLearning,
  handleLearningInput,
} from "./learningEngine";

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

export const RESPONSES: Record<string, string[]> = {
  GREETING: [
    "Coucou {name} ! Content de te voir ! 😊", "Salut {name} ! Tu veux jouer ou discuter ?",
    "Hey ! Trop content ! On fait quoi aujourd'hui ?", "Salut toi ! Ça fait plaisir ! Tu as envie de quoi ?",
    "Coucou ! Je suis là ! Allez, on s'amuse ? 🎉", "Hey {name} ! Je t'attendais ! On commence ?",
    "Salut ! Tu vas bien ? Je suis prêt quand tu veux !", "Coucou ! Devine quoi ? J'ai une idée ! 😊",
    "Tu es là ! Trop bien ! On joue ensemble ?", "Oh ! {name} ! Ça te dit de jouer ?",
  ],
  FAREWELL: [
    "Au revoir {name} ! À très bientôt ! 😊", "Bonne nuit {name} ! Fais de beaux rêves ! 🌙",
    "Salut ! Tu vas me manquer ! À plus tard ! 👋", "À bientôt {name} ! C'était trop bien !",
    "À demain {name} ! On se repose bien ! 🌙", "On se revoit vite ! Je suis là quand tu veux !",
    "Dors bien {name} ! Je t'attends demain !", "Bonne nuit ! Je reste là, toujours ! 💙",
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
    "Super ! Alors on continue ! 😊", "Génial ! Je savais que tu dirais oui !",
    "Trop bien ! C'est parti !", "Allez ! On y va ! 🎉", "Yes ! Tu es prêt !",
  ],
  QUESTION_SIMPLE_NO: [
    "Pas de souci ! Tu veux faire autre chose ?", "D'accord ! On fait quoi alors ?",
    "Ok ! Dis-moi ce que tu veux faire 😊", "Tu choisis ! C'est toi le chef !",
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
    "Ça me fait trop plaisir ! Tu es génial {name} ! 🌟", "Waouh, trop content ! Continue comme ça ! 😊",
    "Haha, moi aussi je suis super content ! 🎉", "Bravo {name} ! Tu es fort ! 💪",
    "Bien joué ! Tu es incroyable !", "Wow ! Tu es vraiment génial !",
    "Je suis fier de toi {name} ! 🌟", "Tu es unique et spécial ! Continue !",
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
    "Oh merci {name} ! Toi aussi t'es trop cool ! 😊", "Haha, c'est trop gentil ! Tu es le meilleur ! 🌟",
    "Merci ! Moi aussi je t'adore {name} ! 💙", "Ça me fait tellement plaisir ! Tu es spécial ! ✨",
    "Tu es vraiment quelqu'un de bien {name} ! Je t'aime bien ! 😊",
  ],
  HELP: [
    "Je suis là pour t'aider {name} ! Dis-moi 😊", "Bien sûr ! Qu'est-ce que tu veux savoir ?",
    "Je t'aide ! Explique-moi 😊", "D'accord, on va voir ça ensemble !",
    "Pas de souci, je t'explique simplement !",
  ],
  NOT_UNDERSTOOD: [
    "Hmm, je n'ai pas bien compris. Tu peux répéter ? 😊", "J'ai pas tout capté ! Redis-moi ?",
    "Oups, j'ai raté ça ! Tu peux re-dire ?", "Parle un peu plus fort {name} ! 😊",
    "Encore une fois ? Je n'ai pas entendu !", "Dis-moi encore ! Je t'écoute !",
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
    "Bravo ! Bien joué !", "Tu es fort {name} !", "Génial ! Super !", "Wow ! Incroyable !",
    "Tu peux le faire !", "Je crois en toi !", "Essaie encore !", "Tu recommences ?",
    "Encore une fois ?", "C'est amusant !", "On rigole bien !", "Tu es rapide !",
    "Tu es malin !", "Bien vu !", "C'est toi le chef !",
  ],
  STORY_TRANSITION: [
    "Tu veux une histoire ?", "Je vais te raconter une histoire !", "Il était une fois…",
    "Tu préfères pirate ou princesse ?", "Choisis une aventure !", "Imagine… 🌟",
    "Écoute bien !", "La suite arrive !", "Tu veux savoir ?", "Surprise !",
    "Et là… que se passe-t-il ?", "Tu décides !", "On continue l'histoire ?",
    "C'est magique !", "Encore un peu ?",
  ],
  CALM: [
    "Tout va bien {name}.", "Respire doucement.", "Je suis là. Toujours là.",
    "On se calme. On se repose.", "Dors bien {name}. 🌙", "Fais de beaux rêves.",
    "Je t'attends. Toujours.", "Je ne pars pas. Je reste avec toi.",
  ],
  THINKING: [
    "Je réfléchis…", "Hmm…", "Bonne question !", "Intéressant !",
    "Je pense que oui.", "Peut-être !", "On va voir !",
  ],
  ADVENTURE: [
    "On explore ! 🗺️", "On découvre !", "On part à l'aventure !", "On voyage !",
    "On vole ! ✈️", "On saute !", "On court !", "On nage ! 🏊",
  ],
  HUMOR: [
    "C'est drôle ! 😄", "Haha !", "Tu es rigolo {name} !",
    "Encore une blague ?", "Tu veux rire ?",
  ],
  BOND: [
    "Je suis content d'être avec toi.", "Ça me fait plaisir {name} !", "Je t'aime bien !",
    "Tu es mon ami ! 💙", "On est une équipe !", "Toujours ensemble !",
    "Tu es spécial {name} !", "Tu es unique !", "Je suis là pour toi. Toujours.",
  ],
  CONTROL: ["D'accord 😊", "OK ! C'est parti !", "Bien reçu !", "Je fais ça 😊"],
  EDUCATION: [
    "Bonne question {name} ! Tu es très curieux ! 🧠",
    "Waouh, tu apprends vite ! Tu veux savoir autre chose ? 📚",
    "C'est super d'être curieux comme ça ! Pose-moi une autre question ! 🌟",
    "Tu es vraiment malin {name} ! On continue à apprendre ? 🧪",
    "J'adore quand tu poses des questions ! Tu veux en savoir plus ? 🔬",
    "Le savoir c'est un super-pouvoir ! Tu en veux encore ? ✨",
    "Trop bien de discuter de ça ! Tu as d'autres questions ? 🌍",
    "Tu es un petit génie {name} ! Prochaine question ? 💡",
  ],
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LOCAL STORIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const LOCAL_STORIES: Record<StoryTheme, string[]> = {
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

export const RIDDLES = [
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

export const TRUE_FALSE = [
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

export const ANIMAL_QUIZ = [
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

export const WOULD_YOU_RATHER = [
  "Tu préfères voler comme un oiseau ou nager comme un poisson ? 🐦🐟",
  "Tu préfères être invisible ou pouvoir voler ? 🦸",
  "Tu préfères vivre dans un château ou dans une fusée ? 🏰🚀",
  "Tu préfères avoir un dragon ou une licorne ? 🐉🦄",
  "Tu préfères manger que du chocolat ou que des bonbons ? 🍫🍬",
  "Tu préfères parler aux animaux ou parler toutes les langues ? 🐾🌍",
  "Tu préfères vivre sous l'eau ou dans les nuages ? 🌊☁️",
  "Tu préfères être un super-héros ou un magicien ? 🦸‍♂️🧙",
  "Tu préfères être le plus rapide ou le plus fort ? 💨💪",
  "Tu préfères voyager dans le temps ou dans l'espace ? ⏰🚀",
];

export const TONGUE_TWISTERS = [
  "Essaie de dire vite : Les chaussettes de l'archiduchesse sont-elles sèches ou archi-sèches ? 🧦😄",
  "Répète vite : Un chasseur sachant chasser sait chasser sans son chien ! 🐕😄",
  "Dis vite : Panier piano panier piano ! 🎹",
  "Essaie : Si six scies scient six cyprès, six cent six scies scient six cent six cyprès ! 🌲",
  "Répète : Trois tortues trottaient sur un trottoir très étroit ! 🐢",
  "Dis vite trois fois : Papier piano panier ! 📄🎹",
];

export type MiniGameType = "riddle" | "true_false" | "animal_quiz" | "would_you_rather" | "tongue_twister" | "animal_guess" | "memory_game" | "learning";

export function pickMiniGame(pickRandom: (pool: string[], key: string) => string): { type: MiniGameType; text: string } {
  const gameType = pickRandom(
    ["riddle", "true_false", "animal_quiz", "would_you_rather", "tongue_twister", "animal_guess", "memory_game", "learning"],
    "game_type"
  ) as MiniGameType;

  switch (gameType) {
    case "animal_guess": {
      const intro = startAnimalGame(undefined, 7);
      return { type: "animal_guess", text: intro };
    }
    case "memory_game": {
      const intro = startMemoryGame(undefined, 7);
      return { type: "memory_game", text: intro };
    }
    case "learning": {
      const intro = startLearning(undefined, 7);
      return { type: "learning", text: intro };
    }
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

// Re-export game checks for the main engine
export {
  isAnimalGameActive, isAnimalGameTrigger, startAnimalGame, handleAnimalGameInput,
  isMemoryGameActive, isMemoryGameTrigger, startMemoryGame, handleMemoryGameInput,
  isLearningActive, isLearningTrigger, startLearning, handleLearningInput,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FOLLOW-UP ENGINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const FOLLOW_UPS: Record<string, string[]> = {
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
  EDUCATION: [" Tu veux apprendre autre chose ? 😊", " Cool hein ? Tu veux une autre question ?", ""],
  QUESTION_SIMPLE: [""],
};
