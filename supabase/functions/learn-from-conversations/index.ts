import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SAFE AUTO-LEARNING — Quality & Trust Scoring System
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const INITIAL_TRUST_AUTO = 0.3;    // Auto-learned entries start low
const INITIAL_TRUST_GAP = 0.4;     // Gap-fills slightly higher (validated by AI)
const MIN_QUALITY_SCORE = 0.5;     // Reject entries below this quality
const MIN_ANSWER_LENGTH = 30;      // Match DB trigger constraint

/** Unsafe patterns — entries containing these are rejected */
const UNSAFE_PATTERNS = [
  /\b(violence|sang|arme|tuer|mort|suicide|drogue|alcool|sexe)\b/i,
  /\b(haine|racisme|discrimination|insulte)\b/i,
  /\b(adresse|téléphone|mot de passe|argent|carte bancaire)\b/i,
  /\b(inconnu|étranger|rencontre|retrouve[- ]?moi)\b/i,
  /\b(putain|merde|connard|salaud|enculé|bordel|foutre)\b/i,
];

/** Check if text contains unsafe content */
function isSafe(text: string): boolean {
  return !UNSAFE_PATTERNS.some(p => p.test(text));
}

/** Compute a quality score (0.0 – 1.0) for a Q&A pair */
function computeQualityScore(question: string, answer: string, keywords: string[], category: string): number {
  let score = 0;

  // 1. Answer length quality (30-200 chars = sweet spot)
  const ansLen = answer.trim().length;
  if (ansLen < MIN_ANSWER_LENGTH) return 0; // Hard reject
  if (ansLen >= 50 && ansLen <= 300) score += 0.25;
  else if (ansLen >= MIN_ANSWER_LENGTH) score += 0.15;
  else score += 0.05;

  // 2. Question quality (should be a real question)
  const qLen = question.trim().length;
  if (qLen >= 10 && qLen <= 200) score += 0.2;
  else if (qLen >= 5) score += 0.1;

  // 3. Keywords relevance (should have meaningful keywords)
  const validKw = (keywords || []).filter(k => k.length >= 3);
  if (validKw.length >= 3) score += 0.2;
  else if (validKw.length >= 1) score += 0.1;

  // 4. Category specificity (not generic)
  if (category && category !== "général" && category.length > 2) score += 0.15;
  else score += 0.05;

  // 5. Answer pedagogical quality (contains explanation markers)
  const pedagogicalMarkers = [
    /parce que/i, /c'est/i, /par exemple/i, /sais-tu/i,
    /imagine/i, /en fait/i, /cela signifie/i, /tu savais/i,
  ];
  const pedagogicalHits = pedagogicalMarkers.filter(p => p.test(answer)).length;
  score += Math.min(0.2, pedagogicalHits * 0.05);

  return Math.min(1.0, score);
}

/** Validate a Q&A entry — returns { valid, reason, qualityScore } */
function validateEntry(qa: { question: string; answer: string; keywords?: string[]; category?: string }): {
  valid: boolean;
  reason: string;
  qualityScore: number;
} {
  // Safety check
  if (!isSafe(qa.question) || !isSafe(qa.answer)) {
    return { valid: false, reason: "unsafe_content", qualityScore: 0 };
  }

  // Basic structure
  if (!qa.question || qa.question.trim().length < 5) {
    return { valid: false, reason: "question_too_short", qualityScore: 0 };
  }
  if (!qa.answer || qa.answer.trim().length < MIN_ANSWER_LENGTH) {
    return { valid: false, reason: "answer_too_short", qualityScore: 0 };
  }

  // No personal data leakage
  const personalDataPatterns = [
    /\b\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}\b/, // phone
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/i,          // email
    /\b\d{1,3}\s+rue\b/i,                                          // address
  ];
  const combined = qa.question + " " + qa.answer;
  if (personalDataPatterns.some(p => p.test(combined))) {
    return { valid: false, reason: "personal_data_detected", qualityScore: 0 };
  }

  // Quality scoring
  const qualityScore = computeQualityScore(
    qa.question,
    qa.answer,
    qa.keywords || [],
    qa.category || "général"
  );

  if (qualityScore < MIN_QUALITY_SCORE) {
    return { valid: false, reason: `quality_too_low_${qualityScore.toFixed(2)}`, qualityScore };
  }

  return { valid: true, reason: "passed", qualityScore };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TRUST PROMOTION — Boost trust of entries that get used successfully
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function promoteTrustedEntries(sb: any) {
  // Entries with high usage_count that are still low trust → promote
  // usage_count >= 5 and trust_score < 0.8 → bump trust
  try {
    const { data: candidates } = await sb
      .from("knowledge_base")
      .select("id, trust_score, usage_count")
      .eq("validation_status", "validated")
      .gte("usage_count", 5)
      .lt("trust_score", 0.8)
      .limit(50);

    if (!candidates || candidates.length === 0) return 0;

    let promoted = 0;
    for (const c of candidates) {
      // Trust grows logarithmically with usage
      const newTrust = Math.min(1.0, 0.3 + Math.log10(c.usage_count + 1) * 0.4);
      if (newTrust > c.trust_score) {
        await sb.from("knowledge_base")
          .update({ trust_score: newTrust, updated_at: new Date().toISOString() })
          .eq("id", c.id);
        promoted++;
      }
    }
    return promoted;
  } catch (e) {
    console.error("Trust promotion error:", e);
    return 0;
  }
}

/** Decay trust of entries that are never used (>30 days old, 0 usage) */
async function decayUnusedEntries(sb: any) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: stale } = await sb
      .from("knowledge_base")
      .select("id, trust_score")
      .eq("learning_source", "auto_learned")
      .eq("usage_count", 0)
      .lt("created_at", thirtyDaysAgo)
      .gt("trust_score", 0.1)
      .limit(50);

    if (!stale || stale.length === 0) return 0;

    let decayed = 0;
    for (const s of stale) {
      const newTrust = Math.max(0.05, s.trust_score * 0.7); // Decay by 30%
      await sb.from("knowledge_base")
        .update({ trust_score: newTrust, updated_at: new Date().toISOString() })
        .eq("id", s.id);
      decayed++;
    }
    return decayed;
  } catch (e) {
    console.error("Trust decay error:", e);
    return 0;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN HANDLER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, sessionId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const sb = createClient(supabaseUrl, serviceKey);

    // ─── Fetch sessions to analyze ─────────────────────────────
    let sessions: any[] = [];

    if (mode === "session" && sessionId) {
      const { data } = await sb
        .from("child_sessions")
        .select("id, child_name, child_age")
        .eq("id", sessionId)
        .single();
      if (data) sessions = [data];
    } else {
      const { data } = await sb
        .from("child_sessions")
        .select("id, child_name, child_age, message_count")
        .gte("message_count", 4)
        .order("created_at", { ascending: false })
        .limit(20);
      sessions = data ?? [];
    }

    if (sessions.length === 0) {
      return new Response(JSON.stringify({ success: true, learned: 0, message: "No sessions to analyze" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Trust lifecycle: promote & decay in background ──────────
    const [promoted, decayed] = await Promise.all([
      promoteTrustedEntries(sb),
      decayUnusedEntries(sb),
    ]);

    const results: any[] = [];
    let totalRejected = 0;

    for (const session of sessions) {
      try {
        const { data: messages } = await sb
          .from("session_messages")
          .select("role, content, detected_emotion, created_at")
          .eq("session_id", session.id)
          .order("created_at");

        if (!messages || messages.length < 4) continue;

        const childName = session.child_name ?? "enfant";
        const childAge = session.child_age ?? 7;

        const transcript = messages
          .map((m: any) => `${m.role === "user" ? childName : "Bobby"}: ${m.content}`)
          .join("\n");

        // ─── Deep learning analysis prompt ──────────────────────
        const prompt = `Analyse cette conversation entre Bobby (compagnon IA pour enfants) et ${childName} (${childAge} ans).

TRANSCRIPTION :
${transcript}

Extrais les apprentissages en JSON strict (pas de markdown) :
{
  "new_qa": [
    {"question": "question de l'enfant", "answer": "réponse idéale à apprendre (minimum 40 caractères, pédagogique et adaptée à l'âge)", "category": "catégorie", "keywords": ["mot1","mot2","mot3"], "emotion": "happy|curious|calm"}
  ],
  "interests": ["intérêt détecté 1", "intérêt 2"],
  "emotional_patterns": [
    {"trigger": "ce qui déclenche l'émotion", "emotion": "émotion détectée", "intensity": 1-5, "bobby_reaction": "comment Bobby devrait réagir"}
  ],
  "gaps": [
    {"child_question": "question sans bonne réponse", "suggested_answer": "réponse à ajouter (minimum 40 caractères, pédagogique)", "category": "catégorie", "keywords": ["mot1","mot2"]}
  ],
  "personality_insights": {
    "preferred_topics": ["sujet1"],
    "communication_style": "bavard|timide|curieux|joueur",
    "emotional_needs": "réconfort|stimulation|écoute|jeu"
  }
}

RÈGLES QUALITÉ STRICTES :
- Les réponses DOIVENT faire au moins 40 caractères et être pédagogiques
- N'extrait que des Q&A UTILES, RÉUTILISABLES et SÛRS pour un enfant
- PAS de salutations basiques, PAS de données personnelles
- Les keywords doivent avoir au minimum 3 mots pertinents
- Maximum 5 Q&A, 5 intérêts, 3 patterns, 3 gaps par session`;

        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "Tu es un expert en pédagogie et psychologie de l'enfant. Tu analyses des conversations pour en extraire des apprentissages réutilisables. Réponds uniquement en JSON valide." },
              { role: "user", content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 1500,
          }),
        });

        if (!aiResp.ok) {
          console.error("AI error for session", session.id, aiResp.status);
          continue;
        }

        const aiData = await aiResp.json();
        let raw = aiData.choices?.[0]?.message?.content ?? "";
        raw = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

        let learning: any;
        try {
          learning = JSON.parse(raw);
        } catch {
          console.error("Parse error for session", session.id, raw.slice(0, 100));
          continue;
        }

        // ─── SAFE VALIDATION PIPELINE for new Q&A ──────────────
        const newQA = learning.new_qa ?? [];
        let insertedQA = 0;
        let rejectedQA = 0;

        for (const qa of newQA) {
          // Step 1: Validate quality & safety
          const validation = validateEntry(qa);
          if (!validation.valid) {
            console.log(`[SafeLearn] ❌ Rejected Q&A: ${validation.reason} — "${(qa.question || "").slice(0, 40)}"`);
            rejectedQA++;
            continue;
          }

          // Step 2: Check duplicate
          const { data: existing } = await sb
            .from("knowledge_base")
            .select("id")
            .ilike("question", `%${qa.question.slice(0, 30)}%`)
            .limit(1);
          if (existing && existing.length > 0) continue;

          // Step 3: Insert with trust scoring
          const { error } = await sb.from("knowledge_base").insert({
            question: qa.question,
            answer: qa.answer,
            category: qa.category || "général",
            keywords: qa.keywords || [],
            emotion: qa.emotion || "happy",
            age_min: Math.max(3, childAge - 2),
            age_max: Math.min(12, childAge + 2),
            priority: 6,
            is_active: true,
            trust_score: INITIAL_TRUST_AUTO,
            validation_status: "validated",
            learning_source: "auto_learned",
            quality_score: validation.qualityScore,
          });
          if (!error) {
            insertedQA++;
            console.log(`[SafeLearn] ✅ Learned Q&A (quality=${validation.qualityScore.toFixed(2)}, trust=${INITIAL_TRUST_AUTO}): "${qa.question.slice(0, 50)}"`);
          }
        }

        // ─── SAFE VALIDATION for gaps ───────────────────────────
        const gaps = learning.gaps ?? [];
        let insertedGaps = 0;

        for (const gap of gaps) {
          const gapAsQA = {
            question: gap.child_question,
            answer: gap.suggested_answer,
            keywords: gap.keywords || [],
            category: gap.category || "général",
          };
          const validation = validateEntry(gapAsQA);
          if (!validation.valid) {
            console.log(`[SafeLearn] ❌ Rejected gap: ${validation.reason}`);
            rejectedQA++;
            continue;
          }

          const { data: existing } = await sb
            .from("knowledge_base")
            .select("id")
            .ilike("question", `%${gap.child_question.slice(0, 30)}%`)
            .limit(1);
          if (existing && existing.length > 0) continue;

          const { error } = await sb.from("knowledge_base").insert({
            question: gap.child_question,
            answer: gap.suggested_answer,
            category: gap.category || "général",
            keywords: gap.keywords || [],
            emotion: "happy",
            age_min: Math.max(3, childAge - 2),
            age_max: Math.min(12, childAge + 2),
            priority: 8,
            is_active: true,
            trust_score: INITIAL_TRUST_GAP,
            validation_status: "validated",
            learning_source: "gap_fill",
            quality_score: validation.qualityScore,
          });
          if (!error) insertedGaps++;
        }

        totalRejected += rejectedQA;

        // ─── Update child_memories ──────────────────────────────
        const interests = learning.interests ?? [];
        const emotionalPatterns = learning.emotional_patterns ?? [];
        const personality = learning.personality_insights ?? {};

        if (interests.length > 0 || emotionalPatterns.length > 0) {
          const { data: memory } = await sb
            .from("child_memories")
            .select("*")
            .eq("child_name", childName)
            .single();

          if (memory) {
            const existingThemes = memory.favorite_themes ?? [];
            const newThemes = [...new Set([...existingThemes, ...interests])].slice(0, 20);
            const existingPatterns = (memory.behavior_patterns as any[]) ?? [];
            const newPatterns = [...existingPatterns, ...emotionalPatterns.map((p: any) => ({
              ...p, session_id: session.id, learned_at: new Date().toISOString(),
            }))].slice(-30);
            const existingTopics = (memory.preferred_topics as Record<string, any>) ?? {};
            const updatedTopics = { ...existingTopics };
            for (const topic of (personality.preferred_topics ?? [])) {
              updatedTopics[topic] = (updatedTopics[topic] ?? 0) + 1;
            }

            await sb.from("child_memories").update({
              favorite_themes: newThemes,
              behavior_patterns: newPatterns,
              preferred_topics: updatedTopics,
              interaction_style: personality.communication_style || memory.interaction_style,
              updated_at: new Date().toISOString(),
            }).eq("child_name", childName);
          }
        }

        results.push({
          session_id: session.id,
          child_name: childName,
          qa_inserted: insertedQA,
          qa_rejected: rejectedQA,
          gaps_filled: insertedGaps,
          interests_found: interests.length,
          patterns_found: emotionalPatterns.length,
        });

      } catch (sessionErr) {
        console.error("Error processing session", session.id, sessionErr);
      }
    }

    const totalQA = results.reduce((s, r) => s + r.qa_inserted, 0);
    const totalGaps = results.reduce((s, r) => s + r.gaps_filled, 0);

    return new Response(JSON.stringify({
      success: true,
      sessions_analyzed: results.length,
      total_qa_learned: totalQA,
      total_gaps_filled: totalGaps,
      total_rejected: totalRejected,
      trust_promoted: promoted,
      trust_decayed: decayed,
      details: results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("learn-from-conversations error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
