/**
 * StoryLibrary — Parent-facing story browser with categories,
 * full-text reading, Bobby narration, and favorites.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { BookOpen, Heart, Play, Pause, ChevronRight, ArrowLeft, Clock, Sparkles, X } from "lucide-react";
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

const CATEGORY_ICONS: Record<string, string> = {
  Pirate: "🏴‍☠️",
  Princesse: "👑",
  Espace: "🚀",
  Animaux: "🐾",
  Magie: "✨",
  Éducatif: "🧠",
  Aventure: "⚔️",
  Nature: "🌿",
};

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
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [narrating, setNarrating] = useState(false);
  const [showFullText, setShowFullText] = useState(false);

  const audioQueue = useAudioQueue();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadStories();
  }, []);

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

  const personalizeText = (text: string) => {
    return text.replace(/\{child_name\}/g, childName);
  };

  const startNarration = useCallback(async (story: Story) => {
    if (narrating) {
      // Stop narration
      abortRef.current?.abort();
      audioQueue.stopAll();
      setNarrating(false);
      return;
    }

    const text = story.full_text || story.template_text;
    if (!text) return;

    const personalized = personalizeText(text);

    // Emit event to redirect to home and narrate directly
    eventBus.emit({
      type: "NARRATE_STORY",
      storyId: story.id,
      title: story.title,
      text: personalized,
    });
  }, [narrating, audioQueue, childName]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      audioQueue.stopAll();
    };
  }, []);

  // Group stories by category
  const categories = stories.reduce<Record<string, Story[]>>((acc, story) => {
    const cat = story.category || "Autre";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(story);
    return acc;
  }, {});

  // Favorites
  const favorites = stories.filter(s => s.is_favorite);

  // ─── Detail View ───
  if (selectedStory) {
    const personalized = selectedStory.full_text
      ? personalizeText(selectedStory.full_text)
      : personalizeText(selectedStory.template_text);

    return (
      <div className="p-4 space-y-4">
        {/* Back button */}
        <button
          onClick={() => { setSelectedStory(null); setShowFullText(false); setNarrating(false); abortRef.current?.abort(); audioQueue.stopAll(); }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Bibliothèque
        </button>

        {/* Story card */}
        <div className="bg-card rounded-2xl overflow-hidden">
          {/* Header with emoji */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 px-5 pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{CATEGORY_ICONS[selectedStory.category] || "📖"}</span>
                <div>
                  <h3 className="text-base font-bold text-foreground leading-tight">{selectedStory.title}</h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] px-2 py-0.5 bg-primary/15 text-primary rounded-full font-semibold">
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
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  selectedStory.is_favorite
                    ? "bg-red-50 text-red-500"
                    : "bg-muted/50 text-muted-foreground hover:text-red-400"
                }`}
              >
                <Heart className={`w-5 h-5 ${selectedStory.is_favorite ? "fill-current" : ""}`} />
              </button>
            </div>
          </div>

          {/* Mood & Info */}
          <div className="px-5 py-3 space-y-3">
            {selectedStory.mood && (
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] text-muted-foreground">{selectedStory.mood}</span>
              </div>
            )}

            {/* Summary */}
            {selectedStory.summary && (
              <div>
                <h4 className="text-[11px] font-semibold text-foreground mb-1">Résumé</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{selectedStory.summary}</p>
              </div>
            )}

            {/* Age range */}
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>👤 {selectedStory.age_min}-{selectedStory.age_max} ans</span>
              {selectedStory.interactive && <span>🎮 Interactive</span>}
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-5 pb-4 space-y-2">
            {/* Full text toggle */}
            <button
              onClick={() => setShowFullText(!showFullText)}
              className="w-full py-3 rounded-xl bg-muted/40 text-foreground font-semibold text-sm hover:bg-muted/60 transition-all flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              {showFullText ? "Masquer le texte" : "Lire l'histoire"}
            </button>

            {/* Bobby narration */}
            <button
              onClick={() => startNarration(selectedStory)}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                narrating
                  ? "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20"
                  : "bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:scale-[1.01]"
              }`}
            >
              {narrating ? (
                <>
                  <Pause className="w-4 h-4" />
                  Arrêter la narration
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  ▶️ Lancer narration Bobby
                </>
              )}
            </button>
          </div>
        </div>

        {/* Full text */}
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

  // ─── List View ───
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
          {/* Favorites section */}
          {favorites.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-4 h-4 text-red-500" />
                <h3 className="text-[13px] font-bold text-foreground">Favoris</h3>
              </div>
              <div className="space-y-2">
                {favorites.map(story => (
                  <StoryCard key={story.id} story={story} onSelect={setSelectedStory} onToggleFavorite={toggleFavorite} />
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          {Object.entries(categories).map(([category, catStories]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{CATEGORY_ICONS[category] || "📂"}</span>
                <h3 className="text-[13px] font-bold text-foreground">{category}</h3>
                <span className="text-[10px] text-muted-foreground">({catStories.length})</span>
              </div>
              <div className="space-y-2">
                {catStories.map(story => (
                  <StoryCard key={story.id} story={story} onSelect={setSelectedStory} onToggleFavorite={toggleFavorite} />
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Story Card ───
function StoryCard({ story, onSelect, onToggleFavorite }: {
  story: Story;
  onSelect: (s: Story) => void;
  onToggleFavorite: (id: string) => void;
}) {
  return (
    <div
      className="bg-card rounded-xl p-3.5 flex items-center gap-3 cursor-pointer hover:shadow-sm active:scale-[0.98] transition-all duration-200"
      onClick={() => onSelect(story)}
    >
      <span className="text-2xl shrink-0">{CATEGORY_ICONS[story.category] || "📖"}</span>
      <div className="flex-1 min-w-0">
        <h4 className="text-[12px] font-semibold text-foreground truncate">{story.title}</h4>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            {DURATION_LABELS[story.duration] || story.duration}
          </span>
          {story.mood && (
            <span className="text-[10px] text-muted-foreground/70 truncate">{story.mood}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(story.id); }}
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
            story.is_favorite ? "text-red-500" : "text-muted-foreground/30 hover:text-red-300"
          }`}
        >
          <Heart className={`w-4 h-4 ${story.is_favorite ? "fill-current" : ""}`} />
        </button>
        <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
      </div>
    </div>
  );
}
