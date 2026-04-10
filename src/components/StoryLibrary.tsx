/**
 * StoryLibrary — Card-based story browser with square category cards,
 * square story cards, full-text reading, Bobby narration, and favorites.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { BookOpen, Heart, Play, Pause, ArrowLeft, Clock, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchTTSAudio, useAudioQueue } from "@/lib/voicePipeline";
import type { VoiceProfile } from "@/lib/voicePipeline";
import { eventBus } from "@/lib/eventBus";

interface Story {
  id: string;
  title: string;
  theme: string;
  category: string;
  age_min: number;
  age_max: number;
  duration: string;
  mood: string | null;
  summary: string | null;
  full_text: string | null;
  template_text: string;
  interactive: boolean;
  is_favorite: boolean;
}

const CATEGORY_META: Record<string, { emoji: string; gradient: string; accent: string; label?: string }> = {
  Pirate:    { emoji: "🏴‍☠️", gradient: "from-amber-500/20 to-orange-500/10", accent: "border-amber-500/25" },
  Princesse: { emoji: "👑", gradient: "from-pink-500/20 to-rose-500/10", accent: "border-pink-500/25" },
  Espace:    { emoji: "🚀", gradient: "from-indigo-500/20 to-blue-500/10", accent: "border-indigo-500/25" },
  Animaux:   { emoji: "🐾", gradient: "from-emerald-500/20 to-green-500/10", accent: "border-emerald-500/25" },
  Magie:     { emoji: "✨", gradient: "from-violet-500/20 to-purple-500/10", accent: "border-violet-500/25" },
  Éducatif:  { emoji: "🧠", gradient: "from-teal-500/20 to-cyan-500/10", accent: "border-teal-500/25" },
  Aventure:  { emoji: "⚔️", gradient: "from-red-500/20 to-orange-500/10", accent: "border-red-500/25" },
  Nature:    { emoji: "🌿", gradient: "from-lime-500/20 to-green-500/10", accent: "border-lime-500/25" },
  Mythologie:  { emoji: "🏛️", gradient: "from-yellow-500/20 to-amber-500/10", accent: "border-yellow-500/25", label: "Mythologie" },
  Musique:     { emoji: "🎵", gradient: "from-fuchsia-500/20 to-pink-500/10", accent: "border-fuchsia-500/25", label: "Musique" },
  Frissons:    { emoji: "👻", gradient: "from-slate-500/20 to-zinc-500/10", accent: "border-slate-500/25", label: "Frissons" },
  Voyages:     { emoji: "🌍", gradient: "from-sky-500/20 to-blue-500/10", accent: "border-sky-500/25", label: "Voyages" },
};

// All categories to show in the grid (including empty ones)
const ALL_CATEGORIES = ["Pirate", "Princesse", "Espace", "Animaux", "Magie", "Éducatif", "Aventure", "Nature", "Mythologie", "Musique", "Frissons", "Voyages"];

const DEFAULT_META = { emoji: "📖", gradient: "from-slate-500/20 to-gray-500/10", accent: "border-slate-500/25" };

const DURATION_LABELS: Record<string, string> = {
  short: "3-5 min",
  medium: "6-8 min",
  long: "10-15 min",
};

interface StoryLibraryProps {
  childName: string;
  voiceProfile?: string;
}

export default function StoryLibrary({ childName, voiceProfile = "female" }: StoryLibraryProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [narrating, setNarrating] = useState(false);
  const [showFullText, setShowFullText] = useState(false);

  const audioQueue = useAudioQueue();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { loadStories(); }, []);

  const loadStories = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("story_templates")
      .select("*")
      .order("category", { ascending: true })
      .order("title", { ascending: true });
    if (data) setStories(data as unknown as Story[]);
    setLoading(false);
  };

  const toggleFavorite = async (storyId: string) => {
    const story = stories.find(s => s.id === storyId);
    if (!story) return;
    const newVal = !story.is_favorite;
    await supabase.from("story_templates").update({ is_favorite: newVal }).eq("id", storyId);
    setStories(prev => prev.map(s => s.id === storyId ? { ...s, is_favorite: newVal } : s));
    if (selectedStory?.id === storyId) {
      setSelectedStory(prev => prev ? { ...prev, is_favorite: newVal } : null);
    }
  };

  const personalizeText = (text: string) => text.replace(/\{child_name\}/g, childName);

  const startNarration = useCallback(async (story: Story) => {
    if (narrating) {
      abortRef.current?.abort();
      audioQueue.stopAll();
      setNarrating(false);
      return;
    }
    const text = story.full_text || story.template_text;
    if (!text) return;
    const personalized = personalizeText(text);
    eventBus.emit({ type: "NARRATE_STORY", storyId: story.id, title: story.title, text: personalized });
  }, [narrating, audioQueue, childName]);

  useEffect(() => {
    return () => { abortRef.current?.abort(); audioQueue.stopAll(); };
  }, []);

  // Group stories by category
  const categories = stories.reduce<Record<string, Story[]>>((acc, story) => {
    const cat = story.category || "Autre";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(story);
    return acc;
  }, {});

  const favorites = stories.filter(s => s.is_favorite);

  // ─── Story Detail View ───
  if (selectedStory) {
    const meta = CATEGORY_META[selectedStory.category] || DEFAULT_META;
    const personalized = selectedStory.full_text
      ? personalizeText(selectedStory.full_text)
      : personalizeText(selectedStory.template_text);

    return (
      <div className="p-4 space-y-4">
        <button
          onClick={() => { setSelectedStory(null); setShowFullText(false); setNarrating(false); abortRef.current?.abort(); audioQueue.stopAll(); }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {selectedCategory || "Bibliothèque"}
        </button>

        <div className={`rounded-2xl overflow-hidden border ${meta.accent}`}>
          {/* Hero header */}
          <div className={`bg-gradient-to-br ${meta.gradient} px-5 pt-6 pb-5`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{meta.emoji}</span>
                <div>
                  <h3 className="text-lg font-bold text-foreground leading-tight">{selectedStory.title}</h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] px-2 py-0.5 bg-foreground/5 text-foreground/70 rounded-full font-semibold">
                      {selectedStory.category}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {DURATION_LABELS[selectedStory.duration] || selectedStory.duration}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => toggleFavorite(selectedStory.id)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  selectedStory.is_favorite ? "bg-red-500/10 text-red-500" : "bg-foreground/5 text-muted-foreground hover:text-red-400"
                }`}
              >
                <Heart className={`w-5 h-5 ${selectedStory.is_favorite ? "fill-current" : ""}`} />
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="bg-card px-5 py-4 space-y-3">
            {selectedStory.mood && (
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] text-muted-foreground">{selectedStory.mood}</span>
              </div>
            )}
            {selectedStory.summary && (
              <div>
                <h4 className="text-[11px] font-semibold text-foreground mb-1">Résumé</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{selectedStory.summary}</p>
              </div>
            )}
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>👤 {selectedStory.age_min}-{selectedStory.age_max} ans</span>
              {selectedStory.interactive && <span>🎮 Interactive</span>}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-card px-5 pb-5 space-y-2">
            <button
              onClick={() => setShowFullText(!showFullText)}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 bg-gradient-to-r ${meta.gradient} border ${meta.accent} hover:shadow-md`}
            >
              <BookOpen className="w-4 h-4" />
              {showFullText ? "Masquer le texte" : "📖 Lire l'histoire"}
            </button>
            <button
              onClick={() => startNarration(selectedStory)}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                narrating
                  ? "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20"
                  : "bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:scale-[1.01]"
              }`}
            >
              {narrating ? (
                <><Pause className="w-4 h-4" /> Arrêter la narration</>
              ) : (
                <><Play className="w-4 h-4" /> ▶️ Bobby raconte</>
              )}
            </button>
          </div>
        </div>

        {showFullText && (
          <div className="bg-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[13px] font-bold text-foreground">Texte complet</h4>
              <button onClick={() => setShowFullText(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-[12px] text-foreground/80 leading-relaxed whitespace-pre-line max-h-[50vh] overflow-y-auto">
              {personalized}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Category Stories View (square story cards) ───
  if (selectedCategory) {
    const catStories = categories[selectedCategory] || [];
    const meta = CATEGORY_META[selectedCategory] || DEFAULT_META;

    return (
      <div className="p-4 space-y-4">
        <button
          onClick={() => setSelectedCategory(null)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Bibliothèque
        </button>

        {/* Category header */}
        <div className={`bg-gradient-to-br ${meta.gradient} rounded-2xl p-5 border ${meta.accent}`}>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{meta.emoji}</span>
            <div>
              <h3 className="text-lg font-bold text-foreground">{selectedCategory}</h3>
              <p className="text-[11px] text-muted-foreground">{catStories.length} histoire{catStories.length > 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>

        {/* Story cards grid */}
        <div className="grid grid-cols-2 gap-3">
          {catStories.map(story => (
            <button
              key={story.id}
              onClick={() => setSelectedStory(story)}
              className={`bg-gradient-to-br ${meta.gradient} rounded-2xl p-4 text-left border ${meta.accent} hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 relative group aspect-square flex flex-col justify-between`}
            >
              <div>
                <span className="text-2xl block mb-2">{meta.emoji}</span>
                <h4 className="text-[12px] font-bold text-foreground leading-tight line-clamp-2">{story.title}</h4>
                {story.mood && (
                  <p className="text-[9px] text-muted-foreground mt-1 line-clamp-1">{story.mood}</p>
                )}
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {DURATION_LABELS[story.duration] || story.duration}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(story.id); }}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    story.is_favorite ? "text-red-500" : "text-muted-foreground/30 group-hover:text-red-300"
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${story.is_favorite ? "fill-current" : ""}`} />
                </button>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Main View: Category cards grid ───
  return (
    <div className="p-4 space-y-4">
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Aucune histoire disponible</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Les histoires seront ajoutées bientôt !</p>
        </div>
      ) : (
        <>
          {/* Favorites */}
          {favorites.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-4 h-4 text-red-500" />
                <h3 className="text-[13px] font-bold text-foreground">Favoris</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {favorites.map(story => {
                  const meta = CATEGORY_META[story.category] || DEFAULT_META;
                  return (
                    <button
                      key={story.id}
                      onClick={() => setSelectedStory(story)}
                      className={`bg-gradient-to-br ${meta.gradient} rounded-2xl p-4 text-left border ${meta.accent} hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 relative`}
                    >
                      <Heart className="w-3 h-3 text-red-500 fill-current absolute top-3 right-3" />
                      <span className="text-2xl block mb-2">{meta.emoji}</span>
                      <h4 className="text-[12px] font-bold text-foreground leading-tight line-clamp-2">{story.title}</h4>
                      <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 mt-1.5">
                        <Clock className="w-2.5 h-2.5" />
                        {DURATION_LABELS[story.duration] || story.duration}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category cards grid */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-primary" />
              <h3 className="text-[13px] font-bold text-foreground">Catégories</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {ALL_CATEGORIES.map(category => {
                const catStories = categories[category] || [];
                const meta = CATEGORY_META[category] || DEFAULT_META;
                const isEmpty = catStories.length === 0;
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`bg-gradient-to-br ${meta.gradient} rounded-2xl p-5 text-left border ${meta.accent} hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 aspect-square flex flex-col justify-between ${isEmpty ? "opacity-75" : ""}`}
                  >
                    <span className="text-4xl block">{meta.emoji}</span>
                    <div>
                      <h3 className="text-[14px] font-bold text-foreground">{category}</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {isEmpty ? "Bientôt disponible ✨" : `${catStories.length} histoire${catStories.length > 1 ? "s" : ""}`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
