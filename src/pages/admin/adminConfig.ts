import {
  Brain, MessageSquare, BookOpen, Laugh, Gamepad2, Heart, Music,
  Star, Sparkles, Globe, Microscope, Dog,
  GraduationCap, HelpCircle, Lightbulb, Home, Utensils, Cpu,
  CloudLightning, Eye, Users, Zap, Search, Smartphone,
  type LucideIcon,
} from "lucide-react";

export const ACCESS_CODE = "bobby2026";

// ─── Types ─────────────────────────────────────────────────────────
export interface KBEntry {
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

export interface StoreContentItem {
  id: string; slug: string; name: string; emoji: string; description: string;
  category: string; age_min: number; age_max: number; tags: string[];
  size_label: string; is_new: boolean; is_popular: boolean; is_featured: boolean;
  is_active: boolean; version: number; install_count: number; created_at: string;
}

export interface CloudUser {
  id: string; sync_code: string; child_name: string; parent_settings: any;
  child_memory_snapshot: any; device_info: string | null;
  last_synced_at: string; created_at: string; updated_at: string;
}

export interface BobbyDevice {
  bobby_code: string;
  bobby_id: string;
  child_name: string | null;
  child_age: number | null;
  bobby_claimed_at: string | null;
  parent_code: string;
  parent_claimed_at: string | null;
  parent_device_token: string | null;
  is_active: boolean;
}

export interface RealConversation {
  session_id: string;
  child_name: string;
  child_age: number;
  started_at: string;
  messages: { role: string; content: string; detected_emotion: string | null; created_at: string }[];
  topics: string[] | null;
  detected_emotions: string[] | null;
}

export interface LiveStats {
  activeSessions: number;
  todaySessions: number;
  todayMessages: number;
  lastActivity: string | null;
  avgDuration: number;
  topEmotion: string;
}

export interface DayData { day: string; sessions: number; messages: number; }
export interface EmotionData { name: string; value: number; color: string; }

export type TopSection = "interactions" | "multiresponses" | "qa" | "blagues" | "histoires" | "cerveau" | "cloud" | "jeux" | "chansons" | "store" | "expressions" | "autolearn" | "cloudusers" | "kbdebug" | "devices";

// ─── Category configs ──────────────────────────────────────────────
export interface CategoryConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  description: string;
  dbCategories: string[];
}

export const INTERACTION_CATEGORIES: {
  id: string; label: string; icon: LucideIcon; color: string; bgColor: string; emoji: string;
}[] = [
  { id: "emotions", label: "Émotions", icon: Heart, color: "text-pink-400", bgColor: "bg-pink-500/20", emoji: "💛" },
  { id: "social", label: "Social", icon: Users, color: "text-rose-400", bgColor: "bg-rose-500/20", emoji: "👥" },
  { id: "family", label: "Famille", icon: Home, color: "text-orange-400", bgColor: "bg-orange-500/20", emoji: "👨‍👩‍👧" },
  { id: "animals", label: "Animaux", icon: Dog, color: "text-amber-400", bgColor: "bg-amber-500/20", emoji: "🐾" },
  { id: "nature", label: "Nature", icon: Sparkles, color: "text-green-400", bgColor: "bg-green-500/20", emoji: "🌿" },
  { id: "sport", label: "Sport", icon: Zap, color: "text-blue-400", bgColor: "bg-blue-500/20", emoji: "⚽" },
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

export const AGE_GROUPS = [
  { label: "Tous", min: 3, max: 12 },
  { label: "3-5 ans", min: 3, max: 5 },
  { label: "6-8 ans", min: 6, max: 8 },
  { label: "9-10 ans", min: 9, max: 10 },
  { label: "11-12 ans", min: 11, max: 12 },
];

export const BRAIN_SECTIONS: CategoryConfig[] = [
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

export const ALL_DB_CATEGORIES = [
  "général", "éducatif", "émotions", "mémoire", "imagination", "logique", "décision",
  "animaux", "nature", "famille", "social", "nourriture", "opinion", "Tu préfères lequel ?",
  "quotidien", "routine", "jeux", "activité", "ludique", "motivation", "école", "espace",
  "humour", "sécurité", "méta",
];

export const TOP_SECTIONS_CONFIG: {
  id: TopSection; label: string; icon: LucideIcon; color: string; bgColor: string; desc: string; emoji: string;
}[] = [
  { id: "interactions", label: "Interactions", icon: MessageSquare, color: "text-cyan-500", bgColor: "bg-cyan-500/20", desc: "Base d'interactions enfant par âge & catégorie", emoji: "🧠" },
  { id: "multiresponses", label: "Multi-Réponses", icon: Zap, color: "text-orange-500", bgColor: "bg-orange-500/20", desc: "Réponses adaptatives multi-tags (offline)", emoji: "⚡" },
  { id: "jeux", label: "Jeux & Quiz", icon: Gamepad2, color: "text-blue-500", bgColor: "bg-blue-500/20", desc: "Quiz animaux, sciences, vrai/faux, devinettes", emoji: "🎮" },
  { id: "qa", label: "QA Database", icon: HelpCircle, color: "text-amber-500", bgColor: "bg-amber-500/20", desc: "Questions-réponses offline structurées", emoji: "❓" },
  { id: "blagues", label: "Blagues", icon: Laugh, color: "text-green-500", bgColor: "bg-green-500/20", desc: "Blagues adaptées par âge & catégorie", emoji: "😂" },
  { id: "histoires", label: "Histoires", icon: BookOpen, color: "text-purple-500", bgColor: "bg-purple-500/20", desc: "Contes & aventures personnalisées", emoji: "📖" },
  { id: "chansons", label: "Chansons", icon: Music, color: "text-rose-500", bgColor: "bg-rose-500/20", desc: "Comptines, berceuses, éducatif, activités", emoji: "🎵" },
  { id: "cerveau", label: "Personnalité", icon: Sparkles, color: "text-pink-500", bgColor: "bg-pink-500/20", desc: "Personnalité, réactions, phrases Bobby", emoji: "✨" },
  { id: "cloud", label: "Cloud KB", icon: Globe, color: "text-blue-500", bgColor: "bg-blue-500/20", desc: "Base cloud extensible (ajout via admin)", emoji: "☁️" },
  { id: "store", label: "Bobby Store", icon: Star, color: "text-emerald-500", bgColor: "bg-emerald-500/20", desc: "Gérer le catalogue du store (CRUD)", emoji: "🛒" },
  { id: "expressions", label: "Expressions", icon: Eye, color: "text-fuchsia-500", bgColor: "bg-fuchsia-500/20", desc: "Preview & test des expressions faciales", emoji: "🎭" },
  { id: "autolearn", label: "Auto-Learning", icon: Microscope, color: "text-lime-500", bgColor: "bg-lime-500/20", desc: "IA auto-complétion depuis les conversations", emoji: "🧬" },
  { id: "cloudusers", label: "Bobby Cloud", icon: Users, color: "text-sky-500", bgColor: "bg-sky-500/20", desc: "Utilisateurs Bobby Cloud, profils sync", emoji: "☁️👥" },
  { id: "kbdebug", label: "KB Debug", icon: Search, color: "text-emerald-500", bgColor: "bg-emerald-500/20", desc: "Debug scoring sémantique KB en temps réel", emoji: "🔍" },
  { id: "devices", label: "Appareils Bobby", icon: Smartphone, color: "text-orange-500", bgColor: "bg-orange-500/20", desc: "Tous les Bobby créés, statut et activation", emoji: "📱" },
];

export const EMOTION_COLORS: Record<string, string> = {
  happy: "#22c55e", sad: "#3b82f6", angry: "#ef4444", scared: "#eab308",
  surprised: "#8b5cf6", neutral: "#64748b", excited: "#ec4899", curious: "#06b6d4",
  love: "#f43f5e", proud: "#6366f1", shy: "#a855f7", frustrated: "#f97316",
  joie: "#22c55e", tristesse: "#3b82f6", colère: "#ef4444", peur: "#eab308",
  anxiété: "#f59e0b", frustration: "#f97316", curiosité: "#06b6d4", amour: "#f43f5e",
  fierté: "#6366f1", timidité: "#a855f7", surprise: "#8b5cf6", excité: "#ec4899",
};

export const EMOTION_LABELS: Record<string, string> = {
  happy: "joie", sad: "tristesse", angry: "colère", scared: "peur",
  surprised: "surprise", neutral: "neutre", excited: "excité", curious: "curiosité",
  love: "amour", proud: "fierté", shy: "timidité", frustrated: "frustration",
};

export const QA_INTENT_EMOJIS: Record<string, string> = {
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
