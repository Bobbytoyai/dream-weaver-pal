import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import {
  MessageSquare, Star, Play, Pause, Loader2, AlertTriangle,
  Download, CloudUpload, Trash2, SkipForward, SkipBack, X,
} from "lucide-react";
import {
  type Analysis, type Session, type ParentSessionMessage,
  emotionLabels, emotionScoreLabels, moodLabels,
  formatDuration, formatDate, humanizeSummary,
} from "./parentTypes";

interface SessionDetailViewProps {
  session: Session;
  analysis: Analysis | null;
  analyses: Analysis[];
  sessionMessages: ParentSessionMessage[];
  analyzing: boolean;
  displayName: string;
  analyzeSession: (session: Session) => void;
  toggleFavorite: (session: Session) => void;
  exportSessionPDF: (session: Session, analysis: Analysis | null) => void;
  deleteSession: (sessionId: string) => void;
  saveParentNote: (sessionId: string, note: string) => void;
  onCloudSave: () => void;
  setConfirmDialog: (v: any) => void;
  // Audio state
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

const SessionDetailView = ({
  session, analysis, sessionMessages, analyzing, displayName,
  analyzeSession, toggleFavorite, exportSessionPDF, deleteSession, saveParentNote,
  onCloudSave, setConfirmDialog,
  playingAudio, audioProgress, audioDuration, audioSpeed, activeMessageIdx,
  playAudio, seekAudio, skipAudio, setAudioSpeed,
}: SessionDetailViewProps) => {
  const moodInfo = moodLabels[(analysis?.mood_score || "neutral")] || moodLabels.neutral;

  // ─── Key moments ───
  const keyMoments = useMemo(() => {
    if (sessionMessages.length === 0) return [];
    return sessionMessages
      .map((msg, idx) => ({ ...msg, idx }))
      .filter(msg => msg.detected_emotion && msg.detected_emotion !== "neutral" && msg.role === "user")
      .slice(0, 5);
  }, [sessionMessages]);

  // ─── TTS ───
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

  const jumpToMoment = useCallback((msgIdx: number) => {
    if (audioDuration <= 0 || sessionMessages.length === 0) {
      speakMessage(sessionMessages[msgIdx]?.content || "");
      return;
    }
    const pct = (msgIdx / sessionMessages.length) * 100;
    seekAudio(pct);
  }, [audioDuration, sessionMessages, seekAudio, speakMessage]);

  // ─── Full playback ───
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

  // ─── Note ───
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const currentActiveIdx = fullPlaybackActive ? fullPlaybackIdx : activeMessageIdx;

  return (
    <div className="p-4 space-y-4" style={{ fontFamily: "'Nunito', sans-serif" }}>
      {/* Hero Header */}
      <div className="retro-card p-5" style={{ backgroundColor: 'var(--retro-blue)' }}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 border-4 border-black bg-white flex items-center justify-center">
            <MessageSquare className="w-7 h-7 text-gray-800" />
          </div>
          <div className="flex-1">
            <h3 className="text-[18px] font-black text-gray-800 uppercase">{formatDate(session.started_at)}</h3>
            <p className="text-[13px] text-gray-600 font-bold">{session.child_name}, {session.child_age} ans</p>
          </div>
          <button onClick={() => toggleFavorite(session)}
            className={`w-11 h-11 border-2 border-black flex items-center justify-center transition-all ${
              session.is_favorite ? "bg-primary text-primary-foreground" : "bg-white text-gray-800 hover:bg-muted"
            }`}>
            <Star className={`w-5 h-5 ${session.is_favorite ? "fill-current" : ""}`} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center py-3 border-2 border-black bg-white">
            <span className="text-2xl block mb-1">⏱️</span>
            <p className="text-[16px] font-black text-gray-800">{formatDuration(session.duration_seconds)}</p>
            <p className="text-[11px] text-gray-600 font-bold">Durée</p>
          </div>
          <div className="text-center py-3 border-2 border-black bg-white">
            <span className="text-2xl block mb-1">💬</span>
            <p className="text-[16px] font-black text-gray-800">{session.message_count}</p>
            <p className="text-[11px] text-gray-600 font-bold">Messages</p>
          </div>
          <div className="text-center py-3 border-2 border-black bg-white">
            <span className="text-2xl block mb-1">{moodInfo.emoji}</span>
            <p className="text-[16px] font-black text-gray-800">{moodInfo.label}</p>
            <p className="text-[11px] text-gray-600 font-bold">Humeur</p>
          </div>
        </div>
      </div>

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
                <button key={i} onClick={() => jumpToMoment(moment.idx)}
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

      {/* Analysis */}
      {analyzing ? (
        <div className="retro-card p-8 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-gray-800" />
          <span className="text-[15px] text-gray-600 font-black">Analyse en cours…</span>
        </div>
      ) : analysis ? (
        <>
          {analysis.summary && (
            <div className="retro-card p-5" style={{ backgroundColor: 'var(--retro-green)' }}>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 bg-black flex items-center justify-center"><span className="text-white text-sm">📝</span></div>
                <h3 className="text-[16px] font-black text-gray-800 uppercase">Résumé</h3>
              </div>
              <p className="text-[15px] text-gray-700 leading-relaxed font-bold">
                {(() => { const s = humanizeSummary(analysis.summary!).match(/[^.!?]+[.!?]+/g); return s ? s.slice(0, 2).join(" ").trim() : humanizeSummary(analysis.summary!); })()}
              </p>
            </div>
          )}

          {/* Scores grid */}
          <div className="grid grid-cols-3 gap-2">
            {analysis.sociability_score != null && (
              <>
                <div className="retro-card p-3 flex flex-col items-center gap-1 justify-center" style={{ backgroundColor: 'var(--retro-blue)' }}>
                  <span className="text-2xl">🤝</span>
                  <span className="text-2xl font-black text-gray-800">{analysis.sociability_score}</span>
                  <span className="text-[11px] font-bold text-gray-600">Sociabilité</span>
                </div>
                <div className="retro-card p-3 flex flex-col items-center gap-1 justify-center" style={{ backgroundColor: 'var(--retro-yellow)' }}>
                  <span className="text-2xl">🔍</span>
                  <span className="text-2xl font-black text-gray-800">{analysis.curiosity_score || 0}</span>
                  <span className="text-[11px] font-bold text-gray-600">Curiosité</span>
                </div>
                <div className="retro-card p-3 flex flex-col items-center gap-1 justify-center" style={{ backgroundColor: 'var(--retro-green)' }}>
                  <span className="text-2xl">⚖️</span>
                  <span className="text-2xl font-black text-gray-800">{analysis.emotional_stability_score || 0}</span>
                  <span className="text-[11px] font-bold text-gray-600">Stabilité</span>
                </div>
              </>
            )}
            <div className="retro-card p-3 flex flex-col items-center gap-1 justify-center" style={{ backgroundColor: 'var(--retro-purple)' }}>
              <span className="text-2xl">{analysis.engagement_level === "high" ? "🔥" : analysis.engagement_level === "medium" ? "👍" : "💤"}</span>
              <span className="text-xl font-black text-gray-800 capitalize">{
                analysis.engagement_level === "high" ? "Élevé" : analysis.engagement_level === "medium" ? "Moyen" : "Faible"
              }</span>
              <span className="text-[11px] font-bold text-gray-600">Engagement</span>
            </div>
            {analysis.attention_span && (
              <div className="retro-card p-3 flex flex-col items-center gap-1 justify-center" style={{ backgroundColor: 'var(--retro-red)' }}>
                <span className="text-2xl">{analysis.attention_span === "long" ? "🟢" : analysis.attention_span === "moyen" ? "🟡" : "🔴"}</span>
                <span className="text-xl font-black text-gray-800 capitalize">{
                  analysis.attention_span === "long" ? "Longue" : analysis.attention_span === "moyen" ? "Moyenne" : "Courte"
                }</span>
                <span className="text-[11px] font-bold text-gray-600">Attention</span>
              </div>
            )}
          </div>

          {/* Emotions */}
          {analysis.emotions && Object.keys(analysis.emotions).length > 0 && (
            <div className="retro-card p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-black flex items-center justify-center"><span className="text-white text-sm">💛</span></div>
                <h3 className="text-[16px] font-black text-foreground uppercase">Émotions</h3>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {Object.entries(analysis.emotions).filter(([, v]) => (v as number) > 0).sort(([, a], [, b]) => (b as number) - (a as number)).map(([key, value]) => {
                  const info = emotionScoreLabels[key] || { label: key, emoji: "❓" };
                  return (
                    <div key={key} className="flex items-center gap-2.5 px-4 py-2.5 border-2 border-black bg-white">
                      <span className="text-xl">{info.emoji}</span>
                      <span className="text-[14px] font-black text-gray-800">{info.label}</span>
                      <span className="text-[14px] text-primary font-black">{value as number}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Interests + Topics */}
          {(analysis.extracted_interests?.length > 0 || analysis.topics_detected?.length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              {analysis.extracted_interests?.length > 0 && (
                <div className="retro-card p-4" style={{ backgroundColor: 'var(--retro-purple)' }}>
                  <h4 className="text-[15px] font-black text-gray-800 mb-3 uppercase">✨ Intérêts</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.extracted_interests.map((interest, i) => (
                      <span key={i} className="px-3 py-1.5 border-2 border-black bg-white text-[13px] font-bold text-gray-800">{interest}</span>
                    ))}
                  </div>
                </div>
              )}
              {analysis.topics_detected?.length > 0 && (
                <div className="retro-card p-4" style={{ backgroundColor: 'var(--retro-blue)' }}>
                  <h4 className="text-[15px] font-black text-gray-800 mb-3 uppercase">💬 Sujets</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.topics_detected.map((t, i) => (
                      <span key={i} className="px-3 py-1.5 border-2 border-black bg-white text-[13px] font-bold text-gray-800">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Observations */}
          {analysis.behavior_insights?.length > 0 && (
            <div className="retro-card p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-black flex items-center justify-center"><span className="text-white text-sm">🔎</span></div>
                <h3 className="text-[16px] font-black text-foreground uppercase">Observations</h3>
              </div>
              <ul className="space-y-3">
                {analysis.behavior_insights.map((insight, i) => (
                  <li key={i} className="text-[14px] text-foreground flex items-start gap-3 leading-relaxed font-bold">
                    <span className="w-2 h-2 bg-black mt-2 shrink-0" />{insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Alerts */}
          {analysis.alerts?.length > 0 && (
            <div className="retro-card p-5" style={{ backgroundColor: 'var(--retro-red)' }}>
              <div className="flex items-center gap-2.5 mb-3">
                <AlertTriangle className="w-6 h-6 text-gray-800" />
                <h3 className="text-[16px] font-black text-gray-800 uppercase">Alertes</h3>
              </div>
              {analysis.alerts.map((alert, i) => (
                <p key={i} className="text-[14px] text-gray-800 mb-2 font-bold">⚠️ {alert.message}</p>
              ))}
            </div>
          )}

          {/* Transcription */}
          {sessionMessages.length > 0 && (
            <div className="retro-card p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-black flex items-center justify-center"><span className="text-white text-sm">📖</span></div>
                <h3 className="text-[16px] font-black text-foreground uppercase">Transcription</h3>
                <span className="ml-auto text-[12px] text-foreground/60 font-black bg-white px-2.5 py-1 border-2 border-black">{sessionMessages.length} msgs</span>
              </div>
              <div className="max-h-[500px] overflow-y-auto space-y-3 py-1">
                {sessionMessages.map((msg, i) => {
                  const isChild = msg.role === "user";
                  const isActive = i === currentActiveIdx && (playingAudio || ttsPlaying || fullPlaybackActive);
                  const isTtsSpeaking = ttsPlaying === msg.content;
                  const time = new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={i} className={`flex ${isChild ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[82%] relative group ${isActive ? "scale-[1.02]" : ""} transition-transform duration-200`}>
                        <div className={`px-4 py-3 border-2 border-black ${isChild ? "bg-white" : "bg-[var(--retro-blue)]"} ${isActive ? "ring-2 ring-foreground/30" : ""}`}
                          style={{ boxShadow: "2px 2px 0px rgba(0,0,0,0.15)" }}>
                          <p className="text-[14px] text-foreground leading-[1.5] font-bold">{msg.content}</p>
                        </div>
                        <div className={`flex items-center gap-2 mt-1.5 px-1.5 ${isChild ? "" : "justify-end"}`}>
                          <span className="text-[11px] text-foreground/50 font-black">{isChild ? `👦 ${displayName}` : "🤖 Bobby"}</span>
                          <span className="text-[10px] text-foreground/40 font-bold">{time}</span>
                          {msg.detected_emotion && (
                            <span className="text-[10px] px-2 py-0.5 border border-black bg-white font-black">
                              {emotionLabels[msg.detected_emotion]?.emoji}
                            </span>
                          )}
                          <button onClick={() => speakMessage(msg.content)}
                            className="opacity-0 group-hover:opacity-100 w-7 h-7 border border-black flex items-center justify-center text-foreground/60 hover:bg-[var(--retro-yellow)] transition-all">
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
                <h3 className="text-[16px] font-black text-foreground uppercase">Timeline émotionnelle</h3>
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
                    <button key={i} onClick={() => jumpToMoment(i)}
                      className="flex flex-col items-center px-1.5 py-1.5 border border-black hover:bg-[var(--retro-yellow)] transition-all min-w-[36px]">
                      <span className="text-base">{emo.emoji}</span>
                      <span className="text-[9px] text-foreground/60 font-mono font-black">{timeStr}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Audio Player */}
          {(analysis?.audio_path || sessionMessages.length > 0) && (
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

              {/* Audio progress bar */}
              {analysis?.audio_path && (
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
              {!analysis?.audio_path && sessionMessages.length > 0 && (() => {
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
                {analysis?.audio_path ? (
                  <>
                    <button onClick={() => skipAudio(-10)}
                      className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center text-foreground hover:bg-[var(--retro-yellow)] transition-all active:scale-90">
                      <SkipBack className="w-4 h-4" />
                    </button>
                    <button onClick={() => playAudio(analysis.audio_path!)}
                      className="w-14 h-14 border-4 border-black bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-all active:scale-95"
                      style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.2)" }}>
                      {playingAudio === analysis.audio_path ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                    </button>
                    <button onClick={() => skipAudio(10)}
                      className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center text-foreground hover:bg-[var(--retro-yellow)] transition-all active:scale-90">
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    {!fullPlaybackActive ? (
                      <button onClick={() => startFullPlayback(0)}
                        className="w-14 h-14 border-4 border-black bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-all active:scale-95"
                        style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.2)" }}>
                        <Play className="w-6 h-6 ml-0.5" />
                      </button>
                    ) : (
                      <>
                        <button onClick={() => { if (fullPlaybackIdx > 0) setFullPlaybackIdx(i => Math.max(0, i - 1)); }}
                          className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center text-foreground hover:bg-[var(--retro-yellow)] transition-all active:scale-90">
                          <SkipBack className="w-4 h-4" />
                        </button>
                        <button onClick={toggleFullPlaybackPause}
                          className="w-14 h-14 border-4 border-black bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-all active:scale-95"
                          style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.2)" }}>
                          {fullPlaybackLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : fullPlaybackPaused ? <Play className="w-6 h-6 ml-0.5" /> : <Pause className="w-6 h-6" />}
                        </button>
                        <button onClick={() => { if (fullPlaybackIdx < sessionMessages.length - 1) setFullPlaybackIdx(i => i + 1); }}
                          className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center text-foreground hover:bg-[var(--retro-yellow)] transition-all active:scale-90">
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
                  <button key={speed} onClick={() => { if (analysis?.audio_path) setAudioSpeed(speed); else setFullPlaybackSpeed(speed); }}
                    className={`px-3 py-1.5 text-[11px] font-black transition-all border-2 border-black ${
                      (analysis?.audio_path ? audioSpeed : fullPlaybackSpeed) === speed
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
                          if (analysis?.audio_path) {
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
          )}

          {/* Parent note */}
          <div className="retro-card p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 bg-black flex items-center justify-center"><span className="text-white text-sm">📝</span></div>
              <h3 className="text-[16px] font-black text-foreground uppercase">Note du parent</h3>
            </div>
            {editingNote === session.id ? (
              <div className="space-y-3">
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Ajoutez une note sur cette session…"
                  className="w-full bg-white px-4 py-3 text-[14px] text-foreground outline-none border-4 border-black resize-none h-24 font-bold"
                />
                <div className="flex gap-3">
                  <button onClick={() => saveParentNote(session.id, noteText)}
                    className="flex-1 py-3 border-4 border-black bg-foreground text-background text-[14px] font-black uppercase"
                    style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.2)" }}>
                    💾 ENREGISTRER
                  </button>
                  <button onClick={() => setEditingNote(null)}
                    className="px-5 py-3 border-4 border-black bg-white text-foreground text-[14px] font-black uppercase">
                    ANNULER
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setEditingNote(session.id); setNoteText(session.parent_note || ""); }}
                className="w-full text-left p-3 border-2 border-dashed border-black/30 hover:bg-[var(--retro-yellow)] transition-all">
                {session.parent_note ? (
                  <p className="text-[14px] text-foreground leading-relaxed font-bold">{session.parent_note}</p>
                ) : (
                  <p className="text-[14px] text-foreground/50 italic font-bold">Appuyez pour ajouter une note…</p>
                )}
              </button>
            )}
          </div>
        </>
      ) : (
        <button onClick={() => analyzeSession(session)}
          className="w-full bg-primary text-primary-foreground border-4 border-black p-5 font-black text-[16px] hover:opacity-90 transition-all active:scale-95 uppercase">
          🧠 Lancer l'analyse IA
        </button>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => exportSessionPDF(session, analysis)}
          className="flex flex-col items-center gap-2 py-4 border-4 border-black bg-white hover:bg-muted transition-all active:scale-95">
          <Download className="w-6 h-6 text-gray-800" />
          <span className="text-[13px] font-black text-gray-800 uppercase">Exporter</span>
        </button>
        <button onClick={onCloudSave}
          className="flex flex-col items-center gap-2 py-4 border-4 border-black bg-white hover:bg-muted transition-all active:scale-95">
          <CloudUpload className="w-6 h-6 text-gray-800" />
          <span className="text-[13px] font-black text-gray-800 uppercase">Cloud</span>
        </button>
        <button
          onClick={() => setConfirmDialog({
            title: "Supprimer cette session ?",
            description: "Toutes les données de cette session (messages, analyse, audio) seront supprimées définitivement.",
            confirmLabel: "Supprimer",
            variant: "danger",
            onConfirm: () => { deleteSession(session.id); },
          })}
          className="flex flex-col items-center gap-2 py-4 border-4 border-black hover:bg-muted transition-all active:scale-95" style={{ backgroundColor: 'var(--retro-red)' }}>
          <Trash2 className="w-6 h-6 text-gray-800" />
          <span className="text-[13px] font-black text-gray-800 uppercase">Supprimer</span>
        </button>
      </div>
    </div>
  );
};

export default SessionDetailView;
