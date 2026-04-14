/**
 * Bobby Brain V6 — Personality Axes Computation
 *
 * Calcule les 5 axes dynamiques en fonction du contexte.
 * Entièrement synchrone, <0.5ms.
 */

import type { PersonalityAxes, PersonalityContext } from "./types";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BASE PROFILES (par personnalité parent)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const BASE_PROFILES: Record<string, PersonalityAxes> = {
  balanced:    { fun: 0.6, curiosity: 0.6, empathy: 0.6, energy: 0.6, wisdom: 0.5 },
  calm:        { fun: 0.4, curiosity: 0.5, empathy: 0.8, energy: 0.3, wisdom: 0.6 },
  energetic:   { fun: 0.8, curiosity: 0.6, empathy: 0.5, energy: 0.9, wisdom: 0.3 },
  educational: { fun: 0.4, curiosity: 0.8, empathy: 0.5, energy: 0.5, wisdom: 0.8 },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MODIFIERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function applyAgeModifiers(axes: PersonalityAxes, age: number): void {
  if (age <= 4) {
    // Tout-petits : plus fun, plus énergie, moins sagesse
    axes.fun = Math.min(1, axes.fun + 0.15);
    axes.energy = Math.min(1, axes.energy + 0.1);
    axes.wisdom = Math.max(0, axes.wisdom - 0.2);
    axes.curiosity = Math.max(0, axes.curiosity - 0.1);
  } else if (age <= 6) {
    axes.fun = Math.min(1, axes.fun + 0.1);
    axes.energy = Math.min(1, axes.energy + 0.05);
  } else if (age >= 9) {
    // Grands : plus de profondeur, curiosité, moins d'énergie brute
    axes.wisdom = Math.min(1, axes.wisdom + 0.15);
    axes.curiosity = Math.min(1, axes.curiosity + 0.1);
    axes.energy = Math.max(0, axes.energy - 0.1);
    axes.fun = Math.max(0, axes.fun - 0.05);
  }
}

function applyEmotionModifiers(axes: PersonalityAxes, emotionType: string, intensity: number): void {
  const negativeEmotions = ["sadness", "fear", "anger", "shame", "frustration"];
  if (negativeEmotions.includes(emotionType) && intensity >= 3) {
    // Émotion négative forte → empathie max, énergie basse
    axes.empathy = Math.min(1, axes.empathy + 0.3);
    axes.energy = Math.max(0, axes.energy - 0.3);
    axes.fun = Math.max(0, axes.fun - 0.2);
    axes.wisdom = Math.max(0, axes.wisdom - 0.1);
  } else if (emotionType === "joy" && intensity >= 3) {
    axes.fun = Math.min(1, axes.fun + 0.15);
    axes.energy = Math.min(1, axes.energy + 0.15);
  } else if (emotionType === "curiosity") {
    axes.curiosity = Math.min(1, axes.curiosity + 0.2);
    axes.wisdom = Math.min(1, axes.wisdom + 0.1);
  } else if (emotionType === "boredom") {
    axes.energy = Math.min(1, axes.energy + 0.2);
    axes.fun = Math.min(1, axes.fun + 0.2);
    axes.curiosity = Math.min(1, axes.curiosity + 0.1);
  }
}

function applyTimeModifiers(axes: PersonalityAxes, hour: number): void {
  if (hour >= 20 || hour <= 6) {
    // Soir/nuit → calme
    axes.energy = Math.max(0, axes.energy - 0.25);
    axes.fun = Math.max(0, axes.fun - 0.1);
    axes.empathy = Math.min(1, axes.empathy + 0.1);
  } else if (hour >= 7 && hour <= 9) {
    // Matin → doux démarrage
    axes.energy = Math.max(0, axes.energy - 0.1);
  }
}

function applySessionModifiers(axes: PersonalityAxes, mood: string, turnCount: number): void {
  if (mood === "negative") {
    axes.empathy = Math.min(1, axes.empathy + 0.15);
    axes.energy = Math.max(0, axes.energy - 0.15);
  } else if (mood === "positive") {
    axes.fun = Math.min(1, axes.fun + 0.1);
    axes.energy = Math.min(1, axes.energy + 0.05);
  }

  // Fatigue de session : après 20 tours, devenir plus calme
  if (turnCount > 20) {
    axes.energy = Math.max(0, axes.energy - 0.15);
    axes.fun = Math.max(0, axes.fun - 0.05);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PUBLIC
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function computeAxes(ctx: PersonalityContext): PersonalityAxes {
  const base = BASE_PROFILES[ctx.parentPersonality] ?? BASE_PROFILES.balanced;
  const axes: PersonalityAxes = { ...base };

  applyAgeModifiers(axes, ctx.childAge);
  applyEmotionModifiers(axes, ctx.emotionType, ctx.emotionIntensity);
  applyTimeModifiers(axes, ctx.hour);
  applySessionModifiers(axes, ctx.sessionMood, ctx.turnCount);

  // Clamp all axes 0–1
  for (const k of Object.keys(axes) as (keyof PersonalityAxes)[]) {
    axes[k] = Math.max(0, Math.min(1, Math.round(axes[k] * 100) / 100));
  }

  return axes;
}
