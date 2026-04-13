import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, Loader2, SkipForward, SkipBack, X } from "lucide-react";
import type { ParentSessionMessage } from "./parentTypes";

interface SessionAudioPlayerProps {
  session: { duration_seconds: number | null };
  analysis: { audio_path?: string | null } | null;
  sessionMessages: ParentSessionMessage[];
  displayName: string;
  // Audio file state (from useAudioPlayer)
  playingAudio: string | null;
  audioProgress: number;
  audioDuration: number;
  audioSpeed: number;
  activeMessageIdx: number;
  playAudio: (path: string) => void;
  seekAudio: (pct: number) => void;
  skipAudio: (seconds: number) => void;
  setAudioSpeed: (speed: number) => void;
}

const SessionAudioPlayer = ({
  session, analysis, sessionMessages, displayName,
  playingAudio, audioProgress, audioDuration, audioSpeed, activeMessageIdx,
  playAudio, seekAudio, skipAudio, setAudioSpeed,
}: SessionAudioPlayerProps) => {
  // ─── Full TTS playback state ───
  const [fullPlaybackActive, setFullPlaybackActive] = useState(false);
  const [fullPlaybackIdx, setFullPlaybackIdx] = useState(0);
  const [fullPlaybackPaused, setFullPlaybackPaused] = useState(false);
  const [fullPlaybackSpeed, setFullPlaybackSpeed] = useState(1);
  const [fullPlaybackLoading, setFullPlaybackLoading] = useState(false);
  const fullPlaybackRef = useRef<{ cancelled: boolean; audio: HTMLAudioElement | null }>({ cancelled: false, audio: null });

  const startFullPlayback = useCallback((fromIdx = 0) => {
    setFullPlaybackActive(true);
    setFullPlaybackIdx(fromIdx);
    setFullPlaybackPaused(false);
    fullPlaybackRef.current.cancelled = false;
  }, []);

  const stopFullPlayback = useCallback(() => {
    fullPlaybackRef.current.cancelled = true;
    fullPlaybackRef.current.audio?.pause();
    fullPlaybackRef.current.audio = null;
    setFullPlaybackActive(false);
    setFullPlaybackPaused(false);
    setFullPlaybackLoading(false);
  }, []);

  const toggleFullPlaybackPause = useCallback(() => {
    if (fullPlaybackPaused) {
      fullPlaybackRef.current.audio?.play();
      setFullPlaybackPaused(false);
    } else {
      fullPlaybackRef.current.audio?.pause();
      setFullPlaybackPaused(true);
    }
  }, [fullPlaybackPaused]);

  useEffect(() => {
    if (!fullPlaybackActive || fullPlaybackPaused || fullPlaybackRef.current.cancelled) return;
    if (sessionMessages.length === 0) { stopFullPlayback(); return; }
    if (fullPlaybackIdx >= sessionMessages.length) { stopFullPlayback(); return; }

    let cancelled = false;
    const playNext = async () => {
      const msg = sessionMessages[fullPlaybackIdx];
      if (!msg?.content) { if (!cancelled) setFullPlaybackIdx(i => i + 1); return; }
      setFullPlaybackLoading(true);
      try {
        const { fetchTTSAudio } = await import("@/lib/voicePipeline");
        const voice = msg.role === "user" ? "child" : "female";
        const url = await fetchTTSAudio(msg.content.slice(0, 500), undefined, voice);
        if (cancelled || fullPlaybackRef.current.cancelled) return;
        if (url === "__silent__") { setFullPlaybackIdx(i => i + 1); return; }
        const audio = new Audio(url);
        audio.playbackRate = fullPlaybackSpeed;
        fullPlaybackRef.current.audio = audio;
        setFullPlaybackLoading(false);
        await new Promise<void>((resolve) => {
          audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
          audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
          audio.play().catch(() => resolve());
        });
        if (!cancelled && !fullPlaybackRef.current.cancelled) setFullPlaybackIdx(i => i + 1);
      } catch {
        setFullPlaybackLoading(false);
        if (!cancelled) setFullPlaybackIdx(i => i + 1);
      }
    };
    playNext();
    return () => { cancelled = true; };
  }, [fullPlaybackActive, fullPlaybackIdx, fullPlaybackPaused, sessionMessages, fullPlaybackSpeed, stopFullPlayback]);

  useEffect(() => {
    if (fullPlaybackRef.current.audio) fullPlaybackRef.current.audio.playbackRate = fullPlaybackSpeed;
  }, [fullPlaybackSpeed]);

  const currentActiveIdx = fullPlaybackActive ? fullPlaybackIdx : activeMessageIdx;
  const hasAudioFile = !!analysis?.audio_path;

  if (!hasAudioFile && sessionMessages.length === 0) return null;

  return (
    <div className="retro-card p-5" style={{ backgroundColor: 'var(--retro-blue)' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 border-2 border-black flex items-center justify-center ${
          playingAudio || fullPlaybackActive ? "bg-[var(--retro-yellow)]" : "bg-white"
        }`}>
          <span className="text-xl">🎧</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-black text-foreground uppercase">
            {playingAudio || fullPlaybackActive ? "🔴 Lecture en cours" : "Réécouter"}
          </h3>
          <p className="text-[11px] text-foreground/60 font-bold truncate">
            {playingAudio && activeMessageIdx >= 0
              ? `Message ${activeMessageIdx + 1}/${sessionMessages.length}`
              : `${sessionMessages.length} messages`
            }
          </p>
        </div>
      </div>

      {/* Audio file progress bar */}
      {hasAudioFile && (
        <div className="mb-4">
          <input type="range" min={0} max={100} step={0.1} value={audioProgress}
            onChange={(e) => seekAudio(parseFloat(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted/40
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md
              [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
            style={{ background: `linear-gradient(to right, hsl(var(--primary)) ${audioProgress}%, hsl(var(--muted)) ${audioProgress}%)` }}
          />
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-muted-foreground font-mono font-bold">
              {audioDuration > 0 && isFinite(audioDuration) ? `${Math.floor((audioProgress / 100) * audioDuration / 60)}:${String(Math.floor((audioProgress / 100) * audioDuration % 60)).padStart(2, "0")}` : "0:00"}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono font-bold">
              {audioDuration > 0 && isFinite(audioDuration) ? `${Math.floor(audioDuration / 60)}:${String(Math.floor(audioDuration % 60)).padStart(2, "0")}` : "—"}
            </span>
          </div>
        </div>
      )}

      {/* TTS progress bar */}
      {!hasAudioFile && sessionMessages.length > 0 && (() => {
        const totalDur = session.duration_seconds || sessionMessages.length * 8;
        const progressPct = fullPlaybackActive ? ((fullPlaybackIdx) / Math.max(1, sessionMessages.length)) * 100 : 0;
        const elapsedSec = Math.round((progressPct / 100) * totalDur);
        return (
          <div className="mb-4 relative">
            <input type="range" min={0} max={100} step={0.5} value={progressPct}
              onChange={(e) => {
                const pct = parseFloat(e.target.value) / 100;
                const idx = Math.round(pct * (sessionMessages.length - 1));
                const clampedIdx = Math.max(0, Math.min(sessionMessages.length - 1, idx));
                if (fullPlaybackActive) {
                  fullPlaybackRef.current.audio?.pause();
                  fullPlaybackRef.current.audio = null;
                  setFullPlaybackPaused(false);
                  setFullPlaybackIdx(clampedIdx);
                } else {
                  startFullPlayback(clampedIdx);
                }
              }}
              className={`w-full h-2 rounded-full appearance-none cursor-pointer bg-muted/40
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md
                [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0
                ${fullPlaybackLoading ? "opacity-60" : ""}`}
              style={{ background: fullPlaybackLoading
                ? `repeating-linear-gradient(90deg, hsl(var(--primary)/0.4) 0%, hsl(var(--primary)) 50%, hsl(var(--primary)/0.4) 100%)`
                : `linear-gradient(to right, hsl(var(--primary)) ${progressPct}%, hsl(var(--muted)) ${progressPct}%)` }}
            />
            {fullPlaybackLoading && (
              <div className="absolute inset-x-0 top-0 h-2 rounded-full overflow-hidden pointer-events-none">
                <div className="h-full w-1/3 bg-primary/40 rounded-full animate-pulse"
                  style={{ marginLeft: `${Math.max(0, progressPct - 10)}%` }} />
              </div>
            )}
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-muted-foreground font-mono font-bold">
                {fullPlaybackLoading && <Loader2 className="w-3 h-3 inline-block mr-1 animate-spin" />}
                {`${Math.floor(elapsedSec / 60)}:${String(Math.floor(elapsedSec % 60)).padStart(2, "0")}`}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono font-bold">
                {`${Math.floor(totalDur / 60)}:${String(Math.floor(totalDur % 60)).padStart(2, "0")}`}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Play controls */}
      <div className="flex items-center justify-center gap-3">
        {hasAudioFile ? (
          <>
            <button onClick={() => skipAudio(-10)}
              className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center text-foreground hover:bg-[var(--retro-yellow)] transition-all">
              <SkipBack className="w-4 h-4" />
            </button>
            <button onClick={() => playAudio(analysis!.audio_path!)}
              className="w-14 h-14 border-4 border-black bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-all"
              style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.2)" }}>
              {playingAudio === analysis!.audio_path ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </button>
            <button onClick={() => skipAudio(10)}
              className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center text-foreground hover:bg-[var(--retro-yellow)] transition-all">
              <SkipForward className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            {!fullPlaybackActive ? (
              <button onClick={() => startFullPlayback(0)}
                className="w-14 h-14 border-4 border-black bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-all"
                style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.2)" }}>
                <Play className="w-6 h-6 ml-0.5" />
              </button>
            ) : (
              <>
                <button onClick={() => { if (fullPlaybackIdx > 0) setFullPlaybackIdx(i => Math.max(0, i - 1)); }}
                  className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center text-foreground hover:bg-[var(--retro-yellow)] transition-all">
                  <SkipBack className="w-4 h-4" />
                </button>
                <button onClick={toggleFullPlaybackPause}
                  className="w-14 h-14 border-4 border-black bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-all"
                  style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.2)" }}>
                  {fullPlaybackLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : fullPlaybackPaused ? <Play className="w-6 h-6 ml-0.5" /> : <Pause className="w-6 h-6" />}
                </button>
                <button onClick={() => { if (fullPlaybackIdx < sessionMessages.length - 1) setFullPlaybackIdx(i => i + 1); }}
                  className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center text-foreground hover:bg-[var(--retro-yellow)] transition-all">
                  <SkipForward className="w-4 h-4" />
                </button>
                <button onClick={stopFullPlayback}
                  className="w-10 h-10 border-2 border-black bg-[var(--retro-red)] flex items-center justify-center text-foreground hover:opacity-80 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Speed controls */}
      <div className="flex items-center justify-center gap-2 mt-3">
        {[0.75, 1, 1.25, 1.5, 2].map(speed => (
          <button key={speed} onClick={() => { if (hasAudioFile) setAudioSpeed(speed); else setFullPlaybackSpeed(speed); }}
            className={`px-3 py-1.5 text-[11px] font-black transition-all border-2 border-black ${
              (hasAudioFile ? audioSpeed : fullPlaybackSpeed) === speed
                ? "bg-foreground text-background"
                : "bg-white text-foreground/60 hover:bg-[var(--retro-yellow)]"
            }`}>
            {speed}×
          </button>
        ))}
      </div>

      {/* Karaoke transcription */}
      {(playingAudio || fullPlaybackActive) && sessionMessages.length > 0 && (
        <div className="mt-3 max-h-36 overflow-y-auto border-2 border-black bg-white scroll-smooth">
          {sessionMessages.map((msg, i) => {
            const isActive = i === currentActiveIdx;
            const isPast = i < currentActiveIdx;
            return (
              <div key={i}
                ref={el => { if (isActive && el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }}
                onClick={() => {
                  if (hasAudioFile) {
                    const pct = (i / sessionMessages.length) * 100;
                    seekAudio(pct);
                  } else if (fullPlaybackActive) {
                    setFullPlaybackIdx(i);
                  }
                }}
                className={`px-3 py-2 cursor-pointer transition-all duration-300 ${
                  isActive
                    ? "bg-[var(--retro-yellow)] border-l-4 border-l-black"
                    : isPast ? "opacity-40" : "opacity-70"
                }`}>
                <span className="text-[9px] font-black text-foreground/60">
                  {msg.role === "user" ? `👦 ${displayName}` : "🤖 Bobby"}
                </span>
                <p className={`text-[11px] leading-snug mt-0.5 font-bold ${
                  isActive ? "text-foreground font-black" : "text-foreground/70"
                }`}>{msg.content?.slice(0, 120)}{(msg.content?.length || 0) > 120 ? "…" : ""}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SessionAudioPlayer;
