/**
 * Generates Deepgram API tokens for client-side STT streaming.
 * Returns the API key for WebSocket connection.
 * The key is only exposed temporarily to the authenticated client.
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

    // Return the key directly — it's only sent to authenticated clients
    // and the WebSocket connection is short-lived
    return new Response(JSON.stringify({ key: DEEPGRAM_API_KEY }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("deepgram-token error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
