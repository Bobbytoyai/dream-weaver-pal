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

const TOTAL_STEPS = 5;

const stepColors = [
  "from-[#B8D4E3] to-[#E8F0FE]",
  "from-[#B8E3C8] to-[#E8FEF0]",
  "from-[#E8D4F0] to-[#F0E8FE]",
  "from-[#FFE8B8] to-[#FEF8E8]",
  "from-[#E8F0E8] to-[#F0FEF0]",
];

export default function ParentOnboarding({ currentChildName, onComplete }: ParentOnboardingProps) {
  const [step, setStep] = useState(0);
  const [childName, setChildName] = useState("");
  const [pin, setPin] = useState("");
  const [personality, setPersonality] = useState<"balanced" | "calm" | "energetic" | "educational">("balanced");
  const [animClass, setAnimClass] = useState("animate-in fade-in");

  // RGPD consents
  const [consentCollect, setConsentCollect] = useState(false);
  const [consentAnalysis, setConsentAnalysis] = useState(false);
  const [consentImprovement, setConsentImprovement] = useState(false);

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
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
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
  if (step === 3) {
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
            onClick={() => goStep(4)}
            className="w-full py-3 text-xs font-black uppercase border-4 border-black bg-black text-white hover:opacity-90 transition-all"
            style={{ boxShadow: "4px 4px 0 rgba(0,0,0,0.25)" }}
          >
            Suivant →
          </button>
        </div>
      </div>
    );
  }

  // Step 4: RGPD Consent
  const canFinish = consentCollect; // mandatory

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${stepColors[4]} p-4`}>
      <div className={`w-full max-w-xs border-4 border-black bg-white p-6 text-center space-y-4 ${animClass}`} style={cardStyle}>
        <span className="text-4xl block">🔒</span>
        <h2 className="text-lg font-black text-black uppercase">Protection des données</h2>
        <p className="text-[10px] font-black text-black leading-relaxed">
          Conformément au <strong>RGPD</strong> et à la <strong>COPPA</strong>, le consentement parental est requis pour la collecte de données d'enfants de moins de 16 ans.
        </p>
        {dots(4)}

        <div className="space-y-2.5 text-left">
          {/* Mandatory consent */}
          <label className="flex items-start gap-2.5 p-2.5 border-4 border-black cursor-pointer transition-all"
            style={{ backgroundColor: consentCollect ? "var(--retro-green, #B8E3C8)" : "#fff" }}>
            <input
              type="checkbox"
              checked={consentCollect}
              onChange={e => setConsentCollect(e.target.checked)}
              className="mt-0.5 w-5 h-5 accent-black flex-shrink-0"
            />
            <div>
              <p className="text-[11px] font-black text-black leading-tight">
                J'autorise Bobby à collecter les données conversationnelles de mon enfant <span className="text-red-600">*</span>
              </p>
              <p className="text-[8px] font-bold text-black/60 mt-0.5 leading-snug">
                Nécessaire au fonctionnement de Bobby : prénom, conversations, émotions détectées, préférences.
              </p>
            </div>
          </label>

          {/* Optional: analysis */}
          <label className="flex items-start gap-2.5 p-2.5 border-3 border-black/30 cursor-pointer transition-all"
            style={{ backgroundColor: consentAnalysis ? "var(--retro-blue, #B8D4E3)" : "#fff" }}>
            <input
              type="checkbox"
              checked={consentAnalysis}
              onChange={e => setConsentAnalysis(e.target.checked)}
              className="mt-0.5 w-5 h-5 accent-black flex-shrink-0"
            />
            <div>
              <p className="text-[11px] font-black text-black leading-tight">
                Autoriser l'analyse des sessions
              </p>
              <p className="text-[8px] font-bold text-black/60 mt-0.5 leading-snug">
                Résumés, détection d'émotions, insights comportementaux dans le tableau de bord parent.
              </p>
            </div>
          </label>

          {/* Optional: improvement */}
          <label className="flex items-start gap-2.5 p-2.5 border-3 border-black/30 cursor-pointer transition-all"
            style={{ backgroundColor: consentImprovement ? "var(--retro-purple, #E8D4F0)" : "#fff" }}>
            <input
              type="checkbox"
              checked={consentImprovement}
              onChange={e => setConsentImprovement(e.target.checked)}
              className="mt-0.5 w-5 h-5 accent-black flex-shrink-0"
            />
            <div>
              <p className="text-[11px] font-black text-black leading-tight">
                Contribuer à l'amélioration de Bobby
              </p>
              <p className="text-[8px] font-bold text-black/60 mt-0.5 leading-snug">
                Données anonymisées utilisées pour améliorer les réponses de Bobby. Jamais vendues.
              </p>
            </div>
          </label>
        </div>

        <p className="text-[8px] font-bold text-black/50 leading-snug">
          <span className="text-red-600">*</span> Obligatoire — Vous pouvez retirer votre consentement à tout moment dans Réglages → RGPD. Données hébergées en Europe 🇪🇺.
        </p>

        <button
          onClick={() => onComplete(childName.trim() || "Mon ami", pin, personality)}
          disabled={!canFinish}
          className="w-full py-3 text-xs font-black uppercase border-4 border-black bg-black text-white hover:opacity-90 transition-all disabled:opacity-30"
          style={{ boxShadow: "4px 4px 0 rgba(0,0,0,0.25)" }}
        >
          {canFinish ? "Terminer & Accéder au Dashboard 🚀" : "Consentement requis ⬆️"}
        </button>
      </div>
    </div>
  );
}
