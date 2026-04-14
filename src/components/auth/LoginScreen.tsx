import { RetroCard, RetroInput, RetroButton } from "./RetroUI";
import type { AuthStep } from "./authTypes";

interface Props {
  loginEmail: string;
  setLoginEmail: (v: string) => void;
  loginPassword: string;
  setLoginPassword: (v: string) => void;
  submitting: boolean;
  onLogin: () => void;
  setStep: (s: AuthStep) => void;
  setForgotEmail: (v: string) => void;
}

export default function LoginScreen({
  loginEmail, setLoginEmail,
  loginPassword, setLoginPassword,
  submitting, onLogin, setStep, setForgotEmail,
}: Props) {
  return (
    <RetroCard color="var(--retro-blue)">
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <span className="text-4xl block">🔑</span>
          <h2 className="text-xl font-black uppercase text-black">Connexion</h2>
          <p className="text-xs font-bold text-black/60">Accédez à votre compte Bobby Cloud</p>
        </div>

        <RetroInput label="Email" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="parent@email.com" autoFocus />
        <RetroInput label="Mot de passe" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" />

        <RetroButton onClick={onLogin} disabled={submitting}>
          {submitting ? "Connexion…" : "Se connecter →"}
        </RetroButton>

        <div className="flex flex-col gap-1 pt-1">
          <button
            onClick={() => { setForgotEmail(loginEmail); setStep("forgot-password"); }}
            className="py-2 text-xs font-black text-black/50 hover:text-black/70 underline"
          >
            Mot de passe oublié ?
          </button>
          <div className="flex gap-2">
            <button onClick={() => setStep("choice")} className="flex-1 py-2 text-xs font-black text-black/50 hover:text-black/70 underline">
              ← Retour
            </button>
            <button onClick={() => setStep("signup-info")} className="flex-1 py-2 text-xs font-black text-black/50 hover:text-black/70 underline">
              Créer un compte
            </button>
          </div>
        </div>
      </div>
    </RetroCard>
  );
}
