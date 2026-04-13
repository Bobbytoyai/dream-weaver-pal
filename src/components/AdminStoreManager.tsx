import { useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Search, Star, Sparkles, Trash2, Pencil,
  Download, Users, X, Save, Image as ImageIcon, Upload,
  Eye, Clock, Globe, Shield, Zap, ChevronDown, BookOpen, Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

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
  content_items: { title: string; description: string; emoji: string }[];
}

interface AdminStoreManagerProps {
  storeItems: StoreItem[];
  installCounts: Record<string, number>;
  onRefresh: () => void;
  onBack: () => void;
}

const STORE_CATEGORIES = ["jeux", "educatif", "histoires", "blagues"];

const CAT_COLORS: Record<string, string> = {
  jeux: "from-blue-500/30 to-indigo-500/20",
  educatif: "from-emerald-500/30 to-teal-500/20",
  histoires: "from-purple-500/30 to-pink-500/20",
  blagues: "from-amber-500/30 to-orange-500/20",
};

const CAT_EMOJI: Record<string, string> = {
  jeux: "🎮", educatif: "🧠", histoires: "📚", blagues: "😂",
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
    <button
      onClick={onClick}
      className={`relative bg-white/5 backdrop-blur rounded-2xl border transition-all duration-200 hover:scale-[1.03] hover:shadow-xl active:scale-[0.97] overflow-hidden text-left group ${
        item.is_active ? "border-white/10 hover:border-white/25" : "border-red-500/20 opacity-50"
      }`}
    >
      {/* Cover image or gradient */}
      <div className={`aspect-square w-full bg-gradient-to-br ${gradient} flex items-center justify-center relative overflow-hidden`}>
        {item.cover_image_url ? (
          <img src={item.cover_image_url} alt={item.name}
            className="w-full h-full object-cover" />
        ) : (
          <span className="text-[64px] group-hover:scale-110 transition-transform duration-300">{item.emoji}</span>
        )}

        {/* Badges overlay */}
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          {item.is_new && <span className="px-1.5 py-0.5 rounded-md bg-amber-500/90 text-white text-[8px] font-bold backdrop-blur-sm">NEW</span>}
          {item.is_featured && <span className="px-1.5 py-0.5 rounded-md bg-purple-500/90 text-white text-[8px] font-bold backdrop-blur-sm flex items-center gap-0.5"><Sparkles className="w-2.5 h-2.5" />Featured</span>}
          {item.is_premium && <span className="px-1.5 py-0.5 rounded-md bg-violet-500/90 text-white text-[8px] font-bold backdrop-blur-sm">PREMIUM</span>}
          {!item.is_active && <span className="px-1.5 py-0.5 rounded-md bg-red-500/90 text-white text-[8px] font-bold backdrop-blur-sm">OFF</span>}
        </div>

        {/* Install count badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-sm">
          <Download className="w-2.5 h-2.5 text-white/70" />
          <span className={`text-[10px] font-bold ${installs > 0 ? "text-emerald-400" : "text-white/40"}`}>{installs}</span>
        </div>

        {/* Rating bottom-right */}
        {item.rating_count > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-sm">
            <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
            <span className="text-[10px] font-bold text-white">{item.rating}</span>
          </div>
        )}
      </div>

      {/* Info below */}
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

// ─── Detail Dialog (full page overlay) ──────────────────────────────

function StoreDetailDialog({ item, installs, onClose, onEdit, onDelete }: {
  item: StoreItem; installs: number;
  onClose: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const gradient = CAT_COLORS[item.category] || "from-gray-500/30 to-gray-400/20";
  const contentItems = Array.isArray(item.content_items) ? item.content_items : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto">
      <div className="w-full max-w-lg mx-4 my-6 bg-gradient-to-b from-[hsl(240,50%,12%)] to-[hsl(250,40%,8%)] rounded-3xl border border-white/10 shadow-2xl animate-fade-in">
        {/* Cover Hero */}
        <div className={`aspect-[16/10] w-full bg-gradient-to-br ${gradient} relative overflow-hidden rounded-t-3xl`}>
          {item.cover_image_url ? (
            <img src={item.cover_image_url} alt={item.name}
              className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-[80px]">{item.emoji}</span>
            </div>
          )}

          {/* Close btn */}
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur flex items-center justify-center hover:bg-black/70 transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>

          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
            {item.is_new && <span className="px-2 py-0.5 rounded-lg bg-amber-500/90 text-white text-[9px] font-bold">NEW</span>}
            {item.is_featured && <span className="px-2 py-0.5 rounded-lg bg-purple-500/90 text-white text-[9px] font-bold flex items-center gap-1"><Sparkles className="w-3 h-3" />Featured</span>}
            {item.is_premium && <span className="px-2 py-0.5 rounded-lg bg-violet-500/90 text-white text-[9px] font-bold">PREMIUM</span>}
            {!item.is_active && <span className="px-2 py-0.5 rounded-lg bg-red-500/90 text-white text-[9px] font-bold">DÉSACTIVÉ</span>}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Title + meta */}
          <div>
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-[32px] shrink-0 border border-white/10">
                {item.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-black text-white leading-tight">{item.name}</h2>
                <p className="text-[11px] text-white/40 font-mono mt-0.5">{item.slug}</p>
                <p className="text-[11px] text-emerald-400 font-bold mt-0.5">{item.creator_name} <span className="text-white/30">• {item.creator_role}</span></p>
              </div>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2 mt-3">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < Math.floor(item.rating) ? "text-amber-400 fill-amber-400" : "text-white/15"}`} />
                ))}
              </div>
              <span className="text-sm font-bold text-white">{item.rating}</span>
              <span className="text-[10px] text-white/30">({item.rating_count} avis)</span>
            </div>
          </div>

          {/* Real Metrics */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Installs", value: installs.toString(), color: installs > 0 ? "text-emerald-400" : "text-white/30", icon: <Download className="w-3.5 h-3.5" /> },
              { label: "Contenus", value: item.content_count.toString(), color: "text-blue-400", icon: <BookOpen className="w-3.5 h-3.5" /> },
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

          {/* Content Items */}
          {contentItems.length > 0 && (
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <h3 className="text-[12px] font-black text-white mb-2 flex items-center gap-1.5">
                📋 Contenu inclus <span className="text-[9px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">{contentItems.length}</span>
              </h3>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {contentItems.map((ci, i) => (
                  <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg bg-white/3">
                    <span className="text-[16px]">{ci.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-white truncate">{ci.title}</p>
                      <p className="text-[9px] text-white/30 truncate">{ci.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learning objectives */}
          {item.learning_objectives?.length > 0 && (
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <h3 className="text-[12px] font-black text-white mb-1.5 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-emerald-400" /> Objectifs pédagogiques
              </h3>
              <div className="space-y-1">
                {item.learning_objectives.map((o, i) => (
                  <p key={i} className="text-[10px] text-white/50 flex items-start gap-1.5">
                    <span className="text-emerald-400 mt-px">✓</span> {o}
                  </p>
                ))}
              </div>
            </div>
          )}

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
            <h3 className="text-[12px] font-black text-white mb-2">⚙️ Infos techniques</h3>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
              {[
                { label: "Taille", value: item.size_label },
                { label: "Durée", value: item.duration_estimate },
                { label: "Niveau", value: item.difficulty_level },
                { label: "Langues", value: item.languages?.join(", ") || "fr" },
                { label: "Catégorie", value: `${CAT_EMOJI[item.category] || ""} ${item.category}` },
                { label: "Créé le", value: formatDate(item.created_at) },
                { label: "Mis à jour", value: formatDate(item.last_updated_at || item.created_at) },
                { label: "ID", value: item.id.slice(0, 8) + "…" },
              ].map(info => (
                <div key={info.label} className="flex items-center justify-between">
                  <span className="text-[9px] text-white/30 font-bold">{info.label}</span>
                  <span className="text-[9px] text-white/60 font-bold">{info.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Changelog */}
          {item.changelog && (
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <h3 className="text-[12px] font-black text-white mb-1">📝 Changelog</h3>
              <p className="text-[10px] text-white/40 leading-relaxed">{item.changelog}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-2 pb-2">
            <Button onClick={onEdit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold">
              <Pencil className="w-4 h-4 mr-1.5" /> Modifier
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

// ─── Edit Form (full-page) ──────────────────────────────────────────

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
    
    // Validate image
    if (!file.type.startsWith("image/")) {
      toast.error("Fichier image requis"); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image trop lourde (max 5 Mo)"); return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `covers/${(form.slug || "item")}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("store-covers")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Erreur upload: " + uploadError.message);
      setUploading(false);
      return;
    }

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

        <div className="bg-white/5 backdrop-blur rounded-2xl p-5 border border-white/10 space-y-4">
          {/* Cover image upload */}
          <div>
            <label className="text-xs text-white/50 mb-2 block font-bold">📷 Image de couverture (1064×1064)</label>
            <div className="flex gap-3 items-start">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-28 h-28 rounded-2xl bg-white/5 border-2 border-dashed border-white/15 flex flex-col items-center justify-center cursor-pointer hover:border-white/30 transition-all overflow-hidden group"
              >
                {form.cover_image_url ? (
                  <img src={form.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <ImageIcon className="w-6 h-6 text-white/20 group-hover:text-white/40 transition-colors" />
                    <span className="text-[8px] text-white/20 mt-1">Cliquer pour upload</span>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
              <div className="flex-1 space-y-1">
                <p className="text-[9px] text-white/30">Format recommandé: 1064×1064px, carré, JPG/PNG</p>
                {form.cover_image_url && (
                  <Button variant="ghost" size="sm" onClick={() => set("cover_image_url", "")} className="text-red-400 text-[10px] h-6 px-2">
                    <Trash2 className="w-3 h-3 mr-1" /> Supprimer l'image
                  </Button>
                )}
                {uploading && <p className="text-[10px] text-blue-400 animate-pulse">Upload en cours…</p>}
              </div>
            </div>
          </div>

          {/* Basic fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Slug (unique)</label>
              <Input value={form.slug || ""} onChange={e => set("slug", e.target.value)}
                placeholder="quiz_animaux" className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Emoji</label>
              <Input value={form.emoji || ""} onChange={e => set("emoji", e.target.value)}
                placeholder="🐾" className="bg-white/10 border-white/20 text-white" />
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Nom</label>
            <Input value={form.name || ""} onChange={e => set("name", e.target.value)}
              placeholder="Quiz Animaux" className="bg-white/10 border-white/20 text-white" />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Description courte</label>
            <Textarea value={form.description || ""} onChange={e => set("description", e.target.value)}
              placeholder="Description courte…" className="bg-white/10 border-white/20 text-white" rows={2} />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Description détaillée</label>
            <Textarea value={form.detailed_description || ""} onChange={e => set("detailed_description", e.target.value)}
              placeholder="Description complète pour la fiche produit…" className="bg-white/10 border-white/20 text-white" rows={4} />
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
              <Input type="number" value={form.age_min || 3} onChange={e => set("age_min", +e.target.value)}
                className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Âge max</label>
              <Input type="number" value={form.age_max || 12} onChange={e => set("age_max", +e.target.value)}
                className="bg-white/10 border-white/20 text-white" />
            </div>
          </div>

          {/* Additional fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Créateur</label>
              <Input value={form.creator_name || ""} onChange={e => set("creator_name", e.target.value)}
                placeholder="Équipe Bobby" className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Rôle créateur</label>
              <Input value={form.creator_role || ""} onChange={e => set("creator_role", e.target.value)}
                placeholder="Éducation & Divertissement" className="bg-white/10 border-white/20 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Taille affichée</label>
              <Input value={form.size_label || ""} onChange={e => set("size_label", e.target.value)}
                placeholder="2 Mo" className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Durée estimée</label>
              <Input value={form.duration_estimate || ""} onChange={e => set("duration_estimate", e.target.value)}
                placeholder="10-15 min" className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Niveau difficulté</label>
              <Input value={form.difficulty_level || ""} onChange={e => set("difficulty_level", e.target.value)}
                placeholder="adaptatif" className="bg-white/10 border-white/20 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Version label</label>
              <Input value={form.version_label || ""} onChange={e => set("version_label", e.target.value)}
                placeholder="1.0" className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Note (/5)</label>
              <Input type="number" step="0.1" value={form.rating || 4.5} onChange={e => set("rating", +e.target.value)}
                className="bg-white/10 border-white/20 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Tags (virgules)</label>
              <Input value={(form.tags || []).join(", ")}
                onChange={e => set("tags", e.target.value.split(",").map(t => t.trim()).filter(Boolean))}
                placeholder="interactif, vocal" className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Langues (virgules)</label>
              <Input value={(form.languages || ["fr"]).join(", ")}
                onChange={e => set("languages", e.target.value.split(",").map(t => t.trim()).filter(Boolean))}
                placeholder="fr, en" className="bg-white/10 border-white/20 text-white" />
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Objectifs pédagogiques (un par ligne)</label>
            <Textarea value={(form.learning_objectives || []).join("\n")}
              onChange={e => set("learning_objectives", e.target.value.split("\n").filter(Boolean))}
              placeholder="Un objectif par ligne…" className="bg-white/10 border-white/20 text-white" rows={3} />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Compétences développées (virgules)</label>
            <Input value={(form.skills_developed || []).join(", ")}
              onChange={e => set("skills_developed", e.target.value.split(",").map(t => t.trim()).filter(Boolean))}
              placeholder="Logique, Mémoire, Vocabulaire" className="bg-white/10 border-white/20 text-white" />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Changelog</label>
            <Textarea value={form.changelog || ""} onChange={e => set("changelog", e.target.value)}
              placeholder="Quoi de neuf…" className="bg-white/10 border-white/20 text-white" rows={2} />
          </div>

          {/* Toggles */}
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

          {/* Save */}
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

export default function AdminStoreManager({ storeItems, installCounts, onRefresh, onBack }: AdminStoreManagerProps) {
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [editingItem, setEditingItem] = useState<Partial<StoreItem> | null>(null);

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
    if (!data.name?.trim() || !data.slug?.trim()) {
      toast.error("Nom et slug requis"); return;
    }

    const payload: any = {
      slug: data.slug!.trim(),
      name: data.name!.trim(),
      emoji: data.emoji || "📦",
      description: data.description || "",
      detailed_description: data.detailed_description || "",
      category: data.category || "jeux",
      age_min: data.age_min || 3,
      age_max: data.age_max || 12,
      tags: data.tags || [],
      size_label: data.size_label || "1 Mo",
      is_new: data.is_new || false,
      is_popular: data.is_popular || false,
      is_featured: data.is_featured || false,
      is_premium: data.is_premium || false,
      is_active: data.is_active !== false,
      cover_image_url: data.cover_image_url || "",
      creator_name: data.creator_name || "Équipe Bobby",
      creator_role: data.creator_role || "Éducation & Divertissement",
      version_label: data.version_label || "1.0",
      changelog: data.changelog || "",
      rating: data.rating || 4.5,
      learning_objectives: data.learning_objectives || [],
      skills_developed: data.skills_developed || [],
      duration_estimate: data.duration_estimate || "10-15 min",
      difficulty_level: data.difficulty_level || "adaptatif",
      languages: data.languages || ["fr"],
    };

    if (data.id) {
      const { error } = await supabase.from("store_content").update(payload).eq("id", data.id);
      if (error) toast.error(error.message); else toast.success("Mis à jour !");
    } else {
      const { error } = await supabase.from("store_content").insert(payload);
      if (error) toast.error(error.message); else toast.success("Ajouté au store !");
    }
    setEditingItem(null);
    setSelectedItem(null);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce contenu du store ?")) return;
    const { error } = await supabase.from("store_content").delete().eq("id", id);
    if (error) toast.error(error.message); else toast.success("Supprimé !");
    setSelectedItem(null);
    onRefresh();
  };

  // ── Edit form view ──
  if (editingItem) {
    return <StoreEditForm item={editingItem} onSave={handleSave} onCancel={() => setEditingItem(null)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(240,60%,8%)] to-[hsl(250,40%,15%)] p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onBack} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
            <span className="text-2xl">🛒</span>
            <div>
              <h1 className="text-xl font-bold text-white">Bobby Store</h1>
              <p className="text-white/40 text-xs">{storeItems.length} contenus • {storeItems.filter(i => i.is_active).length} actifs • {totalInstalls} installs</p>
            </div>
          </div>
          <Button onClick={() => setEditingItem({ tags: [], category: "jeux", is_active: true, age_min: 3, age_max: 12, emoji: "📦", size_label: "1 Mo", languages: ["fr"] })}
            className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
        </div>

        {/* Category filter + search */}
        <div className="flex gap-2 items-center">
          <div className="flex gap-1.5 overflow-x-auto shrink-0">
            <button onClick={() => setCatFilter(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!catFilter ? "bg-white/20 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
              Tous
            </button>
            {STORE_CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCatFilter(catFilter === cat ? null : cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${catFilter === cat ? "bg-white/20 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
                {CAT_EMOJI[cat]} {cat}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
              className="bg-white/5 border-white/10 text-white pl-8 h-8 text-xs" />
          </div>
        </div>

        {/* Grid of square cards */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-white/30 text-sm">Aucun contenu trouvé</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredItems.map(item => (
              <StoreCard
                key={item.id}
                item={item}
                installs={installCounts[item.id] || 0}
                onClick={() => setSelectedItem(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail dialog */}
      {selectedItem && (
        <StoreDetailDialog
          item={selectedItem}
          installs={installCounts[selectedItem.id] || 0}
          onClose={() => setSelectedItem(null)}
          onEdit={() => { setEditingItem(selectedItem); setSelectedItem(null); }}
          onDelete={() => handleDelete(selectedItem.id)}
        />
      )}
    </div>
  );
}
