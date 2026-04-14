import { RetroCard, RetroInput, RetroButton, RetroBackButton } from "./RetroUI";
import type { AuthStep } from "./authTypes";
import { toast } from "sonner";

interface Props {
  parentLastName: string;
  setParentLastName: (v: string) => void;
  parentFirstName: string;
  setParentFirstName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  emergencyPhone: string;
  setEmergencyPhone: (v: string) => void;
  setStep: (s: AuthStep) => void;
}

export default function SignupInfoScreen({
  parentLastName, setParentLastName,
  parentFirstName, setParentFirstName,
  email, setEmail,
  emergencyPhone, setEmergencyPhone,
  setStep,
}: Props) {
  return (
    <RetroCard color="var(--retro-green)">
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <span className="text-4xl block">👨‍👩‍👧</span>
          <h2 className="text-xl font-black uppercase text-black">Informations Parent</h2>
          <p className="text-xs font-bold text-black/60">Ces infos restent confidentielles</p>
        </div>

        <RetroInput label="Nom de famille *" value={parentLastName} onChange={e => setParentLastName(e.target.value)} placeholder="Dupont" required />
        <RetroInput label="Prénom parent *" value={parentFirstName} onChange={e => setParentFirstName(e.target.value)} placeholder="Marie" required />
        <RetroInput label="Adresse email *" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="parent@email.com" required />
        <RetroInput label="Téléphone d'urgence" type="tel" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} placeholder="06 12 34 56 78" />

        <div className="flex gap-2 pt-2">
          <RetroBackButton onClick={() => setStep("choice")} />
          <div className="flex-1">
            <RetroButton
              onClick={() => {
                if (!parentLastName.trim() || !parentFirstName.trim() || !email.trim()) {
                  toast.error("Remplissez les champs obligatoires (*)");
                  return;
                }
                setStep("signup-password");
              }}
            >
              Suivant →
            </RetroButton>
          </div>
        </div>
      </div>
    </RetroCard>
  );
}
