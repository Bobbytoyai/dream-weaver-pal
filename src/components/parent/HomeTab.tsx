import React from "react";
import { ChevronRight, Activity } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { Analysis, Session, Tab } from "./parentTypes";
import { emotionLabels } from "./parentTypes";
import type { ParentSettings } from "@/components/parentSettings";
import type { ParentMode } from "@/lib/bobby/masterControl";

interface HomeTabProps {
  sessions: Session[];
  analyses: Analysis[];
  displayName: string;
  cloudProfile: unknown | null;
  unreadAlertCount: number;
  settings: ParentSettings;
  onOpenNotifPanel: () => void;
  onNavigate: (tab: Tab) => void;
  onUpdateMode: (mode: ParentMode) => void;
}

const HomeTab: React.FC<HomeTabProps> = ({
  sessions, analyses, displayName, cloudProfile,
  unreadAlertCount, settings, onOpenNotifPanel, onNavigate, onUpdateMode,
}) => {
  // ─── Daily summary ───
  const todayStr = new Date().toLocaleDateString("fr-FR");
  const todaySessions = sessions.filter(s => new Date(s.started_at).toLocaleDateString("fr-FR") === todayStr);
  const todayMessages = todaySessions.reduce((a, s) => a + s.message_count, 0);
  const todayDuration = todaySessions.reduce((a, s) => a + (s.duration_seconds || 0), 0);
  const todayEmotions = todaySessions.flatMap(s => s.detected_emotions || []);
  const topEmotion = todayEmotions.length > 0
    ? Object.entries(todayEmotions.reduce((acc, e) => { acc[e] = (acc[e] || 0) + 1; return acc; }, {} as Record<string, number>))
        .sort(([, a], [, b]) => b - a)[0]
    : null;
  const todayAnalyses = todaySessions.map(s => analyses.find(a => a.session_id === s.id)).filter(Boolean);
  const avgEngagement = todayAnalyses.length > 0
    ? todayAnalyses.filter(a => a!.engagement_level === "high").length / todayAnalyses.length
    : 0;

  // ─── 7-day emotion chart ───
  const chartContent = (() => {
    const last7 = [...sessions]
      .filter(s => new Date(s.started_at) >= new Date(Date.now() - 7 * 86400000))
      .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());

    const dayMap = new Map<string, { joy: number[]; sadness: number[]; curiosity: number[]; frustration: number[]; excitement: number[] }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toLocaleDateString("fr-FR", { weekday: "short" });
      dayMap.set(key, { joy: [], sadness: [], curiosity: [], frustration: [], excitement: [] });
    }

    last7.forEach(s => {
      const a = analyses.find(an => an.session_id === s.id);
      if (!a?.emotions) return;
      const key = new Date(s.started_at).toLocaleDateString("fr-FR", { weekday: "short" });
      const bucket = dayMap.get(key);
      if (!bucket) return;
      const emo = a.emotions as Record<string, number>;
      if (emo.joy) bucket.joy.push(emo.joy);
      if (emo.sadness) bucket.sadness.push(emo.sadness);
      if (emo.curiosity) bucket.curiosity.push(emo.curiosity);
      if (emo.frustration) bucket.frustration.push(emo.frustration);
      if (emo.excitement) bucket.excitement.push(emo.excitement);
    });

    const chartData = Array.from(dayMap.entries()).map(([day, vals]) => ({
      day,
      "😊 Joie": vals.joy.length ? Math.round(vals.joy.reduce((a, b) => a + b, 0) / vals.joy.length) : 0,
      "😢 Triste": vals.sadness.length ? Math.round(vals.sadness.reduce((a, b) => a + b, 0) / vals.sadness.length) : 0,
      "🧐 Curiosité": vals.curiosity.length ? Math.round(vals.curiosity.reduce((a, b) => a + b, 0) / vals.curiosity.length) : 0,
      "😤 Frustration": vals.frustration.length ? Math.round(vals.frustration.reduce((a, b) => a + b, 0) / vals.frustration.length) : 0,
      "🤩 Excitation": vals.excitement.length ? Math.round(vals.excitement.reduce((a, b) => a + b, 0) / vals.excitement.length) : 0,
    }));

    const hasAnyData = chartData.some(d => d["😊 Joie"] > 0 || d["😢 Triste"] > 0 || d["🧐 Curiosité"] > 0);
    if (!hasAnyData) return null;

    return (
      <div className="hero-fade-in retro-card p-4" style={{ backgroundColor: 'var(--retro-purple)' }}>
        <h3 className="text-[16px] font-black text-gray-800 mb-2 flex items-center gap-2">
          <Activity className="w-5 h-5 text-gray-800" /> Émotions sur 7 jours
        </h3>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="emoJoy" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#facc15" stopOpacity={0.5}/><stop offset="100%" stopColor="#facc15" stopOpacity={0}/></linearGradient>
              <linearGradient id="emoSad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa" stopOpacity={0.5}/><stop offset="100%" stopColor="#60a5fa" stopOpacity={0}/></linearGradient>
              <linearGradient id="emoCurio" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a78bfa" stopOpacity={0.5}/><stop offset="100%" stopColor="#a78bfa" stopOpacity={0}/></linearGradient>
              <linearGradient id="emoFrust" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f87171" stopOpacity={0.5}/><stop offset="100%" stopColor="#f87171" stopOpacity={0}/></linearGradient>
              <linearGradient id="emoExcite" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={0.5}/><stop offset="100%" stopColor="#34d399" stopOpacity={0}/></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#000" opacity={0.15} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fontWeight: 800, fill: '#333' }} stroke="#333" />
            <YAxis tick={{ fontSize: 10, fill: '#333' }} stroke="#333" domain={[0, 100]} />
            <Tooltip contentStyle={{ border: '3px solid #000', borderRadius: 0, fontWeight: 700, fontSize: 12, boxShadow: '4px 4px 0 rgba(0,0,0,0.2)' }} />
            <Area type="monotone" dataKey="😊 Joie" stroke="#facc15" fill="url(#emoJoy)" strokeWidth={2.5} dot={{ r: 3 }} />
            <Area type="monotone" dataKey="😢 Triste" stroke="#60a5fa" fill="url(#emoSad)" strokeWidth={2} dot={{ r: 3 }} />
            <Area type="monotone" dataKey="🧐 Curiosité" stroke="#a78bfa" fill="url(#emoCurio)" strokeWidth={2} dot={{ r: 3 }} />
            <Area type="monotone" dataKey="😤 Frustration" stroke="#f87171" fill="url(#emoFrust)" strokeWidth={2} dot={{ r: 3 }} />
            <Area type="monotone" dataKey="🤩 Excitation" stroke="#34d399" fill="url(#emoExcite)" strokeWidth={2} dot={{ r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  })();

  // ─── Nav cards ───
  const navCards: { id: Tab; emoji: string; label: string; bg: string; badge?: number }[] = [
    { id: "dashboard", emoji: "📊", label: "Tableau de\nbord", bg: "var(--retro-blue)" },
    { id: "sessions", emoji: "💬", label: "Sessions", bg: "var(--retro-green)",
      badge: sessions.filter(s => !analyses.some(a => a.session_id === s.id)).length || undefined },
    { id: "activites", emoji: "🛒", label: "Bobby Store", bg: "var(--retro-yellow)" },
    { id: "personnalisation", emoji: "🎨", label: "Personnaliser", bg: "var(--retro-red)" },
    { id: "cloud", emoji: "☁️", label: "Bobby Cloud", bg: "var(--retro-purple)" },
    { id: "reglages", emoji: "⚙️", label: "Réglages", bg: "#e5e5e5" },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif" }}>
      {/* Quick alerts */}
      {unreadAlertCount > 0 && (
        <button onClick={onOpenNotifPanel}
          className="w-full retro-card p-3 flex items-center gap-3" style={{ backgroundColor: 'var(--retro-red)' }}>
          <span className="text-xl">🔔</span>
          <div className="flex-1 text-left">
            <p className="text-[13px] font-black text-gray-800">{unreadAlertCount} alerte{unreadAlertCount > 1 ? "s" : ""}</p>
            <p className="text-[10px] text-gray-600 font-bold">Touchez pour voir</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-800" />
        </button>
      )}

      {/* Hero: Daily Summary */}
      <div className="hero-fade-in retro-card p-5" style={{ backgroundColor: 'var(--retro-blue)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[22px] font-black text-gray-800">Bonjour 👋</h2>
            <p className="text-[12px] text-gray-600 font-bold mt-0.5">
              {todaySessions.length > 0
                ? `${displayName} a eu ${todaySessions.length} session${todaySessions.length > 1 ? "s" : ""} aujourd'hui`
                : `${displayName} n'a pas encore parlé à Bobby`
              }
            </p>
          </div>
          <div className="text-[42px] drop-shadow-md">{todaySessions.length > 0 ? (topEmotion ? (emotionLabels[topEmotion[0]]?.emoji || "😊") : "😊") : "💤"}</div>
        </div>

        {todaySessions.length > 0 && (
          <div className="grid grid-cols-4 gap-2 md:gap-3">
            {[
              { emoji: "💬", value: todayMessages, label: "Messages", bg: "var(--retro-green)" },
              { emoji: "⏱️", value: todayDuration >= 60 ? `${Math.round(todayDuration / 60)}m` : `${todayDuration}s`, label: "Durée", bg: "var(--retro-yellow)" },
              { emoji: avgEngagement > 0.5 ? "🔥" : avgEngagement > 0 ? "👍" : "💤", value: avgEngagement > 0.5 ? "Fort" : avgEngagement > 0 ? "Bon" : "—", label: "Engage.", bg: "var(--retro-purple)" },
              { emoji: topEmotion ? (emotionLabels[topEmotion[0]]?.emoji || "😊") : "—", value: topEmotion ? (emotionLabels[topEmotion[0]]?.label || topEmotion[0]).slice(0, 5) : "—", label: "Émotion", bg: "var(--retro-red)" },
            ].map(s => (
              <div key={s.label} className="border-2 border-black py-2 px-1 text-center" style={{ backgroundColor: s.bg }}>
                <span className="text-[14px] block">{s.emoji}</span>
                <p className="text-[13px] font-black text-gray-800 leading-tight truncate">{s.value}</p>
                <p className="text-[7px] text-gray-600 font-bold truncate">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Master Control — Mode selector */}
      <div className="hero-fade-in retro-card p-4" style={{ backgroundColor: 'var(--retro-yellow)' }}>
        <h3 className="text-[14px] font-black text-gray-800 mb-3 uppercase">🎛️ Mode Bobby</h3>
        <div className="grid grid-cols-5 gap-1.5 md:gap-3">
          {([
            { id: "normal" as ParentMode, emoji: "✨", label: "Normal" },
            { id: "nuit" as ParentMode, emoji: "🌙", label: "Nuit" },
            { id: "ecole" as ParentMode, emoji: "📚", label: "École" },
            { id: "calme" as ParentMode, emoji: "🧘", label: "Calme" },
            { id: "educatif" as ParentMode, emoji: "🧠", label: "Éducatif" },
          ]).map(mode => {
            const isActive = (settings.parentMode || "normal") === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => onUpdateMode(mode.id)}
                className="border-2 border-black py-2 px-1 text-center transition-all duration-200 hover:translate-y-[-2px]"
                style={{
                  backgroundColor: isActive ? "#000" : "#fff",
                  color: isActive ? "#fff" : "#000",
                }}
              >
                <span className="text-[16px] block">{mode.emoji}</span>
                <span className="text-[8px] font-black block mt-0.5 uppercase">{mode.label}</span>
              </button>
            );
          })}
        </div>
        {settings.parentMode && settings.parentMode !== "normal" && (
          <p className="text-[9px] font-bold text-gray-700 mt-2">
            {settings.parentMode === "nuit" && "🌙 Bobby parle doucement et propose des histoires calmes."}
            {settings.parentMode === "ecole" && "📚 Bobby se concentre sur l'apprentissage et les exercices."}
            {settings.parentMode === "calme" && "🧘 Bobby réduit son énergie et reste doux."}
            {settings.parentMode === "educatif" && "🧠 Bobby priorise les faits, la science et les découvertes."}
          </p>
        )}
      </div>

      {/* 7-day Emotion Chart */}
      {chartContent}

      {/* Navigation cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {navCards.map((card, i) => (
          <button key={card.id} onClick={() => onNavigate(card.id)}
            className={`card-stagger-${i + 1} retro-card relative p-3 flex flex-col items-center justify-center aspect-square md:aspect-auto md:py-5`}
            style={{ backgroundColor: card.bg }}>
            <span className="text-[32px] mb-1 drop-shadow-sm">{card.emoji}</span>
            <span className="text-[11px] font-black text-gray-800 leading-tight text-center whitespace-pre-line">{card.label}</span>
            {card.badge && card.badge > 0 && (
              <span className="absolute top-1 right-1 min-w-[20px] h-[20px] px-1 bg-black text-white text-[9px] font-black flex items-center justify-center shadow-md">
                {card.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default HomeTab;
