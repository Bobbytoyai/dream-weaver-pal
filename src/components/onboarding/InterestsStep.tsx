import { HologramFace } from "../hologram/HologramFace";

interface InterestsStepProps {
  selectedInterests: string[];
  onSelect: (interests: string[]) => void;
  onNext: () => void;
  childName: string;
}

const INTEREST_OPTIONS = [
  { id: "animaux", emoji: "🐾", label: "Animaux" },
  { id: "espace", emoji: "🚀", label: "Espace" },
  { id: "princesse", emoji: "👑", label: "Princesse" },
  { id: "pirate", emoji: "🏴‍☠️", label: "Pirates" },
  { id: "dinosaures", emoji: "🦕", label: "Dinosaures" },
  { id: "magie", emoji: "✨", label: "Magie" },
  { id: "sport", emoji: "⚽", label: "Sport" },
  { id: "musique", emoji: "🎵", label: "Musique" },
  { id: "nature", emoji: "🌿", label: "Nature" },
  { id: "robots", emoji: "🤖", label: "Robots" },
];

export default function InterestsStep({ selectedInterests, onSelect, onNext, childName }: InterestsStepProps) {
  const toggle = (id: string) => {
    onSelect(
      selectedInterests.includes(id)
        ? selectedInterests.filter((i) => i !== id)
        : [...selectedInterests, id]
    );
  };

  return (
    <div className="flex flex-col items-center text-center w-full">
      <div className="w-20 h-20 mb-5 relative animate-fadeInUp">
        <HologramFace voiceState="idle" enableCamera={false} emotionOverride={selectedInterests.length >= 3 ? "excited" : selectedInterests.length > 0 ? "happy" : undefined} />
      </div>
      <h2 className="text-3xl font-extrabold text-foreground mb-2 animate-fadeInUp" style={{ animationDelay: "0.05s" }}>
        Qu'est-ce que tu adores, {childName} ?
      </h2>
      <p className="text-muted-foreground text-sm mb-5 animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
        Choisis autant que tu veux !
      </p>

      <div className="grid grid-cols-2 gap-2.5 w-full mb-6">
        {INTEREST_OPTIONS.map((item, idx) => {
          const isSelected = selectedInterests.includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              className={`animate-fadeInUp flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300 ${
                isSelected
                  ? "bg-gradient-to-r from-[hsl(var(--primary))]/20 to-[hsl(var(--secondary))]/15 border-2 border-[hsl(var(--primary))] shadow-md shadow-[hsla(200,100%,60%,0.12)] scale-[1.04]"
                  : "bg-[hsl(var(--muted))]/50 border-2 border-transparent hover:border-[hsl(var(--primary))]/30 hover:bg-[hsl(var(--muted))]"
              }`}
              style={{ animationDelay: `${0.12 + idx * 0.04}s` }}
            >
              <span className={`text-2xl transition-transform duration-300 ${isSelected ? "scale-125" : ""}`}>{item.emoji}</span>
              <span className={`font-bold text-sm transition-colors ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={onNext}
        disabled={selectedInterests.length === 0}
        className="animate-fadeInUp w-full py-4 rounded-2xl bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] text-[hsl(var(--primary-foreground))] font-bold text-lg shadow-lg shadow-[hsla(200,100%,60%,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
        style={{ animationDelay: "0.55s" }}
      >
        C'est parti ! 🎉
      </button>
    </div>
  );
}
