/**
 * Bobby Brain V6 — Flow Engine
 *
 * Machine d'état pour les scénarios multi-tours.
 * Gère le déclenchement, l'avancement, les interruptions et la reprise.
 *
 * Synchrone, <1ms, 100% offline.
 */

import type { FlowState, FlowResult, FlowDefinition, FlowStep } from "./types";
import type { LocalIntent } from "../localBrain/types";
import { FLOW_REGISTRY } from "./scenarios";

export type { FlowResult, FlowState };

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let activeFlow: FlowState | null = null;
let pausedFlow: FlowState | null = null;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PUBLIC API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function isFlowActive(): boolean {
  return activeFlow !== null && activeFlow.status === "active";
}

export function getActiveFlow(): FlowState | null {
  return activeFlow;
}

export function resetFlows(): void {
  activeFlow = null;
  pausedFlow = null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FLOW MATCHING — find the best flow for an intent + text
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function detectFlowTrigger(
  intent: LocalIntent,
  userText: string,
  childAge: number,
): FlowDefinition | null {
  const lower = userText.toLowerCase();

  const candidates = FLOW_REGISTRY.filter((f) => {
    // Age check
    if (childAge < f.ageMin || childAge > f.ageMax) return false;

    // Intent match
    if (f.triggerIntents.includes(intent)) return true;

    // Keyword match
    if (f.triggerKeywords?.some((kw) => lower.includes(kw))) return true;

    return false;
  });

  if (candidates.length === 0) return null;

  // Sort by priority descending
  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// START FLOW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function startFlow(
  flow: FlowDefinition,
  childName: string,
  childAge: number,
): FlowResult {
  const firstStep = flow.steps[flow.startStep];
  if (!firstStep) {
    return { text: "", emotion: "curious", handled: false, flowEnded: false };
  }

  activeFlow = {
    flowId: flow.id,
    type: flow.type,
    status: "active",
    currentStepId: flow.startStep,
    stepHistory: [flow.startStep],
    turnCount: 0,
    startedAt: Date.now(),
    pausedAt: null,
    data: {},
  };

  const text = resolveStepText(firstStep, childName, childAge);
  console.log(`[Flow] 🎬 Started flow "${flow.name}" → step "${flow.startStep}"`);

  return {
    text,
    emotion: firstStep.emotion ?? "curious",
    handled: true,
    flowEnded: false,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADVANCE FLOW — process the child's response
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function advanceFlow(
  userText: string,
  intent: LocalIntent,
  childName: string,
  childAge: number,
): FlowResult {
  if (!activeFlow) {
    return { text: "", emotion: "curious", handled: false, flowEnded: false };
  }

  const flowDef = FLOW_REGISTRY.find((f) => f.id === activeFlow!.flowId);
  if (!flowDef) {
    endCurrentFlow();
    return { text: "", emotion: "curious", handled: false, flowEnded: true };
  }

  const currentStep = flowDef.steps[activeFlow.currentStepId];
  if (!currentStep) {
    endCurrentFlow();
    return { text: "", emotion: "curious", handled: false, flowEnded: true };
  }

  // ── CHECK INTERRUPTION ──
  // If the child drastically changes topic (unrelated intent), pause/break
  if (shouldInterrupt(intent, flowDef)) {
    return handleInterruption(intent, childName);
  }

  // ── DETERMINE NEXT STEP ──
  let nextStepId: string | null = null;

  // 1. Check branch by intent
  if (currentStep.branches && intent in currentStep.branches) {
    nextStepId = currentStep.branches[intent];
  }

  // 2. Check branch by keyword match in branches
  if (!nextStepId && currentStep.branches) {
    const lower = userText.toLowerCase();
    for (const [key, stepId] of Object.entries(currentStep.branches)) {
      if (lower.includes(key.toLowerCase())) {
        nextStepId = stepId;
        break;
      }
    }
  }

  // 3. Default next
  if (!nextStepId) {
    nextStepId = currentStep.next;
  }

  // No next step → flow is done
  if (!nextStepId) {
    return completeFlow(childName);
  }

  const nextStep = flowDef.steps[nextStepId];
  if (!nextStep) {
    return completeFlow(childName);
  }

  // Advance state
  activeFlow.currentStepId = nextStepId;
  activeFlow.stepHistory.push(nextStepId);
  activeFlow.turnCount++;

  const text = resolveStepText(nextStep, childName, childAge);
  console.log(`[Flow] ➡️ Advanced to step "${nextStepId}" (turn ${activeFlow.turnCount})`);

  if (nextStep.isEnd) {
    endCurrentFlow();
    return { text, emotion: nextStep.emotion ?? "happy", handled: true, flowEnded: true };
  }

  return { text, emotion: nextStep.emotion ?? "curious", handled: true, flowEnded: false };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTERRUPTION HANDLING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Intents that should always break any flow */
const BREAKING_INTENTS: LocalIntent[] = [
  "CONTENU_BLOQUE", "CRISE_SECURITE", "AU_REVOIR",
  "DODO", "FATIGUE",
];

/** Intents that are OK inside most flows (confirmations, etc.) */
const FLOW_COMPATIBLE_INTENTS: LocalIntent[] = [
  "OUI", "NON", "QUESTION_SIMPLE", "COMPLIMENT",
  "GENERAL", "QUESTION_COMPLEXE", "CURIOSITE",
];

function shouldInterrupt(intent: LocalIntent, flowDef: FlowDefinition): boolean {
  // Breaking intents always interrupt
  if (BREAKING_INTENTS.includes(intent)) return true;

  // Compatible intents never interrupt
  if (FLOW_COMPATIBLE_INTENTS.includes(intent)) return false;

  // Emotional flows are sticky — only break on explicit exit or safety
  if (flowDef.type === "emotional") return false;

  // For other flows, check if the intent is wildly different
  // (e.g., child asks for a story while in a quiz)
  const flowTriggers = flowDef.triggerIntents;
  const isRelated = flowTriggers.includes(intent);

  // If unrelated and we've been going for 3+ turns, allow interruption
  if (!isRelated && (activeFlow?.turnCount ?? 0) >= 2) return true;

  return false;
}

function handleInterruption(intent: LocalIntent, _childName: string): FlowResult {
  if (BREAKING_INTENTS.includes(intent)) {
    // Hard break — don't save for resume
    console.log(`[Flow] 🛑 Flow broken by ${intent}`);
    endCurrentFlow();
    return { text: "", emotion: "calm", handled: false, flowEnded: true };
  }

  // Soft break — pause for potential resume
  if (activeFlow) {
    pausedFlow = { ...activeFlow, status: "paused", pausedAt: Date.now() };
    console.log(`[Flow] ⏸️ Flow paused "${activeFlow.flowId}" by ${intent}`);
  }
  endCurrentFlow();

  return { text: "", emotion: "curious", handled: false, flowEnded: true };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RESUME
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Try to resume a paused flow.
 * Called when the child says "oui" or "on continue" after an interruption.
 * Returns null if nothing to resume.
 */
export function tryResumeFlow(
  childName: string,
  childAge: number,
): FlowResult | null {
  if (!pausedFlow) return null;

  // Only resume if paused less than 5 minutes ago
  const elapsed = Date.now() - (pausedFlow.pausedAt ?? 0);
  if (elapsed > 5 * 60 * 1000) {
    pausedFlow = null;
    return null;
  }

  const flowDef = FLOW_REGISTRY.find((f) => f.id === pausedFlow!.flowId);
  if (!flowDef) {
    pausedFlow = null;
    return null;
  }

  // Restore
  activeFlow = { ...pausedFlow, status: "active", pausedAt: null };
  pausedFlow = null;

  const currentStep = flowDef.steps[activeFlow.currentStepId];
  if (!currentStep) {
    endCurrentFlow();
    return null;
  }

  const text = `On reprend où on en était ! ${resolveStepText(currentStep, childName, childAge)}`;
  console.log(`[Flow] ▶️ Resumed flow "${flowDef.name}" at step "${activeFlow.currentStepId}"`);

  return { text, emotion: currentStep.emotion ?? "playful", handled: true, flowEnded: false };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function resolveStepText(step: FlowStep, childName: string, childAge: number): string {
  if (typeof step.bobbyText === "function") {
    return step.bobbyText(childName, childAge);
  }
  return step.bobbyText;
}

function completeFlow(_childName: string): FlowResult {
  const flowId = activeFlow?.flowId ?? "unknown";
  console.log(`[Flow] ✅ Flow "${flowId}" completed`);
  endCurrentFlow();

  const transitions = [
    "On fait quoi maintenant ? 😊",
    "C'était chouette ! Tu veux faire autre chose ?",
    "Super moment ! Qu'est-ce qui te ferait plaisir ?",
  ];

  return {
    text: transitions[Math.floor(Math.random() * transitions.length)],
    emotion: "happy",
    handled: true,
    flowEnded: true,
    transitionText: transitions[0],
  };
}

function endCurrentFlow(): void {
  activeFlow = null;
}
