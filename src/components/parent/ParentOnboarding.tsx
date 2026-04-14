import { useState } from "react";

interface ParentOnboardingProps {
  currentChildName: string;
  onComplete: (childName: string, pin: string, personality: "balanced" | "calm" | "energetic" | "educational") => void;
}

const personalities = [
  { id: "balanced" as const, emoji: "⚖️", label: "Équilibré", desc: "Mix jeux, éducation et histoires", color: "var(--retro-blue, #B8D4E3)" },
  { id: "calm" as const, emoji: "🧘", label: "Calme", desc: "Ton doux, rythme lent, apaisant", color: "var(--retro-green, #B8E3C8)" },
  { id: "energetic" as const, emoji: "⚡", label: "Dynamique", desc: "Enthousiaste, interactif, stimulant", color: "var(--retro-yellow, #FFE066)" },
  { id: "educational" as const, emoji: "📚", label: "Éducatif", desc: "Focus apprentissage et curiosité", color: "var(--retro-red, #FFB3B3)" },
];

const stepColors = [
  "from-[#B8D4E3] to-[#E8F0FE]",
  "from-[#B8E3C8] to-[#E8FEF0]",
  "from-[#E8D4F0] to-[#F0E8FE]",
  "from-[#FFE8B8] to-[#FEF8E8]",
];

export default function ParentOnboarding({ currentChildName, onComplete }: ParentOnboardingProps) {
  const [step, setStep] = useState(0);
  const [childName, setChildName] = useState("");
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
    boxShadow: "6px 6px 0 rgba(0,0,0,0.2)",
  };

  const dots = (active: number) => (
    <div className="flex gap-2 justify-center">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className={`h-2 rounded-full transition-all ${i <= active ? "w-8 bg-black" : "w-4 bg-black/20"}`} />
      ))}
    </div>
  );

  // Step 0: Welcome
  if (step === 0) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${stepColors[0]} p-4`}>
        <div className={`w-full max-w-xs border-4 border-black bg-white p-6 text-center space-y-4 ${animClass}`} style={cardStyle}>
          <div className="mx-auto w-16 h-16 border-4 border-black bg-[#FFE066] flex items-center justify-center rounded-xl">
            <span className="text-4xl">👋</span>
          </div>
          <h2 className="text-lg font-black text-black uppercase">Bienvenue, Parent !</h2>
          <p className="text-xs font-black text-black leading-relaxed">
            Configurons Bobby en quelques étapes pour votre enfant.
          </p>
          {dots(0)}
          <button
            onClick={() => goStep(1)}
            className="w-full py-3 text-xs font-black uppercase border-4 border-black bg-black text-white hover:opacity-90 transition-all"
            style={{ boxShadow: "4px 4px 0 rgba(0,0,0,0.25)" }}
          >
            Commencer →
          </button>
        </div>
      </div>
    );
  }

  // Step 1: Child name
  if (step === 1) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${stepColors[1]} p-4`}>
        <div className={`w-full max-w-xs border-4 border-black bg-white p-6 text-center space-y-4 ${animClass}`} style={cardStyle}>
          <span className="text-4xl block">👶</span>
          <h2 className="text-lg font-black text-black uppercase">Prénom de l'enfant</h2>
          <p className="text-xs font-black text-black">
            Bobby utilisera ce prénom pour parler à votre enfant.
          </p>
          {dots(1)}
          <input
            type="text"
            value={childName}
            onChange={e => setChildName(e.target.value)}
            placeholder="Entrez le prénom…"
            autoFocus
            maxLength={30}
            className="w-full px-4 py-3 text-base font-black text-center border-4 border-black bg-[#FEF8E8] text-black outline-none focus:ring-2 focus:ring-black/20 placeholder:text-black/30"
            onKeyDown={e => { if (e.key === "Enter" && childName.trim().length >= 2) goStep(2); }}
          />
          <button
            onClick={() => goStep(2)}
            disabled={childName.trim().length < 2}
            className="w-full py-3 text-xs font-black uppercase border-4 border-black bg-black text-white hover:opacity-90 transition-all disabled:opacity-30"
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
      <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${stepColors[2]} p-4`}>
        <div className={`w-full max-w-xs border-4 border-black bg-white p-6 text-center space-y-4 ${animClass}`} style={cardStyle}>
          <span className="text-4xl block">🔐</span>
          <h2 className="text-lg font-black text-black uppercase">Code PIN</h2>
          <p className="text-xs font-black text-black">
            Protégez l'accès au Mode Parent (4-6 chiffres, optionnel).
          </p>
          {dots(2)}
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="••••"
            autoFocus
            className="w-full px-4 py-3 text-2xl font-black text-center tracking-[0.5em] border-4 border-black bg-[#F0E8FE] text-black outline-none focus:ring-2 focus:ring-black/20 placeholder:text-black/30"
            onKeyDown={e => { if (e.key === "Enter") goStep(3); }}
          />
          <p className="text-[10px] font-black text-black/60">
            Laissez vide pour un accès sans PIN.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { setPin(""); goStep(3); }}
              className="flex-1 py-3 text-xs font-black uppercase border-4 border-black bg-[#FFE066] text-black hover:opacity-90 transition-all"
              style={{ boxShadow: "3px 3px 0 rgba(0,0,0,0.15)" }}
            >
              Passer
            </button>
            <button
              onClick={() => goStep(3)}
              disabled={pin.length > 0 && pin.length < 4}
              className="flex-1 py-3 text-xs font-black uppercase border-4 border-black bg-black text-white hover:opacity-90 transition-all disabled:opacity-30"
              style={{ boxShadow: "4px 4px 0 rgba(0,0,0,0.25)" }}
            >
              Suivant →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Personality
  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${stepColors[3]} p-4`}>
      <div className={`w-full max-w-xs border-4 border-black bg-white p-6 text-center space-y-4 ${animClass}`} style={cardStyle}>
        <span className="text-4xl block">🎭</span>
        <h2 className="text-lg font-black text-black uppercase">Personnalité Bobby</h2>
        <p className="text-xs font-black text-black">
          Choisissez le style d'interaction de Bobby.
        </p>
        {dots(3)}
        <div className="grid grid-cols-2 gap-2">
          {personalities.map(p => (
            <button
              key={p.id}
              onClick={() => setPersonality(p.id)}
              className={`p-2.5 border-4 text-left transition-all ${
                personality === p.id
                  ? "border-black scale-[1.02]"
                  : "border-black/20 bg-white hover:border-black/40"
              }`}
              style={{
                backgroundColor: personality === p.id ? p.color : "white",
                boxShadow: personality === p.id ? "3px 3px 0 rgba(0,0,0,0.2)" : "none",
              }}
            >
              <span className="text-xl block mb-0.5">{p.emoji}</span>
              <p className="text-[11px] font-black text-black uppercase">{p.label}</p>
              <p className="text-[9px] font-bold text-black/70 leading-tight mt-0.5">{p.desc}</p>
            </button>
          ))}
        </div>
        <button
          onClick={() => onComplete(childName.trim() || "Mon ami", pin, personality)}
          className="w-full py-3 text-xs font-black uppercase border-4 border-black bg-black text-white hover:opacity-90 transition-all"
          style={{ boxShadow: "4px 4px 0 rgba(0,0,0,0.25)" }}
        >
          Terminer & Accéder au Dashboard 🚀
        </button>
      </div>
    </div>
  );
}
