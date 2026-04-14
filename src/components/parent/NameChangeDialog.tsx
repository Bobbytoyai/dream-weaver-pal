import React from "react";
import { toast } from "sonner";

interface NameChangeDialogProps {
  pendingName: string;
  currentName: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

const NameChangeDialog: React.FC<NameChangeDialogProps> = ({
  pendingName, currentName, onConfirm, onCancel,
}) => (
  <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-6" onClick={onCancel}>
    <div className="bg-white border-4 border-black p-6 w-full max-w-sm space-y-4"
      style={{ boxShadow: "8px 8px 0px rgba(0,0,0,0.3)" }}
      onClick={e => e.stopPropagation()}>
      <div className="text-center">
        <span className="text-4xl block mb-2">✏️</span>
        <h3 className="text-[18px] font-black text-black uppercase">Changer le prénom ?</h3>
        <p className="text-[13px] text-black/60 mt-1 font-bold">
          <span className="font-black">{currentName}</span> → <span className="font-black">{pendingName}</span>
        </p>
      </div>

      <div className="space-y-2.5">
        <button
          onClick={() => {
            onConfirm(pendingName);
            toast.success(`✅ Surnom changé en "${pendingName}"`);
          }}
          className="w-full py-3.5 border-4 border-black bg-foreground text-background font-black text-[14px] hover:opacity-90 transition-all uppercase"
          style={{ boxShadow: "4px 4px 0px rgba(0,0,0,0.2)" }}>
          🏷️ C'EST UN SURNOM
        </button>
        <button
          onClick={() => {
            onCancel();
            toast.info("🔜 Changement de session bientôt disponible !", {
              description: "Cette fonctionnalité permettra de gérer plusieurs enfants.",
            });
          }}
          className="w-full py-3.5 border-4 border-black bg-white text-black font-black text-[14px] hover:bg-[var(--retro-yellow)] transition-all uppercase"
          style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.15)" }}>
          👦 CHANGER D'ENFANT <span className="text-[11px] font-bold text-black/50 ml-1">(bientôt)</span>
        </button>
        <button onClick={onCancel}
          className="w-full py-2.5 text-[13px] text-black/60 font-black hover:text-black transition-colors uppercase">
          ANNULER
        </button>
      </div>
    </div>
  </div>
);

export default NameChangeDialog;
