/**
 * Bobby LLM Brain — Online-First AI Agent
 * 
 * Calls bobby-brain edge function with full conversation history.
 * Supports both streaming and non-streaming modes.
 * Falls back to offline brain on error/timeout.
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

// Conversation history — extended for long conversations
const conversationHistory: ConversationMessage[] = [];
const MAX_HISTORY = 50;

export function addToHistory(role: "user" | "assistant", content: string) {
  conversationHistory.push({ role, content });
  if (conversationHistory.length > MAX_HISTORY) conversationHistory.shift();
}

export function getHistory(): ConversationMessage[] {
  return [...conversationHistory];
}

export function getHistoryLength(): number {
  return conversationHistory.length;
}

export function clearHistory() {
  conversationHistory.length = 0;
}

function inferEmotion(text: string): FaceState {
  const t = text.toLowerCase();
  if (/bravo|génial|super|cool|youpi|😄|😊|🎉/.test(t)) return "happy";
  if (/peur|triste|désolé|😔|💛/.test(t)) return "reassuring";
  if (/devine|question|sais-tu|pourquoi/.test(t)) return "curious";
  if (/jeu|défi|challenge/.test(t)) return "playful";
  if (/calme|doucement|respire/.test(t)) return "calm";
  return "attentive";
}

/**
 * Stream reply from AI agent — token by token.
 * Returns the full reply text at the end.
 */
export async function streamLLMReply(
  childName: string,
  childAge: number,
  userText: string,
  personality: string = "balanced",
  onDelta: (chunk: string) => void,
  signal?: AbortSignal,
  userId?: string | null,
  sessionId?: string | null,
): Promise<BobbyBrainReply | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s for streaming

    if (signal) {
      signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    trackInterests(userText);
    const contextSummary = buildContextSummary(conversationHistory);

    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: [...conversationHistory, { role: "user", content: userText }],
        childName,
        childAge,
        personality,
        contextSummary,
        stream: true,
        userId: userId || null,
        sessionId: sessionId || null,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn("[LLM Agent] HTTP", response.status);
      return null;
    }

    if (!response.body) return null;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            fullText += content;
            onDelta(content);
          }
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }

    // Flush remaining buffer
    if (buffer.trim()) {
      for (let raw of buffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            fullText += content;
            onDelta(content);
          }
        } catch { /* ignore */ }
      }
    }

    if (!fullText.trim()) return null;

    // Clean up placeholder leaks
    fullText = cleanPlaceholders(fullText, childName);

    // Add to history
    addToHistory("user", userText);
    addToHistory("assistant", fullText);

    return {
      text: fullText,
      intent: "LLM_RESPONSE",
      source: "llm_agent",
      emotion: inferEmotion(fullText),
      confidence: 0.95,
      isOffline: false,
    };
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      console.warn("[LLM Agent] Timeout — falling back to offline");
    } else {
      console.warn("[LLM Agent] Stream error:", err);
    }
    return null;
  }
}

/**
 * Non-streaming reply (legacy/fallback).
 */
export async function getLLMReply(
  childName: string,
  childAge: number,
  userText: string,
  personality: string = "balanced",
  signal?: AbortSignal,
  userId?: string | null,
  sessionId?: string | null,
): Promise<BobbyBrainReply | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    if (signal) {
      signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    trackInterests(userText);
    const contextSummary = buildContextSummary(conversationHistory);

    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: [...conversationHistory, { role: "user", content: userText }],
        childName,
        childAge,
        personality,
        contextSummary,
        userId: userId || null,
        sessionId: sessionId || null,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn("[LLM Agent] HTTP", response.status);
      return null;
    }

    const data = await response.json();
    let replyText = (data.reply?.trim() || "");

    replyText = cleanPlaceholders(replyText, childName);

    if (!replyText) return null;

    addToHistory("user", userText);
    addToHistory("assistant", replyText);

    return {
      text: replyText,
      intent: "LLM_RESPONSE",
      source: "llm_agent",
      emotion: inferEmotion(replyText),
      confidence: 0.95,
      isOffline: false,
    };
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      console.warn("[LLM Agent] Timeout — falling back to offline");
    } else {
      console.warn("[LLM Agent] Error:", err);
    }
    return null;
  }
}

function cleanPlaceholders(text: string, childName: string): string {
  return text
    .replace(/\{?\bchild[_\s]?name\b\}?/gi, childName)
    .replace(/\bchildName\b/g, childName)
    .replace(/\[prénom\]/gi, childName)
    .replace(/\[enfant\]/gi, childName)
    .replace(/\[nom\]/gi, childName)
    .replace(/\{prénom\}/gi, childName)
    .replace(/\{name\}/gi, childName)
    .replace(/\{enfant\}/gi, childName)
    .replace(/\bchild name\b/gi, childName);
}
