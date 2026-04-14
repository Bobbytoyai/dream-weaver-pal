import { useState } from "react";
import { Loader2 } from "lucide-react";

interface SaveButtonProps {
  onSave: () => void | Promise<void>;
  saved: boolean;
  className?: string;
}

const SaveButton = ({ onSave, saved, className = "" }: SaveButtonProps) => {
  const [saving, setSaving] = useState(false);

  const handleClick = async () => {
    if (saving || saved) return;
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={saving || saved}
      className={`w-full py-3.5 text-[14px] font-black transition-all border-4 border-black uppercase ${
        saved
          ? "bg-[var(--retro-green)] text-black"
          : saving
          ? "bg-foreground/70 text-background cursor-wait"
          : "bg-foreground text-background hover:opacity-90"
      } ${className}`}
      style={{ boxShadow: "5px 5px 0px rgba(0,0,0,0.3)" }}>
      {saved ? "✅ ENREGISTRÉ !" : saving ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> ENREGISTREMENT…
        </span>
      ) : "💾 ENREGISTRER"}
    </button>
  );
};

export default SaveButton;
