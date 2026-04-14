import { RetroCard, RetroInput, RetroButton } from "./RetroUI";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  email: string;
  confirmCode: string;
  setConfirmCode: (v: string) => void;
  submitting: boolean;
  onVerify: () => void;
}

export default function ConfirmEmailScreen({ email, confirmCode, setConfirmCode, submitting, onVerify }: Props) {
  return (
    <RetroCard color="var(--retro-yellow)">
      <div className="space-y-5 text-center">
        <div className="space-y-2">
          <span className="text-5xl block">📬</span>
          <h2 className="text-xl font-black uppercase text-black">Vérification Email</h2>
          <p className="text-sm font-bold text-black/70">
            Un code de confirmation a été envoyé à <br />
            <span className="text-black underline">{email}</span>
          </p>
        </div>

        <RetroInput
          label="Code de confirmation"
          value={confirmCode}
          onChange={e => setConfirmCode(e.target.value)}
          placeholder="123456"
          autoFocus
        />

        <RetroButton onClick={onVerify} disabled={submitting || !confirmCode.trim()}>
          {submitting ? "Vérification…" : "Confirmer ✓"}
        </RetroButton>

        <button
          onClick={() => {
            supabase.auth.resend({ type: "signup", email });
            toast.success("Email renvoyé !");
          }}
          className="text-xs font-bold text-black/50 hover:text-black/70 underline"
        >
          Renvoyer le code
        </button>
      </div>
    </RetroCard>
  );
}
