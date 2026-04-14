import { RetroCard, RetroInput, RetroButton } from "./RetroUI";
import type { AuthStep } from "./authTypes";

interface Props {
  forgotEmail: string;
  setForgotEmail: (v: string) => void;
  submitting: boolean;
  onForgot: () => void;
  setStep: (s: AuthStep) => void;
}

export default function ForgotPasswordScreen({ forgotEmail, setForgotEmail, submitting, onForgot, setStep }: Props) {
  return (
    <RetroCard color="var(--retro-yellow)">
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <span className="text-4xl block">🔑</span>
          <h2 className="text-xl font-black uppercase text-black">Mot de passe oublié</h2>
          <p className="text-xs font-bold text-black/60">Entrez votre email pour recevoir un lien de réinitialisation</p>
        </div>

        <RetroInput label="Email" type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="parent@email.com" autoFocus />

        <RetroButton onClick={onForgot} disabled={submitting || !forgotEmail.trim()}>
          {submitting ? "Envoi…" : "Envoyer le lien 📧"}
        </RetroButton>

        <button onClick={() => setStep("login")} className="w-full py-2 text-xs font-black text-black/50 hover:text-black/70 underline">
          ← Retour à la connexion
        </button>
      </div>
    </RetroCard>
  );
}
