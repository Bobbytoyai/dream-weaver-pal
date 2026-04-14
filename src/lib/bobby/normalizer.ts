/**
 * Bobby Brain V6 — Child Language Normalizer
 *
 * Normalise le langage typique des enfants francophones (3-12 ans) :
 * - Contractions phonétiques (200+)
 * - Fautes de prononciation courantes
 * - Écriture SMS/phonétique
 * - Onomatopées et tics de langage
 * - Mots familiers → français standard
 *
 * Synchrone, <1ms, 100% offline.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PHONETIC CONTRACTIONS (grouped by pattern type)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** [pattern, replacement] — applied in order, case-insensitive */
const CONTRACTIONS: Array<[RegExp, string]> = [

  // ── Pronoms / sujets contractés ──────────────────────────
  [/\bchui(?:s)?\b/gi, "je suis"],
  [/\bchuis\b/gi, "je suis"],
  [/\bchu\b/gi, "je suis"],
  [/\bj'sui(?:s)?\b/gi, "je suis"],
  [/\bjsuis\b/gi, "je suis"],
  [/\bjsui\b/gi, "je suis"],
  [/\bj'ai\b/gi, "j'ai"],
  [/\bjé\b/gi, "j'ai"],
  [/\bjai\b/gi, "j'ai"],
  [/\bj ai\b/gi, "j'ai"],
  [/\bjveu(?:x)?\b/gi, "je veux"],
  [/\bjvé\b/gi, "je vais"],
  [/\bjve\b/gi, "je vais"],
  [/\bjpeu(?:x)?\b/gi, "je peux"],
  [/\bjpe\b/gi, "je peux"],
  [/\bjsai(?:s)?\b/gi, "je sais"],
  [/\bjsé\b/gi, "je sais"],
  [/\bjcroi(?:s)?\b/gi, "je crois"],
  [/\bjcomprend(?:s)?\b/gi, "je comprends"],
  [/\bjconnai(?:s)?\b/gi, "je connais"],
  [/\bjfai(?:s)?\b/gi, "je fais"],
  [/\bjdi(?:s)?\b/gi, "je dis"],
  [/\bjdor(?:s)?\b/gi, "je dors"],
  [/\bjmange\b/gi, "je mange"],
  [/\bjvoi(?:s)?\b/gi, "je vois"],
  [/\bjmen(?:s)?\b/gi, "je mens"],
  [/\bjpensse?\b/gi, "je pense"],
  [/\bjpense\b/gi, "je pense"],
  [/\bjparle\b/gi, "je parle"],
  [/\bjriguole?\b/gi, "je rigole"],
  [/\bjvien(?:s)?\b/gi, "je viens"],
  [/\bjme\b/gi, "je me"],
  [/\bjte\b/gi, "je te"],
  [/\bjle\b/gi, "je le"],
  [/\bjla\b/gi, "je la"],
  [/\bta\s+(?=pas\b)/gi, "tu n'as "],
  [/\bté\b/gi, "tu es"],
  [/\btè\b/gi, "tu es"],
  [/\bta\b(?=\s+(?:vu|dit|fait|mangé|pris|mis|lu|bu|eu|été|dormi|compris|entendu))/gi, "tu as"],
  [/\btki\b/gi, "tu es qui"],
  [/\bil(?:s)?\s+(?:y\s+)?a\b/gi, "il y a"],
  [/\bya\b/gi, "il y a"],
  [/\by'a\b/gi, "il y a"],

  // ── Négations familières ──────────────────────────────────
  [/\bchais\s+pas\b/gi, "je ne sais pas"],
  [/\bjsais?\s+pas\b/gi, "je ne sais pas"],
  [/\bjsé\s+pas\b/gi, "je ne sais pas"],
  [/\bsais?\s+pas\b/gi, "je ne sais pas"],
  [/\bsé\s+pas\b/gi, "je ne sais pas"],
  [/\bj'sais?\s+pas\b/gi, "je ne sais pas"],
  [/\bchépa\b/gi, "je ne sais pas"],
  [/\bchepas?\b/gi, "je ne sais pas"],
  [/\bchpa\b/gi, "je ne sais pas"],
  [/\bjveu(?:x)?\s+pas\b/gi, "je ne veux pas"],
  [/\bjpeu(?:x)?\s+pas\b/gi, "je ne peux pas"],
  [/\bjcomprends?\s+pas\b/gi, "je ne comprends pas"],
  [/\bc'est?\s+pas\b/gi, "ce n'est pas"],
  [/\bcé\s+pas\b/gi, "ce n'est pas"],
  [/\bjamé\b/gi, "jamais"],

  // ── Contractions courantes ────────────────────────────────
  [/\bt'as\b/gi, "tu as"],
  [/\bt'es\b/gi, "tu es"],
  [/\bt'a\b/gi, "tu as"],
  [/\bqui\s+c'est\b/gi, "qui est-ce"],
  [/\bc'est\s+quoi\b/gi, "qu'est-ce que c'est"],
  [/\bc quoi\b/gi, "qu'est-ce que c'est"],
  [/\bcé\s+quoi\b/gi, "qu'est-ce que c'est"],
  [/\bckoi\b/gi, "qu'est-ce que c'est"],
  [/\bc ki\b/gi, "c'est qui"],
  [/\bcki\b/gi, "c'est qui"],
  [/\bpourquoi\s+(?:c'est|cé)\b/gi, "pourquoi est-ce"],
  [/\bpkoi\b/gi, "pourquoi"],
  [/\bpourquoi?\b/gi, "pourquoi"],
  [/\bpq\b/gi, "pourquoi"],
  [/\bkoi\b/gi, "quoi"],
  [/\bkoi(?:que)?\b/gi, "quoi"],
  [/\bkomen?\b/gi, "comment"],
  [/\bkoman\b/gi, "comment"],
  [/\bcomment?\b/gi, "comment"],

  // ── Écriture SMS / phonétique ─────────────────────────────
  [/\bslt\b/gi, "salut"],
  [/\bcc\b/gi, "coucou"],
  [/\bbbr\b/gi, "bisou"],
  [/\bbiz(?:ou)?(?:x|s)?\b/gi, "bisou"],
  [/\btkt\b/gi, "ne t'inquiète pas"],
  [/\bmdr\b/gi, "mort de rire"],
  [/\blol\b/gi, "mort de rire"],
  [/\bptdr\b/gi, "mort de rire"],
  [/\bxptdr\b/gi, "mort de rire"],
  [/\bsvp\b/gi, "s'il vous plaît"],
  [/\bstp\b/gi, "s'il te plaît"],
  [/\bstplé\b/gi, "s'il te plaît"],
  [/\bstpl[eè]\b/gi, "s'il te plaît"],
  [/\bdsl\b/gi, "désolé"],
  [/\bjpp\b/gi, "j'en peux plus"],
  [/\bjsp\b/gi, "je ne sais pas"],
  [/\bjtm\b/gi, "je t'aime"],
  [/\bjtd\b/gi, "je t'adore"],
  [/\bàp?\b/gi, "à plus"],
  [/\ba\+\b/gi, "à plus"],
  [/\baje\b/gi, "à je"],
  [/\bbn\b/gi, "bonne nuit"],
  [/\bbsr\b/gi, "bonsoir"],
  [/\bbjr\b/gi, "bonjour"],
  [/\bre\b/gi, "rebonjour"],
  [/\boui+\b/gi, "oui"],
  [/\bwi+\b/gi, "oui"],
  [/\bwé\b/gi, "oui"],
  [/\bouai(?:s|p)?\b/gi, "oui"],
  [/\bouep\b/gi, "oui"],
  [/\byep?\b/gi, "oui"],
  [/\bnan+\b/gi, "non"],
  [/\bnon+\b/gi, "non"],
  [/\bnope?\b/gi, "non"],
  [/\bvo\b/gi, "vaut"],
  [/\bbo\b/gi, "beau"],
  [/\btro\b/gi, "trop"],
  [/\btt\b/gi, "tout"],
  [/\bbc(?:p|oup)\b/gi, "beaucoup"],
  [/\bbcp\b/gi, "beaucoup"],
  [/\bboku\b/gi, "beaucoup"],
  [/\bpb\b/gi, "problème"],
  [/\bpblm\b/gi, "problème"],

  // ── Fautes de prononciation enfant (3-6 ans) ──────────────
  [/\bsuis\s+tanné\b/gi, "j'en ai marre"],
  [/\bsussi\b/gi, "aussi"],
  [/\baussite?\b/gi, "aussi"],
  [/\bzozio\b/gi, "oiseau"],
  [/\bzoiseau\b/gi, "oiseau"],
  [/\bcocolat\b/gi, "chocolat"],
  [/\bsocolat\b/gi, "chocolat"],
  [/\bchocolate?\b/gi, "chocolat"],
  [/\bnounours\b/gi, "ours en peluche"],
  [/\btoutou\b/gi, "chien"],
  [/\bminou\b/gi, "chat"],
  [/\bpapillon\b/gi, "papillon"],
  [/\bdodo\b/gi, "dormir"],
  [/\bfaire\s+dodo\b/gi, "dormir"],
  [/\bbobo\b/gi, "mal"],
  [/\baïe\b/gi, "j'ai mal"],
  [/\baieeee?\b/gi, "j'ai mal"],
  [/\bpipi\b/gi, "aller aux toilettes"],
  [/\bcaca\b/gi, "aller aux toilettes"],
  [/\bprout\b/gi, "pet"],
  [/\bguili\b/gi, "chatouille"],
  [/\bguiguili\b/gi, "chatouille"],
  [/\bnana\b/gi, "banane"],
  [/\btata\b/gi, "tante"],
  [/\btonton\b/gi, "oncle"],
  [/\bmamie\b/gi, "grand-mère"],
  [/\bpapi\b/gi, "grand-père"],
  [/\bpapy\b/gi, "grand-père"],
  [/\bcâlin\b/gi, "câlin"],
  [/\bzizi\b/gi, "parties intimes"],
  [/\bnéné\b/gi, "sein"],
  [/\bbiberon\b/gi, "biberon"],
  [/\btetine?\b/gi, "tétine"],
  [/\btoutou\b/gi, "chien"],
  [/\bwaou+h?\b/gi, "wow"],
  [/\bwow+\b/gi, "wow"],
  [/\byoupie?\b/gi, "youpi"],
  [/\bhourra+\b/gi, "hourra"],

  // ── Élisions manquées ─────────────────────────────────────
  [/\bje ai\b/gi, "j'ai"],
  [/\bje est\b/gi, "j'est"],
  [/\bje aime\b/gi, "j'aime"],
  [/\bje adore\b/gi, "j'adore"],
  [/\bje arrive\b/gi, "j'arrive"],
  [/\bje entends?\b/gi, "j'entends"],
  [/\bje habite\b/gi, "j'habite"],
  [/\bje écoute\b/gi, "j'écoute"],
  [/\bde le\b/gi, "du"],
  [/\bde les\b/gi, "des"],
  [/\bà le\b/gi, "au"],
  [/\bà les\b/gi, "aux"],
  [/\bsi il\b/gi, "s'il"],

  // ── Mots familiers / argot enfant → standard ──────────────
  [/\bkif(?:f)?(?:er)?\b/gi, "aimer"],
  [/\bkiff?e?\b/gi, "aime"],
  [/\bflipp?(?:er|é)?\b/gi, "avoir peur"],
  [/\bgalér(?:er|é)?\b/gi, "avoir du mal"],
  [/\bch(?:i)?ant(?:e)?\b/gi, "ennuyeux"],
  [/\bouf\b/gi, "fou"],
  [/\brelou\b/gi, "lourd"],
  [/\bbail(?:ler)?\b/gi, "truc"],
  [/\bfrère\b(?!\s+(?:s'appelle|c'est))/gi, "ami"],
  [/\bgros\b(?=\s*[,!?.])/gi, "ami"],
  [/\bpoto\b/gi, "ami"],
  [/\bmeuf\b/gi, "fille"],
  [/\bmec\b/gi, "garçon"],
  [/\bgoss?e?\b/gi, "enfant"],
  [/\bflemmard(?:e)?\b/gi, "paresseux"],
  [/\bflemm?e\b/gi, "pas envie"],
  [/\bgav[ée]r?\b/gi, "énerver"],
  [/\bsoulé?\b/gi, "ennuyé"],
  [/\bsa[oû]l(?:é|er)?\b/gi, "ennuyé"],
  [/\bgênant(?:e)?\b/gi, "embarrassant"],
  [/\bchelou\b/gi, "bizarre"],
  [/\bbizarre?\b/gi, "bizarre"],
  [/\bstylé(?:e)?\b/gi, "beau"],
  [/\bswag\b/gi, "style"],
  [/\bcool\b/gi, "super"],
  [/\btrop\s+bien\b/gi, "très bien"],
  [/\bgrave\b(?=\s+(?:bien|cool|beau|drôle|bon))/gi, "très"],
  [/\btrop\s+(?:de\s+)?la\s+balle\b/gi, "génial"],
  [/\bde\s+ouf\b/gi, "incroyable"],
  [/\ben\s+mode\b/gi, "comme"],

  // ── Verbes mal conjugués (enfant) ─────────────────────────
  [/\bje\s+(?:va|vas)\b/gi, "je vais"],
  [/\bje\s+(?:peut)\b/gi, "je peux"],
  [/\bje\s+(?:veut)\b/gi, "je veux"],
  [/\bje\s+(?:sait)\b/gi, "je sais"],
  [/\bje\s+(?:fait)\b/gi, "je fais"],
  [/\bje\s+(?:dit)\b/gi, "je dis"],
  [/\bje\s+(?:voit)\b/gi, "je vois"],
  [/\bje\s+(?:croit)\b/gi, "je crois"],
  [/\bje\s+(?:prend)\b/gi, "je prends"],
  [/\bje\s+(?:comprend)\b/gi, "je comprends"],
  [/\bils?\s+(?:va)\b/gi, "il va"],
  [/\bils?\s+(?:fait)\b/gi, "il fait"],
  [/\bils?\s+(?:peut)\b/gi, "il peut"],

  // ── Onomatopées → intention ───────────────────────────────
  [/\bpff+t?\b/gi, "pfff"],
  [/\bbah\b/gi, "eh bien"],
  [/\bbeuh?\b/gi, "beurk"],
  [/\beurk\b/gi, "beurk"],
  [/\bberk\b/gi, "beurk"],
  [/\bblah?\b/gi, "blabla"],
  [/\bhmm+\b/gi, "hmm"],
  [/\beuh+\b/gi, "euh"],
  [/\bhein\b/gi, "hein"],
  [/\boh+\b/gi, "oh"],
  [/\bah+\b/gi, "ah"],
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WHITESPACE & PUNCTUATION CLEANUP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function cleanWhitespace(text: string): string {
  return text
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.!?,;:])/g, "$1")
    .replace(/([.!?,;:])\s*([a-zA-ZÀ-ÿ])/g, "$1 $2")
    .trim();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REPEATED CHARACTERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** "ouiiiii" → "oui", "nonnnnn" → "non", "merciiii" → "merci" */
function collapseRepeatedChars(text: string): string {
  return text.replace(/(.)\1{2,}/g, "$1$1");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CAPS NORMALIZATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** ALL CAPS → lowercase (preserve single-word proper nouns) */
function normalizeCaps(text: string): string {
  // If more than 60% is uppercase → lowercase everything
  const letters = text.replace(/[^a-zA-ZÀ-ÿ]/g, "");
  const upper = letters.replace(/[^A-ZÀ-Ÿ]/g, "");
  if (letters.length > 3 && upper.length / letters.length > 0.6) {
    return text.toLowerCase();
  }
  return text;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PUBLIC API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Normalize child speech to standard French.
 * Pipeline: caps → collapse → contractions → whitespace.
 * Synchronous, <1ms.
 */
export function normalizeChildSpeech(text: string): string {
  if (!text || text.length < 2) return text;

  let result = text;

  // Step 1: Normalize caps
  result = normalizeCaps(result);

  // Step 2: Collapse repeated characters
  result = collapseRepeatedChars(result);

  // Step 3: Apply phonetic contractions
  for (const [pattern, replacement] of CONTRACTIONS) {
    result = result.replace(pattern, replacement);
  }

  // Step 4: Clean whitespace
  result = cleanWhitespace(result);

  return result;
}

/**
 * Light normalization — only collapse chars and fix obvious contractions.
 * Use when you want to preserve the child's original tone.
 */
export function normalizeLight(text: string): string {
  if (!text || text.length < 2) return text;
  let result = normalizeCaps(text);
  result = collapseRepeatedChars(result);
  return cleanWhitespace(result);
}

/** Get the contraction count for debugging/stats */
export function getContractionCount(): number {
  return CONTRACTIONS.length;
}
