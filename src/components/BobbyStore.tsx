import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, Download, Check, Star, Sparkles, Users, Zap, Loader2, Trash2, ArrowLeft, Clock, Award, BookOpen, ChevronRight, Globe, Shield, Heart, X, SlidersHorizontal, ChevronDown, Play, Pause, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { installContentPack, uninstallContentPack, getLocalCacheSize, type InstallResult } from "@/lib/bobby/contentInstaller";
import { invalidateMusicCache } from "@/lib/bobby/musicEngine";
import { getCloudUsage, formatStorage, type CloudUsage } from "@/lib/bobby/cloudQuota";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import PackReviews from "@/components/PackReviews";

// ─── Types ──────────────────────────────────────────────────────────

type StoreCategory = "all" | "jeux" | "histoires" | "educatif" | "blagues" | "nouveautes" | "langues" | "musique";

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
  cover_image_url: string | null;
  has_full_details: boolean;
}

const CATEGORIES: { id: StoreCategory; emoji: string; label: string; bg: string }[] = [
  { id: "all", emoji: "🏠", label: "Tout", bg: "var(--retro-blue)" },
  { id: "nouveautes", emoji: "✨", label: "Nouveau", bg: "var(--retro-yellow)" },
  { id: "langues", emoji: "🌍", label: "Langues", bg: "var(--retro-green)" },
  { id: "jeux", emoji: "🎮", label: "Jeux", bg: "var(--retro-purple)" },
  { id: "educatif", emoji: "🧠", label: "Éducatif", bg: "var(--retro-green)" },
  { id: "histoires", emoji: "📚", label: "Histoires", bg: "var(--retro-red)" },
  { id: "blagues", emoji: "😂", label: "Blagues", bg: "var(--retro-orange)" },
  { id: "musique", emoji: "🎵", label: "Musique", bg: "var(--retro-purple)" },
];

type RatingFilter = "all" | "4+" | "4.5+";
type AgeFilter = "all" | "3-5" | "5-7" | "7-9" | "9-12";

const LANG_LABELS: Record<string, string> = { fr: "🇫🇷 Français", en: "🇬🇧 English", es: "🇪🇸 Español", ar: "🇸🇦 العربية", de: "🇩🇪 Deutsch" };

const LIST_COLUMNS = "id,slug,name,emoji,description,category,age_min,age_max,tags,size_label,is_new,is_popular,is_featured,is_premium,install_count,rating,rating_count,content_count,languages,created_at,last_updated_at,cover_image_url";
const DETAIL_COLUMNS = "id,slug,name,emoji,description,detailed_description,category,age_min,age_max,tags,size_label,is_new,is_popular,is_featured,is_premium,install_count,content_items,creator_name,creator_role,version_label,changelog,rating,rating_count,content_count,learning_objectives,skills_developed,duration_estimate,difficulty_level,languages,last_updated_at,created_at,cover_image_url,updated_at";

function mapStoreRow(r: any): StoreItem {
  const hasFullDetails =
    "content_items" in r ||
    "detailed_description" in r ||
    "learning_objectives" in r ||
    "skills_developed" in r ||
    "changelog" in r;

  return {
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
    last_updated_at: r.last_updated_at || r.updated_at || r.created_at,
    created_at: r.created_at,
    cover_image_url: (r.cover_image_url && r.cover_image_url.trim() !== "") ? r.cover_image_url : null,
    has_full_details: hasFullDetails,
  };
}

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
      <span className="text-[14px] font-black text-black">{rating}</span>
      <span className="text-[11px] text-black/60 font-bold">({count} avis)</span>
    </div>
  );
}

// ─── Product Detail Page ────────────────────────────────────────────

function ProductDetail({ item, installed, installing, detailsLoading, onInstall, onBack, onRatingUpdate }: {
  item: StoreItem;
  installed: boolean;
  installing: boolean;
  detailsLoading: boolean;
  onInstall: () => void;
  onBack: () => void;
  onRatingUpdate?: (rating: number, count: number) => void;
}) {
  const catInfo = CATEGORIES.find(c => c.id === item.category);
  const contentItems = Array.isArray(item.content_items) ? item.content_items : [];

  return (
    <div className="space-y-4" style={{ fontFamily: "'Nunito', 'Comic Sans MS', sans-serif" }}>
      {/* Header with back */}
      <button onClick={onBack} className="flex items-center gap-2 text-black text-[13px] font-black uppercase hover:opacity-70 transition-transform border-2 border-black px-3 py-1.5 bg-white">
        <ArrowLeft className="w-4 h-4" /> BOBBY STORE
      </button>

      {detailsLoading && (
        <div className="retro-card p-3 flex items-center gap-2" style={{ backgroundColor: "var(--retro-yellow)" }}>
          <Loader2 className="w-4 h-4 animate-spin text-black" />
          <p className="text-[11px] font-black uppercase text-black">Chargement des détails…</p>
        </div>
      )}

      {/* Hero Card */}
      <div className="retro-card p-5" style={{ backgroundColor: "var(--retro-blue)" }}>
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 border-4 border-black bg-white flex items-center justify-center text-[44px] shrink-0 overflow-hidden">
            {item.cover_image_url ? (
              <img src={item.cover_image_url} alt={item.name} className="w-full h-full object-cover" loading="eager" />
            ) : item.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[20px] font-black text-black leading-tight uppercase">{item.name}</h2>
              {item.is_new && <span className="px-2 py-0.5 border-2 border-black bg-[var(--retro-yellow)] text-black text-[9px] font-black">NEW</span>}
              {item.is_premium && <span className="px-2 py-0.5 border-2 border-black bg-[var(--retro-purple)] text-black text-[9px] font-black">PREMIUM</span>}
            </div>
            <p className="text-[12px] text-black/80 font-black mt-0.5">{item.creator_name}</p>
            <p className="text-[10px] text-black/60 font-bold">{item.creator_role}</p>
            <div className="mt-2">
              <StarRating rating={item.rating} count={item.rating_count} />
            </div>
          </div>
        </div>

        {/* Install Button */}
        <button onClick={onInstall} disabled={installing}
          className={`w-full mt-4 py-3 text-[15px] font-black transition-all flex items-center justify-center gap-2 border-4 border-black uppercase ${
            installed
              ? "bg-white text-black hover:bg-[var(--retro-red)]"
              : "bg-foreground text-background"
          } disabled:opacity-50`}
          style={{ boxShadow: "4px 4px 0px rgba(0,0,0,0.25)" }}>
          {installing ? <Loader2 className="w-5 h-5 animate-spin" /> : installed ? <><Check className="w-5 h-5" /> INSTALLÉ</> : <><Download className="w-5 h-5" /> INSTALLER</>}
        </button>
      </div>

      {/* Quick Stats — 4 cols */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { emoji: "📦", value: `${item.content_count}`, label: "Contenus", bg: "var(--retro-blue)" },
          { emoji: "⏱️", value: item.duration_estimate.split(" ")[0], label: "Durée", bg: "var(--retro-green)" },
          { emoji: "👶", value: `${item.age_min}-${item.age_max}`, label: "Âge", bg: "var(--retro-yellow)" },
          { emoji: "📊", value: item.difficulty_level.split(" ")[0], label: "Niveau", bg: "var(--retro-red)" },
        ].map(s => (
          <div key={s.label} className="border-4 border-black p-2 text-center" style={{ backgroundColor: s.bg, boxShadow: "3px 3px 0px rgba(0,0,0,0.2)" }}>
            <span className="text-[16px] block">{s.emoji}</span>
            <p className="text-[13px] font-black text-black leading-tight">{s.value}</p>
            <p className="text-[8px] text-black/60 font-black uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Description */}
      <div className="retro-card p-4">
        <h3 className="text-[15px] font-black text-black mb-2 flex items-center gap-2 uppercase">
          <BookOpen className="w-4 h-4" /> DESCRIPTION
        </h3>
        <p className="text-[13px] text-black/80 leading-relaxed">
          {item.detailed_description || item.description}
        </p>
      </div>

      {/* Contenu Inclus */}
      {contentItems.length > 0 && (
        <div className="retro-card p-4">
          <h3 className="text-[15px] font-black text-black mb-3 flex items-center gap-2 uppercase">
            📋 CONTENU INCLUS <span className="text-[11px] font-black border-2 border-black px-2 py-0.5 bg-[var(--retro-yellow)]">{contentItems.length} modules</span>
          </h3>
          <div className="space-y-2">
            {contentItems.map((ci, i) => (
              <div key={i} className="flex items-start gap-3 p-3 border-2 border-black bg-white">
                <span className="text-[24px] shrink-0 mt-0.5">{ci.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-black text-black">{ci.title}</p>
                  <p className="text-[11px] text-black/60 leading-relaxed font-bold">{ci.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Objectifs pédagogiques */}
      {item.learning_objectives.length > 0 && (
        <div className="retro-card p-4" style={{ backgroundColor: "var(--retro-green)" }}>
          <h3 className="text-[15px] font-black text-black mb-3 flex items-center gap-2 uppercase">
            <Award className="w-4 h-4" /> OBJECTIFS PÉDAGOGIQUES
          </h3>
          <div className="space-y-1.5">
            {item.learning_objectives.map((obj, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-black text-[12px] mt-0.5 font-black">✓</span>
                <p className="text-[12px] text-black/80 font-bold">{obj}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compétences développées */}
      {item.skills_developed.length > 0 && (
        <div className="retro-card p-4">
          <h3 className="text-[15px] font-black text-black mb-3 flex items-center gap-2 uppercase">
            🧩 COMPÉTENCES
          </h3>
          <div className="flex flex-wrap gap-2">
            {item.skills_developed.map((skill, i) => (
              <span key={i} className="px-3 py-1.5 border-2 border-black bg-[var(--retro-blue)] text-black text-[11px] font-black">
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
            <span key={tag} className="px-2.5 py-1 border-2 border-black bg-white text-black text-[10px] font-black">#{tag}</span>
          ))}
        </div>
      )}

      {/* Informations techniques */}
      <div className="retro-card p-4">
        <h3 className="text-[15px] font-black text-black mb-3 flex items-center gap-2 uppercase">
          ⚙️ INFORMATIONS
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
            <div key={info.label} className="flex items-center justify-between border-b border-black/10 pb-1.5 last:border-0">
              <span className="flex items-center gap-2 text-[12px] text-black/60 font-black">{info.icon} {info.label}</span>
              <span className="text-[12px] text-black font-bold">{info.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Changelog */}
      {item.changelog && (
        <div className="retro-card p-4" style={{ backgroundColor: "var(--retro-yellow)" }}>
          <h3 className="text-[15px] font-black text-black mb-2 flex items-center gap-2 uppercase">
            📝 NOUVEAUTÉS
          </h3>
          <p className="text-[12px] text-black/70 leading-relaxed font-bold">{item.changelog}</p>
        </div>
      )}

      {/* User Reviews */}
      <PackReviews contentId={item.id} onRatingUpdate={onRatingUpdate} />

      {/* Bottom Install */}
      <div className="pb-4">
        {installed ? (
          <button onClick={onInstall} disabled={installing}
            className="w-full py-3 bg-[var(--retro-red)] text-black text-[14px] font-black flex items-center justify-center gap-2 transition-all border-4 border-black uppercase"
            style={{ boxShadow: "4px 4px 0px rgba(0,0,0,0.25)" }}>
            <Trash2 className="w-4 h-4" /> DÉSINSTALLER
          </button>
        ) : (
          <button onClick={onInstall} disabled={installing}
            className="w-full py-3 bg-foreground text-background text-[14px] font-black flex items-center justify-center gap-2 transition-all border-4 border-black uppercase disabled:opacity-50"
            style={{ boxShadow: "4px 4px 0px rgba(0,0,0,0.25)" }}>
            {installing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Download className="w-5 h-5" /> INSTALLER MAINTENANT</>}
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
  const { user } = useAuth();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<StoreCategory>("all");
   const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [ageFilter, setAgeFilter] = useState<AgeFilter>("all");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");

  const [loadError, setLoadError] = useState(false);
  const [quota, setQuota] = useState<CloudUsage | null>(null);

  // Fetch quota
  useEffect(() => {
    if (user) getCloudUsage().then(setQuota).catch(() => {});
  }, [user]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    setSelectedItem(null);
    try {
      const catalogRes = await supabase
        .from("store_content")
        .select(LIST_COLUMNS)
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });

      if (catalogRes.error) throw catalogRes.error;
      setItems((catalogRes.data || []).map(mapStoreRow));
      setLoading(false);
    } catch (err: any) {
      console.error("[BobbyStore] Catalog fetch error:", err.message);
      setLoadError(true);
      setLoading(false);
    }
  }, []);

  // Pre-installed content IDs (all music tracks are free & pre-installed)
  const PRE_INSTALLED_IDS = useMemo(() => new Set([
    "4fafa517-6290-4ab1-b20b-5c8137995c0a", // Bobby tu es là
    "bd7d5210-1b8c-46e6-b04d-1a6750ab4d7a", // La Marseillaise
    "6bd89dd3-fede-4af3-b2c8-f04c29e4e7c0", // Frère Bobby
    "7aa4412f-fe84-41d6-9f40-e29e387f37cc", // Au Clair de la Lune
    "717a114f-e799-41b5-b4dc-1deb2a95e7e7", // Alouette
    "c6b9db82-f409-49f9-a8f3-eccd1eafe3a4", // Petit navire
    "8fe7c6ae-4ada-4c72-ac86-93fc9d9aceed", // École amusant
    "931cb344-ee77-4e53-af99-78d49db2edf0", // Dort Doucement
  ]), []);

  // Fetch installed content separately — non-blocking
  useEffect(() => {
    if (!user) {
      // Even without auth, show pre-installed packs
      setInstalledIds(new Set(PRE_INSTALLED_IDS));
      return;
    }
    const fetchInstalled = async () => {
      try {
        const { data } = await supabase.from("installed_content").select("content_id").eq("child_name", childName);
        const ids = new Set(data ? data.map((r: any) => r.content_id) : []);
        // Add pre-installed packs (unless user explicitly uninstalled — check via a flag)
        const { data: uninstalled } = await supabase
          .from("installed_content")
          .select("content_id, is_enabled")
          .eq("child_name", childName)
          .in("content_id", Array.from(PRE_INSTALLED_IDS));
        
        for (const preId of PRE_INSTALLED_IDS) {
          const record = uninstalled?.find((r: any) => r.content_id === preId);
          if (!record) {
            // Never touched — show as installed
            ids.add(preId);
          } else if ((record as any).is_enabled !== false) {
            ids.add(preId);
          }
          // If is_enabled === false, user explicitly removed it — don't add
        }
        setInstalledIds(ids);
      } catch (e) {
        console.warn("[BobbyStore] Installed content fetch failed (non-critical):", e);
        setInstalledIds(new Set(PRE_INSTALLED_IDS));
      }
    };
    fetchInstalled();
  }, [user, childName, PRE_INSTALLED_IDS]);

  const loadItemDetails = useCallback(async (itemId: string) => {
    const existingItem = items.find((item) => item.id === itemId);

    if (!existingItem || existingItem.has_full_details) {
      return;
    }

    setDetailLoadingId(itemId);

    try {
      const { data, error } = await supabase
        .from("store_content")
        .select(DETAIL_COLUMNS)
        .eq("id", itemId)
        .single();

      if (error) throw error;

      const hydratedItem = mapStoreRow(data);

      setItems((prev) => prev.map((item) => item.id === itemId ? hydratedItem : item));
      setSelectedItem((current) => current?.id === itemId ? hydratedItem : current);
    } catch (error: any) {
      console.error("[BobbyStore] Detail fetch error:", error.message);
      toast.error("Détail indisponible", { description: "Impossible d’ouvrir ce contenu pour le moment" });
    } finally {
      setDetailLoadingId(null);
    }
  }, [items]);

  const openItem = useCallback((item: StoreItem) => {
    setSelectedItem(item);
    if (!item.has_full_details) {
      void loadItemDetails(item.id);
    }
  }, [loadItemDetails]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Scroll parent container to top on view change
  useEffect(() => {
    const scrollParent = document.querySelector('[data-scroll-container]') as HTMLElement;
    scrollParent?.scrollTo({ top: 0, behavior: "instant" });
    window.scrollTo(0, 0);
  }, [selectedItem, activeCategory]);

  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const toggleInstall = async (contentId: string) => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }

    setInstalling(contentId);
    const isInstalled = installedIds.has(contentId);
    const isPreInstalled = PRE_INSTALLED_IDS.has(contentId);

    try {
      if (isInstalled) {
        if (isPreInstalled) {
          // For pre-installed packs: mark as disabled instead of full uninstall
          await supabase.from("installed_content").upsert(
            { child_name: childName, content_id: contentId, user_id: user.id, is_enabled: false },
            { onConflict: "child_name,content_id" }
          );
          setInstalledIds(prev => { const next = new Set(prev); next.delete(contentId); return next; });
          invalidateMusicCache();
          toast.success("Contenu désactivé", { description: "Bobby ne jouera plus cette musique" });
        } else {
          const result = await uninstallContentPack(contentId, childName);
          if (result.success) {
            setInstalledIds(prev => { const next = new Set(prev); next.delete(contentId); return next; });
            invalidateMusicCache();
            toast.success("Contenu désinstallé", { description: "Les données ont été retirées du cerveau de Bobby" });
          }
        }
      } else {
        if (isPreInstalled) {
          // Re-enable pre-installed pack
          await supabase.from("installed_content").upsert(
            { child_name: childName, content_id: contentId, user_id: user.id, is_enabled: true },
            { onConflict: "child_name,content_id" }
          );
          setInstalledIds(prev => new Set(prev).add(contentId));
          invalidateMusicCache();
          toast.success("Musique réactivée !", { description: "Bobby jouera à nouveau cette musique 🎵" });
        } else {
          const result = await installContentPack(contentId, childName);
          if (result.success) {
            setInstalledIds(prev => new Set(prev).add(contentId));
            invalidateMusicCache();
            if (result.itemsInstalled > 0) {
              toast.success(`${result.itemsInstalled} contenus installés !`, { 
                description: `Bobby a appris ${result.itemsInstalled} nouvelles choses 🧠${result.cachedLocally ? " • Disponible hors-ligne" : ""}` 
              });
            } else {
              toast.success("Pack activé", { description: result.error || "Aucun contenu trouvé dans ce pack" });
            }
          } else {
            toast.error("Erreur d'installation", { description: result.error });
          }
        }
      }
    } catch (e: any) {
      toast.error("Erreur", { description: e.message });
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

    // Age filter
    if (ageFilter !== "all") {
      const [minStr, maxStr] = ageFilter.split("-");
      const fMin = parseInt(minStr);
      const fMax = parseInt(maxStr);
      filtered = filtered.filter(i => i.age_min <= fMax && i.age_max >= fMin);
    }

    // Rating filter
    if (ratingFilter === "4+") filtered = filtered.filter(i => i.rating >= 4);
    else if (ratingFilter === "4.5+") filtered = filtered.filter(i => i.rating >= 4.5);

    return filtered;
  }, [items, activeCategory, search, ageFilter, ratingFilter]);

  const featuredItems = useMemo(() => items.filter(i => i.is_featured), [items]);
  const newCount = useMemo(() => items.filter(i => i.is_new).length, [items]);
  const installedCount = installedIds.size;
  const hasActiveFilters = ageFilter !== "all" || ratingFilter !== "all";

  if (loading) {
    return (
      <div className="p-4 space-y-4 animate-pulse" style={{ fontFamily: "'Nunito', sans-serif" }}>
        {/* Search skeleton */}
        <div className="w-full h-[42px] border-4 border-black/20 bg-muted/40" />

        {/* Featured banner skeleton */}
        <div className="retro-card p-4 space-y-3" style={{ backgroundColor: "var(--retro-green)", opacity: 0.6 }}>
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 bg-foreground/15 rounded" />
            <div className="h-5 w-16 bg-foreground/10 rounded" />
          </div>
          <div className="flex gap-3 overflow-hidden">
            {[1, 2, 3].map(i => (
              <div key={i} className="shrink-0 w-[160px] bg-white/60 border-2 border-black/20 p-2.5">
                <div className="w-full aspect-square bg-muted/50 border-2 border-black/10 mb-2" />
                <div className="h-3 w-24 bg-foreground/10 rounded mx-auto mb-1" />
                <div className="h-2.5 w-16 bg-foreground/8 rounded mx-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Category tabs skeleton */}
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="shrink-0 h-[34px] border-2 border-black/15 bg-muted/30 rounded" style={{ width: `${50 + i * 8}px` }} />
          ))}
        </div>

        {/* Stats skeleton */}
        <div className="flex items-center gap-3 px-1">
          <div className="h-3 w-20 bg-foreground/10 rounded" />
          <div className="h-3 w-16 bg-foreground/10 rounded" />
        </div>

        {/* Item cards skeleton */}
        <div className="space-y-2.5">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="retro-card w-full overflow-hidden" style={{ opacity: 1 - i * 0.1 }}>
              <div className="flex items-center gap-3 p-3">
                <div className="w-14 h-14 border-2 border-black/20 bg-muted/40 shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-3.5 w-3/4 bg-foreground/12 rounded" />
                  <div className="h-2.5 w-full bg-foreground/8 rounded" />
                  <div className="flex gap-2">
                    <div className="h-2 w-14 bg-foreground/6 rounded" />
                    <div className="h-2 w-10 bg-foreground/6 rounded" />
                  </div>
                </div>
                <div className="w-[72px] h-[32px] border-2 border-black/15 bg-muted/30 shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <span className="text-4xl">😕</span>
        <p className="text-[14px] text-black font-black uppercase">Impossible de charger le Store</p>
        <p className="text-[12px] text-black/60 font-bold">Vérifie ta connexion et réessaie</p>
        <button onClick={() => fetchData()} className="mt-2 px-4 py-2 border-4 border-black bg-[var(--retro-blue)] text-black text-[13px] font-black transition-transform uppercase"
          style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.25)" }}>
          🔄 RÉESSAYER
        </button>
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
          detailsLoading={detailLoadingId === selectedItem.id}
          onInstall={() => toggleInstall(selectedItem.id)}
          onBack={() => setSelectedItem(null)}
          onRatingUpdate={(newRating, newCount) => {
            setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, rating: newRating, rating_count: newCount } : i));
            setSelectedItem(prev => prev ? { ...prev, rating: newRating, rating_count: newCount } : prev);
          }}
        />
      </div>
    );
  }

  // ── Store List View ──
  return (
    <div className="p-4 space-y-4" style={{ fontFamily: "'Nunito', sans-serif" }}>
      {/* Search + Filter toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un contenu…"
            className="w-full pl-9 pr-4 py-2.5 bg-white text-[13px] text-black placeholder:text-black/40 border-4 border-black outline-none font-bold focus:ring-2 focus:ring-black/20 transition-all" />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`shrink-0 w-[44px] h-[44px] border-4 border-black flex items-center justify-center transition-all ${
            hasActiveFilters ? "bg-[var(--retro-yellow)]" : "bg-white"
          }`}
          style={{ boxShadow: "2px 2px 0px rgba(0,0,0,0.2)" }}
        >
          <SlidersHorizontal className="w-4 h-4 text-black" />
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="retro-card p-4 space-y-3" style={{ backgroundColor: "var(--retro-yellow)" }}>
          <div className="flex items-center justify-between">
            <h4 className="text-[12px] font-black text-black uppercase">🔍 Filtres</h4>
            {hasActiveFilters && (
              <button onClick={() => { setAgeFilter("all"); setRatingFilter("all"); }}
                className="text-[10px] font-black text-black/60 underline uppercase">
                Réinitialiser
              </button>
            )}
          </div>

          {/* Age filter */}
          <div>
            <p className="text-[10px] font-black text-black/70 uppercase mb-1.5">👶 Tranche d'âge</p>
            <div className="flex gap-1.5 flex-wrap">
              {([["all", "Tous"], ["3-5", "3-5 ans"], ["5-7", "5-7 ans"], ["7-9", "7-9 ans"], ["9-12", "9-12 ans"]] as [AgeFilter, string][]).map(([val, label]) => (
                <button key={val} onClick={() => setAgeFilter(val)}
                  className={`px-2.5 py-1.5 border-2 border-black text-[10px] font-black uppercase transition-all ${
                    ageFilter === val ? "bg-black text-white" : "bg-white text-black hover:bg-black/5"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Rating filter */}
          <div>
            <p className="text-[10px] font-black text-black/70 uppercase mb-1.5">⭐ Note minimum</p>
            <div className="flex gap-1.5">
              {([["all", "Toutes"], ["4+", "4+ ⭐"], ["4.5+", "4.5+ ⭐"]] as [RatingFilter, string][]).map(([val, label]) => (
                <button key={val} onClick={() => setRatingFilter(val)}
                  className={`px-2.5 py-1.5 border-2 border-black text-[10px] font-black uppercase transition-all ${
                    ratingFilter === val ? "bg-black text-white" : "bg-white text-black hover:bg-black/5"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quota Warning Banner */}
      {quota && quota.usedPercent >= 80 && (
        <div
          className="retro-card p-3 flex items-center gap-3"
          style={{
            backgroundColor: quota.usedPercent >= 95 ? "var(--retro-red)" : "var(--retro-yellow)",
          }}
        >
          <span className="text-2xl shrink-0">{quota.usedPercent >= 95 ? "🚨" : "⚠️"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-black text-black uppercase">
              {quota.usedPercent >= 95 ? "Stockage presque plein" : "Stockage bientôt plein"}
            </p>
            <p className="text-[10px] text-black/70 font-bold leading-snug">
              {formatStorage(quota.usedMB)} utilisés sur {formatStorage(quota.quotaMB)}
              {quota.usedPercent >= 95
                ? " — Libérez de l'espace ou passez à un plan supérieur."
                : ` (${Math.round(quota.usedPercent)}%)`}
            </p>
          </div>
          <div className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center shrink-0">
            <div className="relative w-6 h-6">
              <svg viewBox="0 0 36 36" className="w-6 h-6 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="black" strokeOpacity="0.1" strokeWidth="4" />
                <circle cx="18" cy="18" r="15" fill="none"
                  stroke={quota.usedPercent >= 95 ? "#DC2626" : "#F59E0B"}
                  strokeWidth="4"
                  strokeDasharray={`${quota.usedPercent * 0.94} 100`}
                  strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black text-black">
                {Math.round(quota.usedPercent)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Featured Banner */}
      {activeCategory === "all" && !search && featuredItems.length > 0 && (
        <div className="retro-card p-4 overflow-hidden" style={{ backgroundColor: "var(--retro-green)" }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[14px] font-black text-black uppercase">🌟 À DÉCOUVRIR</h3>
            <span className="px-2 py-0.5 border-2 border-black bg-white text-black text-[9px] font-black flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> FEATURED
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {featuredItems.map((item, index) => (
              <button key={item.id}
                onClick={() => openItem(item)}
                className="shrink-0 w-[160px] bg-white border-2 border-black p-2.5 text-center hover:translate-y-[-2px] transition-all overflow-hidden"
                style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.2)" }}>
                {item.cover_image_url ? (
                  <div className="w-full aspect-square border-2 border-black mb-2 overflow-hidden bg-muted">
                    <img
                      src={item.cover_image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      loading="eager"
                      fetchPriority={index === 0 ? "high" : "auto"}
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-square border-2 border-black mb-2 flex items-center justify-center bg-muted/30">
                    <span className="text-5xl">{item.emoji}</span>
                  </div>
                )}
                <p className="text-[12px] font-black text-black leading-tight">{item.name} {item.emoji}</p>
                <p className="text-[10px] text-black/60 mt-0.5 font-bold">{item.age_min}-{item.age_max} ans</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
            className={`shrink-0 px-3.5 py-2 flex items-center gap-1.5 border-2 border-black transition-all duration-200 font-black text-[11px] uppercase ${
              activeCategory === cat.id
                ? "ring-2 ring-foreground/20"
                : "hover:translate-y-[-1px]"
            }`}
            style={{
              backgroundColor: activeCategory === cat.id ? cat.bg : "white",
              boxShadow: activeCategory === cat.id ? "3px 3px 0px rgba(0,0,0,0.25)" : "1px 1px 0px rgba(0,0,0,0.1)",
            }}>
            <span className="text-base">{cat.emoji}</span>
            <span className="whitespace-nowrap text-black font-black">{cat.label}</span>
            {cat.id === "nouveautes" && newCount > 0 && (
              <span className="min-w-[16px] h-[16px] px-1 border border-black bg-[var(--retro-red)] text-black text-[8px] font-black flex items-center justify-center">
                {newCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 px-1">
        <span className="text-[11px] text-black/60 font-black">{filteredItems.length} contenu{filteredItems.length > 1 ? "s" : ""}</span>
        <span className="text-[11px] text-black font-black border-b-2 border-black">{installedCount} installé{installedCount > 1 ? "s" : ""}</span>
      </div>

      {/* Items */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-10">
          <span className="text-4xl block mb-2">🔍</span>
          <p className="text-sm text-black/60 font-black">Aucun contenu trouvé</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredItems.map((item, idx) => {
            const installed = installedIds.has(item.id);
            const isInstalling = installing === item.id;
            const tiltClass = `retro-card-tilt-${(idx % 6) + 1}`;

            return (
              <button key={item.id}
                onClick={() => openItem(item)}
                className={`retro-card ${tiltClass} w-full overflow-hidden text-left`}>
                <div className="flex items-center gap-3 p-3">
                  <div className="w-14 h-14 border-2 border-black bg-white flex items-center justify-center shrink-0 text-3xl overflow-hidden">
                    {item.cover_image_url ? (
                      <img src={item.cover_image_url} alt={item.name} className="w-full h-full object-cover" loading="eager" />
                    ) : item.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-[13px] font-black text-black truncate uppercase">{item.name}</h4>
                      {item.is_new && <span className="px-1.5 py-0.5 border border-black bg-[var(--retro-yellow)] text-black text-[8px] font-black shrink-0">NEW</span>}
                      {item.is_popular && <Star className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-black/60 mt-0.5 truncate font-bold">{item.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-black/50 flex items-center gap-0.5 font-bold">
                        <Users className="w-2.5 h-2.5" /> {item.age_min}-{item.age_max} ans
                      </span>
                      <span className="text-[9px] text-black/30">•</span>
                      <span className="text-[9px] text-black/50 font-bold">{item.size_label}</span>
                      <span className="text-[9px] text-black/30">•</span>
                      <span className="text-[9px] text-amber-600 font-black flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> {item.rating_count > 0 ? item.rating : "—"}
                        {item.rating_count > 0 && <span className="text-black/40 font-bold">({item.rating_count})</span>}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      onClick={(e) => { e.stopPropagation(); toggleInstall(item.id); }}
                      className={`w-[72px] h-[32px] border-2 border-black text-[11px] font-black transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer uppercase ${
                        installed
                          ? "bg-white text-black hover:bg-[var(--retro-red)]"
                          : "bg-foreground text-background"
                      } ${isInstalling ? "opacity-50 pointer-events-none" : ""}`}
                      style={{ boxShadow: "2px 2px 0px rgba(0,0,0,0.2)" }}>
                      {isInstalling ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : installed ? (
                        <><Check className="w-3.5 h-3.5" /> Installé</>
                      ) : (
                        <><Download className="w-3.5 h-3.5" /> Installer</>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-black/40" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Auth Required Dialog */}
      {showAuthDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="relative w-full max-w-sm border-[3px] border-black bg-[#FDF6EC] p-6 shadow-[6px_6px_0px_0px_#000]"
            style={{ fontFamily: "inherit" }}
          >
            {/* Close */}
            <button
              onClick={() => setShowAuthDialog(false)}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center border-2 border-black bg-white hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 border-[3px] border-black bg-[var(--retro-yellow,#fbbf24)] flex items-center justify-center text-3xl shadow-[3px_3px_0px_0px_#000]">
                🔒
              </div>
            </div>

            {/* Title */}
            <h2 className="text-center text-[18px] font-black text-gray-900 uppercase tracking-wide mb-2">
              Compte Bobby Cloud requis
            </h2>

            {/* Description */}
            <p className="text-center text-[13px] text-gray-600 font-bold leading-relaxed mb-1">
              Pour installer des packs et enrichir le cerveau de Bobby, crée un compte gratuit Bobby Cloud.
            </p>
            <p className="text-center text-[11px] text-gray-400 font-bold mb-5">
              🔒 Données chiffrées • 🇪🇺 Serveurs EU • ✨ 100% gratuit
            </p>

            {/* CTA */}
            <button
              onClick={() => {
                window.location.href = `/bobby-cloud?returnTo=${encodeURIComponent(window.location.pathname)}`;
              }}
              className="w-full py-3 border-[3px] border-black bg-black text-white text-[14px] font-black uppercase tracking-wider hover:bg-gray-900 transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
            >
              ✨ Créer un compte gratuit
            </button>

            {/* Secondary */}
            <button
              onClick={() => setShowAuthDialog(false)}
              className="w-full mt-2 py-2 text-[12px] font-bold text-gray-500 hover:text-gray-700 transition-colors"
            >
              Plus tard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
