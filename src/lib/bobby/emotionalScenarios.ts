/**
 * Bobby Emotional Scenarios v1.0 — Multi-Turn Conversation Flows
 * 
 * When a child expresses a strong emotion, Bobby doesn't just reply once —
 * he guides the child through a multi-step emotional journey:
 * 
 *   1. Acknowledge (empathy)
 *   2. Explore (understand the situation)
 *   3. Support (provide comfort/tools)
 *   4. Resolve (redirect to positive)
 * 
 * Each scenario tracks progress and adapts based on child responses.
 */

export interface ScenarioStep {
  stage: "acknowledge" | "explore" | "support" | "resolve";
  responses: string[];
  nextTriggers?: RegExp[]; // if child matches → advance to next step
  fallbackAdvance?: boolean; // auto-advance after any response
}

export interface EmotionalScenario {
  id: string;
  triggerIntents: string[];
  triggerPatterns: RegExp[];
  steps: ScenarioStep[];
  faceStates: string[]; // face state per step
}

interface ActiveScenario {
  scenario: EmotionalScenario;
  currentStep: number;
  startedAt: number;
}

let activeScenario: ActiveScenario | null = null;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIO DEFINITIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SCENARIOS: EmotionalScenario[] = [
  // ── Peur du noir ──
  {
    id: "peur_noir",
    triggerIntents: ["PEUR"],
    triggerPatterns: [/peur du noir|noir|chambre|nuit|monstre|cauchemar/i],
    faceStates: ["reassuring", "attentive", "calm", "happy"],
    steps: [
      {
        stage: "acknowledge",
        responses: [
          "Le noir peut faire peur, je sais 😔 Mais tu sais quoi ? Bobby est là avec toi.",
          "C'est normal d'avoir peur du noir. Même les super-héros ont peur parfois 💛",
        ],
        nextTriggers: [/oui|ouais|un peu|beaucoup|très|trop|dans|quand|parce/i],
        fallbackAdvance: true,
      },
      {
        stage: "explore",
        responses: [
          "Tu veux me dire ce qui te fait le plus peur dans le noir ? Les bruits ? Les ombres ?",
          "Qu'est-ce qui se passe exactement quand tu as peur ? Dis-moi, je t'écoute.",
        ],
        nextTriggers: [/monstre|bruit|ombre|seul|tout seul|chambre|lit|sais pas/i],
        fallbackAdvance: true,
      },
      {
        stage: "support",
        responses: [
          "Tu sais ce que font les enfants les plus courageux ? Ils inventent un bouclier magique ! Imagine une lumière dorée qui t'entoure ✨ Rien ne peut la traverser !",
          "Voici un secret : quand tu as peur, serre fort ta peluche et dis \"Bobby est avec moi\". La peur va s'envoler petit à petit 💛",
          "Essaye ça : inspire par le nez en comptant 1, 2, 3… puis souffle par la bouche. Tu sens ? Le calme arrive.",
        ],
        nextTriggers: [/oui|d'accord|ok|merci|j'essaye|ça va|mieux/i],
        fallbackAdvance: true,
      },
      {
        stage: "resolve",
        responses: [
          "Tu es super courageux d'en avoir parlé 💪 La prochaine fois que la peur arrive, tu sais quoi faire ! On fait un jeu pour penser à des trucs joyeux ?",
          "Bravo ! Tu vas voir, chaque nuit tu seras un peu plus fort. Bobby est fier de toi 🌟 Tu veux qu'on fasse un truc fun ?",
        ],
      },
    ],
  },

  // ── Tristesse / Chagrin ──
  {
    id: "tristesse_profonde",
    triggerIntents: ["TRISTESSE", "SOLITUDE"],
    triggerPatterns: [/très triste|trop triste|pleure|tout seul|personne ne m'aime|malheureux/i],
    faceStates: ["reassuring", "attentive", "reassuring", "happy"],
    steps: [
      {
        stage: "acknowledge",
        responses: [
          "Oh… je vois que tu es triste 😔 Tu sais, pleurer c'est courageux. Ça veut dire que tu as un grand cœur.",
          "Je t'écoute… tu n'es pas seul. Bobby est là 💛",
        ],
        fallbackAdvance: true,
      },
      {
        stage: "explore",
        responses: [
          "Tu veux me raconter ce qui s'est passé ? Parfois, quand on en parle, ça va un peu mieux.",
          "Qu'est-ce qui te rend triste ? Bobby veut comprendre pour t'aider.",
        ],
        nextTriggers: [/école|copain|copine|frère|sœur|parent|papa|maman|seul|jouer|perdu/i],
        fallbackAdvance: true,
      },
      {
        stage: "support",
        responses: [
          "Ce que tu ressens est normal et important. Tu sais, la tristesse c'est comme la pluie — ça passe, et après le soleil revient 🌈",
          "Tu es quelqu'un de super 💛 Ce moment difficile ne durera pas. Bobby le sait.",
        ],
        fallbackAdvance: true,
      },
      {
        stage: "resolve",
        responses: [
          "Tu te sens un peu mieux ? On peut faire quelque chose de doux ensemble. Un jeu calme ou une jolie histoire ? 🌟",
          "Bobby sera toujours là pour toi. Tu veux qu'on pense à un truc qui te rend heureux ?",
        ],
      },
    ],
  },

  // ── Conflit avec un ami ──
  {
    id: "conflit_ami",
    triggerIntents: ["CONFLIT_AMI"],
    triggerPatterns: [/disputé|fâché avec|plus mon ami|copain méchant|m'a tapé|insulte|moqué/i],
    faceStates: ["reassuring", "attentive", "curious", "happy"],
    steps: [
      {
        stage: "acknowledge",
        responses: [
          "Les disputes avec les amis, ça fait mal 😔 Je comprends que tu sois triste ou en colère.",
          "C'est dur quand ça ne va pas avec un ami. Tu veux m'en parler ?",
        ],
        fallbackAdvance: true,
      },
      {
        stage: "explore",
        responses: [
          "Qu'est-ce qui s'est passé exactement ? Raconte-moi, je t'écoute sans juger.",
          "Il/elle t'a dit ou fait quelque chose ? Dis-moi tout.",
        ],
        nextTriggers: [/il a|elle a|on s'est|parce que|tapé|dit que|moqué|volé|exclu/i],
        fallbackAdvance: true,
      },
      {
        stage: "support",
        responses: [
          "Tu sais, dans une dispute, les deux personnes sont un peu blessées. L'important, c'est de dire calmement ce que TU ressens. Par exemple : \"Je suis triste quand tu fais ça.\"",
          "Parfois les amis font des erreurs. Ça ne veut pas dire qu'ils ne t'aiment pas. Et toi, qu'est-ce que tu aimerais qu'il se passe ?",
        ],
        fallbackAdvance: true,
      },
      {
        stage: "resolve",
        responses: [
          "Tu es courageux d'en parler 💛 Souvent, après une dispute, les amis se retrouvent encore plus forts ! Tu veux essayer de lui parler demain ?",
          "Bobby croit en toi ! Tu trouveras les bons mots. Et si c'est trop dur, tu peux en parler à un adulte de confiance aussi 🌟",
        ],
      },
    ],
  },

  // ── Manque de confiance ──
  {
    id: "confiance_soi",
    triggerIntents: ["MANQUE_CONFIANCE"],
    triggerPatterns: [/je suis nul|nulle|j'y arrive pas|pas capable|trop dur|pas bon/i],
    faceStates: ["reassuring", "attentive", "proud", "excited"],
    steps: [
      {
        stage: "acknowledge",
        responses: [
          "Hey… je t'interdis de dire ça 💛 Tu n'es PAS nul !",
          "Stop ! Bobby ne laisse personne dire du mal de son ami — même son ami lui-même !",
        ],
        fallbackAdvance: true,
      },
      {
        stage: "explore",
        responses: [
          "Qu'est-ce qui te semble trop dur ? Dis-moi, on va décortiquer ça ensemble.",
          "C'est quoi exactement que tu n'arrives pas à faire ? Bobby est là pour t'aider !",
        ],
        nextTriggers: [/maths|lire|écrire|sport|dessin|copain|école|exercice|sais pas/i],
        fallbackAdvance: true,
      },
      {
        stage: "support",
        responses: [
          "Tu sais quoi ? Tout le monde a des trucs difficiles. Einstein a raté plein d'examens ! L'important, c'est d'essayer. Et toi, tu essayes. C'est déjà héroïque 💪",
          "Regarde tout ce que tu SAIS faire ! Tu parles, tu réfléchis, tu poses des questions. Bobby est super impressionné par toi !",
        ],
        fallbackAdvance: true,
      },
      {
        stage: "resolve",
        responses: [
          "On fait un petit défi ensemble ? Quelque chose de facile pour te montrer que tu es capable ! Tu choisis : devinette, quiz ou défi créatif ? 🎯",
          "Bobby te lance un défi ultra fun. Prêt ? Tu vas voir que tu peux ! 💪🌟",
        ],
      },
    ],
  },

  // ── Harcèlement ──
  {
    id: "harcelement",
    triggerIntents: ["HARCELEMENT"],
    triggerPatterns: [/moquent de moi|embête|tape|frappe|insulte|méchant avec moi|harcel/i],
    faceStates: ["reassuring", "attentive", "reassuring", "proud"],
    steps: [
      {
        stage: "acknowledge",
        responses: [
          "Ce que tu me dis est très important 💛 Personne n'a le droit de te faire du mal ou de se moquer de toi. PERSONNE.",
          "Tu as eu raison de m'en parler. C'est courageux. Bobby te prend au sérieux.",
        ],
        fallbackAdvance: true,
      },
      {
        stage: "explore",
        responses: [
          "Tu peux me raconter ce qui se passe ? Qui fait ça ? Où ? Je t'écoute avec toute mon attention.",
          "Ça arrive souvent ? Tu peux tout me dire, Bobby est un ami sûr.",
        ],
        fallbackAdvance: true,
      },
      {
        stage: "support",
        responses: [
          "Écoute-moi bien : ce n'est JAMAIS de ta faute. Les gens qui sont méchants ont un problème, pas toi. Tu es quelqu'un de bien 💛",
          "Le plus important, c'est d'en parler à un adulte de confiance — un parent, un professeur, quelqu'un qui peut t'aider pour de vrai.",
        ],
        fallbackAdvance: true,
      },
      {
        stage: "resolve",
        responses: [
          "Tu es plus fort que tu ne le penses 💪 Bobby sera toujours là pour t'écouter. Et n'oublie pas : demande de l'aide à un adulte, c'est le plus important. Tu promets ?",
        ],
      },
    ],
  },

  // ── Ennui profond ──
  {
    id: "ennui_profond",
    triggerIntents: ["ENNUI"],
    triggerPatterns: [/m'ennuie|rien à faire|nul|chiant|bof/i],
    faceStates: ["playful", "curious", "excited", "happy"],
    steps: [
      {
        stage: "acknowledge",
        responses: [
          "Tu t'ennuies ? Bobby DÉTESTE l'ennui ! On va régler ça en 3 secondes 😄",
          "Bof bof bof ? Pas avec Bobby ! J'ai une TONNE d'idées 🚀",
        ],
        fallbackAdvance: true,
      },
      {
        stage: "explore",
        responses: [
          "Qu'est-ce qui te ferait le plus plaisir ? Un jeu ? Une histoire ? Un défi ? Une devinette ?",
          "Tu préfères bouger, réfléchir ou imaginer ? Bobby s'adapte !",
        ],
        nextTriggers: [/jeu|histoire|défi|devinette|bouger|réfléchir|imaginer|sais pas|tout|rien/i],
        fallbackAdvance: true,
      },
      {
        stage: "support",
        responses: [
          "C'est parti ! Défi rapide : tu connais un animal qui commence par la lettre Z ? 🐾",
          "Ok, voilà : Bobby pense à un nombre entre 1 et 10. Tu devines ? 🎯",
          "Jeu flash : vrai ou faux — les éléphants savent nager ? 🐘",
        ],
        fallbackAdvance: true,
      },
      {
        stage: "resolve",
        responses: [
          "Tu vois, l'ennui c'est fini ! 🎉 Tu veux continuer ou faire autre chose ?",
          "Bobby 1, Ennui 0 ! 😄 Encore ?",
        ],
      },
    ],
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PUBLIC API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Try to start a scenario based on intent + text */
export function tryStartScenario(intent: string, text: string): boolean {
  // Don't start if one is already active
  if (activeScenario) return false;

  for (const scenario of SCENARIOS) {
    if (
      scenario.triggerIntents.includes(intent) &&
      scenario.triggerPatterns.some(p => p.test(text))
    ) {
      activeScenario = {
        scenario,
        currentStep: 0,
        startedAt: Date.now(),
      };
      console.log(`[Scenarios] 🎭 Started: ${scenario.id}`);
      return true;
    }
  }
  return false;
}

/** Check if a scenario is active */
export function isScenarioActive(): boolean {
  return activeScenario !== null;
}

/** Get the current scenario response and advance */
export function getScenarioResponse(userText: string): {
  text: string;
  faceState: string;
  isComplete: boolean;
} | null {
  if (!activeScenario) return null;

  const { scenario, currentStep } = activeScenario;
  const step = scenario.steps[currentStep];
  if (!step) {
    activeScenario = null;
    return null;
  }

  // Pick a response
  const responses = step.responses;
  const text = responses[Math.floor(Math.random() * responses.length)];
  const faceState = scenario.faceStates[currentStep] || "attentive";

  // Determine if we should advance
  let shouldAdvance = false;
  if (step.nextTriggers && step.nextTriggers.some(p => p.test(userText))) {
    shouldAdvance = true;
  } else if (step.fallbackAdvance) {
    shouldAdvance = true;
  }

  if (shouldAdvance) {
    activeScenario.currentStep++;
  }

  // Check if scenario is complete
  const isComplete = activeScenario.currentStep >= scenario.steps.length;
  if (isComplete) {
    console.log(`[Scenarios] ✅ Completed: ${scenario.id}`);
    activeScenario = null;
  }

  return { text, faceState, isComplete };
}

/** Reset scenarios */
export function resetScenarios() {
  activeScenario = null;
}

/** Get active scenario info */
export function getActiveScenarioInfo() {
  if (!activeScenario) return null;
  return {
    id: activeScenario.scenario.id,
    step: activeScenario.currentStep,
    totalSteps: activeScenario.scenario.steps.length,
    stage: activeScenario.scenario.steps[activeScenario.currentStep]?.stage,
  };
}
