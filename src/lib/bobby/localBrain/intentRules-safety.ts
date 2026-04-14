import type { IntentRule } from "./types";

export const INTENT_RULES_SAFETY: IntentRule[] = [
  { intent: "DEMANDE_LANGUE", priority: 110, patterns: [
    /speak english|parle anglais|parle en anglais|talk english|in english|en anglais|speak french|parle espagnol|speak spanish|habla español/i,
    /tu parles anglais|tu sais parler anglais|dis.+en anglais|mot.+anglais|apprends.+anglais/i,
  ]},
  { intent: "CRISE_SECURITE", priority: 105, patterns: [
    /je veux mourir|je veux disparaître|veux plus vivre|veux pas exister|à quoi ça sert de vivre/i,
    /je déteste ma vie|ma vie est nulle|je sers à rien|personne ne m'aime/i,
  ]},
  { intent: "CONTENU_BLOQUE", priority: 100, patterns: [
    /tuer|suicide|sang|violence|sexe|drogue|arme|fusil|bombe|pistolet/i,
  ]},
];
