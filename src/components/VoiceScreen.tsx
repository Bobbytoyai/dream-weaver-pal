// @refresh reset
/* v6 — Clear interaction states: who speaks, who listens, processing indicator */
import { useState, useEffect, useRef, useCallback } from "react";
import { eventBus } from "@/lib/eventBus";
import { getUnreadAlertCount } from "@/lib/offlineEngine";
import { Settings, Camera, Gamepad2 } from "lucide-react";
import { ParentSettings } from "@/components/parentSettings";
import { LazyHologramFace as HologramFace } from "@/components/hologram/LazyHologramFace";
import { setDisabledExpressions } from "@/lib/bobby/expressionEngine";

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

/** Thinking dots animation for PROCESSING state */
const ThinkingAnimation = () => (
  <div className="flex flex-col items-center gap-2">
    <div className="flex items-center gap-2">
      {[0, 1, 2].map(i => (
        <div key={i} className="w-3 h-3 rounded-full bg-amber-400"
          style={{
            animation: `thinking-bounce 1.2s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
          }} />
      ))}
    </div>
    <p className="text-xs font-bold text-amber-600/80">Bobby réfléchit…</p>
    <style>{`
      @keyframes thinking-bounce {
        0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
        40% { transform: scale(1.1); opacity: 1; }
      }
    `}</style>
  </div>
);

/** State badge showing current interaction mode */
const StateBadge = ({ state, musicPlaying }: { state: ConversationState; musicPlaying: boolean }) => {
  if (musicPlaying) return (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-100 border border-pink-300">
      <span className="text-xs">🎵</span>
      <span className="text-[10px] font-bold text-pink-600">Musique</span>
    </div>
  );
  
  const config: Record<string, { label: string; bg: string; border: string; text: string }> = {
    LISTENING: { label: "Bobby écoute…", bg: "bg-green-100", border: "border-green-300", text: "text-green-700" },
    PROCESSING: { label: "Bobby réfléchit…", bg: "bg-amber-100", border: "border-amber-300", text: "text-amber-700" },
    SPEAKING: { label: "Bobby parle", bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-700" },
    IDLE: { label: "Prêt", bg: "bg-gray-100", border: "border-gray-300", text: "text-gray-600" },
    SLEEP: { label: "Bobby dort", bg: "bg-indigo-100", border: "border-indigo-300", text: "text-indigo-600" },
    ERROR: { label: "Petit souci", bg: "bg-red-100", border: "border-red-300", text: "text-red-600" },
    RELANCE: { label: "Bobby attend", bg: "bg-purple-100", border: "border-purple-300", text: "text-purple-600" },
  };
  
  const c = config[state] || config.IDLE;
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${c.bg} border ${c.border} transition-all duration-300`}>
      <span className={`text-[10px] font-bold ${c.text}`}>{c.label}</span>
    </div>
  );
};

const FloatingMusicNotes = () => {
  const notes = ["♪", "♫", "♬", "🎵", "🎶", "♩"];
  const particles = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    note: notes[i % notes.length],
    left: 10 + Math.random() * 80,
    delay: Math.random() * 4,
    duration: 3 + Math.random() * 4,
    size: 14 + Math.random() * 18,
    swayAmount: 20 + Math.random() * 40,
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
      {particles.map(p => (
        <div key={p.id} className="absolute animate-bounce"
          style={{
            left: `${p.left}%`,
            bottom: "-30px",
            fontSize: `${p.size}px`,
            opacity: 0.7,
            animation: `music-float-${p.id} ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
          }} >
          {p.note}
        </div>
      ))}
      <style>{particles.map(p => `
        @keyframes music-float-${p.id} {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.8; }
          50% { transform: translateY(-45vh) translateX(${p.swayAmount}px) rotate(${15 + p.id * 5}deg); opacity: 0.6; }
          90% { opacity: 0.2; }
          100% { transform: translateY(-90vh) translateX(-${p.swayAmount / 2}px) rotate(-${10 + p.id * 3}deg); opacity: 0; }
        }
      `).join("")}</style>
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

  // Sync disabled expressions from parent settings
  useEffect(() => {
    setDisabledExpressions(parentSettings?.disabledExpressions || []);
  }, [parentSettings?.disabledExpressions]);

  // Launch game activity when selected from Activities menu
  const lastGameRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeGameCategory || activeGameCategory === lastGameRef.current) return;
    lastGameRef.current = activeGameCategory;
    const GAME_PROMPTS: Record<string, string> = {
      quiz_animaux: `On joue au Quiz Animaux ! Je pense à un animal… devine lequel ! 🐾`,
      devinettes: `J'ai une devinette pour toi ! Écoute bien… 🤔`,
      vrai_faux: `On joue à Vrai ou Faux ! Je te dis quelque chose et tu me dis si c'est vrai ou faux ! ✅`,
      quiz_educatif: `On explore la science ensemble ! Prêt pour un quiz ? 🔬`,
      blagues: `Tu veux rire ? J'ai une blague trop drôle pour toi ! 😂`,
    };
    const prompt = GAME_PROMPTS[activeGameCategory];
    if (prompt) {
      setTimeout(() => {
        sm.handleTapBobby();
        setTimeout(() => {
          eventBus.emit({ type: "SFX_PLAY", sound: "speaking_chime" });
        }, 300);
      }, 500);
    }
    onClearGame?.();
  }, [activeGameCategory, childName, sm, onClearGame]);

  const [showDebug, setShowDebug] = useState(false);
  const [safetyBadge, setSafetyBadge] = useState(() => getUnreadAlertCount());

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

  // Background color from customization
  const BG_HEX_MAP: Record<string, string> = {
    "soft-blue": "#E8F0FE", "soft-pink": "#FDE8F0", "soft-green": "#E8FEF0",
    "soft-purple": "#F0E8FE", "soft-yellow": "#FEF8E8", "white": "#FFFFFF",
    "dark": "#1A1A2E", "night": "#0D1B2A",
  };
  const bgId = parentSettings?.bobbyColors?.background || "soft-blue";
  const bgHex = BG_HEX_MAP[bgId] || "#E8F0FE";
  const isDark = bgId === "dark" || bgId === "night";

  return (
    <div className="child-light flex flex-col items-center justify-between h-screen w-screen px-4 py-6 select-none overflow-hidden relative"
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

      {/* Top — State badge */}
      <div className="w-full flex justify-center pt-2 pb-1 relative z-20">
        <StateBadge state={sm.machineState} musicPlaying={sm.musicPlaying} />
      </div>

      {/* Hologram area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 relative z-10">
        <div className="absolute w-80 h-80 md:w-[28rem] md:h-[28rem] lg:w-[34rem] lg:h-[34rem] rounded-full pointer-events-none transition-all duration-500"
          style={{
            background: sm.partialText && sm.machineState === "LISTENING"
              ? `radial-gradient(circle, hsla(120, 80%, 55%, 0.30) 0%, hsla(120, 70%, 50%, 0.15) 30%, hsla(150, 60%, 55%, 0.06) 55%, transparent 75%)`
              : sm.machineState === "PROCESSING"
                ? `radial-gradient(circle, hsla(40, 90%, 60%, 0.25) 0%, hsla(40, 80%, 55%, 0.12) 30%, transparent 60%)`
                : sm.machineState === "SPEAKING"
                  ? `radial-gradient(circle, hsla(215, 85%, 65%, 0.25) 0%, hsla(215, 80%, 60%, 0.12) 30%, transparent 60%)`
                  : `radial-gradient(circle, hsla(215, 85%, 70%, 0.12) 0%, hsla(270, 50%, 70%, 0.06) 35%, transparent 55%)`,
            animation: sm.partialText && sm.machineState === "LISTENING" ? "glow-voice 1.2s ease-in-out infinite alternate" : 
              sm.machineState === "PROCESSING" ? "glow-think 2s ease-in-out infinite alternate" : undefined,
          }}
        />

        <div className="relative w-80 h-80 md:w-[28rem] md:h-[28rem] lg:w-[34rem] lg:h-[34rem]" onPointerDownCapture={sm.handleTapBobby}>
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

        {sm.musicPlaying && <FloatingMusicNotes />}
      </div>

      {/* Bottom section — interaction feedback */}
      <div className="w-full flex flex-col items-center gap-2 pb-6 relative z-10">

        {/* Child's speech — bold, prominent */}
        {sm.machineState === "LISTENING" && sm.partialText && (
          <div className="animate-in fade-in slide-in-from-bottom-1 duration-200 w-full px-5">
            <div className="flex items-start gap-2 justify-center">
              <span className="text-green-500 text-sm mt-0.5">🎤</span>
              <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-black'} text-center leading-snug`}>
                {sm.partialText}
              </p>
            </div>
          </div>
        )}

        {/* Child's recognized text (after finalization) — bold black */}
        {(sm.machineState === "PROCESSING" || sm.machineState === "SPEAKING") && sm.lastRecognized && (
          <div className="animate-in fade-in duration-300 w-full px-5">
            <div className="flex items-start gap-2 justify-center">
              <span className="text-sm mt-0.5">👦</span>
              <p className={`text-sm font-black ${isDark ? 'text-white/90' : 'text-black/90'} text-center leading-snug italic`}>
                « {sm.lastRecognized} »
              </p>
            </div>
          </div>
        )}

        {/* Processing animation */}
        {sm.machineState === "PROCESSING" && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <ThinkingAnimation />
          </div>
        )}

        {/* Bobby's response text */}
        {(sm.machineState === "SPEAKING" || sm.musicPlaying) && sm.bobbyText && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 w-full px-5">
            <div className="flex items-start gap-2 justify-center">
              <span className="text-blue-500 text-sm mt-0.5">💬</span>
              <p className={`text-xs font-bold ${isDark ? 'text-white/60' : 'text-black/60'} text-center leading-snug`}>
                {sm.bobbyText}
              </p>
            </div>
          </div>
        )}

        {/* Listening animation */}
        {sm.machineState === "LISTENING" && (
          <MicListeningAnimation hasVoice={!!sm.partialText} />
        )}

        {/* Idle / Sleep labels */}
        {sm.machineState === "IDLE" && (
          <p className={`text-sm font-semibold ${isDark ? 'text-white/50' : 'text-black/50'} text-center`}>
            Touche Bobby pour parler !
          </p>
        )}
        {sm.machineState === "SLEEP" && (
          <p className={`text-sm font-semibold ${isDark ? 'text-white/50' : 'text-black/50'} text-center`}>
            💤 Bobby dort… touche Bobby pour le réveiller !
          </p>
        )}
      </div>

      {/* Thinking glow keyframe */}
      <style>{`
        @keyframes glow-think {
          0% { opacity: 0.7; transform: scale(0.98); }
          100% { opacity: 1; transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
};

export default VoiceScreen;