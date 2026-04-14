import type { EmotionType, DetectedEmotion } from "./types";

const EMOTION_DETECT: { type: EmotionType; patterns: RegExp[]; base: number }[] = [
  { type: "fear", base: 3, patterns: [/peur|effrayé|terrifié|cauchemar|monstre|angoiss/i] },
  { type: "sadness", base: 3, patterns: [/triste|pleure|mal|seul|cafard|malheureux|personne/i] },
  { type: "anger", base: 3, patterns: [/colère|énervé|fâché|marre|déteste|rage|injuste/i] },
  { type: "joy", base: 3, patterns: [/content|heureux|génial|super|trop bien|youpi|yeah/i] },
  { type: "love", base: 3, patterns: [/t'aime|adore|câlin|bisou|ami/i] },
  { type: "curiosity", base: 2, patterns: [/pourquoi|comment|c'est quoi|explique|sais-tu/i] },
  { type: "pride", base: 3, patterns: [/fier|réussi|gagné|champion|bravo/i] },
  { type: "surprise", base: 3, patterns: [/vraiment|sérieux|fou|dingue|incroyable|wow/i] },
  { type: "calm", base: 2, patterns: [/calme|tranquille|dodo|bonne nuit|repose/i] },
  { type: "excitement", base: 4, patterns: [/hâte|vivement|impatient|en avant|trop cool/i] },
  { type: "boredom", base: 2, patterns: [/ennuie|rien à faire|nul|bof|chiant/i] },
  { type: "shame", base: 3, patterns: [/honte|ridicule|bêtise|embarrass/i] },
  { type: "jealousy", base: 3, patterns: [/jaloux|jalouse|pas juste|lui il a/i] },
  { type: "confusion", base: 2, patterns: [/comprends pas|confus|perdu|bizarre/i] },
  { type: "gratitude", base: 3, patterns: [/merci|remerci|gentil/i] },
  { type: "determination", base: 4, patterns: [/y arriver|je peux|capable|lâche pas/i] },
];

export function detectEmotion(text: string): DetectedEmotion {
  const lower = text.toLowerCase();
  
  for (const entry of EMOTION_DETECT) {
    if (entry.patterns.some(p => p.test(lower))) {
      // Intensity modifiers
      let intensity = entry.base;
      const excl = (text.match(/!/g) || []).length;
      if (excl >= 2) intensity++;
      if (/trop|très|vraiment|super|hyper|ultra|énormément/i.test(lower)) intensity++;
      if (/un peu|légèrement|petit peu/i.test(lower)) intensity--;
      return { type: entry.type, intensity: Math.max(1, Math.min(5, intensity)) };
    }
  }
  return { type: "neutral", intensity: 2 };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. TOPIC DETECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function detectTopic(text: string): string | null {
  const lower = text.toLowerCase();
  const topics: [string, RegExp][] = [
    ["animaux", /animal|chat|chien|lapin|dinosaure|dragon|ours|loup|poisson|oiseau|requin|dauphin/i],
    ["espace", /espace|fusée|astronaute|planète|étoile|lune|soleil|galaxie/i],
    ["nature", /forêt|montagne|mer|océan|fleur|arbre|rivière|plage/i],
    ["famille", /maman|papa|frère|sœur|famille|mamie|papi/i],
    ["école", /école|maîtresse|copain|copine|classe|récré|cantine/i],
    ["sport", /foot|sport|ballon|nager|vélo|basket|tennis|courir/i],
    ["nourriture", /manger|gâteau|chocolat|bonbon|pizza|cuisine|glace/i],
    ["art", /dessiner|dessin|peinture|couleur|bricolage|créer/i],
    ["musique", /musique|chanson|chanter|guitare|piano|danse/i],
    ["aventure", /aventure|pirate|trésor|chevalier|ninja|super-héros|magie/i],
    ["science", /science|expérience|robot|invention|pourquoi.*fonctionne/i],
    ["technologie", /jeu vidéo|console|minecraft|tablette|ordinateur/i],
  ];
  for (const [topic, pattern] of topics) {
    if (pattern.test(lower)) return topic;
  }
  return null;
}
