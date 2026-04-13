import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open, title, description,
  confirmLabel = "Supprimer",
  cancelLabel = "Annuler",
  variant = "danger",
  onConfirm, onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const isDanger = variant === "danger";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      onClick={onCancel}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/40" />

      {/* Dialog */}
      <div className="relative w-full max-w-sm overflow-hidden border-4 border-black bg-white"
        style={{ boxShadow: "6px 6px 0px rgba(0,0,0,0.25)" }}
        onClick={(e) => e.stopPropagation()}>

        {/* Close button */}
        <button onClick={onCancel}
          className="absolute top-3 right-3 w-8 h-8 border-2 border-black bg-white flex items-center justify-center text-foreground hover:bg-muted transition-colors">
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 pt-8 text-center">
          {/* Icon */}
          <div className={`w-16 h-16 border-4 border-black mx-auto mb-4 flex items-center justify-center ${
            isDanger ? "bg-[var(--retro-red)]" : "bg-[var(--retro-yellow)]"
          }`}>
            {isDanger
              ? <Trash2 className="w-7 h-7 text-foreground" />
              : <AlertTriangle className="w-7 h-7 text-foreground" />
            }
          </div>

          {/* Text */}
          <h3 className="text-lg font-black text-foreground uppercase mb-2">{title}</h3>
          <p className="text-[13px] text-foreground/70 font-bold leading-relaxed mb-6">{description}</p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button onClick={onCancel}
              className="flex-1 py-3 border-4 border-black bg-white text-foreground text-[13px] font-black uppercase hover:bg-muted transition-all"
              style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.15)" }}>
              {cancelLabel}
            </button>
            <button onClick={onConfirm}
              className={`flex-1 py-3 border-4 border-black text-[13px] font-black uppercase transition-all hover:opacity-90 ${
                isDanger
                  ? "bg-[var(--retro-red)] text-foreground"
                  : "bg-[var(--retro-yellow)] text-foreground"
              }`}
              style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.15)" }}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
