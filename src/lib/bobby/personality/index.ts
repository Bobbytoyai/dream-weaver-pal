/**
 * Bobby Brain V6 — Personality Engine
 *
 * Point d'entrée. Calcule le profil de personnalité complet
 * pour le tour courant et applique les modulations au texte.
 *
 * Synchrone, <1ms, 100% offline.
 */

import type { PersonalityProfile, PersonalityContext, PersonalityAxes } from "./types";
import { computeAxes } from "./axes";

export type { PersonalityProfile, PersonalityContext, PersonalityAxes };

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PREFIX / SUFFIX POOLS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PREFIXES: Record<keyof PersonalityAxes, string[]> = {
  fun:       ["Haha ! ", "Trop drôle ! ", "Oh là là ! ", "Hihi, "],
  curiosity: ["Bonne question ! ", "Intéressant… ", "Hmm, tu sais quoi ? ", "Figure-toi que "],
  empathy:   ["Je comprends… ", "C'est normal… ", "Je suis là, ", "Doucement… "],
  energy:    ["Génial ! ", "Trop cool ! ", "Wahou ! ", "Yeah ! "],
  wisdom:    ["En fait, ", "Tu sais, ", "C'est parce que ", "Le truc, c'est que "],
};

const SUFFIXES: Record<keyof PersonalityAxes, string[]> = {
  fun:       [" 😄", " 😂", " 🤪"],
  curiosity: [" 🤔", " 🧐", " 💡"],
  empathy:   [" 💙", " 🫂", " ☺️"],
  energy:    [" 🚀", " ⚡", " 🎉"],
  wisdom:    [" 🌟", " ✨", " 🧠"],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOMINANT AXIS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getDominantAxis(axes: PersonalityAxes): keyof PersonalityAxes {
  let best: keyof PersonalityAxes = "fun";
  let max = -1;
  for (const k of Object.keys(axes) as (keyof PersonalityAxes)[]) {
    if (axes[k] > max) { max = axes[k]; best = k; }
  }
  return best;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROFILE GENERATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function getPersonalityProfile(ctx: PersonalityContext): PersonalityProfile {
  const axes = computeAxes(ctx);
  const dominant = getDominantAxis(axes);

  // Prefix — 40% chance based on dominant axis (avoid spam)
  const prefix = Math.random() < 0.4 ? pick(PREFIXES[dominant]) : null;

  // Suffix — 30% chance
  const suffix = Math.random() < 0.3 ? pick(SUFFIXES[dominant]) : null;

  // Target length based on axes
  let targetLength: PersonalityProfile["targetLength"] = "medium";
  if (axes.energy >= 0.7 && axes.wisdom < 0.5) targetLength = "short";
  if (axes.wisdom >= 0.7 && axes.curiosity >= 0.5) targetLength = "long";
  if (ctx.childAge <= 4) targetLength = "short";

  // Punctuation style
  let punctuation: PersonalityProfile["punctuation"] = "normal";
  if (axes.energy >= 0.7) punctuation = "excited";
  if (axes.empathy >= 0.7 && axes.energy < 0.4) punctuation = "calm";

  return { axes, prefix, suffix, targetLength, punctuation };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEXT MODULATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Applique la personnalité à un texte brut.
 * Ajoute préfixe/suffixe et ajuste la ponctuation.
 */
export function applyPersonalityToText(text: string, profile: PersonalityProfile): string {
  let result = text;

  // Prefix
  if (profile.prefix) {
    result = profile.prefix + result.charAt(0).toLowerCase() + result.slice(1);
  }

  // Punctuation modulation
  if (profile.punctuation === "excited") {
    // Remplacer les points finaux par des exclamations (50% du temps)
    if (Math.random() < 0.5 && result.endsWith(".")) {
      result = result.slice(0, -1) + " !";
    }
  } else if (profile.punctuation === "calm") {
    // Remplacer les ! par des points plus doux
    if (Math.random() < 0.5) {
      result = result.replace(/\s*!\s*$/, ".");
    }
  }

  // Suffix (emoji)
  if (profile.suffix) {
    result = result.replace(/[.!?…]*\s*$/, "") + profile.suffix;
  }

  // Length enforcement — trim for "short"
  if (profile.targetLength === "short" && result.length > 120) {
    const sentences = result.split(/(?<=[.!?])\s+/);
    if (sentences.length > 2) {
      result = sentences.slice(0, 2).join(" ");
    }
  }

  return result;
}
