/**
 * Bobby Learning Engine — Apprends avec moi 🧠✨
 *
 * Système éducatif vocal 100% offline.
 * Micro-leçons interactives (1-3 min) avec quiz adaptatif.
 * 8 domaines, 3 niveaux, scoring gamifié.
 * Toujours encourageant, jamais frustrant.
 */

import { recordAnswer } from "./gameEngine";

// ─── Types ──────────────────────────────────────────────────

export type LearningCategory =
  | "animaux"
  | "couleurs"
  | "chiffres"
  | "alphabet"
  | "formes"
  | "émotions"
  | "objets"
  | "nature";

export type LearningLevel = "débutant" | "intermédiaire" | "avancé";

export type LessonPhase =
  | "CHOOSE_CATEGORY"
  | "INTRO"
  | "EXPLAIN"
  | "INTERACT"
  | "QUIZ"
  | "RESULT"
  | "ENDED";

// ─── Knowledge Base ─────────────────────────────────────────

interface LessonCard {
  fact: string;           // Bobby teaches this
  question: string;       // Bobby asks this
  acceptedAnswers: string[]; // fuzzy-matched answers
  hint: string;
  followUp: string;       // after correct answer
}

interface CategoryData {
  emoji: string;
  introPhrase: string;
  cards: {
    débutant: LessonCard[];
    intermédiaire: LessonCard[];
    avancé: LessonCard[];
  };
}

const KNOWLEDGE: Record<LearningCategory, CategoryData> = {
  animaux: {
    emoji: "🐾",
    introPhrase: "On va apprendre plein de choses sur les animaux !",
    cards: {
      débutant: [
        { fact: "Le chien est le meilleur ami de l'homme ! Il aboie pour communiquer 🐕", question: "Comment s'appelle le cri du chien ?", acceptedAnswers: ["aboiement", "aboie", "wouf", "ouaf"], hint: "Il fait wouf wouf !", followUp: "Exact ! Le chien aboie ! Tu connais d'autres animaux ?" },
        { fact: "Le chat ronronne quand il est content 🐱 C'est un son doux et calmant !", question: "Que fait le chat quand il est content ?", acceptedAnswers: ["ronronne", "ronronner", "il ronronne", "miaou"], hint: "C'est un son doux… rrrr…", followUp: "Oui ! Il ronronne ! Les chats dorment aussi 16 heures par jour !" },
        { fact: "La vache donne du lait ! On en fait du fromage, du yaourt et du beurre 🐄", question: "Qu'est-ce que la vache nous donne ?", acceptedAnswers: ["lait", "du lait", "le lait"], hint: "C'est blanc et on le boit au petit-déjeuner…", followUp: "Bravo ! Le lait de vache ! On en fait aussi du fromage 🧀" },
        { fact: "Le coq chante le matin pour réveiller tout le monde ! Cocorico ! 🐓", question: "Quel animal chante le matin ?", acceptedAnswers: ["coq", "le coq", "un coq"], hint: "Cocorico !", followUp: "Oui le coq ! Il se lève avant tout le monde !" },
        { fact: "Le poisson respire sous l'eau grâce à ses branchies 🐟", question: "Comment le poisson respire-t-il sous l'eau ?", acceptedAnswers: ["branchies", "ses branchies", "avec ses branchies", "les branchies"], hint: "Ce ne sont pas des poumons…", followUp: "Exactement ! Les branchies filtrent l'oxygène de l'eau !" },
      ],
      intermédiaire: [
        { fact: "Le caméléon change de couleur selon son humeur et la température 🦎", question: "Quel animal peut changer de couleur ?", acceptedAnswers: ["caméléon", "le caméléon", "un caméléon"], hint: "C'est un lézard un peu spécial…", followUp: "Oui ! Et chaque caméléon a ses propres motifs !" },
        { fact: "Les dauphins dorment avec un seul œil fermé ! L'autre moitié de leur cerveau reste éveillée 🐬", question: "Comment les dauphins dorment-ils ?", acceptedAnswers: ["un oeil", "un œil fermé", "un seul œil", "moitié du cerveau"], hint: "Ils gardent quelque chose d'ouvert…", followUp: "Incroyable hein ? C'est pour surveiller les prédateurs !" },
        { fact: "L'éléphant a une mémoire exceptionnelle ! Il peut se souvenir de chemins pendant des années 🐘", question: "Quel animal est connu pour sa grande mémoire ?", acceptedAnswers: ["éléphant", "l'éléphant", "elephant"], hint: "C'est le plus gros animal terrestre…", followUp: "Oui ! On dit même 'avoir une mémoire d'éléphant' !" },
        { fact: "Les abeilles dansent pour indiquer aux autres où trouver les fleurs 🐝🌸", question: "Comment les abeilles communiquent-elles ?", acceptedAnswers: ["danse", "en dansant", "elles dansent", "la danse"], hint: "Elles bougent d'une façon spéciale…", followUp: "Oui ! C'est la 'danse des abeilles', découverte par un scientifique !" },
      ],
      avancé: [
        { fact: "Le cœur de la baleine bleue est si gros qu'un enfant pourrait ramper dans ses artères ! 🐋", question: "Quel est l'animal avec le plus gros cœur ?", acceptedAnswers: ["baleine", "baleine bleue", "la baleine"], hint: "C'est le plus grand animal du monde…", followUp: "Son cœur pèse 600 kg, comme une petite voiture !" },
        { fact: "Les poulpes ont 3 cœurs et du sang bleu ! 🐙", question: "Combien de cœurs a un poulpe ?", acceptedAnswers: ["3", "trois", "3 coeurs", "trois cœurs"], hint: "Plus de 2 mais moins de 5…", followUp: "Et leur sang est bleu grâce au cuivre, pas au fer comme nous !" },
        { fact: "Le tardigrade est un micro-animal quasi indestructible ! Il survit dans l'espace ! 🔬", question: "Quel micro-animal peut survivre dans l'espace ?", acceptedAnswers: ["tardigrade", "le tardigrade"], hint: "Son nom veut dire 'qui marche lentement'…", followUp: "Les tardigrades résistent à tout : chaleur, froid, radiations !" },
      ],
    },
  },

  couleurs: {
    emoji: "🎨",
    introPhrase: "On va explorer le monde des couleurs !",
    cards: {
      débutant: [
        { fact: "Le rouge, c'est la couleur de la pomme, du cœur et du coquelicot ! 🍎❤️", question: "Tu peux me dire quelque chose de rouge ?", acceptedAnswers: ["pomme", "tomate", "fraise", "cœur", "coeur", "sang", "coquelicot", "feu", "cerise"], hint: "Un fruit qu'on croque… 🍎", followUp: "Super ! Le rouge c'est aussi la couleur de l'amour ❤️" },
        { fact: "Le bleu, c'est la couleur du ciel et de la mer ! 🌊💙", question: "Qu'est-ce qui est bleu dans la nature ?", acceptedAnswers: ["ciel", "mer", "eau", "océan", "le ciel", "la mer"], hint: "Regarde au-dessus de toi…", followUp: "Oui ! Le ciel est bleu à cause de la lumière du soleil qui se disperse !" },
        { fact: "Le jaune, c'est la couleur du soleil et des bananes ! ☀️🍌", question: "Qu'est-ce qui est jaune ?", acceptedAnswers: ["soleil", "banane", "citron", "poussin", "tournesol", "le soleil"], hint: "Il brille dans le ciel tous les jours…", followUp: "Bravo ! Le jaune c'est la couleur de la joie !" },
        { fact: "Le vert, c'est la couleur des feuilles et de l'herbe ! 🌿💚", question: "Qu'est-ce qui est vert ?", acceptedAnswers: ["herbe", "feuille", "arbre", "salade", "grenouille", "les feuilles"], hint: "On marche dessus au parc…", followUp: "Exact ! Les plantes sont vertes grâce à la chlorophylle !" },
      ],
      intermédiaire: [
        { fact: "En mélangeant du bleu et du jaune, on obtient du vert ! 🔵+🟡=🟢", question: "Quelle couleur obtient-on en mélangeant bleu et jaune ?", acceptedAnswers: ["vert", "du vert", "le vert"], hint: "C'est la couleur de l'herbe…", followUp: "Oui ! Et bleu + rouge ça fait… violet ! 💜" },
        { fact: "L'arc-en-ciel a 7 couleurs : rouge, orange, jaune, vert, bleu, indigo et violet 🌈", question: "Combien de couleurs a l'arc-en-ciel ?", acceptedAnswers: ["7", "sept", "7 couleurs"], hint: "Plus que 5 mais moins de 10…", followUp: "Les 7 couleurs ! Tu peux les retenir avec 'ROY G BIV' !" },
        { fact: "Le rose n'existe pas dans l'arc-en-ciel ! C'est un mélange de rouge et blanc 🩷", question: "Est-ce que le rose est dans l'arc-en-ciel ?", acceptedAnswers: ["non", "nan", "pas", "non il n'est pas"], hint: "Réfléchis aux 7 couleurs…", followUp: "Non ! Le rose est un mélange, pas une couleur spectrale !" },
      ],
      avancé: [
        { fact: "Les daltoniens ne voient pas toutes les couleurs ! Environ 8% des garçons sont daltoniens 👁️", question: "Comment appelle-t-on quelqu'un qui ne distingue pas certaines couleurs ?", acceptedAnswers: ["daltonien", "un daltonien", "daltonisme"], hint: "Le mot vient du scientifique Dalton…", followUp: "John Dalton a découvert ce trouble en 1798 !" },
        { fact: "Le noir absorbe toute la lumière, le blanc la réfléchit ! C'est pour ça qu'on a chaud en noir au soleil ☀️⬛", question: "Pourquoi a-t-on plus chaud en portant du noir ?", acceptedAnswers: ["absorbe", "absorbe la lumière", "il absorbe", "chaleur"], hint: "Le noir fait quelque chose avec la lumière…", followUp: "Le noir absorbe toute la lumière et la transforme en chaleur !" },
      ],
    },
  },

  chiffres: {
    emoji: "🔢",
    introPhrase: "On va jouer avec les chiffres et les nombres !",
    cards: {
      débutant: [
        { fact: "1 + 1 = 2 ! Comme 1 pomme + 1 pomme = 2 pommes ! 🍎🍎", question: "Combien font 1 + 1 ?", acceptedAnswers: ["2", "deux"], hint: "C'est le nombre après 1…", followUp: "Facile ! Et 2 + 1 ça fait… 3 ! Tu savais ?" },
        { fact: "2 + 2 = 4 ! Comme les 4 pattes d'un chien 🐕", question: "Combien font 2 + 2 ?", acceptedAnswers: ["4", "quatre"], hint: "Un chien a combien de pattes ?", followUp: "Parfait ! Tu calcules vite !" },
        { fact: "5 + 5 = 10 ! Comme les 10 doigts de tes mains ! 🖐️🖐️", question: "Combien font 5 + 5 ?", acceptedAnswers: ["10", "dix"], hint: "Compte tes doigts des deux mains…", followUp: "Bravo ! 10 comme tes 10 doigts !" },
        { fact: "3 + 4 = 7 ! Il y a 7 jours dans une semaine 📅", question: "Combien font 3 + 4 ?", acceptedAnswers: ["7", "sept"], hint: "Combien de jours dans une semaine ?", followUp: "Oui ! 7 comme les jours de la semaine !" },
        { fact: "10 - 3 = 7 ! Quand on enlève, on fait une soustraction ➖", question: "Combien font 10 - 3 ?", acceptedAnswers: ["7", "sept"], hint: "Enlève 3 à tes 10 doigts…", followUp: "Bien joué ! La soustraction c'est facile pour toi !" },
      ],
      intermédiaire: [
        { fact: "3 × 3 = 9 ! Multiplier c'est comme additionner plusieurs fois : 3+3+3 !", question: "Combien font 3 × 3 ?", acceptedAnswers: ["9", "neuf"], hint: "3 + 3 + 3 = ?", followUp: "Super ! La multiplication c'est de l'addition rapide !" },
        { fact: "Un nombre pair se termine par 0, 2, 4, 6 ou 8 ! Par exemple 12, 24, 36…", question: "Est-ce que 15 est un nombre pair ?", acceptedAnswers: ["non", "nan", "impair", "c'est impair"], hint: "Regarde le dernier chiffre : 5…", followUp: "Non, 15 est impair ! Il se termine par 5 !" },
        { fact: "12 ÷ 4 = 3 ! Diviser c'est partager en parts égales 🍕", question: "Si tu partages 12 bonbons entre 4 amis, combien chacun en a ?", acceptedAnswers: ["3", "trois"], hint: "12 partagé en 4…", followUp: "3 bonbons chacun ! Le partage c'est important 😊" },
        { fact: "100 centimes = 1 euro ! 💰", question: "Combien de centimes dans 1 euro ?", acceptedAnswers: ["100", "cent"], hint: "C'est un nombre rond à 3 chiffres…", followUp: "100 centimes ! Tu sais bien compter l'argent !" },
      ],
      avancé: [
        { fact: "Un carré a 4 côtés égaux. Son périmètre = côté × 4 !", question: "Si un carré a un côté de 5 cm, quel est son périmètre ?", acceptedAnswers: ["20", "vingt", "20 cm", "20cm"], hint: "5 × 4 = ?", followUp: "20 cm ! Tu maîtrises le périmètre !" },
        { fact: "1 km = 1 000 mètres ! C'est une grande distance à pied 🚶", question: "Combien de mètres dans 1 kilomètre ?", acceptedAnswers: ["1000", "mille", "1 000"], hint: "Kilo veut dire mille…", followUp: "1000 mètres ! 'Kilo' veut dire mille en grec !" },
        { fact: "7 × 8 = 56 ! C'est une des multiplications les plus dures à retenir 😄", question: "Combien font 7 × 8 ?", acceptedAnswers: ["56", "cinquante-six", "cinquante six"], hint: "C'est entre 50 et 60…", followUp: "56 ! Un truc : 5-6-7-8 → 56 = 7×8 !" },
      ],
    },
  },

  alphabet: {
    emoji: "🔤",
    introPhrase: "On va jouer avec les lettres et les mots !",
    cards: {
      débutant: [
        { fact: "L'alphabet français a 26 lettres ! De A à Z ! 🔤", question: "Combien de lettres dans l'alphabet ?", acceptedAnswers: ["26", "vingt-six", "vingt six"], hint: "Plus de 20 mais moins de 30…", followUp: "26 lettres ! A-B-C-D-E… tu les connais toutes ?" },
        { fact: "Les voyelles sont A, E, I, O, U, Y ! Sans elles, on ne pourrait pas parler 🗣️", question: "Peux-tu me dire une voyelle ?", acceptedAnswers: ["a", "e", "i", "o", "u", "y"], hint: "A, E, I…", followUp: "Bien joué ! Les voyelles donnent du son aux mots !" },
        { fact: "Le mot CHAT commence par la lettre C ! 🐱", question: "Par quelle lettre commence le mot CHAT ?", acceptedAnswers: ["c", "la lettre c", "un c"], hint: "Ccccc-hat…", followUp: "C ! Comme Chocolat et Cerise aussi !" },
        { fact: "Le mot le plus long en français est 'anticonstitutionnellement' avec 25 lettres ! 😮", question: "Le mot le plus long en français a combien de lettres ?", acceptedAnswers: ["25", "vingt-cinq", "vingt cinq"], hint: "Presque autant que l'alphabet…", followUp: "25 lettres ! C'est 'anticonstitutionnellement' !" },
      ],
      intermédiaire: [
        { fact: "Un palindrome est un mot qui se lit pareil à l'endroit et à l'envers ! Comme KAYAK 🛶", question: "Quel mot peut se lire dans les deux sens : K-A-Y-A-K ?", acceptedAnswers: ["kayak", "palindrome"], hint: "C'est un petit bateau…", followUp: "KAYAK ! D'autres palindromes : RADAR, SOS, ELLE !" },
        { fact: "Les consonnes sont toutes les lettres qui ne sont pas des voyelles : B, C, D, F…", question: "Est-ce que la lettre M est une voyelle ou une consonne ?", acceptedAnswers: ["consonne", "une consonne"], hint: "Les voyelles sont A, E, I, O, U, Y…", followUp: "Une consonne ! M n'est pas dans la liste des voyelles !" },
      ],
      avancé: [
        { fact: "L'anagramme consiste à mélanger les lettres d'un mot pour en faire un autre ! CHIEN → NICHE 🐕", question: "Si je mélange les lettres de CHIEN, quel mot je peux faire ?", acceptedAnswers: ["niche", "chine"], hint: "C'est là où dort le chien…", followUp: "NICHE ! Les anagrammes c'est comme un puzzle de lettres !" },
        { fact: "Le français utilise des accents : é, è, ê, ë, à, ù, ç… Ils changent la prononciation !", question: "Quel accent utilise-t-on dans le mot 'école' ?", acceptedAnswers: ["accent aigu", "aigu", "é"], hint: "C'est un petit trait qui monte vers la droite…", followUp: "L'accent aigu ! Il fait le son 'é' !" },
      ],
    },
  },

  formes: {
    emoji: "🔷",
    introPhrase: "On va découvrir les formes géométriques !",
    cards: {
      débutant: [
        { fact: "Le cercle est rond, comme un ballon ou une roue ! ⭕", question: "Quelle forme est ronde comme un ballon ?", acceptedAnswers: ["cercle", "rond", "le cercle", "un cercle"], hint: "⭕", followUp: "Le cercle ! Il n'a aucun coin !" },
        { fact: "Le carré a 4 côtés égaux et 4 coins ! Comme un dé vu de face 🎲", question: "Combien de côtés a un carré ?", acceptedAnswers: ["4", "quatre"], hint: "Pareil que les pattes d'un chien…", followUp: "4 côtés, tous de la même taille ! C'est ça un carré !" },
        { fact: "Le triangle a 3 côtés et 3 coins ! Comme un morceau de pizza 🍕", question: "Combien de côtés a un triangle ?", acceptedAnswers: ["3", "trois"], hint: "TRI veut dire trois…", followUp: "3 ! Tri-angle = 3 angles ! Tu as compris le truc !" },
      ],
      intermédiaire: [
        { fact: "Le rectangle a 4 côtés mais pas tous égaux : 2 longs et 2 courts ! Comme un livre 📖", question: "Quelle est la différence entre un carré et un rectangle ?", acceptedAnswers: ["côtés", "les côtés", "pas égaux", "longueur", "taille des côtés"], hint: "Regarde la longueur des côtés…", followUp: "Le carré a tous ses côtés égaux, le rectangle non !" },
        { fact: "L'hexagone a 6 côtés ! Comme les alvéoles des abeilles 🐝", question: "Combien de côtés a un hexagone ?", acceptedAnswers: ["6", "six"], hint: "Hexa = six en grec…", followUp: "6 côtés ! Les abeilles construisent en hexagones, c'est la forme la plus efficace !" },
      ],
      avancé: [
        { fact: "Un cube a 6 faces, 8 sommets et 12 arêtes ! Comme un dé 🎲", question: "Combien de faces a un cube ?", acceptedAnswers: ["6", "six"], hint: "Regarde un dé…", followUp: "6 faces ! Et un dé montre toujours 7 si tu additionnes les faces opposées !" },
        { fact: "Le nombre Pi (π) ≈ 3,14 permet de calculer le tour d'un cercle !", question: "Quelle est la valeur approximative de Pi ?", acceptedAnswers: ["3.14", "3,14", "trois quatorze", "3 14"], hint: "3 virgule…", followUp: "3,14 ! Pi est un nombre infini que les mathématiciens adorent !" },
      ],
    },
  },

  émotions: {
    emoji: "💛",
    introPhrase: "On va parler des émotions ! C'est super important de les comprendre !",
    cards: {
      débutant: [
        { fact: "La joie c'est quand on est content ! On sourit et on rit ! 😊", question: "Comment on se sent quand on est joyeux ?", acceptedAnswers: ["content", "heureux", "bien", "joyeux", "on sourit"], hint: "😊", followUp: "Oui ! La joie c'est une émotion géniale ! Elle se partage !" },
        { fact: "La tristesse c'est quand on a du chagrin. C'est normal de pleurer parfois 😢", question: "C'est normal d'être triste parfois ?", acceptedAnswers: ["oui", "ouais", "oui c'est normal", "normal"], hint: "Tout le monde ressent ça…", followUp: "Oui c'est tout à fait normal ! Ça aide à se sentir mieux après 💙" },
        { fact: "La peur nous protège du danger ! C'est notre corps qui nous avertit ⚡", question: "À quoi sert la peur ?", acceptedAnswers: ["protéger", "danger", "avertir", "se protéger", "protection"], hint: "Elle nous aide face au danger…", followUp: "La peur nous protège ! C'est comme une alarme dans notre corps !" },
      ],
      intermédiaire: [
        { fact: "Il y a 6 émotions de base : joie, tristesse, peur, colère, dégoût et surprise !", question: "Peux-tu me dire une émotion de base ?", acceptedAnswers: ["joie", "tristesse", "peur", "colère", "dégoût", "surprise", "degout"], hint: "😊😢😨😡🤢😲", followUp: "Oui ! Les 6 émotions de base sont universelles, tout le monde les ressent !" },
        { fact: "Respirer profondément aide à se calmer quand on est en colère ! 🧘", question: "Que peut-on faire quand on est très en colère ?", acceptedAnswers: ["respirer", "calmer", "se calmer", "souffler", "respiration"], hint: "Inspire… expire…", followUp: "Respirer profondément ! 4 secondes dedans, 4 secondes dehors 🧘" },
      ],
      avancé: [
        { fact: "L'empathie c'est comprendre les émotions des autres, se mettre à leur place 🤝", question: "Comment appelle-t-on la capacité de comprendre les émotions des autres ?", acceptedAnswers: ["empathie", "l'empathie"], hint: "Ça commence par 'emp'…", followUp: "L'empathie ! C'est un super-pouvoir social 🦸" },
      ],
    },
  },

  objets: {
    emoji: "🧸",
    introPhrase: "On va apprendre plein de choses sur les objets du quotidien !",
    cards: {
      débutant: [
        { fact: "L'horloge nous dit l'heure ! Elle a 2 aiguilles : la grande et la petite ⏰", question: "Combien d'aiguilles a une horloge classique ?", acceptedAnswers: ["2", "deux", "3", "trois"], hint: "La grande et la petite…", followUp: "2 pour les heures et minutes, parfois 3 avec la trotteuse pour les secondes !" },
        { fact: "Le crayon sert à écrire et dessiner ! Il est fait de bois et de graphite ✏️", question: "De quoi est fait un crayon ?", acceptedAnswers: ["bois", "graphite", "bois et graphite", "mine"], hint: "L'extérieur est en bois…", followUp: "Du bois autour et du graphite au centre ! C'est pas du plomb !" },
      ],
      intermédiaire: [
        { fact: "Le thermomètre mesure la température ! 37°C c'est la température normale du corps 🌡️", question: "Quelle est la température normale du corps humain ?", acceptedAnswers: ["37", "37 degrés", "trente sept"], hint: "C'est entre 36 et 38…", followUp: "37°C ! Au-dessus de 38°C on a de la fièvre !" },
        { fact: "La boussole indique toujours le nord grâce à un aimant ! 🧭", question: "Qu'indique une boussole ?", acceptedAnswers: ["nord", "le nord", "direction", "les directions"], hint: "C'est un point cardinal…", followUp: "Le nord ! L'aiguille est attirée par le pôle magnétique de la Terre !" },
      ],
      avancé: [
        { fact: "Le premier téléphone a été inventé par Alexander Graham Bell en 1876 ! 📞", question: "Qui a inventé le téléphone ?", acceptedAnswers: ["bell", "graham bell", "alexander bell", "alexander graham bell"], hint: "Son nom sonne comme une cloche…", followUp: "Alexander Graham Bell ! Et maintenant on a des smartphones !" },
      ],
    },
  },

  nature: {
    emoji: "🌿",
    introPhrase: "On va explorer les merveilles de la nature !",
    cards: {
      débutant: [
        { fact: "Les arbres nous donnent l'oxygène qu'on respire ! Merci les arbres ! 🌳", question: "Qu'est-ce que les arbres nous donnent pour respirer ?", acceptedAnswers: ["oxygène", "l'oxygène", "air", "de l'air", "de l'oxygène"], hint: "C'est un gaz qu'on respire…", followUp: "L'oxygène ! Les arbres sont les poumons de la Terre !" },
        { fact: "La pluie tombe des nuages ! Les nuages sont faits de minuscules gouttelettes d'eau ☁️🌧️", question: "D'où vient la pluie ?", acceptedAnswers: ["nuages", "des nuages", "les nuages", "du ciel"], hint: "Regarde en haut quand il pleut…", followUp: "Des nuages ! L'eau s'évapore, forme des nuages, puis retombe en pluie !" },
        { fact: "Le soleil est une étoile ! C'est l'étoile la plus proche de la Terre ☀️", question: "Le soleil est une planète ou une étoile ?", acceptedAnswers: ["étoile", "une étoile", "etoile"], hint: "Il brille par lui-même…", followUp: "Une étoile ! Les planètes ne brillent pas toutes seules !" },
      ],
      intermédiaire: [
        { fact: "Un arc-en-ciel apparaît quand le soleil éclaire les gouttes de pluie ! 🌈", question: "Quand est-ce qu'on peut voir un arc-en-ciel ?", acceptedAnswers: ["pluie", "soleil", "pluie et soleil", "quand il pleut", "après la pluie"], hint: "Il faut de l'eau et de la lumière…", followUp: "Quand il y a du soleil ET de la pluie en même temps ! 🌈" },
        { fact: "Les saisons changent parce que la Terre est penchée sur son axe ! 🌍", question: "Pourquoi y a-t-il des saisons ?", acceptedAnswers: ["terre penchée", "axe", "inclinaison", "la terre est penchée", "terre inclinée"], hint: "La Terre n'est pas droite…", followUp: "La Terre est inclinée de 23,5° ! C'est ce qui crée les saisons !" },
      ],
      avancé: [
        { fact: "La photosynthèse permet aux plantes de transformer la lumière en nourriture ! 🌱☀️", question: "Comment s'appelle le processus par lequel les plantes fabriquent leur nourriture ?", acceptedAnswers: ["photosynthèse", "la photosynthèse", "photosynthese"], hint: "Photo = lumière, synthèse = fabrication…", followUp: "La photosynthèse ! Les plantes utilisent lumière + CO2 + eau pour se nourrir !" },
        { fact: "70% de la surface de la Terre est couverte d'eau ! 🌊🌍", question: "Quel pourcentage de la Terre est couvert d'eau ?", acceptedAnswers: ["70", "soixante-dix", "70%", "70 pourcent"], hint: "Plus de la moitié, bien plus…", followUp: "70% ! Et seulement 3% est de l'eau douce qu'on peut boire !" },
      ],
    },
  },
};

// ─── Game State ─────────────────────────────────────────────

interface LearningState {
  active: boolean;
  phase: LessonPhase;
  category: LearningCategory | null;
  level: LearningLevel;
  currentCard: LessonCard | null;
  cardIndex: number;
  usedCards: Set<string>;    // track shown cards (by question text)
  score: number;
  streak: number;
  totalAnswered: number;
  childAge: number;
}

let state: LearningState = makeDefaultState();

function makeDefaultState(): LearningState {
  return {
    active: false,
    phase: "ENDED",
    category: null,
    level: "débutant",
    currentCard: null,
    cardIndex: 0,
    usedCards: new Set(),
    score: 0,
    streak: 0,
    totalAnswered: 0,
    childAge: 7,
  };
}

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

function fuzzyMatch(spoken: string, target: string): boolean {
  const s = normalize(spoken);
  const t = normalize(target);
  if (s === t) return true;
  if (s.includes(t) || t.includes(s)) return true;
  // Simple distance check for short words
  if (t.length <= 3) return s === t;
  let matches = 0;
  const tChars = t.split("");
  for (const c of s.split("")) {
    const idx = tChars.indexOf(c);
    if (idx !== -1) { matches++; tChars.splice(idx, 1); }
  }
  return matches / t.length >= 0.7;
}

function personalize(text: string, childName?: string): string {
  return text.replace(/\{name\}/g, childName || "");
}

function getLevelForAge(age: number): LearningLevel {
  if (age <= 6) return "débutant";
  if (age <= 9) return "intermédiaire";
  return "avancé";
}

// ─── Phrase Variants ────────────────────────────────────────

const SUCCESS = [
  "Bravo {name} ! 🎉",
  "Bien joué {name} ! 🌟",
  "Super {name} ! ⭐",
  "Génial ! Tu progresses {name} ! 💪",
  "Excellent {name} ! 🏆",
  "Tu es trop fort {name} ! 🧠",
];

const ALMOST = [
  "Presque {name} 😊",
  "Pas tout à fait, mais bien essayé {name} ! 💪",
  "Hmm, pas exactement… 😊",
  "Tu étais proche {name} ! 😄",
];

const ENCOURAGE = [
  "Tu veux continuer {name} ? 😊",
  "On continue ? 🧠",
  "Prêt pour la suite ? ✨",
  "Allez, encore une ! 💪",
];

// ─── Public API ─────────────────────────────────────────────

export function isLearningActive(): boolean {
  return state.active;
}

export function startLearning(childName?: string, childAge = 7, category?: LearningCategory): string {
  state = {
    ...makeDefaultState(),
    active: true,
    childAge,
    level: getLevelForAge(childAge),
  };

  const intro = `Super ${childName || ""} ! On va apprendre en s'amusant ! 🧠✨`;

  if (category && KNOWLEDGE[category]) {
    state.category = category;
    state.phase = "INTRO";
    return intro + "\n\n" + startLesson(childName);
  }

  // No category chosen → ask
  state.phase = "CHOOSE_CATEGORY";
  const cats = Object.entries(KNOWLEDGE)
    .map(([key, val]) => `${val.emoji} ${key}`)
    .join(", ");
  return `${intro}\n\nTu veux apprendre quoi aujourd'hui ? ${cats} 😊`;
}

export function stopLearning(childName?: string): string {
  const score = state.score;
  const total = state.totalAnswered;
  state = makeDefaultState();
  if (total > 0) {
    return `Super session ${childName || ""} ! Tu as eu ${score}/${total} bonnes réponses ! 🌟 On apprendra encore la prochaine fois !`;
  }
  return `D'accord ${childName || ""} ! On apprendra une prochaine fois ! 😊`;
}

export function handleLearningInput(text: string, childName?: string): string {
  if (!state.active) {
    return startLearning(childName, state.childAge);
  }

  const n = normalize(text);

  // Stop
  if (/^(stop|arrête|fini|j'arrête|on arrête|assez|non merci)$/.test(n)) {
    return stopLearning(childName);
  }

  // ── Category selection ──
  if (state.phase === "CHOOSE_CATEGORY") {
    const detected = detectCategory(n);
    if (detected) {
      state.category = detected;
      state.phase = "INTRO";
      return startLesson(childName);
    }
    // Suggest if unclear
    return `Hmm, je n'ai pas compris 😊 Tu veux apprendre les animaux 🐾, les couleurs 🎨, les chiffres 🔢 ou autre chose ?`;
  }

  // ── Quiz answer ──
  if (state.phase === "QUIZ" && state.currentCard) {
    return evaluateAnswer(text, childName);
  }

  // ── "oui" / "encore" / "continue" → next card ──
  if (/^(oui|ouais|ok|encore|continue|suite|d'accord|allez|yes|oui on continue|prêt|next)/.test(n)) {
    if (state.phase === "RESULT" || state.phase === "INTERACT") {
      return nextCard(childName);
    }
  }

  // ── Change category mid-session ──
  const newCat = detectCategory(n);
  if (newCat && newCat !== state.category) {
    state.category = newCat;
    state.usedCards.clear();
    state.phase = "INTRO";
    return `On change ! ${KNOWLEDGE[newCat].emoji} ${startLesson(childName)}`;
  }

  // ── "non" at result → stop or switch ──
  if (/^(non|nan|nope|pas maintenant)$/.test(n) && state.phase === "RESULT") {
    return `D'accord ! Tu veux changer de sujet ou on arrête ? 😊`;
  }

  // ── Fallback: treat as quiz answer if we have a card ──
  if (state.currentCard) {
    return evaluateAnswer(text, childName);
  }

  return `On apprend ensemble ${childName || ""} ! 🧠 Dis "oui" pour continuer ou choisis un sujet ! 😊`;
}

// ─── Internal Logic ─────────────────────────────────────────

function detectCategory(text: string): LearningCategory | null {
  const n = normalize(text);
  const map: [RegExp, LearningCategory][] = [
    [/animaux|animal|bêtes?|faune/, "animaux"],
    [/couleur|couleurs|rouge|bleu|vert|jaune/, "couleurs"],
    [/chiffre|nombre|math|calcul|compter|addition|soustraction/, "chiffres"],
    [/lettre|alphabet|mot|lire|écrire|voyelle/, "alphabet"],
    [/forme|géométr|carré|cercle|triangle|rond/, "formes"],
    [/émotion|sentiment|content|triste|peur|colère/, "émotions"],
    [/objet|chose|outil|instrument|invention/, "objets"],
    [/nature|plante|arbre|fleur|terre|saison|pluie|soleil/, "nature"],
  ];
  for (const [regex, cat] of map) {
    if (regex.test(n)) return cat;
  }
  return null;
}

function startLesson(childName?: string): string {
  if (!state.category) return "";
  const cat = KNOWLEDGE[state.category];
  state.phase = "EXPLAIN";

  return `${cat.emoji} ${cat.introPhrase}\n\n${getNextCardContent(childName)}`;
}

function getNextCardContent(childName?: string): string {
  if (!state.category) return "";
  const cat = KNOWLEDGE[state.category];
  const cards = cat.cards[state.level];

  // Find unused card
  const available = cards.filter(c => !state.usedCards.has(c.question));

  if (available.length === 0) {
    // All cards used — try next level
    if (state.level === "débutant") {
      state.level = "intermédiaire";
      state.usedCards.clear();
      return `Tu as tout appris au niveau débutant ! 🌟 On passe au niveau intermédiaire ! 🚀\n\n${getNextCardContent(childName)}`;
    }
    if (state.level === "intermédiaire") {
      state.level = "avancé";
      state.usedCards.clear();
      return `Niveau intermédiaire terminé ! 🏆 Allez, mode expert ! 🧠\n\n${getNextCardContent(childName)}`;
    }
    // All levels done for this category
    state.phase = "RESULT";
    return `Wow ${childName || ""} ! Tu as tout appris sur les ${state.category} ! 🏆🎉 Score : ${state.score}/${state.totalAnswered} ! Tu veux changer de sujet ? 😊`;
  }

  const card = pickRandom(available);
  state.currentCard = card;
  state.usedCards.add(card.question);
  state.phase = "QUIZ";

  return `${card.fact}\n\n${card.question}`;
}

function nextCard(childName?: string): string {
  return getNextCardContent(childName);
}

function evaluateAnswer(text: string, childName?: string): string {
  if (!state.currentCard) return nextCard(childName);

  const card = state.currentCard;
  const n = normalize(text);
  state.totalAnswered++;

  // Check if correct
  const isCorrect = card.acceptedAnswers.some(ans => fuzzyMatch(n, ans));

  if (isCorrect) {
    state.score++;
    state.streak++;
    try { recordAnswer("apprends_avec_moi", true); } catch { /* ignore */ }

    let response = personalize(pickRandom(SUCCESS), childName);
    response += ` ${card.followUp}`;

    // Streak bonus
    if (state.streak >= 3) {
      response += ` 🔥 Série de ${state.streak} bonnes réponses !`;
    }

    // Points
    response += ` ⭐ Score : ${state.score}`;

    state.phase = "INTERACT";
    response += `\n\n${personalize(pickRandom(ENCOURAGE), childName)}`;

    state.currentCard = null;
    return response;
  }

  // Incorrect
  state.streak = 0;
  try { recordAnswer("apprends_avec_moi", false); } catch { /* ignore */ }

  let response = personalize(pickRandom(ALMOST), childName);
  const correctAnswer = card.acceptedAnswers[0];
  response += ` La réponse c'était : ${correctAnswer} ! ${card.hint}`;
  response += ` ⭐ Score : ${state.score}`;

  state.phase = "INTERACT";
  response += `\n\n${personalize(pickRandom(ENCOURAGE), childName)}`;

  state.currentCard = null;
  return response;
}

// ─── Trigger Detection ──────────────────────────────────────

export function isLearningTrigger(text: string): boolean {
  const n = normalize(text);
  return /apprends avec moi|apprendre.*s'amuser|leçon|on apprend|je veux apprendre|apprends.moi|cours/.test(n);
}
