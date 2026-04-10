import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, Search, Brain, Lock } from "lucide-react";

const ACCESS_CODE = "bobby2026";

const CATEGORIES = ["général", "jeu", "éducatif", "blague", "histoire", "émotion", "activité", "chanson"];

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
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [code, setCode] = useState("");
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [editingEntry, setEditingEntry] = useState<Partial<KBEntry> | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchEntries = async () => {
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
  };

  useEffect(() => {
    if (authenticated) fetchEntries();
  }, [authenticated]);

  const filtered = useMemo(() => {
    let list = entries;
    if (filterCat !== "all") list = list.filter(e => e.category === filterCat);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(e =>
        e.question.toLowerCase().includes(s) ||
        e.answer.toLowerCase().includes(s) ||
        e.keywords.some(k => k.toLowerCase().includes(s))
      );
    }
    return list;
  }, [entries, filterCat, search]);

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
      const { error } = await supabase
        .from("knowledge_base")
        .update(payload as any)
        .eq("id", editingEntry.id);
      if (error) toast.error(error.message);
      else toast.success("Mis à jour !");
    } else {
      const { error } = await supabase
        .from("knowledge_base")
        .insert(payload as any);
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
    await supabase
      .from("knowledge_base")
      .update({ is_active: !entry.is_active } as any)
      .eq("id", entry.id);
    fetchEntries();
  };

  // ─── Login gate ─────────────────────────────────
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a2e] to-[#1a1a4e] flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-sm text-center space-y-4">
          <Lock className="w-12 h-12 text-purple-400 mx-auto" />
          <h1 className="text-xl font-bold text-white">Admin Bobby</h1>
          <p className="text-white/60 text-sm">Entre le code d'accès</p>
          <Input
            type="password"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Code d'accès"
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

  // ─── Edit form ──────────────────────────────────
  if (editingEntry) {
    const kwString = (editingEntry.keywords || []).join(", ");
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a2e] to-[#1a1a4e] p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <Button variant="ghost" onClick={() => setEditingEntry(null)} className="text-white/70">
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
          </Button>
          <h2 className="text-xl font-bold text-white">
            {editingEntry.id ? "Modifier" : "Nouvelle"} interaction
          </h2>

          <div className="space-y-3 bg-white/10 backdrop-blur rounded-xl p-4">
            <label className="text-white/70 text-sm">Question / Déclencheur</label>
            <Textarea
              value={editingEntry.question || ""}
              onChange={e => setEditingEntry({ ...editingEntry, question: e.target.value })}
              placeholder="Ex: C'est quoi un dinosaure ?"
              className="bg-white/10 border-white/20 text-white min-h-[80px]"
            />

            <label className="text-white/70 text-sm">Mots-clés (séparés par des virgules)</label>
            <Input
              value={kwString}
              onChange={e => setEditingEntry({ ...editingEntry, keywords: e.target.value.split(",").map(k => k.trim()).filter(Boolean) })}
              placeholder="dinosaure, dino, préhistoire"
              className="bg-white/10 border-white/20 text-white"
            />

            <label className="text-white/70 text-sm">Réponse de Bobby</label>
            <Textarea
              value={editingEntry.answer || ""}
              onChange={e => setEditingEntry({ ...editingEntry, answer: e.target.value })}
              placeholder="Les dinosaures étaient des animaux géants qui vivaient il y a très longtemps !"
              className="bg-white/10 border-white/20 text-white min-h-[100px]"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/70 text-sm">Catégorie</label>
                <Select
                  value={editingEntry.category || "général"}
                  onValueChange={v => setEditingEntry({ ...editingEntry, category: v })}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-white/70 text-sm">Priorité (1-10)</label>
                <Input
                  type="number"
                  min={1} max={10}
                  value={editingEntry.priority || 5}
                  onChange={e => setEditingEntry({ ...editingEntry, priority: Number(e.target.value) })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/70 text-sm">Âge min</label>
                <Input
                  type="number" min={3} max={12}
                  value={editingEntry.age_min || 3}
                  onChange={e => setEditingEntry({ ...editingEntry, age_min: Number(e.target.value) })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <label className="text-white/70 text-sm">Âge max</label>
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
              <span className="text-white/70 text-sm">Actif</span>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full bg-green-600 hover:bg-green-700 text-white">
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>
    );
  }

  // ─── Main list ──────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a2e] to-[#1a1a4e] p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/")} className="text-white/70 p-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Brain className="w-7 h-7 text-purple-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Cerveau Bobby</h1>
              <p className="text-white/50 text-xs">{entries.length} interactions</p>
            </div>
          </div>
          <Button onClick={() => setEditingEntry({ keywords: [], category: "général", priority: 5, is_active: true, age_min: 3, age_max: 12 })} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-1" /> Ajouter
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="bg-white/10 border-white/20 text-white pl-9"
            />
          </div>
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white w-36">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Entries list */}
        {loading ? (
          <div className="text-center text-white/50 py-12">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-white/50 py-12">
            {entries.length === 0 ? "Aucune interaction. Commence par en ajouter !" : "Aucun résultat"}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(entry => (
              <div
                key={entry.id}
                className={`bg-white/5 backdrop-blur rounded-xl p-4 border transition-all ${
                  entry.is_active ? "border-white/10" : "border-red-500/30 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300">{entry.category}</span>
                      <span className="text-xs text-white/40">P{entry.priority}</span>
                      <span className="text-xs text-white/40">{entry.age_min}-{entry.age_max} ans</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300" title="Nombre d'utilisations">🔄 {entry.usage_count || 0}</span>
                      {!entry.is_active && <span className="text-xs text-red-400">Désactivé</span>}
                    </div>
                    <p className="text-white font-medium text-sm truncate">{entry.question}</p>
                    <p className="text-white/50 text-xs mt-1 line-clamp-2">{entry.answer}</p>
                    {entry.keywords.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {entry.keywords.slice(0, 5).map((k, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50">{k}</span>
                        ))}
                        {entry.keywords.length > 5 && <span className="text-[10px] text-white/30">+{entry.keywords.length - 5}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => handleToggleActive(entry)} className="text-white/50 hover:text-white w-8 h-8">
                      <Switch checked={entry.is_active} className="pointer-events-none scale-75" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditingEntry(entry)} className="text-white/50 hover:text-blue-400 w-8 h-8">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(entry.id)} className="text-white/50 hover:text-red-400 w-8 h-8">
                      <Trash2 className="w-4 h-4" />
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
};

export default Admin;
