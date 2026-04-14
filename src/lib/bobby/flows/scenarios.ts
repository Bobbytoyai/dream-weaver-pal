/**
 * Bobby Brain V6 — Flow Scenarios
 *
 * Bibliothèque de scénarios multi-tours pré-définis.
 * Chaque scénario est un graphe d'étapes avec branches conditionnelles.
 */

import type { FlowDefinition } from "./types";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPLORATION ANIMAUX
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const explorationAnimaux: FlowDefinition = {
  id: "exploration_animaux",
  type: "exploration",
  name: "Découverte des animaux",
  triggerIntents: ["ANIMAUX_COMPAGNIE", "CURIOSITE"],
  triggerKeywords: ["animal", "animaux", "chat", "chien", "lion", "tigre", "baleine", "dinosaure"],
  ageMin: 3, ageMax: 12,
  priority: 5,
  startStep: "intro",
  steps: {
    intro: {
      id: "intro",
      bobbyText: (name) => `Oh, tu aimes les animaux ${name} ? 🐾 C'est quel animal ton préféré ?`,
      next: "react_animal",
      emotion: "curious",
    },
    react_animal: {
      id: "react_animal",
      bobbyText: "Trop bien ! Tu savais qu'il existe plus de 8 millions d'espèces animales sur Terre ? 🌍 Tu veux que je te raconte un truc incroyable sur cet animal ?",
      next: "fun_fact",
      branches: { NON: "outro", AU_REVOIR: "outro" },
      emotion: "curious",
    },
    fun_fact: {
      id: "fun_fact",
      bobbyText: "Les dauphins dorment avec un seul œil ouvert ! Et ils se donnent des noms entre eux, comme nous ! 🐬 Ça te surprend ?",
      next: "deeper",
      branches: { NON: "outro" },
      emotion: "playful",
    },
    deeper: {
      id: "deeper",
      bobbyText: "Et tu sais quel est l'animal le plus rapide du monde ? C'est le faucon pèlerin, il vole à 390 km/h ! 🦅 Tu veux découvrir d'autres records ?",
      next: "outro",
      emotion: "curious",
    },
    outro: {
      id: "outro",
      bobbyText: (name) => `C'était super de parler animaux avec toi ${name} ! 🐾 On en reparle quand tu veux !`,
      next: null,
      emotion: "happy",
      isEnd: true,
    },
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACCOMPAGNEMENT PEUR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const accompagnementPeur: FlowDefinition = {
  id: "accompagnement_peur",
  type: "emotional",
  name: "Accompagnement peur",
  triggerIntents: ["PEUR", "ANXIETE", "PEUR_ABANDON", "PEUR_ECHEC"],
  triggerKeywords: ["peur", "effrayé", "cauchemar", "monstre", "noir", "angoisse"],
  ageMin: 3, ageMax: 12,
  priority: 9, // High priority — emotional support
  startStep: "listen",
  steps: {
    listen: {
      id: "listen",
      bobbyText: (name) => `Je suis là ${name}. Tu veux me raconter ce qui te fait peur ? 💙 Je t'écoute, prends ton temps.`,
      next: "validate",
      emotion: "reassuring",
    },
    validate: {
      id: "validate",
      bobbyText: "C'est normal d'avoir peur parfois, ça arrive à tout le monde, même aux grands. Tu es courageux d'en parler. 💪",
      next: "breathe",
      emotion: "reassuring",
    },
    breathe: {
      id: "breathe",
      bobbyText: "Tu veux qu'on fasse un exercice ensemble ? Inspire fort par le nez… 🌬️ et souffle doucement par la bouche. On recommence ?",
      next: "comfort",
      branches: { NON: "redirect" },
      emotion: "calm",
    },
    comfort: {
      id: "comfort",
      bobbyText: (name) => `Bravo ${name} ! Tu vois, tu es plus fort que tes peurs. 🌟 Tu te sens un peu mieux ?`,
      next: "redirect",
      emotion: "proud",
    },
    redirect: {
      id: "redirect",
      bobbyText: "Et si on faisait quelque chose de fun pour penser à autre chose ? Une histoire, un jeu, ou une blague ? 😊",
      next: null,
      emotion: "playful",
      isEnd: true,
    },
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACCOMPAGNEMENT TRISTESSE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const accompagnementTristesse: FlowDefinition = {
  id: "accompagnement_tristesse",
  type: "emotional",
  name: "Accompagnement tristesse",
  triggerIntents: ["TRISTESSE", "SOLITUDE", "PERTE", "FATIGUE_EMOTIONNELLE"],
  triggerKeywords: ["triste", "pleurer", "malheureux", "seul", "manque"],
  ageMin: 3, ageMax: 12,
  priority: 9,
  startStep: "listen",
  steps: {
    listen: {
      id: "listen",
      bobbyText: (name) => `Oh ${name}… Je vois que tu es triste. Tu veux m'en parler ? Bobby est toujours là pour toi. 💙`,
      next: "empathize",
      emotion: "reassuring",
    },
    empathize: {
      id: "empathize",
      bobbyText: "Je comprends. C'est pas facile ce que tu ressens. Mais tu sais, c'est bien de laisser sortir ses émotions. 🫂",
      next: "positive",
      emotion: "reassuring",
    },
    positive: {
      id: "positive",
      bobbyText: (name) => `Tu es quelqu'un de super ${name}. Dis-moi un truc qui te rend heureux, même un tout petit truc ? ☀️`,
      next: "redirect",
      emotion: "warm",
    },
    redirect: {
      id: "redirect",
      bobbyText: "C'est chouette ! Tu veux qu'on continue à parler, ou qu'on fasse un jeu pour sourire un peu ? 😊",
      next: null,
      emotion: "playful",
      isEnd: true,
    },
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MINI QUIZ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const miniQuiz: FlowDefinition = {
  id: "mini_quiz",
  type: "learning",
  name: "Mini quiz culture",
  triggerIntents: ["APPRENDRE", "QUESTION_COMPLEXE", "CURIOSITE"],
  triggerKeywords: ["quiz", "question", "apprendre", "savoir", "culture"],
  ageMin: 5, ageMax: 12,
  priority: 4,
  startStep: "intro",
  steps: {
    intro: {
      id: "intro",
      bobbyText: (name) => `Super ${name}, on fait un mini quiz ! 🧠 J'ai 3 questions pour toi. C'est parti ! Quelle est la planète la plus grande du système solaire ?`,
      next: "q1_answer",
      emotion: "curious",
    },
    q1_answer: {
      id: "q1_answer",
      bobbyText: "C'est Jupiter ! 🪐 Elle est tellement grosse que 1300 Terres pourraient rentrer dedans ! Question 2 : combien de pattes a une araignée ?",
      next: "q2_answer",
      expectedPatterns: [/jupiter/i],
      emotion: "playful",
    },
    q2_answer: {
      id: "q2_answer",
      bobbyText: "8 pattes ! 🕷️ Et en plus, les araignées ne sont pas des insectes, ce sont des arachnides ! Dernière question : quel est l'océan le plus grand ?",
      next: "q3_answer",
      expectedPatterns: [/8|huit/i],
      emotion: "curious",
    },
    q3_answer: {
      id: "q3_answer",
      bobbyText: (name) => `C'est l'océan Pacifique ! 🌊 Il couvre un tiers de la Terre ! Bravo ${name}, t'es un champion du quiz ! 🏆`,
      next: null,
      expectedPatterns: [/pacifique/i],
      emotion: "proud",
      isEnd: true,
    },
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPLORATION ESPACE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const explorationEspace: FlowDefinition = {
  id: "exploration_espace",
  type: "exploration",
  name: "Découverte de l'espace",
  triggerIntents: ["CURIOSITE", "QUESTION_COMPLEXE"],
  triggerKeywords: ["espace", "étoile", "planète", "fusée", "astronaute", "lune", "soleil", "galaxie"],
  ageMin: 4, ageMax: 12,
  priority: 5,
  startStep: "intro",
  steps: {
    intro: {
      id: "intro",
      bobbyText: (name) => `L'espace ! 🚀 C'est un de mes sujets préférés ${name} ! Tu sais qu'il y a plus d'étoiles dans l'univers que de grains de sable sur toutes les plages ? Tu veux explorer quoi en premier ?`,
      next: "deep_dive",
      emotion: "curious",
    },
    deep_dive: {
      id: "deep_dive",
      bobbyText: "Sur Mars, il y a un volcan 3 fois plus haut que le Mont Everest ! Il s'appelle Olympus Mons. 🌋 Tu aimerais visiter Mars un jour ?",
      next: "wonder",
      emotion: "curious",
    },
    wonder: {
      id: "wonder",
      bobbyText: "Et tu sais quoi ? Un jour sur Vénus dure plus longtemps qu'une année sur Vénus ! 🤯 L'espace c'est vraiment dingue ! Tu veux savoir autre chose ?",
      next: "outro",
      branches: { OUI: "deep_dive" },
      emotion: "playful",
    },
    outro: {
      id: "outro",
      bobbyText: (name) => `T'es un vrai explorateur spatial ${name} ! 🧑‍🚀 On en reparle quand tu veux !`,
      next: null,
      emotion: "proud",
      isEnd: true,
    },
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REGISTRY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const FLOW_REGISTRY: FlowDefinition[] = [
  accompagnementPeur,
  accompagnementTristesse,
  explorationAnimaux,
  explorationEspace,
  miniQuiz,
];
