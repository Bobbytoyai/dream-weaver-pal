import { useState } from "react";
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
      <div className="w-20 h-20 mb-6 relative">
        <HologramFace voiceState="idle" enableCamera={false} emotionOverride={selectedInterests.length >= 2 ? "excited" : selectedInterests.length > 0 ? "happy" : undefined} />
      </div>
      <h2 className="text-3xl font-extrabold text-foreground mb-2">
        Qu'est-ce que tu adores, {childName} ?
      </h2>
      <p className="text-muted-foreground text-sm mb-6">
        Choisis autant que tu veux !
      </p>

      <div className="grid grid-cols-2 gap-3 w-full mb-8">
        {INTEREST_OPTIONS.map((item) => {
          const isSelected = selectedInterests.includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all duration-200 ${
                isSelected
                  ? "bg-gradient-to-r from-[hsl(var(--primary))]/20 to-[hsl(var(--secondary))]/15 border-2 border-[hsl(var(--primary))] shadow-md shadow-[hsla(200,100%,60%,0.12)] scale-[1.03]"
                  : "bg-[hsl(var(--muted))]/50 border-2 border-transparent hover:border-[hsl(var(--primary))]/30 hover:bg-[hsl(var(--muted))]"
              }`}
            >
              <span className="text-2xl">{item.emoji}</span>
              <span className={`font-bold text-sm ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={onNext}
        disabled={selectedInterests.length === 0}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] text-[hsl(var(--primary-foreground))] font-bold text-lg shadow-lg shadow-[hsla(200,100%,60%,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
      >
        C'est parti ! 🎉
      </button>
    </div>
  );
}
