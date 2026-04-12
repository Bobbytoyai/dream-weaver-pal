import { useState, useMemo } from "react";
import { Search, Download, Check, ChevronRight, Star, Sparkles, Clock, Users, Zap } from "lucide-react";

// ─── Store Item Types ──────────────────────────────────────────────

type StoreCategory = "all" | "jeux" | "histoires" | "educatif" | "blagues" | "nouveautes";

interface StoreItem {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: StoreCategory;
  ageRange: string;
  tags: string[];
  isNew?: boolean;
  isPopular?: boolean;
  isFeatured?: boolean;
  size?: string;
}

// ─── Content Catalog ───────────────────────────────────────────────

const STORE_ITEMS: StoreItem[] = [
  // Jeux
  { id: "quiz_animaux", name: "Quiz Animaux", emoji: "🐾", description: "Devine l'animal à partir d'indices sonores et visuels. 50+ animaux à découvrir !", category: "jeux", ageRange: "4-10", tags: ["interactif", "vocal"], isPopular: true, size: "2 Mo" },
  { id: "devinettes", name: "Devinettes", emoji: "🤔", description: "Des centaines de devinettes adaptées à l'âge. Bobby donne des indices progressifs.", category: "jeux", ageRange: "5-12", tags: ["réflexion", "vocal"], size: "1 Mo" },
  { id: "vrai_faux", name: "Vrai ou Faux", emoji: "✅", description: "Apprends des faits incroyables en jouant ! Science, nature, histoire…", category: "jeux", ageRange: "5-12", tags: ["éducatif", "fun"], isNew: true, size: "1.5 Mo" },
  { id: "memory_game", name: "Mission Mémoire", emoji: "🧠", description: "10 niveaux de difficulté. Entraîne ta mémoire avec Bobby !", category: "jeux", ageRange: "4-10", tags: ["mémoire", "niveaux"], isPopular: true, size: "1 Mo" },
  // Éducatif
  { id: "quiz_sciences", name: "Quiz Sciences", emoji: "🔬", description: "Explore l'univers, le corps humain, les planètes et la nature.", category: "educatif", ageRange: "6-12", tags: ["sciences", "découverte"], isFeatured: true, size: "3 Mo" },
  { id: "maths_fun", name: "Maths Amusantes", emoji: "🔢", description: "Calcul mental, problèmes rigolos et défis mathématiques adaptés.", category: "educatif", ageRange: "5-10", tags: ["maths", "logique"], isNew: true, size: "2 Mo" },
  { id: "vocabulaire", name: "Mon Vocabulaire", emoji: "📝", description: "Enrichis ton vocabulaire avec des mots nouveaux chaque jour.", category: "educatif", ageRange: "4-8", tags: ["français", "mots"], size: "1.5 Mo" },
  { id: "geographie", name: "Tour du Monde", emoji: "🌍", description: "Découvre les pays, les capitales et les cultures du monde entier.", category: "educatif", ageRange: "6-12", tags: ["géographie", "culture"], isNew: true, size: "4 Mo" },
  // Histoires
  { id: "histoires_pirates", name: "Aventures Pirates", emoji: "🏴‍☠️", description: "12 histoires de pirates, trésors cachés et mers lointaines.", category: "histoires", ageRange: "4-10", tags: ["aventure", "narration"], isPopular: true, size: "8 Mo" },
  { id: "histoires_espace", name: "Missions Spatiales", emoji: "🚀", description: "Explore les galaxies avec Bobby. 10 aventures intergalactiques.", category: "histoires", ageRange: "5-12", tags: ["espace", "science-fiction"], isFeatured: true, size: "7 Mo" },
  { id: "histoires_princesses", name: "Contes Magiques", emoji: "👑", description: "Princesses, chevaliers et créatures enchantées. 15 contes.", category: "histoires", ageRange: "3-8", tags: ["magie", "contes"], isPopular: true, size: "9 Mo" },
  { id: "histoires_animaux", name: "Fables & Animaux", emoji: "🦁", description: "Des fables modernes avec des animaux attachants.", category: "histoires", ageRange: "3-8", tags: ["animaux", "morale"], size: "6 Mo" },
  { id: "histoires_mythologie", name: "Mythes & Légendes", emoji: "⚡", description: "Zeus, Hercule, Thor… les mythes adaptés aux enfants.", category: "histoires", ageRange: "7-12", tags: ["mythologie", "héros"], isNew: true, size: "5 Mo" },
  { id: "histoires_nuit", name: "Histoires du Soir", emoji: "🌙", description: "Des histoires douces et apaisantes pour s'endormir.", category: "histoires", ageRange: "3-8", tags: ["calme", "dodo"], isFeatured: true, size: "7 Mo" },
  // Blagues
  { id: "blagues_classic", name: "Blagues Classiques", emoji: "😂", description: "200+ blagues pour rire avec Bobby. Nouvelles chaque semaine !", category: "blagues", ageRange: "4-12", tags: ["humour", "rire"], isPopular: true, size: "500 Ko" },
  { id: "blagues_toctoc", name: "Toc Toc !", emoji: "🚪", description: "Les meilleures blagues « Toc Toc » interactives.", category: "blagues", ageRange: "3-8", tags: ["interactif", "toc-toc"], size: "300 Ko" },
  { id: "blagues_devinettes", name: "Devinettes Drôles", emoji: "🤣", description: "Des devinettes hilarantes à partager en famille.", category: "blagues", ageRange: "5-12", tags: ["devinette", "famille"], isNew: true, size: "400 Ko" },
];

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
  installedIds: string[];
  onToggleInstall: (id: string) => void;
  childAge?: number;
}

export default function BobbyStore({ installedIds, onToggleInstall, childAge = 7 }: BobbyStoreProps) {
  const [activeCategory, setActiveCategory] = useState<StoreCategory>("all");
  const [search, setSearch] = useState("");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    let items = STORE_ITEMS;

    if (activeCategory === "nouveautes") {
      items = items.filter(i => i.isNew);
    } else if (activeCategory !== "all") {
      items = items.filter(i => i.category === activeCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    return items;
  }, [activeCategory, search]);

  const featuredItems = useMemo(() => STORE_ITEMS.filter(i => i.isFeatured), []);
  const newCount = useMemo(() => STORE_ITEMS.filter(i => i.isNew).length, []);

  return (
    <div className="p-4 space-y-4" style={{ fontFamily: "'Nunito', sans-serif" }}>
      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un contenu…"
          className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-muted text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />
      </div>

      {/* Featured Banner — only on "all" tab */}
      {activeCategory === "all" && !search && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-accent/15 to-secondary/20 p-4 border border-primary/15">
          <div className="absolute top-2 right-2">
            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[9px] font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> FEATURED
            </span>
          </div>
          <h3 className="text-[14px] font-extrabold text-foreground mb-2">🌟 À découvrir</h3>
          <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1">
            {featuredItems.map(item => (
              <button
                key={item.id}
                onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                className="shrink-0 w-[110px] bg-card/80 backdrop-blur rounded-2xl p-3 text-center border border-border/30 hover:shadow-md transition-all active:scale-95"
              >
                <span className="text-3xl block mb-1">{item.emoji}</span>
                <p className="text-[10px] font-bold text-foreground leading-tight">{item.name}</p>
                <p className="text-[8px] text-muted-foreground mt-0.5">{item.ageRange} ans</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`shrink-0 px-3.5 py-2 rounded-2xl flex items-center gap-1.5 border-2 transition-all duration-200 active:scale-90 ${
              activeCategory === cat.id
                ? "border-primary bg-primary/10 shadow-md shadow-primary/15"
                : "border-transparent bg-gradient-to-br " + cat.color + " hover:border-primary/15"
            }`}
          >
            <span className="text-base">{cat.emoji}</span>
            <span className={`text-[11px] font-extrabold whitespace-nowrap ${activeCategory === cat.id ? "text-primary" : "text-foreground/70"}`}>
              {cat.label}
            </span>
            {cat.id === "nouveautes" && newCount > 0 && (
              <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-white text-[8px] font-bold flex items-center justify-center">
                {newCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-3 px-1">
        <span className="text-[11px] text-muted-foreground font-medium">
          {filteredItems.length} contenu{filteredItems.length > 1 ? "s" : ""}
        </span>
        <span className="text-[11px] text-primary font-bold">
          {installedIds.length} installé{installedIds.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-10">
          <span className="text-4xl block mb-2">🔍</span>
          <p className="text-sm text-muted-foreground">Aucun contenu trouvé</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredItems.map(item => {
            const installed = installedIds.includes(item.id);
            const expanded = expandedItem === item.id;

            return (
              <div
                key={item.id}
                className={`bg-card rounded-2xl border transition-all duration-200 overflow-hidden ${
                  expanded ? "border-primary/30 shadow-md" : "border-border/20 hover:border-border/40"
                }`}
              >
                {/* Main Row */}
                <button
                  onClick={() => setExpandedItem(expanded ? null : item.id)}
                  className="w-full flex items-center gap-3 p-3 text-left"
                >
                  {/* Icon */}
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shrink-0 text-3xl">
                    {item.emoji}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-[13px] font-extrabold text-foreground truncate">{item.name}</h4>
                      {item.isNew && (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-700 text-[8px] font-bold shrink-0">NEW</span>
                      )}
                      {item.isPopular && (
                        <Star className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{item.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                        <Users className="w-2.5 h-2.5" /> {item.ageRange} ans
                      </span>
                      <span className="text-[9px] text-muted-foreground">•</span>
                      <span className="text-[9px] text-muted-foreground">{item.size}</span>
                    </div>
                  </div>

                  {/* Install button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleInstall(item.id); }}
                    className={`shrink-0 w-[72px] h-[32px] rounded-xl text-[11px] font-bold transition-all duration-200 active:scale-90 flex items-center justify-center gap-1 ${
                      installed
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    }`}
                  >
                    {installed ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Installé
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        Installer
                      </>
                    )}
                  </button>
                </button>

                {/* Expanded Details */}
                {expanded && (
                  <div className="px-4 pb-3 pt-0 border-t border-border/15 space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-[11px] text-foreground/80 leading-relaxed mt-2">{item.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {item.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/8 text-primary text-[9px] font-semibold">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {item.ageRange} ans</span>
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {item.size}</span>
                      <span className="flex items-center gap-1">
                        {CATEGORIES.find(c => c.id === item.category)?.emoji} {CATEGORIES.find(c => c.id === item.category)?.label}
                      </span>
                    </div>
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
