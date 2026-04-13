import { useMemo } from "react";
import { Calendar, ChevronRight, Loader2, Search } from "lucide-react";
import {
  type Analysis, type Session,
  emotionLabels, moodLabels, tagLabels,
  formatDuration, formatDayHeader, humanizeSummary,
} from "./parentTypes";

interface SessionsListTabProps {
  sessions: Session[];
  analyses: Analysis[];
  loading: boolean;
  displayName: string;
  tagFilter: string | null;
  setTagFilter: (v: string | null) => void;
  sessionFavFilter: boolean;
  setSessionFavFilter: (v: boolean) => void;
  sessionSearch: string;
  setSessionSearch: (v: string) => void;
  analyzeSession: (session: Session) => void;
  groupedSessions: { day: string; sessions: Session[] }[];
}

const SessionsListTab = ({
  sessions, analyses, loading, displayName,
  tagFilter, setTagFilter, sessionFavFilter, setSessionFavFilter,
  sessionSearch, setSessionSearch, analyzeSession, groupedSessions,
}: SessionsListTabProps) => {

  const dailySummaries = useMemo(() => groupedSessions.map(group => {
    const daySessions = group.sessions;
    const dayAnalyses = daySessions.map(s => analyses.find(a => a.session_id === s.id)).filter(Boolean) as Analysis[];
    const totalMessages = daySessions.reduce((sum, s) => sum + s.message_count, 0);
    const totalDuration = daySessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
    const allEmotions = daySessions.flatMap(s => s.detected_emotions || []);
    const topEmotions = [...new Set(allEmotions)].slice(0, 4);
    const allTopics = daySessions.flatMap(s => s.topics || []);
    const topTopics = [...new Set(allTopics)].slice(0, 5);
    const allTags = daySessions.flatMap(s => s.tags || []);
    const uniqueTags = [...new Set(allTags)];
    const hasFavorite = daySessions.some(s => s.is_favorite);
    const avgMood = dayAnalyses.length > 0
      ? dayAnalyses.map(a => a.mood_score || "neutral").reduce((best, m) => {
          const order = ["very_positive", "positive", "neutral", "negative", "very_negative"];
          return order.indexOf(m) < order.indexOf(best) ? m : best;
        }, "neutral" as string)
      : "neutral";
    const mood = moodLabels[avgMood] || moodLabels.neutral;
    const rawSummaries = dayAnalyses.map(a => a.summary).filter(Boolean);
    const briefParts = rawSummaries.map(s => {
      const sentences = s!.match(/[^.!?]+[.!?]+/g);
      return sentences ? sentences[0].trim() : s!.slice(0, 80).trim();
    });
    const daySummary = humanizeSummary(briefParts.slice(0, 3).join(" • "));
    const avgSociability = dayAnalyses.length > 0 ? Math.round(dayAnalyses.reduce((s, a) => s + (a.sociability_score ?? 0), 0) / dayAnalyses.length) : null;
    const avgCuriosity = dayAnalyses.length > 0 ? Math.round(dayAnalyses.reduce((s, a) => s + (a.curiosity_score ?? 0), 0) / dayAnalyses.length) : null;
    const avgStability = dayAnalyses.length > 0 ? Math.round(dayAnalyses.reduce((s, a) => s + (a.emotional_stability_score ?? 0), 0) / dayAnalyses.length) : null;

    return { ...group, totalMessages, totalDuration, topEmotions, topTopics, uniqueTags, hasFavorite, mood, daySummary, avgSociability, avgCuriosity, avgStability, dayAnalyses, daySessions };
  }), [groupedSessions, analyses]);

  // Calendar data
  const calendarDays = useMemo(() => dailySummaries.map(d => ({
    date: new Date(d.daySessions[0].started_at),
    count: d.daySessions.length,
    mood: d.mood.emoji,
  })), [dailySummaries]);

  const now = new Date();
  const calMonth = now.getMonth();
  const calYear = now.getFullYear();
  const firstDay = new Date(calYear, calMonth, 1);
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const startDow = (firstDay.getDay() + 6) % 7;
  const monthName = firstDay.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const categoryCards = useMemo(() => [
    { key: "all", emoji: "📋", label: "Tous", active: !tagFilter && !sessionFavFilter, onClick: () => { setTagFilter(null); setSessionFavFilter(false); } },
    { key: "fav", emoji: "⭐", label: "Favoris", active: sessionFavFilter && !tagFilter, onClick: () => { setTagFilter(null); setSessionFavFilter(!sessionFavFilter); } },
    ...Object.entries(tagLabels).map(([key, info]) => ({
      key,
      emoji: info.emoji,
      label: info.label,
      active: tagFilter === key && !sessionFavFilter,
      onClick: () => { setSessionFavFilter(false); setTagFilter(tagFilter === key ? null : key); },
    })),
  ], [tagFilter, sessionFavFilter, setTagFilter, setSessionFavFilter]);

  return (
    <div className="p-4 space-y-4" style={{ fontFamily: "'Nunito', sans-serif" }}>
      {/* Search bar */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" />
        <input type="text" value={sessionSearch} onChange={e => setSessionSearch(e.target.value)}
          placeholder="Rechercher…"
          className="w-full pl-11 pr-4 py-3 bg-white text-[15px] font-black text-foreground placeholder:text-foreground/40 border-4 border-black outline-none focus:ring-2 focus:ring-foreground/20 transition-all" />
      </div>

      {/* Category cards — retro grid */}
      <div className="grid grid-cols-6 gap-1.5 mt-2">
        {categoryCards.map((card, ci) => {
          const retroBgs = ["var(--retro-blue)", "var(--retro-yellow)", "var(--retro-red)", "var(--retro-blue)", "var(--retro-yellow)", "var(--retro-green)"];
          return (
            <button key={card.key} onClick={card.onClick}
              className={`relative px-1 py-2.5 flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-90 border-2 border-black ${
                card.active ? "ring-2 ring-foreground/20 scale-[1.03]" : "hover:translate-y-[-1px]"
              }`}
              style={{
                backgroundColor: card.active ? retroBgs[ci % retroBgs.length] : "white",
                boxShadow: card.active ? "3px 3px 0px rgba(0,0,0,0.25)" : "1px 1px 0px rgba(0,0,0,0.1)",
                fontFamily: "'Nunito', sans-serif",
              }}>
              <span className="text-xl">{card.emoji}</span>
              <span className={`text-[9px] font-black leading-tight text-center uppercase ${card.active ? "text-foreground" : "text-foreground/60"}`}>{card.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mini calendar — retro */}
      <div className="retro-card px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[14px] font-black text-foreground capitalize uppercase">{monthName}</h4>
          <span className="text-base">📅</span>
        </div>
        <div className="grid grid-cols-7 gap-px">
          {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
            <span key={i} className="text-[10px] font-black text-foreground/40 text-center py-1 uppercase">{d}</span>
          ))}
          {Array.from({ length: startDow }, (_, i) => (
            <div key={`e-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const dayNum = i + 1;
            const dayData = calendarDays.find(c => c.date.getDate() === dayNum && c.date.getMonth() === calMonth);
            const isToday = dayNum === now.getDate();
            return (
              <button key={dayNum} type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (dayData) {
                    const target = dailySummaries.find(d => {
                      const sd = new Date(d.daySessions[0].started_at);
                      return sd.getDate() === dayNum && sd.getMonth() === calMonth;
                    });
                    if (target) {
                      const el = document.getElementById(`day-${target.day}`);
                      if (el) {
                        el.scrollIntoView({ behavior: "smooth", block: "center" });
                        el.classList.add("ring-2", "ring-foreground");
                        setTimeout(() => el.classList.remove("ring-2", "ring-foreground"), 2000);
                      }
                    }
                  }
                }}
                className={`w-full aspect-square flex items-center justify-center text-[11px] font-black transition-all border ${
                  dayData
                    ? "bg-[var(--retro-blue)] text-foreground border-black hover:bg-[var(--retro-yellow)] cursor-pointer active:scale-90"
                    : isToday
                      ? "bg-white border-black text-foreground ring-1 ring-foreground/30"
                      : "text-foreground/30 border-transparent cursor-default"
                }`}>
                {dayNum}
              </button>
            );
          })}
        </div>
      </div>

      {/* Daily summaries list */}
      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-foreground" /></div>
      ) : dailySummaries.length === 0 ? (
        <div className="text-center py-8 text-foreground/50"><p className="text-sm font-black">Aucune session{tagFilter || sessionSearch || sessionFavFilter ? " trouvée" : " enregistrée"}.</p></div>
      ) : (
        <div className="space-y-3">
          {dailySummaries.map((day, dayIdx) => {
            const tiltClass = `retro-card-tilt-${(dayIdx % 6) + 1}`;
            return (
              <div key={day.day} id={`day-${day.day}`} className={`retro-card ${tiltClass} p-5 space-y-4 transition-all`}>
                {/* Day header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-5 h-5 text-foreground" />
                    <h4 className="text-[17px] font-black text-foreground uppercase">{formatDayHeader(day.daySessions[0].started_at)}</h4>
                    {day.hasFavorite && <span className="text-base">⭐</span>}
                  </div>
                  <span className="text-3xl">{day.mood.emoji}</span>
                </div>

                {/* KPIs row */}
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { value: day.daySessions.length, label: `session${day.daySessions.length > 1 ? "s" : ""}`, bg: "var(--retro-blue)" },
                    { value: day.totalMessages, label: "messages", bg: "var(--retro-green)" },
                    { value: formatDuration(day.totalDuration), label: "durée", bg: "var(--retro-purple)" },
                  ].map(kpi => (
                    <div key={kpi.label} className="border-2 border-black p-3 text-center" style={{ backgroundColor: kpi.bg }}>
                      <p className="text-xl font-black text-foreground">{kpi.value}</p>
                      <p className="text-[11px] text-foreground/60 font-black uppercase">{kpi.label}</p>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                {day.daySummary && (
                  <div className="border-2 border-black bg-[var(--retro-yellow)] px-4 py-3">
                    <p className="text-[14px] text-foreground/70 leading-relaxed font-bold">💡 {day.daySummary}</p>
                  </div>
                )}

                {/* Scores mini */}
                {day.avgSociability !== null && (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Sociabilité", score: day.avgSociability, emoji: "🤝", bg: "var(--retro-blue)" },
                      { label: "Curiosité", score: day.avgCuriosity, emoji: "🔍", bg: "var(--retro-yellow)" },
                      { label: "Stabilité", score: day.avgStability, emoji: "⚖️", bg: "var(--retro-green)" },
                    ].map(s => (
                      <div key={s.label} className="border-2 border-black p-2.5 flex flex-col items-center gap-1" style={{ backgroundColor: s.bg }}>
                        <span className="text-lg">{s.emoji}</span>
                        <div className="w-full h-2 bg-white border border-black overflow-hidden">
                          <div className="h-full bg-foreground transition-all" style={{ width: `${s.score}%` }} />
                        </div>
                        <span className="text-[13px] font-black text-foreground">{s.score}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tags */}
                {(day.topTopics.length > 0 || day.topEmotions.length > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {day.topTopics.map(t => (
                      <span key={t} className="px-3 py-1 border-2 border-black bg-[var(--retro-blue)] text-foreground text-[12px] font-black">#{t}</span>
                    ))}
                    {day.topEmotions.map(e => (
                      <span key={e} className="px-3 py-1 border-2 border-black bg-[var(--retro-purple)] text-foreground text-[12px] font-black">{e}</span>
                    ))}
                  </div>
                )}

                {/* Expand sessions */}
                <div className="border-t-2 border-black/20 pt-3">
                  <details className="group">
                    <summary className="text-[14px] text-foreground font-black cursor-pointer flex items-center gap-1.5 hover:opacity-70 uppercase">
                      <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                      Voir les {day.daySessions.length} session{day.daySessions.length > 1 ? "s" : ""}
                    </summary>
                    <div className="mt-3 space-y-2">
                      {day.daySessions.map(session => {
                        const analysis = analyses.find(a => a.session_id === session.id);
                        const sMood = moodLabels[(analysis?.mood_score || "neutral")] || moodLabels.neutral;
                        return (
                          <button key={session.id} onClick={() => analyzeSession(session)}
                            className="w-full text-left bg-white border-2 border-black p-4 hover:bg-[var(--retro-blue)]/30 transition-all flex items-center gap-3"
                            style={{ boxShadow: "2px 2px 0px rgba(0,0,0,0.15)" }}>
                            <span className="text-lg">{sMood.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[14px] font-black text-foreground">
                                  {new Date(session.started_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                                <span className="text-[12px] text-foreground/60 font-bold">{formatDuration(session.duration_seconds)} • {session.message_count} msg</span>
                              </div>
                              {analysis?.summary && <p className="text-[12px] text-foreground/50 mt-1 truncate font-bold">{humanizeSummary(analysis.summary)}</p>}
                            </div>
                            <ChevronRight className="w-4 h-4 text-foreground/40 shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </details>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SessionsListTab;
