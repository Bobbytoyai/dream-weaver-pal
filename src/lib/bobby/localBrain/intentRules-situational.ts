import type { IntentRule } from "./types";

export const INTENT_RULES_SITUATIONAL: IntentRule[] = [
  { intent: "FATIGUE", priority: 76, patterns: [
    /fatigué|crevé|épuisé|plus d'énergie|trop fatigué|je suis fatigué/i,
  ]},
  { intent: "ECHEC", priority: 82, patterns: [
    /raté|échoué|perdu|loupé|j'ai raté|j'ai perdu|pas réussi|mauvaise note/i,
  ]},
  { intent: "OBJECTIF", priority: 72, patterns: [
    /je veux gagner|je veux réussir|mon objectif|je vais y arriver|je veux être le meilleur/i,
  ]},
  { intent: "SANTE", priority: 83, patterns: [
    /j'ai mal|mal au ventre|mal à la tête|mal aux dents|malade|vomi|fièvre|bobo|ça fait mal/i,
  ]},
  { intent: "PERTE", priority: 80, patterns: [
    /j'ai perdu mon|perdu ma|perdu mes|plus retrouver|disparu|cassé mon|cassé ma/i,
  ]},
  { intent: "REVE_AVENIR", priority: 72, patterns: [
    /je veux devenir|quand je serai grand|mon rêve c'est|plus tard je|j'aimerais être/i,
  ]},
  { intent: "ABANDON", priority: 84, patterns: [
    /je veux abandonner|j'abandonne|à quoi bon|laisser tomber|ça sert à rien|c'est foutu/i,
  ]},
  { intent: "EXCITATION", priority: 78, patterns: [
    /trop excité|j'ai hâte|vivement|impatient|je peux pas attendre|trop pressé/i,
  ]},
  { intent: "MENSONGE", priority: 82, patterns: [
    /j'ai menti|j'ai triché|j'ai pas dit la vérité|j'ai caché/i,
  ]},
  { intent: "STRESS", priority: 80, patterns: [
    /en retard|je suis en retard|pas le temps|dépêcher|vite|pressé.*école/i,
  ]},
  { intent: "RESISTANCE", priority: 71, patterns: [
    /pas envie d'aller|veux pas aller|pas envie.*école|veux pas faire mes devoirs|j'ai pas envie/i,
  ]},
  { intent: "PARTAGE_QUOTIDIEN", priority: 55, patterns: [
    /bonne journée|bien mangé|bien dormi|bien passé|fait un ami|j'ai passé|dessin animé/i,
  ]},
  { intent: "ENVIE", priority: 58, patterns: [
    /je veux regarder|je veux manger|je veux jouer dehors|je veux un|je veux des/i,
  ]},
  { intent: "ANXIETE", priority: 86, patterns: [
    /inquiet|inquiète|tracasse|angoisse|stressé pour demain|peur de demain|anxieux/i,
  ]},
  { intent: "PERFECTIONNISME", priority: 78, patterns: [
    /être parfait|tout bien faire|pas le droit à l'erreur|zéro faute|meilleur en tout/i,
  ]},
  { intent: "COMPARAISON", priority: 76, patterns: [
    /être comme|comme lui|comme elle|lui il est mieux|elle est mieux|pareil que/i,
  ]},
  { intent: "FATIGUE_EMOTIONNELLE", priority: 87, patterns: [
    /fatigué de tout|j'en peux plus|trop pour moi|épuisé mentalement|ça me pèse|trop lourd/i,
  ]},
  { intent: "RETRAIT", priority: 75, patterns: [
    /rester seul|je veux être seul|laissez-moi tranquille|foutez-moi la paix|envie de rien/i,
  ]},
  { intent: "PEUR_ABANDON", priority: 88, patterns: [
    /peur que personne m'aime|peur qu'on m'abandonne|peur que mes amis|abandonner|plus personne/i,
  ]},
  { intent: "PEUR_ECHEC", priority: 85, patterns: [
    /peur d'échouer|peur de rater|peur de recommencer|encore raté|j'ai encore raté/i,
  ]},
  { intent: "AVERSION", priority: 74, patterns: [
    /je déteste l'école|je déteste|j'aime pas l'école|l'école c'est nul|je hais/i,
  ]},
  { intent: "PEOPLE_PLEASING", priority: 77, patterns: [
    /faire plaisir à tout le monde|plaire à tout le monde|que tout le monde soit content/i,
  ]},
  { intent: "CURIOSITE", priority: 72, patterns: [
    /comment ça fonctionne|comment ça marche|je veux savoir|c'est quoi un|pourquoi le|pourquoi la/i,
  ]},
  { intent: "CREATION", priority: 73, patterns: [
    /je veux créer|je veux construire|je veux fabriquer|inventer|bricoler/i,
  ]},
  { intent: "IDENTITE_PEUR", priority: 83, patterns: [
    /peur d'être différent|pas comme les autres|bizarre|pas normal|je suis pas normal/i,
  ]},
  { intent: "MAUVAIS_COMPORTEMENT", priority: 81, patterns: [
    /cassé quelque chose exprès|j'ai tapé|j'ai poussé|j'ai crié sur|j'ai fait exprès/i,
  ]},
];
