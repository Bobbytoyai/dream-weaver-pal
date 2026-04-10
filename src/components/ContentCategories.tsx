import { useState } from "react";
import { Gamepad2, BookOpen, GraduationCap, Laugh, Trophy, ArrowLeft, RotateCcw, Library, ChevronRight } from "lucide-react";
import { loadScore, resetScores, getScoreSummary, type GameScore } from "@/lib/gameEngine";
import StoryLibrary from "@/components/StoryLibrary";

export type ContentCategory = "jeux" | "educatif" | "histoires" | "blagues";
export type SubCategory = "quiz_animaux" | "quiz_educatif" | "vrai_faux" | "devinettes" | "histoires" | "blagues";

interface ContentCategoriesProps {
  childName: string;
  onSelectCategory: (sub: SubCategory) => void;
  onBack: () => void;
  voiceProfile?: string;
}

const CATEGORIES: {
  id: ContentCategory;
  label: string;
  emoji: string;
  gradient: string;
  desc: string;
  subs: { id: SubCategory; label: string; emoji: string; desc: string }[];
}[] = [
  {
    id: "jeux",
    label: "Jeux",
    emoji: "🎮",
    gradient: "from-blue-500/20 to-indigo-500/10",
    desc: "Mini-jeux vocaux",
    subs: [
      { id: "quiz_animaux", label: "Quiz Animaux", emoji: "🐾", desc: "Devine l'animal !" },
      { id: "devinettes", label: "Devinettes", emoji: "🤔", desc: "Réfléchis bien…" },
      { id: "vrai_faux", label: "Vrai ou Faux", emoji: "✅", desc: "Vrai ou pas ?" },
    ],
  },
  {
    id: "educatif",
    label: "Éducatif",
    emoji: "🧠",
    gradient: "from-emerald-500/20 to-teal-500/10",
    desc: "Apprends en jouant",
    subs: [
      { id: "quiz_educatif", label: "Quiz Sciences", emoji: "🔬", desc: "Explore le monde" },
    ],
  },
  {
    id: "histoires",
    label: "Bibliothèque",
    emoji: "📚",
    gradient: "from-purple-500/20 to-pink-500/10",
    desc: "Histoires & contes",
    subs: [
      { id: "histoires", label: "Explorer", emoji: "📖", desc: "Toutes les histoires" },
    ],
  },
  {
    id: "blagues",
    label: "Blagues",
    emoji: "😂",
    gradient: "from-orange-500/20 to-yellow-500/10",
    desc: "Rire ensemble",
    subs: [
      { id: "blagues", label: "Une blague !", emoji: "🤣", desc: "Bobby te fait rire" },
    ],
  },
];

const ContentCategories = ({ childName, onSelectCategory, onBack, voiceProfile = "female" }: ContentCategoriesProps) => {
  const [selectedCat, setSelectedCat] = useState<ContentCategory | null>(null);
  const [score, setScore] = useState<GameScore>(loadScore);
  const [showStoryLibrary, setShowStoryLibrary] = useState(false);

  const handleReset = () => {
    const s = resetScores();
    setScore(s);
  };

  const handleSelectCategory = (sub: SubCategory) => {
    if (sub === "histoires") {
      setShowStoryLibrary(true);
    } else {
      onSelectCategory(sub);
    }
  };

  // Show embedded StoryLibrary
  if (showStoryLibrary) {
    return (
      <div className="flex flex-col h-screen max-w-lg mx-auto bg-background">
        <div className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border">
          <button onClick={() => setShowStoryLibrary(false)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
            <ArrowLeft className="w-4.5 h-4.5 text-foreground" />
          </button>
          <div className="flex-1">
            <h2 className="text-base font-bold text-foreground">Bibliothèque</h2>
            <p className="text-[11px] text-muted-foreground">Histoires, contes & aventures</p>
          </div>
          <span className="text-2xl">📚</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <StoryLibrary childName={childName} voiceProfile={voiceProfile} />
        </div>
      </div>
    );
  }

  const activeCat = CATEGORIES.find(c => c.id === selectedCat);

  // ─── Subcategory view ───
  if (activeCat) {
    return (
      <div className="p-4 space-y-4">
        {/* Back */}
        <button
          onClick={() => setSelectedCat(null)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Activités
        </button>

        {/* Category header card */}
        <div className={`bg-gradient-to-br ${activeCat.gradient} rounded-2xl p-5 border border-border/30`}>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{activeCat.emoji}</span>
            <div>
              <h3 className="text-lg font-bold text-foreground">{activeCat.label}</h3>
              <p className="text-[12px] text-muted-foreground">{activeCat.desc}</p>
            </div>
          </div>
        </div>

        {/* Subcategory grid */}
        <div className="grid grid-cols-2 gap-3">
          {activeCat.subs.map((sub) => {
            const subScore = score.byCategory[sub.id];
            return (
              <button
                key={sub.id}
                onClick={() => handleSelectCategory(sub.id)}
                className="bg-card rounded-2xl p-4 text-left hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border border-border/30 group"
              >
                <span className="text-3xl block mb-2">{sub.emoji}</span>
                <h4 className="text-[13px] font-bold text-foreground leading-tight">{sub.label}</h4>
                <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{sub.desc}</p>
                {subScore && subScore.played > 0 && (
                  <div className="mt-2 flex items-center gap-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                      {subScore.correct}/{subScore.played}
                      {subScore.correct === subScore.played && subScore.played >= 3 ? " ⭐" : ""}
                    </span>
                  </div>
                )}
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary absolute top-4 right-4 transition-colors" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Main category grid view ───
  return (
    <div className="p-4 space-y-4">
      {/* Score banner */}
      {score.totalPlayed > 0 && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-4 border border-primary/15">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Trophy className="w-5 h-5 text-primary" />
              <span className="text-[13px] font-bold text-foreground">{getScoreSummary(score)}</span>
            </div>
            <button onClick={handleReset} className="p-2 rounded-full hover:bg-primary/15 transition-colors" title="Réinitialiser">
              <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
          {score.bestStreak >= 3 && (
            <p className="text-[11px] text-primary font-semibold mt-1.5">🔥 Meilleure série : {score.bestStreak}</p>
          )}
        </div>
      )}

      {/* Category cards grid */}
      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              if (cat.id === "histoires") {
                setShowStoryLibrary(true);
              } else if (cat.subs.length === 1) {
                handleSelectCategory(cat.subs[0].id);
              } else {
                setSelectedCat(cat.id);
              }
            }}
            className={`bg-gradient-to-br ${cat.gradient} rounded-2xl p-5 text-left hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border border-border/30 relative overflow-hidden group`}
          >
            <span className="text-4xl block mb-3">{cat.emoji}</span>
            <h3 className="text-[14px] font-bold text-foreground leading-tight">{cat.label}</h3>
            <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{cat.desc}</p>
            {cat.subs.length > 1 && (
              <div className="mt-2">
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-foreground/5 text-muted-foreground font-medium">
                  {cat.subs.length} activités
                </span>
              </div>
            )}
            <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary absolute bottom-4 right-4 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default ContentCategories;
