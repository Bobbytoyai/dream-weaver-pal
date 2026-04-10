import { BookOpen, Gamepad2, GraduationCap, Sparkles } from "lucide-react";

export type ChatMode = "chat" | "story" | "game" | "learn";

interface ModeSelectorProps {
  activeMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}

const modes = [
  { id: "chat" as const, label: "Chat", icon: Sparkles, emoji: "💬" },
  { id: "story" as const, label: "Story", icon: BookOpen, emoji: "📖" },
  { id: "game" as const, label: "Game", icon: Gamepad2, emoji: "🎮" },
  { id: "learn" as const, label: "Learn", icon: GraduationCap, emoji: "🧠" },
];

const ModeSelector = ({ activeMode, onModeChange }: ModeSelectorProps) => {
  return (
    <div className="flex gap-2 p-2">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onModeChange(mode.id)}
          className={`flex-1 flex flex-col items-center gap-1 py-2 px-3 rounded-2xl text-xs font-bold transition-all duration-200 ${
            activeMode === mode.id
              ? "bg-primary text-primary-foreground scale-105 shadow-md"
              : "bg-card text-muted-foreground hover:bg-muted hover:scale-105"
          }`}
        >
          <span className="text-lg">{mode.emoji}</span>
          <span>{mode.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ModeSelector;
