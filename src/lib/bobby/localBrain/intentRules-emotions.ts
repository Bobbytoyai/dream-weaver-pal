import type { IntentRule } from "./types";

export const INTENT_RULES_EMOTIONS: IntentRule[] = [
  { intent: "PEUR", priority: 90, patterns: [
    /j'ai peur|fait peur|effrayé|terrifié|cauchemar|monstre|angoiss|j'ose pas|me fait peur/i,
    /peur du noir|peur de|peur quand|peur que|peur d'être puni|peur de mourir|peur de parler/i,
    /stressé|stress|anxieux|anxiété|inquiet/i,
  ]},
  { intent: "TRISTESSE", priority: 90, patterns: [
    /je suis triste|je pleure|pas bien|malheureux|je me sens mal|j'ai le cafard|personne m'aime/i,
    /triste|pleure|pleurer|chagrin/i,
  ]},
  { intent: "COLERE", priority: 90, patterns: [
    /en colère|énervé|fâché|j'en ai marre|ras le bol|c'est pas juste|déteste|agacé|rage/i,
  ]},
  { intent: "JOIE", priority: 85, patterns: [
    /content|heureux|heureuse|trop bien|génial|super !|youpi|yeah|hourra|je suis content/i,
  ]},
  { intent: "ENNUI", priority: 85, patterns: [
    /je m'ennuie|m'ennuie|rien à faire|c'est nul|bof|chiant|ennuie|sais pas quoi faire/i,
  ]},
  { intent: "HONTE", priority: 85, patterns: [
    /honte|ridicule|la honte|embarrass|j'ai fait une bêtise|tout le monde a ri|j'ai menti|j'ai triché/i,
  ]},
  { intent: "JALOUSIE", priority: 85, patterns: [
    /jaloux|jalouse|pourquoi pas moi|lui il a|elle elle a|c'est injuste/i,
  ]},
  { intent: "SURPRISE", priority: 80, patterns: [
    /vraiment\?|sérieux|c'est fou|impossible|dingue|incroyable|pas possible|wow|waouh/i,
  ]},
  { intent: "FIERTE", priority: 80, patterns: [
    /fier|fière|j'ai réussi|j'ai gagné|champion|regarde ce que|bien joué/i,
  ]},
  { intent: "AMOUR", priority: 80, patterns: [
    /je t'aime|t'adore|câlin|bisou|tu es mon ami|meilleur ami|aime bobby/i,
  ]},
  { intent: "AMOUREUX", priority: 82, patterns: [
    /amoureux|amoureuse|petite copine|petit copain|petite amie|petit ami|crush|je l'aime|lui dire que je l'aime|elle me plaît|il me plaît|je kiffe/i,
  ]},
  { intent: "TIMIDITE", priority: 80, patterns: [
    /timide|j'ose pas|gêné|rouge|devant tout le monde/i,
  ]},
  { intent: "CONFUSION", priority: 75, patterns: [
    /comprends pas|confus|perdu|rien compris|c'est bizarre|chelou/i,
  ]},
];
