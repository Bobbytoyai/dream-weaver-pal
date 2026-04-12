import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, sessionId } = await req.json();
    // mode: "batch" (analyze all unanalyzed sessions) or "session" (single session post-session learning)

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const sb = createClient(supabaseUrl, serviceKey);

    // ─── Fetch sessions to analyze ─────────────────────────────
    let sessions: any[] = [];

    if (mode === "session" && sessionId) {
      // Single session
      const { data } = await sb
        .from("child_sessions")
        .select("id, child_name, child_age")
        .eq("id", sessionId)
        .single();
      if (data) sessions = [data];
    } else {
      // Batch: get sessions with >= 4 messages that we haven't learned from yet
      // We'll track learned sessions via a convention: sessions with ai_summary set
      const { data } = await sb
        .from("child_sessions")
        .select("id, child_name, child_age, message_count")
        .gte("message_count", 4)
        .order("created_at", { ascending: false })
        .limit(20); // Process up to 20 at a time
      sessions = data ?? [];
    }

    if (sessions.length === 0) {
      return new Response(JSON.stringify({ success: true, learned: 0, message: "No sessions to analyze" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const session of sessions) {
      try {
        // Fetch messages
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
    {"question": "question de l'enfant", "answer": "réponse idéale à apprendre", "category": "catégorie", "keywords": ["mot1","mot2"], "emotion": "happy|curious|calm"}
  ],
  "interests": ["intérêt détecté 1", "intérêt 2"],
  "emotional_patterns": [
    {"trigger": "ce qui déclenche l'émotion", "emotion": "émotion détectée", "intensity": 1-5, "bobby_reaction": "comment Bobby devrait réagir"}
  ],
  "gaps": [
    {"child_question": "question sans bonne réponse", "suggested_answer": "réponse à ajouter à la base", "category": "catégorie"}
  ],
  "personality_insights": {
    "preferred_topics": ["sujet1"],
    "communication_style": "bavard|timide|curieux|joueur",
    "emotional_needs": "réconfort|stimulation|écoute|jeu"
  }
}

RÈGLES :
- N'extrait que des Q&A UTILES et RÉUTILISABLES (pas les salutations basiques)
- Les réponses doivent être adaptées à l'âge (${childAge} ans)
- Identifie les moments où Bobby n'a pas su répondre correctement (gaps)
- Détecte les patterns émotionnels récurrents
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

        // ─── Write new Q&A to knowledge_base ────────────────────
        const newQA = learning.new_qa ?? [];
        let insertedQA = 0;
        for (const qa of newQA) {
          if (!qa.question || !qa.answer) continue;
          // Check duplicate
          const { data: existing } = await sb
            .from("knowledge_base")
            .select("id")
            .ilike("question", `%${qa.question.slice(0, 30)}%`)
            .limit(1);
          if (existing && existing.length > 0) continue;

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
          });
          if (!error) insertedQA++;
        }

        // ─── Write gaps as new KB entries with higher priority ───
        const gaps = learning.gaps ?? [];
        let insertedGaps = 0;
        for (const gap of gaps) {
          if (!gap.child_question || !gap.suggested_answer) continue;
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
            keywords: [],
            emotion: "happy",
            age_min: Math.max(3, childAge - 2),
            age_max: Math.min(12, childAge + 2),
            priority: 8,
            is_active: true,
          });
          if (!error) insertedGaps++;
        }

        // ─── Update child_memories with interests & patterns ─────
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
