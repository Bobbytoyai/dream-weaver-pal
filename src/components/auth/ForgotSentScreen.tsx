import { RetroCard, RetroButton } from "./RetroUI";
import type { AuthStep } from "./authTypes";

interface Props {
  forgotEmail: string;
  setStep: (s: AuthStep) => void;
}

export default function ForgotSentScreen({ forgotEmail, setStep }: Props) {
  return (
    <RetroCard color="var(--retro-green)">
      <div className="space-y-5 text-center">
        <div className="space-y-2">
          <span className="text-5xl block">📬</span>
          <h2 className="text-xl font-black uppercase text-black">Email envoyé !</h2>
          <p className="text-sm font-bold text-black/70">
            Un lien de réinitialisation a été envoyé à<br />
            <span className="text-black underline">{forgotEmail}</span>
          </p>
          <p className="text-xs font-bold text-black/50">Vérifiez aussi vos spams</p>
        </div>

        <RetroButton onClick={() => setStep("login")}>
          Retour à la connexion →
        </RetroButton>
      </div>
    </RetroCard>
  );
}
