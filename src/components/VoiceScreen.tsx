// @refresh reset
/* v5 — Thin UI shell — logic extracted to useConversationStateMachine */
import { useState, useEffect, useRef, useCallback } from "react";
import { eventBus } from "@/lib/eventBus";
import { getUnreadAlertCount } from "@/lib/offlineEngine";
import { Settings, Camera, Gamepad2 } from "lucide-react";
import { ParentSettings } from "@/components/parentSettings";
import { HologramFace } from "@/components/hologram/HologramFace";

import {
  useConversationStateMachine,
  type ConversationState,
  type PendingNarration,
  FALLBACK_FR,
} from "@/hooks/useConversationStateMachine";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UI COMPONENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MicListeningAnimation = ({ hasVoice }: { hasVoice: boolean }) => {
  const bars = 7;
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Pulsing rings */}
      <div className="relative w-16 h-16 flex items-center justify-center">
        <div className={`absolute inset-0 rounded-full border-2 border-primary/40 ${hasVoice ? 'animate-ping' : 'animate-pulse'}`} 
          style={{ animationDuration: hasVoice ? '1s' : '2s' }} />
        <div className={`absolute inset-1 rounded-full border border-primary/25 ${hasVoice ? 'animate-ping' : ''}`}
          style={{ animationDuration: '1.5s', animationDelay: '0.3s' }} />
        <div className="w-10 h-10 rounded-full bg-primary/15 backdrop-blur-sm flex items-center justify-center">
          <div className={`w-4 h-4 rounded-full ${hasVoice ? 'bg-primary animate-pulse' : 'bg-primary/50'}`} 
            style={{ animationDuration: '0.6s' }} />
        </div>
      </div>
      {/* Sound bars */}
      <div className="flex items-end gap-[3px] h-8">
        {Array.from({ length: bars }, (_, i) => (
          <div key={i} className="rounded-full transition-all"
            style={{
              backgroundColor: "hsl(var(--primary))",
              width: "4px",
              height: hasVoice ? `${10 + Math.sin(Date.now() / 150 + i * 0.9) * 10 + Math.random() * 6}px` : "4px",
              opacity: hasVoice ? 0.85 : 0.25,
              transition: hasVoice ? 'height 0.1s ease-out' : 'height 0.4s ease-out',
              animation: hasVoice ? `soundbar-${i} ${0.25 + (i % 3) * 0.1}s ease-in-out infinite alternate` : "none",
            }} />
        ))}
        <style>{`${Array.from({ length: bars }, (_, i) => `
          @keyframes soundbar-${i} { 0% { height: ${5 + (i % 3) * 3}px; } 100% { height: ${16 + ((i + 1) % bars) * 4}px; } }
        `).join("")}`}</style>
      </div>
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

const DebugOverlay = ({ state, micRunning, partialText, lastRecognized, lastAiResponse, offline }: {
  state: ConversationState; micRunning: boolean;
  partialText: string; lastRecognized: string; lastAiResponse: string; offline: boolean;
}) => (
  <div className="fixed top-0 left-0 right-0 z-50 bg-black/85 text-white p-3 text-[10px] font-mono space-y-1 pointer-events-none max-h-48 overflow-y-auto">
    <div className="flex gap-3 flex-wrap">
      <span>State: <span className={`font-bold ${state === "ERROR" ? "text-red-400" : state === "LISTENING" ? "text-green-400" : state === "SPEAKING" ? "text-blue-400" : state === "PROCESSING" ? "text-yellow-400" : state === "SLEEP" ? "text-indigo-400" : "text-gray-400"}`}>{state}</span></span>
      <span>Mic: {micRunning ? "🟢 ON" : "🔴 OFF"}</span>
      <span>STT: Natif</span>
      <span>Net: {offline ? "🔴 OFFLINE" : "🟢 ONLINE"}</span>
    </div>
    {partialText && <div className="text-green-300 truncate">📝 "{partialText}"</div>}
    {lastRecognized && <div className="text-cyan-300 truncate">✅ "{lastRecognized}"</div>}
    {lastAiResponse && <div className="text-purple-300 truncate">🤖 "{lastAiResponse.slice(0, 100)}"</div>}
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
  onActivities?: () => void;
  parentSettings?: ParentSettings;
  activeGameCategory?: string | null;
  onClearGame?: () => void;
  pendingNarration?: PendingNarration | null;
  onNarrationConsumed?: () => void;
}

const VoiceScreen = ({
  childName, childAge, onSwitchToChat, onSwitchToStory, onParentMode, onActivities,
  parentSettings, activeGameCategory, onClearGame, pendingNarration, onNarrationConsumed,
}: VoiceScreenProps) => {

  const sm = useConversationStateMachine({
    childName, childAge, parentSettings,
    pendingNarration, onNarrationConsumed, onParentMode,
  });

  // (Snoring sound removed)

  // Launch game activity when selected from Activities menu
  const lastGameRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeGameCategory || activeGameCategory === lastGameRef.current) return;
    lastGameRef.current = activeGameCategory;
    const GAME_PROMPTS: Record<string, string> = {
      quiz_animaux: `${childName}, on joue au Quiz Animaux ! Je pense à un animal… devine lequel ! 🐾`,
      devinettes: `${childName}, j'ai une devinette pour toi ! Écoute bien… 🤔`,
      vrai_faux: `${childName}, on joue à Vrai ou Faux ! Je te dis quelque chose et tu me dis si c'est vrai ou faux ! ✅`,
      quiz_educatif: `${childName}, on explore la science ensemble ! Prêt pour un quiz ? 🔬`,
      blagues: `${childName}, tu veux rire ? J'ai une blague trop drôle pour toi ! 😂`,
    };
    const prompt = GAME_PROMPTS[activeGameCategory];
    if (prompt) {
      // Small delay to let the screen mount
      setTimeout(() => {
        sm.handleTapBobby(); // Wake Bobby
        setTimeout(() => {
          // Speak the game intro then listen for the child's answer
          eventBus.emit({ type: "SFX_PLAY", sound: "speaking_chime" });
        }, 300);
      }, 500);
    }
    onClearGame?.();
  }, [activeGameCategory, childName, sm, onClearGame]);

  const [showDebug, setShowDebug] = useState(false);
  const [safetyBadge, setSafetyBadge] = useState(() => getUnreadAlertCount());

  // Refresh safety badge when a new SAFETY_ALERT is emitted
  useEffect(() => {
    return eventBus.on("SAFETY_ALERT", () => {
      setSafetyBadge(getUnreadAlertCount());
    });
  }, []);

  // Debug toggle (5 taps on parent button)
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

  // stateLabel removed — transcription shown directly at bottom

  // Background color from customization
  const BG_HEX_MAP: Record<string, string> = {
    "soft-blue": "#E8F0FE", "soft-pink": "#FDE8F0", "soft-green": "#E8FEF0",
    "soft-purple": "#F0E8FE", "soft-yellow": "#FEF8E8", "white": "#FFFFFF",
    "dark": "#1A1A2E", "night": "#0D1B2A",
  };
  const bgId = parentSettings?.bobbyColors?.background || "soft-blue";
  const bgHex = BG_HEX_MAP[bgId] || "#E8F0FE";

  return (
    <div className="child-light flex flex-col items-center justify-between h-screen px-4 py-6 max-w-lg mx-auto select-none overflow-hidden relative"
      style={{ background: bgHex }}>

      {showDebug && (
        <DebugOverlay
          state={sm.machineState}
          micRunning={sm.sttIsRunning.current}
          partialText={sm.partialText}
          lastRecognized={sm.lastRecognized}
          lastAiResponse={sm.lastAiResponse}
          offline={sm.networkOffline}
        />
      )}

      {sm.networkOffline && (
        <div className="fixed top-2 left-2 z-40 px-3 py-1 rounded-full bg-orange-500/90 text-white text-[10px] font-bold animate-pulse">
          ⚡ Mode Offline
        </div>
      )}

      {/* FloatingParticles removed */}

      {/* Top bar */}
      <div className="w-full flex items-center justify-between px-2 relative z-10">
        <div>
          {onActivities && (
            <button onClick={onActivities}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/70 backdrop-blur-sm border border-border/50 text-muted-foreground text-sm font-semibold shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-300">
              <Gamepad2 className="w-4 h-4" />
              Activités
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {parentSettings?.enableCamera && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 backdrop-blur-sm border border-primary/20 text-primary">
              <Camera className="w-3.5 h-3.5" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            </div>
          )}
          <button onClick={() => { sm.handleParentMode(); handleDebugToggle(); setSafetyBadge(0); }}
            className="relative flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/70 backdrop-blur-sm border border-border/50 text-muted-foreground text-sm font-semibold shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-300">
            <Settings className="w-4 h-4" />
            Parent
            {safetyBadge > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1 animate-pulse shadow-sm">
                {safetyBadge > 9 ? "9+" : safetyBadge}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Hologram area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 relative z-10">
        <div className="absolute w-96 h-96 rounded-full pointer-events-none transition-all duration-500"
          style={{
            background: sm.partialText && sm.machineState === "LISTENING"
              ? `radial-gradient(circle, hsla(210, 100%, 65%, 0.35) 0%, hsla(210, 90%, 60%, 0.2) 30%, hsla(230, 70%, 65%, 0.08) 55%, transparent 75%)`
              : `radial-gradient(circle, hsla(215, 85%, 70%, ${sm.displayState === "speaking" ? 0.2 : 0.12}) 0%, hsla(270, 50%, 70%, ${sm.displayState === "speaking" ? 0.12 : 0.06}) 35%, hsla(320, 40%, 70%, 0.03) 55%, transparent 75%)`,
            animation: sm.partialText && sm.machineState === "LISTENING" ? "glow-voice 1.2s ease-in-out infinite alternate" : undefined,
          }}
        />

        <div className="relative w-80 h-80 md:w-96 md:h-96" onPointerDownCapture={sm.handleTapBobby}>
          <HologramFace
            voiceState={sm.displayState}
            enableCamera={parentSettings?.enableCamera ?? false}
            onTripleTap={sm.handleParentMode}
            bobbyColor={parentSettings?.bobbyColor}
            bobbyColors={parentSettings?.bobbyColors}
            emotionOverride={sm.bobbyFaceEmotion}
            emotionIntensity={sm.bobbyEmotionIntensity}
            expressionOverride={sm.expressionCombo}
            expressionIntensityLevel={sm.expressionIntensityLevel}
          />
        </div>


        {/* Bobby text removed from here — now in bottom section */}
      </div>

      {/* Bottom section — fixed at bottom */}
      <div className="w-full flex flex-col items-center gap-3 pb-6 relative z-10">

        {/* Live conversation transcript — always visible at bottom */}
        <div className="w-full px-5 flex flex-col gap-2 max-h-32 overflow-y-auto">
          {/* Child's recognized text */}
          {(sm.machineState === "LISTENING" || sm.machineState === "PROCESSING" || sm.machineState === "SPEAKING") && sm.lastRecognized && (
            <div className="animate-in fade-in duration-200">
              <p className="text-base font-bold text-foreground/75 text-center leading-snug">
                <span className="text-xs font-semibold text-foreground/40 uppercase tracking-wider">{childName}</span>
                <br />
                "{sm.lastRecognized}"
              </p>
            </div>
          )}

          {/* Live partial transcription while listening */}
          {sm.machineState === "LISTENING" && sm.partialText && !sm.lastRecognized && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
              <p className="text-lg font-extrabold text-foreground/70 text-center leading-tight">
                <span className="text-xs font-semibold text-foreground/40 uppercase tracking-wider">{childName}</span>
                <br />
                "{sm.partialText}"
              </p>
            </div>
          )}

          {/* Bobby's response text */}
          {sm.machineState === "SPEAKING" && sm.bobbyText && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 mt-1">
              <p className="text-base font-bold text-primary text-center leading-snug">
                <span className="text-xs font-semibold text-primary/50 uppercase tracking-wider">Bobby</span>
                <br />
                "{sm.bobbyText}"
              </p>
            </div>
          )}
        </div>

        {/* Listening animation */}
        {sm.machineState === "LISTENING" && (
          <MicListeningAnimation hasVoice={!!sm.partialText} />
        )}

        {/* Idle / Sleep labels */}
        {sm.machineState === "IDLE" && (
          <p className="text-sm font-semibold text-foreground/50 text-center">
            Touche Bobby pour parler !
          </p>
        )}
        {sm.machineState === "SLEEP" && (
          <p className="text-sm font-semibold text-foreground/50 text-center">
            💤 Bobby dort… touche Bobby pour le réveiller !
          </p>
        )}
      </div>
    </div>
  );
};

export default VoiceScreen;
