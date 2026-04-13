import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, Download, Check, Star, Sparkles, Users, Zap, Loader2, Trash2, ArrowLeft, Clock, Award, BookOpen, ChevronRight, Globe, Shield, Heart, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { installContentPack, uninstallContentPack, getLocalCacheSize, type InstallResult } from "@/lib/bobby/contentInstaller";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────

type StoreCategory = "all" | "jeux" | "histoires" | "educatif" | "blagues" | "nouveautes";

interface ContentItem {
  title: string;
  description: string;
  emoji: string;
}

interface StoreItem {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  description: string;
  detailed_description: string;
  category: string;
  age_min: number;
  age_max: number;
  tags: string[];
  size_label: string;
  is_new: boolean;
  is_popular: boolean;
  is_featured: boolean;
  is_premium: boolean;
  install_count: number;
  content_items: ContentItem[];
  creator_name: string;
  creator_role: string;
  version_label: string;
  changelog: string;
  rating: number;
  rating_count: number;
  content_count: number;
  learning_objectives: string[];
  skills_developed: string[];
  duration_estimate: string;
  difficulty_level: string;
  languages: string[];
  last_updated_at: string;
  created_at: string;
}

const CATEGORIES: { id: StoreCategory; emoji: string; label: string; color: string }[] = [
  { id: "all", emoji: "🏠", label: "Tout", color: "from-primary/20 to-primary/10" },
  { id: "nouveautes", emoji: "✨", label: "Nouveau", color: "from-amber-400/25 to-amber-300/10" },
  { id: "jeux", emoji: "🎮", label: "Jeux", color: "from-blue-400/20 to-indigo-400/10" },
  { id: "educatif", emoji: "🧠", label: "Éducatif", color: "from-emerald-400/20 to-teal-400/10" },
  { id: "histoires", emoji: "📚", label: "Histoires", color: "from-purple-400/20 to-pink-400/10" },
  { id: "blagues", emoji: "😂", label: "Blagues", color: "from-orange-400/20 to-yellow-400/10" },
];

const LANG_LABELS: Record<string, string> = { fr: "🇫🇷 Français", en: "🇬🇧 English", es: "🇪🇸 Español" };

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.3;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={`w-4 h-4 ${i < full ? "text-amber-400 fill-amber-400" : i === full && half ? "text-amber-400 fill-amber-400/50" : "text-muted-foreground/30"}`} />
        ))}
      </div>
      <span className="text-[14px] font-black text-foreground">{rating}</span>
      <span className="text-[11px] text-muted-foreground font-bold">({count} avis)</span>
    </div>
  );
}

// ─── Product Detail Page ────────────────────────────────────────────

function ProductDetail({ item, installed, installing, onInstall, onBack }: {
  item: StoreItem;
  installed: boolean;
  installing: boolean;
  onInstall: () => void;
  onBack: () => void;
}) {
  const catInfo = CATEGORIES.find(c => c.id === item.category);
  const contentItems = Array.isArray(item.content_items) ? item.content_items : [];

  return (
    <div className="space-y-4 animate-fade-in" style={{ fontFamily: "'Nunito', 'Comic Sans MS', sans-serif" }}>
      {/* Header with back */}
      <button onClick={onBack} className="flex items-center gap-2 text-primary text-[13px] font-bold hover:underline active:scale-95 transition-transform">
        <ArrowLeft className="w-4 h-4" /> Bobby Store
      </button>

      {/* Hero Card */}
      <div className="bg-gradient-to-br from-primary/15 via-accent/10 to-secondary/15 rounded-[22px] p-5 border-2 border-primary/15">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-[18px] bg-card/80 backdrop-blur flex items-center justify-center text-[44px] shadow-lg border border-border/20 shrink-0">
            {item.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[20px] font-black text-foreground leading-tight">{item.name}</h2>
              {item.is_new && <span className="px-2 py-0.5 rounded-lg bg-amber-400/25 text-amber-700 text-[9px] font-black">NEW</span>}
              {item.is_premium && <span className="px-2 py-0.5 rounded-lg bg-violet-400/25 text-violet-700 text-[9px] font-black">PREMIUM</span>}
            </div>
            <p className="text-[12px] text-primary font-bold mt-0.5">{item.creator_name}</p>
            <p className="text-[10px] text-muted-foreground font-medium">{item.creator_role}</p>
            <div className="mt-2">
              <StarRating rating={item.rating} count={item.rating_count} />
            </div>
          </div>
        </div>

        {/* Install Button */}
        <button onClick={onInstall} disabled={installing}
          className={`w-full mt-4 py-3 rounded-2xl text-[15px] font-black transition-all active:scale-[0.97] flex items-center justify-center gap-2 ${
            installed
              ? "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              : "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
          } disabled:opacity-50`}>
          {installing ? <Loader2 className="w-5 h-5 animate-spin" /> : installed ? <><Check className="w-5 h-5" /> Installé</> : <><Download className="w-5 h-5" /> Installer</>}
        </button>
      </div>

      {/* Quick Stats — 4 cols */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { emoji: "📦", value: `${item.content_count}`, label: "Contenus", gradient: "from-blue-400/20 to-indigo-300/8" },
          { emoji: "⏱️", value: item.duration_estimate.split(" ")[0], label: "Durée", gradient: "from-emerald-400/20 to-teal-300/8" },
          { emoji: "👶", value: `${item.age_min}-${item.age_max}`, label: "Âge", gradient: "from-amber-400/20 to-orange-300/8" },
          { emoji: "📊", value: item.difficulty_level.split(" ")[0], label: "Niveau", gradient: "from-pink-400/20 to-rose-300/8" },
        ].map(s => (
          <div key={s.label} className={`bg-gradient-to-br ${s.gradient} rounded-[14px] p-2 text-center border border-white/10`}>
            <span className="text-[16px] block">{s.emoji}</span>
            <p className="text-[13px] font-black text-foreground leading-tight">{s.value}</p>
            <p className="text-[8px] text-muted-foreground font-bold">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Description */}
      <div className="bg-card rounded-[18px] p-4 border border-border/20">
        <h3 className="text-[15px] font-black text-foreground mb-2 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" /> Description
        </h3>
        <p className="text-[13px] text-foreground/80 leading-relaxed">
          {item.detailed_description || item.description}
        </p>
      </div>

      {/* Contenu Inclus */}
      {contentItems.length > 0 && (
        <div className="bg-card rounded-[18px] p-4 border border-border/20">
          <h3 className="text-[15px] font-black text-foreground mb-3 flex items-center gap-2">
            📋 Contenu inclus <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{contentItems.length} modules</span>
          </h3>
          <div className="space-y-2">
            {contentItems.map((ci, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-gradient-to-r from-muted/40 to-muted/20 border border-border/10">
                <span className="text-[24px] shrink-0 mt-0.5">{ci.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-black text-foreground">{ci.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{ci.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Objectifs pédagogiques */}
      {item.learning_objectives.length > 0 && (
        <div className="bg-card rounded-[18px] p-4 border border-border/20">
          <h3 className="text-[15px] font-black text-foreground mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-500" /> Objectifs pédagogiques
          </h3>
          <div className="space-y-1.5">
            {item.learning_objectives.map((obj, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-emerald-500 text-[12px] mt-0.5">✓</span>
                <p className="text-[12px] text-foreground/80 font-medium">{obj}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compétences développées */}
      {item.skills_developed.length > 0 && (
        <div className="bg-card rounded-[18px] p-4 border border-border/20">
          <h3 className="text-[15px] font-black text-foreground mb-3 flex items-center gap-2">
            🧩 Compétences développées
          </h3>
          <div className="flex flex-wrap gap-2">
            {item.skills_developed.map((skill, i) => (
              <span key={i} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold border border-primary/15">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {item.tags.map(tag => (
            <span key={tag} className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[10px] font-bold">#{tag}</span>
          ))}
        </div>
      )}

      {/* Informations techniques */}
      <div className="bg-card rounded-[18px] p-4 border border-border/20">
        <h3 className="text-[15px] font-black text-foreground mb-3 flex items-center gap-2">
          ⚙️ Informations
        </h3>
        <div className="space-y-2.5">
          {[
            { icon: <Zap className="w-3.5 h-3.5" />, label: "Taille", value: item.size_label },
            { icon: <Globe className="w-3.5 h-3.5" />, label: "Langues", value: item.languages.map(l => LANG_LABELS[l] || l).join(", ") },
            { icon: <Shield className="w-3.5 h-3.5" />, label: "Version", value: item.version_label },
            { icon: <Clock className="w-3.5 h-3.5" />, label: "Catégorie", value: `${catInfo?.emoji || "📦"} ${catInfo?.label || item.category}` },
            { icon: <Users className="w-3.5 h-3.5" />, label: "Installé par", value: `${item.install_count} famille${item.install_count > 1 ? "s" : ""}` },
            { icon: <Clock className="w-3.5 h-3.5" />, label: "Publié le", value: formatDate(item.created_at) },
            { icon: <Clock className="w-3.5 h-3.5" />, label: "Mis à jour", value: formatDate(item.last_updated_at) },
          ].map(info => (
            <div key={info.label} className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[12px] text-muted-foreground font-bold">{info.icon} {info.label}</span>
              <span className="text-[12px] text-foreground font-bold">{info.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Changelog */}
      {item.changelog && (
        <div className="bg-card rounded-[18px] p-4 border border-border/20">
          <h3 className="text-[15px] font-black text-foreground mb-2 flex items-center gap-2">
            📝 Nouveautés
          </h3>
          <p className="text-[12px] text-foreground/70 leading-relaxed">{item.changelog}</p>
        </div>
      )}

      {/* Bottom Install */}
      <div className="pb-4">
        {installed ? (
          <button onClick={onInstall} disabled={installing}
            className="w-full py-3 rounded-2xl bg-destructive/10 text-destructive text-[14px] font-black flex items-center justify-center gap-2 active:scale-[0.97] transition-all">
            <Trash2 className="w-4 h-4" /> Désinstaller
          </button>
        ) : (
          <button onClick={onInstall} disabled={installing}
            className="w-full py-3 rounded-2xl bg-primary text-primary-foreground text-[14px] font-black shadow-lg shadow-primary/25 flex items-center justify-center gap-2 active:scale-[0.97] transition-all disabled:opacity-50">
            {installing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Download className="w-5 h-5" /> Installer maintenant</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

interface BobbyStoreProps {
  childName?: string;
  childAge?: number;
}

export default function BobbyStore({ childName = "enfant", childAge = 7 }: BobbyStoreProps) {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<StoreCategory>("all");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [catalogRes, installedRes] = await Promise.all([
      supabase.from("store_content").select("*").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("installed_content").select("content_id").eq("child_name", childName),
    ]);

    if (catalogRes.data) {
      setItems(catalogRes.data.map((r: any) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        emoji: r.emoji,
        description: r.description,
        detailed_description: r.detailed_description || "",
        category: r.category,
        age_min: r.age_min,
        age_max: r.age_max,
        tags: r.tags ?? [],
        size_label: r.size_label,
        is_new: r.is_new,
        is_popular: r.is_popular,
        is_featured: r.is_featured,
        is_premium: r.is_premium ?? false,
        install_count: r.install_count,
        content_items: Array.isArray(r.content_items) ? r.content_items : [],
        creator_name: r.creator_name || "Équipe Bobby",
        creator_role: r.creator_role || "Éducation & Divertissement",
        version_label: r.version_label || "1.0",
        changelog: r.changelog || "",
        rating: r.rating ?? 4.5,
        rating_count: r.rating_count ?? 0,
        content_count: r.content_count ?? 0,
        learning_objectives: r.learning_objectives ?? [],
        skills_developed: r.skills_developed ?? [],
        duration_estimate: r.duration_estimate || "10-15 min",
        difficulty_level: r.difficulty_level || "adaptatif",
        languages: r.languages ?? ["fr"],
        last_updated_at: r.last_updated_at || r.updated_at,
        created_at: r.created_at,
      })));
    }

    if (installedRes.data) {
      setInstalledIds(new Set(installedRes.data.map(r => r.content_id)));
    }
    setLoading(false);
  }, [childName]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleInstall = async (contentId: string) => {
    setInstalling(contentId);
    const isInstalled = installedIds.has(contentId);

    if (isInstalled) {
      await supabase.from("installed_content").delete().eq("child_name", childName).eq("content_id", contentId);
      setInstalledIds(prev => { const next = new Set(prev); next.delete(contentId); return next; });
    } else {
      await supabase.from("installed_content").insert({ child_name: childName, content_id: contentId });
      setInstalledIds(prev => new Set(prev).add(contentId));
    }
    setInstalling(null);
  };

  const filteredItems = useMemo(() => {
    let filtered = items;
    if (activeCategory === "nouveautes") filtered = filtered.filter(i => i.is_new);
    else if (activeCategory !== "all") filtered = filtered.filter(i => i.category === activeCategory);

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [items, activeCategory, search]);

  const featuredItems = useMemo(() => items.filter(i => i.is_featured), [items]);
  const newCount = useMemo(() => items.filter(i => i.is_new).length, [items]);
  const installedCount = installedIds.size;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Product Detail View ──
  if (selectedItem) {
    return (
      <div className="p-4" style={{ fontFamily: "'Nunito', 'Comic Sans MS', sans-serif" }}>
        <ProductDetail
          item={selectedItem}
          installed={installedIds.has(selectedItem.id)}
          installing={installing === selectedItem.id}
          onInstall={() => toggleInstall(selectedItem.id)}
          onBack={() => setSelectedItem(null)}
        />
      </div>
    );
  }

  // ── Store List View ──
  return (
    <div className="p-4 space-y-4" style={{ fontFamily: "'Nunito', sans-serif" }}>
      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un contenu…"
          className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-muted text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
      </div>

      {/* Featured Banner */}
      {activeCategory === "all" && !search && featuredItems.length > 0 && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-accent/15 to-secondary/20 p-4 border border-primary/15">
          <div className="absolute top-2 right-2">
            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[9px] font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> FEATURED
            </span>
          </div>
          <h3 className="text-[14px] font-extrabold text-foreground mb-2">🌟 À découvrir</h3>
          <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1">
            {featuredItems.map(item => (
              <button key={item.id}
                onClick={() => setSelectedItem(item)}
                className="shrink-0 w-[110px] bg-card/80 backdrop-blur rounded-2xl p-3 text-center border border-border/30 hover:shadow-md transition-all active:scale-95">
                <span className="text-3xl block mb-1">{item.emoji}</span>
                <p className="text-[10px] font-bold text-foreground leading-tight">{item.name}</p>
                <p className="text-[8px] text-muted-foreground mt-0.5">{item.age_min}-{item.age_max} ans</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
            className={`shrink-0 px-3.5 py-2 rounded-2xl flex items-center gap-1.5 border-2 transition-all duration-200 active:scale-90 ${
              activeCategory === cat.id
                ? "border-primary bg-primary/10 shadow-md shadow-primary/15"
                : "border-transparent bg-gradient-to-br " + cat.color + " hover:border-primary/15"
            }`}>
            <span className="text-base">{cat.emoji}</span>
            <span className={`text-[11px] font-extrabold whitespace-nowrap ${activeCategory === cat.id ? "text-primary" : "text-foreground/70"}`}>
              {cat.label}
            </span>
            {cat.id === "nouveautes" && newCount > 0 && (
              <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold flex items-center justify-center">
                {newCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 px-1">
        <span className="text-[11px] text-muted-foreground font-medium">{filteredItems.length} contenu{filteredItems.length > 1 ? "s" : ""}</span>
        <span className="text-[11px] text-primary font-bold">{installedCount} installé{installedCount > 1 ? "s" : ""}</span>
      </div>

      {/* Items */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-10">
          <span className="text-4xl block mb-2">🔍</span>
          <p className="text-sm text-muted-foreground">Aucun contenu trouvé</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredItems.map(item => {
            const installed = installedIds.has(item.id);
            const isInstalling = installing === item.id;

            return (
              <button key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`w-full bg-card rounded-2xl border border-border/20 hover:border-primary/20 transition-all duration-200 overflow-hidden text-left active:scale-[0.98]`}>
                <div className="flex items-center gap-3 p-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shrink-0 text-3xl">
                    {item.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-[13px] font-extrabold text-foreground truncate">{item.name}</h4>
                      {item.is_new && <span className="px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-700 text-[8px] font-bold shrink-0">NEW</span>}
                      {item.is_popular && <Star className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{item.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                        <Users className="w-2.5 h-2.5" /> {item.age_min}-{item.age_max} ans
                      </span>
                      <span className="text-[9px] text-muted-foreground">•</span>
                      <span className="text-[9px] text-muted-foreground">{item.size_label}</span>
                      {item.rating_count > 0 && (
                        <>
                          <span className="text-[9px] text-muted-foreground">•</span>
                          <span className="text-[9px] text-amber-600 font-bold flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> {item.rating}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      onClick={(e) => { e.stopPropagation(); toggleInstall(item.id); }}
                      className={`w-[72px] h-[32px] rounded-xl text-[11px] font-bold transition-all duration-200 active:scale-90 flex items-center justify-center gap-1 cursor-pointer ${
                        installed
                          ? "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          : "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                      } ${isInstalling ? "opacity-50 pointer-events-none" : ""}`}>
                      {isInstalling ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : installed ? (
                        <><Check className="w-3.5 h-3.5" /> Installé</>
                      ) : (
                        <><Download className="w-3.5 h-3.5" /> Installer</>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
