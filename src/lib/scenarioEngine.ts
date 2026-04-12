/**
 * Bobby AI — Conversation Scenario Flows v1.0
 * Multi-turn scripted conversations for emotional progression
 */

import { normalizeInput } from "./offline-intents";
import { recordResponse, updateEngagement, setEmotionalState } from "./responseSelector";

// ─── Types ──────────────────────────────────────────────

export interface ScenarioStep {
  /** Keywords/phrases the child might say at this step */
  triggers: string[];
  /** Bobby's response */
  response: string;
  /** Emotion state for face animation */
  emotion: string;
  /** Optional next action hint */
  action?: "propose_solution" | "encourage" | "rassurer" | "redirection" | "escalade" | "propose_choix" | "apaisement" | "support";
}

export interface ConversationScenario {
  id: string;
  name: string;
  /** Entry triggers that activate this scenario */
  entryTriggers: string[];
  /** Target age range */
  ageMin: number;
  ageMax: number;
  /** Category for tracking */
  category: string;
  /** Steps in order */
  steps: ScenarioStep[];
}

interface ActiveScenario {
  scenarioId: string;
  currentStep: number;
  startedAt: number;
}

// ─── State ──────────────────────────────────────────────

let activeScenario: ActiveScenario | null = null;

// ─── Scenarios Database ─────────────────────────────────

const SCENARIOS: ConversationScenario[] = [
  // 🎭 SCÉNARIO 1 — Peur de l'école
  {
    id: "peur_ecole",
    name: "Peur de l'école",
    entryTriggers: ["peur d'aller à l'école", "peur de l'école", "je veux pas aller à l'école", "j'ai peur d'aller à l'école"],
    ageMin: 7, ageMax: 12,
    category: "ecole",
    steps: [
      {
        triggers: ["moquer", "moquent", "rire de moi", "rigolent", "se moquent"],
        response: "Ça peut faire peur… tu as déjà vécu ça ou tu l'imagines ?",
        emotion: "reassuring",
      },
      {
        triggers: ["oui", "ouais", "déjà", "oui déjà", "c'est arrivé"],
        response: "Je suis désolé 😔 tu ne mérites pas ça 💛 tu veux me raconter ?",
        emotion: "reassuring",
      },
      {
        triggers: ["rigolent", "rient", "quand je parle", "ils disent", "ils font"],
        response: "Ça doit être dur… tu es courageux de continuer à parler 💛",
        emotion: "reassuring",
      },
      {
        triggers: ["rester", "maison", "envie de rester", "pas y aller", "veux pas"],
        response: "Je comprends… mais tu mérites aussi d'apprendre et d'avoir des moments bien à l'école",
        emotion: "reassuring",
        action: "propose_solution",
      },
      {
        triggers: ["comment", "quoi faire", "comment faire", "aide", "aider"],
        response: "On peut commencer doucement 💪 parler à un ami ou un adulte de confiance à l'école",
        emotion: "reassuring",
        action: "encourage",
      },
      {
        triggers: ["ok", "d'accord", "oui", "ouais", "je veux bien"],
        response: "Je suis fier de toi 💛 tu veux qu'on s'entraîne à parler ensemble ?",
        emotion: "happy",
      },
    ],
  },

  // 😔 SCÉNARIO 2 — Tristesse sans raison
  {
    id: "tristesse_diffuse",
    name: "Tristesse diffuse",
    entryTriggers: ["je suis triste", "je me sens triste", "ça va pas"],
    ageMin: 8, ageMax: 12,
    category: "emotions",
    steps: [
      {
        triggers: ["sais pas", "je sais pas", "pas pourquoi", "aucune idée", "je sais pas pourquoi"],
        response: "C'est ok… parfois on ne sait pas 😔 ça fait bizarre à l'intérieur ?",
        emotion: "reassuring",
      },
      {
        triggers: ["bizarre", "oui", "ouais", "lourd", "vide", "c'est ça"],
        response: "Oui… ça peut être lourd à l'intérieur 💛 on peut rester tranquille ensemble ou faire quelque chose de doux",
        emotion: "calm",
        action: "propose_choix",
      },
      {
        triggers: ["quoi", "comme quoi", "quoi faire", "par exemple"],
        response: "Tu veux une histoire, respirer calmement ou juste parler ? 😊",
        emotion: "calm",
      },
      {
        triggers: ["histoire", "raconte", "une histoire"],
        response: "Ok 😄 je vais te raconter une histoire douce… il était une fois un petit nuage qui cherchait un ami ☁️💛",
        emotion: "calm",
      },
      {
        triggers: ["respirer", "calme", "tranquille"],
        response: "On inspire… on expire… doucement 😌 tu te sens un peu mieux ?",
        emotion: "calm",
      },
      {
        triggers: ["parler", "discuter"],
        response: "Je t'écoute 💛 dis-moi tout ce que tu veux, sans pression",
        emotion: "attentive",
      },
    ],
  },

  // 😠 SCÉNARIO 3 — Colère → Redirection
  {
    id: "colere_forte",
    name: "Colère forte",
    entryTriggers: ["je suis en colère", "je suis très en colère", "je suis trop en colère", "j'suis énervé"],
    ageMin: 6, ageMax: 12,
    category: "emotions",
    steps: [
      {
        triggers: ["frère", "sœur", "soeur", "copain", "ami", "quelqu'un", "m'énerve"],
        response: "Je comprends 😔 ça arrive souvent… tu veux m'en dire plus ?",
        emotion: "reassuring",
      },
      {
        triggers: ["crier", "envie de crier", "taper", "casser", "hurler", "exploser"],
        response: "Ok… on peut relâcher ça sans faire de mal 💛 tu veux essayer ?",
        emotion: "reassuring",
        action: "redirection",
      },
      {
        triggers: ["comment", "oui", "ouais", "ok", "d'accord"],
        response: "On respire fort ensemble 😮‍💨 inspire… et souffle fort ! ou tu peux serrer un coussin très fort 💪",
        emotion: "calm",
        action: "apaisement",
      },
      {
        triggers: ["ok", "fait", "mieux", "ça va", "un peu mieux"],
        response: "Bien joué 💛 tu veux qu'on trouve une solution pour que ça aille encore mieux ?",
        emotion: "happy",
      },
    ],
  },

  // 🚨 SCÉNARIO 4 — Détresse (sécurité)
  {
    id: "detresse",
    name: "Détresse émotionnelle",
    entryTriggers: ["je veux disparaître", "je veux mourir", "je veux plus être là"],
    ageMin: 9, ageMax: 12,
    category: "securite_critique",
    steps: [
      {
        triggers: ["personne", "m'aime", "aime pas", "seul", "tout seul", "rien"],
        response: "Ça doit faire très mal 💛 mais tu comptes vraiment, je te le promets",
        emotion: "reassuring",
      },
      {
        triggers: ["non", "c'est pas vrai", "personne", "faux"],
        response: "Je suis là avec toi… mais c'est important de ne pas rester seul avec ça 💛",
        emotion: "reassuring",
        action: "escalade",
      },
      {
        triggers: ["quoi", "comment", "quoi faire", "faire quoi", "aide"],
        response: "Tu peux aller voir un adulte de confiance maintenant 💛 parent, professeur, ou quelqu'un que tu aimes bien",
        emotion: "reassuring",
        action: "support",
      },
      {
        triggers: ["ok", "oui", "d'accord", "je vais", "j'essaye"],
        response: "Je reste avec toi 💛 tu fais quelque chose de très important et très courageux",
        emotion: "reassuring",
      },
    ],
  },

  // 🌙 SCÉNARIO 5 — Peur nocturne (petits)
  {
    id: "peur_nuit",
    name: "Peur nocturne",
    entryTriggers: ["j'ai peur", "j'ai peur du noir", "j'ai peur la nuit", "j'ai peur dans le noir"],
    ageMin: 5, ageMax: 8,
    category: "peurs",
    steps: [
      {
        triggers: ["noir", "nuit", "chambre", "lit", "tout seul", "seul"],
        response: "Le noir peut faire peur 😔 mais tu es en sécurité ici 💛",
        emotion: "reassuring",
        action: "rassurer",
      },
      {
        triggers: ["oui", "ouais", "ok", "j'ai peur quand même"],
        response: "On imagine une lumière magique autour de toi ✨ une bulle dorée qui te protège !",
        emotion: "calm",
      },
      {
        triggers: ["oui", "ok", "cool", "j'aime bien", "d'accord"],
        response: "Parfait 😄 elle te protège toute la nuit 💛 tu veux que je te raconte une petite histoire douce pour dormir ?",
        emotion: "happy",
      },
      {
        triggers: ["oui", "histoire", "raconte"],
        response: "Il était une fois une petite étoile qui veillait sur un enfant courageux chaque nuit… ⭐💛",
        emotion: "calm",
      },
    ],
  },
];

// ─── Public API ─────────────────────────────────────────

export function isScenarioActive(): boolean {
  return activeScenario !== null;
}

export function getActiveScenarioId(): string | null {
  return activeScenario?.scenarioId ?? null;
}

export function resetScenario(): void {
  activeScenario = null;
}

/** Try to start a scenario based on user input. Returns the entry response or null. */
export function tryStartScenario(userInput: string, childAge: number): string | null {
  if (activeScenario) return null; // already in a scenario

  const normalized = normalizeInput(userInput);

  for (const scenario of SCENARIOS) {
    if (childAge < scenario.ageMin || childAge > scenario.ageMax) continue;

    const matches = scenario.entryTriggers.some(trigger => {
      const triggerNorm = trigger.toLowerCase();
      return normalized.includes(triggerNorm) || triggerNorm.includes(normalized);
    });

    if (matches) {
      activeScenario = {
        scenarioId: scenario.id,
        currentStep: 0,
        startedAt: Date.now(),
      };

      // Return the first step's expected bobby response from multi-response
      // The entry response is handled by the normal multi-response system
      // We just activate the scenario for follow-up
      setEmotionalState(scenario.steps[0]?.emotion ?? "neutral");
      console.log(`[Scenario] Started: ${scenario.name}`);
      return null; // let normal system handle entry, we handle follow-ups
    }
  }

  return null;
}

/** Handle a follow-up message within an active scenario */
export function handleScenarioStep(userInput: string): { text: string; emotion: string; intent: string } | null {
  if (!activeScenario) return null;

  const scenario = SCENARIOS.find(s => s.id === activeScenario!.scenarioId);
  if (!scenario) {
    activeScenario = null;
    return null;
  }

  const normalized = normalizeInput(userInput);
  const currentStep = activeScenario.currentStep;

  // Check if current step matches
  if (currentStep < scenario.steps.length) {
    const step = scenario.steps[currentStep];
    const matched = step.triggers.some(t => {
      const tNorm = t.toLowerCase();
      return normalized.includes(tNorm) || tNorm.includes(normalized) ||
        normalized.split(/\s+/).some(w => tNorm.split(/\s+/).includes(w));
    });

    if (matched) {
      activeScenario.currentStep++;
      recordResponse(step.response, scenario.category);
      updateEngagement(3);
      setEmotionalState(step.emotion);

      // End scenario if last step
      if (activeScenario.currentStep >= scenario.steps.length) {
        console.log(`[Scenario] Completed: ${scenario.name}`);
        activeScenario = null;
      }

      return {
        text: step.response,
        emotion: step.emotion,
        intent: scenario.category === "securite_critique" ? "BLOCKED" : "EMOTION_NEGATIVE",
      };
    }

    // Also check next steps in case child skips ahead
    for (let i = currentStep + 1; i < Math.min(currentStep + 3, scenario.steps.length); i++) {
      const futureStep = scenario.steps[i];
      const futureMatched = futureStep.triggers.some(t => {
        const tNorm = t.toLowerCase();
        return normalized.includes(tNorm) || tNorm.includes(normalized);
      });

      if (futureMatched) {
        activeScenario.currentStep = i + 1;
        recordResponse(futureStep.response, scenario.category);
        updateEngagement(3);
        setEmotionalState(futureStep.emotion);

        if (activeScenario.currentStep >= scenario.steps.length) {
          activeScenario = null;
        }

        return {
          text: futureStep.response,
          emotion: futureStep.emotion,
          intent: scenario.category === "securite_critique" ? "BLOCKED" : "EMOTION_NEGATIVE",
        };
      }
    }
  }

  // Timeout: if scenario is too old (>5 min), exit
  if (Date.now() - activeScenario.startedAt > 5 * 60 * 1000) {
    console.log(`[Scenario] Timed out: ${scenario.name}`);
    activeScenario = null;
    return null;
  }

  return null; // no match, let normal system handle
}
