import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Search, Star, Sparkles, Trash2, Pencil,
  Download, Users, X, Save, Image as ImageIcon,
  Clock, Globe, Shield, Zap, BookOpen, Award,
  ChevronUp, ChevronDown, GripVertical, ListOrdered, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import MusicTracksEditor from "@/components/admin/MusicTracksEditor";
import {
  deleteContentDataItem,
  deleteStoreItem,
  moveContentDataItem,
  saveContentDataItem,
  saveStoreItem,
} from "@/lib/adminStoreApi";

// ─── Types ──────────────────────────────────────────────────────────

interface StoreItem {
  id: string; slug: string; name: string; emoji: string;
  description: string; detailed_description: string;
  category: string; age_min: number; age_max: number;
  tags: string[]; size_label: string;
  is_new: boolean; is_popular: boolean; is_featured: boolean;
  is_active: boolean; is_premium: boolean;
  version: number; version_label: string;
  install_count: number; rating: number; rating_count: number;
  content_count: number; changelog: string;
  creator_name: string; creator_role: string;
  learning_objectives: string[]; skills_developed: string[];
  duration_estimate: string; difficulty_level: string;
  languages: string[];
  cover_image_url: string; screenshots: string[];
  created_at: string; last_updated_at: string;
  content_items: { title: string; description: string; emoji: string; track_id?: string; image_url?: string; has_audio?: boolean }[];
}

interface ContentDataItem {
  id: string;
  content_id: string;
  data_type: string;
  title: string;
  question: string;
  answer: string;
  body: string;
  keywords: string[];
  emotion: string;
  age_min: number;
  age_max: number;
  priority: number;
  sort_order: number;
  metadata: any;
  created_at: string;
}

interface AdminStoreManagerProps {
  adminCode: string;
  storeItems: StoreItem[];
  installCounts: Record<string, number>;
  onRefresh: () => void;
  onBack: () => void;
}

const STORE_CATEGORIES = ["jeux", "educatif", "histoires", "blagues", "langues", "musique"];
const DATA_TYPES = ["qa", "story", "joke", "game", "song", "exercise", "music"];
const EMOTIONS = ["happy", "curious", "excited", "calm", "surprised", "proud", "playful", "sad", "scared"];

const CAT_COLORS: Record<string, string> = {
  jeux: "from-blue-500/30 to-indigo-500/20",
  educatif: "from-emerald-500/30 to-teal-500/20",
  histoires: "from-purple-500/30 to-pink-500/20",
  blagues: "from-amber-500/30 to-orange-500/20",
  musique: "from-rose-500/30 to-pink-500/20",
};

const CAT_EMOJI: Record<string, string> = {
  jeux: "🎮", educatif: "🧠", histoires: "📚", blagues: "😂", musique: "🎵",
};

const TYPE_EMOJI: Record<string, string> = {
  qa: "❓", story: "📖", joke: "😂", game: "🎮", song: "🎵", exercise: "🏋️",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Square Card ────────────────────────────────────────────────────

function StoreCard({ item, installs, onClick }: {
  item: StoreItem; installs: number; onClick: () => void;
}) {
  const gradient = CAT_COLORS[item.category] || "from-gray-500/30 to-gray-400/20";
  return (
    <button onClick={onClick}
      className={`relative bg-white/[0.04] backdrop-blur-xl rounded-[20px] border transition-all duration-200 hover:scale-[1.03] hover:shadow-xl overflow-hidden text-left group ${
        item.is_active ? "border-white/10 hover:border-white/25" : "border-red-500/20 opacity-50"
      }`}>
      <div className={`aspect-square w-full bg-gradient-to-br ${gradient} flex items-center justify-center relative overflow-hidden`}>
        {item.cover_image_url ? (
          <img src={item.cover_image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-[64px] group-hover:scale-110 transition-transform duration-300">{item.emoji}</span>
        )}
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          {item.is_new && <span className="px-1.5 py-0.5 rounded-md bg-amber-500/90 text-white text-[8px] font-bold backdrop-blur-sm">NEW</span>}
          {item.is_featured && <span className="px-1.5 py-0.5 rounded-md bg-purple-500/90 text-white text-[8px] font-bold backdrop-blur-sm flex items-center gap-0.5"><Sparkles className="w-2.5 h-2.5" />Featured</span>}
          {!item.is_active && <span className="px-1.5 py-0.5 rounded-md bg-red-500/90 text-white text-[8px] font-bold backdrop-blur-sm">OFF</span>}
        </div>
        <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-sm">
          <Download className="w-2.5 h-2.5 text-white/70" />
          <span className={`text-[10px] font-bold ${installs > 0 ? "text-emerald-400" : "text-white/40"}`}>{installs}</span>
        </div>
        {item.rating_count > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-sm">
            <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
            <span className="text-[10px] font-bold text-white">{item.rating}</span>
          </div>
        )}
      </div>
      <div className="p-2.5">
        <h4 className="text-[12px] font-extrabold text-white truncate leading-tight">{item.name}</h4>
        <p className="text-[9px] text-white/40 truncate mt-0.5">{item.description}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-[8px] text-white/30 capitalize">{CAT_EMOJI[item.category]} {item.category}</span>
          <span className="text-[8px] text-white/20">•</span>
          <span className="text-[8px] text-white/30">{item.age_min}-{item.age_max} ans</span>
        </div>
      </div>
    </button>
  );
}

// ─── Content Data Editor ────────────────────────────────────────────

function ContentDataEditor({ contentId, contentName, onBack }: {
  contentId: string; contentName: string; onBack: () => void;
}) {
  const [items, setItems] = useState<ContentDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<Partial<ContentDataItem> | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("content_data")
      .select("*")
      .eq("content_id", contentId)
      .order("sort_order", { ascending: true });
    setItems((data as unknown as ContentDataItem[]) || []);
    setLoading(false);
  }, [contentId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSaveItem = async () => {
    if (!editingItem) return;
    setSaving(true);

    const payload: any = {
      content_id: contentId,
      data_type: editingItem.data_type || "qa",
      title: editingItem.title || "",
      question: editingItem.question || "",
      answer: editingItem.answer || "",
      body: editingItem.body || "",
      keywords: editingItem.keywords || [],
      emotion: editingItem.emotion || "happy",
      age_min: editingItem.age_min ?? 3,
      age_max: editingItem.age_max ?? 12,
      priority: editingItem.priority ?? 5,
      sort_order: editingItem.sort_order ?? items.length + 1,
      metadata: editingItem.metadata || {},
    };

    if (editingItem.id) {
      const { error } = await supabase.from("content_data").update(payload).eq("id", editingItem.id);
      if (error) toast.error(error.message); else toast.success("Contenu mis à jour !");
    } else {
      const { error } = await supabase.from("content_data").insert(payload);
      if (error) toast.error(error.message); else toast.success("Contenu ajouté !");
    }

    // Update content_count on store_content
    const { count } = await supabase
      .from("content_data")
      .select("*", { count: "exact", head: true })
      .eq("content_id", contentId);
    if (count !== null) {
      await supabase.from("store_content").update({ content_count: count }).eq("id", contentId);
    }

    setSaving(false);
    setEditingItem(null);
    fetchItems();
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Supprimer ce contenu ?")) return;
    const { error } = await supabase.from("content_data").delete().eq("id", id);
    if (error) toast.error(error.message); else toast.success("Supprimé !");

    const { count } = await supabase
      .from("content_data")
      .select("*", { count: "exact", head: true })
      .eq("content_id", contentId);
    if (count !== null) {
      await supabase.from("store_content").update({ content_count: count }).eq("id", contentId);
    }
    fetchItems();
  };

  const moveItem = async (id: string, direction: "up" | "down") => {
    const idx = items.findIndex(i => i.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;

    const a = items[idx], b = items[swapIdx];
    await Promise.all([
      supabase.from("content_data").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("content_data").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    fetchItems();
  };

  // ── Edit form ──
  if (editingItem) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(240,60%,8%)] to-[hsl(250,40%,15%)] p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setEditingItem(null)} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
            <h1 className="text-lg font-bold text-white">{editingItem.id ? "✏️ Modifier" : "➕ Nouveau"} contenu</h1>
          </div>

          <div className="bg-white/[0.04] backdrop-blur-xl rounded-[20px] p-5 border border-white/10 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Type de données</label>
                <Select value={editingItem.data_type || "qa"} onValueChange={v => setEditingItem(p => ({ ...p!, data_type: v }))}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{DATA_TYPES.map(t => <SelectItem key={t} value={t}>{TYPE_EMOJI[t]} {t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Émotion</label>
                <Select value={editingItem.emotion || "happy"} onValueChange={v => setEditingItem(p => ({ ...p!, emotion: v }))}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{EMOTIONS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs text-white/50 mb-1 block">Titre</label>
              <Input value={editingItem.title || ""} onChange={e => setEditingItem(p => ({ ...p!, title: e.target.value }))}
                placeholder="Titre du contenu" className="bg-white/10 border-white/20 text-white" />
            </div>

            <div>
              <label className="text-xs text-white/50 mb-1 block">Question / Entrée</label>
              <Textarea value={editingItem.question || ""} onChange={e => setEditingItem(p => ({ ...p!, question: e.target.value }))}
                placeholder="Question posée à Bobby ou déclencheur…" className="bg-white/10 border-white/20 text-white" rows={2} />
            </div>

            <div>
              <label className="text-xs text-white/50 mb-1 block">Réponse / Sortie</label>
              <Textarea value={editingItem.answer || ""} onChange={e => setEditingItem(p => ({ ...p!, answer: e.target.value }))}
                placeholder="Réponse de Bobby…" className="bg-white/10 border-white/20 text-white" rows={4} />
            </div>

            <div>
              <label className="text-xs text-white/50 mb-1 block">Corps / Texte long (histoires, etc.)</label>
              <Textarea value={editingItem.body || ""} onChange={e => setEditingItem(p => ({ ...p!, body: e.target.value }))}
                placeholder="Texte complet de l'histoire ou contenu long…" className="bg-white/10 border-white/20 text-white" rows={6} />
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Âge min</label>
                <Input type="number" value={editingItem.age_min ?? 3} onChange={e => setEditingItem(p => ({ ...p!, age_min: +e.target.value }))}
                  className="bg-white/10 border-white/20 text-white" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Âge max</label>
                <Input type="number" value={editingItem.age_max ?? 12} onChange={e => setEditingItem(p => ({ ...p!, age_max: +e.target.value }))}
                  className="bg-white/10 border-white/20 text-white" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Priorité</label>
                <Input type="number" value={editingItem.priority ?? 5} onChange={e => setEditingItem(p => ({ ...p!, priority: +e.target.value }))}
                  className="bg-white/10 border-white/20 text-white" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Ordre</label>
                <Input type="number" value={editingItem.sort_order ?? items.length + 1} onChange={e => setEditingItem(p => ({ ...p!, sort_order: +e.target.value }))}
                  className="bg-white/10 border-white/20 text-white" />
              </div>
            </div>

            <div>
              <label className="text-xs text-white/50 mb-1 block">Mots-clés (virgules)</label>
              <Input value={(editingItem.keywords || []).join(", ")}
                onChange={e => setEditingItem(p => ({ ...p!, keywords: e.target.value.split(",").map(t => t.trim()).filter(Boolean) }))}
                placeholder="mot1, mot2, mot3" className="bg-white/10 border-white/20 text-white" />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSaveItem} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 flex-1 font-bold">
                <Save className="w-4 h-4 mr-1.5" /> {saving ? "…" : editingItem.id ? "Sauvegarder" : "Ajouter"}
              </Button>
              <Button variant="ghost" onClick={() => setEditingItem(null)} className="text-white/50">Annuler</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(240,60%,8%)] to-[hsl(250,40%,15%)] p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onBack} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
            <div>
              <h1 className="text-lg font-bold text-white">📋 Contenu — {contentName}</h1>
              <p className="text-white/40 text-xs">{items.length} éléments • ID: {contentId.slice(0, 8)}…</p>
            </div>
          </div>
          <Button onClick={() => setEditingItem({ content_id: contentId, data_type: "qa", age_min: 3, age_max: 12, priority: 5, sort_order: items.length + 1, emotion: "happy", keywords: [] })}
            className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-white/30 text-sm animate-pulse">Chargement…</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl block mb-2">📭</span>
            <p className="text-white/30 text-sm">Aucun contenu dans ce pack</p>
            <p className="text-white/20 text-xs mt-1">Ajoutez des questions, histoires ou blagues</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={item.id} className="bg-white/[0.04] backdrop-blur-xl rounded-[16px] p-3 border border-white/[0.06] hover:bg-white/[0.06] transition-all group">
                <div className="flex items-start gap-3">
                  {/* Order controls */}
                  <div className="flex flex-col gap-0.5 shrink-0 pt-1">
                    <button onClick={() => moveItem(item.id, "up")} disabled={idx === 0}
                      className="text-white/20 hover:text-white/60 disabled:opacity-20 transition-colors">
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[9px] text-white/20 text-center font-mono">{item.sort_order}</span>
                    <button onClick={() => moveItem(item.id, "down")} disabled={idx === items.length - 1}
                      className="text-white/20 hover:text-white/60 disabled:opacity-20 transition-colors">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Type badge */}
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[16px] shrink-0">
                    {TYPE_EMOJI[item.data_type] || "📄"}
                  </div>

                  {/* Content preview */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {item.title && <span className="text-[11px] font-bold text-white truncate">{item.title}</span>}
                      <span className="text-[8px] text-white/20 font-mono uppercase shrink-0">{item.data_type}</span>
                      <span className="text-[8px] px-1 py-0.5 rounded bg-white/5 text-white/30 shrink-0">{item.emotion}</span>
                    </div>
                    {item.question && (
                      <p className="text-[10px] text-blue-300/70 mt-0.5 truncate">❓ {item.question}</p>
                    )}
                    {item.answer && (
                      <p className="text-[10px] text-emerald-300/60 mt-0.5 line-clamp-2">💬 {item.answer.slice(0, 120)}{item.answer.length > 120 ? "…" : ""}</p>
                    )}
                    {item.body && !item.answer && (
                      <p className="text-[10px] text-purple-300/60 mt-0.5 line-clamp-2">📝 {item.body.slice(0, 120)}{item.body.length > 120 ? "…" : ""}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[8px] text-white/20">{item.age_min}-{item.age_max} ans</span>
                      <span className="text-[8px] text-white/20">•</span>
                      <span className="text-[8px] text-white/20">P{item.priority}</span>
                      {item.keywords?.length > 0 && (
                        <>
                          <span className="text-[8px] text-white/20">•</span>
                          <span className="text-[8px] text-white/15 truncate">{item.keywords.slice(0, 3).join(", ")}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={() => setEditingItem(item)} className="text-white/40 hover:text-white h-7 w-7 p-0">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(item.id)} className="text-red-400/40 hover:text-red-400 h-7 w-7 p-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Detail Dialog ──────────────────────────────────────────────────

function StoreDetailDialog({ item, installs, onClose, onEdit, onDelete, onManageContent }: {
  item: StoreItem; installs: number;
  onClose: () => void; onEdit: () => void; onDelete: () => void;
  onManageContent: () => void;
}) {
  const gradient = CAT_COLORS[item.category] || "from-gray-500/30 to-gray-400/20";
  const [dbContentCount, setDbContentCount] = useState<number | null>(null);

  useEffect(() => {
    supabase.from("content_data").select("*", { count: "exact", head: true }).eq("content_id", item.id)
      .then(({ count }) => setDbContentCount(count));
  }, [item.id]);

  const realCount = dbContentCount ?? item.content_count;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto">
      <div className="w-full max-w-lg mx-4 my-6 bg-gradient-to-b from-[hsl(240,50%,12%)] to-[hsl(250,40%,8%)] rounded-3xl border border-white/10 shadow-2xl animate-fade-in">
        {/* Cover */}
        <div className={`aspect-[16/10] w-full bg-gradient-to-br ${gradient} relative overflow-hidden rounded-t-3xl`}>
          {item.cover_image_url ? (
            <img src={item.cover_image_url} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full"><span className="text-[80px]">{item.emoji}</span></div>
          )}
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur flex items-center justify-center hover:bg-black/70 transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
            {item.is_new && <span className="px-2 py-0.5 rounded-lg bg-amber-500/90 text-white text-[9px] font-bold">NEW</span>}
            {item.is_featured && <span className="px-2 py-0.5 rounded-lg bg-purple-500/90 text-white text-[9px] font-bold flex items-center gap-1"><Sparkles className="w-3 h-3" />Featured</span>}
            {item.is_premium && <span className="px-2 py-0.5 rounded-lg bg-violet-500/90 text-white text-[9px] font-bold">PREMIUM</span>}
            {!item.is_active && <span className="px-2 py-0.5 rounded-lg bg-red-500/90 text-white text-[9px] font-bold">DÉSACTIVÉ</span>}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Title */}
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-[32px] shrink-0 border border-white/10">{item.emoji}</div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black text-white leading-tight">{item.name}</h2>
              <p className="text-[11px] text-white/40 font-mono mt-0.5">{item.slug}</p>
              <p className="text-[11px] text-emerald-400 font-bold mt-0.5">{item.creator_name}</p>
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < Math.floor(item.rating) ? "text-amber-400 fill-amber-400" : "text-white/15"}`} />
              ))}
            </div>
            <span className="text-sm font-bold text-white">{item.rating}</span>
            <span className="text-[10px] text-white/30">({item.rating_count} avis)</span>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Installs", value: installs.toString(), color: installs > 0 ? "text-emerald-400" : "text-white/30", icon: <Download className="w-3.5 h-3.5" /> },
              { label: "Contenus", value: realCount.toString(), color: "text-blue-400", icon: <BookOpen className="w-3.5 h-3.5" /> },
              { label: "Âge", value: `${item.age_min}-${item.age_max}`, color: "text-amber-400", icon: <Users className="w-3.5 h-3.5" /> },
              { label: "Version", value: item.version_label || `v${item.version}`, color: "text-purple-400", icon: <Shield className="w-3.5 h-3.5" /> },
            ].map(s => (
              <div key={s.label} className="bg-white/5 rounded-xl p-2.5 text-center border border-white/5">
                <div className={`${s.color} flex justify-center mb-1`}>{s.icon}</div>
                <p className={`text-sm font-black ${s.color}`}>{s.value}</p>
                <p className="text-[8px] text-white/30 font-bold">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <h3 className="text-[12px] font-black text-white mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-400" /> Description
            </h3>
            <p className="text-[11px] text-white/60 leading-relaxed">{item.detailed_description || item.description}</p>
          </div>

          {/* Manage Content Button — prominent */}
          <button onClick={onManageContent}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-[13px] flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/25">
            <ListOrdered className="w-5 h-5" />
            📋 Gérer le contenu ({realCount} éléments)
          </button>

          {/* Skills + tags */}
          {(item.skills_developed?.length > 0 || item.tags?.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {item.skills_developed?.map((s, i) => (
                <span key={`s-${i}`} className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 text-[9px] font-bold border border-blue-500/20">{s}</span>
              ))}
              {item.tags?.map((t, i) => (
                <span key={`t-${i}`} className="px-2 py-0.5 rounded-full bg-white/5 text-white/30 text-[9px] font-bold">#{t}</span>
              ))}
            </div>
          )}

          {/* Technical info */}
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <h3 className="text-[12px] font-black text-white mb-2">⚙️ Infos</h3>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
              {[
                { label: "Taille", value: item.size_label },
                { label: "Durée", value: item.duration_estimate },
                { label: "Niveau", value: item.difficulty_level },
                { label: "Langues", value: item.languages?.join(", ") || "fr" },
                { label: "Créé le", value: formatDate(item.created_at) },
                { label: "Mis à jour", value: formatDate(item.last_updated_at || item.created_at) },
              ].map(info => (
                <div key={info.label} className="flex items-center justify-between">
                  <span className="text-[9px] text-white/30 font-bold">{info.label}</span>
                  <span className="text-[9px] text-white/60 font-bold">{info.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 pb-2">
            <Button onClick={onEdit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold">
              <Pencil className="w-4 h-4 mr-1.5" /> Modifier fiche
            </Button>
            <Button onClick={onDelete} variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Form ──────────────────────────────────────────────────────

function StoreEditForm({ item, onSave, onCancel }: {
  item: Partial<StoreItem>;
  onSave: (data: Partial<StoreItem>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<StoreItem>>({ ...item });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const set = (key: string, value: any) => setForm(p => ({ ...p, [key]: value }));

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Fichier image requis"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image trop lourde (max 5 Mo)"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `covers/${(form.slug || "item")}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("store-covers").upload(path, file, { upsert: true });
    if (uploadError) { toast.error("Erreur: " + uploadError.message); setUploading(false); return; }
    const { data } = supabase.storage.from("store-covers").getPublicUrl(path);
    set("cover_image_url", data.publicUrl);
    toast.success("Image uploadée !");
    setUploading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(240,60%,8%)] to-[hsl(250,40%,15%)] p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onCancel} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="text-lg font-bold text-white">{form.id ? "✏️ Modifier" : "➕ Nouveau"} contenu</h1>
        </div>

        <div className="bg-white/[0.04] backdrop-blur-xl rounded-[20px] p-5 border border-white/10 space-y-4">
          {/* Cover upload */}
          <div>
            <label className="text-xs text-white/50 mb-2 block font-bold">📷 Image de couverture (1064×1064)</label>
            <div className="flex gap-3 items-start">
              <div onClick={() => fileInputRef.current?.click()}
                className="w-28 h-28 rounded-2xl bg-white/5 border-2 border-dashed border-white/15 flex flex-col items-center justify-center cursor-pointer hover:border-white/30 transition-all overflow-hidden group">
                {form.cover_image_url ? (
                  <img src={form.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <><ImageIcon className="w-6 h-6 text-white/20 group-hover:text-white/40 transition-colors" /><span className="text-[8px] text-white/20 mt-1">Upload</span></>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
              <div className="flex-1 space-y-1">
                <p className="text-[9px] text-white/30">JPG/PNG, 1064×1064px recommandé</p>
                {form.cover_image_url && (
                  <Button variant="ghost" size="sm" onClick={() => set("cover_image_url", "")} className="text-red-400 text-[10px] h-6 px-2">
                    <Trash2 className="w-3 h-3 mr-1" /> Supprimer
                  </Button>
                )}
                {uploading && <p className="text-[10px] text-blue-400 animate-pulse">Upload…</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Slug</label>
              <Input value={form.slug || ""} onChange={e => set("slug", e.target.value)} placeholder="quiz_animaux" className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Emoji</label>
              <Input value={form.emoji || ""} onChange={e => set("emoji", e.target.value)} placeholder="🐾" className="bg-white/10 border-white/20 text-white" />
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Nom</label>
            <Input value={form.name || ""} onChange={e => set("name", e.target.value)} placeholder="Quiz Animaux" className="bg-white/10 border-white/20 text-white" />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Description courte</label>
            <Textarea value={form.description || ""} onChange={e => set("description", e.target.value)} placeholder="Description…" className="bg-white/10 border-white/20 text-white" rows={2} />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Description détaillée</label>
            <Textarea value={form.detailed_description || ""} onChange={e => set("detailed_description", e.target.value)} placeholder="Fiche produit complète…" className="bg-white/10 border-white/20 text-white" rows={4} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Catégorie</label>
              <Select value={form.category || "jeux"} onValueChange={v => set("category", v)}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>{STORE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Âge min</label>
              <Input type="number" value={form.age_min || 3} onChange={e => set("age_min", +e.target.value)} className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Âge max</label>
              <Input type="number" value={form.age_max || 12} onChange={e => set("age_max", +e.target.value)} className="bg-white/10 border-white/20 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Créateur</label>
              <Input value={form.creator_name || ""} onChange={e => set("creator_name", e.target.value)} placeholder="Équipe Bobby" className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Rôle</label>
              <Input value={form.creator_role || ""} onChange={e => set("creator_role", e.target.value)} placeholder="Éducation" className="bg-white/10 border-white/20 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Taille</label>
              <Input value={form.size_label || ""} onChange={e => set("size_label", e.target.value)} placeholder="2 Mo" className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Durée</label>
              <Input value={form.duration_estimate || ""} onChange={e => set("duration_estimate", e.target.value)} placeholder="10-15 min" className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Niveau</label>
              <Input value={form.difficulty_level || ""} onChange={e => set("difficulty_level", e.target.value)} placeholder="adaptatif" className="bg-white/10 border-white/20 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Version</label>
              <Input value={form.version_label || ""} onChange={e => set("version_label", e.target.value)} placeholder="1.0" className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Note (/5)</label>
              <Input type="number" step="0.1" value={form.rating || 4.5} onChange={e => set("rating", +e.target.value)} className="bg-white/10 border-white/20 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Tags (virgules)</label>
              <Input value={(form.tags || []).join(", ")} onChange={e => set("tags", e.target.value.split(",").map(t => t.trim()).filter(Boolean))} placeholder="interactif, vocal" className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Langues</label>
              <Input value={(form.languages || ["fr"]).join(", ")} onChange={e => set("languages", e.target.value.split(",").map(t => t.trim()).filter(Boolean))} placeholder="fr, en" className="bg-white/10 border-white/20 text-white" />
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Objectifs pédagogiques (un par ligne)</label>
            <Textarea value={(form.learning_objectives || []).join("\n")} onChange={e => set("learning_objectives", e.target.value.split("\n").filter(Boolean))} placeholder="Un objectif par ligne…" className="bg-white/10 border-white/20 text-white" rows={3} />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Compétences (virgules)</label>
            <Input value={(form.skills_developed || []).join(", ")} onChange={e => set("skills_developed", e.target.value.split(",").map(t => t.trim()).filter(Boolean))} placeholder="Logique, Mémoire" className="bg-white/10 border-white/20 text-white" />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Changelog</label>
            <Textarea value={form.changelog || ""} onChange={e => set("changelog", e.target.value)} placeholder="Quoi de neuf…" className="bg-white/10 border-white/20 text-white" rows={2} />
          </div>

          <div className="flex gap-4 items-center flex-wrap">
            {[
              { key: "is_new", label: "NEW" },
              { key: "is_popular", label: "Populaire" },
              { key: "is_featured", label: "Featured" },
              { key: "is_premium", label: "Premium" },
              { key: "is_active", label: "Actif" },
            ].map(toggle => (
              <label key={toggle.key} className="flex items-center gap-2 text-xs text-white/70">
                <Switch checked={(form as any)[toggle.key] ?? (toggle.key === "is_active")} onCheckedChange={v => set(toggle.key, v)} /> {toggle.label}
              </label>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={() => onSave(form)} className="bg-emerald-600 hover:bg-emerald-700 flex-1 font-bold">
              <Save className="w-4 h-4 mr-1.5" /> {form.id ? "Sauvegarder" : "Ajouter"}
            </Button>
            <Button variant="ghost" onClick={onCancel} className="text-white/50">Annuler</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export default function AdminStoreManager({ adminCode, storeItems, installCounts, onRefresh, onBack }: AdminStoreManagerProps) {
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [editingItem, setEditingItem] = useState<Partial<StoreItem> | null>(null);
  const [managingContentFor, setManagingContentFor] = useState<{ id: string; name: string; category: string } | null>(null);

  const filteredItems = useMemo(() => {
    return storeItems.filter(item => {
      if (catFilter && item.category !== catFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [storeItems, catFilter, search]);

  const totalInstalls = useMemo(() => Object.values(installCounts).reduce((a, b) => a + b, 0), [installCounts]);

  const handleSave = async (data: Partial<StoreItem>) => {
    if (!data.name?.trim() || !data.slug?.trim()) { toast.error("Nom et slug requis"); return; }
    const payload: any = {
      slug: data.slug!.trim(), name: data.name!.trim(), emoji: data.emoji || "📦",
      description: data.description || "", detailed_description: data.detailed_description || "",
      category: data.category || "jeux", age_min: data.age_min || 3, age_max: data.age_max || 12,
      tags: data.tags || [], size_label: data.size_label || "1 Mo",
      is_new: data.is_new || false, is_popular: data.is_popular || false,
      is_featured: data.is_featured || false, is_premium: data.is_premium || false,
      is_active: data.is_active !== false, cover_image_url: data.cover_image_url || "",
      creator_name: data.creator_name || "Équipe Bobby", creator_role: data.creator_role || "Éducation & Divertissement",
      version_label: data.version_label || "1.0", changelog: data.changelog || "",
      rating: data.rating || 4.5, learning_objectives: data.learning_objectives || [],
      skills_developed: data.skills_developed || [], duration_estimate: data.duration_estimate || "10-15 min",
      difficulty_level: data.difficulty_level || "adaptatif", languages: data.languages || ["fr"],
    };
    if (data.id) {
      const { error } = await supabase.from("store_content").update(payload).eq("id", data.id);
      if (error) toast.error(error.message); else toast.success("Mis à jour !");
    } else {
      const { error } = await supabase.from("store_content").insert(payload);
      if (error) toast.error(error.message); else toast.success("Ajouté au store !");
    }
    setEditingItem(null); setSelectedItem(null); onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce contenu et toutes ses données ?")) return;
    await supabase.from("content_data").delete().eq("content_id", id);
    const { error } = await supabase.from("store_content").delete().eq("id", id);
    if (error) toast.error(error.message); else toast.success("Supprimé !");
    setSelectedItem(null); onRefresh();
  };

  // ── Content editor view ──
  if (managingContentFor) {
    if (managingContentFor.category === "musique") {
      return (
        <MusicTracksEditor
          adminCode={adminCode}
          contentId={managingContentFor.id}
          contentName={managingContentFor.name}
          onBack={() => { setManagingContentFor(null); onRefresh(); }}
        />
      );
    }
    return (
      <ContentDataEditor
        contentId={managingContentFor.id}
        contentName={managingContentFor.name}
        onBack={() => { setManagingContentFor(null); onRefresh(); }}
      />
    );
  }

  // ── Edit form view ──
  if (editingItem) {
    return <StoreEditForm item={editingItem} onSave={handleSave} onCancel={() => setEditingItem(null)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(240,60%,8%)] to-[hsl(250,40%,15%)] p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onBack} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
            <span className="text-2xl">🛒</span>
            <div>
              <h1 className="text-xl font-bold text-white">Bobby Store</h1>
              <p className="text-white/40 text-xs">{storeItems.length} packs • {storeItems.filter(i => i.is_active).length} actifs • {totalInstalls} installs</p>
            </div>
          </div>
          <Button onClick={() => setEditingItem({ tags: [], category: "jeux", is_active: true, age_min: 3, age_max: 12, emoji: "📦", size_label: "1 Mo", languages: ["fr"] })}
            className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
        </div>

        <div className="flex gap-2 items-center">
          <div className="flex gap-1.5 overflow-x-auto shrink-0">
            <button onClick={() => setCatFilter(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!catFilter ? "bg-white/20 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>Tous</button>
            {STORE_CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCatFilter(catFilter === cat ? null : cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${catFilter === cat ? "bg-white/20 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
                {CAT_EMOJI[cat]} {cat}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" className="bg-white/5 border-white/10 text-white pl-8 h-8 text-xs" />
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-white/30 text-sm">Aucun contenu trouvé</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredItems.map(item => (
              <StoreCard key={item.id} item={item} installs={installCounts[item.id] || 0} onClick={() => setSelectedItem(item)} />
            ))}
          </div>
        )}
      </div>

      {selectedItem && (
        <StoreDetailDialog
          item={selectedItem}
          installs={installCounts[selectedItem.id] || 0}
          onClose={() => setSelectedItem(null)}
          onEdit={() => { setEditingItem(selectedItem); setSelectedItem(null); }}
          onDelete={() => handleDelete(selectedItem.id)}
          onManageContent={() => { setManagingContentFor({ id: selectedItem.id, name: selectedItem.name, category: selectedItem.category }); setSelectedItem(null); }}
        />
      )}
    </div>
  );
}
