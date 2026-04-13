import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ParentSessionMessage } from "@/lib/bobby/parentDashboard";

export function useAudioPlayer(sessionMessages: ParentSessionMessage[]) {
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioSpeed, setAudioSpeed] = useState(1);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [activeMessageIdx, setActiveMessageIdx] = useState(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<number | null>(null);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = audioSpeed;
  }, [audioSpeed]);

  const cleanup = () => {
    if (audioRef.current) audioRef.current.pause();
    if (progressInterval.current) clearInterval(progressInterval.current);
    setPlayingAudio(null);
    setAudioProgress(0);
    setActiveMessageIdx(-1);
  };

  const playAudio = async (audioPath: string) => {
    if (playingAudio === audioPath) {
      audioRef.current?.pause();
      setPlayingAudio(null);
      if (progressInterval.current) clearInterval(progressInterval.current);
      return;
    }
    const { data } = await supabase.storage
      .from("conversation-audio")
      .createSignedUrl(audioPath, 3600);
    if (!data?.signedUrl) return;

    if (audioRef.current) audioRef.current.pause();
    if (progressInterval.current) clearInterval(progressInterval.current);

    const audio = new Audio(data.signedUrl);
    audioRef.current = audio;
    audio.playbackRate = audioSpeed;
    audio.onloadedmetadata = () => setAudioDuration(audio.duration);
    audio.onended = () => {
      setPlayingAudio(null);
      setAudioProgress(0);
      setActiveMessageIdx(-1);
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
    audio.play();
    setPlayingAudio(audioPath);

    progressInterval.current = window.setInterval(() => {
      if (audio.duration > 0) {
        setAudioProgress((audio.currentTime / audio.duration) * 100);
        if (sessionMessages.length > 0) {
          const msgIdx = Math.min(
            Math.floor((audio.currentTime / audio.duration) * sessionMessages.length),
            sessionMessages.length - 1,
          );
          setActiveMessageIdx(msgIdx);
        }
      }
    }, 200);
  };

  const seekAudio = (pct: number) => {
    if (audioRef.current && audioDuration > 0) {
      audioRef.current.currentTime = (pct / 100) * audioDuration;
      setAudioProgress(pct);
    }
  };

  const skipAudio = (seconds: number) => {
    if (!audioRef.current || !audioDuration) return;
    const newTime = Math.max(0, Math.min(audioDuration, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = newTime;
    setAudioProgress((newTime / audioDuration) * 100);
  };

  return {
    playingAudio,
    audioSpeed,
    setAudioSpeed,
    audioProgress,
    audioDuration,
    activeMessageIdx,
    playAudio,
    seekAudio,
    skipAudio,
    cleanup,
  };
}
