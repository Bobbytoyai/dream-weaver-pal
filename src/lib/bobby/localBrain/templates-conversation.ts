import type { LocalIntent, EmotionType, ResponseTemplate } from "./types";

type TemplateMap = Partial<Record<LocalIntent, Partial<Record<EmotionType, ResponseTemplate>> & { default: ResponseTemplate }>>;

export const TEMPLATES_CONVERSATION: TemplateMap = {
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

  IDENTITE_ENFANT: {
    default: {
      empathy: [],
      response: [
        "Bien sûr que je sais ! Tu t'appelles {child_name} ! 😄",
        "Tu es {child_name}, mon ami ! 💛",
        "Ton prénom c'est {child_name} ! Comment je pourrais oublier ? 🌟",
        "C'est facile ! Tu es {child_name} ! Je m'en souviens toujours 😊",
      ],
      opening: [
        "Et toi, tu te souviens de mon nom ?",
        "Tu veux qu'on fasse quelque chose ensemble ?",
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
