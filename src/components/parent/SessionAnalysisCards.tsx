import { AlertTriangle } from "lucide-react";
import { type Analysis, emotionScoreLabels, humanizeSummary } from "./parentTypes";

interface SessionAnalysisCardsProps {
  analysis: Analysis;
}

const SessionAnalysisCards = ({ analysis }: SessionAnalysisCardsProps) => (
  <>
    {/* Summary */}
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
          <ScoreCard emoji="🤝" value={analysis.sociability_score} label="Sociabilité" bg="var(--retro-blue)" />
          <ScoreCard emoji="🔍" value={analysis.curiosity_score || 0} label="Curiosité" bg="var(--retro-yellow)" />
          <ScoreCard emoji="⚖️" value={analysis.emotional_stability_score || 0} label="Stabilité" bg="var(--retro-green)" />
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
          <h3 className="text-[16px] font-black text-black uppercase">Émotions</h3>
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
          <h3 className="text-[16px] font-black text-black uppercase">Observations</h3>
        </div>
        <ul className="space-y-3">
          {analysis.behavior_insights.map((insight, i) => (
            <li key={i} className="text-[14px] text-black flex items-start gap-3 leading-relaxed font-bold">
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
  </>
);

const ScoreCard = ({ emoji, value, label, bg }: { emoji: string; value: number; label: string; bg: string }) => (
  <div className="retro-card p-3 flex flex-col items-center gap-1 justify-center" style={{ backgroundColor: bg }}>
    <span className="text-2xl">{emoji}</span>
    <span className="text-2xl font-black text-gray-800">{value}</span>
    <span className="text-[11px] font-bold text-gray-600">{label}</span>
  </div>
);

export default SessionAnalysisCards;
