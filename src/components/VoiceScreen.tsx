/* v4 — Robust State Machine + Click Toggle + Auto-Recovery + Debug Overlay */
import { useState, useEffect, useRef, useCallback } from "react";
import { Settings, Camera, Mic, MicOff, Bug } from "lucide-react";
import { streamVoiceChat, fetchTTSAudio, useAudioQueue, preloadVoiceProfile, detectEmotionForTTS } from "@/lib/voicePipeline";
import type { Emotion } from "@/lib/voicePipeline";
import { useSessionTracker } from "@/hooks/useSessionTracker";
import { useSmartSTT } from "@/hooks/useSmartSTT";
import { ParentSettings } from "@/components/parentSettings";
import { HologramFace } from "@/components/hologram/HologramFace";
import { setSfxVolume, initSfxEventBus } from "@/lib/sfx";
import { useChildMemory } from "@/hooks/useChildMemory";
import { useConversationRecorder } from "@/hooks/useConversationRecorder";
import { eventBus } from "@/lib/eventBus";
import { getCachedResponse, isSimpleGreeting } from "@/lib/responseCache";
import { hasWakeWord, stripWakeWord, isJustWakeWord, computeWakeConfidence } from "@/lib/wakeWordEngine";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. STATE MACHINE TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
type ConversationState = "IDLE" | "LISTENING" | "PROCESSING" | "SPEAKING" | "ERROR" | "SLEEP";
type VoiceState = "idle" | "listening" | "processing" | "speaking" | "interrupted" | "session_end";
type AiMsg = { role: "user" | "assistant"; content: string };
type Intent = "story" | "game" | "emotion_support" | "question" | "chat";

// Map internal state machine to hologram display state
function toVoiceState(s: ConversationState): VoiceState {
  switch (s) {
    case "IDLE": return "idle";
    case "LISTENING": return "listening";
    case "PROCESSING": return "processing";
    case "SPEAKING": return "speaking";
    case "ERROR": return "interrupted";
    case "SLEEP": return "session_end";
  }
}

const FALLBACK_FR: Record<string, string> = {
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

function detectIntent(text: string): Intent {
  const lower = text.toLowerCase();
  if (lower.match(/raconte|histoire|conte|fable|il était une fois/)) return "story";
  if (lower.match(/jou[eo]|devinette|quiz|charade|on joue/)) return "game";
  if (lower.match(/peur|triste|pleure|mal|cauchemar|monstre|effrayé|seul|malheureux|colère|énervé|fâché/)) return "emotion_support";
  if (lower.match(/pourquoi|comment|c'est quoi|qu'est-ce que|sais pas|explique/)) return "question";
  return "chat";
}

function detectEmotion(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (lower.match(/triste|pleure|mal|manque|malheureux/)) return "sad";
  if (lower.match(/peur|effrayé|cauchemar|noir|monstre/)) return "scared";
  if (lower.match(/ennui|ennuie|rien à faire|boring/)) return "bored";
  if (lower.match(/content|super|génial|trop bien|cool|adore|aime|heureux|yay/)) return "happy";
  if (lower.match(/pourquoi|comment|c'est quoi|sais pas/)) return "curious";
  if (lower.match(/wow|waouh|incroyable|fou|dingue/)) return "excited";
  if (lower.match(/colère|énervé|fâché|énerve|rage|grrr/)) return "angry";
  return undefined;
}

// ─── Echo detection ───
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
// CONSTANTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const SILENCE_IDLE_TIMEOUT = 40000;       // 40s silence → IDLE
const SLEEP_TIMEOUT = 120000;             // 2min inactivity → SLEEP
const UTTERANCE_FLUSH_DELAY = 600;        // ms after utterance end before flushing (was 1200)
const SHORT_UTTERANCE_FLUSH = 350;        // faster flush for short text (was 800)
const STUCK_TIMEOUT = 3500;               // 3.5s stuck in any state → auto-recover
const AI_RESPONSE_TIMEOUT = 5000;         // 5s max for AI response
const MAX_AI_RETRIES = 1;                 // retry once on failure
const LOW_CONFIDENCE_THRESHOLD = 0.45;    // below this → ask to repeat
const FIRST_SENTENCE_MAX = 25;            // flush LLM sentence buffer early for first chunk

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UI COMPONENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SoundWave = ({ active }: { active: boolean }) => {
  const bars = 5;
  return (
    <div className="flex items-center gap-[3px] h-5">
      {Array.from({ length: bars }, (_, i) => (
        <div key={i} className="w-[3px] rounded-full transition-all duration-150"
          style={{
            backgroundColor: "hsl(var(--primary))",
            height: active ? `${8 + Math.sin(Date.now() / 200 + i * 1.2) * 6 + Math.random() * 4}px` : "4px",
            opacity: active ? 0.9 : 0.3,
            animation: active ? `soundbar-${i} 0.4s ease-in-out infinite alternate` : "none",
          }} />
      ))}
      <style>{`${Array.from({ length: bars }, (_, i) => `
        @keyframes soundbar-${i} { 0% { height: ${4 + i * 2}px; } 100% { height: ${12 + ((i + 2) % bars) * 3}px; } }
      `).join("")}`}</style>
    </div>
  );
};

const FloatingParticles = () => {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i, size: 4 + Math.random() * 8, left: Math.random() * 100,
    delay: Math.random() * 8, duration: 10 + Math.random() * 15,
    color: ["hsla(215, 85%, 58%, 0.25)", "hsla(270, 55%, 62%, 0.2)", "hsla(320, 55%, 65%, 0.18)", "hsla(180, 60%, 55%, 0.2)", "hsla(45, 80%, 65%, 0.15)"][i % 5],
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <div key={p.id} className="floating-particle"
          style={{ width: p.size, height: p.size, left: `${p.left}%`, bottom: "-10px", backgroundColor: p.color, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s` }} />
      ))}
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DEBUG OVERLAY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const DebugOverlay = ({ state, micArmed, micRunning, partialText, lastRecognized, lastAiResponse, sttBackend }: {
  state: ConversationState; micArmed: boolean; micRunning: boolean;
  partialText: string; lastRecognized: string; lastAiResponse: string; sttBackend: string;
}) => (
  <div className="fixed top-0 left-0 right-0 z-50 bg-black/85 text-white p-3 text-[10px] font-mono space-y-1 pointer-events-none max-h-48 overflow-y-auto">
    <div className="flex gap-3 flex-wrap">
      <span>State: <span className={`font-bold ${state === "ERROR" ? "text-red-400" : state === "LISTENING" ? "text-green-400" : state === "SPEAKING" ? "text-blue-400" : state === "PROCESSING" ? "text-yellow-400" : state === "SLEEP" ? "text-indigo-400" : "text-gray-400"}`}>{state}</span></span>
      <span>Mic: {micArmed ? (micRunning ? "🟢 ON" : "🟡 ARMED") : "🔴 OFF"}</span>
      <span>STT: {sttBackend}</span>
    </div>
    {partialText && <div className="text-green-300 truncate">📝 Partial: "{partialText}"</div>}
    {lastRecognized && <div className="text-cyan-300 truncate">✅ Recognized: "{lastRecognized}"</div>}
    {lastAiResponse && <div className="text-purple-300 truncate">🤖 AI: "{lastAiResponse.slice(0, 100)}"</div>}
  </div>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface VoiceScreenProps {
  childName: string;
  childAge: number;
  onSwitchToChat: () => void;
  onSwitchToStory?: () => void;
  onParentMode: () => void;
  parentSettings?: ParentSettings;
}

const VoiceScreen = ({ childName, childAge, onSwitchToChat, onSwitchToStory, onParentMode, parentSettings }: VoiceScreenProps) => {
  const currentVoiceId = parentSettings?.voiceType || "female";
  const currentVoiceSpeed = parentSettings?.voiceSpeed || "normal";
  const isCalmMode = parentSettings?.nightMode?.active || parentSettings?.personality === "calm";

  // ─── STATE MACHINE ───
  const [machineState, setMachineState] = useState<ConversationState>("IDLE");
  const machineStateRef = useRef<ConversationState>("IDLE");
  const [conversationHistory, setConversationHistory] = useState<AiMsg[]>([]);
  const [partialText, setPartialText] = useState("");
  const [micArmed, setMicArmed] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [lastRecognized, setLastRecognized] = useState("");
  const [lastAiResponse, setLastAiResponse] = useState("");
  const currentEmotionRef = useRef<Emotion | undefined>(undefined);

  // Transition helper — ensures ref stays in sync + emits events
  const transition = useCallback((to: ConversationState) => {
    const from = machineStateRef.current;
    if (from === to) return;
    console.log(`[StateMachine] ${from} → ${to}`);
    machineStateRef.current = to;
    setMachineState(to);
    eventBus.emit({ type: "STATE_CHANGED", state: toVoiceState(to), prev: toVoiceState(from) });
  }, []);

  useEffect(() => { preloadVoiceProfile(currentVoiceId as any); }, [currentVoiceId]);

  const abortRef = useRef<AbortController | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stuckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSentencesRef = useRef(0);
  const allSentencesDoneRef = useRef(false);
  const sessionStartedRef = useRef(false);
  const conversationActiveRef = useRef(false);
  const accumulatedTextRef = useRef("");
  const utteranceFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSpeakingRef = useRef(false);
  const retryCountRef = useRef(0);

  const audioQueue = useAudioQueue();
  const session = useSessionTracker(childName, childAge);
  const { memory } = useChildMemory(childName);
  const recorder = useConversationRecorder();

  useEffect(() => { initSfxEventBus(); }, []);
  useEffect(() => { setSfxVolume(parentSettings?.sfxVolume ?? 0.7); }, [parentSettings?.sfxVolume]);

  // ─── TIMER MANAGEMENT ───
  const clearAllTimers = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (utteranceFlushTimerRef.current) { clearTimeout(utteranceFlushTimerRef.current); utteranceFlushTimerRef.current = null; }
    if (stuckTimerRef.current) { clearTimeout(stuckTimerRef.current); stuckTimerRef.current = null; }
    if (sleepTimerRef.current) { clearTimeout(sleepTimerRef.current); sleepTimerRef.current = null; }
  }, []);

  // Cleanup on unmount
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

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. STUCK DETECTION — auto-recover if stuck >3.5s
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const startStuckTimer = useCallback((forState: ConversationState) => {
    if (stuckTimerRef.current) clearTimeout(stuckTimerRef.current);
    stuckTimerRef.current = setTimeout(() => {
      if (machineStateRef.current === forState && forState !== "IDLE" && forState !== "LISTENING" && forState !== "SLEEP") {
        console.warn(`[StateMachine] ⚠️ Stuck in ${forState} for ${STUCK_TIMEOUT}ms — auto-recovering`);
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

  // → SLEEP (low power after 2 min idle)
  const goToSleep = useCallback(() => {
    console.log("[StateMachine] 💤 Entering SLEEP mode (2min inactivity)");
    clearAllTimers();
    conversationActiveRef.current = false;
    transition("SLEEP");
    if (sessionStartedRef.current) {
      session.endSession();
      eventBus.emit({ type: "SESSION_END" });
      sessionStartedRef.current = false;
    }
  }, [clearAllTimers, session, transition]);

  // → IDLE (end conversation)
  const goToIdle = useCallback(async () => {
    clearAllTimers();
    conversationActiveRef.current = false;
    transition("IDLE");
    // Start sleep timer → SLEEP after 2 minutes
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

  // → LISTENING (ready for input)
  const goToListening = useCallback(() => {
    clearAllTimers();
    accumulatedTextRef.current = "";
    isSpeakingRef.current = false;
    retryCountRef.current = 0;
    transition("LISTENING");
    setPartialText("");
    // Start silence timeout → IDLE after 40s
    silenceTimerRef.current = setTimeout(() => {
      if (machineStateRef.current === "LISTENING") goToIdle();
    }, SILENCE_IDLE_TIMEOUT);
  }, [clearAllTimers, goToIdle, transition]);

  // → SPEAKING (play audio)
  const goToSpeaking = useCallback(() => {
    clearAllTimers();
    transition("SPEAKING");
    // Stuck timer for speaking — if audio never finishes in 30s
    if (stuckTimerRef.current) clearTimeout(stuckTimerRef.current);
    stuckTimerRef.current = setTimeout(() => {
      if (machineStateRef.current === "SPEAKING") {
        console.warn("[StateMachine] Speaking stuck — forcing listening");
        audioQueue.stopAll();
        eventBus.emit({ type: "SPEECH_STOP" });
        goToListening();
      }
    }, 30000);
  }, [audioQueue, clearAllTimers, goToListening, transition]);

  // Speak a fallback phrase then → LISTENING
  const speakAndListen = useCallback(async (text: string) => {
    if (!text) { goToListening(); return; }
    try {
      goToSpeaking();
      eventBus.emit({ type: "SPEECH_START" });
      recentBobbyTextsRef.current = [text, ...recentBobbyTextsRef.current].slice(0, 5);
      const url = await fetchTTSAudio(text, undefined, currentVoiceId, undefined, currentVoiceSpeed, isCalmMode);
      audioQueue.enqueue(url);
      audioQueue.setOnAllDone(() => {
        eventBus.emit({ type: "SPEECH_STOP" });
        goToListening();
      });
    } catch {
      goToListening();
    }
  }, [audioQueue, currentVoiceId, currentVoiceSpeed, goToListening, goToSpeaking, isCalmMode]);

  // Interrupt current speech
  const interrupt = useCallback(() => {
    abortRef.current?.abort();
    audioQueue.stopAll();
    clearAllTimers();
    eventBus.emit({ type: "SPEECH_STOP" });
    transition("LISTENING");
  }, [audioQueue, clearAllTimers, transition]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. TTS SENTENCE PROCESSING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const processSentenceForTTS = useCallback(async (sentence: string, signal?: AbortSignal) => {
    pendingSentencesRef.current++;
    recentBobbyTextsRef.current = [sentence, ...recentBobbyTextsRef.current].slice(0, 8);
    const responseEmotion = detectEmotionForTTS(sentence) || currentEmotionRef.current;
    try {
      const url = await fetchTTSAudio(sentence, signal, currentVoiceId, responseEmotion, currentVoiceSpeed, isCalmMode);
      if (!signal?.aborted) {
        goToSpeaking();
        audioQueue.enqueue(url);
      }
    } catch { /* ignore */ }
    finally {
      pendingSentencesRef.current--;
      if (pendingSentencesRef.current === 0 && allSentencesDoneRef.current) {
        audioQueue.setOnAllDone(() => {
          eventBus.emit({ type: "SPEECH_STOP" });
          goToListening();
        });
      }
    }
  }, [audioQueue, currentVoiceId, currentVoiceSpeed, goToListening, goToSpeaking, isCalmMode]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. AI RESPONSE with RETRY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const getAIResponse = useCallback(async (userText: string, intent?: Intent) => {
    transition("PROCESSING");
    clearAllTimers();
    startStuckTimer("PROCESSING");
    setPartialText("");

    const emotion = detectEmotion(userText);
    currentEmotionRef.current = (emotion as Emotion) || detectEmotionForTTS(userText);
    session.addMessage("user", userText, emotion);
    eventBus.emit({ type: "VOICE_INPUT", transcript: userText });
    if (emotion) eventBus.emit({ type: "EMOTION_DETECTED", emotion });
    setLastRecognized(userText);

    const detectedIntent = intent || detectIntent(userText);
    let mode = "chat";
    if (detectedIntent === "story") mode = "story";
    else if (detectedIntent === "game") mode = "game";

    const trimmedHistory = conversationHistory.length > 10 ? conversationHistory.slice(-10) : conversationHistory;
    const newHistory: AiMsg[] = [...trimmedHistory, { role: "user", content: userText }];
    const abortController = new AbortController();
    abortRef.current = abortController;
    allSentencesDoneRef.current = false;
    pendingSentencesRef.current = 0;

    const memoryParts: string[] = [];
    if (memory) {
      if (memory.favoriteThemes.length > 0) memoryParts.push(`Thèmes favoris: ${memory.favoriteThemes.join(", ")}`);
      if (memory.totalStoriesHeard > 0) memoryParts.push(`Histoires écoutées: ${memory.totalStoriesHeard}`);
      const prefs = memory.preferences as Record<string, unknown>;
      if (prefs && Object.keys(prefs).length > 0) {
        memoryParts.push(`Préférences: ${Object.entries(prefs).map(([k, v]) => `${k}: ${v}`).join(", ")}`);
      }
    }
    const memoryContext = memoryParts.length > 0 ? memoryParts.join("\n") : undefined;

    // ─── Timeout auto-recovery ───
    const recoveryTimer = setTimeout(() => {
      if (machineStateRef.current === "PROCESSING") {
        console.warn("[VoiceScreen] AI response timeout — recovering");
        abortController.abort();
        if (retryCountRef.current < MAX_AI_RETRIES) {
          retryCountRef.current++;
          console.log(`[VoiceScreen] Retrying AI request (attempt ${retryCountRef.current})`);
          getAIResponse(userText, intent);
        } else {
          retryCountRef.current = 0;
          speakAndListen(FALLBACK_FR.not_heard);
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
          if (stuckTimerRef.current) clearTimeout(stuckTimerRef.current);
          gotFirstSentence = true;
          if (!abortController.signal.aborted) {
            eventBus.emit({ type: "SPEECH_START" });
            processSentenceForTTS(sentence, abortController.signal);
          }
        },
        onDone: (text) => {
          clearTimeout(recoveryTimer);
          if (stuckTimerRef.current) clearTimeout(stuckTimerRef.current);
          allSentencesDoneRef.current = true;
          setLastAiResponse(text || "");
          if (text) {
            setConversationHistory([...newHistory, { role: "assistant", content: text }]);
            session.addMessage("assistant", text);
            eventBus.emit({ type: "RESPONSE_READY", text });
          }
          if (pendingSentencesRef.current === 0) {
            audioQueue.setOnAllDone(() => {
              eventBus.emit({ type: "SPEECH_STOP" });
              goToListening();
            });
          }
          // If no sentences were produced, go back to listening
          if (!gotFirstSentence || !text || text.trim().length === 0) {
            goToListening();
          }
        },
        onError: (error) => {
          clearTimeout(recoveryTimer);
          console.error("AI error:", error);
          if (!abortController.signal.aborted) {
            if (retryCountRef.current < MAX_AI_RETRIES) {
              retryCountRef.current++;
              console.log(`[VoiceScreen] Retrying after error (attempt ${retryCountRef.current})`);
              getAIResponse(userText, intent);
            } else {
              retryCountRef.current = 0;
              speakAndListen(FALLBACK_FR.not_heard);
            }
          }
        },
      });
    } catch (e) {
      clearTimeout(recoveryTimer);
      console.error("AI call exception:", e);
      if (!abortController.signal.aborted) {
        retryCountRef.current = 0;
        speakAndListen(FALLBACK_FR.error);
      }
    }
  }, [audioQueue, childAge, childName, clearAllTimers, conversationHistory, goToListening, goToSpeaking, memory, parentSettings, processSentenceForTTS, session, speakAndListen, startStuckTimer, transition]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. FLUSH ACCUMULATED TEXT → AI
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const flushAccumulatedText = useCallback(() => {
    if (utteranceFlushTimerRef.current) { clearTimeout(utteranceFlushTimerRef.current); utteranceFlushTimerRef.current = null; }
    const text = accumulatedTextRef.current.trim();
    accumulatedTextRef.current = "";
    if (text.length < 3) return;
    console.log("[VoiceScreen] 🔄 Flushing:", text);

    if (isEcho(text)) { console.log("[VoiceScreen] Echo — ignoring"); return; }

    const wake = hasWakeWord(text);
    const cleaned = wake ? stripWakeWord(text) : text;
    if (cleaned.length < 3) {
      if (wake) speakAndListen(FALLBACK_FR.wake_greeting);
      return;
    }

    if (isSimpleGreeting(cleaned)) {
      const cached = getCachedResponse("greeting");
      goToSpeaking();
      eventBus.emit({ type: "SPEECH_START" });
      recentBobbyTextsRef.current = [cached, ...recentBobbyTextsRef.current].slice(0, 8);
      fetchTTSAudio(cached, undefined, currentVoiceId, undefined, currentVoiceSpeed, isCalmMode).then(url => {
        audioQueue.enqueue(url);
        audioQueue.setOnAllDone(() => { eventBus.emit({ type: "SPEECH_STOP" }); goToListening(); });
      }).catch(() => goToListening());
      setConversationHistory(prev => [...prev, { role: "user", content: cleaned }, { role: "assistant", content: cached }]);
      session.addMessage("user", cleaned);
      session.addMessage("assistant", cached);
      return;
    }

    getAIResponse(cleaned);
  }, [audioQueue, currentVoiceId, currentVoiceSpeed, getAIResponse, goToListening, goToSpeaking, isCalmMode, session, speakAndListen]);

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
  // 6. TRANSCRIPT HANDLER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleTranscript = useCallback((text: string, confidence?: number) => {
    const trimmed = text.trim();
    if (trimmed.length < 2) return;
    console.log("[VoiceScreen] Final:", trimmed, "state:", machineStateRef.current, "confidence:", confidence);

    // ─── LOW CONFIDENCE: ask to repeat ───
    if (confidence !== undefined && confidence < LOW_CONFIDENCE_THRESHOLD && !hasWakeWord(trimmed)) {
      console.log("[VoiceScreen] ⚠️ Low confidence STT — asking to repeat");
      speakAndListen(FALLBACK_FR.low_confidence);
      return;
    }

    // ─── SLEEP: wake word required to wake up ───
    if (machineStateRef.current === "SLEEP") {
      if (!hasWakeWord(trimmed)) return;
      console.log("[VoiceScreen] ☀️ Waking from SLEEP!");
      eventBus.emit({ type: "WAKE_DETECTED", confidence: 0.9 });
      ensureSession();
      if (isJustWakeWord(trimmed)) { speakAndListen(FALLBACK_FR.sleep_wake); return; }
      const command = stripWakeWord(trimmed);
      speakAndListen(FALLBACK_FR.sleep_wake);
      accumulatedTextRef.current = command;
      scheduleFlush();
      return;
    }

    // ─── IDLE: wake word or click required ───
    if (machineStateRef.current === "IDLE") {
      if (!hasWakeWord(trimmed)) return;
      console.log("[VoiceScreen] 🎤 Wake word detected!");
      eventBus.emit({ type: "WAKE_DETECTED", confidence: 0.9 });
      ensureSession();
      if (isJustWakeWord(trimmed)) { speakAndListen(FALLBACK_FR.wake_greeting); return; }
      const command = stripWakeWord(trimmed);
      accumulatedTextRef.current = command;
      scheduleFlush();
      return;
    }

    // ─── SPEAKING / PROCESSING: user interrupts ───
    if (machineStateRef.current === "SPEAKING" || machineStateRef.current === "PROCESSING") {
      interrupt();
    }

    // ─── LISTENING / ERROR: accumulate ───
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    const wake = hasWakeWord(trimmed);
    const cleaned = wake ? stripWakeWord(trimmed) : trimmed;
    if (cleaned.length < 2) return;
    accumulatedTextRef.current += (accumulatedTextRef.current ? " " : "") + cleaned;
    scheduleFlush();
  }, [interrupt, scheduleFlush, speakAndListen]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 7. SESSION MANAGEMENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const ensureSession = useCallback(() => {
    if (!sessionStartedRef.current) {
      session.startSession();
      sessionStartedRef.current = true;
      recorder.startRecording();
      eventBus.emit({ type: "SESSION_START" });
    }
    conversationActiveRef.current = true;
  }, [recorder, session]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 8. STT SETUP
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const wakeTriggeredFromPartialRef = useRef(false);

  const deepgramSTT = useSmartSTT({
    onPartial: useCallback((text: string) => {
      setPartialText(text);
      // Wake word on partial — instant activation (IDLE or SLEEP)
      if ((machineStateRef.current === "IDLE" || machineStateRef.current === "SLEEP") && !wakeTriggeredFromPartialRef.current && hasWakeWord(text, true)) {
        console.log("[VoiceScreen] ⚡ Wake on PARTIAL!");
        wakeTriggeredFromPartialRef.current = true;
        eventBus.emit({ type: "WAKE_DETECTED", confidence: computeWakeConfidence(text) });
        ensureSession();
        eventBus.emit({ type: "WAKE_TRIGGERED" });
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
      console.log("[VoiceScreen] 📢 UtteranceEnd — immediate flush");
      isSpeakingRef.current = false;
      // Flush immediately on UtteranceEnd for lowest latency
      if (accumulatedTextRef.current.trim().length > 2) {
        if (utteranceFlushTimerRef.current) { clearTimeout(utteranceFlushTimerRef.current); utteranceFlushTimerRef.current = null; }
        flushAccumulatedText();
      }
    }, [flushAccumulatedText]),
    onSpeechStarted: useCallback(() => {
      isSpeakingRef.current = true;
      // Extend flush timer while user speaks — max 1.8s safety (was 2.5s)
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

  // Start/stop STT — keep mic open for interruption detection
  useEffect(() => {
    if (micArmed) deepgramSTT.start();
    else deepgramSTT.stop();
  }, [micArmed, deepgramSTT]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 9. CLICK INTERACTIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleTapBobby = useCallback(() => {
    const s = machineStateRef.current;

    // First tap: arm microphone
    if (!micArmed) {
      console.log("[VoiceScreen] 🎙️ Mic armed by tap");
      setMicArmed(true);
    }

    if (s === "LISTENING") {
      // Toggle OFF → IDLE (child can stop listening by tapping)
      console.log("[VoiceScreen] 👆 Tap → stopping listening");
      goToIdle();
      return;
    }

    if (s === "SPEAKING" || s === "PROCESSING") {
      // Interrupt → LISTENING
      interrupt();
      return;
    }

    // IDLE, ERROR, or SLEEP → start conversation
    ensureSession();
    eventBus.emit({ type: "WAKE_TRIGGERED" });
    eventBus.emit({ type: "WAKE_DETECTED", confidence: 1.0 });
    speakAndListen(s === "SLEEP" ? FALLBACK_FR.sleep_wake : FALLBACK_FR.wake_greeting);
  }, [micArmed, ensureSession, goToIdle, interrupt, speakAndListen]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 10. PARENT MODE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 11. DEBUG TOGGLE (7 taps on parent button)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const debugTapCountRef = useRef(0);
  const debugTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleDebugToggle = useCallback(() => {
    debugTapCountRef.current++;
    if (debugTapTimerRef.current) clearTimeout(debugTapTimerRef.current);
    debugTapTimerRef.current = setTimeout(() => { debugTapCountRef.current = 0; }, 1500);
    if (debugTapCountRef.current >= 5) {
      debugTapCountRef.current = 0;
      setShowDebug(prev => !prev);
    }
  }, []);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const displayState = toVoiceState(machineState);

  const stateLabel = {
    IDLE: partialText ? `"${partialText}"` : (micArmed ? 'Dis "Bobby" pour me parler !' : 'Touche Bobby pour commencer !'),
    LISTENING: partialText ? `"${partialText}"` : "J'écoute…",
    PROCESSING: "Je réfléchis…",
    SPEAKING: "Je parle…",
    ERROR: "Dis-moi !",
    SLEEP: "💤 Bobby dort… dis son nom pour le réveiller !",
  }[machineState];

  return (
    <div className="child-light flex flex-col items-center justify-between h-screen px-4 py-6 max-w-lg mx-auto select-none overflow-hidden relative"
      style={{ background: `linear-gradient(180deg, hsl(220, 25%, 82%) 0%, hsl(230, 22%, 78%) 50%, hsl(240, 20%, 75%) 100%)` }}>

      {/* Debug overlay */}
      {showDebug && (
        <DebugOverlay
          state={machineState}
          micArmed={micArmed}
          micRunning={deepgramSTT.isRunning.current}
          partialText={partialText}
          lastRecognized={lastRecognized}
          lastAiResponse={lastAiResponse}
          sttBackend={deepgramSTT.backend}
        />
      )}

      <FloatingParticles />

      {/* Top bar */}
      <div className="w-full flex items-center justify-end px-2 relative z-10">
        <div className="flex items-center gap-2">
          {parentSettings?.enableCamera && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 backdrop-blur-sm border border-primary/20 text-primary">
              <Camera className="w-3.5 h-3.5" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            </div>
          )}
          <button onClick={() => { handleParentMode(); handleDebugToggle(); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/70 backdrop-blur-sm border border-border/50 text-muted-foreground text-sm font-semibold shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-300">
            <Settings className="w-4 h-4" />
            Parent
          </button>
        </div>
      </div>

      {/* Hologram area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 relative z-10">
        <div className="absolute w-96 h-96 rounded-full pointer-events-none transition-all duration-500"
          style={{
            background: partialText && machineState === "LISTENING"
              ? `radial-gradient(circle, hsla(210, 100%, 65%, 0.35) 0%, hsla(210, 90%, 60%, 0.2) 30%, hsla(230, 70%, 65%, 0.08) 55%, transparent 75%)`
              : `radial-gradient(circle, hsla(215, 85%, 70%, ${displayState === "speaking" ? 0.2 : 0.12}) 0%, hsla(270, 50%, 70%, ${displayState === "speaking" ? 0.12 : 0.06}) 35%, hsla(320, 40%, 70%, 0.03) 55%, transparent 75%)`,
            animation: partialText && machineState === "LISTENING" ? "glow-voice 1.2s ease-in-out infinite alternate" : undefined,
          }}
        />

        <div className="relative w-80 h-80 md:w-96 md:h-96" onPointerDownCapture={handleTapBobby}>
          <HologramFace
            voiceState={displayState}
            enableCamera={parentSettings?.enableCamera ?? false}
            onTripleTap={handleParentMode}
            bobbyColor={parentSettings?.bobbyColor}
          />
        </div>

        {/* State label */}
        <p className="mt-4 text-sm font-bold text-foreground/70 tracking-wide text-center px-4">
          {stateLabel}
        </p>

        {/* Mic status */}
        <div className="mt-2 flex flex-col items-center gap-1.5">
          {machineState === "LISTENING" ? (
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-primary/10 backdrop-blur-sm">
              <SoundWave active={partialText.length > 0} />
              <span className="text-xs text-primary font-bold">
                {partialText ? "Bobby t'entend…" : "J'écoute…"}
              </span>
              <SoundWave active={partialText.length > 0} />
            </div>
          ) : machineState === "IDLE" && micArmed ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-sm">
              <Mic className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">En attente de "Bobby"</span>
            </div>
          ) : machineState === "IDLE" && !micArmed ? null : machineState === "SPEAKING" ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100/60 backdrop-blur-sm">
              <span className="text-xs text-blue-600 font-bold">👆 Touche pour interrompre</span>
            </div>
          ) : machineState === "SLEEP" ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100/50 backdrop-blur-sm animate-pulse">
              <MicOff className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs text-indigo-500 font-medium">Mode veille</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="pb-4" />
    </div>
  );
};

export default VoiceScreen;
