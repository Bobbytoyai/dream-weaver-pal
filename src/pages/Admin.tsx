import { useState } from "react";
import { createPortal } from "react-dom";
import ExpressionPreview from "@/components/ExpressionPreview";
import AutoLearnPanel from "@/components/AutoLearnPanel";
import KBDebugPanel from "@/components/KBDebugPanel";
import AdminDetailDialog from "@/components/AdminDetailDialog";
import AdminStoreManager from "@/components/AdminStoreManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Search, Brain, Lock,
  ChevronRight, Pencil, Trash2, Eye, RefreshCw,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { BLAGUES } from "@/lib/bobby-content/blagues";
import { HISTOIRES } from "@/lib/bobby-content/histoires";
import { CHANSONS, CHANSON_CATEGORIES, type ChansonCategorie, type Chanson } from "@/lib/bobby-content/chansons";
import { QA_DATABASE } from "@/lib/qa-database";
import { BOBBY_MULTI_RESPONSES } from "@/lib/responseSelector";
import {
  QUIZ_ANIMAUX, QUIZ_EDUCATIF, VRAI_FAUX, DEVINETTES,
  BLAGUES as GAME_BLAGUES,
} from "@/lib/gameEngine";
import {
  BOBBY_PERSONALITY, BOBBY_NATURAL_REACTIONS,
  SILENCE_RELAUNCHES, WELCOME_PHRASES, FAREWELL_PHRASES,
} from "@/lib/bobby-content/cerveau";

import {
  ACCESS_CODE, INTERACTION_CATEGORIES, AGE_GROUPS, BRAIN_SECTIONS,
  ALL_DB_CATEGORIES, QA_INTENT_EMOJIS,
} from "./admin/adminConfig";
import { InteractionCard, EntryRow } from "./admin/AdminCards";
import { useAdminState } from "./admin/useAdminState";
import AdminDashboard from "./admin/AdminDashboard";

const Admin = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [code, setCode] = useState("");
  const admin = useAdminState();

  const {
    adminDark, topSection, setTopSection, interactionCat, setInteractionCat,
    interactionAge, setInteractionAge, cloudSection, setCloudSection,
    search, setSearch, ageFilter, setAgeFilter,
    expandedStory, setExpandedStory,
    entries, loading, interactions, loadingInteractions,
    cloudStories, storeItems, cloudUsers,
    realConversations, realConvLoading, learningSessionId,
    liveInstallCounts,
    editingEntry, setEditingEntry, saving,
    editingStory, setEditingStory, savingStory, setSavingStory,
    detailItem, setDetailItem, selectedCloudUser, setSelectedCloudUser,
    cloudUserSearch, setCloudUserSearch, cloudUsersLoading,
    categoryCounts, qaByIntent, currentCloudSection, cloudEntries,
    filteredInteractions, interactionCategoryCounts, multiResponseCategoryCounts,
    sectionCounts,
    goBack, handleSave, handleDelete, handleToggleActive,
    handleDetailSave, handleDetailDelete,
    openInteractionDetail, openKBDetail, openQADetail, openBlagueDetail,
    openHistoireDetail, openQuizDetail,
    fetchEntries, fetchCloudStories, fetchStoreItems, fetchCloudUsers,
    fetchRealConversations, learnFromSession, refreshAll,
  } = admin;

  // ─── Init on auth ───
  const [didInit, setDidInit] = useState(false);
  if (authenticated && !didInit) {
    setDidInit(true);
    refreshAll();
  }

  // Detail portal
  const detailPortal = detailItem ? createPortal(
    <AdminDetailDialog
      item={detailItem}
      onClose={() => setDetailItem(null)}
      onSave={handleDetailSave}
      onDelete={handleDetailDelete}
    />,
    document.body
  ) : null;

  // ─── Login ─────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-blue-600 mx-auto flex items-center justify-center shadow-2xl shadow-purple-500/20">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Bobby Admin</h1>
            <p className="text-white/40 text-sm mt-1">Base opérationnelle</p>
          </div>
          <Input type="password" value={code} onChange={e => setCode(e.target.value)} placeholder="Code d'accès"
            className="bg-white/[0.06] border-white/[0.08] text-white text-center text-lg tracking-[0.3em] rounded-2xl h-14 placeholder:text-white/20 focus:border-purple-500/40 focus:ring-purple-500/20"
            onKeyDown={e => { if (e.key === "Enter") { code === ACCESS_CODE ? setAuthenticated(true) : toast.error("Code incorrect"); } }}
          />
          <Button onClick={() => { code === ACCESS_CODE ? setAuthenticated(true) : toast.error("Code incorrect"); }}
            className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-2xl text-[15px] font-semibold shadow-lg shadow-purple-500/20">
            Accéder
          </Button>
        </div>
      </div>
    );
  }

  // ─── Edit form ─────────────────────────────────────────────────
  if (editingEntry) {
    const kwString = (editingEntry.keywords || []).join(", ");
    return (
      <div className="min-h-screen bg-[#0a0a0f] p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <Button variant="ghost" onClick={() => setEditingEntry(null)} className="text-white/70">
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
          </Button>
          <h2 className="text-xl font-bold text-white">{editingEntry.id ? "Modifier" : "Nouvelle"} interaction</h2>
          <div className="space-y-4 bg-white/[0.04] backdrop-blur-xl rounded-[16px] p-5 border border-white/10">
            <div>
              <label className="text-white/60 text-xs font-medium mb-1 block">Question / Déclencheur</label>
              <Textarea value={editingEntry.question || ""} onChange={e => setEditingEntry({ ...editingEntry, question: e.target.value })}
                placeholder="Ex: C'est quoi un dinosaure ?" className="bg-white/10 border-white/20 text-white min-h-[80px]" />
            </div>
            <div>
              <label className="text-white/60 text-xs font-medium mb-1 block">Mots-clés (virgules)</label>
              <Input value={kwString} onChange={e => setEditingEntry({ ...editingEntry, keywords: e.target.value.split(",").map(k => k.trim()).filter(Boolean) })}
                placeholder="dinosaure, dino" className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <label className="text-white/60 text-xs font-medium mb-1 block">Réponse de Bobby</label>
              <Textarea value={editingEntry.answer || ""} onChange={e => setEditingEntry({ ...editingEntry, answer: e.target.value })}
                placeholder="Les dinosaures étaient…" className="bg-white/10 border-white/20 text-white min-h-[100px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/60 text-xs font-medium mb-1 block">Catégorie</label>
                <Select value={editingEntry.category || "général"} onValueChange={v => setEditingEntry({ ...editingEntry, category: v })}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{ALL_DB_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-white/60 text-xs font-medium mb-1 block">Priorité (1-10)</label>
                <Input type="number" min={1} max={10} value={editingEntry.priority || 5}
                  onChange={e => setEditingEntry({ ...editingEntry, priority: Number(e.target.value) })}
                  className="bg-white/10 border-white/20 text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/60 text-xs font-medium mb-1 block">Âge min</label>
                <Input type="number" min={3} max={12} value={editingEntry.age_min || 3}
                  onChange={e => setEditingEntry({ ...editingEntry, age_min: Number(e.target.value) })} className="bg-white/10 border-white/20 text-white" />
              </div>
              <div>
                <label className="text-white/60 text-xs font-medium mb-1 block">Âge max</label>
                <Input type="number" min={3} max={12} value={editingEntry.age_max || 12}
                  onChange={e => setEditingEntry({ ...editingEntry, age_max: Number(e.target.value) })} className="bg-white/10 border-white/20 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editingEntry.is_active !== false} onCheckedChange={v => setEditingEntry({ ...editingEntry, is_active: v })} />
              <span className="text-white/60 text-sm">Actif</span>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full bg-green-600 hover:bg-green-700 text-white">
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION ROUTING — Each topSection renders its view
  // ═══════════════════════════════════════════════════════════════

  // ── Interactions 10K ──
  if (topSection === "interactions" && interactionCat && interactionCat !== "real_conversations") {
    const catConfig = INTERACTION_CATEGORIES.find(c => c.id === interactionCat);
    const totalForCat = interactions?.filter(i => i.category === interactionCat).length || 0;
    return (
      <>{detailPortal}
      <div className="min-h-screen bg-[#0a0a0f] p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={goBack} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
            <span className="text-2xl">{catConfig?.emoji}</span>
            <div>
              <h1 className="text-xl font-bold text-white">{catConfig?.label}</h1>
              <p className="text-white/40 text-xs">{totalForCat} interactions • {filteredInteractions.length} affichées</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {AGE_GROUPS.map(g => (
              <button key={g.label} onClick={() => setInteractionAge({ min: g.min, max: g.max })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  interactionAge.min === g.min && interactionAge.max === g.max
                    ? "bg-cyan-500/30 text-cyan-300 border border-cyan-500/40"
                    : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                }`}>{g.label}</button>
            ))}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
              className="bg-white/10 border-white/20 text-white pl-9" />
          </div>
          <div className="space-y-2">
            {(search.trim()
              ? filteredInteractions.filter(i => i.child_input.toLowerCase().includes(search.toLowerCase()) || i.ai_response.toLowerCase().includes(search.toLowerCase()))
              : filteredInteractions
            ).map((interaction, idx) => (
              <div key={idx} onClick={() => openInteractionDetail(interaction)} className="cursor-pointer">
                <InteractionCard interaction={interaction} />
              </div>
            ))}
            {filteredInteractions.length === 0 && <p className="text-center text-white/40 py-12 text-sm">Aucune interaction pour ce filtre</p>}
            {filteredInteractions.length >= 100 && <p className="text-center text-white/30 text-xs py-2">Affichage limité à 100 résultats</p>}
          </div>
        </div>
      </div></>
    );
  }

  // ── Real conversations ──
  if (topSection === "interactions" && interactionCat === "real_conversations") {
    return (
      <>{detailPortal}
      <div className="min-h-screen bg-[#0a0a0f] p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={goBack} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
            <span className="text-2xl">💬</span>
            <div>
              <h1 className="text-xl font-bold text-white">Conversations réelles</h1>
              <p className="text-white/40 text-xs">{realConversations.length} sessions enregistrées</p>
            </div>
          </div>

          {/* Aggregate stats */}
          {(() => {
            const totalMessages = realConversations.reduce((a, c) => a + c.messages.length, 0);
            const allEmotions = realConversations.flatMap(c => c.detected_emotions || []);
            const emotionCounts: Record<string, number> = {};
            allEmotions.forEach(e => { emotionCounts[e] = (emotionCounts[e] || 0) + 1; });
            const topEmotions = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
            const allTopics = realConversations.flatMap(c => c.topics || []);
            const topicCounts: Record<string, number> = {};
            allTopics.forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
            const topTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
            return (
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/10">
                  <p className="text-xl font-bold text-emerald-400">{realConversations.length}</p>
                  <p className="text-[9px] text-white/40">sessions</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/10">
                  <p className="text-xl font-bold text-cyan-400">{totalMessages}</p>
                  <p className="text-[9px] text-white/40">messages</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/10">
                  <p className="text-xl font-bold text-pink-400">{topEmotions[0]?.[0] || "—"}</p>
                  <p className="text-[9px] text-white/40">émotion top</p>
                </div>
                {topEmotions.length > 0 && (
                  <div className="col-span-3 bg-white/[0.04] rounded-2xl p-3 border border-white/[0.06]">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Émotions détectées</p>
                    <div className="flex flex-wrap gap-1.5">
                      {topEmotions.map(([em, count]) => (
                        <span key={em} className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-300">{em} <span className="text-white/30">×{count}</span></span>
                      ))}
                    </div>
                  </div>
                )}
                {topTopics.length > 0 && (
                  <div className="col-span-3 bg-white/[0.04] rounded-2xl p-3 border border-white/[0.06]">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Topics populaires</p>
                    <div className="flex flex-wrap gap-1.5">
                      {topTopics.map(([topic, count]) => (
                        <span key={topic} className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300">#{topic} <span className="text-white/30">×{count}</span></span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {realConvLoading ? (
            <div className="text-center text-white/50 py-12 animate-pulse">Chargement des conversations…</div>
          ) : realConversations.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl block mb-2">📭</span>
              <p className="text-white/30 text-sm">Aucune conversation enregistrée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {realConversations.map(conv => (
                <div key={conv.session_id} className="bg-white/5 backdrop-blur rounded-2xl p-4 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold">{conv.child_name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">{conv.child_age} ans</span>
                      {conv.detected_emotions?.map((e, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300">{e}</span>
                      ))}
                    </div>
                    <span className="text-[10px] text-white/20">{new Date(conv.started_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {conv.messages.map((msg, i) => (
                      <div key={i} className="flex gap-2">
                        <span className={`text-[10px] shrink-0 mt-0.5 ${msg.role === "user" ? "text-blue-400" : "text-green-400"}`}>
                          {msg.role === "user" ? "👦" : "🤖"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[11px] ${msg.role === "user" ? "text-white/80" : "text-white/50"}`}>{msg.content}</p>
                          {msg.detected_emotion && <span className="text-[8px] text-pink-400/50">{msg.detected_emotion}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                    <span className="text-[9px] text-white/20">{conv.messages.length} messages</span>
                    <button onClick={() => learnFromSession(conv)} disabled={learningSessionId === conv.session_id}
                      className="ml-auto flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg bg-lime-500/15 text-lime-300 hover:bg-lime-500/25 disabled:opacity-50 transition-all font-semibold">
                      {learningSessionId === conv.session_id ? <><RefreshCw className="w-3 h-3 animate-spin" /> Analyse…</> : <><Brain className="w-3 h-3" /> Apprendre</>}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div></>
    );
  }

  // ── Interactions grid ──
  if (topSection === "interactions") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={goBack} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
            <span className="text-2xl">🧠</span>
            <div>
              <h1 className="text-xl font-bold text-white">Interactions</h1>
              <p className="text-white/40 text-xs">{interactions?.length ?? "…"} interactions</p>
            </div>
          </div>
          {loadingInteractions ? (
            <div className="text-center text-white/50 py-12">Chargement…</div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => { setInteractionCat("real_conversations"); setSearch(""); }}
                className="aspect-square bg-gradient-to-br from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 backdrop-blur rounded-2xl p-3 border border-emerald-500/20 hover:border-emerald-500/40 transition-all text-left flex flex-col justify-between">
                <span className="text-2xl">💬</span>
                <div>
                  <p className="text-lg font-bold text-white">{realConversations.length}</p>
                  <h3 className="text-[11px] font-semibold text-emerald-400">Conversations réelles</h3>
                </div>
              </button>
              {INTERACTION_CATEGORIES.map(cat => {
                const count = interactionCategoryCounts[cat.id] || 0;
                if (count === 0) return null;
                return (
                  <button key={cat.id} onClick={() => { setInteractionCat(cat.id); setSearch(""); }}
                    className="aspect-square bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-xl rounded-[20px] p-3 border border-white/[0.06] hover:border-white/[0.12] transition-all text-left flex flex-col justify-between">
                    <span className="text-2xl">{cat.emoji}</span>
                    <div>
                      <p className="text-lg font-bold text-white">{count}</p>
                      <h3 className={`text-[11px] font-semibold ${cat.color}`}>{cat.label}</h3>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Multi-réponses ──
  if (topSection === "multiresponses") {
    const uniqueEmotions = [...new Set(BOBBY_MULTI_RESPONSES.map(e => e.emotion).filter(Boolean))];
    if (interactionCat) {
      const catEntries = BOBBY_MULTI_RESPONSES.filter(e => e.category === interactionCat);
      const searchLower = search.toLowerCase();
      let filtered = catEntries;
      if (ageFilter) filtered = filtered.filter(e => e.emotion === ageFilter);
      if (searchLower) filtered = filtered.filter(e => e.input.toLowerCase().includes(searchLower) || e.responses.some(r => r.text.toLowerCase().includes(searchLower)));

      return (
        <div className="min-h-screen bg-[#0a0a0f] p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => { setInteractionCat(null); setSearch(""); setAgeFilter(null); }} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
              <span className="text-2xl">⚡</span>
              <div>
                <h1 className="text-xl font-bold text-white capitalize">{interactionCat.replace(/_/g, " ")}</h1>
                <p className="text-white/40 text-xs">{filtered.length}/{catEntries.length} entrées</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setAgeFilter(null)} className={`text-xs px-3 py-1.5 rounded-full border transition-all ${!ageFilter ? "bg-orange-500/30 border-orange-400/50 text-orange-300" : "bg-white/5 border-white/10 text-white/50"}`}>Tous</button>
              {[...new Set(catEntries.map(e => e.emotion).filter(Boolean))].map(em => (
                <button key={em} onClick={() => setAgeFilter(ageFilter === em ? null : em!)} className={`text-xs px-3 py-1.5 rounded-full border transition-all ${ageFilter === em ? "bg-pink-500/30 border-pink-400/50 text-pink-300" : "bg-white/5 border-white/10 text-white/50"}`}>{em}</button>
              ))}
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" className="bg-white/10 border-white/20 text-white pl-9" />
            </div>
            <div className="space-y-3">
              {filtered.map((entry, idx) => (
                <div key={idx} className="bg-white/[0.04] backdrop-blur-xl rounded-[16px] p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300">{entry.category}</span>
                    {entry.emotion && <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300">{entry.emotion}</span>}
                    {entry.tags?.map((t, i) => <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/40">{t}</span>)}
                  </div>
                  <p className="text-sm text-white/80 font-medium mb-2">👦 {entry.input}</p>
                  <div className="space-y-1">
                    {entry.responses.map((r, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-[10px] text-green-400 shrink-0 mt-0.5">🤖</span>
                        <p className="text-xs text-white/60">{r.text}</p>
                        <span className="text-[9px] text-white/20 shrink-0 ml-auto">{r.type} • {r.energy}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <p className="text-center text-white/40 py-8 text-sm">Aucun résultat</p>}
            </div>
          </div>
        </div>
      );
    }

    const uniqueCats = [...new Set(BOBBY_MULTI_RESPONSES.map(e => e.category))];
    const searchLower = search.toLowerCase();
    let filteredCats = uniqueCats;
    if (ageFilter) { const catsWithEmotion = new Set(BOBBY_MULTI_RESPONSES.filter(e => e.emotion === ageFilter).map(e => e.category)); filteredCats = filteredCats.filter(c => catsWithEmotion.has(c)); }
    if (searchLower) { const catsWithSearch = new Set(BOBBY_MULTI_RESPONSES.filter(e => e.input.toLowerCase().includes(searchLower) || e.responses.some(r => r.text.toLowerCase().includes(searchLower))).map(e => e.category)); filteredCats = filteredCats.filter(c => catsWithSearch.has(c)); }

    return (
      <div className="min-h-screen bg-[#0a0a0f] p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={goBack} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
            <span className="text-2xl">⚡</span>
            <div>
              <h1 className="text-xl font-bold text-white">Multi-Réponses</h1>
              <p className="text-white/40 text-xs">{BOBBY_MULTI_RESPONSES.length} entrées • {uniqueCats.length} catégories</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setAgeFilter(null)} className={`text-xs px-3 py-1.5 rounded-full border transition-all ${!ageFilter ? "bg-orange-500/30 border-orange-400/50 text-orange-300" : "bg-white/5 border-white/10 text-white/50"}`}>Toutes émotions</button>
            {uniqueEmotions.map(em => (
              <button key={em} onClick={() => setAgeFilter(ageFilter === em ? null : em!)} className={`text-xs px-3 py-1.5 rounded-full border transition-all ${ageFilter === em ? "bg-pink-500/30 border-pink-400/50 text-pink-300" : "bg-white/5 border-white/10 text-white/50"}`}>{em}</button>
            ))}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" className="bg-white/10 border-white/20 text-white pl-9" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {filteredCats.map(cat => (
              <button key={cat} onClick={() => { setInteractionCat(cat); setSearch(""); setAgeFilter(null); }}
                className="bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-xl rounded-[20px] p-3 border border-white/[0.06] transition-all text-left flex flex-col justify-between aspect-square">
                <span className="text-lg capitalize text-white/70">{cat.replace(/_/g, " ")}</span>
                <div>
                  <p className="text-lg font-bold text-white">{multiResponseCategoryCounts[cat] || 0}</p>
                  <h3 className="text-[10px] font-semibold text-orange-400">entrées</h3>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Jeux & Quiz ──
  if (topSection === "jeux") {
    const GAME_SECTIONS = [
      { id: "quiz_animaux", label: "Quiz Animaux", emoji: "🐾", data: QUIZ_ANIMAUX, type: "quiz" as const },
      { id: "quiz_educatif", label: "Quiz Sciences", emoji: "🔬", data: QUIZ_EDUCATIF, type: "quiz" as const },
      { id: "vrai_faux", label: "Vrai ou Faux", emoji: "✅", data: VRAI_FAUX, type: "vf" as const },
      { id: "devinettes", label: "Devinettes", emoji: "🤔", data: DEVINETTES, type: "riddle" as const },
      { id: "blagues_jeu", label: "Blagues Jeu", emoji: "😂", data: GAME_BLAGUES, type: "blague" as const },
    ];
    const activeGameSection = interactionCat ? GAME_SECTIONS.find(s => s.id === interactionCat) : null;

    if (activeGameSection) {
      const searchLower = search.toLowerCase();
      const renderItems = () => {
        if (activeGameSection.type === "quiz") {
          const items = activeGameSection.data as any[];
          const filtered = searchLower ? items.filter(q => q.question.toLowerCase().includes(searchLower)) : items;
          return <div className="space-y-2">{filtered.map((q, i) => (
            <div key={i} onClick={() => openQuizDetail(q, "quiz")} className="bg-white/[0.04] rounded-[16px] p-4 border border-white/[0.06] cursor-pointer hover:bg-white/[0.06]">
              <p className="text-sm text-white/80 font-medium">{q.question}</p>
              <p className="text-xs text-green-400/60 mt-1">✓ {q.choices[q.correctIndex]}</p>
            </div>
          ))}{filtered.length === 0 && <p className="text-center text-white/40 py-8 text-sm">Aucun résultat</p>}</div>;
        }
        if (activeGameSection.type === "vf") {
          const items = activeGameSection.data as any[];
          const filtered = searchLower ? items.filter(q => q.statement.toLowerCase().includes(searchLower)) : items;
          return <div className="space-y-2">{filtered.map((q, i) => (
            <div key={i} onClick={() => openQuizDetail(q, "vf")} className="bg-white/[0.04] rounded-[16px] p-4 border border-white/[0.06] cursor-pointer hover:bg-white/[0.06]">
              <div className="flex items-center gap-2 mb-1"><span className={`text-[10px] px-2 py-0.5 rounded-full ${q.answer ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>{q.answer ? "VRAI" : "FAUX"}</span></div>
              <p className="text-sm text-white/80">{q.statement}</p>
            </div>
          ))}{filtered.length === 0 && <p className="text-center text-white/40 py-8 text-sm">Aucun résultat</p>}</div>;
        }
        if (activeGameSection.type === "riddle") {
          const items = activeGameSection.data as any[];
          const filtered = searchLower ? items.filter(q => q.question.toLowerCase().includes(searchLower)) : items;
          return <div className="space-y-2">{filtered.map((q, i) => (
            <div key={i} onClick={() => openQuizDetail(q, "riddle")} className="bg-white/[0.04] rounded-[16px] p-4 border border-white/[0.06] cursor-pointer hover:bg-white/[0.06]">
              <p className="text-sm text-white/80 font-medium">{q.question}</p>
              <p className="text-xs text-white/30 mt-1">💡 {q.hint}</p>
            </div>
          ))}{filtered.length === 0 && <p className="text-center text-white/40 py-8 text-sm">Aucun résultat</p>}</div>;
        }
        const items = activeGameSection.data as string[];
        const filtered = searchLower ? items.filter(b => b.toLowerCase().includes(searchLower)) : items;
        return <div className="space-y-2">{filtered.map((b, i) => (
          <div key={i} onClick={() => openQuizDetail(b, "blague")} className="bg-white/[0.04] rounded-[16px] p-4 border border-white/[0.06] cursor-pointer hover:bg-white/[0.06]">
            <p className="text-sm text-white/70">{b}</p>
          </div>
        ))}{filtered.length === 0 && <p className="text-center text-white/40 py-8 text-sm">Aucun résultat</p>}</div>;
      };

      return (<>{detailPortal}<div className="min-h-screen bg-[#0a0a0f] p-4"><div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={goBack} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
          <span className="text-2xl">{activeGameSection.emoji}</span>
          <div><h1 className="text-xl font-bold text-white">{activeGameSection.label}</h1><p className="text-white/40 text-xs">{activeGameSection.data.length} entrées</p></div>
        </div>
        <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" className="bg-white/10 border-white/20 text-white pl-9" /></div>
        {renderItems()}
      </div></div></>);
    }

    return (
      <div className="min-h-screen bg-[#0a0a0f] p-4"><div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={goBack} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
          <span className="text-2xl">🎮</span>
          <div><h1 className="text-xl font-bold text-white">Jeux & Quiz</h1></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {GAME_SECTIONS.map(section => (
            <button key={section.id} onClick={() => { setInteractionCat(section.id); setSearch(""); }}
              className="aspect-square bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-xl rounded-[20px] p-4 border border-white/[0.06] transition-all text-left flex flex-col justify-between">
              <span className="text-3xl">{section.emoji}</span>
              <div><p className="text-xl font-bold text-white">{section.data.length}</p><h3 className="text-xs font-semibold text-white/70">{section.label}</h3></div>
            </button>
          ))}
        </div>
      </div></div>
    );
  }

  // ── QA Database ──
  if (topSection === "qa") {
    if (interactionCat) {
      const intentEntries = QA_DATABASE.filter(e => (e.intent || "OTHER") === interactionCat);
      const searchLower = search.toLowerCase();
      const filtered = searchLower ? intentEntries.filter(e => e.triggers.some(t => t.toLowerCase().includes(searchLower)) || e.responses.some(r => r.toLowerCase().includes(searchLower))) : intentEntries;
      return (<>{detailPortal}<div className="min-h-screen bg-[#0a0a0f] p-4"><div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => { setInteractionCat(null); setSearch(""); }} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
          <span className="text-2xl">{QA_INTENT_EMOJIS[interactionCat] || "❓"}</span>
          <div><h1 className="text-xl font-bold text-white">{interactionCat}</h1><p className="text-white/40 text-xs">{filtered.length}/{intentEntries.length} entrées</p></div>
        </div>
        <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" className="bg-white/10 border-white/20 text-white pl-9" /></div>
        <div className="space-y-2">
          {filtered.map((entry, idx) => (
            <div key={idx} onClick={() => openQADetail(entry)} className="bg-white/[0.04] rounded-[16px] p-4 border border-white/[0.06] cursor-pointer hover:bg-white/[0.06]">
              <p className="text-xs text-white/50 mb-1.5">🎯 {entry.triggers.join(" • ")}</p>
              {entry.responses.map((r, i) => <p key={i} className="text-sm text-white/70">🤖 {r}</p>)}
            </div>
          ))}
        </div>
      </div></div></>);
    }

    const searchLower = search.toLowerCase();
    const filteredIntents = searchLower ? qaByIntent.filter(([, entries]) => entries.some(e => e.triggers.some(t => t.toLowerCase().includes(searchLower)) || e.responses.some(r => r.toLowerCase().includes(searchLower)))) : qaByIntent;
    return (
      <div className="min-h-screen bg-[#0a0a0f] p-4"><div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={goBack} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
          <span className="text-2xl">❓</span>
          <div><h1 className="text-xl font-bold text-white">QA Database</h1><p className="text-white/40 text-xs">{QA_DATABASE.length} entrées</p></div>
        </div>
        <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" className="bg-white/10 border-white/20 text-white pl-9" /></div>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
          {filteredIntents.map(([intent, entries]) => (
            <button key={intent} onClick={() => { setInteractionCat(intent); setSearch(""); }}
              className="bg-white/[0.04] hover:bg-white/[0.08] rounded-[20px] p-3 border border-white/[0.06] text-left flex flex-col justify-between aspect-square">
              <span className="text-2xl">{QA_INTENT_EMOJIS[intent] || "❓"}</span>
              <div><p className="text-lg font-bold text-white">{entries.length}</p><h3 className="text-[10px] font-semibold text-amber-400">{intent}</h3></div>
            </button>
          ))}
        </div>
      </div></div>
    );
  }

  // ── Blagues ──
  if (topSection === "blagues") {
    const categories = [...new Set(BLAGUES.map(b => b.categorie))];
    const AGE_GROUPS_BLG = [{ label: "Tous", min: 0, max: 99 }, { label: "5-6 ans", min: 5, max: 6 }, { label: "7-8 ans", min: 7, max: 8 }, { label: "9-10 ans", min: 9, max: 10 }, { label: "11-12 ans", min: 11, max: 12 }];
    const searchLower = search.toLowerCase();

    if (interactionCat) {
      const catBlagues = BLAGUES.filter(b => b.categorie === interactionCat);
      const ageFiltered = ageFilter ? catBlagues.filter(b => { const ag = AGE_GROUPS_BLG.find(a => a.label === ageFilter); return ag ? b.ageMin <= ag.max && b.ageMax >= ag.min : true; }) : catBlagues;
      const filtered = searchLower ? ageFiltered.filter(b => b.question.toLowerCase().includes(searchLower) || b.reponse.toLowerCase().includes(searchLower)) : ageFiltered;
      return (<>{detailPortal}<div className="min-h-screen bg-[#0a0a0f] p-4"><div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => { setInteractionCat(null); setSearch(""); setAgeFilter(null); }} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
          <span className="text-2xl">😂</span>
          <div><h1 className="text-xl font-bold text-white capitalize">{interactionCat}</h1><p className="text-white/40 text-xs">{filtered.length} blagues</p></div>
        </div>
        <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" className="bg-white/10 border-white/20 text-white pl-9" /></div>
        <div className="flex gap-2 flex-wrap">
          {AGE_GROUPS_BLG.map(ag => (
            <button key={ag.label} onClick={() => setAgeFilter(ageFilter === ag.label ? null : ag.label)} className={`text-xs px-3 py-1.5 rounded-full border transition-all ${ageFilter === ag.label ? "bg-green-500/30 border-green-400/50 text-green-300" : "bg-white/5 border-white/10 text-white/50"}`}>{ag.label}</button>
          ))}
        </div>
        <div className="space-y-2">
          {filtered.map((b, i) => (
            <div key={i} onClick={() => openBlagueDetail(b, i)} className="bg-white/[0.04] rounded-[16px] p-4 border border-white/[0.06] cursor-pointer hover:bg-white/[0.06]">
              <div className="flex items-center gap-2 mb-2"><span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300">{b.ageMin}-{b.ageMax} ans</span></div>
              <p className="text-sm text-white/80 font-medium">{b.question}</p>
              <p className="text-sm text-white/50 mt-1">→ {b.reponse}</p>
            </div>
          ))}
        </div>
      </div></div></>);
    }

    const EMOJIS: Record<string, string> = { animaux: "🐾", ecole: "📚", nourriture: "🍕", absurde: "🤪", famille: "👨‍👩‍👧", science: "🔬" };
    return (<>{detailPortal}<div className="min-h-screen bg-[#0a0a0f] p-4"><div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={goBack} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
        <span className="text-2xl">😂</span>
        <div><h1 className="text-xl font-bold text-white">Blagues</h1><p className="text-white/40 text-xs">{BLAGUES.length} blagues</p></div>
      </div>
      <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" className="bg-white/10 border-white/20 text-white pl-9" /></div>
      {searchLower ? (
        <div className="space-y-2">
          {BLAGUES.filter(b => b.question.toLowerCase().includes(searchLower) || b.reponse.toLowerCase().includes(searchLower)).map((b, i) => (
            <div key={i} onClick={() => openBlagueDetail(b, i)} className="bg-white/[0.04] rounded-[16px] p-4 border border-white/[0.06] cursor-pointer hover:bg-white/[0.06]">
              <p className="text-sm text-white/80 font-medium">{b.question}</p>
              <p className="text-sm text-white/50 mt-1">→ {b.reponse}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {categories.map(cat => (
            <button key={cat} onClick={() => { setInteractionCat(cat); setSearch(""); }}
              className="aspect-square bg-white/[0.04] hover:bg-white/[0.08] rounded-[20px] p-4 border border-white/[0.06] text-left flex flex-col justify-between">
              <span className="text-3xl">{EMOJIS[cat] || "😂"}</span>
              <div><p className="text-xl font-bold text-white">{BLAGUES.filter(b => b.categorie === cat).length}</p><h3 className="text-xs font-semibold text-white/70 capitalize">{cat}</h3></div>
            </button>
          ))}
        </div>
      )}
    </div></div></>);
  }

  // ── Chansons ──
  if (topSection === "chansons") {
    const selectedChansonCat = interactionCat as ChansonCategorie | null;
    const searchLower = search.toLowerCase();
    const AGE_GROUPS_CH = [{ label: "Tous", min: 0, max: 99 }, { label: "3-5 ans", min: 3, max: 5 }, { label: "6-8 ans", min: 6, max: 8 }, { label: "9-12 ans", min: 9, max: 12 }];

    if (selectedChansonCat) {
      const catChansons = CHANSONS.filter(c => c.categorie === selectedChansonCat);
      const ageFiltered = ageFilter ? catChansons.filter(c => { const ag = AGE_GROUPS_CH.find(a => a.label === ageFilter); return ag ? c.ageMin <= ag.max && c.ageMax >= ag.min : true; }) : catChansons;
      const filtered = searchLower ? ageFiltered.filter(c => c.titre.toLowerCase().includes(searchLower) || c.description.toLowerCase().includes(searchLower)) : ageFiltered;
      const grouped: Record<string, Chanson[]> = {};
      for (const c of filtered) { const key = c.sousCategorie || "général"; if (!grouped[key]) grouped[key] = []; grouped[key].push(c); }
      const catInfo = CHANSON_CATEGORIES.find(cc => cc.id === selectedChansonCat);

      return (
        <div className="min-h-screen bg-[#0a0a0f] p-4"><div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => { setInteractionCat(null); setSearch(""); setAgeFilter(null); }} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
            <span className="text-2xl">{catInfo?.emoji || "🎵"}</span>
            <div><h1 className="text-xl font-bold text-white">{catInfo?.label}</h1><p className="text-white/40 text-xs">{filtered.length} chansons</p></div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {AGE_GROUPS_CH.map(ag => (
              <button key={ag.label} onClick={() => setAgeFilter(ageFilter === ag.label ? null : ag.label)} className={`text-xs px-3 py-1.5 rounded-full border transition-all ${ageFilter === ag.label ? "bg-rose-500/30 border-rose-400/50 text-rose-300" : "bg-white/5 border-white/10 text-white/50"}`}>{ag.label}</button>
            ))}
          </div>
          <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" className="bg-white/10 border-white/20 text-white pl-9" /></div>
          {Object.entries(grouped).map(([group, chansons]) => (
            <div key={group}>
              {Object.keys(grouped).length > 1 && <h3 className="text-[10px] text-white/30 uppercase tracking-wider font-bold mt-2 mb-1">{group}</h3>}
              <div className="space-y-2">
                {chansons.map(c => (
                  <div key={c.id} className="bg-white/[0.04] rounded-[16px] p-4 border border-white/10">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">{c.ageMin}-{c.ageMax} ans</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/40">⏱ {c.duree}</span>
                    </div>
                    <h4 className="text-sm text-white/80 font-medium">{c.titre}</h4>
                    <p className="text-xs text-white/40 mt-1">{c.description}</p>
                    <p className="text-xs text-white/60 mt-2 leading-relaxed whitespace-pre-wrap">{c.paroles}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div></div>
      );
    }

    return (
      <div className="min-h-screen bg-[#0a0a0f] p-4"><div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={goBack} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
          <span className="text-2xl">🎵</span>
          <div><h1 className="text-xl font-bold text-white">Chansons</h1><p className="text-white/40 text-xs">{CHANSONS.length} chansons</p></div>
        </div>
        <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" className="bg-white/10 border-white/20 text-white pl-9" /></div>
        {searchLower ? (
          <div className="space-y-2">
            {CHANSONS.filter(c => c.titre.toLowerCase().includes(searchLower) || c.description.toLowerCase().includes(searchLower)).map(c => (
              <div key={c.id} className="bg-white/[0.04] rounded-[16px] p-4 border border-white/10">
                <p className="text-sm text-white/80 font-medium">{c.titre}</p>
                <p className="text-xs text-white/40 mt-1">{c.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {CHANSON_CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => { setInteractionCat(cat.id); setSearch(""); }}
                className={`aspect-square ${cat.color} hover:opacity-90 rounded-2xl p-4 border border-white/[0.06] text-left flex flex-col justify-between`}>
                <span className="text-3xl">{cat.emoji}</span>
                <div><p className="text-xl font-bold text-white">{CHANSONS.filter(c => c.categorie === cat.id).length}</p><h3 className="text-xs font-semibold text-white/70">{cat.label}</h3></div>
              </button>
            ))}
          </div>
        )}
      </div></div>
    );
  }

  // ── Histoires ──
  if (topSection === "histoires") {
    const STORY_THEMES = [
      { id: "espace", label: "Espace", emoji: "🚀", color: "bg-indigo-500/20" },
      { id: "pirate", label: "Pirates", emoji: "🏴‍☠️", color: "bg-amber-500/20" },
      { id: "magie", label: "Magie", emoji: "✨", color: "bg-purple-500/20" },
      { id: "animaux", label: "Animaux", emoji: "🦁", color: "bg-green-500/20" },
      { id: "dodo", label: "Dodo", emoji: "🌙", color: "bg-blue-500/20" },
      { id: "nature", label: "Nature", emoji: "🌿", color: "bg-emerald-500/20" },
      { id: "amitié", label: "Amitié", emoji: "🤝", color: "bg-pink-500/20" },
      { id: "courage", label: "Courage", emoji: "💪", color: "bg-red-500/20" },
    ];
    const allStories = [
      ...HISTOIRES.map(h => ({ ...h, source: "local" as const })),
      ...cloudStories.map(s => ({
        id: s.id, titre: s.title, theme: s.theme, ageMin: s.age_min, ageMax: s.age_max,
        duree: s.duration as "courte" | "moyenne" | "longue",
        texte: s.full_text || s.template_text,
        moralité: s.summary || undefined,
        tags: [s.category, s.theme, s.mood].filter(Boolean), source: "cloud" as const,
      })),
    ];
    const activeThemes = [...new Set(allStories.map(s => s.theme))];
    const allThemeConfigs = activeThemes.map(t => STORY_THEMES.find(st => st.id === t) || { id: t, label: t.charAt(0).toUpperCase() + t.slice(1), emoji: "📖", color: "bg-white/10" });
    const AGE_GROUPS_STORY = [{ label: "Tous", min: 0, max: 99 }, { label: "3-5 ans", min: 3, max: 5 }, { label: "6-8 ans", min: 6, max: 8 }, { label: "9-12 ans", min: 9, max: 12 }];

    if (editingStory) {
      return (
        <div className="min-h-screen bg-[#0a0a0f] p-4"><div className="max-w-2xl mx-auto space-y-4">
          <Button variant="ghost" onClick={() => setEditingStory(null)} className="text-white/70"><ArrowLeft className="w-4 h-4 mr-2" /> Retour</Button>
          <h2 className="text-xl font-bold text-white">{editingStory.id ? "Modifier" : "Nouvelle"} histoire</h2>
          <div className="space-y-4 bg-white/[0.04] rounded-[16px] p-5 border border-white/10">
            <div><label className="text-white/60 text-xs font-medium mb-1 block">Titre</label><Input value={editingStory.titre || ""} onChange={e => setEditingStory({ ...editingStory, titre: e.target.value })} className="bg-white/10 border-white/20 text-white" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-white/60 text-xs font-medium mb-1 block">Thème</label>
                <Select value={editingStory.theme || "magie"} onValueChange={v => setEditingStory({ ...editingStory, theme: v })}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{STORY_THEMES.map(t => <SelectItem key={t.id} value={t.id}>{t.emoji} {t.label}</SelectItem>)}<SelectItem value="autre">📖 Autre</SelectItem></SelectContent>
                </Select>
              </div>
              <div><label className="text-white/60 text-xs font-medium mb-1 block">Durée</label>
                <Select value={editingStory.duree || "courte"} onValueChange={v => setEditingStory({ ...editingStory, duree: v as any })}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="courte">Courte</SelectItem><SelectItem value="moyenne">Moyenne</SelectItem><SelectItem value="longue">Longue</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><label className="text-white/60 text-xs font-medium mb-1 block">Texte complet</label><Textarea value={editingStory.texte || ""} onChange={e => setEditingStory({ ...editingStory, texte: e.target.value })} className="bg-white/10 border-white/20 text-white min-h-[200px]" /></div>
          </div>
          <Button onClick={async () => {
            if (!editingStory.titre?.trim() || !editingStory.texte?.trim()) { toast.error("Titre et texte requis"); return; }
            setSavingStory(true);
            const payload = { title: editingStory.titre!.trim(), theme: editingStory.theme || "magie", template_text: editingStory.texte!.trim().slice(0, 100), full_text: editingStory.texte!.trim(), summary: editingStory.moralité || null, age_min: editingStory.ageMin || 5, age_max: editingStory.ageMax || 12, duration: editingStory.duree || "courte", category: editingStory.theme || "magie", language: "fr" };
            if (editingStory.id && editingStory.id.includes("-")) {
              const { error } = await supabase.from("story_templates").update(payload as any).eq("id", editingStory.id);
              if (error) toast.error(error.message); else toast.success("Histoire modifiée !");
            } else {
              const { error } = await supabase.from("story_templates").insert(payload as any);
              if (error) toast.error(error.message); else toast.success("Histoire ajoutée !");
            }
            setSavingStory(false); setEditingStory(null); fetchCloudStories();
          }} disabled={savingStory} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
            {savingStory ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div></div>
      );
    }

    if (interactionCat) {
      const themeConfig = allThemeConfigs.find(t => t.id === interactionCat);
      const themeStories = allStories.filter(s => s.theme === interactionCat);
      const ageFiltered = ageFilter ? themeStories.filter(s => { const ag = AGE_GROUPS_STORY.find(a => a.label === ageFilter); return ag ? s.ageMin <= ag.max && s.ageMax >= ag.min : true; }) : themeStories;
      const searchLower = search.toLowerCase();
      const filtered = searchLower ? ageFiltered.filter(s => s.titre.toLowerCase().includes(searchLower) || s.texte.toLowerCase().includes(searchLower)) : ageFiltered;

      return (<>{detailPortal}<div className="min-h-screen bg-[#0a0a0f] p-4"><div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => { setInteractionCat(null); setSearch(""); setAgeFilter(null); }} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
          <span className="text-2xl">{themeConfig?.emoji || "📖"}</span>
          <div><h1 className="text-xl font-bold text-white">{themeConfig?.label}</h1><p className="text-white/40 text-xs">{filtered.length} histoires</p></div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {AGE_GROUPS_STORY.map(ag => (
            <button key={ag.label} onClick={() => setAgeFilter(ageFilter === ag.label ? null : ag.label)} className={`text-xs px-3 py-1.5 rounded-full border transition-all ${ageFilter === ag.label ? "bg-purple-500/30 border-purple-400/50 text-purple-300" : "bg-white/5 border-white/10 text-white/50"}`}>{ag.label}</button>
          ))}
        </div>
        <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" className="bg-white/10 border-white/20 text-white pl-9" /></div>
        <div className="space-y-3">
          {filtered.map(h => {
            const isExpanded = expandedStory === h.id;
            return (
              <div key={h.id} className="bg-white/[0.04] rounded-[16px] border border-white/10 overflow-hidden">
                <button onClick={() => setExpandedStory(isExpanded ? null : h.id)} className="w-full p-4 text-left">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">{h.theme}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">{h.ageMin}-{h.ageMax} ans</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">{h.duree}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${h.source === "cloud" ? "bg-sky-500/20 text-sky-300" : "bg-white/10 text-white/40"}`}>{h.source === "cloud" ? "☁️ Cloud" : "📦 Local"}</span>
                    <ChevronRight className={`w-4 h-4 text-white/30 ml-auto transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </div>
                  <h3 className="text-white font-semibold text-sm">{h.titre}</h3>
                  {!isExpanded && <p className="text-white/40 text-xs mt-1 line-clamp-2">{h.texte.replace(/\{child_name\}/g, "[Enfant]")}</p>}
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                      <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{h.texte.replace(/\{child_name\}/g, "[Enfant]")}</p>
                    </div>
                    {h.moralité && <p className="text-white/50 text-xs italic">💡 {h.moralité}</p>}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="ghost" className="text-purple-400 text-xs" onClick={() => openHistoireDetail(h)}><Eye className="w-3 h-3 mr-1" /> Détail</Button>
                      {h.source === "cloud" && (
                        <>
                        <Button size="sm" variant="ghost" className="text-blue-400 text-xs" onClick={() => setEditingStory({ id: h.id, titre: h.titre, theme: h.theme, ageMin: h.ageMin, ageMax: h.ageMax, duree: h.duree, texte: h.texte, moralité: h.moralité, tags: h.tags })}>
                          <Pencil className="w-3 h-3 mr-1" /> Modifier
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-400 text-xs" onClick={async () => {
                          if (!confirm("Supprimer cette histoire ?")) return;
                          await supabase.from("story_templates").delete().eq("id", h.id);
                          toast.success("Supprimée"); fetchCloudStories();
                        }}><Trash2 className="w-3 h-3 mr-1" /> Supprimer</Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div></div></>);
    }

    return (
      <div className="min-h-screen bg-[#0a0a0f] p-4"><div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={goBack} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
            <span className="text-2xl">📖</span>
            <div><h1 className="text-xl font-bold text-white">Histoires</h1><p className="text-white/40 text-xs">{allStories.length} histoires</p></div>
          </div>
          <Button onClick={() => setEditingStory({ theme: "magie", duree: "courte", ageMin: 5, ageMax: 12, tags: [] })} className="bg-purple-600 hover:bg-purple-700"><Plus className="w-4 h-4 mr-1" /> Nouvelle</Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {allThemeConfigs.map(theme => {
            const count = allStories.filter(s => s.theme === theme.id).length;
            return (
              <button key={theme.id} onClick={() => { setInteractionCat(theme.id); setSearch(""); }}
                className={`aspect-square ${theme.color} hover:opacity-90 rounded-2xl p-4 border border-white/[0.06] text-left flex flex-col justify-between`}>
                <span className="text-3xl">{theme.emoji}</span>
                <div><p className="text-xl font-bold text-white">{count}</p><h3 className="text-xs font-semibold text-white/70">{theme.label}</h3></div>
              </button>
            );
          })}
        </div>
      </div></div>
    );
  }

  // ── Cerveau ──
  if (topSection === "cerveau") {
    const toItems = (obj: unknown): string[] => {
      if (Array.isArray(obj)) return obj.map(String);
      if (typeof obj === "object" && obj !== null) {
        return Object.entries(obj).map(([k, v]) =>
          Array.isArray(v) ? `${k}: ${v.join(", ")}` : `${k}: ${String(v)}`
        );
      }
      return [String(obj)];
    };
    const sections = [
      { title: "🎭 Personnalité", items: toItems(BOBBY_PERSONALITY) },
      { title: "🤖 Réactions naturelles", items: toItems(BOBBY_NATURAL_REACTIONS) },
      { title: "🔇 Relances silence", items: toItems(SILENCE_RELAUNCHES) },
      { title: "👋 Accueil", items: toItems(WELCOME_PHRASES) },
      { title: "🌙 Au revoir", items: toItems(FAREWELL_PHRASES) },
    ];
    return (
      <div className="min-h-screen bg-[#0a0a0f] p-4"><div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={goBack} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
          <span className="text-2xl">✨</span>
          <div><h1 className="text-xl font-bold text-white">Personnalité Bobby</h1></div>
        </div>
        {sections.map((section, idx) => (
          <div key={idx} className="bg-white/[0.04] rounded-[16px] p-4 border border-white/10">
            <h3 className="text-white/70 text-xs font-semibold mb-3 uppercase tracking-wider">{section.title}</h3>
            <div className="space-y-1.5">{section.items.map((item, i) => <p key={i} className="text-sm text-white/60">• {item}</p>)}</div>
          </div>
        ))}
      </div></div>
    );
  }

  // ── Cloud KB detail ──
  if (topSection === "cloud" && cloudSection && currentCloudSection) {
    const Icon = currentCloudSection.icon;
    return (
      <div className="min-h-screen bg-[#0a0a0f] p-4"><div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => { setCloudSection(null); setSearch(""); setAgeFilter(null); }} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
            <div className={`w-10 h-10 rounded-xl ${currentCloudSection.bgColor} flex items-center justify-center`}><Icon className={`w-5 h-5 ${currentCloudSection.color}`} /></div>
            <div><h1 className="text-xl font-bold text-white">{currentCloudSection.label}</h1><p className="text-white/40 text-xs">{cloudEntries.length} entrées</p></div>
          </div>
          <Button onClick={() => setEditingEntry({ keywords: [], category: currentCloudSection.dbCategories[0], priority: 5, is_active: true, age_min: 3, age_max: 12 })} className="bg-purple-600 hover:bg-purple-700"><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {AGE_GROUPS.map(g => (
            <button key={g.label} onClick={() => setAgeFilter(ageFilter === g.label ? null : g.label)} className={`text-xs px-3 py-1.5 rounded-full border transition-all ${ageFilter === g.label ? "bg-blue-500/30 border-blue-400/50 text-blue-300" : "bg-white/5 border-white/10 text-white/50"}`}>{g.label}</button>
          ))}
        </div>
        <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" className="bg-white/10 border-white/20 text-white pl-9" /></div>
        {loading ? <div className="text-center text-white/50 py-12">Chargement…</div> :
          cloudEntries.length === 0 ? <div className="text-center text-white/40 py-16"><p className="text-sm">Aucune entrée</p></div> :
          <div className="space-y-2">{cloudEntries.map(entry => (
            <div key={entry.id} onClick={() => openKBDetail(entry)} className="cursor-pointer">
              <EntryRow entry={entry} onToggle={() => handleToggleActive(entry)} onEdit={() => setEditingEntry(entry)} onDelete={() => handleDelete(entry.id)} />
            </div>
          ))}</div>
        }
      </div></div>
    );
  }

  // ── Cloud KB grid ──
  if (topSection === "cloud") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] p-4"><div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={goBack} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
            <span className="text-2xl">☁️</span>
            <div><h1 className="text-xl font-bold text-white">Cloud Knowledge Base</h1><p className="text-white/40 text-xs">{entries.length} entrées</p></div>
          </div>
          <Button onClick={() => setEditingEntry({ keywords: [], category: "général", priority: 5, is_active: true, age_min: 3, age_max: 12 })} className="bg-purple-600 hover:bg-purple-700"><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {BRAIN_SECTIONS.map(section => {
            const SIcon = section.icon;
            return (
              <button key={section.id} onClick={() => { setCloudSection(section.id); setSearch(""); }}
                className="aspect-square bg-white/[0.04] hover:bg-white/[0.08] rounded-[20px] p-4 border border-white/[0.06] text-left flex flex-col justify-between">
                <div className={`w-10 h-10 rounded-xl ${section.bgColor} flex items-center justify-center`}><SIcon className={`w-5 h-5 ${section.color}`} /></div>
                <div><p className="text-lg font-bold text-white">{categoryCounts[section.id]?.total ?? 0}</p><h3 className="text-xs font-semibold text-white/70">{section.label}</h3></div>
              </button>
            );
          })}
        </div>
      </div></div>
    );
  }

  // ── Cloud Users ──
  if (topSection === "cloudusers") {
    const filteredCloudUsers = cloudUsers.filter(u => { if (!cloudUserSearch) return true; const q = cloudUserSearch.toLowerCase(); return u.child_name.toLowerCase().includes(q) || u.sync_code.toLowerCase().includes(q); });
    const formatDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const timeSince = (iso: string) => { const diff = Date.now() - new Date(iso).getTime(); const mins = Math.floor(diff / 60000); if (mins < 60) return `${mins}m`; const hours = Math.floor(mins / 60); if (hours < 24) return `${hours}h`; return `${Math.floor(hours / 24)}j`; };

    if (selectedCloudUser) {
      const u = selectedCloudUser;
      const ps = u.parent_settings || {};
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white p-4 max-w-4xl mx-auto">
          <button onClick={() => setSelectedCloudUser(null)} className="flex items-center gap-2 text-white/60 hover:text-white mb-4"><ArrowLeft className="w-4 h-4" /> Retour</button>
          <div className="bg-gradient-to-br from-sky-500/20 to-blue-600/10 rounded-2xl p-6 border border-sky-500/20 mb-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-sky-500/20 flex items-center justify-center text-3xl">👤</div>
              <div><h2 className="text-2xl font-bold">{u.child_name}</h2><p className="text-white/50 text-sm font-mono">{u.sync_code}</p></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-xl p-3 text-center"><p className="text-lg font-bold">{formatDate(u.created_at)}</p><p className="text-[10px] text-white/40">Créé le</p></div>
              <div className="bg-white/5 rounded-xl p-3 text-center"><p className="text-lg font-bold">{timeSince(u.last_synced_at)}</p><p className="text-[10px] text-white/40">Dernière sync</p></div>
              <div className="bg-white/5 rounded-xl p-3 text-center"><p className="text-lg font-bold">{u.device_info ? "✅" : "❌"}</p><p className="text-[10px] text-white/40">Appareil</p></div>
            </div>
          </div>
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10 mb-4">
            <h3 className="text-lg font-bold mb-3">⚙️ Réglages</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Nom enfant", value: ps.childName || "—", emoji: "👦" },
                { label: "Âge", value: ps.childAge ? `${ps.childAge} ans` : "—", emoji: "🎂" },
                { label: "Voix", value: ps.voiceType || "—", emoji: "🎙️" },
                { label: "Ultra sécurisé", value: ps.ultraSafe ? "✅" : "❌", emoji: "🔒" },
              ].map(item => (
                <div key={item.label} className="bg-white/5 rounded-xl p-3 flex items-center gap-3">
                  <span className="text-lg">{item.emoji}</span>
                  <div><p className="text-[10px] text-white/40">{item.label}</p><p className="text-sm font-semibold">{item.value}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-red-500/5 rounded-2xl p-5 border border-red-500/20">
            <h3 className="text-lg font-bold text-red-400 mb-2">⚠️ Zone danger</h3>
            <Button variant="destructive" onClick={async () => {
              await supabase.from("cloud_profiles").delete().eq("id", u.id);
              setSelectedCloudUser(null); fetchCloudUsers(); toast.success("Profil supprimé");
            }} className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30">
              <Trash2 className="w-4 h-4 mr-2" /> Supprimer
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen p-4" style={{ background: "var(--admin-bg)" }}><div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={goBack} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
          <span className="text-2xl">☁️👥</span>
          <div><h1 className="text-xl font-bold text-white">Bobby Cloud Users</h1><p className="text-white/40 text-xs">{cloudUsers.length} profils</p></div>
        </div>
        <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" /><Input value={cloudUserSearch} onChange={e => setCloudUserSearch(e.target.value)} placeholder="Rechercher un utilisateur…" className="bg-white/10 border-white/20 text-white pl-9" /></div>
        {cloudUsersLoading ? <div className="text-center text-white/50 py-12">Chargement…</div> :
          filteredCloudUsers.length === 0 ? <div className="text-center py-12"><span className="text-4xl block mb-2">📭</span><p className="text-white/30 text-sm">Aucun utilisateur</p></div> :
          <div className="space-y-2">{filteredCloudUsers.map(user => (
            <button key={user.id} onClick={() => setSelectedCloudUser(user)}
              className="w-full bg-white/5 hover:bg-white/10 rounded-2xl p-4 border border-white/10 text-left flex items-center gap-4 group transition-all">
              <div className="w-12 h-12 rounded-xl bg-sky-500/15 flex items-center justify-center text-xl shrink-0">👤</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1"><p className="font-bold text-white">{user.child_name}</p><span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 font-mono">{user.sync_code}</span></div>
                <div className="flex items-center gap-3 text-[11px] text-white/40"><span>📅 {formatDate(user.created_at)}</span><span>🔄 {timeSince(user.last_synced_at)}</span></div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
            </button>
          ))}</div>
        }
      </div></div>
    );
  }

  // ── Delegate sections ──
  if (topSection === "expressions") return <ExpressionPreview onBack={() => setTopSection(null)} />;
  if (topSection === "autolearn") return <AutoLearnPanel onBack={() => setTopSection(null)} />;
  if (topSection === "kbdebug") return <div className="min-h-screen p-4" style={{ background: "var(--admin-bg)" }}><KBDebugPanel onBack={() => setTopSection(null)} /></div>;
  if (topSection === "store") {
    return (
      <AdminStoreManager
        storeItems={storeItems.map((s: any) => ({
          ...s, detailed_description: s.detailed_description || "", is_premium: s.is_premium ?? false,
          version_label: s.version_label || "1.0", rating: s.rating ?? 4.5, rating_count: s.rating_count ?? 0,
          content_count: s.content_count ?? 0, changelog: s.changelog || "", creator_name: s.creator_name || "Équipe Bobby",
          creator_role: s.creator_role || "Éducation & Divertissement", learning_objectives: s.learning_objectives ?? [],
          skills_developed: s.skills_developed ?? [], duration_estimate: s.duration_estimate || "10-15 min",
          difficulty_level: s.difficulty_level || "adaptatif", languages: s.languages ?? ["fr"],
          cover_image_url: s.cover_image_url || "", screenshots: s.screenshots ?? [],
          last_updated_at: s.last_updated_at || s.updated_at || s.created_at,
          content_items: Array.isArray(s.content_items) ? s.content_items : [],
        }))}
        installCounts={liveInstallCounts}
        onRefresh={fetchStoreItems}
        onBack={goBack}
      />
    );
  }

  // ── Appareils Bobby ──
  if (topSection === "devices") {
    const { devices, devicesLoading, fetchDevices, createDevice } = admin;
    return (
      <>{detailPortal}
      <div className={`min-h-screen transition-colors duration-300 ${adminDark ? '' : 'admin-light'}`} style={{ background: "var(--admin-bg)" }}>
        <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={goBack} className="p-2" style={{ color: "var(--admin-text-muted)" }}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span className="text-2xl">📱</span>
            <div className="flex-1">
              <h1 className="text-xl font-bold" style={{ color: "var(--admin-text)" }}>Appareils Bobby</h1>
              <p className="text-xs" style={{ color: "var(--admin-text-dim)" }}>{devices.length} appareils • {devices.filter(d => d.bobby_claimed_at).length} activés</p>
            </div>
            <button onClick={() => createDevice()} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--admin-accent)", border: "none" }}>
              <Plus className="w-4 h-4 text-white" />
            </button>
            <button onClick={fetchDevices} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
              <RefreshCw className="w-4 h-4" style={{ color: "var(--admin-text-muted)" }} />
            </button>
          </div>

          {devicesLoading ? (
            <div className="text-center py-12 animate-pulse" style={{ color: "var(--admin-text-muted)" }}>Chargement…</div>
          ) : devices.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl block mb-2">📭</span>
              <p className="text-sm" style={{ color: "var(--admin-text-dim)" }}>Aucun appareil enregistré</p>
            </div>
          ) : (
            <div className="space-y-2">
              {devices.map((dev, idx) => (
                <div key={idx} className="rounded-2xl p-4 space-y-2" style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{dev.bobby_claimed_at ? "🟢" : "⚪"}</span>
                      <div>
                        <p className="font-bold text-sm" style={{ color: "var(--admin-text)" }}>{dev.child_name || "Non configuré"}</p>
                        <p className="text-[10px] font-mono" style={{ color: "var(--admin-text-dim)" }}>Code: {dev.bobby_code}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {dev.child_age && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">{dev.child_age} ans</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]" style={{ color: "var(--admin-text-muted)" }}>
                    <div>
                      <span className="opacity-60">Activé: </span>
                      {dev.bobby_claimed_at ? new Date(dev.bobby_claimed_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </div>
                    <div>
                      <span className="opacity-60">Code parent: </span>
                      <span className="font-mono">{dev.parent_code}</span>
                    </div>
                    <div>
                      <span className="opacity-60">Parent lié: </span>
                      {dev.parent_claimed_at ? "✅ " + new Date(dev.parent_claimed_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "❌ Non"}
                    </div>
                    <div>
                      <span className="opacity-60">Statut: </span>
                      {dev.is_active ? <span className="text-green-400">Actif</span> : <span className="text-red-400">Inactif</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div></>
    );
  }

  // ── Main Dashboard ──
  return (
    <>
      {detailPortal}
      <AdminDashboard admin={admin} />
    </>
  );
};

export default Admin;
