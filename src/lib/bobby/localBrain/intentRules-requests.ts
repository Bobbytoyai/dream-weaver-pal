import type { IntentRule } from "./types";

export const INTENT_RULES_REQUESTS: IntentRule[] = [
  { intent: "HISTOIRE", priority: 78, patterns: [
    /raconte|histoire|conte|il était une fois|raconte-moi/i,
  ]},
  { intent: "JEU", priority: 78, patterns: [
    /on joue|jouons|un jeu|jouer à|jeu|partie/i,
  ]},
  { intent: "BLAGUE", priority: 78, patterns: [
    /blague|rigoler|drôle|marrant|farce|fais-moi rire/i,
  ]},
  { intent: "DEVINETTE", priority: 78, patterns: [
    /devinette|charade|quiz|question piège|tu sais quoi/i,
  ]},
  { intent: "AVENTURE", priority: 75, patterns: [
    /aventure|pirate|trésor|mission|super-héros|chevalier|magie|ninja/i,
  ]},
  { intent: "IMAGINATION", priority: 72, patterns: [
    /imagine|si on|et si|on invente|on crée|monde imaginaire|faire semblant|je peux voler|je peux être|devenir un dinosaure|parler aux animaux|battre le vent|invisible vraiment|créer un monde/i,
  ]},
  { intent: "QUESTION_ABSURDE", priority: 68, patterns: [
    /pourquoi les poules|pourquoi l'eau mouille|nuages.*coton|si je mange beaucoup|lune.*me suit|si je saute.*voler|si je cours.*vent/i,
  ]},
  { intent: "QUESTION_EXISTENTIELLE", priority: 66, patterns: [
    /pourquoi le temps passe|pourquoi j'ai des émotions|pourquoi on existe|c'est quoi la vie|pourquoi on meurt|pourquoi on respire|pourquoi on doit dormir/i,
  ]},
  { intent: "APPRENDRE", priority: 70, patterns: [
    /apprendre|c'est quoi|comment ça marche|explique|sais-tu|tu connais|pourquoi le ciel|pourquoi les poissons|je veux savoir tout/i,
  ]},
  { intent: "CHANSON", priority: 72, patterns: [
    /chanson|chante|chanter|fredonne|musique/i,
  ]},
];
