import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Pencil, Trash2, Search, Brain, Lock,
  MessageSquare, BookOpen, Laugh, Gamepad2, Heart, Music,
  Star, Sparkles, Globe, Microscope, TreePine, Dog,
  GraduationCap, HelpCircle, LayoutGrid, List, ChevronRight,
} from "lucide-react";

const ACCESS_CODE = "bobby2026";

// ─── Category system ───────────────────────────────────────────────────
interface CategoryConfig {
  id: string;
  label: string;
  icon: typeof Brain;
  color: string;
  bgColor: string;
  description: string;
  dbCategories: string[]; // maps to knowledge_base.category values
}

const BRAIN_SECTIONS: CategoryConfig[] = [
  {
    id: "emotions",
    label: "Émotions",
    icon: Heart,
    color: "text-pink-400",
    bgColor: "bg-pink-500/20",
    description: "Réponses émotionnelles, réconfort, gestion des sentiments",
    dbCategories: ["émotion"],
  },
  {
    id: "histoires",
    label: "Histoires",
    icon: BookOpen,
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
    description: "Contes, aventures, histoires interactives",
    dbCategories: ["histoire"],
  },
  {
    id: "blagues",
    label: "Blagues",
    icon: Laugh,
    color: "text-green-400",
    bgColor: "bg-green-500/20",
    description: "Blagues, devinettes, humour pour enfants",
    dbCategories: ["blague"],
  },
  {
    id: "jeux",
    label: "Jeux & Quiz",
    icon: Gamepad2,
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    description: "Jeux vocaux, quiz, devinettes interactives",
    dbCategories: ["jeu", "activité"],
  },
  {
    id: "educatif",
    label: "Éducatif",
    icon: GraduationCap,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
    description: "Sciences, maths, géographie, histoire, nature",
    dbCategories: ["éducatif"],
  },
  {
    id: "general",
    label: "Conversations",
    icon: MessageSquare,
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    description: "Salutations, quotidien, discussions libres",
    dbCategories: ["général"],
  },
  {
    id: "chansons",
    label: "Chansons",
    icon: Music,
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/20",
    description: "Comptines, chansons, musique",
    dbCategories: ["chanson"],
  },
];

const ALL_DB_CATEGORIES = ["général", "jeu", "éducatif", "blague", "histoire", "émotion", "activité", "chanson"];

// ─── Types ─────────────────────────────────────────────────────────────
interface KBEntry {
  id: string;
  question: string;
  keywords: string[];
  answer: string;
  category: string;
  priority: number;
  is_active: boolean;
  age_min: number;
  age_max: number;
  usage_count: number;
  emotion: string;
  created_at: string;
}

// ─── Sub-components ────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof Brain; color: string }) {
  return (
    <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
          <p className="text-xs text-white/50">{label}</p>
        </div>
      </div>
    </div>
  );
}

function CategoryCard({
  config,
  count,
  activeCount,
  onClick,
}: {
  config: CategoryConfig;
  count: number;
  activeCount: number;
  onClick: () => void;
}) {
  const Icon = config.icon;
  return (
    <button
      onClick={onClick}
      className="bg-white/5 hover:bg-white/10 backdrop-blur rounded-xl p-5 border border-white/10 hover:border-white/20 transition-all duration-200 text-left group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${config.color}`} />
        </div>
        <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/50 transition-colors" />
      </div>
      <h3 className="text-white font-semibold text-sm mb-1">{config.label}</h3>
      <p className="text-white/40 text-xs mb-3 line-clamp-2">{config.description}</p>
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-white">{count}</span>
        <span className="text-[10px] text-white/40">entrées</span>
        {activeCount < count && (
          <span className="text-[10px] text-amber-400/70 ml-auto">{count - activeCount} inactives</span>
        )}
      </div>
    </button>
  );
}

function EntryRow({
  entry,
  onToggle,
  onEdit,
  onDelete,
}: {
  entry: KBEntry;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`bg-white/5 backdrop-blur rounded-xl p-4 border transition-all ${
        entry.is_active ? "border-white/10" : "border-red-500/30 opacity-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xs text-white/40 font-mono">P{entry.priority}</span>
            <span className="text-xs text-white/40">{entry.age_min}-{entry.age_max} ans</span>
            <span className="text-xs text-white/30">🔄 {entry.usage_count || 0}</span>
          </div>
          <p className="text-white font-medium text-sm">{entry.question}</p>
          <p className="text-white/40 text-xs mt-1 line-clamp-2">{entry.answer}</p>
          {entry.keywords.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {entry.keywords.slice(0, 6).map((k, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50">{k}</span>
              ))}
              {entry.keywords.length > 6 && <span className="text-[10px] text-white/30">+{entry.keywords.length - 6}</span>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Switch checked={entry.is_active} onCheckedChange={onToggle} className="scale-75" />
          <Button size="icon" variant="ghost" onClick={onEdit} className="text-white/40 hover:text-blue-400 w-8 h-8">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onDelete} className="text-white/40 hover:text-red-400 w-8 h-8">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────

const Admin = () => {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [code, setCode] = useState("");
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<Partial<KBEntry> | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("knowledge_base")
      .select("*")
      .order("priority", { ascending: false });
    if (error) {
      toast.error("Erreur chargement: " + error.message);
    } else {
      setEntries((data as unknown as KBEntry[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authenticated) fetchEntries();
  }, [authenticated, fetchEntries]);

  // ─── Derived data ───
  const categoryCounts = useMemo(() => {
    const counts: Record<string, { total: number; active: number }> = {};
    for (const section of BRAIN_SECTIONS) {
      const matching = entries.filter(e => section.dbCategories.includes(e.category));
      counts[section.id] = {
        total: matching.length,
        active: matching.filter(e => e.is_active).length,
      };
    }
    return counts;
  }, [entries]);

  const currentSection = BRAIN_SECTIONS.find(s => s.id === activeSection);

  const sectionEntries = useMemo(() => {
    if (!currentSection) return [];
    let list = entries.filter(e => currentSection.dbCategories.includes(e.category));
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(e =>
        e.question.toLowerCase().includes(s) ||
        e.answer.toLowerCase().includes(s) ||
        e.keywords.some(k => k.toLowerCase().includes(s))
      );
    }
    return list;
  }, [entries, currentSection, search]);

  const globalSearchResults = useMemo(() => {
    if (!search.trim() || activeSection) return [];
    const s = search.toLowerCase();
    return entries.filter(e =>
      e.question.toLowerCase().includes(s) ||
      e.answer.toLowerCase().includes(s) ||
      e.keywords.some(k => k.toLowerCase().includes(s))
    ).slice(0, 50);
  }, [entries, search, activeSection]);

  // ─── Handlers ───
  const handleSave = async () => {
    if (!editingEntry?.question?.trim() || !editingEntry?.answer?.trim()) {
      toast.error("Question et réponse sont requis");
      return;
    }
    setSaving(true);
    const payload = {
      question: editingEntry.question!.trim(),
      keywords: editingEntry.keywords || [],
      answer: editingEntry.answer!.trim(),
      category: editingEntry.category || "général",
      priority: editingEntry.priority || 5,
      is_active: editingEntry.is_active !== false,
      age_min: editingEntry.age_min || 3,
      age_max: editingEntry.age_max || 12,
    };

    if (editingEntry.id) {
      const { error } = await supabase.from("knowledge_base").update(payload as any).eq("id", editingEntry.id);
      if (error) toast.error(error.message);
      else toast.success("Mis à jour !");
    } else {
      const { error } = await supabase.from("knowledge_base").insert(payload as any);
      if (error) toast.error(error.message);
      else toast.success("Ajouté !");
    }
    setEditingEntry(null);
    setSaving(false);
    fetchEntries();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette entrée ?")) return;
    const { error } = await supabase.from("knowledge_base").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Supprimé");
      fetchEntries();
    }
  };

  const handleToggleActive = async (entry: KBEntry) => {
    await supabase.from("knowledge_base").update({ is_active: !entry.is_active } as any).eq("id", entry.id);
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, is_active: !e.is_active } : e));
  };

  // ─── Login ──────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(240,60%,8%)] to-[hsl(250,40%,15%)] flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-sm text-center space-y-4 border border-white/10">
          <Lock className="w-12 h-12 text-purple-400 mx-auto" />
          <h1 className="text-xl font-bold text-white">Admin Bobby</h1>
          <p className="text-white/60 text-sm">Code d'accès administrateur</p>
          <Input
            type="password"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="••••••••"
            className="bg-white/10 border-white/20 text-white text-center text-lg tracking-widest"
            onKeyDown={e => {
              if (e.key === "Enter") {
                if (code === ACCESS_CODE) setAuthenticated(true);
                else toast.error("Code incorrect");
              }
            }}
          />
          <Button
            onClick={() => {
              if (code === ACCESS_CODE) setAuthenticated(true);
              else toast.error("Code incorrect");
            }}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            Accéder
          </Button>
        </div>
      </div>
    );
  }

  // ─── Edit form ──────────────────────────────────────────────────────
  if (editingEntry) {
    const kwString = (editingEntry.keywords || []).join(", ");
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(240,60%,8%)] to-[hsl(250,40%,15%)] p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <Button variant="ghost" onClick={() => setEditingEntry(null)} className="text-white/70">
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
          </Button>
          <h2 className="text-xl font-bold text-white">
            {editingEntry.id ? "Modifier" : "Nouvelle"} interaction
          </h2>

          <div className="space-y-4 bg-white/5 backdrop-blur rounded-xl p-5 border border-white/10">
            <div>
              <label className="text-white/60 text-xs font-medium mb-1 block">Question / Déclencheur</label>
              <Textarea
                value={editingEntry.question || ""}
                onChange={e => setEditingEntry({ ...editingEntry, question: e.target.value })}
                placeholder="Ex: C'est quoi un dinosaure ?"
                className="bg-white/10 border-white/20 text-white min-h-[80px]"
              />
            </div>

            <div>
              <label className="text-white/60 text-xs font-medium mb-1 block">Mots-clés (virgules)</label>
              <Input
                value={kwString}
                onChange={e => setEditingEntry({ ...editingEntry, keywords: e.target.value.split(",").map(k => k.trim()).filter(Boolean) })}
                placeholder="dinosaure, dino, préhistoire"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <div>
              <label className="text-white/60 text-xs font-medium mb-1 block">Réponse de Bobby</label>
              <Textarea
                value={editingEntry.answer || ""}
                onChange={e => setEditingEntry({ ...editingEntry, answer: e.target.value })}
                placeholder="Les dinosaures étaient des animaux géants…"
                className="bg-white/10 border-white/20 text-white min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/60 text-xs font-medium mb-1 block">Catégorie</label>
                <Select
                  value={editingEntry.category || "général"}
                  onValueChange={v => setEditingEntry({ ...editingEntry, category: v })}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_DB_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-white/60 text-xs font-medium mb-1 block">Priorité (1-10)</label>
                <Input
                  type="number" min={1} max={10}
                  value={editingEntry.priority || 5}
                  onChange={e => setEditingEntry({ ...editingEntry, priority: Number(e.target.value) })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/60 text-xs font-medium mb-1 block">Âge min</label>
                <Input
                  type="number" min={3} max={12}
                  value={editingEntry.age_min || 3}
                  onChange={e => setEditingEntry({ ...editingEntry, age_min: Number(e.target.value) })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <label className="text-white/60 text-xs font-medium mb-1 block">Âge max</label>
                <Input
                  type="number" min={3} max={12}
                  value={editingEntry.age_max || 12}
                  onChange={e => setEditingEntry({ ...editingEntry, age_max: Number(e.target.value) })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={editingEntry.is_active !== false}
                onCheckedChange={v => setEditingEntry({ ...editingEntry, is_active: v })}
              />
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

  // ─── Category detail view ──────────────────────────────────────────
  if (activeSection && currentSection) {
    const Icon = currentSection.icon;
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(240,60%,8%)] to-[hsl(250,40%,15%)] p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => { setActiveSection(null); setSearch(""); }} className="text-white/70 p-2">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className={`w-10 h-10 rounded-xl ${currentSection.bgColor} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${currentSection.color}`} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{currentSection.label}</h1>
                <p className="text-white/40 text-xs">{sectionEntries.length} entrées</p>
              </div>
            </div>
            <Button
              onClick={() => setEditingEntry({
                keywords: [],
                category: currentSection.dbCategories[0],
                priority: 5,
                is_active: true,
                age_min: 3,
                age_max: 12,
              })}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-1" /> Ajouter
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Rechercher dans ${currentSection.label.toLowerCase()}…`}
              className="bg-white/10 border-white/20 text-white pl-9"
            />
          </div>

          {/* Entries */}
          {loading ? (
            <div className="text-center text-white/50 py-12">Chargement…</div>
          ) : sectionEntries.length === 0 ? (
            <div className="text-center text-white/40 py-16">
              <Icon className={`w-12 h-12 mx-auto mb-3 ${currentSection.color} opacity-30`} />
              <p className="text-sm">Aucune entrée {search ? "trouvée" : "dans cette catégorie"}</p>
              <Button
                variant="ghost"
                className="mt-3 text-purple-400"
                onClick={() => setEditingEntry({
                  keywords: [],
                  category: currentSection.dbCategories[0],
                  priority: 5,
                  is_active: true,
                  age_min: 3,
                  age_max: 12,
                })}
              >
                <Plus className="w-4 h-4 mr-1" /> Créer la première
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {sectionEntries.map(entry => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  onToggle={() => handleToggleActive(entry)}
                  onEdit={() => setEditingEntry(entry)}
                  onDelete={() => handleDelete(entry.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Dashboard (main view) ─────────────────────────────────────────
  const totalActive = entries.filter(e => e.is_active).length;
  const totalUsage = entries.reduce((sum, e) => sum + (e.usage_count || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(240,60%,8%)] to-[hsl(250,40%,15%)] p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/")} className="text-white/70 p-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-11 h-11 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Brain className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Cerveau Bobby</h1>
              <p className="text-white/40 text-xs">Centre de gestion de l'intelligence</p>
            </div>
          </div>
          <Button
            onClick={() => setEditingEntry({ keywords: [], category: "général", priority: 5, is_active: true, age_min: 3, age_max: 12 })}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-1" /> Ajouter
          </Button>
        </div>

        {/* Global search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher dans tout le cerveau…"
            className="bg-white/10 border-white/20 text-white pl-9"
          />
        </div>

        {/* Global search results */}
        {globalSearchResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-white/50 text-xs font-medium">{globalSearchResults.length} résultats</p>
            {globalSearchResults.map(entry => (
              <EntryRow
                key={entry.id}
                entry={entry}
                onToggle={() => handleToggleActive(entry)}
                onEdit={() => setEditingEntry(entry)}
                onDelete={() => handleDelete(entry.id)}
              />
            ))}
          </div>
        )}

        {/* Stats overview */}
        {!search && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total entrées" value={entries.length} icon={Brain} color="bg-purple-500/30" />
              <StatCard label="Actives" value={totalActive} icon={Sparkles} color="bg-green-500/30" />
              <StatCard label="Catégories" value={BRAIN_SECTIONS.length} icon={LayoutGrid} color="bg-blue-500/30" />
              <StatCard label="Utilisations" value={totalUsage} icon={Star} color="bg-amber-500/30" />
            </div>

            {/* Offline brain stats */}
            <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
              <h3 className="text-white/70 text-xs font-semibold mb-2 uppercase tracking-wider">Cerveau Offline (embarqué)</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-lg font-bold text-cyan-400">10 000+</p>
                  <p className="text-[10px] text-white/40">Interactions 10K</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-amber-400">538</p>
                  <p className="text-[10px] text-white/40">QA Database</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-pink-400">300+</p>
                  <p className="text-[10px] text-white/40">Blagues embarquées</p>
                </div>
              </div>
              <p className="text-[10px] text-white/30 mt-2">Ces données sont embarquées dans l'app et fonctionnent sans internet. Les entrées ci-dessous (cloud) complètent le cerveau offline.</p>
            </div>

            {/* Category grid */}
            <div>
              <h2 className="text-white/60 text-xs font-semibold mb-3 uppercase tracking-wider">Catégories du cerveau cloud</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {BRAIN_SECTIONS.map(section => (
                  <CategoryCard
                    key={section.id}
                    config={section}
                    count={categoryCounts[section.id]?.total ?? 0}
                    activeCount={categoryCounts[section.id]?.active ?? 0}
                    onClick={() => { setActiveSection(section.id); setSearch(""); }}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;
