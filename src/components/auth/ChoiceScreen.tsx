import { toast } from "sonner";
import { RetroCard, RetroButton } from "./RetroUI";
import type { AuthStep } from "./authTypes";

interface Props {
  setStep: (s: AuthStep) => void;
  onBack: () => void;
}

const plans = [
  {
    name: "Gratuit", price: "0€", period: "/mois", emoji: "🆓",
    storage: "500 Mo", current: true,
  },
  {
    name: "Bobby+", price: "4,99€", period: "/mois", emoji: "⭐",
    storage: "5 Go", popular: true,
  },
  {
    name: "Bobby Pro", price: "9,99€", period: "/mois", emoji: "🚀",
    storage: "20 Go",
  },
];

export default function ChoiceScreen({ setStep, onBack }: Props) {
  return (
    <RetroCard color="var(--retro-blue)">
      <div className="text-center space-y-5">
        <div className="space-y-2">
          <span className="text-5xl block">☁️</span>
          <h1 className="text-2xl font-black uppercase text-black">Bobby Cloud</h1>
          <p className="text-xs font-bold text-black/60">
            Sauvegardez, synchronisez et téléchargez tout le contenu de Bobby entre vos appareils.
          </p>
        </div>

        {/* Pricing plans */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {plans.map((plan) => (
            <button
              key={plan.name}
              onClick={() => {
                if (plan.current) return;
                toast.info("🚧 Cette offre sera disponible prochainement !");
              }}
              className={`relative border-2 border-black p-2.5 text-center transition-transform hover:scale-[1.03] ${
                plan.popular ? "bg-yellow-100" : "bg-white"
              }`}
              style={{ boxShadow: "2px 2px 0px rgba(0,0,0,0.15)" }}
            >
              {plan.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase bg-black text-white px-2 py-0.5">
                  Populaire
                </span>
              )}
              <span className="text-2xl block">{plan.emoji}</span>
              <p className="text-[11px] font-black text-black mt-1">{plan.name}</p>
              <p className="text-[13px] font-black text-black">
                {plan.price}
                {plan.period && <span className="text-[9px] font-bold text-black/50">{plan.period}</span>}
              </p>
              <p className="text-[9px] font-bold text-black/50">{plan.storage}</p>
              <p className="text-[8px] font-black uppercase mt-1 text-black/40">
                {plan.current ? "Gratuit" : "Bientôt"}
              </p>
            </button>
          ))}
        </div>

        <div className="space-y-3 pt-1">
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
