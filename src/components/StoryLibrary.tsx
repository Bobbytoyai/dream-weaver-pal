/**
 * StoryLibrary — Card-based story browser with inline narration player
 * Features: categories, favorites, detail view, inline TTS player with YouTube-like controls
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { BookOpen, Heart, Play, Pause, ArrowLeft, Clock, Sparkles, X, Download, CheckCircle, Loader2, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchTTSAudio, useAudioQueue, detectEmotionForTTS } from "@/lib/voicePipeline";
import type { VoiceProfile, Emotion } from "@/lib/voicePipeline";
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

const ALL_CATEGORIES = ["Pirate", "Princesse", "Espace", "Animaux", "Magie", "Éducatif", "Aventure", "Nature", "Mythologie", "Musique", "Frissons", "Voyages"];
const DEFAULT_META = { emoji: "📖", gradient: "from-slate-500/20 to-gray-500/10", accent: "border-slate-500/25" };

const DURATION_LABELS: Record<string, string> = {
  short: "3-5 min",
  medium: "6-8 min",
  long: "10-15 min",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INLINE NARRATION PLAYER (YouTube-like)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface NarrationSegment {
  text: string;
  emotion?: Emotion;
  audioUrl?: string;
  status: "pending" | "loading" | "ready" | "playing" | "done";
}

function InlineNarrationPlayer({
  storyText,
  voiceProfile,
  onClose,
}: {
  storyText: string;
  voiceProfile: string;
  onClose: () => void;
}) {
  const sentences = storyText.split(/(?<=[.!?])\s+|\n\n+/).map(s => s.trim()).filter(s => s.length > 2);
  const [segments, setSegments] = useState<NarrationSegment[]>(
    sentences.map(text => ({ text, emotion: detectEmotionForTTS(text), status: "pending" as const }))
  );
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef(0);
  const mountedRef = useRef(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // Preload ahead
  useEffect(() => {
    const start = Math.max(0, currentIndex);
    for (let i = start; i < Math.min(start + 3, segments.length); i++) {
      const seg = segments[i];
      if (seg.status === "pending") {
        setSegments(prev => prev.map((s, idx) => idx === i ? { ...s, status: "loading" } : s));
        fetchTTSAudio(seg.text, undefined, voiceProfile as VoiceProfile, seg.emotion)
          .then(url => { if (mountedRef.current) setSegments(prev => prev.map((s, idx) => idx === i ? { ...s, audioUrl: url, status: "ready" } : s)); })
          .catch(() => { if (mountedRef.current) setSegments(prev => prev.map((s, idx) => idx === i ? { ...s, status: "ready" } : s)); });
      }
    }
  }, [segments, currentIndex, voiceProfile]);

  const updateProgress = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      setProgress(audioRef.current.duration ? audioRef.current.currentTime / audioRef.current.duration : 0);
      animFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  const playSegment = useCallback((index: number) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    cancelAnimationFrame(animFrameRef.current);

    if (index < 0 || index >= segments.length) {
      if (index >= segments.length) onClose();
      return;
    }

    const seg = segments[index];
    setCurrentIndex(index);
    setProgress(0);
    setIsPaused(false);
    setSegments(prev => prev.map((s, i) => ({ ...s, status: i < index ? "done" : i === index ? "playing" : s.status })));

    if (!seg.audioUrl || seg.audioUrl === "__silent__") {
      setTimeout(() => playSegment(index + 1), 200);
      return;
    }

    const audio = new Audio(seg.audioUrl);
    audioRef.current = audio;
    audio.onended = () => {
      setSegments(prev => prev.map((s, i) => i === index ? { ...s, status: "done" } : s));
      setProgress(1);
      playSegment(index + 1);
    };
    audio.onerror = () => playSegment(index + 1);
    audio.play().then(() => { animFrameRef.current = requestAnimationFrame(updateProgress); }).catch(() => playSegment(index + 1));
  }, [segments, onClose, updateProgress]);

  // Auto-start
  useEffect(() => {
    if (currentIndex === -1 && segments.length > 0 && segments[0].audioUrl) {
      playSegment(0);
    }
  }, [segments]);

  // Auto-scroll karaoke
  useEffect(() => {
    if (currentIndex >= 0 && scrollRef.current) {
      const el = scrollRef.current.querySelector(`[data-seg="${currentIndex}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentIndex]);

  const togglePause = useCallback(() => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPaused(false);
      animFrameRef.current = requestAnimationFrame(updateProgress);
    } else {
      audioRef.current.pause();
      setIsPaused(true);
      cancelAnimationFrame(animFrameRef.current);
    }
  }, [updateProgress]);

  const globalProgress = segments.length === 0 ? 0
    : (segments.filter(s => s.status === "done").length / segments.length) + (currentIndex >= 0 ? progress / segments.length : 0);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetIdx = Math.min(Math.floor(ratio * segments.length), segments.length - 1);
    if (targetIdx !== currentIndex) {
      playSegment(targetIdx);
    } else if (audioRef.current?.duration) {
      const segRatio = (ratio * segments.length) - targetIdx;
      audioRef.current.currentTime = segRatio * audioRef.current.duration;
    }
  }, [segments.length, currentIndex, playSegment]);

  // Cleanup
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-lg">
      {/* Karaoke text */}
      <div ref={scrollRef} className="max-h-44 overflow-y-auto px-4 py-3 scroll-smooth">
        <div className="leading-relaxed text-center">
          {segments.map((seg, i) => (
            <span
              key={i}
              data-seg={i}
              onClick={() => playSegment(i)}
              className={`inline text-sm cursor-pointer transition-all duration-300 ${
                i === currentIndex
                  ? "text-primary font-bold"
                  : seg.status === "done"
                  ? "text-foreground/40"
                  : "text-foreground/70"
              }`}
            >
              {seg.text}{" "}
            </span>
          ))}
        </div>
      </div>

      {/* Player controls bar */}
      <div className="bg-muted/50 border-t border-border px-4 py-3 space-y-2">
        {/* Progress bar */}
        <div className="relative w-full h-1.5 rounded-full bg-muted cursor-pointer group" onClick={handleSeek}>
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-100"
            style={{ width: `${globalProgress * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${globalProgress * 100}% - 6px)` }}
          />
        </div>

        {/* Transport controls */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground font-medium w-16">
            {currentIndex >= 0 ? currentIndex + 1 : 0}/{segments.length}
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={() => currentIndex > 0 ? playSegment(currentIndex - 1) : audioRef.current && (audioRef.current.currentTime = 0)}
              disabled={currentIndex <= 0 && !audioRef.current}
              className="w-9 h-9 rounded-full bg-background flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-accent disabled:opacity-30 transition-all active:scale-90"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={currentIndex === -1 ? () => playSegment(0) : togglePause}
              className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all"
            >
              {isPaused || currentIndex === -1 ? <Play className="w-5 h-5 ml-0.5" /> : <Pause className="w-5 h-5" />}
            </button>
            <button
              onClick={() => currentIndex < segments.length - 1 && playSegment(currentIndex + 1)}
              disabled={currentIndex >= segments.length - 1}
              className="w-9 h-9 rounded-full bg-background flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-accent disabled:opacity-30 transition-all active:scale-90"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <button onClick={onClose} className="w-9 h-9 rounded-full bg-background flex items-center justify-center text-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN STORY LIBRARY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface StoryLibraryProps {
  childName: string;
  voiceProfile?: string;
}

export default function StoryLibrary({ childName, voiceProfile = "female" }: StoryLibraryProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [showFullText, setShowFullText] = useState(false);
  const [inlineNarration, setInlineNarration] = useState(false);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("bobby_downloaded_stories");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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

  const downloadStory = useCallback(async (story: Story, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (downloadedIds.has(story.id) || downloadingId) return;
    setDownloadingId(story.id);
    try {
      const text = personalizeText(story.full_text || story.template_text);
      const data = { id: story.id, title: story.title, category: story.category, theme: story.theme, text, duration: story.duration, mood: story.mood, summary: story.summary };
      localStorage.setItem(`bobby_story_${story.id}`, JSON.stringify(data));
      const newSet = new Set(downloadedIds);
      newSet.add(story.id);
      setDownloadedIds(newSet);
      localStorage.setItem("bobby_downloaded_stories", JSON.stringify([...newSet]));
    } catch { /* storage full */ }
    setDownloadingId(null);
  }, [downloadedIds, downloadingId, childName]);

  const personalizeText = (text: string) => text.replace(/\{child_name\}/g, childName);

  const startBobbyNarration = useCallback((story: Story) => {
    const text = story.full_text || story.template_text;
    if (!text) return;
    const personalized = personalizeText(text);
    eventBus.emit({ type: "NARRATE_STORY", storyId: story.id, title: story.title, text: personalized });
  }, [childName]);

  useEffect(() => {
    return () => { abortRef.current?.abort(); audioQueue.stopAll(); };
  }, []);

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
          onClick={() => { setSelectedStory(null); setShowFullText(false); setInlineNarration(false); abortRef.current?.abort(); audioQueue.stopAll(); }}
          className="flex items-center gap-2 text-sm font-semibold text-foreground/70 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {selectedCategory || "Bibliothèque"}
        </button>

        <div className={`rounded-2xl overflow-hidden border-2 ${meta.accent} bg-card shadow-sm`}>
          {/* Hero header */}
          <div className={`bg-gradient-to-br ${meta.gradient} px-5 pt-5 pb-4`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className="text-4xl flex-shrink-0">{meta.emoji}</span>
                <div className="min-w-0">
                  <h3 className="text-xl font-extrabold text-foreground leading-tight">{selectedStory.title}</h3>
                  <div className="flex items-center gap-2.5 mt-2">
                    <span className="text-xs px-2.5 py-0.5 bg-foreground/8 text-foreground/80 rounded-full font-bold">
                      {selectedStory.category}
                    </span>
                    <span className="text-xs text-foreground/60 flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      {DURATION_LABELS[selectedStory.duration] || selectedStory.duration}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => toggleFavorite(selectedStory.id)}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                  selectedStory.is_favorite ? "bg-red-500/15 text-red-500" : "bg-foreground/5 text-foreground/40 hover:text-red-400"
                }`}
              >
                <Heart className={`w-5 h-5 ${selectedStory.is_favorite ? "fill-current" : ""}`} />
              </button>
            </div>
          </div>

          {/* Info section */}
          <div className="px-5 py-4 space-y-3">
            {selectedStory.mood && (
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground/70 font-medium">{selectedStory.mood}</span>
              </div>
            )}
            {selectedStory.summary && (
              <div>
                <h4 className="text-sm font-bold text-foreground mb-1.5">Résumé</h4>
                <p className="text-sm text-foreground/70 leading-relaxed">{selectedStory.summary}</p>
              </div>
            )}
            <div className="flex items-center gap-4 text-xs text-foreground/50 font-medium pt-1">
              <span className="flex items-center gap-1">👤 {selectedStory.age_min}-{selectedStory.age_max} ans</span>
              {selectedStory.interactive && <span className="flex items-center gap-1">🎮 Interactive</span>}
              {downloadedIds.has(selectedStory.id) && (
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle className="w-3.5 h-3.5" /> Hors-ligne
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="px-5 pb-5 space-y-2.5">
            {!downloadedIds.has(selectedStory.id) && (
              <button
                onClick={() => downloadStory(selectedStory)}
                disabled={downloadingId === selectedStory.id}
                className="w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50"
              >
                {downloadingId === selectedStory.id ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Téléchargement…</>
                ) : (
                  <><Download className="w-4 h-4" /> Télécharger hors-ligne</>
                )}
              </button>
            )}

            {/* Read story */}
            <button
              onClick={() => setShowFullText(!showFullText)}
              className="w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 bg-accent text-accent-foreground border border-border hover:shadow-md"
            >
              <BookOpen className="w-4 h-4" />
              {showFullText ? "Masquer le texte" : "📖 Lire l'histoire"}
            </button>

            {/* Inline narration (new!) */}
            <button
              onClick={() => setInlineNarration(!inlineNarration)}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                inlineNarration
                  ? "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20"
                  : "bg-secondary text-secondary-foreground border border-border hover:shadow-md"
              }`}
            >
              {inlineNarration ? (
                <><Pause className="w-4 h-4" /> Arrêter la lecture</>
              ) : (
                <><Volume2 className="w-4 h-4" /> 🎧 Écouter l'histoire</>
              )}
            </button>

            {/* Bobby raconte (sends to VoiceScreen) */}
            <button
              onClick={() => startBobbyNarration(selectedStory)}
              className="w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:scale-[1.01]"
            >
              <Play className="w-4 h-4" /> ▶️ Bobby raconte
            </button>
          </div>
        </div>

        {/* Inline narration player */}
        {inlineNarration && (
          <InlineNarrationPlayer
            storyText={personalized}
            voiceProfile={voiceProfile}
            onClose={() => setInlineNarration(false)}
          />
        )}

        {/* Full text reading */}
        {showFullText && (
          <div className="bg-card rounded-2xl p-5 border border-border">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-base font-bold text-foreground">Texte complet</h4>
              <button onClick={() => setShowFullText(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line max-h-[50vh] overflow-y-auto">
              {personalized}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Category Stories View ───
  if (selectedCategory) {
    const catStories = categories[selectedCategory] || [];
    const meta = CATEGORY_META[selectedCategory] || DEFAULT_META;

    return (
      <div className="p-4 space-y-4">
        <button
          onClick={() => setSelectedCategory(null)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground/70 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Bibliothèque
        </button>

        <div className={`bg-gradient-to-br ${meta.gradient} rounded-2xl p-5 border ${meta.accent}`}>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{meta.emoji}</span>
            <div>
              <h3 className="text-xl font-extrabold text-foreground">{selectedCategory}</h3>
              <p className="text-sm text-foreground/60 font-medium">
                {catStories.length > 0 ? `${catStories.length} histoire${catStories.length > 1 ? "s" : ""}` : "Bientôt disponible"}
              </p>
            </div>
          </div>
        </div>

        {catStories.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-5xl block mb-4">{meta.emoji}</span>
            <p className="text-base font-bold text-foreground">Bientôt disponible !</p>
            <p className="text-sm text-foreground/50 mt-1">De nouvelles histoires arrivent très bientôt ✨</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {catStories.map(story => (
              <button
                key={story.id}
                onClick={() => setSelectedStory(story)}
                className={`bg-gradient-to-br ${meta.gradient} rounded-2xl p-4 text-left border ${meta.accent} hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 relative group aspect-square flex flex-col justify-between`}
              >
                <div>
                  <span className="text-2xl block mb-2">{meta.emoji}</span>
                  <h4 className="text-sm font-bold text-foreground leading-tight line-clamp-2">{story.title}</h4>
                  {story.mood && (
                    <p className="text-xs text-foreground/50 mt-1 line-clamp-1">{story.mood}</p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-foreground/50 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {DURATION_LABELS[story.duration] || story.duration}
                  </span>
                  <div className="flex items-center gap-1">
                    {downloadedIds.has(story.id) ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <button
                        onClick={(e) => downloadStory(story, e)}
                        disabled={downloadingId === story.id}
                        className="w-7 h-7 rounded-full flex items-center justify-center transition-all text-foreground/30 group-hover:text-primary"
                      >
                        {downloadingId === story.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Download className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(story.id); }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                        story.is_favorite ? "text-red-500" : "text-foreground/25 group-hover:text-red-300"
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${story.is_favorite ? "fill-current" : ""}`} />
                    </button>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Main View: Category cards ───
  return (
    <div className="p-4 space-y-4">
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-base text-foreground/60 font-semibold">Aucune histoire disponible</p>
          <p className="text-sm text-foreground/40 mt-1">Les histoires seront ajoutées bientôt !</p>
        </div>
      ) : (
        <>
          {favorites.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-bold text-foreground">Favoris</h3>
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
                      <Heart className="w-3.5 h-3.5 text-red-500 fill-current absolute top-3 right-3" />
                      <span className="text-2xl block mb-2">{meta.emoji}</span>
                      <h4 className="text-sm font-bold text-foreground leading-tight line-clamp-2">{story.title}</h4>
                      <span className="text-xs text-foreground/50 flex items-center gap-1 mt-1.5">
                        <Clock className="w-3 h-3" />
                        {DURATION_LABELS[story.duration] || story.duration}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Catégories</h3>
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
                      <h3 className="text-base font-bold text-foreground">{category}</h3>
                      <p className="text-xs text-foreground/50 mt-0.5 font-medium">
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
