import { useMemo, useCallback, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { type ParentSessionMessage, emotionLabels } from "./parentTypes";

interface SessionTranscriptionProps {
  session: { duration_seconds: number | null };
  sessionMessages: ParentSessionMessage[];
  displayName: string;
  currentActiveIdx: number;
  isPlaying: boolean;
  onJumpToMoment: (idx: number) => void;
}

const SessionTranscription = ({
  session, sessionMessages, displayName,
  currentActiveIdx, isPlaying, onJumpToMoment,
}: SessionTranscriptionProps) => {
  // ─── TTS for individual messages ───
  const [ttsPlaying, setTtsPlaying] = useState<string | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  const speakMessage = useCallback(async (text: string) => {
    if (!text) return;
    if (ttsPlaying === text) { ttsAudioRef.current?.pause(); setTtsPlaying(null); return; }
    ttsAudioRef.current?.pause();
    setTtsPlaying(text);
    try {
      const { fetchTTSAudio } = await import("@/lib/voicePipeline");
      const url = await fetchTTSAudio(text.slice(0, 500), undefined, "female");
      if (url === "__silent__") { setTtsPlaying(null); return; }
      const audio = new Audio(url);
      ttsAudioRef.current = audio;
      audio.onended = () => { setTtsPlaying(null); URL.revokeObjectURL(url); };
      audio.play();
    } catch { setTtsPlaying(null); }
  }, [ttsPlaying]);

  // ─── Key moments ───
  const keyMoments = useMemo(() => {
    if (sessionMessages.length === 0) return [];
    return sessionMessages
      .map((msg, idx) => ({ ...msg, idx }))
      .filter(msg => msg.detected_emotion && msg.detected_emotion !== "neutral" && msg.role === "user")
      .slice(0, 5);
  }, [sessionMessages]);

  return (
    <>
      {/* Key moments */}
      {keyMoments.length > 0 && (
        <div className="retro-card p-5" style={{ backgroundColor: 'var(--retro-yellow)' }}>
          <div className="flex items-center gap-2.5 mb-4">
            <span className="text-2xl">⭐</span>
            <h3 className="text-[16px] font-black text-gray-800 uppercase">Moments clés</h3>
          </div>
          <div className="space-y-2.5">
            {keyMoments.map((moment, i) => {
              const emo = emotionLabels[moment.detected_emotion!] || { emoji: "💬", label: moment.detected_emotion, color: "bg-muted text-muted-foreground" };
              return (
                <button key={i} onClick={() => onJumpToMoment(moment.idx)}
                  className="w-full flex items-start gap-3 p-3.5 border-2 border-black bg-white hover:bg-muted transition-all text-left">
                  <span className="text-xl mt-0.5">{emo.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-gray-800 line-clamp-2 leading-relaxed font-bold">{moment.content}</p>
                    <span className={`text-[11px] px-2 py-0.5 font-bold mt-1.5 inline-block border border-black ${emo.color}`}>
                      {emo.label}
                    </span>
                  </div>
                  <Play className="w-4 h-4 text-gray-800 mt-1.5 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Transcription */}
      {sessionMessages.length > 0 && (
        <div className="retro-card p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 bg-black flex items-center justify-center"><span className="text-white text-sm">📖</span></div>
            <h3 className="text-[16px] font-black text-black uppercase">Transcription</h3>
            <span className="ml-auto text-[12px] text-black/60 font-black bg-white px-2.5 py-1 border-2 border-black">{sessionMessages.length} msgs</span>
          </div>
          <div className="max-h-[500px] overflow-y-auto space-y-3 py-1">
            {sessionMessages.map((msg, i) => {
              const isChild = msg.role === "user";
              const isActive = i === currentActiveIdx && isPlaying;
              const isTtsSpeaking = ttsPlaying === msg.content;
              const time = new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={i} className={`flex ${isChild ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[82%] relative group ${isActive ? "scale-[1.02]" : ""} transition-transform duration-200`}>
                    <div className={`px-4 py-3 border-2 border-black ${isChild ? "bg-white" : "bg-[var(--retro-blue)]"} ${isActive ? "ring-2 ring-foreground/30" : ""}`}
                      style={{ boxShadow: "2px 2px 0px rgba(0,0,0,0.15)" }}>
                      <p className="text-[14px] text-black leading-[1.5] font-bold">{msg.content}</p>
                    </div>
                    <div className={`flex items-center gap-2 mt-1.5 px-1.5 ${isChild ? "" : "justify-end"}`}>
                      <span className="text-[11px] text-black/50 font-black">{isChild ? `👦 ${displayName}` : "🤖 Bobby"}</span>
                      <span className="text-[10px] text-black/40 font-bold">{time}</span>
                      {msg.detected_emotion && (
                        <span className="text-[10px] px-2 py-0.5 border border-black bg-white font-black">
                          {emotionLabels[msg.detected_emotion]?.emoji}
                        </span>
                      )}
                      <button onClick={() => speakMessage(msg.content)}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 border border-black flex items-center justify-center text-black/60 hover:bg-[var(--retro-yellow)] transition-all">
                        {isTtsSpeaking ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Emotional timeline */}
      {sessionMessages.filter(m => m.detected_emotion && m.role === "user").length > 0 && (
        <div className="retro-card p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 bg-black flex items-center justify-center"><span className="text-white text-sm">📈</span></div>
            <h3 className="text-[16px] font-black text-black uppercase">Timeline émotionnelle</h3>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {sessionMessages.map((msg, i) => {
              if (msg.role !== "user" || !msg.detected_emotion) return null;
              const emo = emotionLabels[msg.detected_emotion] || { emoji: "💬", color: "bg-muted text-muted-foreground" };
              const totalUserMsgs = sessionMessages.filter(m => m.role === "user").length;
              const userIdx = sessionMessages.filter((m, j) => j < i && m.role === "user").length;
              const timeStr = totalUserMsgs > 0 && session.duration_seconds
                ? `${Math.floor((userIdx / totalUserMsgs) * (session.duration_seconds / 60))}:${String(Math.floor((userIdx / totalUserMsgs) * session.duration_seconds % 60)).padStart(2, "0")}`
                : "";
              return (
                <button key={i} onClick={() => onJumpToMoment(i)}
                  className="flex flex-col items-center px-1.5 py-1.5 border border-black hover:bg-[var(--retro-yellow)] transition-all min-w-[36px]">
                  <span className="text-base">{emo.emoji}</span>
                  <span className="text-[9px] text-black/60 font-mono font-black">{timeStr}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

export default SessionTranscription;
