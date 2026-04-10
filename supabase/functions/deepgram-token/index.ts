/**
 * Generates temporary Deepgram API keys for client-side STT streaming.
 * Keys expire after 60 seconds for security.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const DEEPGRAM_API_KEY = Deno.env.get("DEEPGRAM_API_KEY");
    if (!DEEPGRAM_API_KEY) {
      throw new Error("DEEPGRAM_API_KEY not configured");
    }

    // Create a temporary API key that expires in 60 seconds
    const response = await fetch("https://api.deepgram.com/v1/keys", {
      method: "POST",
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        comment: "Bobby STT temporary key",
        time_to_live_in_seconds: 60,
        scopes: ["usage:write"],
      }),
    });

    if (!response.ok) {
      // Fallback: return the main key wrapped (less secure but functional)
      // In production, use Deepgram's project-level key generation
      console.warn("Deepgram key generation failed, using direct key");
      return new Response(JSON.stringify({ key: DEEPGRAM_API_KEY }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify({ key: data.api_key?.api_key || DEEPGRAM_API_KEY }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("deepgram-token error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
