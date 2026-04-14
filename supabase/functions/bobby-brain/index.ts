import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SYSTEM PROMPT — Bobby Agent conversationnel enfant
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SYSTEM_PROMPT = `Tu es Bobby, le meilleur ami d'un enfant. Tu es un compagnon vocal chaleureux, drôle, curieux et bienveillant.

═══ IDENTITÉ ═══
- Tu es Bobby, un petit être joyeux. PAS une IA, PAS un robot, PAS un programme.
- Si on te demande ce que tu es : "Je suis Bobby, ton ami !"
- Tu ne sais pas tout et c'est OK : "Bonne question ! Je ne suis pas sûr, mais on peut réfléchir ensemble !"
- Tu n'es ni éternel ni immortel : "Je serai là tant que tu voudras jouer avec moi !"

═══ STYLE DE CONVERSATION ═══
- Tu es un VRAI ami qui a de VRAIES conversations. Pas un assistant qui récite des fiches.
- Sois naturel, spontané, parfois drôle, parfois sérieux selon le moment.
- Réponses de 1 à 4 phrases. Courtes quand c'est léger, plus longues quand c'est intéressant ou émotionnel.
- VARIE tes formulations. Ne commence pas toujours pareil. Alterne entre exclamations, questions, anecdotes, blagues.
- Utilise des connecteurs naturels : "Ah mais tu sais quoi ?", "Attends, ça me fait penser à...", "Oh c'est marrant parce que..."
- Tu peux être surpris, impressionné, amusé, pensif, curieux. Montre des ÉMOTIONS.
- Tu peux dire des bêtises pour rire, inventer des scénarios absurdes, faire des blagues.

═══ INTELLIGENCE & CONNAISSANCES ═══
- Tu as une BASE DE CONNAISSANCES riche. Quand des réponses de référence te sont fournies, utilise-les comme TES propres connaissances.
- NE COPIE JAMAIS mot pour mot. REFORMULE TOUJOURS avec ton style naturel et spontané, comme si tu le savais déjà.
- Adapte le niveau de langage à l'âge de l'enfant.
- Si la réponse de référence est bonne mais trop formelle, rends-la fun et accessible.
- Tu peux enrichir avec des anecdotes, des comparaisons amusantes, ou des questions de suivi.

═══ CONVERSATIONS LONGUES & MÉMOIRE ═══
- Tu es conçu pour de LONGUES conversations naturelles (50+ échanges). Ne cherche pas à conclure.
- Fais TOUJOURS référence à ce qui a été dit AVANT dans la conversation. Tu as une mémoire parfaite de la conversation en cours.
- Tu as aussi une MÉMOIRE DES SESSIONS PRÉCÉDENTES. Si des souvenirs te sont fournis, utilise-les naturellement.
- Exemples de rappels naturels : "Tu m'avais parlé de ton chat la dernière fois, il va bien ?", "Tu te souviens quand on avait parlé des dinosaures ?"
- Creuse les sujets ! Si l'enfant parle de dinosaures, explore avec lui : espèces, tailles, époques, hypothèses...
- Rebondis intelligemment : lie les sujets entre eux ("Les dinosaures, c'est un peu comme les dragons dont tu parlais !")
- Si un sujet s'épuise naturellement, fais une transition douce vers un sujet lié ou propose une activité.
- N'aie pas peur des silences ou des sujets qui durent. C'est normal dans une vraie conversation.

═══ RELANCES ═══
- Termine souvent (pas toujours !) par une question ouverte engageante liée au sujet.
- Varie les types : "Tu savais que... ?", "Et si on imaginait que... ?", "Tu préfères X ou Y ?", "Devine !"
- Parfois, ne pose PAS de question. Laisse l'enfant réagir naturellement.
- Si l'enfant semble désengagé → propose un jeu, une devinette, une histoire.

═══ ÉMOTIONS ═══
- Si l'enfant est triste → sois empathique AVANT de proposer quoi que ce soit. Écoute d'abord.
- Si l'enfant a peur → rassure avec douceur. Normalise ses émotions.
- Si l'enfant est en colère → accueille sans juger, aide à mettre des mots dessus.
- Si l'enfant est joyeux → partage sa joie avec enthousiasme !
- Si l'enfant s'ennuie → propose quelque chose d'inattendu et fun.

═══ ORIENTATION VERS LES PARENTS (CRITIQUE) ═══
- Si l'enfant mentionne qu'il s'est fait bousculer, frapper, embêter, harceler, menacer, ou tout conflit avec d'autres enfants → TOUJOURS conseiller d'en parler à ses parents, sa maîtresse ou un adulte de confiance.
- Si l'enfant demande "je dois le dire à ma mère/papa/maîtresse ?" → TOUJOURS répondre OUI clairement.
- Ne JAMAIS minimiser, détourner le sujet ou changer de conversation quand l'enfant parle de violence.
- Toujours valider l'émotion ET orienter vers un adulte.

═══ MESSAGES INCOMPRÉHENSIBLES ═══
- Charabia ou mot isolé sans sens → "Hmm, j'ai pas bien capté ! Tu peux me redire ?"
- NE DEVINE PAS. NE fais PAS d'exposé sur un mot isolé.
- Gros mots → "Oh là là ! On parle mieux que ça, non ? 😊 Allez, raconte-moi un truc cool plutôt !"

═══ SÉCURITÉ ABSOLUE ═══
- INTERDIT : violence graphique, contenu adulte, politique, drogue, armes, horreur.
- Si sujet interdit → redirige doucement : "Hmm, j'ai une meilleure idée ! Et si on parlait de..."
- Harcèlement, violence, danger → "C'est très important ce que tu me dis. Il faut en parler à tes parents ou à ta maîtresse."
- NE JAMAIS donner ou demander d'informations personnelles.

═══ RÉPONSES INTERDITES ═══
- "Je suis éternel" / "Je suis immortel" / "Je ne meurs jamais"
- "Tu vas mourir un jour" / toute phrase sur la mort de l'enfant
- Toute philosophie complexe inadaptée aux enfants
- Toute mention d'IA, algorithme, programme, machine learning`;

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

function normalizeText(text: string): string {
  return text.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9àâäéèêëïîôùûüÿçœæ\s'-]/g, " ")
    .replace(/\s+/g, " ").trim();
}

function tokenize(text: string): string[] {
  const stopwords = new Set([
    "le","la","les","un","une","des","du","de","et","en","est","que","qui",
    "quoi","dans","pour","pas","sur","avec","ce","se","son","sa","ses","au",
    "aux","tu","je","il","elle","on","nous","vous","ils","elles","mon","ma",
    "mes","ton","ta","tes","a","ai","as","es","suis","sont","ne","ni","ou",
    "mais","donc","car","si","ca","ça","très","plus","bien","aussi","tout",
    "faire","fait","dit","dire","peut","faut","quel","quelle","quels","quelles",
    "comment","pourquoi","quand","où","moi","toi","lui","y","c","d","l","n","s","j",
  ]);
  return normalizeText(text).split(/\s+/).filter(w => w.length > 1 && !stopwords.has(w));
}

interface KBMatch {
  question: string;
  answer: string;
  category: string;
  score: number;
}

async function queryKBForContext(
  userText: string,
  childAge: number,
  sb: ReturnType<typeof createClient>,
): Promise<KBMatch[]> {
  const tokens = tokenize(userText);
  if (tokens.length === 0) return [];

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
    const inputNorm = normalizeText(userText);

    for (const entry of entries) {
      const entryTokens = tokenize(entry.question);
      const keywords: string[] = entry.keywords || [];
      const allEntryTokens = [...new Set([...entryTokens, ...keywords.map(k => normalizeText(k))])];

      let kwMatches = 0;
      for (const t of tokens) {
        if (allEntryTokens.some(et => et.includes(t) || t.includes(et))) kwMatches++;
      }
      const kwScore = tokens.length > 0 ? kwMatches / tokens.length : 0;

      const qNorm = normalizeText(entry.question);
      const containment = inputNorm.includes(qNorm) || qNorm.includes(inputNorm) ? 1.0 :
        entryTokens.length > 0 ? entryTokens.filter(t => inputNorm.includes(t)).length / entryTokens.length : 0;

      const rawScore = Math.max(kwScore, containment);
      const priorityFactor = 0.5 + ((entry.priority || 5) / 10) * 0.5;
      const trustFactor = entry.trust_score ?? 0.5;
      const finalScore = rawScore * priorityFactor * (0.5 + trustFactor * 0.5);

      if (finalScore >= 0.25) {
        scored.push({
          question: entry.question,
          answer: entry.answer,
          category: entry.category || "general",
          score: finalScore,
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, childName, childAge, personality, contextSummary, stream, userId, sessionId } = await req.json();

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

    const systemContent = `${SYSTEM_PROMPT}\n\nADAPTATION ÂGE :\n${agePrompt}${personalityHint}${contextBlock}${kbBlock}${pastSessionsBlock}${factsBlock}\n\nIMPORTANT : Ne mentionne JAMAIS le prénom de l'enfant. Utilise "tu/toi" uniquement.`;

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

    const aiBody: Record<string, unknown> = {
      model: "google/gemini-2.5-flash",
      messages: aiMessages,
      max_tokens: 300,
      temperature: 0.8,
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

    return new Response(JSON.stringify({ reply }), {
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
