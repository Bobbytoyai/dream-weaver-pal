import type { LocalIntent, EmotionType, ResponseTemplate } from "./types";

type TemplateMap = Partial<Record<LocalIntent, Partial<Record<EmotionType, ResponseTemplate>> & { default: ResponseTemplate }>>;

export const TEMPLATES_SOCIAL: TemplateMap = {
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
};
