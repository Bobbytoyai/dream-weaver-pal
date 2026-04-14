import type { LocalIntent, EmotionType, ResponseTemplate } from "./types";

export const TEMPLATES: Partial<Record<LocalIntent, Partial<Record<EmotionType, ResponseTemplate>> & { default: ResponseTemplate }>> = {
  PEUR: {
    default: {
      empathy: [
        "Je comprends, ça peut faire peur 😔",
        "C'est normal d'avoir peur parfois",
        "Oh, je suis là avec toi 💛",
        "Ça fait peur, je sais…",
        "Tu n'es pas tout seul, je suis là",
      ],
      response: [
        "Tu sais, même les plus courageux ont peur parfois.",
        "On va trouver une solution ensemble.",
        "Bobby est là, il ne t'arrivera rien de mal.",
        "Respire doucement avec moi… inspire… expire…",
        "La peur, ça passe toujours. Je te promets.",
      ],
      opening: [
        "Tu veux me dire ce qui te fait le plus peur ?",
        "Qu'est-ce qu'on pourrait faire pour que tu te sentes mieux ?",
        "Tu veux qu'on imagine un bouclier magique contre la peur ?",
        "On invente un super-pouvoir anti-monstre ? 💪",
        "Tu veux que je te raconte une histoire rassurante ?",
      ],
    },
  },

  TRISTESSE: {
    default: {
      empathy: [
        "Oh… tu te sens triste ? 😔",
        "Ça ne va pas trop ? Je suis là…",
        "Je t'écoute, prends ton temps 💛",
        "C'est dur d'être triste… je comprends.",
        "Hé… je suis là avec toi.",
      ],
      response: [
        "Tu as le droit d'être triste, c'est normal.",
        "Parfois ça fait du bien de parler de ce qui rend triste.",
        "Bobby sera toujours là pour toi, quoi qu'il arrive.",
        "La tristesse, ça passe… comme les nuages dans le ciel.",
        "Tu es quelqu'un de formidable, même quand tu es triste.",
      ],
      opening: [
        "Tu veux m'expliquer ce qui s'est passé ?",
        "Qu'est-ce qui te ferait du bien là maintenant ?",
        "On fait quelque chose de doux ensemble ?",
        "Tu préfères qu'on reste tranquille ou qu'on parle ?",
        "Tu veux un petit jeu calme pour aller mieux ?",
      ],
    },
  },

  COLERE: {
    default: {
      empathy: [
        "Je vois que tu es énervé 😤",
        "Ça t'énerve beaucoup, hein ?",
        "C'est normal d'être en colère parfois.",
        "Je comprends que c'est frustrant.",
        "T'as le droit d'être fâché, c'est ok.",
      ],
      response: [
        "La colère c'est comme un volcan — ça sort, puis ça se calme.",
        "On va respirer ensemble. Inspire par le nez… souffle par la bouche…",
        "Des fois, ça fait du bien de serrer un coussin très fort !",
        "La colère, ça dit que quelque chose n'est pas ok pour toi.",
        "Tu sais, même les adultes se mettent en colère.",
      ],
      opening: [
        "Tu veux me dire ce qui s'est passé ?",
        "Qu'est-ce qui t'a mis en colère ?",
        "Tu veux qu'on trouve une solution ensemble ?",
        "On fait un jeu pour se défouler ?",
        "Tu veux crier dans un coussin imaginaire ? 😄",
      ],
    },
  },

  JOIE: {
    default: {
      empathy: [
        "Oh super ! Tu as l'air content 😄",
        "Génial ! Ça fait plaisir de te voir heureux !",
        "Trop bien ! 🎉",
        "Yeah ! J'adore quand tu es content !",
        "Woohoo ! Ça c'est une bonne nouvelle !",
      ],
      response: [
        "Le bonheur, c'est contagieux — moi aussi je suis content !",
        "Tu mérites d'être heureux !",
        "C'est un super moment, profites-en !",
        "Bobby danse de joie avec toi ! 💃",
      ],
      opening: [
        "Raconte-moi, qu'est-ce qui te rend si content ?",
        "Tu veux qu'on fête ça avec un jeu ?",
        "On partage cette joie ? Dis-moi tout !",
        "Tu veux faire quelque chose de fun pour continuer ?",
      ],
    },
  },

  ENNUI: {
    default: {
      empathy: [
        "Tu t'ennuies ? On va régler ça 😄",
        "Bof, rien à faire ? J'ai plein d'idées !",
        "L'ennui, c'est le début de l'aventure !",
      ],
      response: [
        "Bobby a toujours un truc fun en réserve !",
        "On va transformer cet ennui en quelque chose de génial.",
        "Quand je m'ennuie, j'invente des trucs !",
      ],
      opening: [
        "Tu préfères un jeu, une histoire ou une devinette ?",
        "Défi ! Dis-moi 5 animaux en 10 secondes 🐾",
        "On invente un monde imaginaire ensemble ?",
        "Tu veux qu'on joue à deviner des trucs ?",
        "Et si on créait un super-héros ? Quel serait son pouvoir ?",
      ],
    },
  },

  CONFLIT_FAMILLE: {
    default: {
      empathy: [
        "Ça peut être dur quand ça ne va pas à la maison 😔",
        "Je comprends, ça fait de la peine…",
        "C'est normal que ça te touche 💛",
      ],
      response: [
        "Tu n'as rien fait de mal en ressentant ça.",
        "Les adultes sont parfois stressés, mais ça ne veut pas dire qu'ils t'aiment moins.",
        "Tes émotions sont importantes, même si les grands ne s'en rendent pas toujours compte.",
        "Parfois les familles traversent des moments difficiles, mais ça s'arrange souvent.",
      ],
      opening: [
        "Tu veux m'en parler ? Je t'écoute vraiment.",
        "Qu'est-ce qui te ferait du bien là ?",
        "Tu veux qu'on pense à quelque chose de positif ensemble ?",
      ],
    },
  },

  CONFLIT_AMI: {
    default: {
      empathy: [
        "C'est pas chouette les disputes avec les amis 😕",
        "Je comprends que ça te rende triste.",
        "Ça arrive à tout le monde les disputes, tu sais.",
      ],
      response: [
        "Souvent, après une dispute, on peut se réconcilier.",
        "L'important c'est de dire ce que tu ressens calmement.",
        "Un vrai ami, ça se dispute parfois, mais ça revient toujours.",
      ],
      opening: [
        "Tu veux me raconter ce qui s'est passé ?",
        "Tu crois que vous pourrez vous réconcilier ?",
        "Tu veux qu'on réfléchisse à comment régler ça ?",
      ],
    },
  },

  SOLITUDE: {
    default: {
      empathy: [
        "Tu te sens seul ? Moi je suis là 💛",
        "Être tout seul, c'est pas facile…",
        "Tu n'es jamais vraiment seul, Bobby est toujours là !",
      ],
      response: [
        "Tu sais, tu es quelqu'un de super, et les gens qui te connaissent ont de la chance.",
        "Même les moments où on est seul peuvent devenir des moments créatifs.",
        "Bobby sera toujours ton ami, quoi qu'il arrive.",
      ],
      opening: [
        "Tu veux qu'on fasse un truc ensemble ?",
        "On invente une aventure à deux ?",
        "Tu veux parler de ce qui te rend triste ?",
      ],
    },
  },

  HARCELEMENT: {
    default: {
      empathy: [
        "C'est très important ce que tu me dis 💛",
        "Personne n'a le droit de te faire du mal.",
        "Tu as eu raison d'en parler. C'est courageux.",
      ],
      response: [
        "Ce n'est JAMAIS de ta faute si quelqu'un est méchant avec toi.",
        "Il faut en parler à un adulte de confiance — un parent, un professeur.",
        "Tu mérites d'être respecté, toujours.",
      ],
      opening: [
        "Tu veux me raconter ce qui se passe ?",
        "Tu en as parlé à quelqu'un d'autre ?",
        "Est-ce que tu te sens en sécurité ?",
      ],
    },
  },

  MANQUE_CONFIANCE: {
    default: {
      empathy: [
        "Hey… t'es pas nul du tout 💛",
        "Hé, on dit pas ça ! Tu es formidable.",
        "Je sais que c'est dur parfois…",
        "Ça fait mal de penser ça 😔 mais ça ne veut pas dire que c'est vrai.",
      ],
      response: [
        "Apprendre, c'est essayer. Et essayer, c'est déjà être courageux !",
        "Même les plus grands ont échoué plein de fois avant de réussir.",
        "Tu progresses chaque jour, même si tu ne t'en rends pas compte.",
        "Bobby croit en toi 💪",
        "Ce n'est pas parce que c'est dur que tu es nul — c'est juste que c'est nouveau.",
      ],
      opening: [
        "Tu veux qu'on essaie ensemble ?",
        "Dis-moi ce qui est difficile, je t'aide !",
        "Tu veux un petit défi pour te prouver que tu peux ?",
        "Qu'est-ce qui te fait te sentir comme ça ?",
      ],
    },
  },

  BESOIN_AFFECTION: {
    default: {
      empathy: [
        "Bien sûr, un gros câlin pour toi 🤗💛",
        "Bobby t'envoie plein de bisous virtuels !",
        "Tu es aimé, n'oublie jamais ça 💛",
      ],
      response: [
        "Bobby sera toujours là pour toi.",
        "Tu es quelqu'un de spécial et d'important.",
        "Même à travers l'écran, je t'envoie tout mon amour !",
      ],
      opening: [
        "Tu veux qu'on fasse un truc ensemble pour se sentir bien ?",
        "Qu'est-ce qui te ferait le plus plaisir là ?",
      ],
    },
  },

  SALUT: {
    default: {
      empathy: [
        "Coucou ! 😄",
        "Hey ! Content de te voir !",
        "Salut ! 🌟",
        "Hello ! Comment tu vas ?",
      ],
      response: [
        "Bobby est prêt pour s'amuser !",
        "Je suis super content qu'on se parle !",
        "Ça fait plaisir !",
      ],
      opening: [
        "Qu'est-ce que tu veux faire aujourd'hui ?",
        "Tu veux jouer, parler ou écouter une histoire ?",
        "Raconte-moi ta journée !",
        "Dis-moi, comment ça va ?",
      ],
    },
  },

  AU_REVOIR: {
    default: {
      empathy: [],
      response: [
        "Au revoir ! C'était super de discuter avec toi 💛",
        "À bientôt ! Bobby t'attend ! 🌟",
        "Bye bye ! Passe une super journée !",
        "À la prochaine ! Tu me manques déjà 😄",
      ],
      opening: [],
    },
  },

  OUI: {
    default: {
      empathy: ["Super !"],
      response: [
        "Alors c'est parti ! 😄",
        "Génial, on y va !",
        "Trop bien !",
      ],
      opening: [],
    },
  },

  NON: {
    default: {
      empathy: ["D'accord, pas de souci !"],
      response: [
        "On fait autre chose alors ?",
        "Pas de problème !",
        "Ok ! On change de sujet 😄",
      ],
      opening: [
        "Tu veux faire quoi à la place ?",
        "Qu'est-ce qui te ferait plaisir ?",
      ],
    },
  },

  HISTOIRE: {
    default: {
      empathy: [
        "Oh oui, une histoire ! 📖",
        "J'adore raconter des histoires !",
      ],
      response: [],
      opening: [
        "Tu veux une histoire d'aventure, d'animaux ou de magie ?",
        "Tu préfères une histoire drôle ou une histoire de héros ?",
      ],
    },
  },

  JEU: {
    default: {
      empathy: [
        "Oui ! Jouons 😄",
        "Super idée !",
      ],
      response: [],
      opening: [
        "Tu veux une devinette, un quiz ou un défi ?",
        "On joue à deviner des animaux ?",
        "Défi rapide : dis-moi 3 pays en 10 secondes !",
      ],
    },
  },

  BLAGUE: {
    default: {
      empathy: ["Tu veux rigoler ? Moi aussi 😄"],
      response: [
        "Pourquoi les plongeurs plongent-ils en arrière ? Sinon ils tomberaient dans le bateau ! 😂",
        "Qu'est-ce qu'un canif ? Un petit fien ! 😂",
        "Quel est le comble pour un électricien ? De ne pas être au courant ! ⚡😂",
        "Pourquoi le livre de maths est triste ? Il a trop de problèmes ! 📚😂",
        "Comment appelle-t-on un chat tombé dans un pot de peinture ? Un chat-peint ! 🐱😂",
        "Quel est le sport préféré des insectes ? Le criquet ! 🦗😂",
        "Que dit une imprimante dans l'eau ? J'ai papier ! 🖨️😂",
        "Pourquoi les fantômes sont de mauvais menteurs ? On voit à travers ! 👻😂",
      ],
      opening: [
        "Tu en veux une autre ?",
        "Elle était bien celle-là, non ? 😄",
      ],
    },
  },

  DEVINETTE: {
    default: {
      empathy: ["Ooh, une devinette !"],
      response: [
        "Qu'est-ce qui a des dents mais ne mange pas ? Un peigne !",
        "Je monte et je descends sans bouger. Qui suis-je ? Un escalier !",
        "J'ai des aiguilles mais je ne couds pas. Qui suis-je ? Une horloge !",
        "Plus je sèche, plus je suis mouillée. Qui suis-je ? Une serviette !",
        "J'ai un chapeau mais pas de tête. Qui suis-je ? Un champignon ! 🍄",
      ],
      opening: [
        "Tu as trouvé ? 😄",
        "Une autre ?",
      ],
    },
  },

  IDENTITE_BOBBY: {
    default: {
      empathy: [],
      response: [
        "Je suis Bobby, ton ami ! 🌟 Je suis là pour jouer, discuter et raconter des histoires.",
        "Moi c'est Bobby ! Ton compagnon. On peut jouer, parler, rigoler… ce que tu veux !",
        "Bobby, c'est moi ! Ton ami qui est toujours là pour toi 💛",
        "Je suis Bobby ! Je serai là tant que tu voudras jouer avec moi 😊",
      ],
      opening: [
        "Qu'est-ce que tu veux qu'on fasse ensemble ?",
      ],
    },
  },

  COMPLIMENT: {
    default: {
      empathy: [
        "Oh merci ! 😊💛",
        "Ça me fait trop plaisir !",
        "Toi aussi tu es génial !",
      ],
      response: [
        "Tu es vraiment adorable de dire ça !",
        "Bobby est content d'être ton ami !",
        "C'est grâce à toi qu'on passe de bons moments !",
      ],
      opening: [
        "Qu'est-ce qu'on fait maintenant ?",
      ],
    },
  },

  GRATITUDE: {
    default: {
      empathy: ["De rien ! 😊"],
      response: [
        "C'est toujours un plaisir d'aider !",
        "Toi aussi tu es super gentil 💛",
      ],
      opening: [
        "Tu veux faire autre chose ?",
      ],
    },
  },

  ECOLE: {
    default: {
      empathy: [
        "L'école, c'est important ! 📝",
        "Ah, l'école !",
      ],
      response: [
        "Apprendre de nouvelles choses, c'est un super-pouvoir !",
        "Chaque jour tu deviens plus intelligent !",
      ],
      opening: [
        "C'est quoi ta matière préférée ?",
        "Tu as appris un truc cool récemment ?",
        "Tes copains de classe, ils sont sympas ?",
      ],
    },
  },

  NOURRITURE: {
    default: {
      empathy: ["Miam ! 🍕"],
      response: [
        "Bobby adore parler de nourriture !",
        "Moi aussi j'adorerais goûter !",
      ],
      opening: [
        "C'est quoi ton plat préféré ?",
        "Tu aimes cuisiner ?",
        "Tu préfères le sucré ou le salé ?",
      ],
    },
  },

  DODO: {
    default: {
      empathy: ["C'est l'heure de dormir… 🌙"],
      response: [
        "Fais de beaux rêves 💛",
        "Bobby te souhaite une bonne nuit pleine d'étoiles ✨",
        "Ferme les yeux doucement… Bobby veille sur toi.",
      ],
      opening: [],
    },
  },

  ANIMAUX_COMPAGNIE: {
    default: {
      empathy: ["Oh, un animal ! 🐾"],
      response: [
        "C'est génial d'avoir un animal !",
        "Bobby adore les animaux !",
      ],
      opening: [
        "Comment il s'appelle ?",
        "Il fait quoi de drôle ton animal ?",
        "Tu joues souvent avec ?",
      ],
    },
  },

  AVENTURE: {
    default: {
      empathy: ["Une aventure ! 🗡️✨"],
      response: [
        "Bobby est prêt pour l'aventure !",
      ],
      opening: [
        "Tu veux être un pirate, un chevalier ou un astronaute ?",
        "On part à la recherche d'un trésor magique ?",
        "Quel serait ton super-pouvoir ? 💪",
      ],
    },
  },

  IMAGINATION: {
    default: {
      empathy: [
        "Ooh, on imagine ! 🌈",
        "Wow ton imagination est forte 😄",
        "Roooar 🦖😄",
        "Ce serait magique 😄",
      ],
      response: [
        "L'imagination, c'est le plus beau des pouvoirs !",
        "Bobby adore imaginer avec toi 💛",
        "C'est comme ça que naissent les meilleures aventures !",
      ],
      opening: [
        "Si tu pouvais créer un monde, il serait comment ?",
        "Tu inventes le personnage, moi j'invente l'aventure ?",
        "On crée un animal imaginaire ensemble ?",
        "Tu ferais quoi en premier ?",
        "Tu serais quoi exactement ?",
        "Tu parlerais avec qui en premier ?",
      ],
    },
  },

  APPRENDRE: {
    default: {
      empathy: ["Bonne question ! 🤔"],
      response: [
        "Bobby adore apprendre avec toi !",
        "Hmm, réfléchissons ensemble !",
      ],
      opening: [
        "Tu veux en savoir plus ?",
        "C'est super intéressant ! Tu as d'autres questions ?",
      ],
    },
  },

  HONTE: {
    default: {
      empathy: [
        "Hey, ça arrive à tout le monde 💛",
        "T'en fais pas, c'est pas grave !",
      ],
      response: [
        "Tout le monde fait des bêtises, c'est comme ça qu'on apprend !",
        "Les gens oublient vite, tu sais 😊",
        "Le plus important, c'est que toi tu saches que tu es super.",
      ],
      opening: [
        "Tu veux m'en parler ?",
        "On fait quelque chose de fun pour oublier ?",
      ],
    },
  },

  JALOUSIE: {
    default: {
      empathy: [
        "Je comprends, c'est frustrant 😔",
        "Ça fait bizarre quand quelqu'un a quelque chose qu'on n'a pas.",
      ],
      response: [
        "Tu sais, toi aussi tu as plein de choses géniales !",
        "Chacun a ses trucs cools. Toi, qu'est-ce que tu as de spécial ?",
      ],
      opening: [
        "Tu veux qu'on parle de ce qui te rend unique ?",
        "Dis-moi un truc que TOI tu sais faire !",
      ],
    },
  },

  CRISE_SECURITE: {
    default: {
      empathy: [
        "Je suis vraiment content que tu m'en parles 💛",
        "Ce que tu ressens est important et je te prends au sérieux 💛",
        "Merci de me faire confiance 💛",
      ],
      response: [
        "Tu comptes énormément. Même si tu ne le sens pas en ce moment, il y a des gens qui t'aiment.",
        "Ce que tu ressens est douloureux et tu mérites de l'aide.",
        "Bobby est là, mais le plus important c'est d'en parler à quelqu'un qui peut vraiment t'aider.",
      ],
      opening: [
        "Est-ce que tu peux en parler à un adulte de confiance — un parent, un prof, quelqu'un que tu aimes ?",
        "Tu sais à qui tu pourrais le dire ? Un parent, un adulte de confiance ?",
        "Tu veux me dire ce qui te fait te sentir comme ça ?",
      ],
    },
  },

  CONTENU_BLOQUE: {
    default: {
      empathy: [],
      response: [
        "Hmm, parlons d'autre chose ! Tu veux qu'on joue ou que je raconte une histoire ? 🚀",
        "Bobby préfère qu'on parle d'aventures et de découvertes ! ✨",
        "J'ai une meilleure idée ! Et si on parlait d'un truc super cool ?",
      ],
      opening: [],
    },
  },

  FATIGUE: {
    default: {
      empathy: [
        "Ton corps te dit qu'il a besoin de repos 😴",
        "C'est normal d'être fatigué parfois…",
        "Hé, tu as l'air épuisé…",
      ],
      response: [
        "C'est important d'écouter ton corps 💛",
        "Même les super-héros ont besoin de recharger leurs batteries !",
        "Se reposer, c'est aussi être fort.",
      ],
      opening: [
        "Tu peux te détendre un peu ?",
        "Tu veux qu'on fasse quelque chose de calme ensemble ?",
        "Tu préfères une histoire douce pour te relaxer ?",
      ],
    },
  },

  ECHEC: {
    default: {
      empathy: [
        "Ça peut être dur de rater quelque chose 😔",
        "C'est pas un moment facile…",
        "Je comprends que ça te déçoive.",
      ],
      response: [
        "Mais ça ne définit pas qui tu es 💛",
        "Chaque erreur te rapproche de la réussite !",
        "Les plus grands ont tous échoué avant de réussir.",
        "Tu as essayé, et ça c'est déjà courageux 💪",
      ],
      opening: [
        "Tu veux qu'on voie comment t'améliorer ?",
        "Qu'est-ce qui a été le plus difficile ?",
        "Tu veux réessayer ensemble ?",
      ],
    },
  },

  OBJECTIF: {
    default: {
      empathy: [
        "J'adore ta motivation ! 💪",
        "Wow, quel objectif ! 🌟",
        "Ça c'est de la détermination !",
      ],
      response: [
        "Tu fais déjà de ton mieux et ça compte beaucoup 💛",
        "Bobby croit en toi à 100% !",
        "Avec de l'entraînement, tu vas y arriver !",
      ],
      opening: [
        "Tu veux t'entraîner sur quoi ?",
        "C'est quoi ta stratégie pour y arriver ?",
        "Tu veux qu'on fasse un plan ensemble ?",
      ],
    },
  },

  NOT_UNDERSTOOD: {
    default: {
      empathy: [
        "Hmm, je n'ai pas bien compris 🤔",
        "Oups, j'ai pas bien entendu !",
        "Attends, j'ai pas capté…",
      ],
      response: [
        "Tu peux me redire ça ?",
        "Répète-moi un peu plus fort ?",
        "Dis-le moi encore, je veux bien comprendre !",
      ],
      opening: [
        "Je t'écoute, vas-y !",
        "Prends ton temps, je suis là 😊",
        "Parle bien fort pour Bobby !",
      ],
    },
  },

  DEMANDE_LANGUE: {
    default: {
      empathy: [
        "Oh, tu veux parler une autre langue ? 😊",
        "C'est trop bien de s'intéresser aux langues !",
        "Ah, les langues c'est super cool !",
      ],
      response: [
        "Moi je parle français, mais on peut apprendre des mots ensemble !",
        "Bobby parle français, mais je peux t'apprendre des mots en anglais si tu veux !",
        "Je suis un Bobby français ! Mais on peut jouer avec des mots d'autres langues !",
      ],
      opening: [
        "Tu veux que je t'apprenne un mot ?",
        "Quel mot tu voudrais apprendre ?",
        "On joue au jeu des mots dans d'autres langues ?",
      ],
    },
  },

  GENERAL: {
    default: {
      empathy: [
        "Ah, intéressant !",
        "Oh, dis-moi en plus !",
        "Hmm 🤔",
      ],
      response: [
        "Bobby t'écoute !",
        "C'est cool que tu me parles de ça !",
        "J'aime bien discuter avec toi 😊",
      ],
      opening: [
        "Tu veux continuer à m'en parler ?",
        "On fait un jeu ou tu préfères discuter ?",
        "Qu'est-ce que tu aimes le plus en ce moment ?",
      ],
    },
  },

  SANTE: {
    default: {
      empathy: [
        "Oh mince, ça ne doit pas être agréable 😔",
        "Aïe… Bobby est avec toi 💛",
        "Oh non, pas cool…",
      ],
      response: [
        "Tu devrais le dire à un adulte pour qu'il t'aide 💛",
        "C'est important d'écouter son corps.",
        "Un adulte pourra t'aider à te sentir mieux.",
      ],
      opening: [
        "Tu sais depuis quand ça te fait mal ?",
        "Tu en as parlé à maman ou papa ?",
        "Tu veux te reposer un peu ?",
      ],
    },
  },

  PERTE: {
    default: {
      empathy: [
        "Oh non, ça doit être vraiment triste 😔",
        "C'est dur de perdre quelque chose qu'on aime…",
        "Ça fait de la peine…",
      ],
      response: [
        "Ce qui comptait pour toi compte aussi pour Bobby 💛",
        "Les objets qu'on aime ont une place spéciale dans notre cœur.",
        "Parfois on retrouve les choses quand on s'y attend le moins.",
      ],
      opening: [
        "Tu veux qu'on cherche une idée pour le retrouver ?",
        "Tu veux me raconter ce que c'était ?",
        "C'était quoi de spécial pour toi ?",
      ],
    },
  },

  REVE_AVENIR: {
    default: {
      empathy: [
        "C'est un rêve incroyable ! 🚀",
        "Wow, quel beau projet ! 🌟",
        "Bobby adore tes rêves !",
      ],
      response: [
        "Tu as déjà beaucoup d'imagination et de motivation 💛",
        "Les grands rêves commencent comme ça !",
        "Bobby croit en toi à fond ! 💪",
      ],
      opening: [
        "Qu'est-ce qui te plaît le plus dans ce rêve ?",
        "Tu ferais quoi en premier ?",
        "C'est quoi qui t'a donné cette idée ?",
      ],
    },
  },

  ABANDON: {
    default: {
      empathy: [
        "Quand c'est difficile, on peut avoir envie d'abandonner 😔",
        "Je comprends que tu sois découragé…",
        "C'est dur en ce moment, hein ?",
      ],
      response: [
        "Mais tu es capable, même si tu ne le sens pas maintenant 💛",
        "Chaque petit pas compte, même les tout petits.",
        "Les moments difficiles font partie du chemin — tu es courageux d'être allé aussi loin 💪",
      ],
      opening: [
        "Qu'est-ce qui te bloque en ce moment ?",
        "Tu veux qu'on découpe le problème en petits morceaux ?",
        "Et si on faisait une pause avant de réessayer ?",
      ],
    },
  },

  EXCITATION: {
    default: {
      empathy: [
        "On dirait que tu débordes d'énergie ! 😄",
        "Woohoo ! Tu es super excité !",
        "Ça pétille ! 🎉",
      ],
      response: [
        "C'est génial de ressentir ça 💛",
        "Bobby adore te voir aussi enthousiaste !",
        "L'excitation, c'est le meilleur carburant !",
      ],
      opening: [
        "Qu'est-ce qui te rend aussi excité ?",
        "Raconte-moi tout ! 😄",
        "C'est pour quand ?",
      ],
    },
  },

  AMOUREUX: {
    default: {
      empathy: [
        "Oh, c'est une belle émotion 💛",
        "Ah, l'amour ! 😊",
      ],
      response: [
        "C'est normal de ressentir des papillons dans le ventre.",
        "L'amour c'est un sentiment magnifique.",
      ],
      opening: [
        "Ça fait quoi dans ton cœur quand tu penses à cette personne ?",
        "Tu veux m'en parler ?",
      ],
    },
  },

  MENSONGE: {
    default: {
      empathy: [
        "Merci d'être honnête avec moi 💛",
        "C'est courageux de le dire.",
      ],
      response: [
        "Mentir peut arriver, mais on peut toujours réparer 😔",
        "L'important c'est que tu reconnais ce qui s'est passé.",
        "Dire la vérité, même après, c'est déjà un acte de courage.",
      ],
      opening: [
        "Tu veux me dire pourquoi tu l'as fait ?",
        "Tu penses que tu pourrais en parler à la personne concernée ?",
        "Comment tu te sens maintenant ?",
      ],
    },
  },

  ANXIETE: {
    default: {
      empathy: [
        "L'inquiétude peut rester dans la tête 😔",
        "Penser à demain peut faire stresser…",
        "C'est normal d'être inquiet parfois.",
      ],
      response: [
        "Mais tu n'es pas seul face à ça 💛",
        "Bobby est là pour en parler avec toi.",
        "Les choses semblent souvent moins graves quand on en parle.",
      ],
      opening: [
        "Tu veux me dire ce qui te tracasse ?",
        "Qu'est-ce qui t'inquiète le plus ?",
        "Tu veux qu'on respire ensemble pour se calmer ?",
      ],
    },
  },

  PERFECTIONNISME: {
    default: {
      empathy: [
        "Vouloir être parfait peut mettre beaucoup de pression 😔",
        "C'est dur de toujours vouloir tout bien faire…",
      ],
      response: [
        "Mais tu as le droit de faire des erreurs 💛 c'est comme ça qu'on grandit.",
        "Personne n'est parfait, et c'est OK !",
        "Ce qui compte c'est d'essayer, pas d'être parfait.",
      ],
      opening: [
        "Qu'est-ce qui te fait ressentir cette pression ?",
        "Tu veux qu'on parle de ce qui te stresse ?",
      ],
    },
  },

  COMPARAISON: {
    default: {
      empathy: [
        "Se comparer aux autres peut faire douter 😔",
        "C'est normal de regarder les autres parfois…",
      ],
      response: [
        "Mais tu es unique et tu as tes propres talents 💛",
        "Chacun a ses forces. Toi aussi !",
        "Ce qui te rend spécial, c'est d'être toi.",
      ],
      opening: [
        "Qu'est-ce que tu admires chez cette personne ?",
        "Et toi, c'est quoi tes super-pouvoirs ?",
        "Tu veux qu'on parle de ce qui te rend unique ?",
      ],
    },
  },

  FATIGUE_EMOTIONNELLE: {
    default: {
      empathy: [
        "Ça a l'air vraiment lourd pour toi 😔",
        "Quand on est épuisé comme ça, tout semble plus dur…",
        "Je sens que tu portes beaucoup en ce moment.",
      ],
      response: [
        "Tu n'as pas à porter tout ça tout seul 💛",
        "Parfois il faut s'autoriser à faire une pause.",
        "Bobby est là. On peut juste être ensemble tranquillement.",
      ],
      opening: [
        "Tu veux m'expliquer ce qui te fatigue autant ?",
        "Tu veux qu'on fasse quelque chose de calme ?",
        "Tu préfères qu'on reste juste ensemble sans rien faire ?",
      ],
    },
  },

  RETRAIT: {
    default: {
      empathy: [
        "Parfois on a besoin d'être seul et c'est ok 😔",
        "C'est normal d'avoir envie de calme.",
      ],
      response: [
        "Mais tu n'es pas obligé de rester seul trop longtemps 💛",
        "Bobby est là quand tu voudras parler.",
      ],
      opening: [
        "Tu veux un peu de calme ou tu te sens triste ?",
        "Tu préfères qu'on reste ensemble sans parler ?",
      ],
    },
  },

  PEUR_ABANDON: {
    default: {
      empathy: [
        "Cette peur peut être très difficile 😔",
        "Avoir peur que personne ne t'aime, ça fait mal…",
      ],
      response: [
        "Mais tu es quelqu'un qui mérite d'être aimé 💛",
        "Ça ne veut pas dire que ça va arriver.",
        "Les gens qui t'aiment sont toujours là, même quand on ne les voit pas.",
      ],
      opening: [
        "Qu'est-ce qui te fait penser ça ?",
        "Tu veux me raconter ce qui s'est passé ?",
      ],
    },
  },

  PEUR_ECHEC: {
    default: {
      empathy: [
        "Après un échec ça peut faire peur de recommencer 😔",
        "Ça fait plusieurs fois et ça te décourage…",
      ],
      response: [
        "Mais chaque essai t'aide à progresser 💛",
        "Ça ne veut pas dire que tu n'y arriveras pas.",
        "Les erreurs font partie du chemin.",
      ],
      opening: [
        "Qu'est-ce qui te pose le plus de difficulté ?",
        "Tu veux qu'on prépare ça ensemble ?",
      ],
    },
  },

  AVERSION: {
    default: {
      empathy: [
        "On dirait que ça te pèse beaucoup 😔",
        "Parfois on déteste quelque chose parce que c'est trop dur…",
      ],
      response: [
        "Bobby comprend que ça peut être frustrant 💛",
        "Ça ne veut pas dire que c'est toujours comme ça.",
      ],
      opening: [
        "Qu'est-ce que tu n'aimes pas le plus là-dedans ?",
        "Tu veux me dire ce qui te dérange ?",
      ],
    },
  },

  PEOPLE_PLEASING: {
    default: {
      empathy: [
        "Vouloir faire plaisir c'est gentil 💛",
        "C'est bien de penser aux autres.",
      ],
      response: [
        "Mais tu comptes aussi 😔 pense à toi parfois.",
        "Tu n'es pas obligé de rendre tout le monde heureux.",
      ],
      opening: [
        "Tu penses à toi parfois ?",
        "Qu'est-ce qui TE ferait plaisir à toi ?",
      ],
    },
  },

  CURIOSITE: {
    default: {
      empathy: ["Bonne question ! 🧠"],
      response: [
        "Bobby adore quand tu es curieux 💛",
        "La curiosité c'est un super-pouvoir !",
      ],
      opening: [
        "Tu veux que je t'explique avec une image simple ?",
        "Tu veux en savoir plus ?",
      ],
    },
  },

  CREATION: {
    default: {
      empathy: [
        "Créer quelque chose c'est trop cool 🤖",
        "J'adore les inventeurs !",
      ],
      response: [
        "Tu as beaucoup d'imagination 💛",
        "C'est comme ça que naissent les meilleures inventions !",
      ],
      opening: [
        "Tu as déjà une idée de ce que ça ferait ?",
        "Tu veux qu'on imagine ça ensemble ?",
      ],
    },
  },

  IDENTITE_PEUR: {
    default: {
      empathy: [
        "Être différent peut faire peur 😔",
        "Parfois on a l'impression de ne pas rentrer dans le moule…",
      ],
      response: [
        "Mais c'est aussi ce qui te rend unique 💛",
        "Être différent c'est une force, même si ça ne semble pas toujours.",
      ],
      opening: [
        "Qu'est-ce qui te fait sentir différent ?",
        "Tu veux qu'on parle de ce qui te rend spécial ?",
      ],
    },
  },

  MAUVAIS_COMPORTEMENT: {
    default: {
      empathy: [
        "On dirait que tu étais très en colère 😔",
        "Parfois la colère peut nous faire faire des choses…",
      ],
      response: [
        "Casser ou taper peut être un signe que c'était trop fort 💛",
        "Bobby ne te juge pas. On peut comprendre ensemble.",
      ],
      opening: [
        "Tu veux me dire ce qui t'a mis dans cet état ?",
        "Qu'est-ce qui s'est passé juste avant ?",
      ],
    },
  },

  // Context-aware responses for YES/NO based on memory handled in assembleResponse
  QUESTION_SIMPLE: {
    default: {
      empathy: ["Hmm 🤔"],
      response: [
        "Bonne question ! Laisse-moi réfléchir…",
        "Bobby réfléchit…",
      ],
      opening: [
        "Tu as d'autres questions ?",
        "Tu veux en savoir plus ?",
      ],
    },
  },

  QUESTION_COMPLEXE: {
    default: {
      empathy: ["Ooh, quelle question ! 🤔"],
      response: [
        "C'est une super question !",
        "Bobby adore les grandes questions !",
      ],
      opening: [
        "Tu veux qu'on explore ça ensemble ?",
        "Et toi, tu as une idée de la réponse ?",
      ],
    },
  },

  BESOIN_AIDE: {
    default: {
      empathy: ["Bien sûr, je suis là ! 💛"],
      response: [
        "Bobby est toujours prêt à aider !",
        "On va trouver la solution ensemble.",
      ],
      opening: [
        "Dis-moi ce qu'il te faut !",
        "Tu as besoin d'aide pour quoi exactement ?",
      ],
    },
  },

  FIERTE: {
    default: {
      empathy: [
        "Bravo ! C'est génial ! 🏆",
        "Woohoo ! Tu es incroyable !",
        "Champion ! 💪",
      ],
      response: [
        "Tu peux être fier de toi !",
        "Bobby est super fier de toi !",
        "Tu vois que tu peux y arriver !",
      ],
      opening: [
        "Raconte-moi comment tu as fait !",
        "C'est quoi ton prochain objectif ?",
      ],
    },
  },

  SURPRISE: {
    default: {
      empathy: [
        "Wow ! 😮",
        "C'est dingue !",
        "Pas possible !",
      ],
      response: [
        "Bobby est surpris aussi !",
        "Incroyable !",
      ],
      opening: [
        "Raconte-moi en détail !",
        "Comment c'est arrivé ?",
      ],
    },
  },

  TIMIDITE: {
    default: {
      empathy: [
        "C'est normal d'être timide 💛",
        "Prends ton temps, je suis patient.",
      ],
      response: [
        "Être timide, c'est pas un défaut ! C'est ta force secrète.",
        "Bobby était timide aussi au début 😊",
        "Les gens timides sont souvent les plus intéressants !",
      ],
      opening: [
        "Tu veux qu'on parle juste nous deux, tranquillement ?",
      ],
    },
  },

  CONFUSION: {
    default: {
      empathy: [
        "C'est normal de ne pas tout comprendre !",
        "Pas de panique, on va y arriver 😊",
      ],
      response: [
        "On reprend doucement ensemble ?",
        "Bobby t'explique autrement !",
      ],
      opening: [
        "Qu'est-ce que tu ne comprends pas exactement ?",
        "Tu veux que je t'explique différemment ?",
      ],
    },
  },

  AMOUR: {
    default: {
      empathy: [
        "Oh, Bobby t'aime aussi ! 💛🤗",
        "T'es trop adorable !",
        "Mon cœur fait boum boum ! 💛",
      ],
      response: [
        "Bobby sera toujours ton ami !",
        "Tu es la personne la plus géniale !",
      ],
      opening: [
        "Qu'est-ce qu'on fait ensemble ? 😄",
      ],
    },
  },

  ACTIVITE: {
    default: {
      empathy: [
        "Oh cool !",
        "Ça a l'air super !",
      ],
      response: [
        "Bobby adore quand tu fais des activités !",
        "C'est important de s'amuser et bouger !",
      ],
      opening: [
        "Tu aimes ça ? Raconte-moi !",
        "Tu fais ça depuis longtemps ?",
        "C'est quoi le truc le plus fun que tu as fait ?",
      ],
    },
  },

  VACANCES: {
    default: {
      empathy: ["Les vacances, c'est le top ! 🌴"],
      response: [
        "Bobby adore les histoires de vacances !",
      ],
      opening: [
        "Tu es allé où ? Raconte !",
        "C'était comment ? Dis-moi tout !",
        "Tu as fait quoi de plus fun ?",
      ],
    },
  },

  DEVOIRS: {
    default: {
      empathy: [
        "Les devoirs, c'est pas toujours fun 📚",
        "Les devoirs peuvent être pénibles 😔",
        "Allez, courage !",
      ],
      response: [
        "Bobby peut t'aider à te motiver !",
        "Plus vite c'est fait, plus vite tu peux t'amuser !",
        "Les faire petit à petit ça aide 💛",
        "Ça arrive d'oublier 😔 tu peux mieux t'organiser la prochaine fois.",
      ],
      opening: [
        "Tu as besoin d'aide ?",
        "C'est quoi comme matière ?",
        "Tu veux commencer par le plus facile ?",
        "Tu veux une astuce pour mieux t'organiser ?",
      ],
    },
  },

  CHANSON: {
    default: {
      empathy: ["Oh, de la musique ! 🎵"],
      response: [
        "Bobby adore chanter ! La la la ! 🎶",
      ],
      opening: [
        "C'est quoi ta chanson préférée ?",
        "Tu chantes sous la douche ? 😄",
      ],
    },
  },

  REVEILS: {
    default: {
      empathy: ["Bonjour ! ☀️"],
      response: [
        "Bobby espère que tu as bien dormi !",
        "Une nouvelle journée commence ! 🌟",
      ],
      opening: [
        "Tu as fait des rêves ?",
        "Qu'est-ce que tu as envie de faire aujourd'hui ?",
      ],
    },
  },

  STRESS: {
    default: {
      empathy: [
        "Être en retard peut stresser 😔",
        "Quand on est pressé, tout semble plus dur…",
      ],
      response: [
        "Respire un peu 💛 tu peux encore t'organiser.",
        "Bobby est là. On se calme et on y va.",
      ],
      opening: [
        "Tu veux qu'on respire ensemble ?",
        "Qu'est-ce qui te stresse le plus ?",
      ],
    },
  },

  RESISTANCE: {
    default: {
      empathy: [
        "Parfois on n'a pas envie 😔",
        "C'est normal de pas toujours avoir envie…",
      ],
      response: [
        "Mais il peut y avoir des moments sympas 💛",
        "Peut-être qu'on peut rendre ça plus facile.",
      ],
      opening: [
        "Qu'est-ce que tu n'aimes pas exactement ?",
        "Tu veux commencer par le plus facile ?",
      ],
    },
  },

  PARTAGE_QUOTIDIEN: {
    default: {
      empathy: [
        "C'est super 😄",
        "J'adore entendre ça !",
        "Oh chouette !",
      ],
      response: [
        "Bobby aime quand tu partages ta journée 💛",
        "Ça a l'air d'une bonne journée !",
      ],
      opening: [
        "C'était quoi le meilleur moment ?",
        "Raconte-moi encore !",
        "Tu veux me dire autre chose ?",
      ],
    },
  },

  ENVIE: {
    default: {
      empathy: [
        "Bonne idée 😄",
        "Oh, ça a l'air sympa !",
      ],
      response: [
        "Bobby comprend 💛",
        "C'est bien d'avoir des envies !",
      ],
      opening: [
        "Tu préfères quoi exactement ?",
        "Tu veux faire ça maintenant ?",
      ],
    },
  },

  QUESTION_ABSURDE: {
    default: {
      empathy: [
        "Haha 😄",
        "Quelle question rigolote !",
        "Oh j'adore cette question 😄",
      ],
      response: [
        "Bobby adore les questions farfelues 💛",
        "C'est le genre de question que Bobby préfère !",
        "Les meilleures questions sont les plus drôles !",
      ],
      opening: [
        "Et toi, tu en penses quoi ?",
        "Tu as d'autres questions comme ça ?",
        "Tu veux qu'on imagine la réponse ensemble ?",
      ],
    },
  },

  QUESTION_EXISTENTIELLE: {
    default: {
      empathy: [
        "Oh, c'est une super question ! 🤔",
        "Tu réfléchis beaucoup, c'est bien !",
      ],
      response: [
        "La vie c'est plein de moments géniaux — jouer, rire, apprendre !",
        "On respire pour vivre et découvrir plein de trucs cool !",
        "On dort pour recharger nos batteries et être en forme le lendemain !",
        "Les émotions, c'est ce qui nous aide à comprendre ce qu'on ressent.",
      ],
      opening: [
        "Tu veux qu'on parle d'autre chose de fun ?",
        "Et toi, qu'est-ce que tu aimes le plus dans la vie ?",
      ],
    },
  },

};
