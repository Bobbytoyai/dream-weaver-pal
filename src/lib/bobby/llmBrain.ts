/**
 * Bobby LLM Brain — calls the bobby-brain edge function
 * Falls back to offline brain on error or timeout.
 */

import type { BobbyBrainReply } from "./types";
import type { FaceState } from "@/components/hologram/useFaceAnimation";
import { buildContextSummary } from "./conversationEnricher";
import { trackInterests } from "./interestTracker";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bobby-brain`;

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

// Keep conversation history in memory for context
const conversationHistory: ConversationMessage[] = [];
const MAX_HISTORY = 20;

export function addToHistory(role: "user" | "assistant", content: string) {
  conversationHistory.push({ role, content });
  if (conversationHistory.length > MAX_HISTORY) conversationHistory.shift();
}

export function clearHistory() {
  conversationHistory.length = 0;
}

function inferEmotion(text: string): FaceState {
  const t = text.toLowerCase();
  if (/bravo|génial|super|cool|youpi|😄|😊|🎉/.test(t)) return "happy";
  if (/peur|triste|désolé|😔|💛/.test(t)) return "reassuring";
  if (/devine|question|sais-tu|pourquoi/.test(t)) return "curious";
  if (/jeu|défi|challenge|😄/.test(t)) return "playful";
  if (/calme|doucement|respire/.test(t)) return "calm";
  return "attentive";
}

export async function getLLMReply(
  childName: string,
  childAge: number,
  userText: string,
  personality: string = "balanced",
  signal?: AbortSignal,
): Promise<BobbyBrainReply | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout

    // Combine external signal with timeout
    if (signal) {
      signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    // Track interests from user text before sending to LLM
    trackInterests(userText);

    // Build context summary with interests and key facts
    const contextSummary = buildContextSummary(conversationHistory);

    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: [
          ...conversationHistory,
          { role: "user", content: userText },
        ],
        childName,
        childAge,
        personality,
        contextSummary,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn("[LLM Brain] HTTP", response.status);
      return null; // fallback to offline
    }

    const data = await response.json();
    let replyText = (data.reply?.trim() || "");

    // Safety: replace any leaked placeholder with actual child name
    replyText = replyText.replace(/\{?\bchild[_\s]?name\b\}?/gi, childName);
    replyText = replyText.replace(/\bchildName\b/g, childName);
    replyText = replyText.replace(/\[prénom\]/gi, childName);
    replyText = replyText.replace(/\[enfant\]/gi, childName);
    replyText = replyText.replace(/\[nom\]/gi, childName);
    replyText = replyText.replace(/\{prénom\}/gi, childName);
    replyText = replyText.replace(/\{name\}/gi, childName);
    replyText = replyText.replace(/\{enfant\}/gi, childName);
    replyText = replyText.replace(/\bchild name\b/gi, childName);

    if (!replyText) return null;

    // Add both messages to history
    addToHistory("user", userText);
    addToHistory("assistant", replyText);

    return {
      text: replyText,
      intent: "LLM_RESPONSE",
      source: "llm_gemini",
      emotion: inferEmotion(replyText),
      confidence: 0.95,
      isOffline: false,
    };
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      console.warn("[LLM Brain] Timeout — falling back to offline");
    } else {
      console.warn("[LLM Brain] Error:", err);
    }
    return null;
  }
}
