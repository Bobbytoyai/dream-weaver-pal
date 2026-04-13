import { useState, useEffect, useMemo, useCallback } from "react";
import ExpressionPreview from "@/components/ExpressionPreview";
import AutoLearnPanel from "@/components/AutoLearnPanel";
import AdminDetailDialog, { type DetailItem, type DetailField } from "@/components/AdminDetailDialog";
import AdminStoreManager from "@/components/AdminStoreManager";
import { createPortal } from "react-dom";
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
  GraduationCap, HelpCircle, LayoutGrid, ChevronRight,
  Dumbbell, Lightbulb, Home, Utensils, Palette, Cpu,
  CloudLightning, Eye, Users, Zap,
} from "lucide-react";

// Lazy import — the 10K file is huge, only load when needed
import type { BobbyInteraction } from "@/lib/bobby_interactions_10k";
import { BLAGUES } from "@/lib/bobby-content/blagues";
import { HISTOIRES, type Histoire } from "@/lib/bobby-content/histoires";
import { CHANSONS, CHANSON_CATEGORIES, type Chanson, type ChansonCategorie } from "@/lib/bobby-content/chansons";
import { QA_DATABASE } from "@/lib/qa-database";
import { BOBBY_MULTI_RESPONSES } from "@/lib/responseSelector";
import {
  QUIZ_ANIMAUX, QUIZ_EDUCATIF, VRAI_FAUX, DEVINETTES,
  BLAGUES as GAME_BLAGUES,
  type QuizQuestion, type TrueFalseQuestion, type Riddle,
} from "@/lib/gameEngine";
import {
  BOBBY_PERSONALITY,
  BOBBY_NATURAL_REACTIONS,
  SILENCE_RELAUNCHES,
  WELCOME_PHRASES,
  FAREWELL_PHRASES,
} from "@/lib/bobby-content/cerveau";

const ACCESS_CODE = "bobby2026";

// ─── 10K Interaction categories (matching actual data) ───────────────
const INTERACTION_CATEGORIES: {
  id: string;
  label: string;
  icon: typeof Brain;
  color: string;
  bgColor: string;
  emoji: string;
}[] = [
  { id: "emotions", label: "Émotions", icon: Heart, color: "text-pink-400", bgColor: "bg-pink-500/20", emoji: "💛" },
  { id: "social", label: "Social", icon: Users, color: "text-rose-400", bgColor: "bg-rose-500/20", emoji: "👥" },
  { id: "family", label: "Famille", icon: Home, color: "text-orange-400", bgColor: "bg-orange-500/20", emoji: "👨‍👩‍👧" },
  { id: "animals", label: "Animaux", icon: Dog, color: "text-amber-400", bgColor: "bg-amber-500/20", emoji: "🐾" },
  { id: "nature", label: "Nature", icon: TreePine, color: "text-green-400", bgColor: "bg-green-500/20", emoji: "🌿" },
  { id: "sport", label: "Sport", icon: Dumbbell, color: "text-blue-400", bgColor: "bg-blue-500/20", emoji: "⚽" },
  { id: "music", label: "Musique", icon: Music, color: "text-indigo-400", bgColor: "bg-indigo-500/20", emoji: "🎵" },
  { id: "humor", label: "Humour", icon: Laugh, color: "text-yellow-400", bgColor: "bg-yellow-500/20", emoji: "😂" },
  { id: "education", label: "Éducation", icon: GraduationCap, color: "text-cyan-400", bgColor: "bg-cyan-500/20", emoji: "📚" },
  { id: "school", label: "École", icon: GraduationCap, color: "text-teal-400", bgColor: "bg-teal-500/20", emoji: "🏫" },
  { id: "games", label: "Jeux", icon: Gamepad2, color: "text-purple-400", bgColor: "bg-purple-500/20", emoji: "🎮" },
  { id: "imagination", label: "Imagination", icon: Lightbulb, color: "text-orange-400", bgColor: "bg-orange-500/20", emoji: "💡" },
  { id: "dreams", label: "Rêves", icon: CloudLightning, color: "text-violet-400", bgColor: "bg-violet-500/20", emoji: "🌙" },
  { id: "stories", label: "Histoires", icon: BookOpen, color: "text-purple-400", bgColor: "bg-purple-500/20", emoji: "📖" },
  { id: "support", label: "Soutien", icon: Heart, color: "text-red-400", bgColor: "bg-red-500/20", emoji: "🤗" },
  { id: "wellbeing", label: "Bien-être", icon: Zap, color: "text-emerald-400", bgColor: "bg-emerald-500/20", emoji: "🌈" },
  { id: "health", label: "Santé", icon: Heart, color: "text-emerald-400", bgColor: "bg-emerald-500/20", emoji: "🩺" },
  { id: "friendship", label: "Amitié", icon: Users, color: "text-pink-400", bgColor: "bg-pink-500/20", emoji: "🤝" },
];

// ─── Age groups ─────────────────────────────────────────────────────
const AGE_GROUPS = [
  { label: "Tous", min: 3, max: 12 },
  { label: "3-5 ans", min: 3, max: 5 },
  { label: "6-8 ans", min: 6, max: 8 },
  { label: "9-10 ans", min: 9, max: 10 },
  { label: "11-12 ans", min: 11, max: 12 },
];

// ─── Cloud KB categories ────────────────────────────────────────────
interface CategoryConfig {
  id: string;
  label: string;
  icon: typeof Brain;
  color: string;
  bgColor: string;
  description: string;
  dbCategories: string[];
}

const BRAIN_SECTIONS: CategoryConfig[] = [
  { id: "educatif", label: "Éducatif", icon: GraduationCap, color: "text-cyan-400", bgColor: "bg-cyan-500/20", description: "Sciences, maths, géographie, espace", dbCategories: ["éducatif"] },
  { id: "emotions", label: "Émotions", icon: Heart, color: "text-pink-400", bgColor: "bg-pink-500/20", description: "Réponses émotionnelles, réconfort", dbCategories: ["émotions"] },
  { id: "general", label: "Conversations", icon: MessageSquare, color: "text-purple-400", bgColor: "bg-purple-500/20", description: "Salutations, discussions, méta", dbCategories: ["général", "méta"] },
  { id: "memoire", label: "Mémoire", icon: Brain, color: "text-violet-400", bgColor: "bg-violet-500/20", description: "Mémoire, rappels, souvenirs", dbCategories: ["mémoire"] },
  { id: "imagination", label: "Imagination", icon: Lightbulb, color: "text-orange-400", bgColor: "bg-orange-500/20", description: "Créativité, histoires inventées", dbCategories: ["imagination"] },
  { id: "logique", label: "Logique", icon: Cpu, color: "text-teal-400", bgColor: "bg-teal-500/20", description: "Raisonnement, puzzles, décision", dbCategories: ["logique", "décision"] },
  { id: "animaux", label: "Animaux", icon: Dog, color: "text-amber-400", bgColor: "bg-amber-500/20", description: "Animaux, nature", dbCategories: ["animaux", "nature"] },
  { id: "famille", label: "Famille", icon: Home, color: "text-rose-400", bgColor: "bg-rose-500/20", description: "Famille, social, amitié", dbCategories: ["famille", "social"] },
  { id: "nourriture", label: "Nourriture", icon: Utensils, color: "text-green-400", bgColor: "bg-green-500/20", description: "Repas, goûts, alimentation", dbCategories: ["nourriture"] },
  { id: "opinion", label: "Opinions", icon: Star, color: "text-yellow-400", bgColor: "bg-yellow-500/20", description: "Avis, préférences, goûts", dbCategories: ["opinion", "Tu préfères lequel ?"] },
  { id: "quotidien", label: "Quotidien", icon: Home, color: "text-blue-400", bgColor: "bg-blue-500/20", description: "Routine, journée, habitudes", dbCategories: ["quotidien", "routine"] },
  { id: "jeux", label: "Jeux & Activités", icon: Gamepad2, color: "text-blue-400", bgColor: "bg-blue-500/20", description: "Jeux, activités ludiques", dbCategories: ["jeux", "activité", "ludique"] },
  { id: "motivation", label: "Motivation", icon: Zap, color: "text-emerald-400", bgColor: "bg-emerald-500/20", description: "Encouragement, motivation", dbCategories: ["motivation"] },
  { id: "ecole", label: "École", icon: GraduationCap, color: "text-teal-400", bgColor: "bg-teal-500/20", description: "École, apprentissage scolaire", dbCategories: ["école"] },
  { id: "espace", label: "Espace", icon: Globe, color: "text-indigo-400", bgColor: "bg-indigo-500/20", description: "Espace, astronomie, planètes", dbCategories: ["espace"] },
  { id: "humour", label: "Humour", icon: Laugh, color: "text-yellow-400", bgColor: "bg-yellow-500/20", description: "Blagues, rires", dbCategories: ["humour"] },
  { id: "securite", label: "Sécurité", icon: Eye, color: "text-red-400", bgColor: "bg-red-500/20", description: "Protection, sécurité enfant", dbCategories: ["sécurité"] },
];

const ALL_DB_CATEGORIES = [
  "général", "éducatif", "émotions", "mémoire", "imagination", "logique", "décision",
  "animaux", "nature", "famille", "social", "nourriture", "opinion", "Tu préfères lequel ?",
  "quotidien", "routine", "jeux", "activité", "ludique", "motivation", "école", "espace",
  "humour", "sécurité", "méta",
];

// ─── Types ─────────────────────────────────────────────────────────
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

// ─── Top-level brain sections shown as big square cards ─────────────
type TopSection = "interactions" | "multiresponses" | "qa" | "blagues" | "histoires" | "cerveau" | "cloud" | "jeux" | "chansons" | "store" | "expressions" | "autolearn" | "cloudusers";

// Counts are computed dynamically below in the component
const TOP_SECTIONS_CONFIG: {
  id: TopSection;
  label: string;
  icon: typeof Brain;
  color: string;
  bgColor: string;
  desc: string;
  emoji: string;
}[] = [
  { id: "interactions", label: "Interactions", icon: MessageSquare, color: "text-cyan-400", bgColor: "bg-cyan-500/20", desc: "Base d'interactions enfant par âge & catégorie", emoji: "🧠" },
  { id: "multiresponses", label: "Multi-Réponses", icon: Zap, color: "text-orange-400", bgColor: "bg-orange-500/20", desc: "Réponses adaptatives multi-tags (offline)", emoji: "⚡" },
  { id: "jeux", label: "Jeux & Quiz", icon: Gamepad2, color: "text-blue-400", bgColor: "bg-blue-500/20", desc: "Quiz animaux, sciences, vrai/faux, devinettes", emoji: "🎮" },
  { id: "qa", label: "QA Database", icon: HelpCircle, color: "text-amber-400", bgColor: "bg-amber-500/20", desc: "Questions-réponses offline structurées", emoji: "❓" },
  { id: "blagues", label: "Blagues", icon: Laugh, color: "text-green-400", bgColor: "bg-green-500/20", desc: "Blagues adaptées par âge & catégorie", emoji: "😂" },
  { id: "histoires", label: "Histoires", icon: BookOpen, color: "text-purple-400", bgColor: "bg-purple-500/20", desc: "Contes & aventures personnalisées", emoji: "📖" },
  { id: "chansons", label: "Chansons", icon: Music, color: "text-rose-400", bgColor: "bg-rose-500/20", desc: "Comptines, berceuses, éducatif, activités", emoji: "🎵" },
  { id: "cerveau", label: "Personnalité", icon: Sparkles, color: "text-pink-400", bgColor: "bg-pink-500/20", desc: "Personnalité, réactions, phrases Bobby", emoji: "✨" },
  { id: "cloud", label: "Cloud KB", icon: Globe, color: "text-blue-400", bgColor: "bg-blue-500/20", desc: "Base cloud extensible (ajout via admin)", emoji: "☁️" },
  { id: "store", label: "Bobby Store", icon: Star, color: "text-emerald-400", bgColor: "bg-emerald-500/20", desc: "Gérer le catalogue du store (CRUD)", emoji: "🛒" },
  { id: "expressions", label: "Expressions", icon: Eye, color: "text-fuchsia-400", bgColor: "bg-fuchsia-500/20", desc: "Preview & test des expressions faciales", emoji: "🎭" },
  { id: "autolearn", label: "Auto-Learning", icon: Microscope, color: "text-lime-400", bgColor: "bg-lime-500/20", desc: "IA auto-complétion depuis les conversations", emoji: "🧬" },
  { id: "cloudusers", label: "Bobby Cloud", icon: Users, color: "text-sky-400", bgColor: "bg-sky-500/20", desc: "Utilisateurs Bobby Cloud, profils sync", emoji: "☁️👥" },
];

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function SquareCard({ label, emoji, count, desc, color, bgColor, onClick }: {
  label: string; emoji: string; count: string | number; desc: string;
  color: string; bgColor: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-xl rounded-[20px] p-4 border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 text-left flex flex-col justify-between group active:scale-[0.97] hover:shadow-lg hover:shadow-black/20"
      style={{ aspectRatio: "1" }}
    >
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-2xl ${bgColor} flex items-center justify-center`}>
          <span className="text-2xl">{emoji}</span>
        </div>
      </div>
      <div>
        <p className="text-[22px] font-bold text-white tracking-tight">{count}</p>
        <h3 className={`text-[13px] font-semibold ${color} mt-0.5`}>{label}</h3>
        <p className="text-[10px] text-white/30 mt-0.5 line-clamp-2 leading-tight">{desc}</p>
      </div>
    </button>
  );
}

function InteractionCard({ interaction }: { interaction: BobbyInteraction }) {
  return (
    <div className="bg-white/[0.04] backdrop-blur-xl rounded-[16px] p-4 border border-white/[0.06] hover:bg-white/[0.06] transition-all">
      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
        <span className="text-[10px] px-2.5 py-1 rounded-xl bg-cyan-500/15 text-cyan-300 font-semibold">{interaction.category}</span>
        <span className="text-[10px] px-2.5 py-1 rounded-xl bg-purple-500/15 text-purple-300 font-semibold">{interaction.age} ans</span>
        <span className="text-[10px] px-2.5 py-1 rounded-xl bg-pink-500/15 text-pink-300 font-semibold">{interaction.emotion}</span>
        <span className="text-[10px] text-white/20 ml-auto font-mono">Niv.{interaction.difficulty_level}</span>
      </div>
      <div className="space-y-2">
        <div className="flex gap-2.5">
          <span className="text-[11px] shrink-0 mt-0.5">👦</span>
          <p className="text-[13px] text-white/80 leading-relaxed">{interaction.child_input}</p>
        </div>
        <div className="flex gap-2.5">
          <span className="text-[11px] shrink-0 mt-0.5">🤖</span>
          <p className="text-[13px] text-white/50 leading-relaxed">{interaction.ai_response}</p>
        </div>
      </div>
    </div>
  );
}

function EntryRow({ entry, onToggle, onEdit, onDelete }: {
  entry: KBEntry; onToggle: () => void; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className={`bg-white/[0.04] backdrop-blur-xl rounded-[16px] p-4 border transition-all ${entry.is_active ? "border-white/[0.06]" : "border-red-500/20 opacity-40"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] px-2 py-1 rounded-lg bg-amber-500/15 text-amber-300 font-mono font-bold">P{entry.priority}</span>
            <span className="text-[10px] text-white/30">{entry.age_min}-{entry.age_max} ans</span>
            <span className="text-[10px] text-white/20">🔄 {entry.usage_count || 0}</span>
          </div>
          <p className="text-white font-medium text-[13px] leading-relaxed">{entry.question}</p>
          <p className="text-white/30 text-[12px] mt-1 line-clamp-2">{entry.answer}</p>
          {entry.keywords.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {entry.keywords.slice(0, 6).map((k, i) => (
                <span key={i} className="text-[9px] px-2 py-0.5 rounded-lg bg-white/[0.06] text-white/40">{k}</span>
              ))}
              {entry.keywords.length > 6 && <span className="text-[10px] text-white/20">+{entry.keywords.length - 6}</span>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Switch checked={entry.is_active} onCheckedChange={onToggle} className="scale-75" />
          <Button size="icon" variant="ghost" onClick={onEdit} className="text-white/30 hover:text-blue-400 w-8 h-8">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onDelete} className="text-white/30 hover:text-red-400 w-8 h-8">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN ADMIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

const Admin = () => {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [code, setCode] = useState("");

  // Cloud KB
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingEntry, setEditingEntry] = useState<Partial<KBEntry> | null>(null);
  const [saving, setSaving] = useState(false);

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

  // Store management
  interface StoreContentItem {
    id: string; slug: string; name: string; emoji: string; description: string;
    category: string; age_min: number; age_max: number; tags: string[];
    size_label: string; is_new: boolean; is_popular: boolean; is_featured: boolean;
    is_active: boolean; version: number; install_count: number; created_at: string;
  }
  const [storeItems, setStoreItems] = useState<StoreContentItem[]>([]);
  const [editingStoreItem, setEditingStoreItem] = useState<Partial<StoreContentItem> | null>(null);
  const [savingStoreItem, setSavingStoreItem] = useState(false);
  const [liveInstallCounts, setLiveInstallCounts] = useState<Record<string, number>>({});
  const [detailItem, setDetailItem] = useState<DetailItem | null>(null);

  // Bobby Cloud Users
  interface CloudUser {
    id: string; sync_code: string; child_name: string; parent_settings: any;
    child_memory_snapshot: any; device_info: string | null;
    last_synced_at: string; created_at: string; updated_at: string;
  }
  const [cloudUsers, setCloudUsers] = useState<CloudUser[]>([]);
  const [cloudUsersLoading, setCloudUsersLoading] = useState(false);
  const [cloudUserSearch, setCloudUserSearch] = useState("");
  const [selectedCloudUser, setSelectedCloudUser] = useState<CloudUser | null>(null);

  const fetchCloudUsers = useCallback(async () => {
    setCloudUsersLoading(true);
    const { data } = await supabase.from("cloud_profiles").select("*").order("created_at", { ascending: false });
    setCloudUsers((data as unknown as CloudUser[]) || []);
    setCloudUsersLoading(false);
  }, []);

  // ─── Detail dialog helpers ─────────────────────────────────────
  const openInteractionDetail = (interaction: BobbyInteraction) => {
    setDetailItem({
      type: "interaction",
      title: interaction.child_input.slice(0, 60),
      emoji: "🧠",
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
  };

  const openStoreDetail = (item: StoreContentItem) => {
    setDetailItem({
      type: "store",
      title: item.name,
      emoji: item.emoji,
      id: item.id,
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
  };

  const openKBDetail = (entry: KBEntry) => {
    setDetailItem({
      type: "kb",
      title: entry.question.slice(0, 60),
      emoji: "☁️",
      id: entry.id,
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
  };

  const openQADetail = (entry: typeof QA_DATABASE[0]) => {
    setDetailItem({
      type: "qa",
      title: entry.triggers[0]?.slice(0, 60) || "QA",
      emoji: "❓",
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
  };

  const openBlagueDetail = (blague: typeof BLAGUES[0], index: number) => {
    setDetailItem({
      type: "blague",
      title: blague.question.slice(0, 60),
      emoji: "😂",
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
  };

  const openHistoireDetail = (histoire: any) => {
    const isCloud = histoire.source === "cloud";
    setDetailItem({
      type: "histoire",
      title: histoire.titre?.slice(0, 60) || "Histoire",
      emoji: "📖",
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
  };

  const openQuizDetail = (q: any, type: string) => {
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
        meta: [
          { label: "Bonne rép.", value: q.choices[q.correctIndex], color: "bg-green-500/20 text-green-300" },
        ],
      });
    } else {
      setDetailItem({
        type: "generic", title: (q as string).slice(0, 60), emoji: "😂",
        fields: [
          { key: "text", label: "Blague", value: q, type: "textarea" },
        ],
        meta: [],
      });
    }
  };

  const handleDetailSave = async (type: string, id: string | undefined, values: Record<string, any>) => {
    if (type === "interaction") {
      // Save interaction as new KB entry so Bobby remembers
      const { error } = await supabase.from("knowledge_base").insert({
        question: values.child_input,
        answer: values.ai_response,
        category: values.category || "général",
        keywords: values.keywords || [],
        priority: values.difficulty_level || 5,
        age_min: values.age || 3,
        age_max: Math.min((values.age || 7) + 3, 12),
        emotion: values.emotion || "happy",
        is_active: true,
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
        age_min: values.age_min, age_max: values.age_max,
        is_active: values.is_active,
      } as any).eq("id", id);
      if (error) toast.error(error.message);
      else { toast.success("Mis à jour !"); fetchEntries(); }
    } else if (type === "qa" || type === "blague" || type === "generic") {
      // Save local content as new KB entry
      const question = values.question || values.triggers?.join(", ") || values.statement || values.text || "";
      const answer = values.reponse || values.responses || values.explanation || values.answer || "";
      const { error } = await supabase.from("knowledge_base").insert({
        question: typeof question === "string" ? question : String(question),
        answer: typeof answer === "string" ? answer : String(answer),
        category: values.categorie || values.category || values.intent || "général",
        keywords: values.keywords || values.triggers || [],
        priority: 5,
        age_min: values.ageMin || 3,
        age_max: values.ageMax || 12,
        emotion: "happy",
        is_active: true,
      });
      if (error) toast.error(error.message);
      else { toast.success("Sauvegardé dans la base Bobby !"); fetchEntries(); }
    } else if (type === "histoire" && id) {
      // Update cloud story
      const { error } = await supabase.from("story_templates").update({
        title: values.titre,
        theme: values.theme,
        full_text: values.texte,
        template_text: (values.texte || "").slice(0, 100),
        summary: values.moralite || null,
        age_min: values.ageMin || 5,
        age_max: values.ageMax || 12,
        duration: values.duree || "courte",
        category: values.theme,
      } as any).eq("id", id);
      if (error) toast.error(error.message);
      else { toast.success("Histoire mise à jour !"); fetchCloudStories(); }
    } else if (type === "histoire") {
      // Save local histoire as new cloud story
      const { error } = await supabase.from("story_templates").insert({
        title: values.titre,
        theme: values.theme,
        full_text: values.texte,
        template_text: (values.texte || "").slice(0, 100),
        summary: values.moralite || null,
        age_min: values.ageMin || 5,
        age_max: values.ageMax || 12,
        duration: values.duree || "courte",
        category: values.theme,
        language: "fr",
      } as any);
      if (error) toast.error(error.message);
      else { toast.success("Histoire ajoutée au cloud !"); fetchCloudStories(); }
    }
    setDetailItem(null);
  };

  const handleDetailDelete = async (type: string, id: string) => {
    if (!confirm("Supprimer ?")) return;
    if (type === "store") {
      await supabase.from("store_content").delete().eq("id", id);
      toast.success("Supprimé"); fetchStoreItems();
    } else if (type === "kb") {
      await supabase.from("knowledge_base").delete().eq("id", id);
      toast.success("Supprimé"); fetchEntries();
    }
    setDetailItem(null);
  };

  // 10K interactions (lazy loaded)
  const [interactions, setInteractions] = useState<BobbyInteraction[] | null>(null);
  const [loadingInteractions, setLoadingInteractions] = useState(false);

  const loadInteractions = useCallback(async () => {
    if (interactions) return;
    setLoadingInteractions(true);
    const { BOBBY_INTERACTIONS } = await import("@/lib/bobby_interactions_10k");
    setInteractions(BOBBY_INTERACTIONS);
    setLoadingInteractions(false);
  }, [interactions]);

  // Real user conversations from DB
  interface RealConversation {
    session_id: string;
    child_name: string;
    child_age: number;
    started_at: string;
    messages: { role: string; content: string; detected_emotion: string | null; created_at: string }[];
    topics: string[] | null;
    detected_emotions: string[] | null;
  }
  const [realConversations, setRealConversations] = useState<RealConversation[]>([]);
  const [realConvLoading, setRealConvLoading] = useState(false);

  const fetchRealConversations = useCallback(async () => {
    setRealConvLoading(true);
    const { data: sessions } = await supabase
      .from("child_sessions")
      .select("id, child_name, child_age, started_at, topics, detected_emotions")
      .order("started_at", { ascending: false })
      .limit(50);
    if (!sessions?.length) { setRealConvLoading(false); return; }

    const { data: messages } = await supabase
      .from("session_messages")
      .select("session_id, role, content, detected_emotion, created_at")
      .in("session_id", sessions.map(s => s.id))
      .order("created_at", { ascending: true });

    const convs: RealConversation[] = sessions.map(s => ({
      session_id: s.id,
      child_name: s.child_name,
      child_age: s.child_age,
      started_at: s.started_at,
      topics: s.topics,
      detected_emotions: s.detected_emotions,
      messages: (messages || []).filter(m => m.session_id === s.id),
    })).filter(c => c.messages.length > 0);

    setRealConversations(convs);
    setRealConvLoading(false);
  }, []);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("knowledge_base").select("*").order("priority", { ascending: false });
    if (error) toast.error("Erreur: " + error.message);
    else setEntries((data as unknown as KBEntry[]) || []);
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
    // Count installs per content_id
    const counts: Record<string, number> = {};
    (installsRes.data || []).forEach((r: any) => { counts[r.content_id] = (counts[r.content_id] || 0) + 1; });
    setLiveInstallCounts(counts);
  }, []);

  useEffect(() => {
    if (authenticated) { fetchEntries(); fetchCloudStories(); fetchStoreItems(); fetchCloudUsers(); loadInteractions(); fetchRealConversations(); }
  }, [authenticated, fetchEntries, fetchCloudStories, fetchStoreItems, fetchCloudUsers]);

  // ─── Derived ───
  const categoryCounts = useMemo(() => {
    const counts: Record<string, { total: number; active: number }> = {};
    for (const s of BRAIN_SECTIONS) {
      const m = entries.filter(e => s.dbCategories.includes(e.category));
      counts[s.id] = { total: m.length, active: m.filter(e => e.is_active).length };
    }
    return counts;
  }, [entries]);

  // QA grouped by intent
  const qaByIntent = useMemo(() => {
    const groups: Record<string, typeof QA_DATABASE> = {};
    for (const entry of QA_DATABASE) {
      const intent = entry.intent || "OTHER";
      if (!groups[intent]) groups[intent] = [];
      groups[intent].push(entry);
    }
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, []);

  // Blagues grouped by category
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

  // Filtered interactions
  const filteredInteractions = useMemo(() => {
    if (!interactions || !interactionCat) return [];
    return interactions
      .filter(i => i.category === interactionCat && i.age >= interactionAge.min && i.age <= interactionAge.max)
      .slice(0, 100); // paginate to 100
  }, [interactions, interactionCat, interactionAge]);

  // Interaction category counts
  const interactionCategoryCounts = useMemo(() => {
    if (!interactions) return {};
    const counts: Record<string, number> = {};
    for (const i of interactions) {
      counts[i.category] = (counts[i.category] || 0) + 1;
    }
    return counts;
  }, [interactions]);

  // Multi-response category counts
  const multiResponseCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const entry of BOBBY_MULTI_RESPONSES) {
      counts[entry.category] = (counts[entry.category] || 0) + 1;
    }
    return counts;
  }, []);

  // Dynamic section counts
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
      cloud: entries.length,
      store: storeItems.length,
      cloudusers: cloudUsers.length,
    } as Record<string, string | number>;
  }, [interactions, entries, cloudStories, storeItems, cloudUsers]);

  // ─── Handlers ───
  const handleSave = async () => {
    if (!editingEntry?.question?.trim() || !editingEntry?.answer?.trim()) {
      toast.error("Question et réponse requis");
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
      if (error) toast.error(error.message); else toast.success("Mis à jour !");
    } else {
      const { error } = await supabase.from("knowledge_base").insert(payload as any);
      if (error) toast.error(error.message); else toast.success("Ajouté !");
    }
    setEditingEntry(null);
    setSaving(false);
    fetchEntries();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ?")) return;
    const { error } = await supabase.from("knowledge_base").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Supprimé"); fetchEntries(); }
  };

  const handleToggleActive = async (entry: KBEntry) => {
    await supabase.from("knowledge_base").update({ is_active: !entry.is_active } as any).eq("id", entry.id);
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, is_active: !e.is_active } : e));
  };

  const goBack = () => {
    if (editingEntry) { setEditingEntry(null); return; }
    if (interactionCat) { setInteractionCat(null); setSearch(""); return; }
    if (cloudSection) { setCloudSection(null); setSearch(""); return; }
    if (topSection) { setTopSection(null); setSearch(""); return; }
    navigate("/");
  };

  // ─── Login ─────────────────────────────────────────────────────────
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

  // Use portal so dialog renders regardless of early returns
  const detailPortal = detailItem ? createPortal(
    <AdminDetailDialog
      item={detailItem}
      onClose={() => setDetailItem(null)}
      onSave={handleDetailSave}
      onDelete={handleDetailDelete}
    />,
    document.body
  ) : null;

  // ─── Edit form ─────────────────────────────────────────────────────
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

  // ═══════════════════════════════════════════════════════════════════
  // INTERACTIONS 10K — Category detail (age filter + list)
  // ═══════════════════════════════════════════════════════════════════
  if (topSection === "interactions" && interactionCat && interactionCat !== "real_conversations") {
    const catConfig = INTERACTION_CATEGORIES.find(c => c.id === interactionCat);
    const totalForCat = interactions?.filter(i => i.category === interactionCat).length || 0;

    return (
      <>
      {detailPortal}
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
                }`}
              >{g.label}</button>
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
            {filteredInteractions.length === 0 && (
              <p className="text-center text-white/40 py-12 text-sm">Aucune interaction pour ce filtre</p>
            )}
            {filteredInteractions.length >= 100 && (
              <p className="text-center text-white/30 text-xs py-2">Affichage limité à 100 résultats</p>
            )}
          </div>
        </div>
      </div>
      </>
    );
  }

  // ── Real user conversations detail view ──
  if (topSection === "interactions" && interactionCat === "real_conversations") {
    return (
      <>
      {detailPortal}
      <div className="min-h-screen bg-[#0a0a0f] p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={goBack} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
            <span className="text-2xl">💬</span>
            <div>
              <h1 className="text-xl font-bold text-white">Conversations réelles</h1>
              <p className="text-white/40 text-xs">{realConversations.length} sessions enregistrées — données pour améliorer Bobby</p>
            </div>
          </div>

          {realConvLoading ? (
            <div className="text-center text-white/50 py-12 animate-pulse">Chargement des conversations…</div>
          ) : realConversations.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl block mb-2">📭</span>
              <p className="text-white/30 text-sm">Aucune conversation enregistrée pour le moment</p>
              <p className="text-white/20 text-xs mt-1">Les conversations des utilisateurs apparaîtront ici</p>
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
                  {conv.topics?.length ? (
                    <div className="flex gap-1 flex-wrap">
                      {conv.topics.map((t, i) => (
                        <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-white/10 text-white/40">#{t}</span>
                      ))}
                    </div>
                  ) : null}
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {conv.messages.map((msg, i) => (
                      <div key={i} className="flex gap-2">
                        <span className={`text-[10px] shrink-0 mt-0.5 ${msg.role === "user" ? "text-blue-400" : "text-green-400"}`}>
                          {msg.role === "user" ? "👦" : "🤖"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[11px] ${msg.role === "user" ? "text-white/80" : "text-white/50"}`}>{msg.content}</p>
                          {msg.detected_emotion && (
                            <span className="text-[8px] text-pink-400/50">{msg.detected_emotion}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1.5 pt-1 border-t border-white/5">
                    <span className="text-[9px] text-white/20">{conv.messages.length} messages</span>
                    <span className="text-[9px] text-white/10">•</span>
                    <span className="text-[9px] text-white/20">Session: {conv.session_id.slice(0, 8)}…</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // INTERACTIONS — Category grid
  // ═══════════════════════════════════════════════════════════════════
  if (topSection === "interactions") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={goBack} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
            <span className="text-2xl">🧠</span>
            <div>
              <h1 className="text-xl font-bold text-white">Interactions</h1>
              <p className="text-white/40 text-xs">{interactions?.length ?? "…"} interactions par catégorie & âge</p>
            </div>
          </div>

          {loadingInteractions ? (
            <div className="text-center text-white/50 py-12">Chargement des interactions…</div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {/* Real conversations card — always first */}
              <button onClick={() => { setInteractionCat("real_conversations"); setSearch(""); }}
                className="aspect-square bg-gradient-to-br from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 backdrop-blur rounded-2xl p-3 border border-emerald-500/20 hover:border-emerald-500/40 transition-all text-left flex flex-col justify-between group"
              >
                <span className="text-2xl">💬</span>
                <div>
                  <p className="text-lg font-bold text-white">{realConversations.length}</p>
                  <h3 className="text-[11px] font-semibold text-emerald-400">Conversations réelles</h3>
                  <p className="text-[8px] text-white/30 mt-0.5">Sessions utilisateurs enregistrées</p>
                </div>
              </button>

              {INTERACTION_CATEGORIES.map(cat => {
                const count = interactionCategoryCounts[cat.id] || 0;
                if (count === 0) return null;
                return (
                  <button key={cat.id} onClick={() => { setInteractionCat(cat.id); setSearch(""); }}
                    className="aspect-square bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-xl rounded-[20px] p-3 border border-white/[0.06] hover:border-white/[0.12] transition-all text-left flex flex-col justify-between group"
                  >
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

  // ═══════════════════════════════════════════════════════════════════
  // MULTI-RÉPONSES — Category grid + detail with emotion/tag filters
  // ═══════════════════════════════════════════════════════════════════
  if (topSection === "multiresponses") {
    const uniqueEmotions = [...new Set(BOBBY_MULTI_RESPONSES.map(e => e.emotion).filter(Boolean))];
    const uniqueTags = [...new Set(BOBBY_MULTI_RESPONSES.flatMap(e => e.tags || []))].sort();

    if (interactionCat) {
      const catEntries = BOBBY_MULTI_RESPONSES.filter(e => e.category === interactionCat);
      const searchLower = search.toLowerCase();
      let filtered = catEntries;
      if (ageFilter) filtered = filtered.filter(e => e.emotion === ageFilter); // reusing ageFilter for emotion
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

            {/* Emotion filter */}
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setAgeFilter(null)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${!ageFilter ? "bg-orange-500/30 border-orange-400/50 text-orange-300" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"}`}>
                Tous
              </button>
              {[...new Set(catEntries.map(e => e.emotion).filter(Boolean))].map(em => (
                <button key={em} onClick={() => setAgeFilter(ageFilter === em ? null : em!)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${ageFilter === em ? "bg-pink-500/30 border-pink-400/50 text-pink-300" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"}`}>
                  {em}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
                className="bg-white/10 border-white/20 text-white pl-9" />
            </div>

            <div className="space-y-3">
              {filtered.map((entry, idx) => (
                <div key={idx} className="bg-white/[0.04] backdrop-blur-xl rounded-[16px] p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300">{entry.category}</span>
                    {entry.emotion && <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300">{entry.emotion}</span>}
                    {entry.tags?.map((t, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/40">{t}</span>
                    ))}
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

    // Category grid with search + emotion filter
    const uniqueCats = [...new Set(BOBBY_MULTI_RESPONSES.map(e => e.category))];
    const searchLower = search.toLowerCase();
    const emotionFilter = ageFilter;
    let filteredCats = uniqueCats;
    if (emotionFilter) {
      const catsWithEmotion = new Set(BOBBY_MULTI_RESPONSES.filter(e => e.emotion === emotionFilter).map(e => e.category));
      filteredCats = uniqueCats.filter(c => catsWithEmotion.has(c));
    }
    if (searchLower) {
      const catsWithSearch = new Set(BOBBY_MULTI_RESPONSES.filter(e => e.input.toLowerCase().includes(searchLower) || e.responses.some(r => r.text.toLowerCase().includes(searchLower))).map(e => e.category));
      filteredCats = filteredCats.filter(c => catsWithSearch.has(c));
    }

    return (
      <div className="min-h-screen bg-[#0a0a0f] p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={goBack} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
            <span className="text-2xl">⚡</span>
            <div>
              <h1 className="text-xl font-bold text-white">Multi-Réponses</h1>
              <p className="text-white/40 text-xs">{BOBBY_MULTI_RESPONSES.length} entrées • {uniqueCats.length} catégories • {uniqueEmotions.length} émotions</p>
            </div>
          </div>

          {/* Emotion filter */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setAgeFilter(null)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${!ageFilter ? "bg-orange-500/30 border-orange-400/50 text-orange-300" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"}`}>
              Toutes émotions
            </button>
            {uniqueEmotions.map(em => (
              <button key={em} onClick={() => setAgeFilter(ageFilter === em ? null : em!)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${ageFilter === em ? "bg-pink-500/30 border-pink-400/50 text-pink-300" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"}`}>
                {em}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher dans toutes les entrées…"
              className="bg-white/10 border-white/20 text-white pl-9" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {filteredCats.map(cat => (
              <button key={cat} onClick={() => { setInteractionCat(cat); setSearch(""); setAgeFilter(null); }}
                className="bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-xl rounded-[20px] p-3 border border-white/[0.06] hover:border-white/[0.12] transition-all text-left flex flex-col justify-between group aspect-square"
              >
                <span className="text-lg capitalize text-white/70">{cat.replace(/_/g, " ")}</span>
                <div>
                  <p className="text-lg font-bold text-white">{multiResponseCategoryCounts[cat] || 0}</p>
                  <h3 className="text-[10px] font-semibold text-orange-400">entrées</h3>
                </div>
              </button>
            ))}
          </div>
          {filteredCats.length === 0 && <p className="text-center text-white/40 py-8 text-sm">Aucune catégorie pour ce filtre</p>}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // JEUX & QUIZ — Sub-categories with age filter + search
  // ═══════════════════════════════════════════════════════════════════
  if (topSection === "jeux") {
    const GAME_SECTIONS = [
      { id: "quiz_animaux", label: "Quiz Animaux", emoji: "🐾", data: QUIZ_ANIMAUX, type: "quiz" as const },
      { id: "quiz_educatif", label: "Quiz Sciences", emoji: "🔬", data: QUIZ_EDUCATIF, type: "quiz" as const },
      { id: "vrai_faux", label: "Vrai ou Faux", emoji: "✅", data: VRAI_FAUX, type: "vf" as const },
      { id: "devinettes", label: "Devinettes", emoji: "🤔", data: DEVINETTES, type: "riddle" as const },
      { id: "blagues_jeu", label: "Blagues Jeu", emoji: "😂", data: GAME_BLAGUES, type: "blague" as const },
    ];

    // If a sub-category is selected via interactionCat (reusing state)
    const activeGameSection = interactionCat ? GAME_SECTIONS.find(s => s.id === interactionCat) : null;

    if (activeGameSection) {
      const searchLower = search.toLowerCase();

      const renderItems = () => {
        if (activeGameSection.type === "quiz") {
          const items = activeGameSection.data as QuizQuestion[];
          const filtered = searchLower
            ? items.filter(q => q.question.toLowerCase().includes(searchLower) || q.explanation.toLowerCase().includes(searchLower) || q.category.toLowerCase().includes(searchLower))
            : items;
          // Group by category
          const grouped: Record<string, QuizQuestion[]> = {};
          for (const q of filtered) {
            if (!grouped[q.category]) grouped[q.category] = [];
            grouped[q.category].push(q);
          }
          return (
            <div className="space-y-4">
              {Object.entries(grouped).map(([cat, questions]) => (
                <div key={cat}>
                  <h3 className="text-white/60 text-xs font-semibold mb-2 uppercase tracking-wider">{cat} ({questions.length})</h3>
                  <div className="space-y-2">
                    {questions.map((q, i) => (
                      <div key={i} onClick={() => openQuizDetail(q, "quiz")} className="bg-white/[0.04] backdrop-blur-xl rounded-[16px] p-4 border border-white/[0.06] cursor-pointer hover:bg-white/[0.06] transition-colors">
                        <p className="text-sm text-white/80 font-medium mb-2">{q.question}</p>
                        <div className="grid grid-cols-2 gap-1.5 mb-2">
                          {q.choices.map((c, ci) => (
                            <span key={ci} className={`text-xs px-2 py-1 rounded-lg ${ci === q.correctIndex ? "bg-green-500/20 text-green-300 font-semibold" : "bg-white/5 text-white/50"}`}>
                              {c}
                            </span>
                          ))}
                        </div>
                        <p className="text-[11px] text-white/40 italic">{q.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <p className="text-center text-white/40 py-8 text-sm">Aucun résultat</p>}
            </div>
          );
        }
        if (activeGameSection.type === "vf") {
          const items = activeGameSection.data as TrueFalseQuestion[];
          const filtered = searchLower
            ? items.filter(q => q.statement.toLowerCase().includes(searchLower) || q.explanation.toLowerCase().includes(searchLower))
            : items;
          const grouped: Record<string, TrueFalseQuestion[]> = {};
          for (const q of filtered) {
            if (!grouped[q.category]) grouped[q.category] = [];
            grouped[q.category].push(q);
          }
          return (
            <div className="space-y-4">
              {Object.entries(grouped).map(([cat, questions]) => (
                <div key={cat}>
                  <h3 className="text-white/60 text-xs font-semibold mb-2 uppercase tracking-wider">{cat} ({questions.length})</h3>
                  <div className="space-y-2">
                    {questions.map((q, i) => (
                      <div key={i} onClick={() => openQuizDetail(q, "vf")} className="bg-white/[0.04] backdrop-blur-xl rounded-[16px] p-4 border border-white/[0.06] cursor-pointer hover:bg-white/[0.06] transition-colors">
                        <div className="flex items-start gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${q.answer ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                            {q.answer ? "VRAI" : "FAUX"}
                          </span>
                          <p className="text-sm text-white/80">{q.statement}</p>
                        </div>
                        <p className="text-[11px] text-white/40 italic mt-2 ml-14">{q.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <p className="text-center text-white/40 py-8 text-sm">Aucun résultat</p>}
            </div>
          );
        }
        if (activeGameSection.type === "riddle") {
          const items = activeGameSection.data as Riddle[];
          const filtered = searchLower
            ? items.filter(q => q.question.toLowerCase().includes(searchLower) || q.hint.toLowerCase().includes(searchLower))
            : items;
          return (
            <div className="space-y-2">
              {filtered.map((q, i) => (
                <div key={i} onClick={() => openQuizDetail(q, "riddle")} className="bg-white/[0.04] backdrop-blur-xl rounded-[16px] p-4 border border-white/[0.06] cursor-pointer hover:bg-white/[0.06] transition-colors">
                  <p className="text-sm text-white/80 font-medium mb-2">{q.question}</p>
                  <div className="flex gap-1.5 mb-2 flex-wrap">
                    {q.choices.map((c, ci) => (
                      <span key={ci} className={`text-xs px-2 py-1 rounded-lg ${ci === q.correctIndex ? "bg-green-500/20 text-green-300 font-semibold" : "bg-white/5 text-white/50"}`}>
                        {c}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-white/30">💡 {q.hint}</p>
                </div>
              ))}
              {filtered.length === 0 && <p className="text-center text-white/40 py-8 text-sm">Aucun résultat</p>}
            </div>
          );
        }
        // blagues
        const items = activeGameSection.data as string[];
        const filtered = searchLower ? items.filter(b => b.toLowerCase().includes(searchLower)) : items;
        return (
          <div className="space-y-2">
            {filtered.map((b, i) => (
              <div key={i} onClick={() => openQuizDetail(b, "blague")} className="bg-white/[0.04] backdrop-blur-xl rounded-[16px] p-4 border border-white/[0.06] cursor-pointer hover:bg-white/[0.06] transition-colors">
                <p className="text-sm text-white/70">{b}</p>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center text-white/40 py-8 text-sm">Aucun résultat</p>}
          </div>
        );
      };

      return (
        <>
        {detailPortal}
        <div className="min-h-screen bg-[#0a0a0f] p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={goBack} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
              <span className="text-2xl">{activeGameSection.emoji}</span>
              <div>
                <h1 className="text-xl font-bold text-white">{activeGameSection.label}</h1>
                <p className="text-white/40 text-xs">{activeGameSection.data.length} entrées</p>
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
                className="bg-white/10 border-white/20 text-white pl-9" />
            </div>

            {renderItems()}
          </div>
        </div>
        </>
      );
    }

    // Jeux grid
    return (
      <div className="min-h-screen bg-[#0a0a0f] p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={goBack} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
            <span className="text-2xl">🎮</span>
            <div>
              <h1 className="text-xl font-bold text-white">Jeux & Quiz</h1>
              <p className="text-white/40 text-xs">Quiz, Vrai/Faux, Devinettes — contenu embarqué</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {GAME_SECTIONS.map(section => (
              <button key={section.id} onClick={() => { setInteractionCat(section.id); setSearch(""); }}
                className="aspect-square bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-xl rounded-[20px] p-4 border border-white/[0.06] hover:border-white/[0.12] transition-all text-left flex flex-col justify-between group"
              >
                <span className="text-3xl">{section.emoji}</span>
                <div>
                  <p className="text-xl font-bold text-white">{section.data.length}</p>
                  <h3 className="text-xs font-semibold text-white/70">{section.label}</h3>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (topSection === "qa") {
    const QA_INTENT_EMOJIS: Record<string, string> = {
      GREETING: "👋", FAREWELL: "👋", GRATITUDE: "🙏", POSITIVE: "😊", IDENTITY: "🤖",
      PLAY_REQUEST: "🎮", RIDDLE: "🧩", JOKE: "😂", QUIZ: "🧠", QUESTION: "❓",
      ANIMALS: "🐾", DINOSAUR: "🦖", SPACE: "🚀", NATURE: "🌿", ECOLOGY: "♻️",
      SCIENCE: "🔬", MATH: "🔢", GEOGRAPHY: "🌍", HISTORY: "📜", HEALTH: "🩺",
      EMOTIONS: "💛", FRIENDSHIP: "🤝", SCHOOL: "🏫", FOOD: "🍽️", SPORT: "⚽",
      MUSIC: "🎵", ART: "🎨", TECHNOLOGY: "💻", TRANSPORT: "🚗", JOBS: "👷",
      FAMILY: "👨‍👩‍👧", FANTASY: "✨", STORY: "📖", TIME: "⏰", PHILOSOPHY: "🤔",
      NEUTRAL: "😐", HELP: "🆘", REPEAT: "🔁", VOLUME: "🔊", ENCOURAGEMENT: "💪",
      CULTURE: "🏛️", TRANSITION: "➡️", OTHER: "📋",
    };

    // Detail: show all entries of a selected intent
    if (interactionCat) {
      const intentEntries = QA_DATABASE.filter(e => (e.intent || "OTHER") === interactionCat);
      const searchLower = search.toLowerCase();
      const filtered = searchLower
        ? intentEntries.filter(e => e.triggers.some(t => t.toLowerCase().includes(searchLower)) || e.responses.some(r => r.toLowerCase().includes(searchLower)))
        : intentEntries;

      return (
        <>
        {detailPortal}
        <div className="min-h-screen bg-[#0a0a0f] p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => { setInteractionCat(null); setSearch(""); }} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
              <span className="text-2xl">{QA_INTENT_EMOJIS[interactionCat] || "❓"}</span>
              <div>
                <h1 className="text-xl font-bold text-white">{interactionCat}</h1>
                <p className="text-white/40 text-xs">{filtered.length}/{intentEntries.length} entrées</p>
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
                className="bg-white/10 border-white/20 text-white pl-9" />
            </div>

            <div className="space-y-2">
              {filtered.map((entry, idx) => (
                <div key={idx} onClick={() => openQADetail(entry)} className="bg-white/[0.04] backdrop-blur-xl rounded-[16px] p-4 border border-white/[0.06] cursor-pointer hover:bg-white/[0.06] transition-colors">
                  <p className="text-xs text-white/50 mb-1.5">🎯 {entry.triggers.join(" • ")}</p>
                  <div className="space-y-1">
                    {entry.responses.map((r, i) => (
                      <p key={i} className="text-sm text-white/70">🤖 {r}</p>
                    ))}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <p className="text-center text-white/40 py-8 text-sm">Aucun résultat</p>}
            </div>
          </div>
        </div>
        </>
      );
    }

    // Intent category grid with search
    const searchLower = search.toLowerCase();
    const filteredIntents = searchLower
      ? qaByIntent.filter(([, entries]) => entries.some(e => e.triggers.some(t => t.toLowerCase().includes(searchLower)) || e.responses.some(r => r.toLowerCase().includes(searchLower))))
      : qaByIntent;

    return (
      <div className="min-h-screen bg-[#0a0a0f] p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={goBack} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
            <span className="text-2xl">❓</span>
            <div>
              <h1 className="text-xl font-bold text-white">QA Database</h1>
              <p className="text-white/40 text-xs">{QA_DATABASE.length} entrées • {qaByIntent.length} sujets</p>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher dans toutes les QA…"
              className="bg-white/10 border-white/20 text-white pl-9" />
          </div>

          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
            {filteredIntents.map(([intent, entries]) => (
              <button key={intent} onClick={() => { setInteractionCat(intent); setSearch(""); }}
                className="bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-xl rounded-[20px] p-3 border border-white/[0.06] hover:border-white/[0.12] transition-all text-left flex flex-col justify-between aspect-square"
              >
                <span className="text-2xl">{QA_INTENT_EMOJIS[intent] || "❓"}</span>
                <div>
                  <p className="text-lg font-bold text-white">{entries.length}</p>
                  <h3 className="text-[10px] font-semibold text-amber-400">{intent}</h3>
                </div>
              </button>
            ))}
          </div>
          {filteredIntents.length === 0 && <p className="text-center text-white/40 py-8 text-sm">Aucun résultat</p>}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // BLAGUES
  // ═══════════════════════════════════════════════════════════════════
  if (topSection === "blagues") {
    const categories = [...new Set(BLAGUES.map(b => b.categorie))];
    const AGE_GROUPS_BLG = [
      { label: "Tous", min: 0, max: 99 },
      { label: "5-6 ans", min: 5, max: 6 },
      { label: "7-8 ans", min: 7, max: 8 },
      { label: "9-10 ans", min: 9, max: 10 },
      { label: "11-12 ans", min: 11, max: 12 },
    ];
    const selectedBlagueCat = interactionCat;
    const searchLower = search.toLowerCase();

    // If a category is selected, show its blagues
    if (selectedBlagueCat) {
      const catBlagues = BLAGUES.filter(b => b.categorie === selectedBlagueCat);
      const ageFiltered = ageFilter
        ? catBlagues.filter(b => {
            const ag = AGE_GROUPS_BLG.find(a => a.label === ageFilter);
            return ag ? b.ageMin <= ag.max && b.ageMax >= ag.min : true;
          })
        : catBlagues;
      const filtered = searchLower
        ? ageFiltered.filter(b => b.question.toLowerCase().includes(searchLower) || b.reponse.toLowerCase().includes(searchLower))
        : ageFiltered;

      return (
        <>
        {detailPortal}
        <div className="min-h-screen bg-[#0a0a0f] p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => { setInteractionCat(null); setSearch(""); setAgeFilter(null); }} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
              <span className="text-2xl">😂</span>
              <div>
                <h1 className="text-xl font-bold text-white capitalize">{selectedBlagueCat}</h1>
                <p className="text-white/40 text-xs">{filtered.length} blagues</p>
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
                className="bg-white/10 border-white/20 text-white pl-9" />
            </div>

            <div className="flex gap-2 flex-wrap">
              {AGE_GROUPS_BLG.map(ag => (
                <button key={ag.label} onClick={() => setAgeFilter(ageFilter === ag.label ? null : ag.label)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${ageFilter === ag.label ? "bg-green-500/30 border-green-400/50 text-green-300" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"}`}>
                  {ag.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {filtered.map((b, i) => (
                <div key={i} onClick={() => openBlagueDetail(b, i)} className="bg-white/[0.04] backdrop-blur-xl rounded-[16px] p-4 border border-white/[0.06] cursor-pointer hover:bg-white/[0.06] transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300">{b.ageMin}-{b.ageMax} ans</span>
                    <span className="text-[10px] text-white/30">Niv.{b.difficulte}</span>
                  </div>
                  <p className="text-sm text-white/80 font-medium">{b.question}</p>
                  <p className="text-sm text-white/50 mt-1">→ {b.reponse}</p>
                </div>
              ))}
              {filtered.length === 0 && <p className="text-center text-white/40 py-8 text-sm">Aucun résultat</p>}
            </div>
          </div>
        </div>
        </>
      );
    }

    // Category grid
    return (
      <>
      {detailPortal}
      <div className="min-h-screen bg-[#0a0a0f] p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={goBack} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
            <span className="text-2xl">😂</span>
            <div>
              <h1 className="text-xl font-bold text-white">Blagues</h1>
              <p className="text-white/40 text-xs">{BLAGUES.length} blagues • {categories.length} catégories</p>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher dans toutes les blagues…"
              className="bg-white/10 border-white/20 text-white pl-9" />
          </div>

          {searchLower ? (
            <div className="space-y-2">
              {BLAGUES.filter(b => b.question.toLowerCase().includes(searchLower) || b.reponse.toLowerCase().includes(searchLower)).map((b, i) => (
                <div key={i} onClick={() => openBlagueDetail(b, i)} className="bg-white/[0.04] backdrop-blur-xl rounded-[16px] p-4 border border-white/[0.06] cursor-pointer hover:bg-white/[0.06] transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 capitalize">{b.categorie}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">{b.ageMin}-{b.ageMax} ans</span>
                  </div>
                  <p className="text-sm text-white/80 font-medium">{b.question}</p>
                  <p className="text-sm text-white/50 mt-1">→ {b.reponse}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {categories.map(cat => {
                const catBlagues = BLAGUES.filter(b => b.categorie === cat);
                const EMOJIS: Record<string, string> = { animaux: "🐾", ecole: "📚", nourriture: "🍕", absurde: "🤪", famille: "👨‍👩‍👧", science: "🔬" };
                return (
                  <button key={cat} onClick={() => { setInteractionCat(cat); setSearch(""); }}
                    className="aspect-square bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-xl rounded-[20px] p-4 border border-white/[0.06] hover:border-white/[0.12] transition-all text-left flex flex-col justify-between">
                    <span className="text-3xl">{EMOJIS[cat] || "😂"}</span>
                    <div>
                      <p className="text-xl font-bold text-white">{catBlagues.length}</p>
                      <h3 className="text-xs font-semibold text-white/70 capitalize">{cat}</h3>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // CHANSONS — By category, age, search
  // ═══════════════════════════════════════════════════════════════════
  if (topSection === "chansons") {
    const selectedChansonCat = interactionCat as ChansonCategorie | null;
    const searchLower = search.toLowerCase();
    const AGE_GROUPS_CH = [
      { label: "Tous", min: 0, max: 99 },
      { label: "3-5 ans", min: 3, max: 5 },
      { label: "6-8 ans", min: 6, max: 8 },
      { label: "9-12 ans", min: 9, max: 12 },
    ];

    if (selectedChansonCat) {
      const catChansons = CHANSONS.filter(c => c.categorie === selectedChansonCat);
      const ageFiltered = ageFilter
        ? catChansons.filter(c => {
            const ag = AGE_GROUPS_CH.find(a => a.label === ageFilter);
            return ag ? c.ageMin <= ag.max && c.ageMax >= ag.min : true;
          })
        : catChansons;
      const filtered = searchLower
        ? ageFiltered.filter(c => c.titre.toLowerCase().includes(searchLower) || c.description.toLowerCase().includes(searchLower) || c.tags.some(t => t.includes(searchLower)))
        : ageFiltered;

      // Group by sous-catégorie if exists
      const grouped: Record<string, Chanson[]> = {};
      for (const c of filtered) {
        const key = c.sousCategorie || "général";
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(c);
      }

      const catInfo = CHANSON_CATEGORIES.find(cc => cc.id === selectedChansonCat);

      return (
        <div className="min-h-screen bg-[#0a0a0f] p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => { setInteractionCat(null); setSearch(""); setAgeFilter(null); }} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
              <span className="text-2xl">{catInfo?.emoji || "🎵"}</span>
              <div>
                <h1 className="text-xl font-bold text-white">{catInfo?.label || selectedChansonCat}</h1>
                <p className="text-white/40 text-xs">{filtered.length} chansons</p>
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
                className="bg-white/10 border-white/20 text-white pl-9" />
            </div>

            <div className="flex gap-2 flex-wrap">
              {AGE_GROUPS_CH.map(ag => (
                <button key={ag.label} onClick={() => setAgeFilter(ageFilter === ag.label ? null : ag.label)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${ageFilter === ag.label ? "bg-rose-500/30 border-rose-400/50 text-rose-300" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"}`}>
                  {ag.label}
                </button>
              ))}
            </div>

            {Object.entries(grouped).map(([sub, chansons]) => (
              <div key={sub}>
                {Object.keys(grouped).length > 1 && (
                  <h3 className="text-white/60 text-xs font-semibold mb-2 uppercase tracking-wider">{sub} ({chansons.length})</h3>
                )}
                <div className="space-y-2">
                  {chansons.map(c => (
                    <div key={c.id} className="bg-white/[0.04] backdrop-blur-xl rounded-[16px] p-4 border border-white/10">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">{c.ageMin}-{c.ageMax} ans</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/40">⏱ {c.duree}</span>
                        {c.audioUrl && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300">🔊 Audio</span>}
                        {!c.audioUrl && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">⏳ À uploader</span>}
                      </div>
                      <p className="text-sm text-white/80 font-medium">{c.titre}</p>
                      <p className="text-xs text-white/40 mt-1">{c.description}</p>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {c.tags.map((t, i) => (
                          <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/30">#{t}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center text-white/40 py-8 text-sm">Aucun résultat</p>}
          </div>
        </div>
      );
    }

    // Category grid
    return (
      <div className="min-h-screen bg-[#0a0a0f] p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={goBack} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
            <span className="text-2xl">🎵</span>
            <div>
              <h1 className="text-xl font-bold text-white">Chansons</h1>
              <p className="text-white/40 text-xs">{CHANSONS.length} chansons • {CHANSON_CATEGORIES.length} catégories</p>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher dans toutes les chansons…"
              className="bg-white/10 border-white/20 text-white pl-9" />
          </div>

          {searchLower ? (
            <div className="space-y-2">
              {CHANSONS.filter(c => c.titre.toLowerCase().includes(searchLower) || c.description.toLowerCase().includes(searchLower) || c.tags.some(t => t.includes(searchLower))).map(c => (
                <div key={c.id} className="bg-white/[0.04] backdrop-blur-xl rounded-[16px] p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 capitalize">{c.categorie}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">{c.ageMin}-{c.ageMax} ans</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/40">⏱ {c.duree}</span>
                  </div>
                  <p className="text-sm text-white/80 font-medium">{c.titre}</p>
                  <p className="text-xs text-white/40 mt-1">{c.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {CHANSON_CATEGORIES.map(cat => {
                const count = CHANSONS.filter(c => c.categorie === cat.id).length;
                return (
                  <button key={cat.id} onClick={() => { setInteractionCat(cat.id); setSearch(""); }}
                    className={`aspect-square ${cat.color} hover:opacity-90 backdrop-blur rounded-2xl p-4 border border-white/[0.06] hover:border-white/[0.12] transition-all text-left flex flex-col justify-between`}>
                    <span className="text-3xl">{cat.emoji}</span>
                    <div>
                      <p className="text-xl font-bold text-white">{count}</p>
                      <h3 className="text-xs font-semibold text-white/70">{cat.label}</h3>
                      <p className="text-[10px] text-white/40 mt-0.5">{cat.desc}</p>
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

    // Merge local + cloud stories
    const allStories = [
      ...HISTOIRES.map(h => ({ ...h, source: "local" as const })),
      ...cloudStories.map(s => ({
        id: s.id,
        titre: s.title,
        theme: s.theme,
        ageMin: s.age_min,
        ageMax: s.age_max,
        duree: s.duration as "courte" | "moyenne" | "longue",
        texte: s.full_text || s.template_text,
        moralité: s.summary || undefined,
        tags: [s.category, s.theme, s.mood].filter(Boolean),
        source: "cloud" as const,
      })),
    ];

    // Get unique themes from actual data
    const activeThemes = [...new Set(allStories.map(s => s.theme))];
    const allThemeConfigs = activeThemes.map(t => STORY_THEMES.find(st => st.id === t) || { id: t, label: t.charAt(0).toUpperCase() + t.slice(1), emoji: "📖", color: "bg-white/10" });

    const AGE_GROUPS_STORY = [
      { label: "Tous", min: 0, max: 99 },
      { label: "3-5 ans", min: 3, max: 5 },
      { label: "6-8 ans", min: 6, max: 8 },
      { label: "9-12 ans", min: 9, max: 12 },
    ];

    // ── Story editor form ──
    if (editingStory) {
      return (
        <div className="min-h-screen bg-[#0a0a0f] p-4">
          <div className="max-w-2xl mx-auto space-y-4">
            <Button variant="ghost" onClick={() => setEditingStory(null)} className="text-white/70">
              <ArrowLeft className="w-4 h-4 mr-2" /> Retour
            </Button>
            <h2 className="text-xl font-bold text-white">{editingStory.id ? "Modifier" : "Nouvelle"} histoire</h2>
            <div className="space-y-4 bg-white/[0.04] backdrop-blur-xl rounded-[16px] p-5 border border-white/10">
              <div>
                <label className="text-white/60 text-xs font-medium mb-1 block">Titre</label>
                <Input value={editingStory.titre || ""} onChange={e => setEditingStory({ ...editingStory, titre: e.target.value })}
                  placeholder="L'aventure de..." className="bg-white/10 border-white/20 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/60 text-xs font-medium mb-1 block">Thème</label>
                  <Select value={editingStory.theme || "magie"} onValueChange={v => setEditingStory({ ...editingStory, theme: v })}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STORY_THEMES.map(t => <SelectItem key={t.id} value={t.id}>{t.emoji} {t.label}</SelectItem>)}
                      <SelectItem value="autre">📖 Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-white/60 text-xs font-medium mb-1 block">Durée</label>
                  <Select value={editingStory.duree || "courte"} onValueChange={v => setEditingStory({ ...editingStory, duree: v as any })}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="courte">Courte (~1 min)</SelectItem>
                      <SelectItem value="moyenne">Moyenne (~3 min)</SelectItem>
                      <SelectItem value="longue">Longue (~5 min)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/60 text-xs font-medium mb-1 block">Âge min</label>
                  <Input type="number" min={3} max={12} value={editingStory.ageMin || 5}
                    onChange={e => setEditingStory({ ...editingStory, ageMin: Number(e.target.value) })} className="bg-white/10 border-white/20 text-white" />
                </div>
                <div>
                  <label className="text-white/60 text-xs font-medium mb-1 block">Âge max</label>
                  <Input type="number" min={3} max={12} value={editingStory.ageMax || 12}
                    onChange={e => setEditingStory({ ...editingStory, ageMax: Number(e.target.value) })} className="bg-white/10 border-white/20 text-white" />
                </div>
              </div>
              <div>
                <label className="text-white/60 text-xs font-medium mb-1 block">Moralité / résumé (optionnel)</label>
                <Input value={editingStory.moralité || ""} onChange={e => setEditingStory({ ...editingStory, moralité: e.target.value })}
                  placeholder="La leçon de l'histoire…" className="bg-white/10 border-white/20 text-white" />
              </div>
              <div>
                <label className="text-white/60 text-xs font-medium mb-1 block">Texte complet (utilise {"{child_name}"} pour le prénom)</label>
                <Textarea value={editingStory.texte || ""} onChange={e => setEditingStory({ ...editingStory, texte: e.target.value })}
                  placeholder="Il était une fois…" className="bg-white/10 border-white/20 text-white min-h-[200px]" />
              </div>
              <div>
                <label className="text-white/60 text-xs font-medium mb-1 block">Tags (virgules)</label>
                <Input value={(editingStory.tags || []).join(", ")}
                  onChange={e => setEditingStory({ ...editingStory, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })}
                  placeholder="aventure, amitié, courage" className="bg-white/10 border-white/20 text-white" />
              </div>
            </div>
            <Button onClick={async () => {
              if (!editingStory.titre?.trim() || !editingStory.texte?.trim()) { toast.error("Titre et texte requis"); return; }
              setSavingStory(true);
              const payload = {
                title: editingStory.titre!.trim(),
                theme: editingStory.theme || "magie",
                template_text: editingStory.texte!.trim().slice(0, 100),
                full_text: editingStory.texte!.trim(),
                summary: editingStory.moralité || null,
                age_min: editingStory.ageMin || 5,
                age_max: editingStory.ageMax || 12,
                duration: editingStory.duree || "courte",
                category: editingStory.theme || "magie",
                language: "fr",
              };
              if (editingStory.id && editingStory.id.includes("-")) {
                const { error } = await supabase.from("story_templates").update(payload as any).eq("id", editingStory.id);
                if (error) toast.error("Erreur: " + error.message);
                else toast.success("Histoire modifiée !");
              } else {
                const { error } = await supabase.from("story_templates").insert(payload as any);
                if (error) toast.error("Erreur: " + error.message);
                else toast.success("Histoire ajoutée !");
              }
              setSavingStory(false);
              setEditingStory(null);
              fetchCloudStories();
            }} disabled={savingStory} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
              {savingStory ? "Enregistrement..." : "Enregistrer dans le Cloud"}
            </Button>
          </div>
        </div>
      );
    }

    // ── Detail: stories in a theme ──
    if (interactionCat) {
      const themeConfig = allThemeConfigs.find(t => t.id === interactionCat);
      const themeStories = allStories.filter(s => s.theme === interactionCat);
      const ageFiltered = ageFilter
        ? themeStories.filter(s => {
            const ag = AGE_GROUPS_STORY.find(a => a.label === ageFilter);
            return ag ? s.ageMin <= ag.max && s.ageMax >= ag.min : true;
          })
        : themeStories;
      const searchLower = search.toLowerCase();
      const filtered = searchLower
        ? ageFiltered.filter(s => s.titre.toLowerCase().includes(searchLower) || s.texte.toLowerCase().includes(searchLower))
        : ageFiltered;

      return (
        <>
        {detailPortal}
        <div className="min-h-screen bg-[#0a0a0f] p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => { setInteractionCat(null); setSearch(""); setAgeFilter(null); }} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
              <span className="text-2xl">{themeConfig?.emoji || "📖"}</span>
              <div>
                <h1 className="text-xl font-bold text-white">{themeConfig?.label}</h1>
                <p className="text-white/40 text-xs">{filtered.length} histoires</p>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {AGE_GROUPS_STORY.map(ag => (
                <button key={ag.label} onClick={() => setAgeFilter(ageFilter === ag.label ? null : ag.label)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${ageFilter === ag.label ? "bg-purple-500/30 border-purple-400/50 text-purple-300" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"}`}>
                  {ag.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
                className="bg-white/10 border-white/20 text-white pl-9" />
            </div>

            <div className="space-y-3">
              {filtered.map(h => {
                const isExpanded = expandedStory === h.id;
                return (
                  <div key={h.id} className="bg-white/[0.04] backdrop-blur-xl rounded-[16px] border border-white/10 overflow-hidden">
                    <button onClick={() => setExpandedStory(isExpanded ? null : h.id)}
                      className="w-full p-4 text-left">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">{h.theme}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">{h.ageMin}-{h.ageMax} ans</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">{h.duree}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${h.source === "cloud" ? "bg-sky-500/20 text-sky-300" : "bg-white/10 text-white/40"}`}>
                          {h.source === "cloud" ? "☁️ Cloud" : "📦 Local"}
                        </span>
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
                        <div className="flex gap-1 flex-wrap">
                          {h.tags.map((t, i) => <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/40">{t}</span>)}
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" variant="ghost" className="text-purple-400 text-xs" onClick={() => openHistoireDetail(h)}>
                            <Eye className="w-3 h-3 mr-1" /> Détail
                          </Button>
                          {h.source === "cloud" && (
                            <>
                            <Button size="sm" variant="ghost" className="text-blue-400 text-xs" onClick={() => setEditingStory({
                              id: h.id, titre: h.titre, theme: h.theme, ageMin: h.ageMin, ageMax: h.ageMax,
                              duree: h.duree, texte: h.texte, moralité: h.moralité, tags: h.tags,
                            })}>
                              <Pencil className="w-3 h-3 mr-1" /> Modifier
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-400 text-xs" onClick={async () => {
                              if (!confirm("Supprimer cette histoire ?")) return;
                              await supabase.from("story_templates").delete().eq("id", h.id);
                              toast.success("Supprimée");
                              fetchCloudStories();
                            }}>
                              <Trash2 className="w-3 h-3 mr-1" /> Supprimer
                            </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {filtered.length === 0 && <p className="text-center text-white/40 py-8 text-sm">Aucune histoire pour ce filtre</p>}
            </div>
          </div>
        </div>
        </>
      );
    }

    // ── Main grid by theme ──
    return (
      <div className="min-h-screen bg-[#0a0a0f] p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={goBack} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
              <span className="text-2xl">📖</span>
              <div>
                <h1 className="text-xl font-bold text-white">Histoires</h1>
                <p className="text-white/40 text-xs">{allStories.length} histoires • {activeThemes.length} thèmes ({HISTOIRES.length} local + {cloudStories.length} cloud)</p>
              </div>
            </div>
            <Button onClick={() => setEditingStory({ theme: "magie", duree: "courte", ageMin: 5, ageMax: 10, tags: [] })}
              className="bg-purple-600 hover:bg-purple-700"><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {allThemeConfigs.map(theme => {
              const count = allStories.filter(s => s.theme === theme.id).length;
              const localCount = HISTOIRES.filter(s => s.theme === theme.id).length;
              const cloudCount = cloudStories.filter(s => s.theme === theme.id).length;
              return (
                <button key={theme.id} onClick={() => { setInteractionCat(theme.id); setSearch(""); setAgeFilter(null); }}
                  className={`aspect-square ${theme.color} hover:opacity-90 backdrop-blur rounded-2xl p-4 border border-white/[0.06] hover:border-white/[0.12] transition-all text-left flex flex-col justify-between`}>
                  <span className="text-3xl">{theme.emoji}</span>
                  <div>
                    <p className="text-xl font-bold text-white">{count}</p>
                    <h3 className="text-xs font-semibold text-white/70">{theme.label}</h3>
                    <p className="text-[9px] text-white/40 mt-0.5">{localCount} local • {cloudCount} cloud</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // CERVEAU / PERSONNALITÉ
  // ═══════════════════════════════════════════════════════════════════
  if (topSection === "cerveau") {
    const sections = [
      { title: "Identité", items: [
        `Nom: ${BOBBY_PERSONALITY.name}`, `Espèce: ${BOBBY_PERSONALITY.species}`,
        `Meilleur ami: ${BOBBY_PERSONALITY.bestFriend}`,
        `Peurs: ${BOBBY_PERSONALITY.fears.join(", ")}`, `Passions: ${BOBBY_PERSONALITY.loves.join(", ")}`,
        `Traits: ${BOBBY_PERSONALITY.quirks.join(", ")}`,
      ]},
      { title: "Phrases cultes", items: BOBBY_PERSONALITY.catchphrases },
      { title: "Réactions positives", items: BOBBY_NATURAL_REACTIONS.goodNews },
      { title: "Réactions négatives", items: BOBBY_NATURAL_REACTIONS.badNews },
      { title: "Confusion", items: BOBBY_NATURAL_REACTIONS.confusion },
      { title: "Encouragements", items: BOBBY_NATURAL_REACTIONS.encouragement },
      { title: "Curiosité", items: BOBBY_NATURAL_REACTIONS.curiosity },
      { title: "Transitions", items: BOBBY_NATURAL_REACTIONS.transitions },
      { title: "Relances silence", items: SILENCE_RELAUNCHES },
      { title: "Phrases d'accueil", items: WELCOME_PHRASES },
      { title: "Phrases d'au revoir", items: FAREWELL_PHRASES },
    ];

    const BOBBY_EMOTIONS: { state: string; emoji: string; desc: string; triggers: string; response: string }[] = [
      { state: "happy", emoji: "😊", desc: "Joyeux — état par défaut", triggers: "aime, content, heureux, sourire, rire, adore", response: "Bobby sourit, yeux grands ouverts, bouche en U" },
      { state: "sad", emoji: "😢", desc: "Triste — empathie", triggers: "triste, pleure, cafard, blessé, seul, désolé", response: "Bobby est empathique, bouche inversée, yeux bas" },
      { state: "excited", emoji: "🤩", desc: "Excité — haute énergie", triggers: "wow, incroyable, génial, super, magique, bravo, 🎉", response: "Bobby s'illumine, yeux écarquillés, grand sourire" },
      { state: "surprised", emoji: "😲", desc: "Surpris — étonnement", triggers: "vraiment?, sérieux, c'est fou, bizarre, impossible", response: "Bobby ouvre grand les yeux, bouche en O" },
      { state: "curious", emoji: "🤔", desc: "Curieux — questionnement", triggers: "pourquoi, comment, c'est quoi, explique, ?", response: "Bobby penche la tête, sourcil levé, réfléchit" },
      { state: "thinking", emoji: "💭", desc: "Pensif — réflexion", triggers: "hmm, réfléchis, imagine, et si, suppose, difficile", response: "Bobby regarde en haut, yeux mi-clos, pense" },
      { state: "calm", emoji: "😌", desc: "Calme — apaisement", triggers: "calme, tranquille, dors, nuit, bonsoir, respire", response: "Bobby parle doucement, expression sereine" },
      { state: "playful", emoji: "😜", desc: "Joueur — taquin", triggers: "blague, taquin, coquin, farce, haha, drôle", response: "Bobby fait un clin d'œil, sourire malicieux" },
      { state: "proud", emoji: "💪", desc: "Fier — encouragement", triggers: "bravo, fier, champion, réussi, gagné, bien joué, 🏆", response: "Bobby rayonne, expression fière et chaleureuse" },
      { state: "reassuring", emoji: "🤗", desc: "Rassurant — soutien", triggers: "j'ai peur, monstres, noir, confiance, je suis là", response: "Bobby est doux, chaleureux, protecteur" },
      { state: "confused", emoji: "😕", desc: "Confus — incompréhension", triggers: "Bobby ne comprend pas la demande", response: "Bobby fronce les sourcils, tête penchée" },
      { state: "sleepy", emoji: "😴", desc: "Endormi — mode nuit", triggers: "Mode nuit, inactivité prolongée, bonsoir", response: "Bobby ferme les yeux, animation ZzZ" },
      { state: "listening", emoji: "👂", desc: "Écoute — attentif", triggers: "L'enfant parle, micro actif", response: "Bobby est attentif, yeux fixes, légère inclinaison" },
      { state: "speaking", emoji: "🗣️", desc: "Parle — réponse vocale", triggers: "Bobby génère une réponse TTS", response: "Bobby anime la bouche en sync avec l'audio" },
      { state: "attentive", emoji: "👀", desc: "Attentif — concentration", triggers: "Sujet important, question complexe", response: "Bobby se concentre, regard fixe et intense" },
      { state: "idle", emoji: "🫥", desc: "Inactif — attente", triggers: "Aucune interaction en cours", response: "Bobby attend, clignements naturels, respiration" },
    ];

    const EMOTION_TRIGGERS_QA = [
      { emotion: "Peur", triggers: ["j'ai peur", "j'ai peur du noir", "j'ai peur des monstres"], response: "Pas de panique ! Tu es en sécurité 😊" },
      { emotion: "Tristesse", triggers: ["je suis triste", "j'ai du chagrin", "je pleure"], response: "Je suis là pour toi 🤗" },
      { emotion: "Colère", triggers: ["je suis énervé", "je suis en colère", "je suis fâché"], response: "Respire doucement ! 😤" },
      { emotion: "Joie", triggers: ["je suis heureux", "je suis content", "je suis joyeux"], response: "Super ! 😊 Le bonheur ça se partage !" },
      { emotion: "Amour", triggers: ["je t'aime bobby", "tu es mon ami", "t'es mon meilleur ami"], response: "Moi aussi je t'aime ! 💙" },
      { emotion: "Jalousie", triggers: ["je suis jaloux", "la jalousie"], response: "Ça arrive à tout le monde ! Parle-moi 😔" },
      { emotion: "Honte", triggers: ["j'ai honte", "la honte"], response: "Ne t'inquiète pas ! Tout le monde fait des erreurs 💚" },
      { emotion: "Courage", triggers: ["le courage", "c'est quoi le courage"], response: "Faire quelque chose même quand on a peur ! 💪" },
      { emotion: "Gentillesse", triggers: ["la gentillesse", "être gentil"], response: "Penser aux autres ! 😊💙" },
      { emotion: "Respect", triggers: ["le respect", "c'est quoi le respect"], response: "Traiter les autres comme on veut être traité ! 🤝" },
      { emotion: "Patience", triggers: ["la patience", "être patient"], response: "Attendre sans s'énerver ! 😌" },
      { emotion: "Pardon", triggers: ["pardonner", "c'est quoi pardonner"], response: "Ne plus être en colère contre quelqu'un ! 💚" },
      { emotion: "Partage", triggers: ["partager", "c'est quoi partager"], response: "Donner une partie de ce qu'on a ! 🤝" },
    ];

    return (
      <div className="min-h-screen bg-[#0a0a0f] p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={goBack} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
            <span className="text-2xl">✨</span>
            <div>
              <h1 className="text-xl font-bold text-white">Personnalité Bobby</h1>
              <p className="text-white/40 text-xs">Tout ce qui fait Bobby unique</p>
            </div>
          </div>

          {/* Emotions grid */}
          <div className="bg-white/[0.04] backdrop-blur-xl rounded-[16px] p-4 border border-white/10">
            <h3 className="text-white/70 text-xs font-semibold mb-3 uppercase tracking-wider">🎭 États émotionnels ({BOBBY_EMOTIONS.length})</h3>
            <div className="grid grid-cols-2 gap-2">
              {BOBBY_EMOTIONS.map(e => (
                <div key={e.state} className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xl">{e.emoji}</span>
                    <span className="text-xs font-bold text-white/80 uppercase">{e.state}</span>
                  </div>
                  <p className="text-[11px] text-white/50 mb-1">{e.desc}</p>
                  <p className="text-[10px] text-white/30">🎯 {e.triggers}</p>
                  <p className="text-[10px] text-white/25 mt-0.5">👁 {e.response}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Emotion triggers QA */}
          <div className="bg-white/[0.04] backdrop-blur-xl rounded-[16px] p-4 border border-white/10">
            <h3 className="text-white/70 text-xs font-semibold mb-3 uppercase tracking-wider">💬 Réponses émotionnelles ({EMOTION_TRIGGERS_QA.length})</h3>
            <div className="space-y-2">
              {EMOTION_TRIGGERS_QA.map((eq, i) => (
                <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-semibold">{eq.emotion}</span>
                  </div>
                  <p className="text-[10px] text-white/40">Déclencheurs: {eq.triggers.join(", ")}</p>
                  <p className="text-[11px] text-white/60 mt-1">→ {eq.response}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Personality sections */}
          {sections.map((section, idx) => (
            <div key={idx} className="bg-white/[0.04] backdrop-blur-xl rounded-[16px] p-4 border border-white/10">
              <h3 className="text-white/70 text-xs font-semibold mb-3 uppercase tracking-wider">{section.title}</h3>
              <div className="space-y-1.5">
                {section.items.map((item, i) => (
                  <p key={i} className="text-sm text-white/60">• {item}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // CLOUD KB — Category detail
  // ═══════════════════════════════════════════════════════════════════
  if (topSection === "cloud" && cloudSection && currentCloudSection) {
    const Icon = currentCloudSection.icon;
    return (
      <div className="min-h-screen bg-[#0a0a0f] p-4">
      <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => { setCloudSection(null); setSearch(""); setAgeFilter(null); }} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
              <div className={`w-10 h-10 rounded-xl ${currentCloudSection.bgColor} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${currentCloudSection.color}`} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{currentCloudSection.label}</h1>
                <p className="text-white/40 text-xs">{cloudEntries.length} entrées</p>
              </div>
            </div>
            <Button onClick={() => setEditingEntry({ keywords: [], category: currentCloudSection.dbCategories[0], priority: 5, is_active: true, age_min: 3, age_max: 12 })}
              className="bg-purple-600 hover:bg-purple-700"><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
          </div>

          {/* Age filter */}
          <div className="flex gap-2 flex-wrap">
            {AGE_GROUPS.map(g => (
              <button key={g.label} onClick={() => setAgeFilter(ageFilter === g.label ? null : g.label)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${ageFilter === g.label ? "bg-blue-500/30 border-blue-400/50 text-blue-300" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"}`}>
                {g.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Rechercher…`}
              className="bg-white/10 border-white/20 text-white pl-9" />
          </div>

          {loading ? (
            <div className="text-center text-white/50 py-12">Chargement…</div>
          ) : cloudEntries.length === 0 ? (
            <div className="text-center text-white/40 py-16">
              <Icon className={`w-12 h-12 mx-auto mb-3 ${currentCloudSection.color} opacity-30`} />
              <p className="text-sm">Aucune entrée</p>
              <Button variant="ghost" className="mt-3 text-purple-400"
                onClick={() => setEditingEntry({ keywords: [], category: currentCloudSection.dbCategories[0], priority: 5, is_active: true, age_min: 3, age_max: 12 })}>
                <Plus className="w-4 h-4 mr-1" /> Créer la première
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {cloudEntries.map(entry => (
                <div key={entry.id} onClick={() => openKBDetail(entry)} className="cursor-pointer">
                  <EntryRow entry={entry} onToggle={() => handleToggleActive(entry)}
                    onEdit={() => setEditingEntry(entry)} onDelete={() => handleDelete(entry.id)} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // CLOUD KB — Category grid
  // ═══════════════════════════════════════════════════════════════════
  if (topSection === "cloud") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={goBack} className="text-white/70 p-2"><ArrowLeft className="w-5 h-5" /></Button>
              <span className="text-2xl">☁️</span>
              <div>
                <h1 className="text-xl font-bold text-white">Cloud Knowledge Base</h1>
                <p className="text-white/40 text-xs">{entries.length} entrées cloud modifiables</p>
              </div>
            </div>
            <Button onClick={() => setEditingEntry({ keywords: [], category: "général", priority: 5, is_active: true, age_min: 3, age_max: 12 })}
              className="bg-purple-600 hover:bg-purple-700"><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {BRAIN_SECTIONS.map(section => {
              const Icon = section.icon;
              const count = categoryCounts[section.id]?.total ?? 0;
              return (
                <button key={section.id} onClick={() => { setCloudSection(section.id); setSearch(""); }}
                  className="aspect-square bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-xl rounded-[20px] p-4 border border-white/[0.06] hover:border-white/[0.12] transition-all text-left flex flex-col justify-between group"
                >
                  <div className={`w-10 h-10 rounded-xl ${section.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${section.color}`} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{count}</p>
                    <h3 className="text-xs font-semibold text-white/70">{section.label}</h3>
                    <p className="text-[9px] text-white/40 mt-0.5">{section.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // BOBBY CLOUD USERS — admin panel
  // ═══════════════════════════════════════════════════════════════════
  if (topSection === "cloudusers") {
    const filteredCloudUsers = cloudUsers.filter(u => {
      if (!cloudUserSearch) return true;
      const q = cloudUserSearch.toLowerCase();
      return u.child_name.toLowerCase().includes(q) || u.sync_code.toLowerCase().includes(q) || u.device_info?.toLowerCase().includes(q);
    });

    const formatDate = (iso: string) => {
      const d = new Date(iso);
      return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    };

    const timeSince = (iso: string) => {
      const diff = Date.now() - new Date(iso).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 60) return `${mins}m`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h`;
      return `${Math.floor(hours / 24)}j`;
    };

    if (selectedCloudUser) {
      const u = selectedCloudUser;
      const ps = u.parent_settings || {};
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white p-4 max-w-4xl mx-auto">
          <button onClick={() => setSelectedCloudUser(null)} className="flex items-center gap-2 text-white/60 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>

          {/* User hero */}
          <div className="bg-gradient-to-br from-sky-500/20 to-blue-600/10 rounded-2xl p-6 border border-sky-500/20 mb-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-sky-500/20 flex items-center justify-center text-3xl">👤</div>
              <div>
                <h2 className="text-2xl font-bold">{u.child_name}</h2>
                <p className="text-white/50 text-sm font-mono">{u.sync_code}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-lg font-bold">{formatDate(u.created_at)}</p>
                <p className="text-[10px] text-white/40">Créé le</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-lg font-bold">{timeSince(u.last_synced_at)}</p>
                <p className="text-[10px] text-white/40">Dernière sync</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-lg font-bold">{u.device_info ? "✅" : "❌"}</p>
                <p className="text-[10px] text-white/40">Appareil</p>
              </div>
            </div>
          </div>

          {/* Parent Settings */}
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10 mb-4">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">⚙️ Réglages parents</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Nom enfant", value: ps.childName || "—", emoji: "👦" },
                { label: "Âge", value: ps.childAge ? `${ps.childAge} ans` : "—", emoji: "🎂" },
                { label: "Voix", value: ps.voiceType || "—", emoji: "🎙️" },
                { label: "Personnalité", value: ps.personality || "—", emoji: "🧠" },
                { label: "Vitesse voix", value: ps.voiceSpeed || "—", emoji: "⚡" },
                { label: "Filtre contenu", value: ps.contentFilter || "—", emoji: "🛡️" },
                { label: "Ultra sécurisé", value: ps.ultraSafe ? "✅ Oui" : "❌ Non", emoji: "🔒" },
                { label: "Durée max", value: ps.timeLimitMinutes ? `${ps.timeLimitMinutes}min` : "Illimité", emoji: "⏱️" },
                { label: "Mode nuit", value: ps.nightMode?.active ? `${ps.nightMode.startHour}-${ps.nightMode.endHour}` : "Désactivé", emoji: "🌙" },
                { label: "Enregistrement", value: ps.recordConversations ? "✅" : "❌", emoji: "🎤" },
                { label: "Couleur Bobby", value: ps.bobbyColor || "blue", emoji: "🎨" },
                { label: "Niveau langue", value: ps.languageLevel || "—", emoji: "📖" },
              ].map(item => (
                <div key={item.label} className="bg-white/5 rounded-xl p-3 flex items-center gap-3">
                  <span className="text-lg">{item.emoji}</span>
                  <div>
                    <p className="text-[10px] text-white/40">{item.label}</p>
                    <p className="text-sm font-semibold">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Thèmes activés */}
          {ps.enabledThemes?.length > 0 && (
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10 mb-4">
              <h3 className="text-lg font-bold mb-3">🎨 Thèmes activés</h3>
              <div className="flex flex-wrap gap-2">
                {ps.enabledThemes.map((t: string) => (
                  <span key={t} className="px-3 py-1.5 rounded-lg bg-sky-500/15 text-sky-300 text-sm font-medium">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Sujets bloqués */}
          {ps.blockedTopics?.length > 0 && (
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10 mb-4">
              <h3 className="text-lg font-bold mb-3">🚫 Sujets bloqués</h3>
              <div className="flex flex-wrap gap-2">
                {ps.blockedTopics.map((t: string) => (
                  <span key={t} className="px-3 py-1.5 rounded-lg bg-red-500/15 text-red-300 text-sm font-medium">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Device info */}
          {u.device_info && (
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10 mb-4">
              <h3 className="text-lg font-bold mb-2">📱 Appareil</h3>
              <p className="text-sm text-white/50 font-mono break-all">{u.device_info}</p>
            </div>
          )}

          {/* Danger zone */}
          <div className="bg-red-500/5 rounded-2xl p-5 border border-red-500/20">
            <h3 className="text-lg font-bold text-red-400 mb-2">⚠️ Zone danger</h3>
            <p className="text-sm text-white/40 mb-3">Supprimer ce profil Bobby Cloud. L'utilisateur devra recréer un compte.</p>
            <Button
              variant="destructive"
              onClick={async () => {
                await supabase.from("cloud_profiles").delete().eq("id", u.id);
                setSelectedCloudUser(null);
                fetchCloudUsers();
                toast.success("Profil Bobby Cloud supprimé");
              }}
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Supprimer le profil
            </Button>
          </div>
        </div>
      );
    }

    // Cloud Users List
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white p-4 max-w-4xl mx-auto">
        <button onClick={() => setTopSection(null)} className="flex items-center gap-2 text-white/60 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        {/* Header */}
        <div className="bg-gradient-to-br from-sky-500/15 to-blue-600/10 rounded-2xl p-6 border border-sky-500/20 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">☁️👥</span>
            <div>
              <h2 className="text-2xl font-bold">Bobby Cloud</h2>
              <p className="text-white/50 text-sm">{cloudUsers.length} profil{cloudUsers.length > 1 ? "s" : ""} enregistré{cloudUsers.length > 1 ? "s" : ""}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-sky-400">{cloudUsers.length}</p>
              <p className="text-[9px] text-white/40">Total</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-green-400">
                {cloudUsers.filter(u => Date.now() - new Date(u.last_synced_at).getTime() < 86400000).length}
              </p>
              <p className="text-[9px] text-white/40">Actifs 24h</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-amber-400">
                {cloudUsers.filter(u => Date.now() - new Date(u.last_synced_at).getTime() < 604800000).length}
              </p>
              <p className="text-[9px] text-white/40">Actifs 7j</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-purple-400">
                {new Set(cloudUsers.map(u => u.child_name.toLowerCase())).size}
              </p>
              <p className="text-[9px] text-white/40">Enfants</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={cloudUserSearch}
            onChange={e => setCloudUserSearch(e.target.value)}
            placeholder="Rechercher par nom, code sync ou appareil…"
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-sky-500/40"
          />
        </div>

        {/* Refresh */}
        <div className="flex justify-end mb-3">
          <Button size="sm" variant="outline" onClick={fetchCloudUsers} disabled={cloudUsersLoading}
            className="text-white/60 border-white/10 hover:border-white/20 hover:text-white text-xs">
            {cloudUsersLoading ? "…" : "🔄 Rafraîchir"}
          </Button>
        </div>

        {/* Users list */}
        {filteredCloudUsers.length === 0 ? (
          <div className="bg-white/5 rounded-2xl p-8 text-center border border-white/10">
            <span className="text-5xl block mb-3">☁️</span>
            <p className="text-white/50">Aucun profil Bobby Cloud trouvé</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCloudUsers.map(user => (
              <button key={user.id} onClick={() => setSelectedCloudUser(user)}
                className="w-full bg-white/5 hover:bg-white/8 rounded-xl p-4 border border-white/10 hover:border-sky-500/20 transition-all text-left flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-xl bg-sky-500/15 flex items-center justify-center text-xl shrink-0">
                  👤
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-white">{user.child_name}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 font-mono">{user.sync_code}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-white/40">
                    <span>📅 {formatDate(user.created_at)}</span>
                    <span>🔄 {timeSince(user.last_synced_at)}</span>
                    {(user.parent_settings as any)?.voiceType && (
                      <span>🎙️ {(user.parent_settings as any).voiceType}</span>
                    )}
                    {(user.parent_settings as any)?.childAge && (
                      <span>🎂 {(user.parent_settings as any).childAge} ans</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // BOBBY STORE — CRUD catalog management
  // ═══════════════════════════════════════════════════════════════════
  if (topSection === "expressions") {
    return <ExpressionPreview onBack={() => { setTopSection(null); }} />;
  }

  if (topSection === "autolearn") {
    return <AutoLearnPanel onBack={() => { setTopSection(null); }} />;
  }

  if (topSection === "store") {
    return (
      <AdminStoreManager
        storeItems={storeItems.map((s: any) => ({
          ...s,
          detailed_description: s.detailed_description || "",
          is_premium: s.is_premium ?? false,
          version_label: s.version_label || "1.0",
          rating: s.rating ?? 4.5,
          rating_count: s.rating_count ?? 0,
          content_count: s.content_count ?? 0,
          changelog: s.changelog || "",
          creator_name: s.creator_name || "Équipe Bobby",
          creator_role: s.creator_role || "Éducation & Divertissement",
          learning_objectives: s.learning_objectives ?? [],
          skills_developed: s.skills_developed ?? [],
          duration_estimate: s.duration_estimate || "10-15 min",
          difficulty_level: s.difficulty_level || "adaptatif",
          languages: s.languages ?? ["fr"],
          cover_image_url: s.cover_image_url || "",
          screenshots: s.screenshots ?? [],
          last_updated_at: s.last_updated_at || s.updated_at || s.created_at,
          content_items: Array.isArray(s.content_items) ? s.content_items : [],
        }))}
        installCounts={liveInstallCounts}
        onRefresh={fetchStoreItems}
        onBack={goBack}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* ── Header — iOS large title style ── */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/")} className="w-10 h-10 rounded-2xl bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-all active:scale-95">
            <ArrowLeft className="w-5 h-5 text-white/60" />
          </button>
          <div className="flex-1">
            <h1 className="text-[28px] font-bold text-white tracking-tight">Cerveau Bobby</h1>
            <p className="text-white/30 text-[13px]">Base opérationnelle</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
            <Brain className="w-6 h-6 text-purple-400" />
          </div>
        </div>

        {/* ── Hero counter ── */}
        {(() => {
          const intCount = typeof sectionCounts.interactions === "number" ? sectionCounts.interactions : 0;
          const total = intCount + BOBBY_MULTI_RESPONSES.length + QA_DATABASE.length + BLAGUES.length + HISTOIRES.length + CHANSONS.length + (sectionCounts.jeux as number) + entries.length;
          return (
            <div className="bg-gradient-to-r from-purple-500/10 via-blue-500/8 to-cyan-500/10 backdrop-blur-xl rounded-[20px] p-5 border border-purple-500/10">
              <p className="text-[36px] font-extrabold text-white tracking-tight">{total.toLocaleString("fr-FR")}</p>
              <p className="text-[13px] text-white/40 -mt-0.5">contenus dans le cerveau</p>
            </div>
          );
        })()}

        {/* ── Stats pills ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {[
            { label: "Interactions", count: sectionCounts.interactions, color: "text-cyan-400" },
            { label: "Multi-Rép.", count: BOBBY_MULTI_RESPONSES.length, color: "text-orange-400" },
            { label: "QA", count: QA_DATABASE.length, color: "text-amber-400" },
            { label: "Blagues", count: BLAGUES.length, color: "text-green-400" },
            { label: "Histoires", count: HISTOIRES.length, color: "text-purple-400" },
            { label: "Chansons", count: CHANSONS.length, color: "text-rose-400" },
            { label: "Jeux", count: sectionCounts.jeux, color: "text-blue-400" },
            { label: "Cloud", count: entries.length, color: "text-sky-400" },
          ].map(stat => (
            <div key={stat.label} className="flex-shrink-0 bg-white/[0.04] rounded-2xl px-4 py-2.5 border border-white/[0.05] text-center min-w-[72px]">
              <p className={`text-[15px] font-bold ${stat.color}`}>{stat.count}</p>
              <p className="text-[9px] text-white/30 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Main grid — Apple-style cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {TOP_SECTIONS_CONFIG.map(section => (
            <SquareCard
              key={section.id}
              label={section.label}
              emoji={section.emoji}
              count={sectionCounts[section.id] ?? "…"}
              desc={section.desc}
              color={section.color}
              bgColor={section.bgColor}
              onClick={() => {
                setTopSection(section.id);
                setSearch("");
              }}
            />
          ))}
        </div>

        <p className="text-[10px] text-white/15 text-center pt-2">Données embarquées en lecture seule · Cloud KB modifiable</p>
        {detailPortal}
      </div>
    </div>
  );
};

export default Admin;
