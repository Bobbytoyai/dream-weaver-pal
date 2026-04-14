import { useState, useCallback, useMemo } from "react";
import {
  MessageSquare, Star, Loader2,
  Download, CloudUpload, Trash2,
} from "lucide-react";
import {
  type Analysis, type Session, type ParentSessionMessage,
  moodLabels, formatDuration, formatDate,
} from "./parentTypes";
import SessionAnalysisCards from "./SessionAnalysisCards";
import SessionAudioPlayer from "./SessionAudioPlayer";
import SessionTranscription from "./SessionTranscription";

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

  // ─── Note ───
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const jumpToMoment = useCallback((msgIdx: number) => {
    if (audioDuration <= 0 || sessionMessages.length === 0) return;
    const pct = (msgIdx / sessionMessages.length) * 100;
    seekAudio(pct);
  }, [audioDuration, sessionMessages, seekAudio]);

  const isPlaying = !!(playingAudio || false);

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

      {/* Analysis content */}
      {analyzing ? (
        <div className="retro-card p-8 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-gray-800" />
          <span className="text-[15px] text-gray-600 font-black">Analyse en cours…</span>
        </div>
      ) : analysis ? (
        <>
          {/* Key moments + Transcription + Timeline */}
          <SessionTranscription
            session={session}
            sessionMessages={sessionMessages}
            displayName={displayName}
            currentActiveIdx={activeMessageIdx}
            isPlaying={isPlaying}
            onJumpToMoment={jumpToMoment}
          />

          {/* Analysis cards (scores, emotions, interests, observations, alerts) */}
          <SessionAnalysisCards analysis={analysis} />

          {/* Audio Player */}
          <SessionAudioPlayer
            session={session}
            analysis={analysis}
            sessionMessages={sessionMessages}
            displayName={displayName}
            playingAudio={playingAudio}
            audioProgress={audioProgress}
            audioDuration={audioDuration}
            audioSpeed={audioSpeed}
            activeMessageIdx={activeMessageIdx}
            playAudio={playAudio}
            seekAudio={seekAudio}
            skipAudio={skipAudio}
            setAudioSpeed={setAudioSpeed}
          />

          {/* Parent note */}
          <div className="retro-card p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 bg-black flex items-center justify-center"><span className="text-white text-sm">📝</span></div>
              <h3 className="text-[16px] font-black text-black uppercase">Note du parent</h3>
            </div>
            {editingNote === session.id ? (
              <div className="space-y-3">
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Ajoutez une note sur cette session…"
                  className="w-full bg-white px-4 py-3 text-[14px] text-black outline-none border-4 border-black resize-none h-24 font-bold"
                />
                <div className="flex gap-3">
                  <button onClick={() => saveParentNote(session.id, noteText)}
                    className="flex-1 py-3 border-4 border-black bg-foreground text-background text-[14px] font-black uppercase"
                    style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.2)" }}>
                    💾 ENREGISTRER
                  </button>
                  <button onClick={() => setEditingNote(null)}
                    className="px-5 py-3 border-4 border-black bg-white text-black text-[14px] font-black uppercase">
                    ANNULER
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setEditingNote(session.id); setNoteText(session.parent_note || ""); }}
                className="w-full text-left p-3 border-2 border-dashed border-black/30 hover:bg-[var(--retro-yellow)] transition-all">
                {session.parent_note ? (
                  <p className="text-[14px] text-black leading-relaxed font-bold">{session.parent_note}</p>
                ) : (
                  <p className="text-[14px] text-black/50 italic font-bold">Appuyez pour ajouter une note…</p>
                )}
              </button>
            )}
          </div>
        </>
      ) : (
        <button onClick={() => analyzeSession(session)}
          className="w-full bg-primary text-primary-foreground border-4 border-black p-5 font-black text-[16px] hover:opacity-90 transition-all uppercase">
          🧠 Lancer l'analyse IA
        </button>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => exportSessionPDF(session, analysis)}
          className="flex flex-col items-center gap-2 py-4 border-4 border-black bg-white hover:bg-muted transition-all">
          <Download className="w-6 h-6 text-gray-800" />
          <span className="text-[13px] font-black text-gray-800 uppercase">Exporter</span>
        </button>
        <button onClick={onCloudSave}
          className="flex flex-col items-center gap-2 py-4 border-4 border-black bg-white hover:bg-muted transition-all">
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
          className="flex flex-col items-center gap-2 py-4 border-4 border-black hover:bg-muted transition-all" style={{ backgroundColor: 'var(--retro-red)' }}>
          <Trash2 className="w-6 h-6 text-gray-800" />
          <span className="text-[13px] font-black text-gray-800 uppercase">Supprimer</span>
        </button>
      </div>
    </div>
  );
};

export default SessionDetailView;
