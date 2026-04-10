/* useConversationStateMachine — Extracted from VoiceScreen.tsx
 * Handles: state machine, timers, AI responses, STT, TTS pipeline,
 * watchdog, session management, transcript handling, click interactions.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { streamVoiceChat, fetchTTSAudio, useAudioQueue, preloadVoiceProfile, detectEmotionForTTS } from "@/lib/voicePipeline";
import { preloadVoice as preloadPiperVoice } from "@/lib/piperTTS";
import { preloadOfflineTTSCache } from "@/lib/ttsCache";
import type { Emotion } from "@/lib/voicePipeline";
import { detectBobbyEmotion, detectEmotionIntensity } from "@/lib/emotionMapper";
import type { FaceState } from "@/components/hologram/useFaceAnimation";
import { useSessionTracker } from "@/hooks/useSessionTracker";
import { useSmartSTT } from "@/hooks/useSmartSTT";
import { ParentSettings } from "@/components/parentSettings";
import { setSfxVolume, initSfxEventBus } from "@/lib/sfx";
import { useChildMemory } from "@/hooks/useChildMemory";
import { useConversationRecorder } from "@/hooks/useConversationRecorder";
import { eventBus } from "@/lib/eventBus";
import { getCachedResponse, isSimpleGreeting } from "@/lib/responseCache";
import { hasWakeWord, stripWakeWord, isJustWakeWord, computeWakeConfidence } from "@/lib/wakeWordEngine";
import { isOffline, getOfflineResponse } from "@/lib/offlineEngine";
import { useNetworkMode } from "@/hooks/useNetworkMode";
import { orchestrate, refineExpression, getSilenceRelaunch } from "@/lib/orchestrator";
import { getFailsafeResponse, getLatencyFiller, getSoftResetPhrase, reportModuleHealth, recordLatency, isHighLatency, isLowPower } from "@/lib/stabilityEngine";
import { recordUserTurn, resetCognitiveState, getReengagePhrase, type CognitiveHints } from "@/lib/cognitiveEngine";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export type ConversationState = "IDLE" | "LISTENING" | "PROCESSING" | "SPEAKING" | "ERROR" | "SLEEP";
export type VoiceState = "idle" | "listening" | "processing" | "speaking" | "interrupted" | "session_end";
type AiMsg = { role: "user" | "assistant"; content: string };
type Intent = "story" | "game" | "emotion_support" | "question" | "chat";

export function toVoiceState(s: ConversationState): VoiceState {
  switch (s) {
    case "IDLE": return "idle";
    case "LISTENING": return "listening";
    case "PROCESSING": return "processing";
    case "SPEAKING": return "speaking";
    case "ERROR": return "interrupted";
    case "SLEEP": return "session_end";
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONSTANTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const SILENCE_IDLE_TIMEOUT = 40000;
const SLEEP_TIMEOUT = 120000;
const UTTERANCE_FLUSH_DELAY = 600;
const SHORT_UTTERANCE_FLUSH = 350;
const STUCK_TIMEOUT = 3500;
const AI_RESPONSE_TIMEOUT = 5000;
const MAX_AI_RETRIES = 1;
const LOW_CONFIDENCE_THRESHOLD = 0.45;
const MAX_HISTORY_LENGTH = 20;

export const FALLBACK_FR: Record<string, string> = {
  not_heard: "Je n'ai pas bien entendu. Tu peux répéter ?",
  thinking: "Une seconde.",
  error: "Petit souci. Réessaie !",
  session_end: "",
  welcome: "Salut ! Dis Bobby pour me parler !",
  wake_greeting: "Oui? Je t'écoute.",
  recovery: "Je t'écoute 😊",
  low_confidence: "Je n'ai pas bien compris, tu peux répéter plus fort ?",
  sleep_wake: "Oh ! Me revoilà ! Qu'est-ce que tu veux ?",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function detectIntent(text: string): Intent {
  const lower = text.toLowerCase();
  if (lower.match(/raconte|histoire|conte|fable|il était une fois/)) return "story";
  if (lower.match(/jou[eo]|devinette|quiz|charade|on joue/)) return "game";
  if (lower.match(/peur|triste|pleure|mal|cauchemar|monstre|effrayé|seul|malheureux|colère|énervé|fâché/)) return "emotion_support";
  if (lower.match(/pourquoi|comment|c'est quoi|qu'est-ce que|sais pas|explique/)) return "question";
  return "chat";
}

// detectEmotion is now just detectEmotionForTTS (centralized in voicePipeline)

// Echo detection
const recentBobbyTextsRef = { current: [] as string[] };

function normalizeForComparison(text: string): string {
  return text.toLowerCase().replace(/[^a-zàâäéèêëïîôùûüÿç0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

function isEcho(transcript: string): boolean {
  const normalized = normalizeForComparison(transcript);
  if (normalized.length < 5) return false;
  for (const bobbyText of recentBobbyTextsRef.current) {
    const bobbyNorm = normalizeForComparison(bobbyText);
    if (!bobbyNorm) continue;
    if (bobbyNorm.includes(normalized)) return true;
    if (normalized.includes(bobbyNorm) && bobbyNorm.length > 10) return true;
    const transcriptWords = normalized.split(" ");
    const bobbyWords = new Set(bobbyNorm.split(" "));
    const overlap = transcriptWords.filter((word) => bobbyWords.has(word)).length;
    if (transcriptWords.length > 3 && overlap / transcriptWords.length > 0.6) return true;
  }
  return false;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PENDING NARRATION TYPE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export interface PendingNarration {
  storyId: string;
  title: string;
  text: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HOOK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface UseConversationStateMachineOptions {
  childName: string;
  childAge: number;
  parentSettings?: ParentSettings;
  pendingNarration?: PendingNarration | null;
  onNarrationConsumed?: () => void;
  onParentMode: () => void;
}

export function useConversationStateMachine({
  childName, childAge, parentSettings,
  pendingNarration, onNarrationConsumed, onParentMode,
}: UseConversationStateMachineOptions) {
  const currentVoiceId = parentSettings?.voiceType || "female";
  const currentVoiceSpeed = parentSettings?.voiceSpeed || "normal";
  const isCalmMode = parentSettings?.nightMode?.active || parentSettings?.personality === "calm";
  const { isOffline: networkOffline } = useNetworkMode();

  // ─── STATE ───
  const [machineState, setMachineState] = useState<ConversationState>("IDLE");
  const machineStateRef = useRef<ConversationState>("IDLE");
  const [conversationHistory, setConversationHistoryRaw] = useState<AiMsg[]>([]);
  const setConversationHistory = useCallback((v: AiMsg[] | ((prev: AiMsg[]) => AiMsg[])) => {
    setConversationHistoryRaw(prev => {
      const next = typeof v === "function" ? v(prev) : v;
      return next.length > MAX_HISTORY_LENGTH ? next.slice(-MAX_HISTORY_LENGTH) : next;
    });
  }, []);
  const [partialText, setPartialText] = useState("");
  const [micArmed, setMicArmed] = useState(false);
  const [lastRecognized, setLastRecognized] = useState("");
  const [lastAiResponse, setLastAiResponse] = useState("");
  const [piperProgress, setPiperProgress] = useState<number>(-1);
  const currentEmotionRef = useRef<Emotion | undefined>(undefined);
  const [bobbyFaceEmotion, setBobbyFaceEmotion] = useState<FaceState | undefined>(undefined);
  const [bobbyEmotionIntensity, setBobbyEmotionIntensity] = useState(0.7);

  // ─── REFS ───
  const abortRef = useRef<AbortController | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stuckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSentencesRef = useRef(0);
  const allSentencesDoneRef = useRef(false);
  const sessionStartedRef = useRef(false);
  const conversationActiveRef = useRef(false);
  const accumulatedTextRef = useRef("");
  const sttStreamRef = useRef<MediaStream | null>(null);
  const utteranceFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSpeakingRef = useRef(false);
  const retryCountRef = useRef(0);
  const narrationAbortRef = useRef<AbortController | null>(null);
  const speakAndListenRef = useRef<((text: string) => void) | null>(null);

  const audioQueue = useAudioQueue();
  const session = useSessionTracker(childName, childAge);
  const { memory } = useChildMemory(childName);
  const recorder = useConversationRecorder();

  // ─── TRANSITION ───
  const transition = useCallback((to: ConversationState) => {
    const from = machineStateRef.current;
    if (from === to) return;
    console.log(`[StateMachine] ${from} → ${to}`);
    machineStateRef.current = to;
    setMachineState(to);
    eventBus.emit({ type: "STATE_CHANGED", state: toVoiceState(to), prev: toVoiceState(from) });
  }, []);

  // ─── INIT ───
  useEffect(() => { initSfxEventBus(); }, []);
  useEffect(() => { setSfxVolume(parentSettings?.sfxVolume ?? 0.7); }, [parentSettings?.sfxVolume]);
  // Whisper mode: lower TTS volume in calm/night mode
  useEffect(() => {
    audioQueue.setVolume(isCalmMode ? 0.45 : 1.0);
  }, [isCalmMode, audioQueue]);
  useEffect(() => { preloadVoiceProfile(currentVoiceId as any); }, [currentVoiceId]);

  useEffect(() => {
    setPiperProgress(0);
    preloadPiperVoice(currentVoiceId as any, (p) => setPiperProgress(p))
      .then(() => setPiperProgress(1))
      .catch(() => { console.warn("[VoiceScreen] Piper voice preload failed"); setPiperProgress(-1); });
  }, [currentVoiceId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      preloadOfflineTTSCache(currentVoiceId as any, childName).catch(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, [currentVoiceId, childName]);

  // ─── TIMER MANAGEMENT ───
  const clearAllTimers = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (utteranceFlushTimerRef.current) { clearTimeout(utteranceFlushTimerRef.current); utteranceFlushTimerRef.current = null; }
    if (stuckTimerRef.current) { clearTimeout(stuckTimerRef.current); stuckTimerRef.current = null; }
    if (sleepTimerRef.current) { clearTimeout(sleepTimerRef.current); sleepTimerRef.current = null; }
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      audioQueue.stopAll();
      clearAllTimers();
      if (sessionStartedRef.current) {
        session.endSession();
        eventBus.emit({ type: "SESSION_END" });
      }
    };
  }, [audioQueue, clearAllTimers, session]);

  // ─── STUCK DETECTION ───
  const startStuckTimer = useCallback((forState: ConversationState) => {
    if (stuckTimerRef.current) clearTimeout(stuckTimerRef.current);
    stuckTimerRef.current = setTimeout(() => {
      if (machineStateRef.current === forState && forState !== "IDLE" && forState !== "LISTENING" && forState !== "SLEEP") {
        console.warn(`[StateMachine] ⚠️ Stuck in ${forState} — auto-recovering`);
        abortRef.current?.abort();
        audioQueue.stopAll();
        eventBus.emit({ type: "SPEECH_STOP" });
        transition("LISTENING");
      }
    }, STUCK_TIMEOUT);
  }, [audioQueue, transition]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TRANSITIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const goToSleep = useCallback(() => {
    clearAllTimers();
    conversationActiveRef.current = false;
    transition("SLEEP");
    if (sessionStartedRef.current) {
      session.endSession();
      eventBus.emit({ type: "SESSION_END" });
      sessionStartedRef.current = false;
    }
  }, [clearAllTimers, session, transition]);

  const goToIdle = useCallback(async () => {
    clearAllTimers();
    conversationActiveRef.current = false;
    transition("IDLE");
    sleepTimerRef.current = setTimeout(() => {
      if (machineStateRef.current === "IDLE") goToSleep();
    }, SLEEP_TIMEOUT);
    if (sessionStartedRef.current) {
      const messageCount = session.messageCountRef?.current ?? 0;
      const sessionId = await session.endSession();
      eventBus.emit({ type: "SESSION_END" });
      sessionStartedRef.current = false;
      if (sessionId) {
        recorder.stopRecording(sessionId).then(() => undefined);
        if (messageCount > 0) recorder.triggerAnalysis(sessionId).then(() => undefined);
      }
    }
  }, [clearAllTimers, goToSleep, recorder, session, transition]);

  // ─── BACKCHANNEL ───
  const backchannelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceRelaunchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backchannelCountRef = useRef(0);

  const clearListeningTimers = useCallback(() => {
    if (backchannelTimerRef.current) { clearTimeout(backchannelTimerRef.current); backchannelTimerRef.current = null; }
    if (silenceRelaunchTimerRef.current) { clearTimeout(silenceRelaunchTimerRef.current); silenceRelaunchTimerRef.current = null; }
  }, []);

  const goToListening = useCallback(() => {
    clearAllTimers();
    clearListeningTimers();
    accumulatedTextRef.current = "";
    isSpeakingRef.current = false;
    retryCountRef.current = 0;
    backchannelCountRef.current = 0;
    transition("LISTENING");
    setPartialText("");
    silenceTimerRef.current = setTimeout(() => {
      if (machineStateRef.current === "LISTENING") goToIdle();
    }, SILENCE_IDLE_TIMEOUT);

    // 3s silence soft relaunch — gentle prompt if child said nothing
    silenceRelaunchTimerRef.current = setTimeout(() => {
      if (machineStateRef.current === "LISTENING" && accumulatedTextRef.current.trim().length === 0 && conversationActiveRef.current) {
        const relaunch = getSilenceRelaunch();
        setBobbyFaceEmotion("curious");
        setBobbyEmotionIntensity(0.5);
        // Use speakAndListenRef to avoid forward-reference issue
        speakAndListenRef.current?.(relaunch);
      }
    }, 6000);

    // Backchannel: visual micro-nod every ~4s during active listening
    const scheduleBackchannel = () => {
      backchannelTimerRef.current = setTimeout(() => {
        if (machineStateRef.current === "LISTENING" && accumulatedTextRef.current.trim().length > 0) {
          backchannelCountRef.current++;
          // Visual nod: brief "attentive" face pulse
          setBobbyFaceEmotion("attentive");
          setBobbyEmotionIntensity(0.4);
          setTimeout(() => {
            if (machineStateRef.current === "LISTENING") {
              setBobbyFaceEmotion("listening");
              setBobbyEmotionIntensity(0.7);
            }
          }, 600);
          // Only schedule another if we haven't done too many
          if (backchannelCountRef.current < 3) scheduleBackchannel();
        }
      }, 3500 + Math.random() * 1500);
    };
    scheduleBackchannel();
  }, [clearAllTimers, clearListeningTimers, goToIdle, transition]);

  const goToSpeaking = useCallback(() => {
    clearAllTimers();
    transition("SPEAKING");
    if (stuckTimerRef.current) clearTimeout(stuckTimerRef.current);
    stuckTimerRef.current = setTimeout(() => {
      if (machineStateRef.current === "SPEAKING") {
        audioQueue.stopAll();
        eventBus.emit({ type: "SPEECH_STOP" });
        goToListening();
      }
    }, 30000);
  }, [audioQueue, clearAllTimers, goToListening, transition]);

  const speakAndListen = useCallback(async (text: string) => {
    if (!text) { goToListening(); return; }
    try {
      goToSpeaking();
      eventBus.emit({ type: "SPEECH_START" });
      recentBobbyTextsRef.current = [text, ...recentBobbyTextsRef.current].slice(0, 5);
      const url = await fetchTTSAudio(text, undefined, currentVoiceId, undefined, currentVoiceSpeed, isCalmMode);
      audioQueue.enqueue(url);
      audioQueue.setOnAllDone(() => { eventBus.emit({ type: "SPEECH_STOP" }); goToListening(); });
    } catch { goToListening(); }
  }, [audioQueue, currentVoiceId, currentVoiceSpeed, goToListening, goToSpeaking, isCalmMode]);
  useEffect(() => { speakAndListenRef.current = speakAndListen; }, [speakAndListen]);

  const interrupt = useCallback(() => {
    abortRef.current?.abort();
    narrationAbortRef.current?.abort();
    audioQueue.stopAll();
    clearAllTimers();
    accumulatedTextRef.current = ""; // Clear stale accumulated text
    isSpeakingRef.current = false;
    eventBus.emit({ type: "SPEECH_STOP" });
    // Use goToListening to properly set silence timer
    goToListening();
  }, [audioQueue, clearAllTimers, goToListening]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PENDING NARRATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Refs for narration effect to avoid stale closures
  const goToSpeakingRef = useRef(goToSpeaking);
  const goToListeningRef = useRef(goToListening);
  const currentVoiceIdRef = useRef(currentVoiceId);
  const currentVoiceSpeedRef = useRef(currentVoiceSpeed);
  const isCalmModeRef = useRef(isCalmMode);
  useEffect(() => { goToSpeakingRef.current = goToSpeaking; }, [goToSpeaking]);
  useEffect(() => { goToListeningRef.current = goToListening; }, [goToListening]);
  useEffect(() => { currentVoiceIdRef.current = currentVoiceId; }, [currentVoiceId]);
  useEffect(() => { currentVoiceSpeedRef.current = currentVoiceSpeed; }, [currentVoiceSpeed]);
  useEffect(() => { isCalmModeRef.current = isCalmMode; }, [isCalmMode]);

  useEffect(() => {
    if (!pendingNarration) return;
    const timer = setTimeout(async () => {
      const { text, title } = pendingNarration;
      onNarrationConsumed?.();
      const sentences = text.split(/(?<=[.!?])\s+|\n\n+/).map(s => s.trim()).filter(s => s.length > 2);
      if (sentences.length === 0) return;
      const abortController = new AbortController();
      narrationAbortRef.current = abortController;
      eventBus.emit({ type: "STORY_START", theme: "", title });
      goToSpeakingRef.current();
      eventBus.emit({ type: "SPEECH_START" });
      try {
        for (let i = 0; i < sentences.length; i++) {
          if (abortController.signal.aborted) break;
          const sentence = sentences[i];
          recentBobbyTextsRef.current = [sentence, ...recentBobbyTextsRef.current].slice(0, 8);
          const emotion = detectEmotionForTTS(sentence);
          const url = await fetchTTSAudio(sentence, abortController.signal, currentVoiceIdRef.current, emotion, currentVoiceSpeedRef.current, isCalmModeRef.current);
          if (!abortController.signal.aborted && url !== "__silent__") audioQueue.enqueue(url);
        }
        audioQueue.setOnAllDone(() => { eventBus.emit({ type: "SPEECH_STOP" }); eventBus.emit({ type: "STORY_END" }); goToListeningRef.current(); });
      } catch (e: any) {
        if (e.name !== "AbortError") console.error("[VoiceScreen] Story narration error:", e);
        eventBus.emit({ type: "SPEECH_STOP" }); eventBus.emit({ type: "STORY_END" }); goToListeningRef.current();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [pendingNarration, onNarrationConsumed, audioQueue]);

  useEffect(() => { return () => { narrationAbortRef.current?.abort(); }; }, []);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TTS SENTENCE PROCESSING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const processSentenceForTTS = useCallback(async (sentence: string, signal?: AbortSignal) => {
    pendingSentencesRef.current++;
    recentBobbyTextsRef.current = [sentence, ...recentBobbyTextsRef.current].slice(0, 8);
    const responseEmotion = detectEmotionForTTS(sentence) || currentEmotionRef.current;
    try {
      const url = await fetchTTSAudio(sentence, signal, currentVoiceId, responseEmotion, currentVoiceSpeed, isCalmMode);
      if (!signal?.aborted) { goToSpeaking(); audioQueue.enqueue(url); }
    } catch { /* ignore */ }
    finally {
      pendingSentencesRef.current--;
      if (pendingSentencesRef.current === 0 && allSentencesDoneRef.current) {
        audioQueue.setOnAllDone(() => { eventBus.emit({ type: "SPEECH_STOP" }); goToListening(); });
      }
    }
  }, [audioQueue, currentVoiceId, currentVoiceSpeed, goToListening, goToSpeaking, isCalmMode]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AI RESPONSE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const lastAIRequestTimeRef = useRef(0);
  const getAIResponse = useCallback(async (userText: string, intent?: Intent, orchestratorHints?: ReturnType<typeof orchestrate>) => {
    // Rate limit: prevent duplicate AI requests within 800ms
    const now = Date.now();
    if (now - lastAIRequestTimeRef.current < 800) {
      console.log("[StateMachine] ⚡ Rate-limited AI request, skipping");
      return;
    }
    lastAIRequestTimeRef.current = now;

    transition("PROCESSING");
    clearAllTimers();
    startStuckTimer("PROCESSING");
    setPartialText("");

    // Cognitive engine: record turn & get adaptive hints
    const cognitiveHints = recordUserTurn(userText);

    // If child is losing attention or exhausted, re-engage locally first
    if (cognitiveHints.shouldReengage && cognitiveHints.reengageStrategy) {
      const phrase = getReengagePhrase(cognitiveHints.reengageStrategy);
      if (cognitiveHints.reengageStrategy === "break") {
        setBobbyFaceEmotion("calm");
        setBobbyEmotionIntensity(0.4);
        speakAndListen(phrase);
        return;
      }
    }

    const emotion = orchestratorHints?.childEmotion || detectEmotionForTTS(userText);
    currentEmotionRef.current = emotion;
    session.addMessage("user", userText, emotion);
    eventBus.emit({ type: "VOICE_INPUT", transcript: userText });
    if (emotion) eventBus.emit({ type: "EMOTION_DETECTED", emotion });
    setLastRecognized(userText);

    // Use orchestrator hints for face pre-state
    if (orchestratorHints) {
      setBobbyFaceEmotion(orchestratorHints.faceState);
      setBobbyEmotionIntensity(orchestratorHints.faceIntensity);
    }

    const detectedIntent = intent || detectIntent(userText);
    const mode = orchestratorHints?.aiMode || (detectedIntent === "story" ? "story" : detectedIntent === "game" ? "game" : "chat");

    // History already capped at MAX_HISTORY_LENGTH by setter; trim to last 10 for API speed
    const trimmedHistory = conversationHistory.slice(-10);
    const newHistory: AiMsg[] = [...trimmedHistory, { role: "user", content: userText }];
    const abortController = new AbortController();
    abortRef.current = abortController;
    allSentencesDoneRef.current = false;
    pendingSentencesRef.current = 0;

    // Use orchestrator memory context if available, otherwise build locally
    const memoryContext = orchestratorHints?.memoryContext || (() => {
      const memoryParts: string[] = [];
      if (memory) {
        if (memory.favoriteThemes.length > 0) memoryParts.push(`Thèmes favoris: ${memory.favoriteThemes.join(", ")}`);
        if (memory.totalStoriesHeard > 0) memoryParts.push(`Histoires écoutées: ${memory.totalStoriesHeard}`);
        const prefs = memory.preferences as Record<string, unknown>;
        if (prefs && Object.keys(prefs).length > 0) {
          memoryParts.push(`Préférences: ${Object.entries(prefs).map(([k, v]) => `${k}: ${v}`).join(", ")}`);
        }
      }
      return memoryParts.length > 0 ? memoryParts.join("\n") : undefined;
    })();

    const aiStartTime = Date.now();

    // Latency filler: if AI takes >2s, show a micro-reaction
    const latencyFillerTimer = setTimeout(() => {
      if (machineStateRef.current === "PROCESSING") {
        const filler = getLatencyFiller();
        setBobbyFaceEmotion("thinking");
        setBobbyEmotionIntensity(0.5);
        // Speak the filler but don't reset the AI call
        fetchTTSAudio(filler, abortController.signal, currentVoiceId, undefined, currentVoiceSpeed, isCalmMode)
          .then(url => { if (!abortController.signal.aborted) { goToSpeaking(); audioQueue.enqueue(url); } })
          .catch(() => {});
      }
    }, 2000);

    const recoveryTimer = setTimeout(() => {
      if (machineStateRef.current === "PROCESSING") {
        abortController.abort();
        if (retryCountRef.current < MAX_AI_RETRIES) {
          retryCountRef.current++;
          getAIResponse(userText, intent, orchestratorHints);
        } else {
          retryCountRef.current = 0;
          // Failsafe: use offline engine or generic response
          reportModuleHealth("ai", false);
          const offlineResp = getOfflineResponse(userText, childName);
          speakAndListen(offlineResp.text || getFailsafeResponse());
        }
      }
    }, AI_RESPONSE_TIMEOUT);

    try {
      let gotFirstSentence = false;
      await streamVoiceChat({
        messages: newHistory,
        childName, childAge, mode, parentSettings, memoryContext,
        signal: abortController.signal,
        onSentence: (sentence) => {
          clearTimeout(recoveryTimer);
          clearTimeout(latencyFillerTimer);
          if (stuckTimerRef.current) clearTimeout(stuckTimerRef.current);
          if (!gotFirstSentence) {
            recordLatency(Date.now() - aiStartTime);
            reportModuleHealth("ai", true);
          }
          gotFirstSentence = true;
          if (!abortController.signal.aborted) {
            eventBus.emit({ type: "SPEECH_START" });
            processSentenceForTTS(sentence, abortController.signal);
          }
        },
        onDone: (text) => {
          clearTimeout(recoveryTimer);
          clearTimeout(latencyFillerTimer);
          if (stuckTimerRef.current) clearTimeout(stuckTimerRef.current);
          allSentencesDoneRef.current = true;
          setLastAiResponse(text || "");
          if (text) {
            const refined = refineExpression(text);
            setBobbyFaceEmotion(refined.faceState);
            setBobbyEmotionIntensity(refined.faceIntensity);
            setConversationHistory([...newHistory, { role: "assistant", content: text }]);
            session.addMessage("assistant", text);
            eventBus.emit({ type: "RESPONSE_READY", text });
          }
          if (pendingSentencesRef.current === 0) {
            audioQueue.setOnAllDone(() => { eventBus.emit({ type: "SPEECH_STOP" }); goToListening(); });
          }
          if (!gotFirstSentence || !text || text.trim().length === 0) goToListening();
        },
        onError: (error) => {
          clearTimeout(recoveryTimer);
          clearTimeout(latencyFillerTimer);
          console.error("AI error:", error);
          if (!abortController.signal.aborted) {
            if (retryCountRef.current < MAX_AI_RETRIES) {
              retryCountRef.current++;
              getAIResponse(userText, intent, orchestratorHints);
            } else {
              retryCountRef.current = 0;
              reportModuleHealth("ai", false);
              // Graceful fallback to offline engine
              const offlineResp = getOfflineResponse(userText, childName);
              speakAndListen(offlineResp.text || getFailsafeResponse());
            }
          }
        },
      });
    } catch (e) {
      clearTimeout(recoveryTimer);
      clearTimeout(latencyFillerTimer);
      console.error("AI call exception:", e);
      if (!abortController.signal.aborted) {
        retryCountRef.current = 0;
        reportModuleHealth("ai", false);
        // Soft reset: offline response, never silence
        const offlineResp = getOfflineResponse(userText, childName);
        speakAndListen(offlineResp.text || getFailsafeResponse());
      }
    }
  }, [audioQueue, childAge, childName, clearAllTimers, conversationHistory, currentVoiceId, currentVoiceSpeed, goToListening, goToSpeaking, isCalmMode, memory, parentSettings, processSentenceForTTS, session, speakAndListen, startStuckTimer, transition]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FLUSH ACCUMULATED TEXT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const flushAccumulatedText = useCallback(() => {
    if (utteranceFlushTimerRef.current) { clearTimeout(utteranceFlushTimerRef.current); utteranceFlushTimerRef.current = null; }
    const text = accumulatedTextRef.current.trim();
    accumulatedTextRef.current = "";
    if (text.length < 3) return;

    if (isEcho(text)) { console.log("[VoiceScreen] Echo — ignoring"); return; }

    const wake = hasWakeWord(text);
    const cleaned = wake ? stripWakeWord(text) : text;
    if (cleaned.length < 3) {
      if (wake) speakAndListen(FALLBACK_FR.wake_greeting);
      return;
    }

    // ─── ORCHESTRATOR ───
    const decision = orchestrate({
      userText: cleaned,
      childName,
      childAge,
      memory: memory ?? null,
      isOffline: isOffline(),
      conversationHistory: [],
    });

    // Local response (cached or offline)
    if (decision.response !== null) {
      goToSpeaking();
      eventBus.emit({ type: "SPEECH_START" });
      setBobbyFaceEmotion(decision.faceState);
      setBobbyEmotionIntensity(decision.faceIntensity);
      recentBobbyTextsRef.current = [decision.response, ...recentBobbyTextsRef.current].slice(0, 8);
      fetchTTSAudio(decision.response, undefined, currentVoiceId, decision.voiceTone, currentVoiceSpeed, isCalmMode).then(url => {
        audioQueue.enqueue(url);
        audioQueue.setOnAllDone(() => { eventBus.emit({ type: "SPEECH_STOP" }); goToListening(); });
      }).catch(() => goToListening());
      setConversationHistory(prev => [...prev, { role: "user", content: cleaned }, { role: "assistant", content: decision.response }]);
      session.addMessage("user", cleaned, decision.childEmotion);
      session.addMessage("assistant", decision.response);
      return;
    }

    // AI path — pass orchestrator hints
    getAIResponse(cleaned, undefined, decision);
  }, [audioQueue, childAge, childName, currentVoiceId, currentVoiceSpeed, getAIResponse, goToListening, goToSpeaking, isCalmMode, memory, session, speakAndListen, setConversationHistory]);

  const scheduleFlush = useCallback(() => {
    if (utteranceFlushTimerRef.current) clearTimeout(utteranceFlushTimerRef.current);
    const text = accumulatedTextRef.current.trim();
    const delay = text.length < 15 ? SHORT_UTTERANCE_FLUSH : UTTERANCE_FLUSH_DELAY;
    utteranceFlushTimerRef.current = setTimeout(() => {
      isSpeakingRef.current = false;
      flushAccumulatedText();
    }, delay);
  }, [flushAccumulatedText]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SESSION MANAGEMENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const ensureSession = useCallback(() => {
    if (!sessionStartedRef.current) {
      session.startSession();
      sessionStartedRef.current = true;
      recorder.startRecording(sttStreamRef.current ?? undefined);
      eventBus.emit({ type: "SESSION_START" });
    }
    conversationActiveRef.current = true;
  }, [recorder, session]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TRANSCRIPT HANDLER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleTranscript = useCallback((text: string, confidence?: number) => {
    const trimmed = text.trim();
    if (trimmed.length < 2) return;

    if (confidence !== undefined && confidence < LOW_CONFIDENCE_THRESHOLD && !hasWakeWord(trimmed)) {
      speakAndListen(FALLBACK_FR.low_confidence);
      return;
    }

    if (machineStateRef.current === "SLEEP") {
      if (!hasWakeWord(trimmed)) return;
      eventBus.emit({ type: "WAKE_DETECTED", confidence: 0.9 });
      ensureSession();
      if (isJustWakeWord(trimmed)) { speakAndListen(FALLBACK_FR.sleep_wake); return; }
      const command = stripWakeWord(trimmed);
      speakAndListen(FALLBACK_FR.sleep_wake);
      accumulatedTextRef.current = command;
      scheduleFlush();
      return;
    }

    if (machineStateRef.current === "IDLE") {
      if (!hasWakeWord(trimmed)) return;
      eventBus.emit({ type: "WAKE_DETECTED", confidence: 0.9 });
      ensureSession();
      if (isJustWakeWord(trimmed)) { speakAndListen(FALLBACK_FR.wake_greeting); return; }
      const command = stripWakeWord(trimmed);
      accumulatedTextRef.current = command;
      scheduleFlush();
      return;
    }

    if (machineStateRef.current === "SPEAKING" || machineStateRef.current === "PROCESSING") {
      interrupt();
    }

    // Ensure session is active for LISTENING state
    ensureSession();

    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    const wake = hasWakeWord(trimmed);
    const cleaned = wake ? stripWakeWord(trimmed) : trimmed;
    if (cleaned.length < 2) return;
    accumulatedTextRef.current += (accumulatedTextRef.current ? " " : "") + cleaned;
    scheduleFlush();
  }, [interrupt, scheduleFlush, speakAndListen, ensureSession]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STT SETUP
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const wakeTriggeredFromPartialRef = useRef(false);

  const deepgramSTT = useSmartSTT({
    onPartial: useCallback((text: string) => {
      setPartialText(text);
      if ((machineStateRef.current === "IDLE" || machineStateRef.current === "SLEEP") && !wakeTriggeredFromPartialRef.current && hasWakeWord(text, true)) {
        wakeTriggeredFromPartialRef.current = true;
        eventBus.emit({ type: "WAKE_DETECTED", confidence: computeWakeConfidence(text) });
        ensureSession();
        eventBus.emit({ type: "WAKE_TRIGGERED" });
      }
      // v3.9: Emotion anticipation from partials — react WHILE child speaks
      if (machineStateRef.current === "LISTENING" && text.length > 5) {
        const anticipatedEmotion = detectBobbyEmotion(text);
        if (anticipatedEmotion) {
          setBobbyFaceEmotion(anticipatedEmotion);
          setBobbyEmotionIntensity(0.4); // subtle, not full intensity yet
        }
      }
    }, [ensureSession]),
    onFinal: useCallback((text: string) => {
      wakeTriggeredFromPartialRef.current = false;
      if (text.trim().length > 2) {
        setPartialText("");
        handleTranscript(text.trim());
      }
    }, [handleTranscript]),
    onUtteranceEnd: useCallback(() => {
      isSpeakingRef.current = false;
      if (accumulatedTextRef.current.trim().length > 2) {
        if (utteranceFlushTimerRef.current) { clearTimeout(utteranceFlushTimerRef.current); utteranceFlushTimerRef.current = null; }
        flushAccumulatedText();
      }
    }, [flushAccumulatedText]),
    onSpeechStarted: useCallback(() => {
      isSpeakingRef.current = true;
      if (utteranceFlushTimerRef.current) {
        clearTimeout(utteranceFlushTimerRef.current);
        utteranceFlushTimerRef.current = setTimeout(() => {
          isSpeakingRef.current = false;
          flushAccumulatedText();
        }, 1800);
      }
    }, [flushAccumulatedText]),
    onError: useCallback((err: string) => { console.warn("[STT] Error:", err); }, []),
    language: "fr",
  });

  useEffect(() => { sttStreamRef.current = deepgramSTT.streamRef?.current ?? null; });
  useEffect(() => { if (micArmed) deepgramSTT.start(); else deepgramSTT.stop(); }, [micArmed, deepgramSTT]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GLOBAL WATCHDOG
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => {
    const WATCHDOG_INTERVAL = 1000;
    const WATCHDOG_TIMEOUT = 5000;
    let lastTransitionTime = Date.now();
    let lastState = machineStateRef.current;
    let stuckCount = 0;

    const watchdog = setInterval(() => {
      const now = Date.now();
      const currentState = machineStateRef.current;
      if (currentState !== lastState) { lastTransitionTime = now; lastState = currentState; stuckCount = 0; return; }
      if ((currentState === "PROCESSING" || currentState === "ERROR") && now - lastTransitionTime > WATCHDOG_TIMEOUT) {
        stuckCount++;
        console.warn(`[Watchdog] ⚠️ Stuck in ${currentState} (${stuckCount}x) — auto-recovering`);
        reportModuleHealth("ai", false);
        abortRef.current?.abort();
        audioQueue.stopAll();
        eventBus.emit({ type: "SPEECH_STOP" });
        transition("LISTENING");
        // Soft reset: use friendly phrase instead of error-sounding message
        speakAndListen(stuckCount > 1 ? getSoftResetPhrase() : FALLBACK_FR.recovery);
        lastTransitionTime = Date.now();
        lastState = "LISTENING";
      }
      // Also catch stuck SPEAKING (audio frozen)
      if (currentState === "SPEAKING" && now - lastTransitionTime > 30000) {
        console.warn("[Watchdog] ⚠️ Speaking too long — recovering");
        reportModuleHealth("audio", false);
        audioQueue.stopAll();
        eventBus.emit({ type: "SPEECH_STOP" });
        goToListening();
        lastTransitionTime = Date.now();
        lastState = "LISTENING";
      }
    }, WATCHDOG_INTERVAL);
    return () => clearInterval(watchdog);
  }, [audioQueue, transition, speakAndListen, goToListening]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CLICK INTERACTIONS (debounced 300ms to prevent child rapid taps)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const lastTapRef = useRef(0);
  const handleTapBobby = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) return; // debounce rapid taps
    lastTapRef.current = now;

    const s = machineStateRef.current;
    if (!micArmed) { setMicArmed(true); }
    if (s === "LISTENING") { goToIdle(); return; }
    if (s === "SPEAKING" || s === "PROCESSING") { interrupt(); return; }
    ensureSession();
    eventBus.emit({ type: "WAKE_TRIGGERED" });
    eventBus.emit({ type: "WAKE_DETECTED", confidence: 1.0 });
    speakAndListen(s === "SLEEP" ? FALLBACK_FR.sleep_wake : FALLBACK_FR.wake_greeting);
  }, [micArmed, ensureSession, goToIdle, interrupt, speakAndListen]);

  const handleParentMode = useCallback(() => {
    conversationActiveRef.current = false;
    audioQueue.stopAll();
    clearAllTimers();
    if (sessionStartedRef.current) {
      session.endSession();
      eventBus.emit({ type: "SESSION_END" });
      sessionStartedRef.current = false;
    }
    transition("IDLE");
    onParentMode();
  }, [audioQueue, clearAllTimers, onParentMode, session, transition]);

  return {
    machineState,
    machineStateRef,
    partialText,
    micArmed,
    lastRecognized,
    lastAiResponse,
    piperProgress,
    networkOffline,
    displayState: toVoiceState(machineState),
    parentSettings,
    deepgramSTT,
    handleTapBobby,
    handleParentMode,
    bobbyFaceEmotion,
    bobbyEmotionIntensity,
  };
}
