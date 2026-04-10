import { useState, useEffect } from "react";
import companionAvatar from "@/assets/companion-avatar.png";
import VoicePickerStep from "./onboarding/VoicePickerStep";
import InterestsStep from "./onboarding/InterestsStep";
import type { VoiceProfile } from "@/lib/voicePipeline";

interface OnboardingScreenProps {
  onComplete: (name: string, age: number, voice: VoiceProfile, interests: string[]) => void;
}

const ageGroups = [5, 6, 7, 8, 9, 10, 11, 12];

// Steps: 0=welcome, 1=name, 2=age, 3=interests, 4=voice, 5=ready
const OnboardingScreen = ({ onComplete }: OnboardingScreenProps) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [voice, setVoice] = useState<VoiceProfile>("female");
  const [interests, setInterests] = useState<string[]>([]);
  const [animClass, setAnimClass] = useState("animate-fadeInUp");

  const goStep = (next: number) => {
    setAnimClass("animate-fadeOut");
    setTimeout(() => {
      setStep(next);
      setAnimClass("animate-fadeInUp");
    }, 250);
  };

  useEffect(() => {
    if (step === 5 && age) {
      const t = setTimeout(() => onComplete(name.trim(), age, voice, interests), 2200);
      return () => clearTimeout(t);
    }
  }, [step, age, name, voice, interests, onComplete]);

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-gradient-to-br from-[hsl(230,30%,8%)] via-[hsl(250,25%,12%)] to-[hsl(220,25%,10%)]">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-[hsla(215,85%,58%,0.08)] blur-[120px] -top-40 -left-40 animate-drift1" />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-[hsla(270,55%,62%,0.07)] blur-[100px] top-1/2 -right-32 animate-drift2" />
        <div className="absolute w-[350px] h-[350px] rounded-full bg-[hsla(320,55%,65%,0.06)] blur-[90px] -bottom-20 left-1/3 animate-drift3" />
      </div>

      {/* Stars */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/20 animate-twinkle"
            style={{
              width: 2 + Math.random() * 3,
              height: 2 + Math.random() * 3,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className={`relative z-10 flex flex-col items-center w-full max-w-sm px-6 ${animClass}`}>
        {/* Step dots (5 steps: 0-4) */}
        <div className="flex gap-2 mb-8">
          {[0, 1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                s <= step
                  ? "w-7 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))]"
                  : "w-3.5 bg-white/15"
              }`}
            />
          ))}
        </div>

        {/* STEP 0: Welcome */}
        {step === 0 && (
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-[hsla(215,85%,58%,0.2)] blur-2xl scale-150 glow-pulse" />
              <img src={companionAvatar} alt="Bobby" className="relative w-40 h-40 drop-shadow-2xl float" />
            </div>
            <h1 className="text-4xl font-extrabold text-foreground mb-2 tracking-tight">
              Salut ! <span className="inline-block animate-wave">👋</span>
            </h1>
            <p className="text-muted-foreground text-lg mb-1 font-semibold">
              Je suis <span className="text-[hsl(var(--primary))] font-extrabold">Bobby</span>
            </p>
            <p className="text-muted-foreground/60 text-base mb-10 max-w-[280px] leading-relaxed">
              Ton compagnon magique pour les histoires, les jeux et les découvertes !
            </p>
            <button
              onClick={() => goStep(1)}
              className="group relative w-full py-4 rounded-2xl bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] text-[hsl(var(--primary-foreground))] font-bold text-lg shadow-lg shadow-[hsla(215,85%,58%,0.3)] hover:shadow-xl hover:shadow-[hsla(215,85%,58%,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              C'est parti ! 🚀
              <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        )}

        {/* STEP 1: Name */}
        {step === 1 && (
          <div className="flex flex-col items-center text-center w-full">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] flex items-center justify-center mb-6 shadow-lg shadow-[hsla(215,85%,58%,0.25)]">
              <span className="text-4xl">😊</span>
            </div>
            <h2 className="text-3xl font-extrabold text-foreground mb-2">Comment tu t'appelles ?</h2>
            <p className="text-muted-foreground text-sm mb-8">Bobby veut connaître ton prénom !</p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ton prénom..."
              autoFocus
              className="w-full rounded-2xl border-2 border-border bg-[hsl(var(--muted))]/30 backdrop-blur-sm px-6 py-4 text-lg text-center font-bold text-foreground placeholder:text-muted-foreground/40 focus:border-[hsl(var(--primary))] focus:bg-[hsl(var(--muted))]/50 focus:outline-none focus:ring-2 focus:ring-[hsla(200,100%,60%,0.3)] transition-all"
              onKeyDown={(e) => { if (e.key === "Enter" && name.trim().length >= 2) goStep(2); }}
            />
            <button
              onClick={() => goStep(2)}
              disabled={name.trim().length < 2}
              className="mt-6 w-full py-4 rounded-2xl bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] text-[hsl(var(--primary-foreground))] font-bold text-lg shadow-lg shadow-[hsla(215,85%,58%,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              Suivant ✨
            </button>
          </div>
        )}

        {/* STEP 2: Age */}
        {step === 2 && (
          <div className="flex flex-col items-center text-center w-full">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[hsl(270,55%,62%)] to-[hsl(320,55%,65%)] flex items-center justify-center mb-6 shadow-lg shadow-[hsla(270,55%,62%,0.25)]">
              <span className="text-4xl">🎂</span>
            </div>
            <h2 className="text-3xl font-extrabold text-foreground mb-2">Tu as quel âge, {name.trim()} ?</h2>
            <p className="text-muted-foreground text-sm mb-6">Pour que Bobby s'adapte à toi !</p>
            <div className="grid grid-cols-4 gap-3 w-full mb-8">
              {ageGroups.map((a) => (
                <button
                  key={a}
                  onClick={() => setAge(a)}
                  className={`relative rounded-2xl py-3.5 text-xl font-extrabold transition-all duration-200 ${
                    age === a
                      ? "bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] text-[hsl(var(--primary-foreground))] scale-110 shadow-lg shadow-[hsla(215,85%,58%,0.35)]"
                      : "bg-[hsl(var(--muted))]/50 text-muted-foreground border border-border hover:border-[hsl(var(--primary))]/50 hover:bg-[hsl(var(--muted))] hover:text-foreground hover:scale-105"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
            <button
              onClick={() => age && goStep(3)}
              disabled={!age}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] text-[hsl(var(--primary-foreground))] font-bold text-lg shadow-lg shadow-[hsla(215,85%,58%,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              Suivant ✨
            </button>
          </div>
        )}

        {/* STEP 3: Interests */}
        {step === 3 && (
          <InterestsStep
            childName={name.trim()}
            selectedInterests={interests}
            onSelect={setInterests}
            onNext={() => goStep(4)}
          />
        )}

        {/* STEP 4: Voice */}
        {step === 4 && (
          <VoicePickerStep
            childName={name.trim()}
            selectedVoice={voice}
            onSelect={setVoice}
            onNext={() => goStep(5)}
          />
        )}

        {/* STEP 5: Ready */}
        {step === 5 && (
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 rounded-full bg-[hsla(145,65%,50%,0.15)] blur-3xl scale-[2] animate-pulse" />
              <img src={companionAvatar} alt="Bobby" className="relative w-32 h-32 drop-shadow-2xl animate-bounce-slow" />
            </div>
            <h2 className="text-3xl font-extrabold text-foreground mb-3">Super, {name.trim()} ! 🌟</h2>
            <p className="text-muted-foreground text-base mb-6">Bobby est prêt à jouer avec toi !</p>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--primary))] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingScreen;
