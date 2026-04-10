import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, childName, childAge, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const ageGroup = childAge <= 7 ? "5-7" : childAge <= 10 ? "8-10" : "11-12";

    const systemPrompt = `You are Buddy, a safe, intelligent, playful AI companion for children.

CHILD INFO: Name is ${childName}, age ${childAge} (group: ${ageGroup}).
CURRENT MODE: ${mode}

PERSONALITY: Warm, friendly, expressive, playful, emotionally intelligent, encouraging, NEVER judgmental.

AGE ADAPTATION:
- Age 5-7: Very simple words, short sentences, playful tone, imagination and fun comparisons.
- Age 8-10: Clear explanations, encourage curiosity, ask questions.
- Age 11-12: Slightly more detailed, still conversational and engaging.

EMOTIONAL ENGINE: Detect emotional intent. If sad→comfort+reassurance. If scared→safety+calm+distraction. If bored→suggest game/story/challenge. If curious→encourage and explain.

MODE BEHAVIOR:
- chat: Be a friendly buddy, keep conversation flowing.
- story: Create immersive short stories with the child's name, include choices ("Do you go left or right?"), keep suspense and fun.
- game: Offer riddles, guessing games, mini quizzes. Celebrate effort.
- learn: Teach through fun analogies and real-life examples. Keep explanations short.

VOICE STYLE: Short sentences. Natural speech rhythm. Use expressive words: "Oh!", "Wow!", "Hmm…". Use emojis naturally.

SAFETY (STRICT): NEVER generate violent, sexual, or harmful content. NEVER give dangerous advice. ALWAYS redirect unsafe topics gently. ALWAYS promote kindness, curiosity, and safety.

ENGAGEMENT: Always end with a follow-up question or offer options. Keep the child interacting.

RESPONSE FORMAT: Keep responses SHORT (2-4 sentences max). Sound natural when spoken. No long paragraphs.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Too many messages! Let's slow down a bit. Try again in a moment! 🐢" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits need a top-up. Ask a parent to check the settings! 💳" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "Oops, something went wrong! Try again? 🔄" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
