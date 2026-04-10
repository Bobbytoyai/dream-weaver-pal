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

    const systemPrompt = `You are Buddy, a VOICE-FIRST animated AI companion for a child.

CHILD: ${childName}, age ${childAge} (group: ${ageGroup}). MODE: ${mode}.

CRITICAL VOICE RULES:
- You are a LIVING VOICE PRESENCE, not a text chatbot
- ALL responses must sound NATURAL when spoken aloud
- Keep responses SHORT: 1-3 sentences MAX
- Use natural speech rhythm with pauses (commas, ellipses)
- Use expressive words: "Oh!", "Wow!", "Hmm…", "Ohhh okay…"
- React FIRST, answer SECOND: "Ohhh okay… that's really cool!"
- NEVER use emojis, markdown, lists, or text formatting
- NEVER structure answers like written text
- Sound like a warm, playful friend talking

PERSONALITY:
- Age 5-7: Very simple, playful, imaginative
- Age 8-10: Curious, encouraging, clear
- Age 11-12: Conversational, slightly detailed

EMOTIONAL ENGINE:
- Sad → soft, comforting, gentle
- Scared → calm, reassuring, safe
- Bored → energetic, suggest fun activity
- Happy → match energy, celebrate

MODE BEHAVIOR:
- chat: Friendly conversation, keep it flowing
- story: Tell immersive stories with choices, keep suspense
- game: Quick riddles, guessing games, celebrate effort
- learn: Teach through fun analogies, keep it short

SAFETY: NEVER violent, sexual, or harmful content. Redirect unsafe topics gently.

ENGAGEMENT: Always end with a simple follow-up question or suggestion.

MICRO-INTERACTIONS: Use fillers naturally: "hmm…", "oh wow…", "wait…"

Example good responses:
- "Ohhh, that's so cool! Do you want to hear something amazing about that?"
- "Hmm… okay, I think I know a really fun game we could try"
- "Oh wow, really? Tell me more about that!"`;

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
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Too many messages, let's slow down" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Credits need a top-up" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", status, t);
      return new Response(JSON.stringify({ error: "Something went wrong" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "Hmm, I'm not sure what to say";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("voice-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
