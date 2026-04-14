import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DetailItem } from "@/components/AdminDetailDialog";
import type { BobbyInteraction } from "@/lib/bobby_interactions_10k";
import { BLAGUES } from "@/lib/bobby-content/blagues";
import { HISTOIRES, type Histoire } from "@/lib/bobby-content/histoires";
import { CHANSONS } from "@/lib/bobby-content/chansons";
import { QA_DATABASE } from "@/lib/qa-database";
import { BOBBY_MULTI_RESPONSES } from "@/lib/responseSelector";
import {
  QUIZ_ANIMAUX, QUIZ_EDUCATIF, VRAI_FAUX, DEVINETTES,
  BLAGUES as GAME_BLAGUES,
} from "@/lib/gameEngine";
import {
  type KBEntry, type StoreContentItem, type CloudUser, type BobbyDevice, type RealConversation,
  type LiveStats, type DayData, type EmotionData, type TopSection,
  BRAIN_SECTIONS, ALL_DB_CATEGORIES, AGE_GROUPS, EMOTION_COLORS,
} from "./adminConfig";

export function useAdminState() {
  const navigate = useNavigate();

  // Theme
  const [adminDark, setAdminDark] = useState(() => {
    try { return localStorage.getItem("bobby-admin-theme") !== "light"; } catch { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem("bobby-admin-theme", adminDark ? "dark" : "light"); } catch {}
  }, [adminDark]);

  // Cloud KB
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [kbActiveCount, setKbActiveCount] = useState(0);
  const [kbTotalCount, setKbTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingEntry, setEditingEntry] = useState<Partial<KBEntry> | null>(null);
  const [saving, setSaving] = useState(false);
  const [autoLearnCount, setAutoLearnCount] = useState<number | null>(null);

  // Navigation
  const [topSection, setTopSection] = useState<TopSection | null>(null);
  const [interactionCat, setInteractionCat] = useState<string | null>(null);
  const [interactionAge, setInteractionAge] = useState<{ min: number; max: number }>({ min: 3, max: 12 });
  const [cloudSection, setCloudSection] = useState<string | null>(null);
  const [ageFilter, setAgeFilter] = useState<string | null>(null);
  const [expandedStory, setExpandedStory] = useState<string | null>(null);
  const [cloudStories, setCloudStories] = useState<any[]>([]);
  const [editingStory, setEditingStory] = useState<Partial<Histoire & { id: string }> | null>(null);
  const [savingStory, setSavingStory] = useState(false);

  // Store
  const [storeItems, setStoreItems] = useState<StoreContentItem[]>([]);
  const [liveInstallCounts, setLiveInstallCounts] = useState<Record<string, number>>({});
  const [detailItem, setDetailItem] = useState<DetailItem | null>(null);

  // Bobby Cloud Users
  const [cloudUsers, setCloudUsers] = useState<CloudUser[]>([]);
  const [cloudUsersLoading, setCloudUsersLoading] = useState(false);
  const [cloudUserSearch, setCloudUserSearch] = useState("");
  const [selectedCloudUser, setSelectedCloudUser] = useState<CloudUser | null>(null);

  // Real-time stats
  const [liveStats, setLiveStats] = useState<LiveStats>({ activeSessions: 0, todaySessions: 0, todayMessages: 0, totalSessions: 0, totalMessages: 0, lastActivity: null, avgDuration: 0, topEmotion: "—" });

  // Charts
  const [chartSessions, setChartSessions] = useState<DayData[]>([]);
  const [chartEmotions, setChartEmotions] = useState<EmotionData[]>([]);

  // 10K interactions
  const [interactions, setInteractions] = useState<BobbyInteraction[] | null>(null);
  const [loadingInteractions, setLoadingInteractions] = useState(false);

  // Real conversations
  const [realConversations, setRealConversations] = useState<RealConversation[]>([]);
  const [realConvLoading, setRealConvLoading] = useState(false);
  const [learningSessionId, setLearningSessionId] = useState<string | null>(null);

  // Devices
  const [devices, setDevices] = useState<BobbyDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);

  // ─── Fetchers ───────────────────────────────────────────────────
  const fetchDevices = useCallback(async () => {
    setDevicesLoading(true);
    const { data: codes } = await supabase.from("bobby_codes").select("id, code, child_name, child_age, claimed_at").order("code");
    const { data: parentCodes } = await supabase.from("bobby_parent_codes").select("bobby_code_id, code, claimed_at, device_token, is_active");
    const devs: BobbyDevice[] = (codes || []).map((bc: any) => {
      const pc = (parentCodes || []).find((p: any) => p.bobby_code_id === bc.id);
      return {
        bobby_code: bc.code, bobby_id: bc.id, child_name: bc.child_name, child_age: bc.child_age,
        bobby_claimed_at: bc.claimed_at, parent_code: pc?.code || "—",
        parent_claimed_at: pc?.claimed_at || null, parent_device_token: pc?.device_token || null,
        is_active: pc?.is_active ?? false,
      };
    });
    setDevices(devs);
    setDevicesLoading(false);
  }, []);

  const fetchLiveStats = useCallback(async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const activeThreshold = new Date(now.getTime() - 10 * 60 * 1000).toISOString();

    const [activeRes, todayRes, msgsRes, lastRes, totalSessionsRes, totalMsgsRes] = await Promise.all([
      supabase.from("child_sessions").select("id", { count: "exact", head: true }).is("ended_at", null).gte("started_at", activeThreshold),
      supabase.from("child_sessions").select("id, duration_seconds, detected_emotions", { count: "exact" }).gte("started_at", todayStart),
      supabase.from("session_messages").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
      supabase.from("session_messages").select("created_at").order("created_at", { ascending: false }).limit(1),
      supabase.from("child_sessions").select("id", { count: "exact", head: true }),
      supabase.from("session_messages").select("id", { count: "exact", head: true }),
    ]);

    const todaySessions = todayRes.data || [];
    const durations = todaySessions.map((s: any) => s.duration_seconds).filter(Boolean) as number[];
    const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    const allEmotions = todaySessions.flatMap((s: any) => s.detected_emotions || []);
    const emotionCounts: Record<string, number> = {};
    allEmotions.forEach((e: string) => { emotionCounts[e] = (emotionCounts[e] || 0) + 1; });
    const topEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

    setLiveStats({
      activeSessions: activeRes.count || 0,
      todaySessions: todayRes.count || 0,
      todayMessages: msgsRes.count || 0,
      totalSessions: totalSessionsRes.count || 0,
      totalMessages: totalMsgsRes.count || 0,
      lastActivity: lastRes.data?.[0]?.created_at || null,
      avgDuration, topEmotion,
    });
  }, []);

  const fetchChartData = useCallback(async () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [sessionsRes, msgsRes] = await Promise.all([
      supabase.from("child_sessions").select("started_at, detected_emotions").gte("started_at", weekAgo),
      supabase.from("session_messages").select("created_at").gte("created_at", weekAgo),
    ]);

    const dayMap: Record<string, { sessions: number; messages: number }> = {};
    const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dayMap[d.toISOString().slice(0, 10)] = { sessions: 0, messages: 0 };
    }
    (sessionsRes.data || []).forEach((s: any) => { const k = s.started_at?.slice(0, 10); if (k && dayMap[k]) dayMap[k].sessions++; });
    (msgsRes.data || []).forEach((m: any) => { const k = m.created_at?.slice(0, 10); if (k && dayMap[k]) dayMap[k].messages++; });

    setChartSessions(Object.entries(dayMap).map(([date, v]) => {
      const d = new Date(date);
      return { day: dayNames[d.getDay()], sessions: v.sessions, messages: v.messages };
    }));

    const emotionCounts: Record<string, number> = {};
    (sessionsRes.data || []).forEach((s: any) => {
      (s.detected_emotions || []).forEach((e: string) => { emotionCounts[e] = (emotionCounts[e] || 0) + 1; });
    });
    const sorted = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    setChartEmotions(sorted.map(([name, value]) => ({
      name, value, color: EMOTION_COLORS[name] || "#94a3b8",
    })));
  }, []);

  const fetchCloudUsers = useCallback(async () => {
    setCloudUsersLoading(true);
    const { data } = await supabase.from("cloud_profiles").select("*").order("created_at", { ascending: false });
    setCloudUsers((data as unknown as CloudUser[]) || []);
    setCloudUsersLoading(false);
  }, []);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const [kbRes, autoLearnRes, activeCountRes, totalCountRes] = await Promise.all([
      supabase.from("knowledge_base").select("*").order("priority", { ascending: false }).limit(1000),
      supabase.from("knowledge_base").select("id", { count: "exact", head: true }).not("category", "eq", "général"),
      supabase.from("knowledge_base").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("knowledge_base").select("id", { count: "exact", head: true }),
    ]);
    if (kbRes.error) toast.error("Erreur: " + kbRes.error.message);
    else setEntries((kbRes.data as unknown as KBEntry[]) || []);
    setAutoLearnCount(autoLearnRes.count ?? 0);
    setKbActiveCount(activeCountRes.count ?? 0);
    setKbTotalCount(totalCountRes.count ?? 0);
    setLoading(false);
  }, []);

  const fetchCloudStories = useCallback(async () => {
    const { data } = await supabase.from("story_templates").select("*").order("created_at", { ascending: false });
    setCloudStories(data || []);
  }, []);

  const fetchStoreItems = useCallback(async () => {
    const [catalogRes, installsRes] = await Promise.all([
      supabase.from("store_content").select("*").order("created_at", { ascending: false }),
      supabase.from("installed_content").select("content_id"),
    ]);
    setStoreItems((catalogRes.data as unknown as StoreContentItem[]) || []);
    const counts: Record<string, number> = {};
    (installsRes.data || []).forEach((r: any) => { counts[r.content_id] = (counts[r.content_id] || 0) + 1; });
    setLiveInstallCounts(counts);
  }, []);

  const loadInteractions = useCallback(async () => {
    if (interactions) return;
    setLoadingInteractions(true);
    const { BOBBY_INTERACTIONS } = await import("@/lib/bobby_interactions_10k");
    setInteractions(BOBBY_INTERACTIONS);
    setLoadingInteractions(false);
  }, [interactions]);

  const fetchRealConversations = useCallback(async () => {
    setRealConvLoading(true);
    const { data: sessions } = await supabase
      .from("child_sessions")
      .select("id, child_name, child_age, started_at, topics, detected_emotions")
      .order("started_at", { ascending: false }).limit(50);
    if (!sessions?.length) { setRealConvLoading(false); return; }

    const { data: messages } = await supabase
      .from("session_messages")
      .select("session_id, role, content, detected_emotion, created_at")
      .in("session_id", sessions.map(s => s.id))
      .order("created_at", { ascending: true });

    const convs: RealConversation[] = sessions.map(s => ({
      session_id: s.id, child_name: s.child_name, child_age: s.child_age,
      started_at: s.started_at, topics: s.topics, detected_emotions: s.detected_emotions,
      messages: (messages || []).filter(m => m.session_id === s.id),
    })).filter(c => c.messages.length > 0);

    setRealConversations(convs);
    setRealConvLoading(false);
  }, []);

  const learnFromSession = useCallback(async (conv: RealConversation) => {
    setLearningSessionId(conv.session_id);
    try {
      const { data, error } = await supabase.functions.invoke("learn-from-conversations", {
        body: { mode: "session", sessionId: conv.session_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const qa = data?.total_qa_learned ?? 0;
      const gaps = data?.total_gaps_filled ?? 0;
      toast.success(`🧠 +${qa} Q&A, +${gaps} lacunes comblées depuis cette conversation !`);
      supabase.from("knowledge_base").select("*").order("priority", { ascending: false })
        .then(r => { if (r.data) setEntries(r.data as unknown as KBEntry[]); });
    } catch (e: any) {
      toast.error("Erreur : " + (e.message || "inconnue"));
    } finally {
      setLearningSessionId(null);
    }
  }, []);

  // ─── Init ───────────────────────────────────────────────────────
  const createDevice = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("create_bobby_device" as any);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      toast.success(`Appareil créé ! Bobby: ${row.bobby_code} | Parent: ${row.parent_code}`);
      await fetchDevices();
      return row;
    } catch (e: any) {
      toast.error("Erreur création appareil: " + e.message);
      return null;
    }
  }, [fetchDevices]);

  const refreshAll = useCallback(() => {
    fetchEntries(); fetchCloudStories(); fetchStoreItems(); fetchCloudUsers();
    loadInteractions(); fetchRealConversations(); fetchLiveStats(); fetchChartData(); fetchDevices();
  }, [fetchEntries, fetchCloudStories, fetchStoreItems, fetchCloudUsers, fetchLiveStats, fetchChartData, loadInteractions, fetchRealConversations, fetchDevices]);

  // Auto-refresh live stats every 30s
  useEffect(() => {
    const interval = setInterval(fetchLiveStats, 30_000);
    return () => clearInterval(interval);
  }, [fetchLiveStats]);

  // ─── Detail dialog helpers ─────────────────────────────────────
  const openInteractionDetail = useCallback((interaction: BobbyInteraction) => {
    setDetailItem({
      type: "interaction", title: interaction.child_input.slice(0, 60), emoji: "🧠",
      fields: [
        { key: "child_input", label: "Question de l'enfant", value: interaction.child_input, type: "textarea" },
        { key: "ai_response", label: "Réponse de Bobby", value: interaction.ai_response, type: "textarea" },
        { key: "category", label: "Catégorie", value: interaction.category, type: "select", options: ALL_DB_CATEGORIES },
        { key: "emotion", label: "Émotion", value: interaction.emotion, type: "text" },
        { key: "age", label: "Âge cible", value: interaction.age, type: "number" },
        { key: "difficulty_level", label: "Niveau difficulté", value: interaction.difficulty_level, type: "number" },
        { key: "keywords", label: "Mots-clés", value: [interaction.category, interaction.emotion], type: "tags" },
      ],
      meta: [
        { label: "Âge", value: `${interaction.age} ans`, color: "bg-purple-500/20 text-purple-300" },
        { label: "Émotion", value: interaction.emotion, color: "bg-pink-500/20 text-pink-300" },
        { label: "Cat.", value: interaction.category, color: "bg-cyan-500/20 text-cyan-300" },
      ],
    });
  }, []);

  const openStoreDetail = useCallback((item: StoreContentItem) => {
    setDetailItem({
      type: "store", title: item.name, emoji: item.emoji, id: item.id,
      fields: [
        { key: "name", label: "Nom", value: item.name, type: "text" },
        { key: "slug", label: "Slug", value: item.slug, type: "text" },
        { key: "emoji", label: "Emoji", value: item.emoji, type: "text" },
        { key: "description", label: "Description", value: item.description, type: "textarea" },
        { key: "category", label: "Catégorie", value: item.category, type: "select", options: ["jeux", "educatif", "histoires", "blagues"] },
        { key: "age_min", label: "Âge min", value: item.age_min, type: "number" },
        { key: "age_max", label: "Âge max", value: item.age_max, type: "number" },
        { key: "tags", label: "Tags", value: item.tags, type: "tags" },
        { key: "size_label", label: "Taille", value: item.size_label, type: "text" },
        { key: "is_new", label: "Nouveau", value: item.is_new, type: "boolean" },
        { key: "is_popular", label: "Populaire", value: item.is_popular, type: "boolean" },
        { key: "is_featured", label: "Featured", value: item.is_featured, type: "boolean" },
        { key: "is_active", label: "Actif", value: item.is_active, type: "boolean" },
      ],
      meta: [
        { label: "Catégorie", value: item.category, color: "bg-emerald-500/20 text-emerald-300" },
        { label: "Âge", value: `${item.age_min}-${item.age_max}`, color: "bg-blue-500/20 text-blue-300" },
        { label: "Installs", value: `${liveInstallCounts[item.id] || 0}`, color: "bg-amber-500/20 text-amber-300" },
      ],
    });
  }, [liveInstallCounts]);

  const openKBDetail = useCallback((entry: KBEntry) => {
    setDetailItem({
      type: "kb", title: entry.question.slice(0, 60), emoji: "☁️", id: entry.id,
      fields: [
        { key: "question", label: "Question / Déclencheur", value: entry.question, type: "textarea" },
        { key: "answer", label: "Réponse de Bobby", value: entry.answer, type: "textarea" },
        { key: "keywords", label: "Mots-clés", value: entry.keywords, type: "tags" },
        { key: "category", label: "Catégorie", value: entry.category, type: "select", options: ALL_DB_CATEGORIES },
        { key: "emotion", label: "Émotion", value: entry.emotion, type: "text" },
        { key: "priority", label: "Priorité (1-10)", value: entry.priority, type: "number" },
        { key: "age_min", label: "Âge min", value: entry.age_min, type: "number" },
        { key: "age_max", label: "Âge max", value: entry.age_max, type: "number" },
        { key: "is_active", label: "Actif", value: entry.is_active, type: "boolean" },
      ],
      meta: [
        { label: "Priorité", value: `P${entry.priority}`, color: "bg-amber-500/20 text-amber-300" },
        { label: "Utilisé", value: `${entry.usage_count}×`, color: "bg-green-500/20 text-green-300" },
      ],
    });
  }, []);

  const openQADetail = useCallback((entry: typeof QA_DATABASE[0]) => {
    setDetailItem({
      type: "qa", title: entry.triggers[0]?.slice(0, 60) || "QA", emoji: "❓",
      fields: [
        { key: "triggers", label: "Déclencheurs", value: entry.triggers, type: "tags" },
        { key: "responses", label: "Réponses (une par ligne)", value: entry.responses.join("\n"), type: "textarea" },
        { key: "intent", label: "Intent", value: entry.intent || "OTHER", type: "text" },
        { key: "keywords", label: "Mots-clés", value: entry.triggers.flatMap(t => t.split(" ")).filter(w => w.length > 3), type: "tags" },
      ],
      meta: [
        { label: "Intent", value: entry.intent || "OTHER", color: "bg-amber-500/20 text-amber-300" },
        { label: "Réponses", value: `${entry.responses.length}`, color: "bg-green-500/20 text-green-300" },
      ],
    });
  }, []);

  const openBlagueDetail = useCallback((blague: typeof BLAGUES[0], _index: number) => {
    setDetailItem({
      type: "blague", title: blague.question.slice(0, 60), emoji: "😂",
      fields: [
        { key: "question", label: "Question", value: blague.question, type: "textarea" },
        { key: "reponse", label: "Réponse", value: blague.reponse, type: "textarea" },
        { key: "categorie", label: "Catégorie", value: blague.categorie, type: "select", options: ["animaux", "ecole", "nourriture", "absurde", "famille", "science"] },
        { key: "ageMin", label: "Âge min", value: blague.ageMin, type: "number" },
        { key: "ageMax", label: "Âge max", value: blague.ageMax, type: "number" },
        { key: "difficulte", label: "Difficulté (1-3)", value: blague.difficulte, type: "number" },
      ],
      meta: [
        { label: "Catégorie", value: blague.categorie, color: "bg-green-500/20 text-green-300" },
        { label: "Âge", value: `${blague.ageMin}-${blague.ageMax}`, color: "bg-blue-500/20 text-blue-300" },
        { label: "Niv.", value: `${blague.difficulte}`, color: "bg-purple-500/20 text-purple-300" },
      ],
    });
  }, []);

  const openHistoireDetail = useCallback((histoire: any) => {
    const isCloud = histoire.source === "cloud";
    setDetailItem({
      type: "histoire", title: histoire.titre?.slice(0, 60) || "Histoire", emoji: "📖",
      id: isCloud ? histoire.id : undefined,
      fields: [
        { key: "titre", label: "Titre", value: histoire.titre, type: "text" },
        { key: "theme", label: "Thème", value: histoire.theme, type: "select", options: ["espace", "pirate", "magie", "animaux", "dodo", "nature", "amitié", "courage"] },
        { key: "texte", label: "Texte complet", value: histoire.texte, type: "textarea" },
        { key: "moralite", label: "Moralité", value: histoire.moralité || "", type: "text" },
        { key: "ageMin", label: "Âge min", value: histoire.ageMin, type: "number" },
        { key: "ageMax", label: "Âge max", value: histoire.ageMax, type: "number" },
        { key: "duree", label: "Durée", value: histoire.duree, type: "select", options: ["courte", "moyenne", "longue"] },
        { key: "tags", label: "Tags", value: histoire.tags || [], type: "tags" },
        { key: "source", label: "Source", value: histoire.source, type: "readonly" },
      ],
      meta: [
        { label: "Thème", value: histoire.theme, color: "bg-purple-500/20 text-purple-300" },
        { label: "Durée", value: histoire.duree, color: "bg-amber-500/20 text-amber-300" },
        { label: "Source", value: isCloud ? "☁️ Cloud" : "📦 Local", color: isCloud ? "bg-sky-500/20 text-sky-300" : "bg-white/10 text-white/50" },
      ],
    });
  }, []);

  const openQuizDetail = useCallback((q: any, type: string) => {
    if (type === "quiz") {
      setDetailItem({
        type: "generic", title: q.question.slice(0, 60), emoji: "🧠",
        fields: [
          { key: "question", label: "Question", value: q.question, type: "textarea" },
          { key: "choices", label: "Choix (virgules)", value: q.choices, type: "tags" },
          { key: "correctIndex", label: "Index correct (0-based)", value: q.correctIndex, type: "number" },
          { key: "explanation", label: "Explication", value: q.explanation, type: "textarea" },
          { key: "category", label: "Catégorie", value: q.category, type: "text" },
        ],
        meta: [
          { label: "Catégorie", value: q.category, color: "bg-cyan-500/20 text-cyan-300" },
          { label: "Bonne rép.", value: q.choices[q.correctIndex], color: "bg-green-500/20 text-green-300" },
        ],
      });
    } else if (type === "vf") {
      setDetailItem({
        type: "generic", title: q.statement.slice(0, 60), emoji: "✅",
        fields: [
          { key: "statement", label: "Affirmation", value: q.statement, type: "textarea" },
          { key: "answer", label: "Vrai ?", value: q.answer, type: "boolean" },
          { key: "explanation", label: "Explication", value: q.explanation, type: "textarea" },
          { key: "category", label: "Catégorie", value: q.category, type: "text" },
        ],
        meta: [
          { label: "Réponse", value: q.answer ? "VRAI" : "FAUX", color: q.answer ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300" },
        ],
      });
    } else if (type === "riddle") {
      setDetailItem({
        type: "generic", title: q.question.slice(0, 60), emoji: "🤔",
        fields: [
          { key: "question", label: "Devinette", value: q.question, type: "textarea" },
          { key: "choices", label: "Choix", value: q.choices, type: "tags" },
          { key: "correctIndex", label: "Index correct", value: q.correctIndex, type: "number" },
          { key: "hint", label: "Indice", value: q.hint, type: "text" },
        ],
        meta: [{ label: "Bonne rép.", value: q.choices[q.correctIndex], color: "bg-green-500/20 text-green-300" }],
      });
    } else {
      setDetailItem({
        type: "generic", title: (q as string).slice(0, 60), emoji: "😂",
        fields: [{ key: "text", label: "Blague", value: q, type: "textarea" }],
        meta: [],
      });
    }
  }, []);

  // ─── CRUD handlers ─────────────────────────────────────────────
  const handleDetailSave = useCallback(async (type: string, id: string | undefined, values: Record<string, any>) => {
    if (type === "interaction") {
      const { error } = await supabase.from("knowledge_base").insert({
        question: values.child_input, answer: values.ai_response,
        category: values.category || "général", keywords: values.keywords || [],
        priority: values.difficulty_level || 5, age_min: values.age || 3,
        age_max: Math.min((values.age || 7) + 3, 12), emotion: values.emotion || "happy", is_active: true,
      });
      if (error) toast.error(error.message);
      else { toast.success("Sauvegardé dans la base Bobby !"); fetchEntries(); }
    } else if (type === "store" && id) {
      const { error } = await supabase.from("store_content").update({
        name: values.name, slug: values.slug, emoji: values.emoji,
        description: values.description, category: values.category,
        age_min: values.age_min, age_max: values.age_max,
        tags: values.tags, size_label: values.size_label,
        is_new: values.is_new, is_popular: values.is_popular,
        is_featured: values.is_featured, is_active: values.is_active,
      }).eq("id", id);
      if (error) toast.error(error.message);
      else { toast.success("Store mis à jour !"); fetchStoreItems(); }
    } else if (type === "kb" && id) {
      const { error } = await supabase.from("knowledge_base").update({
        question: values.question, answer: values.answer,
        keywords: values.keywords, category: values.category,
        emotion: values.emotion, priority: values.priority,
        age_min: values.age_min, age_max: values.age_max, is_active: values.is_active,
      } as any).eq("id", id);
      if (error) toast.error(error.message);
      else { toast.success("Mis à jour !"); fetchEntries(); }
    } else if (type === "qa" || type === "blague" || type === "generic") {
      const question = values.question || values.triggers?.join(", ") || values.statement || values.text || "";
      const answer = values.reponse || values.responses || values.explanation || values.answer || "";
      const { error } = await supabase.from("knowledge_base").insert({
        question: typeof question === "string" ? question : String(question),
        answer: typeof answer === "string" ? answer : String(answer),
        category: values.categorie || values.category || values.intent || "général",
        keywords: values.keywords || values.triggers || [],
        priority: 5, age_min: values.ageMin || 3, age_max: values.ageMax || 12,
        emotion: "happy", is_active: true,
      });
      if (error) toast.error(error.message);
      else { toast.success("Sauvegardé dans la base Bobby !"); fetchEntries(); }
    } else if (type === "histoire" && id) {
      const { error } = await supabase.from("story_templates").update({
        title: values.titre, theme: values.theme, full_text: values.texte,
        template_text: (values.texte || "").slice(0, 100),
        summary: values.moralite || null, age_min: values.ageMin || 5,
        age_max: values.ageMax || 12, duration: values.duree || "courte", category: values.theme,
      } as any).eq("id", id);
      if (error) toast.error(error.message);
      else { toast.success("Histoire mise à jour !"); fetchCloudStories(); }
    } else if (type === "histoire") {
      const { error } = await supabase.from("story_templates").insert({
        title: values.titre, theme: values.theme, full_text: values.texte,
        template_text: (values.texte || "").slice(0, 100),
        summary: values.moralite || null, age_min: values.ageMin || 5,
        age_max: values.ageMax || 12, duration: values.duree || "courte",
        category: values.theme, language: "fr",
      } as any);
      if (error) toast.error(error.message);
      else { toast.success("Histoire ajoutée au cloud !"); fetchCloudStories(); }
    }
    setDetailItem(null);
  }, [fetchEntries, fetchStoreItems, fetchCloudStories]);

  const handleDetailDelete = useCallback(async (type: string, id: string) => {
    if (!confirm("Supprimer ?")) return;
    if (type === "store") {
      await supabase.from("store_content").delete().eq("id", id);
      toast.success("Supprimé"); fetchStoreItems();
    } else if (type === "kb") {
      await supabase.from("knowledge_base").delete().eq("id", id);
      toast.success("Supprimé"); fetchEntries();
    }
    setDetailItem(null);
  }, [fetchEntries, fetchStoreItems]);

  const handleSave = useCallback(async () => {
    if (!editingEntry?.question?.trim() || !editingEntry?.answer?.trim()) {
      toast.error("Question et réponse requis"); return;
    }
    setSaving(true);
    const payload = {
      question: editingEntry.question!.trim(), keywords: editingEntry.keywords || [],
      answer: editingEntry.answer!.trim(), category: editingEntry.category || "général",
      priority: editingEntry.priority || 5, is_active: editingEntry.is_active !== false,
      age_min: editingEntry.age_min || 3, age_max: editingEntry.age_max || 12,
    };
    if (editingEntry.id) {
      const { error } = await supabase.from("knowledge_base").update(payload as any).eq("id", editingEntry.id);
      if (error) toast.error(error.message); else toast.success("Mis à jour !");
    } else {
      const { error } = await supabase.from("knowledge_base").insert(payload as any);
      if (error) toast.error(error.message); else toast.success("Ajouté !");
    }
    setEditingEntry(null); setSaving(false); fetchEntries();
  }, [editingEntry, fetchEntries]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Supprimer ?")) return;
    const { error } = await supabase.from("knowledge_base").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Supprimé"); fetchEntries(); }
  }, [fetchEntries]);

  const handleToggleActive = useCallback(async (entry: KBEntry) => {
    await supabase.from("knowledge_base").update({ is_active: !entry.is_active } as any).eq("id", entry.id);
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, is_active: !e.is_active } : e));
  }, []);

  const goBack = useCallback(() => {
    if (editingEntry) { setEditingEntry(null); return; }
    if (interactionCat) { setInteractionCat(null); setSearch(""); return; }
    if (cloudSection) { setCloudSection(null); setSearch(""); return; }
    if (topSection) { setTopSection(null); setSearch(""); return; }
    navigate("/");
  }, [editingEntry, interactionCat, cloudSection, topSection, navigate]);

  // ─── Derived ───────────────────────────────────────────────────
  const categoryCounts = useMemo(() => {
    const counts: Record<string, { total: number; active: number }> = {};
    for (const s of BRAIN_SECTIONS) {
      const m = entries.filter(e => s.dbCategories.includes(e.category));
      counts[s.id] = { total: m.length, active: m.filter(e => e.is_active).length };
    }
    return counts;
  }, [entries]);

  const qaByIntent = useMemo(() => {
    const groups: Record<string, typeof QA_DATABASE> = {};
    for (const entry of QA_DATABASE) {
      const intent = entry.intent || "OTHER";
      if (!groups[intent]) groups[intent] = [];
      groups[intent].push(entry);
    }
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, []);

  const blaguesByCategorie = useMemo(() => {
    const groups: Record<string, typeof BLAGUES> = {};
    for (const b of BLAGUES) {
      if (!groups[b.categorie]) groups[b.categorie] = [];
      groups[b.categorie].push(b);
    }
    return Object.entries(groups);
  }, []);

  const currentCloudSection = BRAIN_SECTIONS.find(s => s.id === cloudSection);

  const cloudEntries = useMemo(() => {
    if (!currentCloudSection) return [];
    let list = entries.filter(e => currentCloudSection.dbCategories.includes(e.category));
    if (ageFilter) {
      const ag = AGE_GROUPS.find(a => a.label === ageFilter);
      if (ag) list = list.filter(e => e.age_min <= ag.max && e.age_max >= ag.min);
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(e => e.question.toLowerCase().includes(s) || e.answer.toLowerCase().includes(s));
    }
    return list;
  }, [entries, currentCloudSection, search, ageFilter]);

  const filteredInteractions = useMemo(() => {
    if (!interactions || !interactionCat) return [];
    return interactions
      .filter(i => i.category === interactionCat && i.age >= interactionAge.min && i.age <= interactionAge.max)
      .slice(0, 100);
  }, [interactions, interactionCat, interactionAge]);

  const interactionCategoryCounts = useMemo(() => {
    if (!interactions) return {};
    const counts: Record<string, number> = {};
    for (const i of interactions) counts[i.category] = (counts[i.category] || 0) + 1;
    return counts;
  }, [interactions]);

  const multiResponseCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const entry of BOBBY_MULTI_RESPONSES) counts[entry.category] = (counts[entry.category] || 0) + 1;
    return counts;
  }, []);

  const sectionCounts = useMemo(() => {
    const totalGameItems = QUIZ_ANIMAUX.length + QUIZ_EDUCATIF.length + VRAI_FAUX.length + DEVINETTES.length + GAME_BLAGUES.length;
    return {
      interactions: interactions?.length ?? "…",
      multiresponses: BOBBY_MULTI_RESPONSES.length,
      jeux: totalGameItems,
      qa: QA_DATABASE.length,
      blagues: BLAGUES.length,
      histoires: HISTOIRES.length + cloudStories.length,
      chansons: CHANSONS.length,
      cerveau: "16",
      cloud: kbTotalCount || entries.length,
      autolearn: autoLearnCount ?? "…",
      store: storeItems.length,
      cloudusers: cloudUsers.length,
      kbdebug: "🔍",
      devices: devices.length,
    } as Record<string, string | number>;
  }, [interactions, entries, cloudStories, storeItems, cloudUsers, autoLearnCount]);

  return {
    // Theme
    adminDark, setAdminDark,
    // Navigation
    topSection, setTopSection, interactionCat, setInteractionCat,
    interactionAge, setInteractionAge, cloudSection, setCloudSection,
    search, setSearch, ageFilter, setAgeFilter,
    expandedStory, setExpandedStory,
    // Data
    entries, loading, interactions, loadingInteractions,
    cloudStories, storeItems, cloudUsers, cloudUsersLoading,
    realConversations, realConvLoading, learningSessionId,
    liveStats, chartSessions, chartEmotions,
    liveInstallCounts, kbActiveCount, kbTotalCount, autoLearnCount,
    devices, devicesLoading,
    // Editing
    editingEntry, setEditingEntry, saving,
    editingStory, setEditingStory, savingStory, setSavingStory,
    detailItem, setDetailItem,
    selectedCloudUser, setSelectedCloudUser,
    cloudUserSearch, setCloudUserSearch,
    // Derived
    categoryCounts, qaByIntent, blaguesByCategorie,
    currentCloudSection, cloudEntries, filteredInteractions,
    interactionCategoryCounts, multiResponseCategoryCounts, sectionCounts,
    // Handlers
    goBack, handleSave, handleDelete, handleToggleActive,
    handleDetailSave, handleDetailDelete,
    openInteractionDetail, openStoreDetail, openKBDetail,
    openQADetail, openBlagueDetail, openHistoireDetail, openQuizDetail,
    // Fetchers
    fetchEntries, fetchCloudStories, fetchStoreItems, fetchCloudUsers,
    fetchRealConversations, fetchLiveStats, fetchChartData, fetchDevices,
    learnFromSession, refreshAll,
    createDevice,
    navigate,
  };
}

export type AdminState = ReturnType<typeof useAdminState>;
