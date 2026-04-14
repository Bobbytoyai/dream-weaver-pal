import type { IntentRule } from "./types";

export const INTENT_RULES_SOCIAL: IntentRule[] = [
  { intent: "CONFLIT_FAMILLE", priority: 88, patterns: [
    /parents crient|papa crie|maman crie|disputé avec|frère m'énerve|sœur m'énerve|parents séparés|divorce/i,
    /punition|puni|grondé|engueulé|parents se disputent|parents se battent/i,
  ]},
  { intent: "CONFLIT_AMI", priority: 88, patterns: [
    /copain m'a (?!dit)|copine m'a (?!dit)|ami m'a|plus mon ami|disputé avec mon copain|il m'a tapé|elle m'a tapé/i,
    /mon ami ne veut plus|m'a insulté|moqué de moi/i,
  ]},
  { intent: "SOLITUDE", priority: 87, patterns: [
    /tout seul|toute seule|personne joue avec moi|pas d'amis|personne ne m'aime|seul/i,
  ]},
  { intent: "HARCELEMENT", priority: 95, patterns: [
    /on se moque|moquent de moi|embête|embêtent|harcel|méchant avec moi|tape|frappe|insulte/i,
  ]},
  { intent: "BESOIN_AFFECTION", priority: 82, patterns: [
    /câlin|calin|bisou|tu m'aimes|tu es là|reste avec moi|me sens seul/i,
  ]},
  { intent: "BESOIN_AIDE", priority: 82, patterns: [
    /aide-moi|besoin d'aide|je sais pas comment|tu peux m'aider|comment faire/i,
  ]},
  { intent: "MANQUE_CONFIANCE", priority: 85, patterns: [
    /je suis nul|nulle|j'y arrive pas|pas capable|pas bon|trop dur|j'arrive pas/i,
  ]},
  { intent: "GRATITUDE", priority: 75, patterns: [
    /merci|remerci|trop gentil|sympa|c'est gentil/i,
  ]},
];
