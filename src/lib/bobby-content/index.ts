/**
 * Bobby AI — Content Library Index v1.0
 * Point d'entrée unique pour toute la bibliothèque de contenu Bobby.
 *
 * Structure:
 *   bibliotheque.ts  — aggregateur central (histoires + blagues + contenu)
 *   histoires.ts     — bibliothèque d'histoires structurées par thème/âge
 *   blagues.ts       — 300+ blagues adaptées 5-12 ans
 *   contenu.ts       — catégories, règles parentales, règles par âge
 *   cerveau.ts       — personnalité, réactions, phrases Bobby
 */

// Bibliothèque centrale
export { getBlaguesByAge, getRandomBlague, getBibliothequeStats } from "./bibliotheque";

// Histoires
export { HISTOIRES, getHistoiresByAge, getRandomHistoire } from "./histoires";
export type { Histoire } from "./histoires";

// Blagues
export { BLAGUES, formatBlagueForTTS } from "./blagues";
export type { Blague } from "./blagues";

// Contenu & Système parental
export {
  CONTENU_CATEGORIES,
  DEFAULT_PARENTAL_PROFILE,
  AGE_RULES,
  getAgeRules,
} from "./contenu";
export type { ContentCategory, ParentalProfile, AgeRules } from "./contenu";

// Cerveau Bobby
export {
  BOBBY_PERSONALITY,
  BOBBY_NATURAL_REACTIONS,
  SILENCE_RELAUNCHES,
  WELCOME_PHRASES,
  FAREWELL_PHRASES,
} from "./cerveau";
