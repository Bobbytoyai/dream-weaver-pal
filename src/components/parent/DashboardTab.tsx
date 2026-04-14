import { useMemo } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { getInterestSnapshot, INTEREST_KEYWORDS_PUBLIC } from "@/lib/bobby/interestTracker";
import { ScoreGauge } from "./SharedUI";
import {
  type Analysis, type Session, type SafetyAlertRecord,
  emotionScoreLabels, formatDuration, formatDate, humanizeSummary,
  moodLabels,
} from "./parentTypes";

interface DashboardTabProps {
  sessions: Session[];
  analyses: Analysis[];
  displayName: string;
  safetyAlerts: SafetyAlertRecord[];
  showSafetyAlerts: boolean;
  setShowSafetyAlerts: (v: boolean) => void;
  clearSafetyAlerts: () => void;
}

const emotionConfig: Record<string, { emoji: string; color: string }> = {
  Joie: { emoji: "😊", color: "hsl(145, 65%, 42%)" },
  Curiosité: { emoji: "🧐", color: "hsl(210, 80%, 55%)" },
  Excitation: { emoji: "🤩", color: "hsl(36, 90%, 50%)" },
  Frustration: { emoji: "😤", color: "hsl(0, 75%, 55%)" },
  Peur: { emoji: "😰", color: "hsl(260, 45%, 58%)" },
  Tristesse: { emoji: "😢", color: "hsl(0, 0%, 55%)" },
};

const DashboardTab = ({
  sessions, analyses, displayName,
  safetyAlerts, showSafetyAlerts, setShowSafetyAlerts, clearSafetyAlerts,
}: DashboardTabProps) => {

  const totalSessions = sessions.length;
  const totalMessages = sessions.reduce((acc, s) => acc + s.message_count, 0);
  const totalDuration = sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
  const allEmotions = sessions.flatMap(s => s.detected_emotions || []);
  const emotionCounts = allEmotions.reduce((acc, e) => { acc[e] = (acc[e] || 0) + 1; return acc; }, {} as Record<string, number>);

  const recentAnalyses = analyses.slice(0, 7);

  const allAlerts = analyses.flatMap(a => (a.alerts || []).map(alert => ({
    ...alert, date: a.created_at, sessionId: a.session_id,
  })));

  const smartAlerts = useMemo(() => {
    const alerts: Array<{ type: string; message: string; severity: "info" | "warning" | "critical" }> = [];
    const recentSadness = recentAnalyses.filter(a => ((a.emotions as any)?.sadness || 0) > 40);
    if (recentSadness.length >= 3) alerts.push({ type: "sadness", message: "Tristesse répétée détectée sur plusieurs sessions", severity: "warning" });
    const recentFrustration = recentAnalyses.filter(a => ((a.emotions as any)?.frustration || 0) > 50);
    if (recentFrustration.length >= 2) alerts.push({ type: "frustration", message: "Pattern de frustration observé récemment", severity: "warning" });
    const lowEngagement = recentAnalyses.filter(a => a.engagement_level === "low");
    if (lowEngagement.length >= 3) alerts.push({ type: "engagement", message: "Engagement faible sur les dernières sessions", severity: "info" });
    allAlerts.slice(0, 3).forEach(a => alerts.push({ type: a.type, message: a.message, severity: "warning" }));
    return alerts;
  }, [recentAnalyses, allAlerts]);

  const avgEmotions = useMemo(() => {
    if (recentAnalyses.length === 0) return {};
    return Object.keys(emotionScoreLabels).reduce((acc, key) => {
      const values = recentAnalyses.map(a => ((a.emotions as any)?.[key] || 0)).filter(v => v > 0);
      if (values.length > 0) acc[key] = Math.round(values.reduce((s, v) => s + v, 0) / values.length);
      return acc;
    }, {} as Record<string, number>);
  }, [recentAnalyses]);

  const allInterests = useMemo(() => {
    const counts: Record<string, number> = {};
    analyses.forEach(a => { (a.extracted_interests || []).forEach(i => { counts[i] = (counts[i] || 0) + 1; }); });
    return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 12);
  }, [analyses]);

  const avgScores = useMemo(() => {
    const scored = analyses.filter(a => a.sociability_score != null);
    if (scored.length === 0) return null;
    return {
      sociability: Math.round(scored.reduce((s, a) => s + (a.sociability_score || 0), 0) / scored.length),
      curiosity: Math.round(scored.reduce((s, a) => s + (a.curiosity_score || 0), 0) / scored.length),
      stability: Math.round(scored.reduce((s, a) => s + (a.emotional_stability_score || 0), 0) / scored.length),
    };
  }, [analyses]);

  const engagementDist = useMemo(() => {
    const dist = { high: 0, medium: 0, low: 0 };
    recentAnalyses.forEach(a => {
      if (a.engagement_level === "high") dist.high++;
      else if (a.engagement_level === "medium") dist.medium++;
      else dist.low++;
    });
    return dist;
  }, [recentAnalyses]);

  const moodDist = useMemo(() => {
    const dist = { positive: 0, neutral: 0, low: 0 };
    recentAnalyses.forEach(a => {
      const mood = a.mood_score || "neutral";
      if (mood === "positive") dist.positive++;
      else if (mood === "low") dist.low++;
      else dist.neutral++;
    });
    return dist;
  }, [recentAnalyses]);

  const emotionChartData = useMemo(() => {
    const days: { date: string; label: string; joy: number; curiosity: number; frustration: number; fear: number; sadness: number; excitement: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
      days.push({ date: dateStr, label, joy: 0, curiosity: 0, frustration: 0, fear: 0, sadness: 0, excitement: 0, count: 0 });
    }
    for (const a of analyses) {
      const aDate = a.created_at.slice(0, 10);
      const day = days.find(d => d.date === aDate);
      if (!day) continue;
      const emo = (a.emotions || {}) as Record<string, number>;
      day.joy += emo.joy || 0; day.curiosity += emo.curiosity || 0;
      day.frustration += emo.frustration || 0; day.fear += emo.fear || 0;
      day.sadness += emo.sadness || 0; day.excitement += emo.excitement || 0;
      day.count++;
    }
    return days.map(d => ({
      name: d.label,
      Joie: d.count > 0 ? Math.round(d.joy / d.count) : 0,
      Curiosité: d.count > 0 ? Math.round(d.curiosity / d.count) : 0,
      Excitation: d.count > 0 ? Math.round(d.excitement / d.count) : 0,
      Frustration: d.count > 0 ? Math.round(d.frustration / d.count) : 0,
      Peur: d.count > 0 ? Math.round(d.fear / d.count) : 0,
      Tristesse: d.count > 0 ? Math.round(d.sadness / d.count) : 0,
      hasData: d.count > 0,
    }));
  }, [analyses]);

  const sessionDurationChartData = useMemo(() => {
    const days: { date: string; label: string; totalMin: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push({ date: d.toISOString().slice(0, 10), label: d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }), totalMin: 0, count: 0 });
    }
    for (const s of sessions) {
      if (!s.duration_seconds || s.duration_seconds <= 0) continue;
      const day = days.find(d => d.date === s.started_at.slice(0, 10));
      if (day) { day.totalMin += s.duration_seconds / 60; day.count++; }
    }
    return days.map(d => ({ name: d.label, minutes: Math.round(d.totalMin), sessions: d.count, hasData: d.count > 0 }));
  }, [sessions]);

  const today = new Date().toDateString();
  const todaySessions = sessions.filter(s => new Date(s.started_at).toDateString() === today);
  const todayDuration = todaySessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);

  const dailySummary = useMemo(() => {
    if (todaySessions.length === 0) return null;
    const todayAnalyses = recentAnalyses.filter(a => {
      const s = sessions.find(s => s.id === a.session_id);
      return s && new Date(s.started_at).toDateString() === new Date().toDateString();
    });
    if (todayAnalyses.length === 0 && todaySessions.length > 0)
      return `${displayName} a eu ${todaySessions.length} session${todaySessions.length > 1 ? "s" : ""} aujourd'hui (${formatDuration(todayDuration)}).`;
    const summaries = todayAnalyses.map(a => a.summary).filter(Boolean);
    if (summaries.length === 0) return null;
    const full = summaries.join(" ");
    const sentences = full.match(/[^.!?]+[.!?]+/g) || [full];
    return humanizeSummary(sentences.slice(0, 2).join(" ").trim());
  }, [todaySessions, recentAnalyses, sessions, displayName, todayDuration]);

  const parentRecommendations = useMemo(() => {
    const recs: { emoji: string; text: string }[] = [];
    if (recentAnalyses.length === 0) return recs;
    if (allInterests.length > 0) recs.push({ emoji: "🎨", text: `Proposez une activité créative autour de « ${allInterests[0][0]} » pour prolonger sa curiosité.` });
    if (engagementDist.low > engagementDist.high) recs.push({ emoji: "💡", text: `L'engagement est un peu faible. Essayez les jeux interactifs ou les histoires personnalisées.` });
    if (avgScores) {
      if (avgScores.stability < 40) recs.push({ emoji: "🤗", text: `Les émotions varient beaucoup. Un moment calme ensemble pourrait aider à stabiliser l'humeur.` });
      if (avgScores.sociability > 70) recs.push({ emoji: "👫", text: `${displayName} est très sociable ! Invitez un ami à jouer avec Bobby ensemble.` });
      if (avgScores.curiosity > 70) recs.push({ emoji: "📚", text: `Curiosité élevée ! Activez le mode éducatif pour explorer de nouveaux sujets.` });
    }
    const avgDur = totalDuration / Math.max(totalSessions, 1);
    if (avgDur > 900) recs.push({ emoji: "⏰", text: `Les sessions sont longues (${formatDuration(Math.round(avgDur))} en moyenne). Pensez à activer une limite de temps.` });
    if (recs.length === 0) recs.push({ emoji: "✨", text: `Continuez ainsi ! ${displayName} utilise Bobby de manière équilibrée.` });
    return recs.slice(0, 4);
  }, [recentAnalyses, allInterests, engagementDist, avgScores, displayName, totalDuration, totalSessions]);

  const lastSession = sessions[0] || null;
  const lastAnalysis = lastSession ? analyses.find(a => a.session_id === lastSession.id) : null;
  const hasData = totalSessions > 0;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif" }}>
      {/* KPI HERO */}
      <div className="animate-fadeInUp" style={{ animationDelay: "0.05s" }}>
        <div className="flex items-center gap-2.5 mb-3">
          <span className="text-xl">📊</span>
          <h3 className="text-[17px] font-black text-black uppercase">Statistiques</h3>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-3 gap-3 md:gap-4">
          {[
            { value: totalSessions, label: "Sessions", emoji: "💬", bg: "var(--retro-blue)" },
            { value: totalMessages, label: "Messages", emoji: "📝", bg: "var(--retro-green)" },
            { value: formatDuration(totalDuration), label: "Temps total", emoji: "⏱️", bg: "var(--retro-purple)" },
          ].map((kpi) => (
            <div key={kpi.label} className="retro-card p-2.5 text-center" style={{ backgroundColor: kpi.bg }}>
              <span className="text-[24px] block mb-0.5 drop-shadow-sm">{kpi.emoji}</span>
              <p className="text-[17px] font-black text-gray-800 leading-none truncate">{kpi.value}</p>
              <p className="text-[9px] text-gray-600 font-bold mt-0.5 truncate">{kpi.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* RÉSUMÉ DU JOUR */}
      {dailySummary && (
        <div className="retro-card p-5 animate-fadeInUp" style={{ animationDelay: "0.1s", backgroundColor: 'var(--retro-blue)' }}>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 bg-black flex items-center justify-center"><span className="text-white text-sm">📋</span></div>
            <h3 className="text-[17px] font-black text-gray-800">Résumé du jour</h3>
          </div>
          <p className="text-[15px] text-gray-700 leading-relaxed font-bold">{dailySummary}</p>
        </div>
      )}

      {/* RECOMMANDATIONS */}
      {parentRecommendations.length > 0 && (
        <div className="retro-card retro-card-tilt-2 p-5" style={{ backgroundColor: 'var(--retro-yellow)' }}>
          <div className="flex items-center gap-2.5 mb-3">
            <span className="text-2xl">✨</span>
            <h3 className="text-[17px] font-black text-black uppercase">Recommandations</h3>
          </div>
          <div className="space-y-2">
            {parentRecommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 p-3 border-2 border-black bg-white">
                <span className="text-xl mt-0.5">{rec.emoji}</span>
                <p className="text-[14px] text-black/80 leading-relaxed font-bold">{rec.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CENTRES D'INTÉRÊT RADAR */}
      {(() => {
        const liveSnapshot = getInterestSnapshot();
        const dbCounts: Record<string, number> = {};
        analyses.forEach(a => {
          (a.extracted_interests || []).forEach((interest: string) => { dbCounts[interest.toLowerCase()] = (dbCounts[interest.toLowerCase()] || 0) + 1; });
          (a.topics_detected || []).forEach((topic: string) => { dbCounts[topic.toLowerCase()] = (dbCounts[topic.toLowerCase()] || 0) + 0.5; });
        });
        const categoryScores: Record<string, number> = {};
        const kwMap = INTEREST_KEYWORDS_PUBLIC;
        Object.entries(kwMap).forEach(([cat, info]) => {
          let score = 0;
          const live = liveSnapshot.topInterests.find(t => t.topic === cat);
          if (live) score += live.score;
          info.keywords.forEach(kw => {
            Object.entries(dbCounts).forEach(([dbKey, count]) => {
              if (dbKey.includes(kw) || kw.includes(dbKey)) score += count;
            });
          });
          if (score > 0) categoryScores[cat] = Math.round(score * 10) / 10;
        });
        const radarData = Object.entries(categoryScores)
          .sort((a, b) => b[1] - a[1]).slice(0, 8)
          .map(([cat, score]) => ({
            subject: `${kwMap[cat]?.emoji || "📌"} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
            score: Math.min(score, 100),
            fullMark: Math.max(...Object.values(categoryScores), 10),
          }));
        if (radarData.length < 3) return null;
        return (
          <div className="retro-card retro-card-tilt-3 p-4" style={{ backgroundColor: 'var(--retro-blue)' }}>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-2xl">🎯</span>
              <h3 className="text-[17px] font-black text-black uppercase">Intérêts de {displayName}</h3>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="65%">
                <PolarGrid stroke="rgba(0,0,0,0.15)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "hsl(var(--foreground))", fontWeight: 900 }} />
                <PolarRadiusAxis tick={false} axisLine={false} />
                <Radar name="Intérêt" dataKey="score" stroke="hsl(var(--foreground))" fill="hsl(var(--foreground))" fillOpacity={0.15} strokeWidth={2.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        );
      })()}

      {/* ALERTES SÉCURITÉ */}
      {safetyAlerts.length > 0 && showSafetyAlerts && (
        <div className="retro-card p-3 border-4 border-black" style={{ backgroundColor: 'var(--retro-red)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🛡️</span>
            <h3 className="text-[14px] font-black text-black uppercase">Alertes Sécurité</h3>
            <span className="ml-auto text-[9px] px-2 py-0.5 border-2 border-black bg-white text-black font-black">{safetyAlerts.length}</span>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {safetyAlerts.slice(0, 10).map((alert, i) => (
              <div key={i} className="flex items-start gap-2 p-2 border-2 border-black bg-white">
                <span className="text-sm mt-0.5">{alert.severity === "CRITICAL" ? "🔴" : "🟡"}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-black text-black">{alert.category.replace(/_/g, " ")}</span>
                  <p className="text-[10px] text-black/70 font-bold">«{alert.keyword}»</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={clearSafetyAlerts} className="flex-1 text-[10px] font-black py-1.5 border-2 border-black bg-white text-black uppercase">Effacer</button>
            <button onClick={() => setShowSafetyAlerts(false)} className="flex-1 text-[10px] font-black py-1.5 border-2 border-black bg-foreground text-background uppercase">Fermer</button>
          </div>
        </div>
      )}
      {safetyAlerts.length > 0 && !showSafetyAlerts && (
        <button onClick={() => setShowSafetyAlerts(true)}
          className="w-full flex items-center justify-center gap-2 py-2 border-4 border-black bg-[var(--retro-red)] text-black text-[12px] font-black uppercase"
          style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.2)" }}>
          🛡️ {safetyAlerts.length} alerte{safetyAlerts.length > 1 ? "s" : ""}
        </button>
      )}

      {/* ALERTES SMART */}
      {smartAlerts.length > 0 && (
        <div className="retro-card p-3" style={{ backgroundColor: 'var(--retro-orange)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🔔</span>
            <h3 className="text-[14px] font-black text-black uppercase">Alertes</h3>
            <span className="ml-auto text-[9px] px-2 py-0.5 border-2 border-black bg-white text-black font-black">{smartAlerts.length}</span>
          </div>
          <div className="space-y-1.5">
            {smartAlerts.map((alert, i) => (
              <div key={i} className="flex items-start gap-2 p-2 border-2 border-black bg-white">
                <span className="text-sm">{alert.severity === "critical" ? "🔴" : "🟡"}</span>
                <p className="text-[12px] text-black leading-relaxed font-bold">{alert.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SCORES COMPORTEMENTAUX */}
      {avgScores && (
        <div className="retro-card retro-card-tilt-4 p-3" style={{ backgroundColor: 'var(--retro-green)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🧠</span>
            <h3 className="text-[15px] font-black text-black uppercase">Développement</h3>
          </div>
          <div className="grid grid-cols-3 gap-2 md:gap-4 mb-2">
            <ScoreGauge label="Sociabilité" score={avgScores.sociability} emoji="🤝" color="hsl(var(--foreground))" size="lg" />
            <ScoreGauge label="Curiosité" score={avgScores.curiosity} emoji="🔍" color="hsl(var(--foreground))" size="lg" />
            <ScoreGauge label="Stabilité" score={avgScores.stability} emoji="⚖️" color="hsl(var(--foreground))" size="lg" />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t-2 border-black/15">
            <div>
              <p className="text-[11px] text-black/60 font-black mb-1 uppercase">Engagement</p>
              <div className="flex gap-0.5 h-3 overflow-hidden border border-black">
                {recentAnalyses.length > 0 ? (
                  <>
                    <div className="bg-foreground" style={{ width: `${(engagementDist.high / recentAnalyses.length) * 100}%` }} />
                    <div className="bg-foreground/40" style={{ width: `${(engagementDist.medium / recentAnalyses.length) * 100}%` }} />
                    <div className="bg-white" style={{ width: `${(engagementDist.low / recentAnalyses.length) * 100}%` }} />
                  </>
                ) : <div className="bg-white w-full" />}
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[9px] text-black/60 font-black">🔥{engagementDist.high}</span>
                <span className="text-[9px] text-black/60 font-black">👍{engagementDist.medium}</span>
                <span className="text-[9px] text-black/60 font-black">💤{engagementDist.low}</span>
              </div>
            </div>
            <div>
              <p className="text-[11px] text-black/60 font-black mb-1 uppercase">Humeur</p>
              <div className="flex gap-0.5 h-3 overflow-hidden border border-black">
                {recentAnalyses.length > 0 ? (
                  <>
                    <div className="bg-foreground/80" style={{ width: `${(moodDist.positive / recentAnalyses.length) * 100}%` }} />
                    <div className="bg-foreground/30" style={{ width: `${(moodDist.neutral / recentAnalyses.length) * 100}%` }} />
                    <div className="bg-[var(--retro-red)]" style={{ width: `${(moodDist.low / recentAnalyses.length) * 100}%` }} />
                  </>
                ) : <div className="bg-white w-full" />}
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[9px] text-black/60 font-black">🟢{moodDist.positive}</span>
                <span className="text-[9px] text-black/60 font-black">🟡{moodDist.neutral}</span>
                <span className="text-[9px] text-black/60 font-black">🔴{moodDist.low}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ÉMOTIONS */}
      {Object.keys(avgEmotions).length > 0 && (
        <div className="retro-card retro-card-tilt-5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">💖</span>
            <h3 className="text-[15px] font-black text-black uppercase">Émotions</h3>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
            {Object.entries(avgEmotions).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a).slice(0, 6).map(([key, value], ei) => {
              const info = emotionScoreLabels[key] || { label: key, emoji: "❓" };
              const retroBgs = ["var(--retro-green)", "var(--retro-blue)", "var(--retro-yellow)", "var(--retro-red)", "var(--retro-purple)", "var(--retro-orange)"];
              return (
                <div key={key} className="border-2 border-black p-2 text-center" style={{ backgroundColor: retroBgs[ei % retroBgs.length] }}>
                  <span className="text-[20px] block">{info.emoji}</span>
                  <p className="text-[16px] font-black text-black leading-tight">{value}%</p>
                  <p className="text-[9px] text-black/60 font-black uppercase">{info.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ÉVOLUTION 7 JOURS */}
      {emotionChartData.some(d => d.hasData) && (
        <div className="retro-card retro-card-tilt-6 p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="text-2xl">📈</span>
            <h3 className="text-[17px] font-black text-black uppercase">Évolution (7j)</h3>
          </div>
          <div className="w-full h-44 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={emotionChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--foreground))", fontWeight: 900 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 8, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(0,0,0,0.05)" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const dataPoint = emotionChartData.find(d => d.name === label);
                    if (!dataPoint?.hasData) return null;
                    return (
                      <div className="border-2 border-black bg-white p-2" style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.2)" }}>
                        <p className="text-[10px] font-black text-black mb-1">{label}</p>
                        {payload.filter(p => p.dataKey !== "hasData" && (p.value as number) > 0).sort((a, b) => (b.value as number) - (a.value as number)).map(p => {
                          const cfg = emotionConfig[p.name as string] || { emoji: "❓", color: "#888" };
                          return (
                            <div key={p.name} className="flex items-center gap-1 py-0.5">
                              <span className="text-[9px]">{cfg.emoji}</span>
                              <span className="text-[9px] text-black flex-1 font-bold">{p.name}</span>
                              <span className="text-[10px] font-black" style={{ color: cfg.color }}>{p.value}%</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }}
                />
                <Bar dataKey="Joie" fill="hsl(145, 65%, 42%)" radius={[0, 0, 0, 0]} maxBarSize={10} />
                <Bar dataKey="Curiosité" fill="hsl(210, 80%, 55%)" radius={[0, 0, 0, 0]} maxBarSize={10} />
                <Bar dataKey="Excitation" fill="hsl(36, 90%, 50%)" radius={[0, 0, 0, 0]} maxBarSize={10} />
                <Bar dataKey="Frustration" fill="hsl(0, 75%, 55%)" radius={[0, 0, 0, 0]} maxBarSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            {Object.entries(emotionConfig).slice(0, 4).map(([label, cfg]) => (
              <span key={label} className="flex items-center gap-1 text-[9px] text-black/60 font-black">
                <span className="w-2 h-2" style={{ backgroundColor: cfg.color }} /> {cfg.emoji} {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* TEMPS DE SESSION */}
      {sessionDurationChartData.some(d => d.hasData) && (
        <div className="retro-card retro-card-tilt-1 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">⏱️</span>
            <h3 className="text-[14px] font-black text-black uppercase">Temps (7j)</h3>
          </div>
          <div className="w-full h-36 md:h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sessionDurationChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--foreground))", fontWeight: 900 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} unit=" min" />
                <Line type="monotone" dataKey="minutes" stroke="hsl(var(--foreground))" strokeWidth={2.5}
                  dot={{ r: 3, fill: "hsl(var(--foreground))", stroke: "hsl(var(--background))", strokeWidth: 2 }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* DERNIÈRE SESSION */}
      {lastSession && (
        <div className="retro-card retro-card-tilt-2 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🕐</span>
            <h3 className="text-[14px] font-black text-black uppercase">Dernière session</h3>
            <span className="ml-auto text-[9px] text-black/60 font-black">{formatDate(lastSession.started_at)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[
              { v: lastSession.message_count, l: "messages" },
              { v: formatDuration(lastSession.duration_seconds), l: "durée" },
              { v: lastAnalysis ? (lastAnalysis.engagement_level === "high" ? "🔥" : "👍") : "—", l: "engagement" },
            ].map(s => (
              <div key={s.l} className="text-center p-2 border-2 border-black bg-white">
                <p className="text-[14px] font-black text-black">{s.v}</p>
                <p className="text-[8px] text-black/60 font-black uppercase">{s.l}</p>
              </div>
            ))}
          </div>
          {lastAnalysis?.summary && (
            <div className="border-2 border-black bg-[var(--retro-yellow)] p-2">
              <p className="text-[11px] text-black/70 leading-relaxed font-bold">
                {(() => { const s = humanizeSummary(lastAnalysis.summary).match(/[^.!?]+[.!?]+/g); return s ? s.slice(0, 2).join(" ").trim() : humanizeSummary(lastAnalysis.summary); })()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ÉTAT VIDE */}
      {!hasData && (
        <div className="retro-card p-6 text-center">
          <span className="text-5xl block mb-2">🎙️</span>
          <h3 className="text-lg font-black text-black mb-1 uppercase">Pas encore de sessions</h3>
          <p className="text-[12px] text-black/60 font-bold">Les métriques apparaîtront après la première conversation de {displayName} avec Bobby.</p>
        </div>
      )}
    </div>
  );
};

export default DashboardTab;
