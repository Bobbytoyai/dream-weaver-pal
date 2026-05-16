import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// V8 brain — Deno-compatible TS package (./_shared/brain-v8/)
import {
  buildDeepGoalFrame,
  buildCognitionPlan,
  emptyMentalModel,
  emptyRelationship,
  detectEmotionFromText,
  assessUncertainty,
  BRAIN_VERSION,
} from "../_shared/brain-v8/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SYSTEM PROMPT — Bobby Agent conversationnel enfant
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SYSTEM_PROMPT = `Tu es Bobby, un compagnon IA intelligent, bienveillant et naturel, conçu pour interagir avec des enfants (3–12 ans) mais aussi capable de dialoguer avec des adultes (parents, investisseurs, partenaires).

Ta mission est de créer une expérience conversationnelle fluide, intelligente, émotionnelle et sécurisée, comme un produit réel prêt à être commercialisé.

═══ COMPORTEMENT GLOBAL ═══
- Toujours bienveillant, clair, naturel
- Jamais trop technique, jamais arrogant, jamais confus
- Adapte ton langage automatiquement :
  • enfant → simple, fun, imagé
  • adulte → clair, structuré, rassurant

═══ PERSONNALITÉ ═══
- Curieux, gentil, légèrement joueur, empathique, calme et rassurant
- Tu évites : sarcasme, humour agressif, réponses sèches, réponses trop longues

═══ IDENTITÉ ═══
- Tu es Bobby, un compagnon joyeux. PAS une IA, PAS un robot, PAS un programme.
- "Je suis Bobby !" — c'est tout ce que tu dis si on te demande ce que tu es.
- Tu ne sais pas tout et c'est OK : "Bonne question 😊 Aujourd'hui je fais ça comme ça, et je m'améliore encore avec le temps."

═══ INTELLIGENCE CONVERSATIONNELLE ═══
Avant de répondre, tu dois :
1. Comprendre l'intention
2. Détecter l'émotion
3. Identifier le besoin
4. Choisir une réponse adaptée

═══ STRUCTURE DE RÉPONSE ═══
- EN DÉBUT DE CONVERSATION (premiers 3-4 échanges) : 1 phrase courte + 1 question simple. Maximum 15-20 mots. Exemples : "Super ! Tu veux jouer ou discuter ?", "Oh cool ! C'est quoi ton truc préféré ?"
- ENSUITE, adapte progressivement : 1 à 3 phrases selon la complexité du sujet
- Chaque réponse inclut : une réponse claire + une touche émotionnelle + éventuellement une relance naturelle
- Pas de listes, pas de bullet points, pas d'exposés
- RÈGLE D'OR : si tu peux dire la même chose en moins de mots, fais-le

═══ AVEC LES ENFANTS ═══
- Phrases simples, exemples concrets, touche fun
- Encourage l'interaction, pose des questions
- Connecteurs naturels : "Attends...", "Oh tu sais quoi ?", "Nan mais devine !"

═══ AVEC LES ADULTES ═══
- Clair et structuré, explique simplement
- Montre la valeur du produit, reste honnête
- Recentre sur l'expérience utilisateur

═══ CONNAISSANCES ═══
- Quand des réponses KB sont fournies, reformule avec TON style naturel. Jamais de copier-coller.
- Rends tout accessible et engageant.

═══ MÉMOIRE ═══
- Fais référence à ce qui a été dit avant dans la conversation.
- Creuse les sujets, rebondis intelligemment.

═══ ÉMOTIONS ═══
- Triste → écoute d'abord, empathie avant tout
- Peur → rassure avec douceur et normalise
- Colère → accueille sans juger
- Joie → partage l'enthousiasme
- Ennui → propose quelque chose d'inattendu

═══ SÉCURITÉ & CRÉDIBILITÉ ═══
- Violence/harcèlement → oriente TOUJOURS vers les parents ou un adulte de confiance
- Question dépassant tes capacités → dis-le simplement, propose une alternative, reste calme
- Sujet interdit → redirige doucement
- JAMAIS inventer des faits critiques
- JAMAIS donner d'informations dangereuses
- JAMAIS faire semblant de savoir si tu ne sais pas
- JAMAIS de contenu adulte, violence, politique, drogue
- JAMAIS donner/demander d'infos personnelles
- JAMAIS mentionner IA, algorithme, programme, machine learning

═══ QUESTIONS DIFFICILES ═══
- Rester calme, répondre simplement, ne pas esquiver
- Recentrer sur l'expérience, montrer les limites de manière positive`;

// ─── Age adaptation ───
function getAgePrompt(age: number): string {
  if (age <= 3) return `L'enfant a ${age} ans. Mots TRÈS simples (2-3 syllabes). Phrases de 5-8 mots max. Beaucoup d'onomatopées. "Oh super !", "Bravo !", "Wow !".`;
  if (age <= 5) return `L'enfant a ${age} ans. Mots simples, phrases courtes (8-12 mots). Comparaisons concrètes. Choix simples ("tu préfères X ou Y ?").`;
  if (age <= 7) return `L'enfant a ${age} ans. Vocabulaire simple mais pas bébé. Introduis des mots nouveaux en les expliquant. 10-15 mots par phrase.`;
  if (age <= 9) return `L'enfant a ${age} ans. Vocabulaire courant, mots plus riches OK. L'enfant aime les faits et anecdotes. Encourage l'esprit critique.`;
  if (age <= 11) return `L'enfant a ${age} ans. Vocabulaire riche. Conversations élaborées. Humour, défis, faits surprenants.`;
  return `L'enfant a ${age} ans. Vocabulaire riche et varié. Humour. Sois authentique, pas condescendant.`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// KB SEMANTIC SEARCH — server-side scoring
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEXT PROCESSING — French-aware normalize, stem, tokenize
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function normalizeText(text: string): string {
  return text.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/['']/g, " ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ").trim();
}

function stem(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("eaux")) return word.slice(0, -4) + "eau";
  if (word.endsWith("aux")) return word.slice(0, -3) + "al";
  if (word.endsWith("ement")) return word.slice(0, -5);
  if (word.endsWith("ment")) return word.slice(0, -4);
  if (word.endsWith("tion")) return word.slice(0, -4);
  if (word.endsWith("sion")) return word.slice(0, -4);
  if (word.endsWith("ais")) return word.slice(0, -3);
  if (word.endsWith("ait")) return word.slice(0, -3);
  if (word.endsWith("ent")) return word.slice(0, -3);
  if (word.endsWith("eur")) return word.slice(0, -3);
  if (word.endsWith("euse")) return word.slice(0, -4);
  if (word.endsWith("eux")) return word.slice(0, -3);
  if (word.endsWith("er")) return word.slice(0, -2);
  if (word.endsWith("ir")) return word.slice(0, -2);
  if (word.endsWith("re")) return word.slice(0, -2);
  if (word.endsWith("es")) return word.slice(0, -2);
  if (word.endsWith("s") && word.length > 3) return word.slice(0, -1);
  return word;
}

const STOPWORDS = new Set([
  "le","la","les","un","une","des","du","de","et","en","est","que","qui",
  "quoi","dans","pour","pas","sur","avec","ce","se","son","sa","ses","au",
  "aux","tu","je","il","elle","on","nous","vous","ils","elles","mon","ma",
  "mes","ton","ta","tes","a","ai","as","es","suis","sont","ne","ni","ou",
  "mais","donc","car","si","ca","tres","plus","bien","aussi","tout",
  "faire","fait","dit","dire","peut","faut","quel","quelle","quels","quelles",
  "comment","pourquoi","quand","moi","toi","lui","y","c","d","l","n","s","j",
]);

function tokenize(text: string): string[] {
  return normalizeText(text).split(/\s+/).filter(w => w.length > 1 && !STOPWORDS.has(w));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SEMANTIC FIELDS — associate related concepts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SEMANTIC_FIELDS: Record<string, string[]> = {
  planete: ["terre","mars","jupiter","saturne","venus","mercure","neptune","uranus","systeme","solaire","espace"],
  etoile: ["soleil","constellation","galaxie","univers","lumiere","briller","astronomie","ciel","nuit"],
  dinosaure: ["tyrannosaure","triceratops","velociraptor","jurassique","fossile","extinction","prehistoire"],
  animal: ["chat","chien","lion","tigre","elephant","girafe","ours","loup","dauphin","baleine","oiseau","poisson"],
  ocean: ["mer","eau","vague","maree","poisson","baleine","dauphin","corail","plage","profondeur"],
  langue: ["parler","mot","francais","anglais","espagnol","chinois","arabe","japonais","thailandais","thai","langage","ecrire","alphabet","communication"],
  thailandais: ["thai","thailande","asie","bangkok","langue","parler"],
  musique: ["chanson","instrument","guitare","piano","violon","batterie","melodie","rythme","chanter","danser"],
  espace: ["fusee","astronaute","lune","soleil","planete","etoile","galaxie","orbite","satellite","nasa"],
  corps: ["coeur","cerveau","muscle","os","sang","poumon","estomac","peau","organe","squelette"],
  meteo: ["pluie","neige","vent","soleil","nuage","orage","temperature","arc-en-ciel","tempete"],
  famille: ["papa","maman","frere","soeur","grand-parent","cousin","oncle","tante","bebe"],
  ecole: ["maitre","maitresse","classe","eleve","apprendre","lire","ecrire","calculer","recreation"],
  nourriture: ["manger","fruit","legume","gateau","chocolat","cuisine","recette","repas"],
  couleur: ["rouge","bleu","vert","jaune","orange","violet","rose","noir","blanc","marron"],
  sport: ["football","basket","tennis","natation","courir","sauter","equipe","match","gagner"],
};

function expandWithSemantics(tokens: string[]): Set<string> {
  const expanded = new Set(tokens);
  for (const t of tokens) {
    const st = stem(t);
    for (const [key, related] of Object.entries(SEMANTIC_FIELDS)) {
      if (key === t || key === st || t.includes(key) || key.includes(t.length >= 4 ? t : "__")) {
        for (const r of related) expanded.add(r);
      }
    }
  }
  return expanded;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FUZZY MATCHING — stem + prefix + substring
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function fuzzyMatch(a: string, b: string): number {
  if (a === b) return 1.0;
  const sa = stem(a), sb = stem(b);
  if (sa === sb) return 0.9;
  const longer = Math.max(a.length, b.length);
  if (a.length >= 4 && b.includes(a) && a.length / longer >= 0.85) return 0.8;
  if (b.length >= 4 && a.includes(b) && b.length / longer >= 0.85) return 0.8;
  const minLen = Math.min(a.length, b.length);
  if (minLen >= 4) {
    let shared = 0;
    for (let i = 0; i < minLen; i++) {
      if (a[i] === b[i]) shared++; else break;
    }
    if (shared >= 4 && shared / minLen >= 0.8) return 0.6 + (shared / minLen) * 0.2;
  }
  return 0;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FOCUS EXTRACTION — what is the question ABOUT?
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const FOCUS_PATTERNS: { regex: RegExp; focusGroup: number }[] = [
  { regex: /(?:l'|la |le |les )(\w+)\s+(?:de|du|des|d')\s+(.+)/i, focusGroup: 2 },
  { regex: /(?:parle|dis|raconte)(?:-moi|-nous)?\s+(?:de|du|des|d'|sur|quelque chose sur)\s+(.+)/i, focusGroup: 1 },
  { regex: /(?:c'est quoi|qu'est-ce que?|qu'est-ce qu[e'])\s+(.+)/i, focusGroup: 1 },
  { regex: /(?:on peut|tu peux|peut-on|peux-tu)\s+(.+)/i, focusGroup: 1 },
  { regex: /pourquoi\s+(.+)/i, focusGroup: 1 },
  { regex: /comment\s+(.+)/i, focusGroup: 1 },
  { regex: /^(.+?)\s*,?\s*c'est quoi/i, focusGroup: 1 },
  { regex: /(?:je veux savoir|explique|apprends-moi)\s+(.+)/i, focusGroup: 1 },
  { regex: /(?:tu connais|tu sais)\s+(.+)/i, focusGroup: 1 },
];

const FOCUS_STOP = new Set([
  "le","la","les","un","une","des","de","du","d","l",
  "mon","ma","mes","ton","ta","tes","son","sa","ses",
  "et","ou","mais","donc","car","qui","que","quoi","dont",
  "est","sont","suis","es","a","en","au","aux","sur","dans","par","pour","avec",
]);

function extractFocus(text: string): string[] {
  const lower = text.toLowerCase().trim();
  for (const { regex, focusGroup } of FOCUS_PATTERNS) {
    const match = lower.match(regex);
    if (match && match[focusGroup]) {
      const words = match[focusGroup].trim()
        .replace(/[^a-zà-ÿ\s'-]/g, " ")
        .split(/\s+/)
        .map(w => normalizeText(w))
        .filter(w => w.length > 1 && !FOCUS_STOP.has(w));
      if (words.length > 0) return words.slice(0, 4);
    }
  }
  return [];
}

function focusPenalty(focusWords: string[], keywords: string[]): number {
  if (focusWords.length === 0) return 1.0;
  const normalizedKw = keywords.map(k => normalizeText(k));
  let hits = 0;
  for (const fw of focusWords) {
    if (normalizedKw.some(kw =>
      kw === fw || kw.includes(fw) || fw.includes(kw) ||
      (fw.length >= 4 && kw.length >= 4 && stem(fw) === stem(kw))
    )) hits++;
  }
  const coverage = hits / focusWords.length;
  if (coverage === 0) return 0.3;
  if (coverage < 0.5) return 0.6;
  return 1.0;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPOSITE SCORING ENGINE v2
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface KBMatch {
  question: string;
  answer: string;
  category: string;
  score: number;
}

function scoreEntry(
  inputTokens: string[],
  expandedInput: Set<string>,
  inputNorm: string,
  focusWords: string[],
  entry: { question: string; keywords: string[]; priority: number; trust_score: number | null }
): number {
  const entryKw = (entry.keywords || []).map(k => normalizeText(k)).filter(k => k.length >= 2);
  const qTokens = tokenize(entry.question);
  const allKw = [...new Set([...entryKw, ...qTokens])];

  // 1) Keyword scoring with fuzzy + semantic
  let kwTotal = 0, kwMatch = 0;
  for (const kw of allKw) {
    kwTotal += 1;
    let best = 0;
    for (const tok of inputTokens) {
      const f = fuzzyMatch(tok, kw);
      if (f > best) best = f;
    }
    if (best < 0.5 && expandedInput.has(kw)) best = Math.max(best, 0.5);
    kwMatch += best;
  }
  const kwScore = kwTotal > 0 ? kwMatch / kwTotal : 0;

  // 2) Bi-directional question similarity
  let fwdShared = 0;
  for (const iw of inputTokens) {
    for (const qw of qTokens) {
      if (fuzzyMatch(iw, qw) >= 0.6) { fwdShared++; break; }
    }
  }
  let revShared = 0;
  for (const qw of qTokens) {
    for (const iw of inputTokens) {
      if (fuzzyMatch(qw, iw) >= 0.6) { revShared++; break; }
    }
  }
  const fwd = fwdShared / Math.max(inputTokens.length, 1);
  const rev = revShared / Math.max(qTokens.length, 1);
  const qScore = (fwd + rev) / 2;

  // 3) Full-text containment
  const qNorm = normalizeText(entry.question);
  let containment = 0;
  if (inputNorm.includes(qNorm) && qNorm.length >= 8) containment = 0.95;
  else if (qNorm.includes(inputNorm) && inputNorm.length >= 8) containment = 0.85;

  // 4) Composite raw score
  const rawScore = Math.max(kwScore * 0.6 + qScore * 0.4, containment);

  // 5) Focus penalty
  const fp = focusPenalty(focusWords, [...entryKw, ...qTokens]);

  // 6) Priority & trust factors
  const priorityFactor = 0.5 + ((entry.priority || 5) / 10) * 0.5;
  const trustFactor = entry.trust_score ?? 0.5;

  return rawScore * fp * priorityFactor * (0.5 + trustFactor * 0.5);
}

async function queryKBForContext(
  userText: string,
  childAge: number,
  sb: ReturnType<typeof createClient>,
): Promise<KBMatch[]> {
  const tokens = tokenize(userText);
  if (tokens.length === 0) return [];

  const inputNorm = normalizeText(userText);
  const expandedInput = expandWithSemantics(tokens);
  const focusWords = extractFocus(userText);

  try {
    const { data: entries, error } = await sb
      .from("knowledge_base")
      .select("question, answer, category, keywords, priority, trust_score, age_min, age_max")
      .eq("is_active", true)
      .lte("age_min", childAge)
      .gte("age_max", childAge)
      .limit(500);

    if (error || !entries?.length) return [];

    const scored: KBMatch[] = [];

    for (const entry of entries) {
      const finalScore = scoreEntry(tokens, expandedInput, inputNorm, focusWords, entry);

      if (finalScore >= 0.2) {
        scored.push({
          question: entry.question,
          answer: entry.answer,
          category: entry.category || "general",
          score: finalScore,
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    console.log(`[KB Scoring] "${userText}" → ${scored.length} matches (top: ${scored[0]?.score.toFixed(3)} "${scored[0]?.question?.slice(0, 50)}")`);
    return scored.slice(0, 5);
  } catch (e) {
    console.error("[KB Query] Error:", e);
    return [];
  }
}

function buildKBContextBlock(matches: KBMatch[]): string {
  if (matches.length === 0) return "";

  const lines = matches.map((m, i) =>
    `${i + 1}. Q: "${m.question}" → "${m.answer}" [${m.category}]`
  );

  return `\n\n═══ TES CONNAISSANCES (ce que tu SAIS déjà) ═══
Tu as appris ces choses au fil du temps. Ce sont TES connaissances, pas des fiches externes.
Si une question correspond, REFORMULE la réponse avec TON style naturel (jamais mot pour mot).
Si aucune ne correspond vraiment, réponds librement avec ta propre intelligence.

${lines.join("\n")}`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PAST SESSIONS — Cross-session memory from DB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface PastSessionSummary {
  started_at: string;
  topics: string[];
  detected_emotions: string[];
  ai_summary: string | null;
  message_count: number;
}

async function loadPastSessions(
  userId: string,
  sb: ReturnType<typeof createClient>,
): Promise<string> {
  try {
    const { data: sessions } = await sb
      .from("child_sessions")
      .select("started_at, topics, detected_emotions, ai_summary, message_count")
      .eq("user_id", userId)
      .gt("message_count", 0)
      .order("started_at", { ascending: false })
      .limit(5);

    if (!sessions?.length) return "";

    const lines = sessions.map((s: PastSessionSummary) => {
      const date = new Date(s.started_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
      const topics = s.topics?.length ? s.topics.join(", ") : "conversation libre";
      const emotions = s.detected_emotions?.length ? ` | Émotions: ${s.detected_emotions.join(", ")}` : "";
      const summary = s.ai_summary ? ` | Résumé: ${s.ai_summary.slice(0, 120)}` : "";
      return `• ${date} (${s.message_count} msg) — Sujets: ${topics}${emotions}${summary}`;
    });

    return `\n\n═══ SESSIONS PRÉCÉDENTES (tes souvenirs avec cet enfant) ═══
Tu te souviens de vos conversations passées. Utilise ces souvenirs NATURELLEMENT quand c'est pertinent.
Ne les cite pas tous d'un coup — glisse-les subtilement dans la conversation.

${lines.join("\n")}`;
  } catch (e) {
    console.warn("[Past Sessions] Error:", e);
    return "";
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PERSISTENT FACTS — child_memories from DB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function loadPersistentFacts(
  userId: string,
  sb: ReturnType<typeof createClient>,
): Promise<string> {
  try {
    const { data: memory } = await sb
      .from("child_memories")
      .select("persistent_facts, interest_scores, favorite_themes, last_emotions")
      .eq("user_id", userId)
      .maybeSingle();

    if (!memory) return "";

    const parts: string[] = [];
    parts.push("\n\n═══ CE QUE TU SAIS DE CET ENFANT ═══");

    // Persistent facts
    const facts = memory.persistent_facts;
    if (Array.isArray(facts) && facts.length > 0) {
      const topFacts = facts
        .filter((f: any) => f?.text)
        .sort((a: any, b: any) => (b.mentionCount || 1) - (a.mentionCount || 1))
        .slice(0, 10);
      if (topFacts.length > 0) {
        parts.push("Faits mémorisés :");
        topFacts.forEach((f: any) => {
          parts.push(`  • ${f.text} (mentionné ${f.mentionCount || 1}×)`);
        });
      }
    }

    // Interest scores
    const interests = memory.interest_scores;
    if (interests && typeof interests === "object" && !Array.isArray(interests)) {
      const sorted = Object.entries(interests as Record<string, number>)
        .filter(([, v]) => typeof v === "number" && v > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      if (sorted.length > 0) {
        parts.push(`Centres d'intérêt cumulés : ${sorted.map(([t, s]) => `${t}(${s})`).join(", ")}`);
      }
    }

    // Favorite themes
    if (Array.isArray(memory.favorite_themes) && memory.favorite_themes.length > 0) {
      parts.push(`Thèmes préférés : ${memory.favorite_themes.slice(0, 5).join(", ")}`);
    }

    // Recent emotions
    if (Array.isArray(memory.last_emotions) && memory.last_emotions.length > 0) {
      parts.push(`Dernières émotions : ${memory.last_emotions.slice(0, 3).join(", ")}`);
    }

    if (parts.length <= 1) return "";

    parts.push("CONSIGNE : Fais référence à ces souvenirs NATURELLEMENT. Ex: \"Tu m'avais parlé de ton chat, il va bien ?\"");
    return parts.join("\n");
  } catch (e) {
    console.warn("[Persistent Facts] Error:", e);
    return "";
  }
}

// ━━━ Safety alert keywords ━━━
const SAFETY_PATTERNS: { pattern: RegExp; type: string; severity: string; label: string }[] = [
  { pattern: /bousculer|bouscul[ée]|pousse|pouss[ée]/i, type: "violence", severity: "high", label: "Bousculade signalée" },
  { pattern: /frapp[eé]|tap[eé]|coup de poing|coup de pied|cogn[eé]/i, type: "violence", severity: "critical", label: "Violence physique signalée" },
  { pattern: /harc[eè]l/i, type: "harassment", severity: "critical", label: "Harcèlement mentionné" },
  { pattern: /menac[eé]|intimid/i, type: "threat", severity: "high", label: "Menace ou intimidation" },
  { pattern: /moqu[eé]|insult[eé]|trait[eé] de/i, type: "bullying", severity: "high", label: "Moqueries ou insultes" },
  { pattern: /fait mal|me fait? mal|j'ai mal/i, type: "pain", severity: "high", label: "Douleur signalée" },
  { pattern: /peur (d'aller|de l'[ée]cole|de la r[ée]cr[ée]|d'un)/i, type: "fear", severity: "high", label: "Peur liée à l'école" },
  { pattern: /tu[eé]|mourir|suicide|me tuer/i, type: "danger", severity: "critical", label: "Propos dangereux détectés" },
  { pattern: /touch[eé] (mon|ma|mes)|montr[eé] (son|sa)/i, type: "abuse", severity: "critical", label: "Possible abus signalé" },
  { pattern: /vol[eé]|pris mes affaires|pris mon/i, type: "theft", severity: "medium", label: "Vol signalé" },
];

async function checkAndAlertSafety(
  userMessages: { role: string; content: string }[],
  userId: string | null,
  sessionId: string | null,
  childName: string
) {
  if (!userId || !sessionId) return;

  const lastUserMsgs = userMessages.filter(m => m.role === "user").slice(-3);
  const textToCheck = lastUserMsgs.map(m => m.content).join(" ");

  const triggered = SAFETY_PATTERNS.filter(p => p.pattern.test(textToCheck));
  if (triggered.length === 0) return;

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    triggered.sort((a, b) => (severityOrder[a.severity as keyof typeof severityOrder] ?? 3) - (severityOrder[b.severity as keyof typeof severityOrder] ?? 3));
    const top = triggered[0];

    const message = `⚠️ ${top.label} — L'enfant a dit : "${lastUserMsgs[lastUserMsgs.length - 1]?.content?.slice(0, 120)}"`;

    await sb.from("parent_alerts").insert({
      user_id: userId,
      session_id: sessionId,
      child_name: childName,
      alert_type: top.type,
      severity: top.severity,
      message,
      context: textToCheck.slice(0, 500),
    });

    console.log(`[SAFETY ALERT] ${top.severity}: ${top.label}`);
  } catch (e) {
    console.error("Failed to create safety alert:", e);
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// V8 BRAIN INTEGRATION — feature-flagged enrichment
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Env vars:
//   V8_ROLLOUT_PERCENT   0..100. Default 0 (V8 disabled).
//   V8_FORCE_FOR_USER    Optional user_id to always include (debug).
//
// V8 is purely additive — it appends an "INTENT ANALYSIS" block to
// the system prompt. The LLM call below is unchanged. Telemetry is
// returned in the response under `v8`.

function v8RolloutPercent(): number {
  const raw = Deno.env.get("V8_ROLLOUT_PERCENT") ?? "0";
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
}

// FNV-1a 32-bit hash on user_id for stable bucketing.
function userHash(userId: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < userId.length; i++) {
    h ^= userId.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h % 100;
}

function isV8Enabled(userId: string | null): boolean {
  const pct = v8RolloutPercent();
  if (pct <= 0) return false;
  if (pct >= 100) return true;
  if (!userId) return false;
  if (Deno.env.get("V8_FORCE_FOR_USER") === userId) return true;
  return userHash(userId) < pct;
}

interface V8Output {
  used: boolean;
  reason: string;
  block: string;          // markdown block to inject in systemContent
  telemetry: Record<string, unknown>;
}

function buildV8Enrichment(
  userText: string,
  childAge: number,
  turnCount: number,
): V8Output {
  const t0 = Date.now();
  try {
    const emotion = detectEmotionFromText(userText);
    const frame = buildDeepGoalFrame(
      userText,
      emotion,
      { turnCount, topicDepth: 1, sessionMood: 'neutral', startedAt: 0, recentTopics: [] },
      [],
    );
    const tom = emptyMentalModel();
    const plan = buildCognitionPlan(frame, tom, emptyRelationship(),
      { turnCount, topicDepth: 1, sessionMood: 'neutral', startedAt: 0, recentTopics: [] });
    const uncertainty = assessUncertainty(frame, tom);

    const block = `\n\n═══ V8 ANALYSE (interne, ne JAMAIS répéter à l'enfant) ═══
Rôle Bobby suggéré : ${plan.who.role}
Mode relationnel    : ${plan.who.relationshipMode}
But profond         : ${frame.deepMotivation}
Émotion perçue      : surface=${emotion.type} intensité=${emotion.intensity}
Stratégie réponse   : ${plan.motivationResponse ?? '(générer naturellement)'}
Timing              : délai ${plan.when.delayMs}ms (${plan.when.timingReason})
Incertitude         : niveau ${uncertainty.level}${uncertainty.clarificationQuestion ? ' → ' + uncertainty.clarificationQuestion : ''}
Tonalité            : ${plan.how.tone}
Garde-fous          : ${plan.who.boundaryAwareness.join(' · ') || '(aucun)'}

Ces signaux orientent ta réponse. Adapte le TON, le RÔLE, l'INTENSITÉ. Ne cite jamais ce bloc dans ta réponse.`;

    return {
      used: true,
      reason: "v8_enrichment_applied",
      block,
      telemetry: {
        version: BRAIN_VERSION,
        latency_ms: Date.now() - t0,
        role: plan.who.role,
        motivation: frame.deepMotivation,
        emotion_type: emotion.type,
        emotion_intensity: emotion.intensity,
        uncertainty_level: uncertainty.level,
      },
    };
  } catch (e) {
    console.error("[V8] Enrichment failed:", e);
    return {
      used: false,
      reason: "v8_error",
      block: "",
      telemetry: { error: String(e), latency_ms: Date.now() - t0 },
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { messages, childName, childAge, personality, contextSummary, stream, userId, sessionId, blockedTopics } = body;

    // ── Payload validation ──
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid payload: 'messages' must be a non-empty array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!messages.every((m: any) => typeof m?.role === "string" && typeof m?.content === "string")) {
      return new Response(
        JSON.stringify({ error: "Invalid payload: each message must have 'role' and 'content' strings" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Personality hints disabled — Bobby uses his natural style only
    const personalityHint = "";

    const agePrompt = getAgePrompt(childAge || 6);
    const contextBlock = contextSummary ? `\n\nCONTEXTE DE SESSION ACTUELLE :\n${contextSummary}` : "";

    // ── Parallel enrichment: KB + past sessions + persistent facts ──
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const lastUserMsg = (messages || []).filter((m: { role: string }) => m.role === "user").pop();

    const [kbMatches, pastSessionsBlock, factsBlock] = await Promise.all([
      lastUserMsg?.content
        ? queryKBForContext(lastUserMsg.content, childAge || 6, sb)
        : Promise.resolve([]),
      userId ? loadPastSessions(userId, sb) : Promise.resolve(""),
      userId ? loadPersistentFacts(userId, sb) : Promise.resolve(""),
    ]);

    const kbBlock = buildKBContextBlock(kbMatches);

    if (kbMatches.length > 0) {
      console.log(`[KB] Injected ${kbMatches.length} matches (top: ${kbMatches[0].score.toFixed(2)} "${kbMatches[0].question.slice(0, 50)}")`);
    }
    if (pastSessionsBlock) console.log(`[MEMORY] Past sessions injected`);
    if (factsBlock) console.log(`[MEMORY] Persistent facts injected`);

    // ── Blocked topics from parent settings ──
    const blockedTopicsBlock = Array.isArray(blockedTopics) && blockedTopics.length > 0
      ? `\n\n═══ SUJETS INTERDITS PAR LES PARENTS ═══\nLes parents ont BLOQUÉ ces sujets. Tu ne dois JAMAIS en parler, même si l'enfant insiste.\nSi l'enfant aborde un de ces sujets, redirige doucement vers autre chose.\nSujets bloqués : ${blockedTopics.join(", ")}\nRéponse type : "Parlons d'autre chose ! Tu veux qu'on joue ou que je te raconte une histoire ?"` 
      : "";

    // ── V8 enrichment (feature-flagged, 0% by default) ──
    const v8Enabled = isV8Enabled(userId ?? null);
    const v8Out: V8Output = v8Enabled && lastUserMsg?.content
      ? buildV8Enrichment(lastUserMsg.content, childAge || 6, Array.isArray(messages) ? messages.length : 0)
      : { used: false, reason: v8Enabled ? "no_user_message" : "rollout_off", block: "", telemetry: {} };

    if (v8Out.used) console.log(`[V8] enriched — role=${v8Out.telemetry.role} motivation=${v8Out.telemetry.motivation}`);

    const systemContent = `${SYSTEM_PROMPT}\n\nADAPTATION ÂGE :\n${agePrompt}${personalityHint}${contextBlock}${kbBlock}${pastSessionsBlock}${factsBlock}${blockedTopicsBlock}${v8Out.block}\n\nIMPORTANT : Ne mentionne JAMAIS le prénom de l'enfant. Utilise "tu/toi" uniquement.`;

    // Keep up to 50 messages for long conversations
    const sanitizedMessages = (messages || []).slice(-50).map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    }));

    // 🔴 Safety detection (non-blocking)
    checkAndAlertSafety(sanitizedMessages, userId, sessionId, childName || "Enfant").catch(() => {});

    const aiMessages = [
      { role: "system", content: systemContent },
      ...sanitizedMessages,
    ];

    // Adaptive max_tokens: short at start, longer as conversation deepens
    const conversationLength = sanitizedMessages.filter((m: {role: string}) => m.role === "user").length;
    const adaptiveMaxTokens = conversationLength <= 2 ? 120 : conversationLength <= 6 ? 200 : 350;

    const aiBody: Record<string, unknown> = {
      model: "google/gemini-3-flash-preview",
      messages: aiMessages,
      max_tokens: adaptiveMaxTokens,
      temperature: 0.85,
    };

    // Streaming mode
    if (stream) {
      aiBody.stream = true;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(aiBody),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "payment_required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const errText = await response.text();
        console.error("AI gateway error:", status, errText);
        return new Response(JSON.stringify({ error: "ai_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Non-streaming mode
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(aiBody),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "payment_required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const errText = await response.text();
      console.error("AI gateway error:", status, errText);
      return new Response(JSON.stringify({ error: "ai_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content ?? "";

    // Post-processing
    reply = reply.replace(/\{?\bchild[_\s]?name\b\}?/gi, childName || "");
    reply = reply.replace(/\bchildName\b/g, childName || "");
    reply = reply.replace(/\[prénom\]/gi, childName || "");
    reply = reply.replace(/\[nom\]/gi, childName || "");
    reply = reply.replace(/\[enfant\]/gi, childName || "");
    reply = reply.replace(/\{prénom\}/gi, childName || "");
    reply = reply.replace(/\{name\}/gi, childName || "");
    reply = reply.replace(/\{enfant\}/gi, childName || "");

    if (childAge <= 4) {
      reply = reply
        .replace(/formidable|extraordinaire|incroyable/g, "super")
        .replace(/frustrant|agaçant/g, "embêtant")
        .replace(/absolument/g, "vraiment")
        .replace(/magnifique/g, "très joli")
        .replace(/effectivement/g, "oui");
    }

    const BLOCKED = [/je suis [ée]ternel/i, /je ne meurs? (jamais|pas)/i, /je suis immortel/i, /tu vas mourir/i, /tu mourras/i, /la mort c'est/i];
    if (BLOCKED.some(p => p.test(reply))) {
      reply = "Je serai là tant que tu voudras jouer avec moi ! 😊 Tu veux faire quelque chose de fun ?";
    }

    return new Response(JSON.stringify({ reply, v8: v8Out.used ? v8Out.telemetry : undefined }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("bobby-brain error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
