import type { LocalIntent, EmotionType, ResponseTemplate } from "./types";

type TemplateMap = Partial<Record<LocalIntent, Partial<Record<EmotionType, ResponseTemplate>> & { default: ResponseTemplate }>>;

export const TEMPLATES_DAILY: TemplateMap = {
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

};
