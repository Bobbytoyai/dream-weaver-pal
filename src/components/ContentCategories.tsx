import { useState } from "react";
import { Gamepad2, BookOpen, GraduationCap, Laugh, CheckCircle, Trophy, ArrowLeft, RotateCcw, Library } from "lucide-react";
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

const CATEGORIES: { id: ContentCategory; label: string; emoji: string; icon: typeof Gamepad2; desc: string; subs: { id: SubCategory; label: string; emoji: string }[] }[] = [
  {
    id: "jeux", label: "Jeux", emoji: "🎮", icon: Gamepad2, desc: "Mini-jeux vocaux interactifs",
    subs: [
      { id: "quiz_animaux", label: "Quiz Animaux", emoji: "🐾" },
      { id: "devinettes", label: "Devinettes", emoji: "🤔" },
      { id: "vrai_faux", label: "Vrai ou Faux", emoji: "✅❌" },
    ],
  },
  {
    id: "educatif", label: "Éducatif", emoji: "🧠", icon: GraduationCap, desc: "Apprends en t'amusant",
    subs: [
      { id: "quiz_educatif", label: "Quiz Sciences", emoji: "🔬" },
    ],
  },
  {
    id: "histoires", label: "Bibliothèque", emoji: "📚", icon: Library, desc: "Histoires, contes & aventures",
    subs: [
      { id: "histoires", label: "Explorer la bibliothèque", emoji: "📖" },
    ],
  },
  {
    id: "blagues", label: "Blagues", emoji: "😂", icon: Laugh, desc: "Rire ensemble",
    subs: [
      { id: "blagues", label: "Une blague !", emoji: "🤣" },
    ],
  },
];

const ContentCategories = ({ childName, onSelectCategory, onBack, voiceProfile = "female" }: ContentCategoriesProps) => {
  const [expanded, setExpanded] = useState<ContentCategory | null>(null);
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
          <button onClick={() => setShowStoryLibrary(false)} className="p-2 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-extrabold text-foreground">Bibliothèque</h2>
            <p className="text-xs text-muted-foreground">Histoires, contes & aventures</p>
          </div>
          <span className="text-2xl">📚</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <StoryLibrary childName={childName} voiceProfile={voiceProfile} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-extrabold text-foreground">Activités</h2>
          <p className="text-xs text-muted-foreground">Choisis ce que tu veux faire, {childName} !</p>
        </div>
        <span className="text-2xl">🎯</span>
      </div>

      {/* Score banner */}
      {score.totalPlayed > 0 && (
        <div className="mx-4 mt-3 p-3 rounded-2xl bg-primary/10 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              <span className="text-sm font-bold text-foreground">{getScoreSummary(score)}</span>
            </div>
            <button onClick={handleReset} className="p-1.5 rounded-full hover:bg-primary/20 transition-colors" title="Réinitialiser">
              <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
          {score.bestStreak >= 3 && (
            <p className="text-xs text-primary font-semibold mt-1">🔥 Meilleure série : {score.bestStreak}</p>
          )}
        </div>
      )}

      {/* Categories */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isExpanded = expanded === cat.id;
          const catScore = score.byCategory;

          return (
            <div key={cat.id} className="rounded-2xl border border-border bg-card overflow-hidden transition-all duration-200">
              <button
                onClick={() => {
                  // For histoires, go directly to library
                  if (cat.id === "histoires") {
                    setShowStoryLibrary(true);
                    return;
                  }
                  setExpanded(isExpanded ? null : cat.id);
                }}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                  {cat.emoji}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-bold text-foreground">{cat.label}</h3>
                  <p className="text-xs text-muted-foreground">{cat.desc}</p>
                </div>
                <Icon className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                  {cat.subs.map((sub) => {
                    const subScore = catScore[sub.id];
                    return (
                      <button
                        key={sub.id}
                        onClick={() => handleSelectCategory(sub.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all"
                      >
                        <span className="text-xl">{sub.emoji}</span>
                        <span className="flex-1 text-left text-sm font-semibold text-foreground">{sub.label}</span>
                        {subScore && subScore.played > 0 && (
                          <span className="text-xs text-muted-foreground font-medium">
                            {subScore.correct}/{subScore.played}
                            {subScore.correct === subScore.played && subScore.played >= 3 ? " ⭐" : ""}
                          </span>
                        )}
                        <CheckCircle className="w-4 h-4 text-primary/40" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ContentCategories;
