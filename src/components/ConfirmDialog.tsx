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
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm animate-fadeInUp" style={{ animationDuration: "0.15s" }} />

      {/* Dialog */}
      <div className="relative bg-card rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-fadeInUp"
        style={{ animationDuration: "0.25s" }}
        onClick={(e) => e.stopPropagation()}>
        
        {/* Close button */}
        <button onClick={onCancel}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 pt-8 text-center">
          {/* Icon */}
          <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
            isDanger ? "bg-destructive/10" : "bg-primary/10"
          }`}>
            {isDanger
              ? <Trash2 className="w-7 h-7 text-destructive" />
              : <AlertTriangle className="w-7 h-7 text-primary" />
            }
          </div>

          {/* Text */}
          <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-6">{description}</p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button onClick={onCancel}
              className="flex-1 py-3 rounded-2xl bg-muted text-foreground text-[13px] font-semibold hover:bg-muted/80 transition-all">
              {cancelLabel}
            </button>
            <button onClick={onConfirm}
              className={`flex-1 py-3 rounded-2xl text-[13px] font-semibold transition-all ${
                isDanger
                  ? "bg-destructive text-destructive-foreground hover:opacity-90"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              }`}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
