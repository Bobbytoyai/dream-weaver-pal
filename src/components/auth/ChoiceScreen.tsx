import { RetroCard, RetroButton } from "./RetroUI";
import type { AuthStep } from "./authTypes";

interface Props {
  setStep: (s: AuthStep) => void;
  onBack: () => void;
}

export default function ChoiceScreen({ setStep, onBack }: Props) {
  return (
    <RetroCard color="var(--retro-blue)">
      <div className="text-center space-y-5">
        <div className="space-y-2">
          <span className="text-6xl block">☁️</span>
          <h1 className="text-2xl font-black uppercase text-black">Bobby Cloud</h1>
          <p className="text-xs font-bold text-black/60">
            Créez votre compte pour accéder au Bobby Store, sauvegarder et synchroniser les données de Bobby.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <RetroButton onClick={() => setStep("signup-info")}>
            Créer mon compte 🚀
          </RetroButton>
          <RetroButton variant="secondary" onClick={() => setStep("login")}>
            J'ai déjà un compte
          </RetroButton>
        </div>

        <button onClick={onBack} className="text-xs font-bold text-black/40 hover:text-black/60 underline">
          ← Retour
        </button>
      </div>
    </RetroCard>
  );
}
