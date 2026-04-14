import type { IntentRule } from "./types";

export const INTENT_RULES_DAILY: IntentRule[] = [
  { intent: "ECOLE", priority: 70, patterns: [
    /école|maîtresse|maître|classe|récréation|récré|cantine|cartable|apprendre/i,
  ]},
  { intent: "DEVOIRS", priority: 72, patterns: [
    /devoirs|exercice|leçon|calcul|dictée|lire un livre|écrire|maths/i,
  ]},
  { intent: "NOURRITURE", priority: 68, patterns: [
    /manger|faim|goûter|gâteau|chocolat|bonbon|pizza|crêpe|cuisine|cuisiner|glace/i,
  ]},
  { intent: "DODO", priority: 75, patterns: [
    /dodo|dormir|fatigué|sommeil|bonne nuit|coucher|nuit|au lit/i,
  ]},
  { intent: "REVEILS", priority: 60, patterns: [
    /réveillé|lever|matin|bonjour|bien dormi/i,
  ]},
  { intent: "ANIMAUX_COMPAGNIE", priority: 70, patterns: [
    /mon chat|mon chien|mon lapin|mon hamster|mon poisson|animal de compagnie|mon animal/i,
  ]},
  { intent: "VACANCES", priority: 65, patterns: [
    /vacances|plage|mer|montagne|voyage|partir en|camping/i,
  ]},
  { intent: "ACTIVITE", priority: 60, patterns: [
    /foot|football|sport|danse|musique|piscine|vélo|dessin|peinture|guitare|piano/i,
  ]},
];
