import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ArrowLeft, Plus, Search, Microscope, Star, RefreshCw, Sun, Moon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { QA_DATABASE } from "@/lib/qa-database";
import { BLAGUES } from "@/lib/bobby-content/blagues";
import { BOBBY_MULTI_RESPONSES } from "@/lib/responseSelector";
import { TOP_SECTIONS_CONFIG, EMOTION_LABELS } from "./adminConfig";
import { DashCard } from "./AdminCards";
import type { AdminState } from "./useAdminState";

export default function AdminDashboard({ admin }: { admin: AdminState }) {
  const {
    adminDark, setAdminDark, search, setSearch, setTopSection,
    entries, interactions, storeItems, cloudUsers, autoLearnCount,
    liveStats, chartSessions, chartEmotions,
    kbActiveCount, sectionCounts, liveInstallCounts,
    openKBDetail, openInteractionDetail, openQADetail, openBlagueDetail,
    refreshAll, navigate,
    fetchEntries, fetchStoreItems, fetchCloudUsers, fetchCloudStories,
    fetchRealConversations, fetchLiveStats, fetchChartData,
  } = admin;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${adminDark ? '' : 'admin-light'}`} style={{ background: "var(--admin-bg)" }}>
      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="w-9 h-9 rounded-xl flex items-center justify-center hover:opacity-80 transition-all" style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
            <ArrowLeft className="w-4 h-4" style={{ color: "var(--admin-text-muted)" }} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--admin-text)" }}>Bobby Admin</h1>
            <p className="text-[11px]" style={{ color: "var(--admin-text-dim)" }}>Tableau de bord central</p>
          </div>
          <button onClick={() => setAdminDark((d: boolean) => !d)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all" style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
            {adminDark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>
          <button onClick={() => { refreshAll(); toast.success("Données rafraîchies"); }}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all" style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
            <RefreshCw className="w-4 h-4" style={{ color: "var(--admin-text-muted)" }} />
          </button>
        </div>

        {/* Hero stats */}
        {(() => {
          const intCount = typeof sectionCounts.interactions === "number" ? sectionCounts.interactions : 0;
          const total = intCount + BOBBY_MULTI_RESPONSES.length + QA_DATABASE.length + BLAGUES.length + (sectionCounts.histoires as number || 0) + (sectionCounts.chansons as number || 0) + (sectionCounts.jeux as number || 0) + (admin.kbTotalCount || 0);
          return (
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-2 bg-gradient-to-r from-purple-500/10 to-blue-500/8 rounded-2xl p-3" style={{ border: "1px solid var(--admin-border)" }}>
                <p className="text-[28px] font-extrabold tracking-tight leading-none" style={{ color: "var(--admin-text)" }}>{total.toLocaleString("fr-FR")}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--admin-text-muted)" }}>contenus total</p>
              </div>
              <div className="rounded-2xl p-3 text-center" style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
                <p className="text-lg font-bold text-emerald-500">{kbActiveCount.toLocaleString("fr-FR")}</p>
                <p className="text-[9px]" style={{ color: "var(--admin-text-dim)" }}>KB actif</p>
              </div>
              <div className="rounded-2xl p-3 text-center" style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
                <p className="text-lg font-bold text-sky-500">{cloudUsers.length}</p>
                <p className="text-[9px]" style={{ color: "var(--admin-text-dim)" }}>users</p>
              </div>
            </div>
          );
        })()}

        {/* Live Activity */}
        <div className="bg-gradient-to-r from-emerald-500/[0.08] to-cyan-500/[0.08] rounded-2xl p-3" style={{ border: "1px solid var(--admin-border)" }}>
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-[11px] font-bold text-emerald-500 tracking-wide">ACTIVITÉ EN DIRECT</p>
            <p className="text-[9px] ml-auto" style={{ color: "var(--admin-text-faint)" }}>⟳ 30s</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: liveStats.activeSessions, label: "actives maintenant", color: "text-emerald-500" },
              { val: liveStats.todaySessions, label: "sessions aujourd'hui", color: "text-cyan-500" },
              { val: liveStats.todayMessages, label: "messages aujourd'hui", color: "text-blue-500" },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-2.5 text-center" style={{ background: "var(--admin-card)" }}>
                <p className={`text-[22px] font-extrabold leading-none ${s.color}`}>{s.val}</p>
                <p className="text-[9px] mt-1" style={{ color: "var(--admin-text-muted)" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Total tracking indicator */}
          <div className="grid grid-cols-2 gap-2 mt-2.5">
            <div className="rounded-xl p-2.5 text-center bg-gradient-to-r from-purple-500/10 to-indigo-500/10" style={{ border: "1px solid var(--admin-border)" }}>
              <p className="text-[22px] font-extrabold leading-none text-purple-400">{liveStats.totalSessions}</p>
              <p className="text-[9px] mt-1" style={{ color: "var(--admin-text-muted)" }}>📦 sessions total enregistrées</p>
            </div>
            <div className="rounded-xl p-2.5 text-center bg-gradient-to-r from-amber-500/10 to-orange-500/10" style={{ border: "1px solid var(--admin-border)" }}>
              <p className="text-[22px] font-extrabold leading-none text-amber-400">{liveStats.totalMessages}</p>
              <p className="text-[9px] mt-1" style={{ color: "var(--admin-text-muted)" }}>💬 messages total enregistrés</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2.5 px-1">
            {[
              { icon: "⏱", label: "Durée moy:", value: liveStats.avgDuration > 0 ? `${Math.floor(liveStats.avgDuration / 60)}m${(liveStats.avgDuration % 60).toString().padStart(2, "0")}s` : "—" },
              { icon: "😊", label: "Top émotion:", value: liveStats.topEmotion },
              { icon: "🕐", label: "Dernière:", value: liveStats.lastActivity ? (() => { const diff = Math.round((Date.now() - new Date(liveStats.lastActivity).getTime()) / 60000); return diff < 1 ? "à l'instant" : diff < 60 ? `il y a ${diff}m` : `il y a ${Math.floor(diff / 60)}h`; })() : "—" },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span className="text-[9px]" style={{ color: "var(--admin-text-faint)" }}>{s.icon} {s.label}</span>
                <span className="text-[10px] font-bold" style={{ color: "var(--admin-text-secondary)" }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-3">
          <div className="rounded-2xl p-3" style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
            <p className="text-[11px] font-bold mb-2" style={{ color: "var(--admin-text-secondary)" }}>📊 Sessions & Messages (7 jours)</p>
            {chartSessions.length > 0 ? (
              <div className="h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartSessions} barGap={2}>
                    <XAxis dataKey="day" tick={{ fill: adminDark ? "rgba(255,255,255,0.3)" : "#86868b", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: adminDark ? "#1a1a2e" : "#fff", border: `1px solid ${adminDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, borderRadius: 12, fontSize: 11, color: adminDark ? "#fff" : "#1d1d1f" }}
                      labelStyle={{ color: adminDark ? "rgba(255,255,255,0.5)" : "#86868b" }}
                    />
                    <Bar dataKey="sessions" name="Sessions" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="messages" name="Messages" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-[10px] text-center py-6" style={{ color: "var(--admin-text-faint)" }}>Aucune donnée cette semaine</p>
            )}
            <div className="flex items-center justify-center gap-4 mt-1">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-purple-500" /><span className="text-[9px]" style={{ color: "var(--admin-text-muted)" }}>Sessions</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-cyan-500" /><span className="text-[9px]" style={{ color: "var(--admin-text-muted)" }}>Messages</span></div>
            </div>
          </div>

          <div className="rounded-2xl p-3" style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
            <p className="text-[11px] font-bold mb-2" style={{ color: "var(--admin-text-secondary)" }}>😊 Émotions détectées (7 jours)</p>
            {chartEmotions.length > 0 ? (
              <div className="flex items-center gap-3">
                <div className="h-[120px] w-[120px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartEmotions} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} innerRadius={25} strokeWidth={0}>
                        {chartEmotions.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: adminDark ? "#1a1a2e" : "#fff", border: `1px solid ${adminDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, borderRadius: 12, fontSize: 11, color: adminDark ? "#fff" : "#1d1d1f" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {chartEmotions.map((e, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: e.color }} />
                      <span className="text-[12px] font-bold flex-1" style={{ color: "var(--admin-text)" }}>{EMOTION_LABELS[e.name] || e.name}</span>
                      <span className="text-[13px] font-black tabular-nums" style={{ color: e.color }}>{e.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-center py-6" style={{ color: "var(--admin-text-faint)" }}>Aucune émotion détectée</p>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2">
          <button onClick={() => { setTopSection("cloud"); admin.setCloudSection(null); setSearch(""); }}
            className="flex-1 flex items-center justify-center gap-1.5 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 rounded-xl py-2.5 text-[11px] font-bold transition-all">
            <Plus className="w-3.5 h-3.5" /> Ajouter KB
          </button>
          <button onClick={() => { setTopSection("autolearn"); setSearch(""); }}
            className="flex-1 flex items-center justify-center gap-1.5 bg-lime-500/15 hover:bg-lime-500/25 text-lime-300 rounded-xl py-2.5 text-[11px] font-bold transition-all">
            <Microscope className="w-3.5 h-3.5" /> Auto-Learn
          </button>
          <button onClick={() => { setTopSection("store"); setSearch(""); }}
            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 rounded-xl py-2.5 text-[11px] font-bold transition-all">
            <Star className="w-3.5 h-3.5" /> Store
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher dans tout le cerveau…"
            className="bg-white/[0.04] border-white/[0.06] text-white pl-10 h-10 rounded-xl placeholder:text-white/20 focus:border-purple-500/30 focus:ring-purple-500/10 text-[13px]" />
          {search.trim() && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs">✕</button>
          )}
        </div>

        {/* Global search results */}
        {search.trim() ? (() => {
          const q = search.toLowerCase();
          const kbResults = entries.filter(e => e.question.toLowerCase().includes(q) || e.answer.toLowerCase().includes(q) || e.keywords.some(k => k.toLowerCase().includes(q))).slice(0, 8);
          const qaResults = QA_DATABASE.filter(e => e.triggers.some(t => t.toLowerCase().includes(q)) || e.responses.some(r => r.toLowerCase().includes(q))).slice(0, 8);
          const blagueResults = BLAGUES.filter(b => b.question.toLowerCase().includes(q) || b.reponse.toLowerCase().includes(q)).slice(0, 8);
          const interactionResults = (interactions || []).filter(i => i.child_input.toLowerCase().includes(q) || i.ai_response.toLowerCase().includes(q)).slice(0, 8);
          const total = kbResults.length + qaResults.length + blagueResults.length + interactionResults.length;

          if (total === 0) return (
            <div className="text-center py-8">
              <span className="text-2xl block mb-1">🔍</span>
              <p className="text-white/25 text-xs">Aucun résultat pour « {search} »</p>
            </div>
          );

          return (
            <div className="space-y-3">
              <p className="text-[10px] text-white/25">{total}+ résultats</p>
              {kbResults.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-bold text-sky-400 mb-1.5 uppercase tracking-wider">☁️ Cloud KB ({kbResults.length})</h3>
                  <div className="space-y-1">
                    {kbResults.map(e => (
                      <div key={e.id} onClick={() => openKBDetail(e)} className="bg-white/[0.04] rounded-xl p-2.5 border border-white/[0.06] cursor-pointer hover:bg-white/[0.06] transition-all">
                        <p className="text-[11px] text-white/80 font-medium truncate">{e.question}</p>
                        <p className="text-[10px] text-white/25 mt-0.5 truncate">{e.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {interactionResults.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-bold text-cyan-400 mb-1.5 uppercase tracking-wider">🧠 Interactions ({interactionResults.length})</h3>
                  <div className="space-y-1">
                    {interactionResults.map((i, idx) => (
                      <div key={idx} onClick={() => openInteractionDetail(i)} className="bg-white/[0.04] rounded-xl p-2.5 border border-white/[0.06] cursor-pointer hover:bg-white/[0.06] transition-all">
                        <p className="text-[11px] text-white/80 truncate">👦 {i.child_input}</p>
                        <p className="text-[10px] text-white/25 mt-0.5 truncate">🤖 {i.ai_response}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {qaResults.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-bold text-amber-400 mb-1.5 uppercase tracking-wider">❓ QA ({qaResults.length})</h3>
                  <div className="space-y-1">
                    {qaResults.map((e, idx) => (
                      <div key={idx} onClick={() => openQADetail(e)} className="bg-white/[0.04] rounded-xl p-2.5 border border-white/[0.06] cursor-pointer hover:bg-white/[0.06] transition-all">
                        <p className="text-[11px] text-white/80 truncate">🎯 {e.triggers.slice(0, 2).join(" • ")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {blagueResults.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-bold text-green-400 mb-1.5 uppercase tracking-wider">😂 Blagues ({blagueResults.length})</h3>
                  <div className="space-y-1">
                    {blagueResults.map((b, idx) => (
                      <div key={idx} onClick={() => openBlagueDetail(b, idx)} className="bg-white/[0.04] rounded-xl p-2.5 border border-white/[0.06] cursor-pointer hover:bg-white/[0.06] transition-all">
                        <p className="text-[11px] text-white/80 truncate">{b.question}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })() : (
        <>
          {/* Section: Intelligence */}
          <div className="space-y-1.5">
            <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold px-1">Intelligence</p>
            <div className="space-y-1.5">
              {(["cloud", "interactions", "autolearn", "kbdebug"] as const).map(id => {
                const section = TOP_SECTIONS_CONFIG.find(s => s.id === id)!;
                return (
                  <DashCard key={section.id} label={section.label} emoji={section.emoji}
                    count={sectionCounts[section.id] ?? "…"} desc={section.desc}
                    color={section.color} bgColor={section.bgColor}
                    badge={section.id === "cloud" ? `${entries.filter(e => e.is_active).length} actifs` : section.id === "autolearn" && autoLearnCount !== null ? "live" : undefined}
                    onClick={() => { setTopSection(section.id); setSearch(""); }} />
                );
              })}
            </div>
          </div>

          {/* Section: Contenu */}
          <div className="space-y-1.5">
            <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold px-1">Contenu</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(["multiresponses", "qa", "jeux", "blagues", "histoires", "chansons"] as const).map(id => {
                const section = TOP_SECTIONS_CONFIG.find(s => s.id === id)!;
                return (
                  <button key={section.id} onClick={() => { setTopSection(section.id); setSearch(""); }}
                    className="bg-white/[0.04] hover:bg-white/[0.08] rounded-xl p-2.5 border border-white/[0.06] hover:border-white/[0.12] transition-all text-left flex items-center gap-2.5">
                    <span className="text-lg">{section.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] font-bold ${section.color} truncate`}>{section.label}</p>
                      <p className="text-[9px] text-white/20">{sectionCounts[section.id] ?? "…"} items</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Gestion */}
          <div className="space-y-1.5">
            <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold px-1">Gestion</p>
            <div className="space-y-1.5">
              {(["store", "cerveau", "expressions", "cloudusers", "devices"] as const).map(id => {
                const section = TOP_SECTIONS_CONFIG.find(s => s.id === id)!;
                return (
                  <DashCard key={section.id} label={section.label} emoji={section.emoji}
                    count={sectionCounts[section.id] ?? "…"} desc={section.desc}
                    color={section.color} bgColor={section.bgColor}
                    badge={section.id === "store" ? `${storeItems.filter(s => s.is_active).length} actifs` : section.id === "cloudusers" ? "live" : section.id === "devices" ? "live" : undefined}
                    onClick={() => { setTopSection(section.id); setSearch(""); }} />
                );
              })}
            </div>
          </div>
        </>
        )}

        <p className="text-[9px] text-center pt-1 pb-4" style={{ color: "var(--admin-text-faint)" }}>Bobby Admin v2 · Cloud KB modifiable</p>
        
      </div>
    </div>
  );
}
