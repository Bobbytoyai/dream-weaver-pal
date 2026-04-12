import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, Download, Check, Star, Sparkles, Users, Zap, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ──────────────────────────────────────────────────────────

type StoreCategory = "all" | "jeux" | "histoires" | "educatif" | "blagues" | "nouveautes";

interface StoreItem {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  description: string;
  category: string;
  age_min: number;
  age_max: number;
  tags: string[];
  size_label: string;
  is_new: boolean;
  is_popular: boolean;
  is_featured: boolean;
  install_count: number;
}

const CATEGORIES: { id: StoreCategory; emoji: string; label: string; color: string }[] = [
  { id: "all", emoji: "🏠", label: "Tout", color: "from-primary/20 to-primary/10" },
  { id: "nouveautes", emoji: "✨", label: "Nouveau", color: "from-amber-400/25 to-amber-300/10" },
  { id: "jeux", emoji: "🎮", label: "Jeux", color: "from-blue-400/20 to-indigo-400/10" },
  { id: "educatif", emoji: "🧠", label: "Éducatif", color: "from-emerald-400/20 to-teal-400/10" },
  { id: "histoires", emoji: "📚", label: "Histoires", color: "from-purple-400/20 to-pink-400/10" },
  { id: "blagues", emoji: "😂", label: "Blagues", color: "from-orange-400/20 to-yellow-400/10" },
];

// ─── Component ─────────────────────────────────────────────────────

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
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Fetch catalog + installed status
  const fetchData = useCallback(async () => {
    setLoading(true);
    const [catalogRes, installedRes] = await Promise.all([
      supabase.from("store_content").select("*").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("installed_content").select("content_id").eq("child_name", childName),
    ]);

    if (catalogRes.data) {
      setItems(catalogRes.data.map(r => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        emoji: r.emoji,
        description: r.description,
        category: r.category,
        age_min: r.age_min,
        age_max: r.age_max,
        tags: r.tags ?? [],
        size_label: r.size_label,
        is_new: r.is_new,
        is_popular: r.is_popular,
        is_featured: r.is_featured,
        install_count: r.install_count,
      })));
    }

    if (installedRes.data) {
      setInstalledIds(new Set(installedRes.data.map(r => r.content_id)));
    }
    setLoading(false);
  }, [childName]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Install / Uninstall
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

  // Filtering
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
                onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
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
            const expanded = expandedItem === item.id;
            const isInstalling = installing === item.id;

            return (
              <div key={item.id}
                className={`bg-card rounded-2xl border transition-all duration-200 overflow-hidden ${
                  expanded ? "border-primary/30 shadow-md" : "border-border/20 hover:border-border/40"
                }`}>
                <button onClick={() => setExpandedItem(expanded ? null : item.id)}
                  className="w-full flex items-center gap-3 p-3 text-left">
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
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleInstall(item.id); }}
                    disabled={isInstalling}
                    className={`shrink-0 w-[72px] h-[32px] rounded-xl text-[11px] font-bold transition-all duration-200 active:scale-90 flex items-center justify-center gap-1 ${
                      installed
                        ? "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        : "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    } disabled:opacity-50`}>
                    {isInstalling ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : installed ? (
                      <><Check className="w-3.5 h-3.5" /> Installé</>
                    ) : (
                      <><Download className="w-3.5 h-3.5" /> Installer</>
                    )}
                  </button>
                </button>

                {expanded && (
                  <div className="px-4 pb-3 pt-0 border-t border-border/15 space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-[11px] text-foreground/80 leading-relaxed mt-2">{item.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {item.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-semibold">#{tag}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {item.age_min}-{item.age_max} ans</span>
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {item.size_label}</span>
                      <span className="flex items-center gap-1">
                        {CATEGORIES.find(c => c.id === item.category)?.emoji} {CATEGORIES.find(c => c.id === item.category)?.label}
                      </span>
                    </div>
                    {installed && (
                      <button onClick={() => toggleInstall(item.id)}
                        className="flex items-center gap-1 text-[10px] text-destructive font-bold mt-1 hover:underline">
                        <Trash2 className="w-3 h-3" /> Désinstaller
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
