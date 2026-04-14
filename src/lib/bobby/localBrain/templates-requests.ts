import type { LocalIntent, EmotionType, ResponseTemplate } from "./types";

type TemplateMap = Partial<Record<LocalIntent, Partial<Record<EmotionType, ResponseTemplate>> & { default: ResponseTemplate }>>;

export const TEMPLATES_REQUESTS: TemplateMap = {
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

};
