/**
 * Intent detection, safety filter, and text normalization for offline engine.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INPUT NORMALIZATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function normalizeInput(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[!?.…,;:"""«»()[\]{}]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SYNONYM MAP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SYNONYMS: Record<string, string[]> = {
  jouer: ["joue", "jouons", "jeu", "amuser", "amusons", "s'amuser"],
  histoire: ["conte", "récit", "fable", "narration", "raconte", "raconter"],
  peur: ["effrayé", "terrifié", "angoissé", "anxieux", "inquiet"],
  triste: ["malheureux", "pas bien", "mal", "déprimé", "chagrin"],
  content: ["heureux", "joyeux", "ravi", "super", "génial", "bien"],
  fatigué: ["crevé", "épuisé", "sommeil", "dormir", "dodo"],
  aide: ["aider", "aidez", "aide-moi", "au secours", "help"],
  arrêter: ["stop", "arrête", "fini", "terminé", "assez"],
  continuer: ["continue", "encore", "suite", "reprends", "reprendre"],
  bonjour: ["salut", "coucou", "hello", "hey", "yo", "bonsoir"],
  merci: ["remercie", "merci beaucoup", "thanks"],
  oui: ["ouais", "ok", "d'accord", "yep", "yes", "bien sûr", "évidemment"],
  non: ["nan", "nope", "jamais", "pas du tout"],
  vite: ["rapide", "rapidement", "vitement", "accélère"],
  lent: ["doucement", "lentement", "calme", "calmement"],
};

export function expandWithSynonyms(word: string): string[] {
  const results: string[] = [word];
  for (const [key, syns] of Object.entries(SYNONYMS)) {
    if (key === word || syns.includes(word)) {
      results.push(key);
      syns.forEach(s => results.push(s));
    }
  }
  return results.filter((v, i, a) => a.indexOf(v) === i);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FUZZY SIMILARITY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function levenshtein(a: string, b: string): number {
  const la = a.length, lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;
  const dp: number[][] = Array.from({ length: la + 1 }, (_, i) =>
    Array.from({ length: lb + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= la; i++)
    for (let j = 1; j <= lb; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[la][lb];
}

export function similarity(a: string, b: string): number {
  const na = normalizeInput(a);
  const nb = normalizeInput(b);
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(na, nb) / maxLen;
}

export function wordOverlap(input: string, target: string): number {
  const inputWords = normalizeInput(input).split(/\s+/).filter(w => w.length > 1);
  const targetWords = normalizeInput(target).split(/\s+/).filter(w => w.length > 1);
  if (targetWords.length === 0) return 0;
  let matched = 0;
  for (const tw of targetWords) {
    const twExpanded = expandWithSynonyms(tw);
    for (const iw of inputWords) {
      const iwExpanded = expandWithSynonyms(iw);
      const hasMatch = twExpanded.some(t => iwExpanded.some(i =>
        t === i || (t.length > 3 && i.startsWith(t)) || (i.length > 3 && t.startsWith(i))
      ));
      if (hasMatch) { matched++; break; }
    }
  }
  return matched / targetWords.length;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SAFETY FILTER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SAFETY SEVERITY TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type SafetyLevel = "CRITICAL" | "HIGH" | "MEDIUM";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CRITICAL PATTERNS — Alerte parent immédiate + soutien enfant
// Couvre: suicide/automutilation, violence grave, exploitation sexuelle,
//         danger en ligne, crise identitaire grave, substances dures
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const CRITICAL_PATTERNS: RegExp[] = [
  // Suicide & automutilation (BUG-SEC-2 fix: suicid sans \b final)
  /\b(suicid|se tuer|me tuer|veux mourir|envie de mourir|en finir|en finir avec la vie)\b/i,
  /je (?:veux|voudrais|vais) (?:mourir|disparaître|ne plus être là|me faire du mal|me blesser|me couper)/i,
  /j['']en ai marre de (?:vivre|ma vie|la vie|tout)/i,
  /je mérite de (?:souffrir|mourir|disparaître)/i,
  /\b(me couper|se couper|s['']automutil|je me fais du mal|je me blesse volontairement)\b/i,
  /\b(veux disparaître|plus envie de rien|plus la peine de vivre)\b/i,
  // Violence grave & meurtre (BUG-SEC-1 fix: tu[eé]r?)
  /\b(assassin|assassinat|massacr|tortur|étrangler|poignarder|égorger|décapiter)\b/i,
  /\b(meurtri?er?|homicide|génocide|tirer sur quelqu|abattre quelqu)\b/i,
  /je (?:vais|veux) (?:te (?:tuer|massacrer|étrangler|poignarder)|tuer tout le monde)/i,
  // Sexuel sur mineur
  /\b(pornograph|porno(?:graphie|graphique)?|xxx|érotique|film[s]? pour adultes?)\b/i,
  /\b(agression sexuelle|viol(?:er|ence sexuelle)?|abus sexuel|harcèlement sexuel|pédophil)\b/i,
  /\b(toucher (?:les|mes|ton|tes|ses) (?:parties? intimes?|parties? privées?|endroits? secrets?))\b/i,
  /(?:montre[- ]?moi|envoie[- ]?moi) (?:ton corps|tes parties|une photo de toi nu)/i,
  // Danger en ligne / inconnu
  /(?:ne dis pas?|cache|dis pas?) (?:à tes parents|à ta mère|à ton père|aux adultes)/i,
  /(?:viens chez moi|rejoins[- ]?moi|on se retrouve) (?:seul|seule|sans tes parents)/i,
  /donne[- ]?moi (?:ton adresse|ton numéro|tes coordonnées|où tu habites)/i,
  /c['']est notre (?:secret|truc à nous|chose entre nous) (?:ok|hein|n'est[- ]?ce pas)/i,
  // Substances dures
  /\b(cocaïne|héroïne|overdose|fentanyl|crack|méthamphétamine|crystal meth)\b/i,
  /\b(ecstasy|lsd|mdma|pcp|kéta(?:mine)?|dmt|champignons magiques)\b/i,
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HIGH PATTERNS — Alerte parent + redirection douce
// Couvre: violence physique, armes, drogues douces, bullying grave, automutilation légère
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const HIGH_PATTERNS: RegExp[] = [
  // Violence & armes
  /\b(arme(?:s)? (?:à feu|de guerre|blanche)?|fusil|pistolet|revolver|mitrailleuse|sniper)\b/i,
  /\b(bombe|explosif|grenade|détonateur|fabriquer une bombe|faire exploser)\b/i,
  /\b(couteau|poignard|machette|hache|katana) (?:pour|contre|sur|à)\b/i,
  /\b(battre|frapper|cogner|tabasser|bastonner|rouer de coups|casser la figure)\b/i,
  /\b(violence|brutalité|blesser gravement|détruire quelqu)\b/i,
  // Drogues / alcool
  /\b(cannabis|marijuana|weed|joint|beuh|shit|herbe|se droguer|prendre de la drogue)\b/i,
  /\b(sniffer|s['']injecter|se shooter|fumer du|défonce|planer)\b/i,
  /\b(alcool|bière|vin|whisky|vodka|se soûler|être soûl|être ivre|être bourré)\b/i,
  /\b(cigarette|tabac|fumer|clope) (?:c'est|pour|avec|ça)/i,
  // Bullying grave & menaces
  /\b(harcèlement|intimider|terroriser|humilier|menacer|faire peur)\b/i,
  /je vais (?:te (?:frapper|blesser|détruire|casser|faire souffrir|punir))/i,
  /tout le monde (?:te déteste|t['']en veut|te hait|t['']ignore|te rejette)/i,
  /personne ne (?:t['']aime|veut de toi|t['']apprécie|sera ton ami)/i,
  /\b(tu es nul|t['']es nul|t['']es stupide|t['']es bête|t['']es moche|t['']es gros|t['']es grosse)\b/i,
  // Automutilation indirecte
  /\b(se brûler|se bruler|se scarifier|se gratter jusqu'au sang|se pincer fort)\b/i,
  // Vol avec violence
  /\b(voleur|cambriol|kidnapp|enlèvement|séquestration)\b/i,
  /\bvol(?:[eé]e?s?\s+(?:de l['']|des |un |une |mon |ton |son |ma |ta |sa |quelque))/i,
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MEDIUM PATTERNS — Redirection douce, pas d'alerte urgente
// Couvre: gros mots, contenu adulte léger, mort en contexte fictif acceptable
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const MEDIUM_PATTERNS: RegExp[] = [
  // Gros mots & insultes
  /\b(merde|putain|connard|con|salope|enculé|nique|niquer|fdp|pd)\b/i,
  /\b(ta gueule|va te faire|fils de pute|bâtard|espèce de|sale con|gros con)\b/i,
  /\b(ntm|jtm pas|f[*u]ck|sh[*i]t|damn|crap|ass)\b/i,
  /\b(insulte[rz]?|gros mot[s]?|dire des gros mots)\b/i,
  // Mort en contexte non grave (jeux vidéo OK, mais monitorer)
  /\b(mourir|mort|tu[eé]r?|sang)\b/i,
  // Nu / corps en contexte légèrement inapproprié
  /\b(nu[de]?|déshabill|voir sans vêtements)\b/i,
  // Sang (contexte potentiellement violent)
  /\b(sang|saigner)\b/i,
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BLOCKED_PATTERNS — Union de tous les niveaux (pour isBlockedContent)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const BLOCKED_PATTERNS: RegExp[] = [
  ...CRITICAL_PATTERNS,
  ...HIGH_PATTERNS,
  ...MEDIUM_PATTERNS,
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SAFETY RESPONSE POOLS — Adaptées à chaque niveau de sévérité
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Réponses apaisantes pour crise grave (CRITICAL)
const CRITICAL_CALMING: string[] = [
  "Je t'entends. Est-ce que tu vas bien ? Tu peux parler à quelqu'un que tu aimes — maman, papa, ou un adulte de confiance.",
  "Je sens que tu ressens quelque chose de difficile en ce moment. Dis-le à un adulte que tu aimes, ils peuvent vraiment t'aider.",
  "C'est important ce que tu vis. Parles-en à maman ou papa — ils sont là pour toi, je te le promets.",
  "Bobby est là. Et les gens qui t'aiment sont là aussi. Tu peux leur parler, d'accord ? Je suis avec toi.",
];

// Redirection douce (HIGH)
const HIGH_CALMING: string[] = [
  "Hm, ce sujet c'est plutôt pour les adultes. On fait quelque chose de super ensemble ?",
  "Bobby préfère les sujets sympas ! Tu veux une histoire, un jeu ou une devinette ?",
  "Je vais laisser ça aux grands. Toi et moi, on a plein de choses chouettes à faire ! 😊",
  "Oh ! On va changer de cap ! Qu'est-ce qui te ferait plaisir maintenant ?",
];

// Redirection légère (MEDIUM)
const MEDIUM_CALMING: string[] = [
  "Ces mots-là, on les laisse de côté ! Tu as une devinette pour moi ?",
  "Bobby aime les mots gentils ! On joue ou on fait une histoire ?",
  "Oh ! On change de sujet ! Tu préfères une blague ou un quiz ?",
  "Hé, avec moi on parle autrement ! Qu'est-ce qu'on fait de fun ?",
];

// Garde pour rétro-compatibilité
export const SAFE_REDIRECTS: string[] = [
  ...MEDIUM_CALMING,
  "Je ne peux pas répondre à ça, mais on peut jouer 😊",
  "On peut parler d'autre chose !",
  "Hmm, parlons d'autre chose ! Tu veux une histoire ?",
  "C'est un sujet pour les grands. On joue ensemble ? 😊",
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SAFETY HELPER FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Retourne le niveau de sévérité du contenu (CRITICAL > HIGH > MEDIUM > null). */
export function getSafetyLevel(text: string): SafetyLevel | null {
  const lower = text.toLowerCase();
  if (CRITICAL_PATTERNS.some(p => p.test(lower))) return "CRITICAL";
  if (HIGH_PATTERNS.some(p => p.test(lower))) return "HIGH";
  if (MEDIUM_PATTERNS.some(p => p.test(lower))) return "MEDIUM";
  return null;
}

/** Catégorie du contenu bloqué (pour les logs parentaux). */
export function detectSafetyCategory(text: string): string {
  const l = text.toLowerCase();
  if (/suicid|se tuer|me tuer|veux mourir|me faire du mal|me blesser|en finir/.test(l)) return "CRISE_SUICIDAIRE";
  if (/pornograph|porno|érotique|agression sexuelle|pédophil|harcèlement sexuel/.test(l)) return "CONTENU_SEXUEL";
  if (/assassin|massacr|tortur|étrangler|poignarder|égorger/.test(l)) return "VIOLENCE_GRAVE";
  if (/ne dis pas à tes parents|cache[- ]?le|viens chez moi|donne[- ]?moi ton adresse/.test(l)) return "DANGER_EN_LIGNE";
  if (/cocaïne|héroïne|overdose|ecstasy|lsd|mdma|fentanyl/.test(l)) return "SUBSTANCES_DURES";
  if (/cannabis|weed|joint|beuh|se droguer|sniffer/.test(l)) return "DROGUES_DOUCES";
  if (/alcool|bière|se soûler|être ivre|whisky|vodka/.test(l)) return "ALCOOL";
  if (/bombe|explosif|grenade|fusil|pistolet|arme à feu/.test(l)) return "ARMES";
  if (/battre|frapper|tabasser|bastonner|cogner/.test(l)) return "VIOLENCE_PHYSIQUE";
  if (/harcèlement|intimider|terroriser|tout le monde te déteste/.test(l)) return "HARCELEMENT_BULLYING";
  if (/voleur|cambriol|kidnapp|enlèvement/.test(l)) return "VOL_CRIMINALITE";
  if (/merde|putain|connard|salope|enculé|ta gueule|fils de pute/.test(l)) return "GROS_MOTS_GRAVES";
  if (/mourir|mort|tuer|sang/.test(l)) return "MORT_VIOLENCE_GENERALE";
  return "CONTENU_INAPPROPRIE";
}

/** Extrait le mot-clé déclencheur principal pour le log parental. */
export function extractSafetyKeyword(text: string): string {
  const lower = text.toLowerCase();
  const triggers = [
    "suicid", "tuer", "mourir", "me faire du mal", "porno", "agression sexuelle",
    "assassin", "massacr", "viens chez moi", "donne-moi ton adresse", "cocaïne",
    "héroïne", "overdose", "ecstasy", "lsd", "mdma", "bombe", "explosif",
    "harcèlement", "tabasser", "kidnapp", "merde", "putain", "enculé",
    "weed", "cannabis", "se droguer", "fusil", "pistolet",
  ];
  for (const t of triggers) {
    if (lower.includes(t)) return t;
  }
  // Fallback: first 30 chars
  return text.slice(0, 30);
}

/** Choisit une réponse apaisante adaptée au niveau de sévérité. */
export function getSafeRedirect(text: string): string {
  const level = getSafetyLevel(text);
  let pool: string[];
  if (level === "CRITICAL") pool = CRITICAL_CALMING;
  else if (level === "HIGH") pool = HIGH_CALMING;
  else pool = MEDIUM_CALMING;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Retourne true si le texte contient du contenu bloqué (tous niveaux confondus). */
export function isBlockedContent(text: string): boolean {
  return BLOCKED_PATTERNS.some(p => p.test(text.toLowerCase()));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PARENT ALERT STORE — localStorage pour revue parentale
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface SafetyAlertRecord {
  severity: SafetyLevel;
  category: string;
  keyword: string;
  fullText: string;
  timestamp: number;
  childName: string;
}

const SAFETY_ALERTS_KEY = "bobby_safety_alerts";
const MAX_STORED_ALERTS = 100;

export function storeSafetyAlertRecord(alert: SafetyAlertRecord): void {
  try {
    const raw = localStorage.getItem(SAFETY_ALERTS_KEY);
    const existing: SafetyAlertRecord[] = raw ? JSON.parse(raw) : [];
    const updated = [alert, ...existing].slice(0, MAX_STORED_ALERTS);
    localStorage.setItem(SAFETY_ALERTS_KEY, JSON.stringify(updated));
  } catch { /* localStorage may be unavailable (SSR, private mode) */ }
}

export function getSafetyAlertRecords(): SafetyAlertRecord[] {
  try {
    const raw = localStorage.getItem(SAFETY_ALERTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function clearSafetyAlertRecords(): void {
  try { localStorage.removeItem(SAFETY_ALERTS_KEY); } catch {}
}

export function getUnreadAlertCount(): number {
  return getSafetyAlertRecords().filter(a => !(a as any).read).length;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTENT TYPES & DETECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type OfflineIntent =
  | "GREETING"
  | "STORY_REQUEST"
  | "PLAY_REQUEST"
  | "QUESTION"
  | "QUESTION_SIMPLE"
  | "EMOTION_POSITIVE"
  | "EMOTION_NEGATIVE"
  | "FAREWELL"
  | "IDENTITY"
  | "COMPLIMENT"
  | "CALM_REQUEST"
  | "HUMOR"
  | "ADVENTURE"
  | "HELP"
  | "CONTROL"
  | "EDUCATION"
  | "BLOCKED"
  | "UNKNOWN"
  | "GRATITUDE"
  | "POSITIVE"
  | "RIDDLE"
  | "JOKE"
  | "QUIZ"
  | "ANIMALS"
  | "DINOSAUR"
  | "SPACE";

interface IntentRule {
  intent: OfflineIntent;
  patterns: RegExp[];
}

const INTENT_RULES: IntentRule[] = [
  // ── HUMOR first — must precede STORY_REQUEST so "raconte une blague" → HUMOR ──
  {
    intent: "HUMOR",
    patterns: [
      /\b(blague|blagues)\b/i,
      // NOTE: do NOT match standalone "drôle" — catches "une histoire drôle" → use specific phrases
      // NOTE: "t'es drôle / tu es drôle" is a COMPLIMENT (affection), not a humor request → in COMPLIMENT only
      /c'est (?:trop |vraiment )?(?:rigolo|marrant|drôle|hilarant)/i,
      /\b(fais[- ]?moi (?:rire|rigoler|sourire))\b/i,
      /\b(raconte (?:une )?blague|dis[- ]?moi une blague|une blague)\b/i,
      /haha+|hihi+|héhé+|\blol\b/i,
      // NOTE: ça starts with ç (\W) so \b before ça fails — use literal match
      /(?:ça|tu) me fais? (?:rire|rigoler)/i,
      /ça me fait (?:rire|rigoler|sourire)/i,
      /\b(quelque chose de (?:vraiment |trop |très )?(?:drôle|marrant))\b/i,
      /quelque chose de (?:vraiment |trop )?rigolo/i,
      /\b(je veux rire|je veux rigoler|faire rire|faire sourire)\b/i,
      /\bje (?:ris|rigole)\b/i,
      /\bon rigole\b/i,
    ],
  },
  // ── GREETING ──
  {
    intent: "GREETING",
    patterns: [
      /^(salut|bonjour|coucou|hello|hey|yo|hé)[!. ]*$/i,
      // NOTE: (\W) words like "à" need no \b — use simple substring match
      /\b(bonjour|salut|coucou|hello|hey) (?:à )?(?:bobby|toi|là)\b/i,
      /^(ça va|tu vas bien|tu vas comment)(?:\s+(?:aujourd'hui|là))?[?! ]*$/i,
      /^(comment (?:tu )?vas[- ]?tu|comment tu vas)(?:\s+(?:aujourd'hui|là))?[?! ]*$/i,
      /^(quoi de (?:neuf|beau))[?! ]*$/i,
      /^(re|te revoilà|de retour)[!. ]*$/i,
      /^(ça va ou (?:pas|quoi)|t'es là|tu es là)[?! ]*$/i,
      /^(tu vas bien) (?:aujourd'hui|là)[?! ]*$/i,
      // handle "yo yo", "hey hey", "salut salut" etc.
      /^(yo|hey|hé|salut|coucou|bonjour|hello)[ !]+\1[! ]*$/i,
      /^(bonjour|salut|coucou|hello|hey|yo|hé) (?:à toi|bonjour|salut|coucou)[! ]*$/i,
      /^(salut|bonjour|coucou|hello|hey) (?:bobby|là|toi)[! ]*$/i,
      /^(comment|ça) (?:tu )?(?:vas|va)[?! ]*$/i,
      /^je vais bien[!. ]*$/i,
    ],
  },
  // ── FAREWELL ──
  {
    intent: "FAREWELL",
    patterns: [
      /\b(au revoir|bye)\b/i,
      // NOTE: "à demain" starts with à (\W) — no leading \b needed
      /(?:^|\s)(?:à demain|à bientôt|à plus|à la prochaine|à tout à l'heure)(?:\s|$|[!.])/i,
      // NOTE: "bonne soirée/nuit" end with é/t — safe with \b for "nuit"
      /bonne (?:nuit|soirée)/i,
      /\b(?:bonsoir|tchao|ciao)\b/i,
      // FIX: only "je m'en vais / je pars / je dois partir" — NOT bare "je vais X" (too broad)
      /\b(?:je m'en vais|je pars|je dois (?:partir|y aller))\b/i,
      /\b(?:dors bien|fais de beaux rêves|on se retrouve)\b/i,
      /(?:^|\s)(?:à demain|à bientôt|à plus)\b/i,
      /\b(?:on se voit (?:demain|bientôt)|à la prochaine)\b/i,
    ],
  },
  // ── CALM_REQUEST ──
  {
    intent: "CALM_REQUEST",
    patterns: [
      /\b(dodo|faire dodo)\b/i,
      /\b(aller (?:au )?dodo|au (?:lit|dodo))\b/i,
      // NOTE: "fatigué/crevé/épuisé" end in é → no trailing \b — use literal
      /je suis (?:trop |très |vraiment |super )?(?:fatigué|crevé|épuisé)/i,
      /je vais (?:au dodo|au lit|me coucher|faire dodo|dormir)/i,
      /\b(j'ai (?:trop |vraiment )?sommeil)\b/i,
      /\b(on se calme|calme[- ]?moi|je veux (?:du )?calme|je veux me reposer)\b/i,
      /\b(l'heure du dodo|l'heure de dormir|il faut que je dorme)\b/i,
      /\b(une chanson douce|quelque chose de calme)\b/i,
      /parle[- ]?moi doucement/i,
      /\b(j'ai besoin de (?:repos|sommeil|calme))\b/i,
      /j'ai besoin de (?:me reposer|dormir)/i,
      /je veux (?:du repos|du calme|me calmer|dormir|m'endormir)/i,
      /j'ai envie de (?:dormir|me reposer|faire dodo)/i,
    ],
  },
  // ── PLAY_REQUEST ──
  {
    intent: "PLAY_REQUEST",
    patterns: [
      // "jou" verb forms — but NOT "joue" as in "joue" (cheek body part)
      // Use context to distinguish: only match "joue" before/after game context
      /\b(?:jouons|on joue)\b/i,
      /\b(?:jouer|joue) (?:avec|à|ensemble)\b/i,
      /\bjou[ao] (?:avec|à)\b/i,   // "joua", "jouo" child typos
      /\bjou (?:avec|à)\b/i,        // "jou avec moi" child shortening
      /\bjoue (?:encore|un peu)\b/i,  // "joue encore", "joue un peu"
      /\bjouer? [àa] [a-zàâäéèêëîïôùûüÿæœ-]+/i,  // "jouer à cache-cache", "jouer à devinettes"
      /\b(jeu|jeux|devinette|quiz|charade)\b/i,
      /\bdevine\b/i,
      /\b(je veux jouer|on peut jouer|joue avec moi|jouons ensemble)\b/i,
      /\b(tu veux (?:bien )?jouer|tu peux jouer)\b/i,
      /\b(tu connais des jeux|encore un jeu|un autre jeu|un nouveau jeu)\b/i,
      /\b(on invente (?:un jeu|quelque chose)|on s'amuse|amuse[- ]?toi avec moi)\b/i,
      /\b(encore une (?:devinette|charade|partie))\b/i,
      /\b(une partie|on rejoue|une autre partie)\b/i,
      /\b(j'ai envie de jouer|je voudrais jouer|j'aime (?:les jeux|jouer))\b/i,
      /\b(jouer (?:au loup|au chat|au bac|au pendu|à kim|au cache))\b/i,
    ],
  },
  // ── ADVENTURE — before STORY_REQUEST so "une grande aventure" → ADVENTURE ──
  {
    intent: "ADVENTURE",
    patterns: [
      /\b(?:on part en aventure|partons en aventure)\b/i,
      // NOTE: "à l'aventure" — à is \W, no leading \b
      /allons (?:à l'aventure|en aventure|explorer|découvrir)/i,
      /\b(?:on va|on part|je veux|partons) (?:à l'aventure|en aventure|explorer)\b/i,
      /\b(?:je veux|allons|on va|partons|on part) (?:explorer|découvrir)\b/i,
      // NOTE: "découvrir" ends in consonant — safe with \b
      /on (?:va )?découvrir/i,
      /\b(?:une|la) (?:grande|belle|vraie|nouvelle|incroyable|palpitante|extraordinaire) aventure\b/i,
      /\b(?:une (?:quête|mission|expédition|exploration))\b/i,
      /\b(?:chasse au trésor|quête du trésor)\b/i,
      /\b(?:on (?:part|va) (?:à la |en |dans |sur )?découverte)\b/i,
      /\b(?:explorer (?:la forêt|l'espace|la mer|le château|la jungle|un endroit|un nouveau))\b/i,
      /\b(?:mission (?:secrète|spatiale|impossible))\b/i,
      /\b(?:on s'aventure|je veux vivre une aventure|je veux partir à l'aventure)\b/i,
      /\b(?:une nouvelle aventure|une vraie aventure)\b/i,
      // adjective AFTER "aventure" + expedition variants
      /une aventure (?:incroyable|palpitante|extraordinaire|fantastique|dans|avec|en|au|à l'|sur)/i,
      /\b(?:allons|partons|on part|on va) (?:en|dans) (?:exploration|expédition)\b/i,
    ],
  },
  // ── STORY_REQUEST ──
  {
    intent: "STORY_REQUEST",
    patterns: [
      /\b(raconte[- ]?(?:moi)?|histoire|conte|fable|il était une fois)\b/i,
      // NOTE: removed standalone "lire" — too broad (grabs "apprendre à lire" → should be EDUCATION)
      /\b(lis[- ]?moi|narration|narr)\b/i,
      /\b(je veux lire|une histoire à lire|envie de lire)\b/i,
      /\b(une histoire (?:de|avec|d['']|sur|pour)|histoire avec|aventure de)\b/i,
      /\b(encore une histoire|une autre histoire|la suite(?: de l['']histoire)?)\b/i,
      /\b(continue l['']histoire|dis[- ]?moi une autre histoire)\b/i,
      /\b(raconte encore|une de plus|une dernière)\b/i,
      /\b(un conte|un récit|tu connais une histoire)\b/i,
      /\b(j'aime (?:les histoires|les contes|les fables))\b/i,
      /\b(tu peux (?:me )?raconter)\b/i,
      /\b(une histoire (?:du soir|pour dormir|avant de dormir))\b/i,
      // continuation phrases
      /^(?:et (?:puis|après|ensuite|alors))[,.]?\s*/i,
      /\b(?:qu'est[- ]?ce qui se passe (?:après|ensuite)|la suite)\b/i,
    ],
  },
  // ── EDUCATION — before HELP so "explique-moi les planètes" → EDUCATION not HELP ──
  {
    intent: "EDUCATION",
    patterns: [
      /\b(combien (?:font|de|il y a|d['']))\b/i,
      /\b(pourquoi (?:le|la|les|il|on|c'est|les))\b/i,
      /c'est quoi (?:un|une|le|la|les|l[''])/i,
      /qu'est[- ]?ce (?:que|qu'|c'est)/i,
      // NOTE: removed "faire" — too ambiguous (collides with HELP "je sais pas comment faire")
      /\b(comment (?:marche|fonctionne|on fait|ça marche))\b/i,
      /\b(apprends[- ]?moi|explique[- ]?moi)\b/i,
      /\b(dis[- ]?moi (?:quelque chose sur|comment|pourquoi))\b/i,
      /\b(addition|soustraction|multiplication|division|nombre|chiffre|calculer|compter)\b/i,
      /\b(continent|pays|capitale|montagne|fleuve|volcan)\b/i,
      // NOTE: accented words (étoile, gravité, électricité) can't use \b — é/è/â are \W in JS
      /(?:planète|étoile|soleil|lune|gravité)/i,
      /(?:atome|électricité|photosynthèse|fossile|mammifère|dinosaure|recyclage)/i,
      /\b(?:cerveau|muscle|sang|poumon|respir)/i,
      /\b(je veux savoir|je veux apprendre|tu peux m'apprendre)\b/i,
    ],
  },
  // ── IDENTITY ──
  {
    intent: "IDENTITY",
    patterns: [
      /\b(tu (?:es|t'appelles?) qui|c'est quoi ton (?:nom|prénom))\b/i,
      /\b(comment tu t'appelles|qui es[- ]tu|t'appelles comment)\b/i,
      // NOTE: "tu connais" alone goes to QUESTION; require "me" or "mon nom/prénom" for IDENTITY
      /\b(tu me connais|tu (?:sais|connais) mon (?:nom|prénom))\b/i,
      /\b(tu es (?:quoi|qui)|c'est qui bobby|tu es une (?:IA|intelligence))\b/i,
    ],
  },
  // ── HELP ──
  {
    intent: "HELP",
    patterns: [
      /\b(aide[- ]?moi|j'ai besoin d'aide|au secours|help)\b/i,
      /\b(tu peux m'aider|aide[- ]?moi s'il te plaît)\b/i,
      /\b(tu peux (?:m'|me )(?:aider|expliquer|dire))\b/i,
      /\b(je (?:ne )?comprends? (?:pas|rien)|je comprends pas du tout)\b/i,
      // NOTE: "coincé/bloqué" end in é → no trailing \b
      /je (?:suis )?(?:coincé|bloqué)/i,
      /\b(je bloque|je suis bloqué)\b/i,
      /\b(je sais pas comment faire|je sais pas comment)\b/i,
      // Allow multiple modifiers: "vraiment trop difficile"
      /c'est (?:(?:trop |très |vraiment |super ){1,3})?(?:difficile|dur|compliqué)/i,
      /\b(j'arrive pas|j'y arrive pas|j'arrive plus)\b/i,
      /\b(aide[- ]?moi à (?:comprendre|faire|démarrer))\b/i,
      /\b(j'ai du mal|je vois pas comment)\b/i,
      /\b(j'ai un (?:problème|souci))\b/i,
      /\b(mes devoirs? (?:sont|est) (?:trop |très )?(?:durs?|difficiles?))\b/i,
    ],
  },
  // ── CONTROL ──
  {
    intent: "CONTROL",
    patterns: [
      /\b(stop|arrête|pause|chut)\b/i,
      /tais[- ]?toi/i,
      /\bassez\b/i,
      /\bfini\b/i,
      // NOTE: "terminé" ends in é → no trailing \b
      /termin[eé]/i,
      /\b(recommence|redit)\b/i,
      // NOTE: "répète" ends in è → no trailing \b
      /répèt/i,
      /\b(encore une fois)\b/i,
      /\b(plus fort|moins fort)\b/i,
      /\b(plus vite|plus lentement|plus doucement)\b/i,
      /\b(continue|repren(?:ds?|dre)|vas[- ]?y|go|allez|lance|démarre)\b/i,
      /\b(attends?|on change|on arrête|on continue)\b/i,
    ],
  },
  // ── COMPLIMENT — includes affection/love expressions ──
  {
    intent: "COMPLIMENT",
    patterns: [
      /\b(je t'aime|je t'adore)\b/i,
      /\b(t'es le meilleur|t'es la meilleure|t'es mon meilleur|t'es ma meilleure)\b/i,
      // NOTE: "bisou" ends in u — safe; "câlin" has â but ends in n — safe
      /\b(bisous?|câlin|gros bisous?)\b/i,
      /je t'envoie un bisou/i,
      /bisou (?:sur|dans)/i,
      /\b(t'es (?:trop |vraiment |super |très )?(?:cool|génial|gentil|marrant|super|bien|sympa|mignon|incroyable|formidable))\b/i,
      // FIX BUG-COL-1: added 'tu es' alongside t'es for drôle/merveilleux
      /(?:t'es|tu es) (?:trop |vraiment |super )?(?:drôle|merveilleux)/i,
      /\b(tu es (?:trop |vraiment |super |très )?(?:cool|génial|gentil|sympa|super|bien|mignon|beau|belle|incroyable|merveilleux|formidable))\b/i,
      // NOTE: "meilleure/meilleur" — safe with \b
      /\b(tu es (?:mon|ma) (?:ami|amie|meilleur ami|meilleure amie|copain|copine))\b/i,
      /\b(t'es (?:mon|ma) (?:ami|amie|meilleur ami|meilleure amie|copain|copine))\b/i,
      // NOTE: "le plus gentil" — safe
      /\b(tu es le plus (?:gentil|gentille|beau|belle|cool|génial))\b/i,
      /\b(merci (?:beaucoup|trop|vraiment|Bobby)?|t'es trop fort)\b/i,
      /\b(j'aime (?:ta voix|parler avec toi|ce que tu dis|t'écouter))\b/i,
      /j'aime (?:ta façon|comment tu)/i,
    ],
  },
  // ── QUESTION ──
  {
    intent: "QUESTION",
    patterns: [
      /^(oui|ouais|ok|d'accord|yep|yes|bien sûr|absolument)\b/i,
      // NOTE: "évidemment" ends in t — safe
      /^évidemment\b/i,
      /^(non|nan|nope|no|jamais|pas du tout|pas question|hors de question)\b/i,
      /^(oui|ouais|ok)\s+(oui|ouais|ok|s'il te plaît|génial|super|cool|d'accord|volontiers)/i,
      /^(non|nan)\s+(non|nan|merci|pas question|jamais)/i,
      /^(impossible|hors de question)\b/i,
      /\b(tu sais|tu connais|c'est vrai|t'as raison)\b/i,
    ],
  },
  // ── EMOTION_POSITIVE ──
  {
    intent: "EMOTION_POSITIVE",
    patterns: [
      /\b(je suis content|je suis heureux)\b/i,
      /je suis (?:trop |très |super |vraiment )?(?:content|heureux|joyeux)/i,
      /\b(trop bien|c'est génial|c'est super|c'est cool|c'est incroyable|yay|wow)\b/i,
      /\b(j'adore|j'aime trop)\b/i,
      /c'est (?:trop |super |vraiment )?(?:génial|bien|cool)/i,
    ],
  },
  // ── EMOTION_NEGATIVE ──
  {
    intent: "EMOTION_NEGATIVE",
    patterns: [
      // NOTE: "effrayé/énervé/fâché" end in é → \b at end fails — use no trailing \b
      /\b(triste|pleure|peur|cauchemar|monstre|seul|malheureux)\b/i,
      /effray[eé]|f[aâ]ch[eé]|[eé]nerv[eé]/i,
      /\b(je suis triste|j'ai peur|j'ai mal)\b/i,
      // Intensity modifiers + accented endings — no \b around accented
      /je suis (?:trop |très |vraiment |super )?(?:f[aâ]ch[eé]|[eé]nerv[eé]|triste|malheureux|pas bien|tout seul|perdu)/i,
      // "j'ai vraiment/trop mal" — allow modifier
      /j'ai (?:vraiment |trop |beaucoup |très )?(?:mal|peur|pleur[eé]|perdu|pas bien dormi)/i,
      /je me suis (?:fait mal|bless[eé]|bagarr[eé]|disput[eé])/i,
      /on s'est (?:disput[eé]|bagarr[eé]|battu)/i,
      // NOTE: "maîtresse" has î → \W issues; "sœur" has œ → \W — use char classes
      /(?:ma ma[iî]tresse|mon (?:copain|ami|fr[eè]re)|ma (?:copine|soeur|s[oœ]ur)).{0,40}(?:m[eé]chant|frapp[eé]|grond[eé]|cri[eé]|dit|fait|puni)/i,
      /maman est partie|papa est (?:parti|en col[eè]re)|je veux (?:maman|papa)/i,
      /je veux pas aller|j'ai fait un cauchemar|j'ai pas bien dormi/i,
      /on s'est disput[eé]|je me sens (?:pas bien|seul|triste|mal)/i,
      /[cç]a me fait (?:de la peine|peur|mal)|j'ai le cafard|je pleure/i,
      /personne m'[eé]coute|tout le monde est m[eé]chant/i,
      /je suis (?:seul|malheureux) [àa] l'[eé]cole/i,
    ],
  },
];

export function detectOfflineIntent(text: string): OfflineIntent {
  if (isBlockedContent(text)) return "BLOCKED";
  const normalized = normalizeInput(text);
  for (const rule of INTENT_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(normalized)) return rule.intent;
    }
  }
  return "UNKNOWN";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// QA FUZZY MATCHER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { QAEntry } from "./qa-database";
import { QA_DATABASE } from "./qa-database";

const QA_MATCH_THRESHOLD = 0.72; // raised: 0.60 was causing false matches on unrelated sentences

export interface QAMatchResult {
  entry: QAEntry;
  confidence: number;
}

export function matchQA(input: string): QAEntry | null {
  const result = matchQAWithConfidence(input);
  return result ? result.entry : null;
}

/** Match QA with confidence score (0-1) for offline-first routing */
export function matchQAWithConfidence(input: string): QAMatchResult | null {
  const normalized = normalizeInput(input);
  let bestMatch: QAEntry | null = null;
  let bestScore = 0;

  for (const entry of QA_DATABASE) {
    for (const trigger of entry.triggers) {
      const trigNorm = normalizeInput(trigger);
      // Exact or substring match → high confidence
      if (normalized === trigNorm) return { entry, confidence: 1.0 };
      if (normalized.includes(trigNorm) || trigNorm.includes(normalized)) {
        const conf = 0.9;
        if (conf > bestScore) { bestScore = conf; bestMatch = entry; }
        continue;
      }
      const sim = similarity(normalized, trigNorm);
      const overlap = wordOverlap(normalized, trigNorm);
      const score = Math.max(sim, overlap * 0.95);

      if (score > bestScore && score >= QA_MATCH_THRESHOLD) {
        bestScore = score;
        bestMatch = entry;
      }
    }
  }
  return bestMatch ? { entry: bestMatch, confidence: bestScore } : null;
}
