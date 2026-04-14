import { RetroCard, RetroInput, RetroButton, RetroBackButton } from "./RetroUI";
import type { AuthStep } from "./authTypes";

interface Props {
  password: string;
  setPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  submitting: boolean;
  onSignup: () => void;
  setStep: (s: AuthStep) => void;
}

export default function SignupPasswordScreen({
  password, setPassword,
  confirmPassword, setConfirmPassword,
  submitting, onSignup, setStep,
}: Props) {
  return (
    <RetroCard color="var(--retro-purple)">
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <span className="text-4xl block">🔐</span>
          <h2 className="text-xl font-black uppercase text-black">Mot de passe</h2>
          <p className="text-xs font-bold text-black/60">Minimum 6 caractères</p>
        </div>

        <RetroInput label="Mot de passe *" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
        <RetroInput label="Confirmer le mot de passe *" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required />

        <div className="p-3 bg-white/50 border-2 border-black/20">
          <p className="text-xs font-bold text-black/70">
            ☁️ Votre compte Bobby Cloud inclut <strong>500 Mo</strong> de stockage gratuit pour sauvegarder les données de Bobby.
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <RetroBackButton onClick={() => setStep("signup-info")} />
          <div className="flex-1">
            <RetroButton onClick={onSignup} disabled={submitting}>
              {submitting ? "Envoi…" : "Créer le compte 🎉"}
            </RetroButton>
          </div>
        </div>
      </div>
    </RetroCard>
  );
}
