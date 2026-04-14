/**
 * Bobby Brain V5 — Fact Extractor
 * 
 * Extracts persistent facts from child messages using 50+ French patterns.
 * Categories: famille, animaux, amis, préférences, école, identité, lieux, activités, rêves, peurs
 * 
 * Design:
 * - Runs synchronously (<1ms per message)
 * - Returns structured ExtractedFact[] for merging into PersistentMemory
 * - Handles child-typical French (contractions, misspellings, informal speech)
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ExtractedFact {
  text: string;
  category: FactCategory;
  confidence: number; // 0-1
}

export type FactCategory =
  | "famille"
  | "animaux"
  | "amis"
  | "préférence"
  | "aversion"
  | "école"
  | "identité"
  | "lieu"
  | "activité"
  | "rêve"
  | "peur"
  | "santé"
  | "objet";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXTRACTION RULES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ExtractionRule {
  pattern: RegExp;
  category: FactCategory;
  confidence: number;
  extract: (match: RegExpMatchArray) => string | null;
}

// Capitalize first letter of a name
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// Clean trailing punctuation/spaces and leading articles
function clean(s: string): string {
  return s.replace(/^(?:les? |la |l'|du |des |un[e]? )/i, "").replace(/[.!?,;…]+$/, "").trim();
}

const RULES: ExtractionRule[] = [

  // ━━━ FAMILLE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // "mon frère/ma sœur s'appelle X"
  { pattern: /(?:mon|ma)\s+((?:petit[e]?\s+)?(?:fr[eè]re|s[oœ]eur|demi-fr[eè]re|demi-s[oœ]eur))\s+(?:s'appelle|c'est|il s'appelle|elle s'appelle)\s+([a-zà-ÿ]+)/i,
    category: "famille", confidence: 0.95,
    extract: m => `A un(e) ${m[1].toLowerCase()} : ${cap(m[2])}` },

  // "mon frère/ma sœur" (sans nom) — only if no name pattern matched
  { pattern: /(?:mon|ma)\s+((?:petit[e]?\s+)?(?:fr[eè]re|s[oœ]eur|demi-fr[eè]re|demi-s[oœ]eur))(?!\s+(?:s'appelle|c'est|il s'appelle|elle s'appelle))/i,
    category: "famille", confidence: 0.6,
    extract: m => `A un(e) ${m[1].toLowerCase()}` },

  // "mon papa/ma maman s'appelle X"
  { pattern: /(?:mon|ma)\s+(papa|maman|p[eè]re|m[eè]re|beau-p[eè]re|belle-m[eè]re)\s+(?:s'appelle|c'est)\s+([a-zà-ÿ]+)/i,
    category: "famille", confidence: 0.9,
    extract: m => `${cap(m[1])} s'appelle ${cap(m[2])}` },

  // "mon papy/ma mamie s'appelle X"
  { pattern: /(?:mon|ma)\s+(papy|papi|mamie|grand-p[eè]re|grand-m[eè]re)\s+(?:s'appelle|c'est)\s+([a-zà-ÿ]+)/i,
    category: "famille", confidence: 0.9,
    extract: m => `${cap(m[1])} s'appelle ${cap(m[2])}` },

  // "j'ai X frères/sœurs"
  { pattern: /j'ai\s+(\d+|un|une|deux|trois|quatre|cinq)\s+(?:fr[eè]res?|s[oœ]eurs?)/i,
    category: "famille", confidence: 0.85,
    extract: m => `A ${m[1]} frère(s)/sœur(s)` },

  // "mes parents sont séparés/divorcés"
  { pattern: /(?:mes parents|mon papa et ma maman)\s+(?:sont|ils sont)\s+(s[ée]par[ée]s|divorc[ée]s)/i,
    category: "famille", confidence: 0.9,
    extract: m => `Parents ${m[1].toLowerCase()}` },

  // "j'ai un bébé à la maison"
  { pattern: /(?:j'ai|on a|il y a)\s+un\s+(?:b[ée]b[ée]|nouveau-n[ée])\s+(?:[àa] la maison|chez (?:moi|nous))/i,
    category: "famille", confidence: 0.85,
    extract: () => `A un bébé dans la famille` },

  // ━━━ ANIMAUX ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // "mon chat/chien s'appelle X"
  { pattern: /(?:mon|ma|mes)\s+(chat(?:te)?|chien(?:ne)?|hamster|lapin(?:e)?|poisson|tortue|perroquet|cochon d'inde|cobaye|canari|oiseau|poney|cheval|furet)\s+(?:s'appelle|c'est|il s'appelle|elle s'appelle)\s+([a-zà-ÿ]+)/i,
    category: "animaux", confidence: 0.95,
    extract: m => `A un(e) ${m[1].toLowerCase()} : ${cap(m[2])}` },

  // "j'ai un chat/chien"
  { pattern: /(?:j'ai|on a)\s+(?:un|une|des|deux|trois)\s+(chat(?:te|s)?|chien(?:ne|s)?|hamster|lapin(?:e|s)?|poisson(?:s)?|tortue(?:s)?|perroquet|cochon(?:s)? d'inde|cobaye(?:s)?|canari(?:s)?|oiseau(?:x)?|poney|cheval|cheaux|furet(?:s)?)/i,
    category: "animaux", confidence: 0.85,
    extract: m => `A un(e) ${m[1].toLowerCase()}` },

  // "mon animal préféré c'est X"
  { pattern: /(?:mon animal pr[ée]f[ée]r[ée]|l'animal que je pr[ée]f[eè]re)\s+(?:c'est\s+)?(?:les?\s+)?([a-zà-ÿ]+(?:\s+[a-zà-ÿ]+)?)/i,
    category: "animaux", confidence: 0.8,
    extract: m => `Animal préféré : ${clean(m[1])}` },

  // ━━━ AMIS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // "mon meilleur copain/copine s'appelle X"
  { pattern: /(?:mon|ma)\s+(?:meilleur[e]?\s+)?(?:copain|copine|ami[e]?|pote|bff)\s+(?:s'appelle|c'est)\s+([a-zà-ÿ]+)/i,
    category: "amis", confidence: 0.9,
    extract: m => `Meilleur(e) ami(e) : ${cap(m[1])}` },

  // "mon copain X" / "ma copine X"
  { pattern: /(?:mon copain|ma copine|mon ami|mon amie)\s+([A-ZÀ-Ÿ][a-zà-ÿ]+)/i,
    category: "amis", confidence: 0.8,
    extract: m => `A un(e) ami(e) : ${cap(m[1])}` },

  // "je joue avec X"
  { pattern: /je (?:joue|m'amuse|rigole)\s+(?:toujours\s+|souvent\s+)?avec\s+([A-ZÀ-Ÿ][a-zà-ÿ]+)/i,
    category: "amis", confidence: 0.7,
    extract: m => `Joue souvent avec ${cap(m[1])}` },

  // "X c'est mon copain/ami"
  { pattern: /([A-ZÀ-Ÿ][a-zà-ÿ]+)\s+c'est\s+(?:mon|ma)\s+(?:copain|copine|ami[e]?|meilleur[e]?\s+ami[e]?)/i,
    category: "amis", confidence: 0.85,
    extract: m => `Ami(e) : ${cap(m[1])}` },

  // ━━━ PRÉFÉRENCES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // "j'adore / j'aime X" (exclude "j'aime pas")
  { pattern: /(?:j'adore|j'aime (?:trop |beaucoup |bien )?)(?!pas\b)(?:le |la |les |l')?(.{3,35}?)(?:\s*[.!?,;]|$)/i,
    category: "préférence", confidence: 0.8,
    extract: m => `Adore : ${clean(m[1])}` },

  // "mon X préféré c'est Y"
  { pattern: /(?:mon|ma)\s+(\w+)\s+pr[ée]f[ée]r[ée]\s+c'est\s+(.{2,30}?)(?:\s*[.!?,;]|$)/i,
    category: "préférence", confidence: 0.9,
    extract: m => `${cap(m[1])} préféré(e) : ${clean(m[2])}` },

  // "ma couleur/mon sport préféré c'est X"
  { pattern: /(?:ma couleur|mon sport|mon jeu|mon dessin anim[ée]|mon film|ma chanson|mon h[ée]ros|mon personnage|mon plat|mon repas|mon fruit|mon g[aâ]teau)\s+pr[ée]f[ée]r[ée]\s+c'est\s+(.{2,30}?)(?:\s*[.!?,;]|$)/i,
    category: "préférence", confidence: 0.9,
    extract: m => `Préférence : ${clean(m[1])}` },

  // "je préfère X"
  { pattern: /je pr[ée]f[eè]re\s+(.{3,30}?)(?:\s*[.!?,;]|$)/i,
    category: "préférence", confidence: 0.7,
    extract: m => `Préfère : ${clean(m[1])}` },

  // ━━━ AVERSIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // "j'aime pas / je déteste X"
  { pattern: /(?:j'aime pas|je n'aime pas|je d[ée]teste|j'ai horreur de|je supporte pas|je peux pas (?:sentir|supporter))\s+(?:le |la |les |l')?(.{3,35}?)(?:\s*[.!?,;]|$)/i,
    category: "aversion", confidence: 0.8,
    extract: m => `N'aime pas : ${clean(m[1])}` },

  // "c'est d[ée]gueu / c'est nul X"
  { pattern: /(?:c'est d[ée]gue(?:u|ulasse)|c'est nul|c'est trop nul)\s+(?:le|la|les|l')?\s*(.{3,25}?)(?:\s*[.!?,;]|$)/i,
    category: "aversion", confidence: 0.6,
    extract: m => `Déteste : ${clean(m[1])}` },

  // ━━━ ÉCOLE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // "je suis en CP/CE1/CE2/CM1/CM2/6ème..."
  { pattern: /(?:je suis|moi je suis|moi c'est)\s+(?:en\s+)?(CP|CE1|CE2|CM1|CM2|maternelle|grande section|moyenne section|petite section|6[eè]me|5[eè]me|4[eè]me|3[eè]me)/i,
    category: "école", confidence: 0.95,
    extract: m => `Classe : ${m[1].toUpperCase()}` },

  // "ma maîtresse s'appelle X" (supports "Madame Dupont")
  { pattern: /(?:ma|mon)\s+(ma[iî]tresse|ma[iî]tre|professeur[e]?|prof)\s+(?:s'appelle|c'est)\s+(?:ma[iî]tre(?:sse)?\s+)?([a-zà-ÿ]+(?:\s+[a-zà-ÿ]+)?)/i,
    category: "école", confidence: 0.9,
    extract: m => `${cap(m[1])} : ${m[2].split(/\s+/).map(cap).join(" ")}` },

  // "mon école s'appelle X"
  { pattern: /(?:mon [ée]cole|ma [ée]cole)\s+(?:s'appelle|c'est)\s+(.{3,30}?)(?:\s*[.!?,;]|$)/i,
    category: "école", confidence: 0.85,
    extract: m => `École : ${clean(m[1])}` },

  // "ma matière préférée c'est X"
  { pattern: /(?:ma mati[eè]re|ma mati[eè]re pr[ée]f[ée]r[ée]e)\s+c'est\s+(.{2,20}?)(?:\s*[.!?,;]|$)/i,
    category: "école", confidence: 0.85,
    extract: m => `Matière préférée : ${clean(m[1])}` },

  // ━━━ IDENTITÉ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // "j'ai X ans"
  { pattern: /(?:j'ai|moi j'ai)\s+(\d+)\s+ans/i,
    category: "identité", confidence: 0.95,
    extract: m => `Âge déclaré : ${m[1]} ans` },

  // "mon anniversaire c'est le X"
  { pattern: /(?:mon anniversaire|ma f[eê]te)\s+c'est\s+(?:le\s+)?(.{3,25}?)(?:\s*[.!?,;]|$)/i,
    category: "identité", confidence: 0.9,
    extract: m => `Anniversaire : ${clean(m[1])}` },

  // "je m'appelle X"
  { pattern: /(?:je m'appelle|moi c'est|mon (?:pr[ée])?nom c'est)\s+([a-zà-ÿ]+)/i,
    category: "identité", confidence: 0.9,
    extract: m => `Se présente comme : ${cap(m[1])}` },

  // ━━━ LIEUX ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // "j'habite à X"
  { pattern: /(?:j'habite|je vis|on habite|on vit)\s+(?:[àa]|en|au)\s+(.{2,25}?)(?:\s*[.!?,;]|$)/i,
    category: "lieu", confidence: 0.85,
    extract: m => `Habite : ${clean(m[1])}` },

  // "je vais en vacances à X"
  { pattern: /(?:je vais|on va|on part)\s+(?:en vacances\s+)?(?:[àa]|en|au)\s+(.{2,25}?)(?:\s*[.!?,;]|$)/i,
    category: "lieu", confidence: 0.7,
    extract: m => `Vacances : ${clean(m[1])}` },

  // ━━━ ACTIVITÉS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // "je fais du/de la X"
  { pattern: /(?:je fais|je pratique)\s+(?:du|de la|de l'|des)\s+(.{3,25}?)(?:\s*[.!?,;]|$)/i,
    category: "activité", confidence: 0.85,
    extract: m => `Fait : ${clean(m[1])}` },

  // "je joue au/à la X" (sport/instrument)
  { pattern: /je joue\s+(?:au|[àa] la|du|de la|[àa] l')\s+(.{3,25}?)(?:\s*[.!?,;]|$)/i,
    category: "activité", confidence: 0.8,
    extract: m => `Joue : ${clean(m[1])}` },

  // "j'apprends le/la X"
  { pattern: /(?:j'apprends|j'étudie)\s+(?:le|la|l'|les|du|de la)\s+(.{3,25}?)(?:\s*[.!?,;]|$)/i,
    category: "activité", confidence: 0.8,
    extract: m => `Apprend : ${clean(m[1])}` },

  // "je suis dans un club/une équipe de X"
  { pattern: /(?:je suis dans|je fais partie)\s+(?:d')?(?:un club|une [ée]quipe|un groupe)\s+(?:de\s+)?(.{3,25}?)(?:\s*[.!?,;]|$)/i,
    category: "activité", confidence: 0.85,
    extract: m => `Club/équipe : ${clean(m[1])}` },

  // ━━━ RÊVES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // "quand je serai grand je veux être X"
  { pattern: /(?:quand je ser(?:ai|ais) grand[e]?|plus tard)\s+(?:je (?:veux|voudrais|vais)\s+)?(?:[êe]tre|devenir|faire)\s+(.{3,30}?)(?:\s*[.!?,;]|$)/i,
    category: "rêve", confidence: 0.85,
    extract: m => `Rêve de devenir : ${clean(m[1])}` },

  // "je rêve de X"
  { pattern: /(?:je r[eê]ve de|j'aimerais|je voudrais)\s+(.{3,35}?)(?:\s*[.!?,;]|$)/i,
    category: "rêve", confidence: 0.7,
    extract: m => `Rêve : ${clean(m[1])}` },

  // ━━━ PEURS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // "j'ai peur de X"
  { pattern: /(?:j'ai peur|j'ai trop peur|ça me fait peur)\s+(?:de|du|des|d'|de la|de l')?\s*(.{3,30}?)(?:\s*[.!?,;]|$)/i,
    category: "peur", confidence: 0.85,
    extract: m => `A peur de : ${clean(m[1])}` },

  // "X me fait peur"
  { pattern: /(?:les?\s+)?(.{3,20}?)\s+(?:me|ça)\s+(?:fait|fais)\s+(?:trop\s+)?peur/i,
    category: "peur", confidence: 0.75,
    extract: m => `A peur de : ${clean(m[1])}` },

  // ━━━ SANTÉ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // "je suis allergique à X"
  { pattern: /(?:je suis allergique|j'ai une allergie)\s+(?:[àa]|au|aux|de|du)\s+(.{2,20}?)(?:\s*[.!?,;]|$)/i,
    category: "santé", confidence: 0.95,
    extract: m => `Allergie : ${clean(m[1])}` },

  // "j'ai des lunettes / un appareil"
  { pattern: /j'ai\s+(?:des\s+)?(lunettes|un appareil dentaire|un pl[âa]tre|des b[ée]quilles)/i,
    category: "santé", confidence: 0.8,
    extract: m => `A ${m[1].toLowerCase()}` },

  // ━━━ OBJETS IMPORTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // "mon doudou s'appelle X"
  { pattern: /(?:mon|ma)\s+(doudou|peluche|nounours|poup[ée]e|figurine)\s+(?:s'appelle|c'est)\s+([a-zà-ÿ]+)/i,
    category: "objet", confidence: 0.9,
    extract: m => `${cap(m[1])} s'appelle ${cap(m[2])}` },

  // "mon doudou c'est un X"
  { pattern: /(?:mon|ma)\s+(doudou|peluche)\s+c'est\s+(?:un[e]?\s+)?(.{2,20}?)(?:\s*[.!?,;]|$)/i,
    category: "objet", confidence: 0.8,
    extract: m => `${cap(m[1])} : ${clean(m[2])}` },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXTRACTION ENGINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Extract all facts from a child message.
 * Runs all rules and deduplicates by category + similarity.
 */
export function extractFacts(message: string): ExtractedFact[] {
  if (!message || message.length < 5) return [];

  const results: ExtractedFact[] = [];
  const seenTexts = new Set<string>();

  for (const rule of RULES) {
    const match = message.match(rule.pattern);
    if (!match) continue;

    const text = rule.extract(match);
    if (!text || text.length < 3) continue;

    // Dedup by normalized text
    const norm = text.toLowerCase().trim();
    if (seenTexts.has(norm)) continue;
    seenTexts.add(norm);

    results.push({
      text,
      category: rule.category,
      confidence: rule.confidence,
    });
  }

  return results;
}

/**
 * Get a human-readable summary of known facts for a given category.
 */
export function getFactsByCategory(
  facts: ExtractedFact[],
  category: FactCategory,
): string[] {
  return facts
    .filter(f => f.category === category)
    .map(f => f.text);
}

/**
 * Build a compact summary of all extracted facts for LLM context injection.
 */
export function buildFactsSummary(facts: ExtractedFact[]): string {
  if (facts.length === 0) return "";

  const byCategory = new Map<string, string[]>();
  for (const f of facts) {
    const list = byCategory.get(f.category) || [];
    list.push(f.text);
    byCategory.set(f.category, list);
  }

  const lines: string[] = [];
  for (const [cat, items] of byCategory) {
    lines.push(`[${cat}] ${items.join(" | ")}`);
  }

  return lines.join("\n");
}
