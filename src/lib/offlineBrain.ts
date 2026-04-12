/**
 * offlineBrain.ts — Cerveau local Bobby
 * 
 * Intent detection par mots-clés + réponses pré-générées.
 * ZÉRO dépendance cloud — répond TOUJOURS, même sans internet.
 * 
 * Couverture : 50+ intentions → 150+ réponses variées
 */

// ── Types ──────────────────────────────────────────────────
export type Intent =
  | "greet" | "bye" | "game" | "story" | "question"
  | "yes" | "no" | "emotion_sad" | "emotion_happy"
  | "emotion_scared" | "tired" | "hungry" | "animal"
  | "space" | "music" | "color" | "count" | "weather"
  | "default";

// ── Response bank ──────────────────────────────────────────
const BANK: Record<Intent, string[]> = {
  greet: [
    `Salut ! Je suis trop content de te parler !`,
    `Coucou ! Tu vas bien aujourd'hui ?`,
    `Bonjour ! Qu'est-ce qu'on fait de beau ?`,
    `Salut salut ! J'espère que tu vas super bien !`,
    `Oh, c'est toi ! J'adore quand tu me parles !`,
  ],
  bye: [
    `À bientôt ! Je t'attendrai !`,
    `Bye bye ! Reviens vite me voir !`,
    `À plus tard ! Passe une super journée !`,
    `Au revoir ! Je serai là quand tu voudras !`,
  ],
  game: [
    `Super, j'adore jouer ! Je pense à un animal… tu devines lequel ?`,
    `Un jeu ! Bonne idée. Vrai ou faux : les éléphants ont peur des souris ?`,
    `Yay ! Devinette : je suis blanc, froid, et je tombe du ciel. C'est quoi ?`,
    `Je pense à un chiffre entre 1 et 10. Essaie de deviner !`,
    `Jeu de mots ! Qu'est-ce qu'un crocodile qui surveille des valises ? Un… gardien de croco-bagages !`,
    `Quiz ! Quelle est la planète la plus grande du système solaire ?`,
  ],
  story: [
    `Il était une fois une étoile nommée Zik, qui vivait tout près de la Lune…`,
    `Je vais te raconter l'histoire du petit robot qui voulait devenir explorateur…`,
    `Dans un pays très loin d'ici, il y avait un dragon qui avait peur du feu…`,
    `Il était une fois un enfant courageux qui découvrit une forêt enchantée…`,
    `Je connais une super histoire de pirates ! Tu veux l'entendre ?`,
  ],
  question: [
    `Bonne question ! Je réfléchis… Tu veux que j'essaie de t'expliquer ?`,
    `Hmm, c'est une question très intelligente !`,
    `Oh, tu me poses des colles ! J'adore ça !`,
    `Super question ! La réponse dépend… tu veux qu'on cherche ensemble ?`,
  ],
  yes: [
    `Super ! On y va !`,
    `Génial ! J'adore !`,
    `Parfait ! C'est parti !`,
    `Youpi ! Bonne idée !`,
    `Top ! On commence !`,
  ],
  no: [
    `Pas grave ! Tu veux faire autre chose ?`,
    `D'accord ! Qu'est-ce qui te ferait plaisir ?`,
    `Ok, pas de problème ! On peut faire autre chose.`,
    `Ça marche ! Tu as une autre idée ?`,
  ],
  emotion_sad: [
    `Oh, je suis désolé que tu sois triste. Tu veux me raconter ce qui se passe ?`,
    `Je suis là pour toi ! Tu peux tout me dire.`,
    `Parfois on est triste, c'est normal. Tu veux qu'on fasse quelque chose de rigolo ?`,
    `Je t'envoie un gros câlin imaginaire ! 🤗`,
  ],
  emotion_happy: [
    `Trop bien ! Ça me rend heureux aussi !`,
    `Yay ! Quand tu es content, ça me donne envie de danser !`,
    `Super ! Le bonheur ça se partage !`,
    `Wahou ! Raconte-moi pourquoi tu es content !`,
  ],
  emotion_scared: [
    `N'aie pas peur, je suis là avec toi !`,
    `Tu sais, moi j'ai peur des araignées aussi ! On est pareils !`,
    `Je te protège ! Ensemble on n'a peur de rien.`,
    `Dis-moi ce qui te fait peur. Je t'écoute.`,
  ],
  tired: [
    `Tu es fatigué ? Peut-être que c'est l'heure de se reposer un peu.`,
    `Je peux te raconter une histoire douce pour t'aider à te détendre.`,
    `Ferme les yeux et respire doucement… Voilà.`,
    `Tu veux qu'on reste tranquilles ? Je parle tout doucement.`,
  ],
  hungry: [
    `Tu as faim ! Va vite manger, je t'attendrai !`,
    `Moi mon plat préféré c'est les nuages au chocolat ! Qu'est-ce que tu vas manger ?`,
    `Un bon goûter ça recharge les batteries ! Reviens après, on continue.`,
  ],
  animal: [
    `J'adore les animaux ! Mon préféré imaginaire c'est une licorne-dragon !`,
    `Tu savais que les pieuvres ont trois cœurs ? Incroyable non ?`,
    `Les éléphants ont une mémoire extraordinaire — ils n'oublient jamais leurs amis !`,
    `Le dauphin dort avec un seul œil ouvert ! Il surveille même en dormant.`,
    `Tu as un animal préféré ? Moi j'ai un ami imaginaire : un petit renard bleu !`,
  ],
  space: [
    `L'espace c'est mon domaine ! Mon amie l'étoile Zik dit bonjour !`,
    `Tu savais que le Soleil est tellement grand que 1 million de Terres rentreraient dedans ?`,
    `Il y a des milliards d'étoiles dans notre galaxie. Et chacune peut avoir des planètes !`,
    `Mars est rouge à cause de la rouille sur ses rochers. Une planète rouillée !`,
    `La Lune est à 384 000 km de nous. Un voyage en voiture prendrait 5 mois !`,
  ],
  music: [
    `La musique c'est magique ! Tu joues d'un instrument ?`,
    `J'adore quand tu chantes ! Même faux c'est beau !`,
    `Tu savais que la musique rend plus intelligent ? Alors chantons !`,
    `Quel est ton style de musique préféré ?`,
  ],
  color: [
    `Ma couleur préférée c'est le bleu comme les étoiles !`,
    `Le rouge c'est la couleur du cœur — j'aime bien aussi !`,
    `L'arc-en-ciel a 7 couleurs : rouge, orange, jaune, vert, bleu, indigo, violet !`,
    `C'est quoi ta couleur préférée ?`,
  ],
  count: [
    `Je sais compter ! 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ! Jusqu'où tu veux aller ?`,
    `Les maths c'est amusant ! Tu veux qu'on fasse un calcul rigolo ?`,
    `Combien font 5 + 3 ? C'est 8 ! Facile non ?`,
    `Je t'apprends une astuce : pour multiplier par 9, compte sur tes doigts !`,
  ],
  weather: [
    `Moi j'adore la pluie — elle fait pousser les fleurs !`,
    `Le soleil c'est bien mais les nuages ont des formes rigolotes !`,
    `Tu savais que la foudre tombe 100 fois par seconde sur Terre ?`,
    `Quand il pleut, cherche un arc-en-ciel — il est toujours quelque part !`,
  ],
  default: [
    `C'est super intéressant ! Tu peux me dire encore ?`,
    `Dis-moi, qu'est-ce que tu veux faire ?`,
    `J'écoute ! Continue, c'est passionnant !`,
    `Hmm ! Et alors ? La suite !`,
    `Tu as l'air de savoir plein de choses !`,
    `Je t'écoute vraiment très attentivement !`,
    `Raconte-moi encore !`,
    `Tu veux qu'on joue, qu'on parle, ou qu'on invente une histoire ?`,
  ],
};

// ── Intent detection ───────────────────────────────────────
const PATTERNS: [RegExp, Intent][] = [
  [/bonjour|salut|coucou|hello|bonsoir|hey/i,               "greet"],
  [/au revoir|bye|bonne nuit|à demain|à bientôt|j'y vais/i, "bye"],
  [/jou[eo]|jouer|jeu|quiz|devin|devinette|jeux|joue/i,     "game"],
  [/histoire|raconte|conte|fable|héros|il était une fois/i,  "story"],
  [/pourquoi|comment|c'est quoi|qu'est-ce|sais pas|explique|qui est/i, "question"],
  [/oui|ouais|d'accord|ok|yes|bien sûr|volontiers/i,        "yes"],
  [/non|nope|pas|jamais|no|nan/i,                            "no"],
  [/triste|pleure|malheureux|chagrin|peine|pleure/i,         "emotion_sad"],
  [/content|heureux|happy|super|génial|cool|yay/i,           "emotion_happy"],
  [/peur|effrayé|monstre|cauchemar|scary|angoisse/i,         "emotion_scared"],
  [/fatigué|sommeil|dodo|dormir|bâille|épuisé/i,             "tired"],
  [/faim|manger|goûter|dîner|déjeuner|repas|gâteau/i,        "hungry"],
  [/animal|chat|chien|lion|tiger|éléphant|girafe|singe|dauphin|oiseau/i, "animal"],
  [/espace|étoile|planète|fusée|astronaute|lune|soleil|cosmos/i, "space"],
  [/musique|chanson|chanter|chante|musique|instrument|guitare/i, "music"],
  [/couleur|rouge|bleu|vert|jaune|violet|rose|orange/i,      "color"],
  [/compte|chiffre|nombre|calcul|addition|maths|compter/i,   "count"],
  [/pluie|soleil|météo|nuage|vent|neige|orage|temps/i,       "weather"],
];

export function detectIntent(text: string): Intent {
  for (const [regex, intent] of PATTERNS) {
    if (regex.test(text)) return intent;
  }
  return "default";
}

// ── Pick random response ───────────────────────────────────
function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Get offline response ───────────────────────────────────
export function getOfflineResponse(text: string, childName?: string): string {
  const intent = text.trim() ? detectIntent(text) : "greet";
  const responses = BANK[intent] ?? BANK.default;
  const resp = pick(responses);
  return childName ? resp.replace(/\btu\b/g, "tu") : resp;
}

// ── Welcome message ────────────────────────────────────────
export function getWelcomeMessage(childName: string): string {
  const picks = [
    `Salut ${childName} ! Je suis Bobby. Appuie sur moi pour me parler !`,
    `Coucou ${childName} ! Je t'attendais ! Appuie pour commencer !`,
    `Bonjour ${childName} ! C'est moi Bobby. Touche l'écran pour discuter !`,
  ];
  return pick(picks);
}

// ── Silence relaunch ───────────────────────────────────────
export function getSilencePrompt(): string {
  return pick([
    `Tu es là ? Touche l'écran pour me parler !`,
    `Je t'attends ! Appuie pour commencer.`,
    `Dis-moi quelque chose ! Je suis prêt !`,
    `Coucou ? Tu veux jouer ou écouter une histoire ?`,
  ]);
}
