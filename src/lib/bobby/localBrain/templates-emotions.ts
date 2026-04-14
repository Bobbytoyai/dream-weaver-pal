import type { LocalIntent, EmotionType, ResponseTemplate } from "./types";

type TemplateMap = Partial<Record<LocalIntent, Partial<Record<EmotionType, ResponseTemplate>> & { default: ResponseTemplate }>>;

export const TEMPLATES_EMOTIONS: TemplateMap = {
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

};
