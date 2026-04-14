import { useState } from "react";

interface ParentOnboardingProps {
  currentChildName: string;
  onComplete: (childName: string, pin: string, personality: "balanced" | "calm" | "energetic" | "educational") => void;
}

const personalities = [
  { id: "balanced" as const, emoji: "⚖️", label: "Équilibré", desc: "Mix jeux, éducation et histoires" },
  { id: "calm" as const, emoji: "🧘", label: "Calme", desc: "Ton doux, rythme lent, apaisant" },
  { id: "energetic" as const, emoji: "⚡", label: "Dynamique", desc: "Enthousiaste, interactif, stimulant" },
  { id: "educational" as const, emoji: "📚", label: "Éducatif", desc: "Focus apprentissage et curiosité" },
];

export default function ParentOnboarding({ currentChildName, onComplete }: ParentOnboardingProps) {
  const [step, setStep] = useState(0);
  const [childName, setChildName] = useState(currentChildName || "");
  const [pin, setPin] = useState("");
  const [personality, setPersonality] = useState<"balanced" | "calm" | "energetic" | "educational">("balanced");
  const [animClass, setAnimClass] = useState("animate-in fade-in");

  const goStep = (next: number) => {
    setAnimClass("opacity-0 transition-opacity duration-200");
    setTimeout(() => {
      setStep(next);
      setAnimClass("animate-in fade-in");
    }, 200);
  };

  const cardStyle = {
    boxShadow: "6px 6px 0 hsl(var(--foreground)/0.2)",
  };

  // Step 0: Welcome
  if (step === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <div className={`w-full max-w-sm border-4 border-foreground bg-white p-8 text-center space-y-5 ${animClass}`} style={cardStyle}>
          <div className="mx-auto w-20 h-20 border-4 border-foreground bg-blue-50 flex items-center justify-center rounded-xl">
            <span className="text-5xl">👋</span>
          </div>
          <h2 className="text-xl font-black text-foreground uppercase">Bienvenue, Parent !</h2>
          <p className="text-sm font-bold text-muted-foreground leading-relaxed">
            Configurons Bobby en quelques étapes pour qu'il soit parfait pour votre enfant.
          </p>
          <div className="flex gap-2 justify-center">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i === 0 ? "w-8 bg-primary" : "w-4 bg-muted"}`} />
            ))}
          </div>
          <button
            onClick={() => goStep(1)}
            className="w-full py-3 text-sm font-black uppercase border-4 border-foreground bg-primary text-primary-foreground hover:opacity-90 transition-all"
            style={{ boxShadow: "4px 4px 0 rgba(0,0,0,0.25)" }}
          >
            Commencer la configuration →
          </button>
        </div>
      </div>
    );
  }

  // Step 1: Child name
  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-6">
        <div className={`w-full max-w-sm border-4 border-foreground bg-white p-8 text-center space-y-5 ${animClass}`} style={cardStyle}>
          <span className="text-5xl block">👶</span>
          <h2 className="text-xl font-black text-foreground uppercase">Prénom de l'enfant</h2>
          <p className="text-sm font-bold text-muted-foreground">
            Comment s'appelle votre enfant ? Bobby l'utilisera dans ses analyses.
          </p>
          <div className="flex gap-2 justify-center">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i <= 1 ? "w-8 bg-primary" : "w-4 bg-muted"}`} />
            ))}
          </div>
          <input
            type="text"
            value={childName}
            onChange={e => setChildName(e.target.value)}
            placeholder="Prénom…"
            autoFocus
            maxLength={30}
            className="w-full px-4 py-3 text-lg font-black text-center border-4 border-foreground bg-white outline-none focus:ring-2 focus:ring-primary/30"
            onKeyDown={e => { if (e.key === "Enter" && childName.trim().length >= 2) goStep(2); }}
          />
          <p className="text-[10px] font-bold text-muted-foreground">
            🔒 Le prénom reste privé et n'est jamais prononcé par Bobby.
          </p>
          <button
            onClick={() => goStep(2)}
            disabled={childName.trim().length < 2}
            className="w-full py-3 text-sm font-black uppercase border-4 border-foreground bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-40"
            style={{ boxShadow: "4px 4px 0 rgba(0,0,0,0.25)" }}
          >
            Suivant →
          </button>
        </div>
      </div>
    );
  }

  // Step 2: PIN
  if (step === 2) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
        <div className={`w-full max-w-sm border-4 border-foreground bg-white p-8 text-center space-y-5 ${animClass}`} style={cardStyle}>
          <span className="text-5xl block">🔐</span>
          <h2 className="text-xl font-black text-foreground uppercase">Code PIN (optionnel)</h2>
          <p className="text-sm font-bold text-muted-foreground">
            Protégez l'accès au Mode Parent avec un code PIN à 4-6 chiffres.
          </p>
          <div className="flex gap-2 justify-center">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i <= 2 ? "w-8 bg-primary" : "w-4 bg-muted"}`} />
            ))}
          </div>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="••••"
            autoFocus
            className="w-full px-4 py-3 text-2xl font-black text-center tracking-[0.5em] border-4 border-foreground bg-white outline-none focus:ring-2 focus:ring-primary/30"
            onKeyDown={e => { if (e.key === "Enter") goStep(3); }}
          />
          <p className="text-[10px] font-bold text-muted-foreground">
            Laissez vide pour un accès sans PIN. Modifiable à tout moment dans les réglages.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { setPin(""); goStep(3); }}
              className="flex-1 py-3 text-xs font-black uppercase border-4 border-foreground bg-white text-foreground hover:bg-muted transition-all"
            >
              Passer
            </button>
            <button
              onClick={() => goStep(3)}
              disabled={pin.length > 0 && pin.length < 4}
              className="flex-1 py-3 text-xs font-black uppercase border-4 border-foreground bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-40"
              style={{ boxShadow: "4px 4px 0 rgba(0,0,0,0.25)" }}
            >
              {pin.length >= 4 ? "Suivant →" : "Suivant →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Personality
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-green-50 p-6">
      <div className={`w-full max-w-sm border-4 border-foreground bg-white p-8 text-center space-y-5 ${animClass}`} style={cardStyle}>
        <span className="text-5xl block">🎭</span>
        <h2 className="text-xl font-black text-foreground uppercase">Personnalité Bobby</h2>
        <p className="text-sm font-bold text-muted-foreground">
          Choisissez le style d'interaction de Bobby avec {childName.trim() || "votre enfant"}.
        </p>
        <div className="flex gap-2 justify-center">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-1.5 rounded-full transition-all w-8 bg-primary" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {personalities.map(p => (
            <button
              key={p.id}
              onClick={() => setPersonality(p.id)}
              className={`p-3 border-4 text-left transition-all ${
                personality === p.id
                  ? "border-primary bg-primary/10 scale-[1.02]"
                  : "border-foreground/20 bg-white hover:border-foreground/40"
              }`}
              style={personality === p.id ? { boxShadow: "3px 3px 0 hsl(var(--primary)/0.3)" } : {}}
            >
              <span className="text-2xl block mb-1">{p.emoji}</span>
              <p className="text-xs font-black text-foreground uppercase">{p.label}</p>
              <p className="text-[10px] font-bold text-muted-foreground leading-tight mt-0.5">{p.desc}</p>
            </button>
          ))}
        </div>
        <button
          onClick={() => onComplete(childName.trim(), pin, personality)}
          className="w-full py-3 text-sm font-black uppercase border-4 border-foreground bg-primary text-primary-foreground hover:opacity-90 transition-all"
          style={{ boxShadow: "4px 4px 0 rgba(0,0,0,0.25)" }}
        >
          Terminer & Accéder au Dashboard 🚀
        </button>
      </div>
    </div>
  );
}
