/**
 * StoryNarrationPlayer — Karaoke-style story player with YouTube-like controls
 * 
 * Features:
 * - Real-time sentence highlighting (karaoke)
 * - Progress bar with scrubbing
 * - Pause / Play / Skip forward / Skip back
 * - Emotion-aware TTS per sentence
 */
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { detectEmotionForTTS } from "@/lib/voicePipeline";
import type { Emotion } from "@/lib/voicePipeline";

interface SentenceSegment {
  text: string;
  emotion?: Emotion;
  audioUrl?: string;
  status: "pending" | "loading" | "ready" | "playing" | "done";
}

interface StoryNarrationPlayerProps {
  sentences: string[];
  isComplete: boolean;
  /** Called to fetch TTS audio for a sentence */
  fetchAudio: (text: string, emotion?: Emotion) => Promise<string>;
  onFinished?: () => void;
  voiceState: string;
}

export default function StoryNarrationPlayer({
  sentences,
  isComplete,
  fetchAudio,
  onFinished,
  voiceState,
}: StoryNarrationPlayerProps) {
  const [segments, setSegments] = useState<SentenceSegment[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0); // 0-1 within current audio
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const autoPlayRef = useRef(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync sentences into segments
  useEffect(() => {
    setSegments(prev => {
      const newSegs = sentences.map((text, i) => {
        if (prev[i] && prev[i].text === text) return prev[i];
        return {
          text,
          emotion: detectEmotionForTTS(text),
          audioUrl: prev[i]?.audioUrl,
          status: prev[i]?.status || "pending" as const,
        };
      });
      return newSegs;
    });
  }, [sentences]);

  // Preload audio for upcoming sentences
  useEffect(() => {
    const preloadAhead = 2;
    const startFrom = Math.max(0, currentIndex);
    for (let i = startFrom; i < Math.min(startFrom + preloadAhead + 1, segments.length); i++) {
      const seg = segments[i];
      if (seg && seg.status === "pending" && !seg.audioUrl) {
        setSegments(prev => prev.map((s, idx) => idx === i ? { ...s, status: "loading" } : s));
        fetchAudio(seg.text, seg.emotion).then(url => {
          setSegments(prev => prev.map((s, idx) => idx === i ? { ...s, audioUrl: url, status: "ready" } : s));
        }).catch(() => {
          setSegments(prev => prev.map((s, idx) => idx === i ? { ...s, status: "ready" } : s));
        });
      }
    }
  }, [segments, currentIndex, fetchAudio]);

  // Auto-start first segment
  useEffect(() => {
    if (currentIndex === -1 && segments.length > 0 && (segments[0].status === "ready" || segments[0].audioUrl) && autoPlayRef.current) {
      playSegment(0);
    }
  }, [segments]);

  const updateProgress = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      const p = audioRef.current.duration ? audioRef.current.currentTime / audioRef.current.duration : 0;
      setProgress(p);
      animFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  const playSegment = useCallback((index: number) => {
    // Stop current
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    cancelAnimationFrame(animFrameRef.current);

    if (index < 0 || index >= segments.length) {
      if (isComplete && index >= segments.length) {
        onFinished?.();
      }
      return;
    }

    const seg = segments[index];
    setCurrentIndex(index);
    setProgress(0);
    setIsPaused(false);

    // Mark playing
    setSegments(prev => prev.map((s, i) => ({
      ...s,
      status: i < index ? "done" : i === index ? "playing" : s.status,
    })));

    if (!seg.audioUrl || seg.audioUrl === "__silent__" || seg.audioUrl === "__browser_tts__") {
      // Skip to next after a brief pause
      setTimeout(() => playSegment(index + 1), 300);
      return;
    }

    const audio = new Audio(seg.audioUrl);
    audioRef.current = audio;

    audio.onended = () => {
      setSegments(prev => prev.map((s, i) => i === index ? { ...s, status: "done" } : s));
      setProgress(1);
      // Auto-advance
      if (autoPlayRef.current) {
        playSegment(index + 1);
      }
    };

    audio.onerror = () => {
      playSegment(index + 1);
    };

    audio.play().then(() => {
      animFrameRef.current = requestAnimationFrame(updateProgress);
    }).catch(() => {
      playSegment(index + 1);
    });
  }, [segments, isComplete, onFinished, updateProgress]);

  // Auto-scroll to current sentence
  useEffect(() => {
    if (currentIndex >= 0 && scrollContainerRef.current) {
      const el = scrollContainerRef.current.querySelector(`[data-sentence="${currentIndex}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentIndex]);

  const togglePause = useCallback(() => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPaused(false);
      animFrameRef.current = requestAnimationFrame(updateProgress);
    } else {
      audioRef.current.pause();
      setIsPaused(true);
      cancelAnimationFrame(animFrameRef.current);
    }
  }, [updateProgress]);

  const skipForward = useCallback(() => {
    if (currentIndex < segments.length - 1) {
      playSegment(currentIndex + 1);
    }
  }, [currentIndex, segments.length, playSegment]);

  const skipBack = useCallback(() => {
    if (currentIndex > 0) {
      playSegment(currentIndex - 1);
    } else if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  }, [currentIndex, playSegment]);

  // Seek via progress bar
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

    // Calculate which segment to seek to based on overall progress
    const totalSegments = segments.length || 1;
    const targetSegIndex = Math.floor(ratio * totalSegments);
    const segRatio = (ratio * totalSegments) - targetSegIndex;

    if (targetSegIndex !== currentIndex && targetSegIndex < segments.length) {
      playSegment(targetSegIndex);
      // After playing, seek within segment
      setTimeout(() => {
        if (audioRef.current && audioRef.current.duration) {
          audioRef.current.currentTime = segRatio * audioRef.current.duration;
        }
      }, 100);
    } else if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = segRatio * audioRef.current.duration;
    }
  }, [segments, currentIndex, playSegment]);

  // Global progress (0-1 across all segments)
  const globalProgress = useMemo(() => {
    if (segments.length === 0) return 0;
    const doneCount = segments.filter(s => s.status === "done").length;
    const currentPart = currentIndex >= 0 ? progress / segments.length : 0;
    return (doneCount / segments.length) + currentPart;
  }, [segments, currentIndex, progress]);

  // Cleanup
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (segments.length === 0) return null;

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Karaoke text display */}
      <div
        ref={scrollContainerRef}
        className="max-h-32 overflow-y-auto px-3 py-2 rounded-2xl bg-white/40 backdrop-blur-sm border border-border/20 scroll-smooth"
      >
        <div className="flex flex-wrap gap-x-1 gap-y-0.5 justify-center leading-relaxed">
          {segments.map((seg, i) => (
            <span
              key={i}
              data-sentence={i}
              className={`inline text-sm transition-all duration-300 cursor-pointer hover:opacity-80 ${
                i === currentIndex
                  ? "text-[hsl(var(--primary))] font-bold scale-[1.02]"
                  : seg.status === "done"
                  ? "text-foreground/50"
                  : "text-foreground/30"
              }`}
              onClick={() => playSegment(i)}
            >
              {seg.text}{" "}
            </span>
          ))}
          {!isComplete && (
            <span className="inline-flex gap-0.5 items-center ml-1">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))] animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="relative w-full h-2 rounded-full bg-white/30 backdrop-blur-sm cursor-pointer group"
        onClick={handleSeek}
      >
        {/* Buffered / loaded segments */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[hsl(var(--primary))]/20 transition-all duration-300"
          style={{ width: `${(segments.filter(s => s.status !== "pending" && s.status !== "loading").length / segments.length) * 100}%` }}
        />
        {/* Played progress */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] transition-[width] duration-100"
          style={{ width: `${globalProgress * 100}%` }}
        />
        {/* Scrubber dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md border-2 border-[hsl(var(--primary))] opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ left: `calc(${globalProgress * 100}% - 7px)` }}
        />
      </div>

      {/* Transport controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={skipBack}
          disabled={currentIndex <= 0}
          className="w-10 h-10 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center text-foreground/70 hover:bg-white/70 hover:text-foreground disabled:opacity-30 transition-all active:scale-90"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={togglePause}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] flex items-center justify-center text-white shadow-lg shadow-[hsla(215,85%,58%,0.3)] hover:scale-105 active:scale-95 transition-all"
        >
          {isPaused ? (
            <Play className="w-6 h-6 ml-0.5" />
          ) : (
            <Pause className="w-6 h-6" />
          )}
        </button>

        <button
          onClick={skipForward}
          disabled={currentIndex >= segments.length - 1}
          className="w-10 h-10 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center text-foreground/70 hover:bg-white/70 hover:text-foreground disabled:opacity-30 transition-all active:scale-90"
        >
          <SkipForward className="w-4 h-4" />
        </button>
      </div>

      {/* Sentence counter */}
      <p className="text-center text-xs text-muted-foreground/60">
        {currentIndex >= 0 ? currentIndex + 1 : 0} / {segments.length}
        {!isComplete && " (en cours…)"}
      </p>
    </div>
  );
}
