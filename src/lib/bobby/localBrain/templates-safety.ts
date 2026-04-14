import type { LocalIntent, EmotionType, ResponseTemplate } from "./types";

type TemplateMap = Partial<Record<LocalIntent, Partial<Record<EmotionType, ResponseTemplate>> & { default: ResponseTemplate }>>;

export const TEMPLATES_SAFETY: TemplateMap = {
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

};
