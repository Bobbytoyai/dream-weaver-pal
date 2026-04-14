import type { IntentRule } from "./types";

export const INTENT_RULES_CONVERSATION: IntentRule[] = [
  { intent: "SALUT", priority: 95, patterns: [
    /^(salut|bonjour|coucou|hey|hello|yo|re)\b/i,
  ]},
  { intent: "AU_REVOIR", priority: 95, patterns: [
    /^(au revoir|bye|à plus|salut|à bientôt|adieu|bonne nuit)\b/i,
  ]},
  { intent: "OUI", priority: 60, patterns: [
    /^(oui|ouais|ok|d'accord|yep|yes|bien sûr|carrément|ouiiii)\s*!*$/i,
  ]},
  { intent: "NON", priority: 60, patterns: [
    /^(non|nan|nope|pas envie|je veux pas|non merci)\s*!*$/i,
  ]},
  { intent: "IDENTITE_ENFANT", priority: 92, patterns: [
    /comment je m'appelle|c'est quoi mon (pré)?nom|mon nom c'est quoi|tu connais mon (pré)?nom|tu sais comment je m'appelle|dis-moi mon nom/i,
    /quel est mon (pré)?nom|rappelle.?toi de mon nom/i,
  ]},
  { intent: "IDENTITE_BOBBY", priority: 85, patterns: [
    /qui es-tu|tu es qui|c'est quoi ton nom|comment tu t'appelles|t'es quoi|t'es un robot/i,
    /tu es [ée]ternel|tu vas mourir|tu meurs|t'es immortel|tu vis pour toujours|tu es vivant|t'es vivant|tu es r[ée]el|t'es r[ée]el/i,
    /et toi tu|moi je suis.*et toi/i,
  ]},
  { intent: "COMPLIMENT", priority: 75, patterns: [
    /t'es cool|t'es génial|tu es super|j'adore|t'es drôle|t'es le meilleur|je t'aime bien/i,
  ]},
  { intent: "QUESTION_COMPLEXE", priority: 50, patterns: [
    /pourquoi|comment|c'est quoi|qu'est-ce que|explique-moi/i,
  ]},
  { intent: "QUESTION_SIMPLE", priority: 45, patterns: [
    /\?$/,
  ]},
];
