import { useState, useEffect, useRef } from "react";
import { HologramFace } from "./hologram/HologramFace";
import VoicePickerStep from "./onboarding/VoicePickerStep";
import InterestsStep from "./onboarding/InterestsStep";
import type { VoiceProfile } from "@/lib/voicePipeline";

interface OnboardingScreenProps {
  onComplete: (name: string, age: number, voice: VoiceProfile, interests: string[]) => void;
}

const ageGroups = [5, 6, 7, 8, 9, 10, 11, 12];

const TOTAL_STEPS = 5; // 0-4

const OnboardingScreen = ({ onComplete }: OnboardingScreenProps) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [voice, setVoice] = useState<VoiceProfile>("female");
  const [interests, setInterests] = useState<string[]>([]);
  const [animClass, setAnimClass] = useState("animate-fadeInUp");
  const [nameEmotion, setNameEmotion] = useState<"idle" | "happy" | "excited">("idle");
  const [ageEmotion, setAgeEmotion] = useState<"idle" | "surprised" | "happy">("idle");
  const ageEmotionTimer = useRef<number>(0);

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
        {[...Array(25)].map((_, i) => (
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
        {/* Step dots */}
        <div className="flex gap-2 mb-6">
          {Array.from({ length: TOTAL_STEPS }).map((_, s) => (
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
            <div className="relative mb-6 w-40 h-40">
              <div className="absolute inset-0 rounded-full bg-[hsla(215,85%,58%,0.2)] blur-2xl scale-150 glow-pulse" />
              {[...Array(12)].map((_, i) => {
                const angle = (i / 12) * 360;
                const radius = 68 + Math.random() * 14;
                const size = 3 + Math.random() * 4;
                const duration = 2.5 + Math.random() * 2;
                const delay = Math.random() * 3;
                return (
                  <div
                    key={i}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: size,
                      height: size,
                      left: `calc(50% + ${Math.cos(angle * Math.PI / 180) * radius}px - ${size / 2}px)`,
                      top: `calc(50% + ${Math.sin(angle * Math.PI / 180) * radius}px - ${size / 2}px)`,
                      background: [
                        'hsla(215, 90%, 75%, 0.9)',
                        'hsla(270, 80%, 78%, 0.85)',
                        'hsla(45, 95%, 75%, 0.9)',
                        'hsla(320, 70%, 75%, 0.8)',
                        'hsla(180, 80%, 75%, 0.85)',
                      ][i % 5],
                      boxShadow: `0 0 ${size * 2}px ${size}px ${[
                        'hsla(215, 90%, 75%, 0.4)',
                        'hsla(270, 80%, 78%, 0.35)',
                        'hsla(45, 95%, 75%, 0.4)',
                        'hsla(320, 70%, 75%, 0.3)',
                        'hsla(180, 80%, 75%, 0.35)',
                      ][i % 5]}`,
                      animation: `sparkle-orbit ${duration}s ease-in-out ${delay}s infinite alternate, sparkle-fade ${duration * 0.7}s ease-in-out ${delay}s infinite alternate`,
                    }}
                  />
                );
              })}
              <HologramFace voiceState="idle" enableCamera={false} />
            </div>
            <h1 className="text-4xl font-extrabold text-foreground mb-2 tracking-tight animate-fadeInUp">
              Salut ! <span className="inline-block animate-wave">👋</span>
            </h1>
            <p className="text-muted-foreground text-lg mb-1 font-semibold animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
              Je suis <span className="text-[hsl(var(--primary))] font-extrabold">Bobby</span>
            </p>
            <p className="text-muted-foreground/60 text-base mb-8 max-w-[280px] leading-relaxed animate-fadeInUp" style={{ animationDelay: "0.15s" }}>
              Ton compagnon magique pour les histoires, les jeux et les découvertes !
            </p>
            <button
              onClick={() => goStep(1)}
              className="animate-fadeInUp group relative w-full py-4 rounded-2xl bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] text-[hsl(var(--primary-foreground))] font-bold text-lg shadow-lg shadow-[hsla(215,85%,58%,0.3)] hover:shadow-xl hover:shadow-[hsla(215,85%,58%,0.4)] hover:scale-[1.02] transition-all duration-200"
              style={{ animationDelay: "0.25s" }}
            >
              C'est parti ! 🚀
              <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        )}

        {/* STEP 1: Name */}
        {step === 1 && (
          <div className="flex flex-col items-center text-center w-full">
            <div className="w-20 h-20 mb-5 relative animate-fadeInUp">
              <HologramFace voiceState="listening" enableCamera={false} emotionOverride={nameEmotion === "idle" ? undefined : nameEmotion} />
            </div>
            <h2 className="text-3xl font-extrabold text-foreground mb-2 animate-fadeInUp" style={{ animationDelay: "0.05s" }}>
              Comment tu t'appelles ?
            </h2>
            <p className="text-muted-foreground text-sm mb-6 animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
              Bobby veut connaître ton prénom !
            </p>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameEmotion(e.target.value.trim().length >= 2 ? "happy" : e.target.value.length > 0 ? "excited" : "idle");
              }}
              placeholder="Ton prénom..."
              autoFocus
              className="animate-fadeInUp w-full rounded-2xl border-2 border-border bg-[hsl(var(--muted))]/30 backdrop-blur-sm px-6 py-4 text-lg text-center font-bold text-foreground placeholder:text-muted-foreground/40 focus:border-[hsl(var(--primary))] focus:bg-[hsl(var(--muted))]/50 focus:outline-none focus:ring-2 focus:ring-[hsla(200,100%,60%,0.3)] transition-all"
              style={{ animationDelay: "0.15s" }}
              onKeyDown={(e) => { if (e.key === "Enter" && name.trim().length >= 2) goStep(2); }}
            />
            <button
              onClick={() => goStep(2)}
              disabled={name.trim().length < 2}
              className="animate-fadeInUp mt-5 w-full py-4 rounded-2xl bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] text-[hsl(var(--primary-foreground))] font-bold text-lg shadow-lg shadow-[hsla(215,85%,58%,0.3)] hover:scale-[1.02] transition-all duration-200 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
              style={{ animationDelay: "0.25s" }}
            >
              Suivant ✨
            </button>
          </div>
        )}

        {/* STEP 2: Age */}
        {step === 2 && (
          <div className="flex flex-col items-center text-center w-full">
            <div className="w-20 h-20 mb-5 relative animate-fadeInUp">
              <HologramFace voiceState="idle" enableCamera={false} emotionOverride={ageEmotion === "idle" ? undefined : ageEmotion} />
            </div>
            <h2 className="text-3xl font-extrabold text-foreground mb-2 animate-fadeInUp" style={{ animationDelay: "0.05s" }}>
              Tu as quel âge, {name.trim()} ?
            </h2>
            <p className="text-muted-foreground text-sm mb-5 animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
              Pour que Bobby s'adapte à toi !
            </p>
            <div className="grid grid-cols-4 gap-2.5 w-full mb-6">
              {ageGroups.map((a, idx) => (
                <button
                  key={a}
                  onClick={() => {
                    setAge(a);
                    setAgeEmotion("surprised");
                    clearTimeout(ageEmotionTimer.current);
                    ageEmotionTimer.current = window.setTimeout(() => setAgeEmotion("happy"), 800);
                  }}
                  className={`animate-fadeInUp relative rounded-2xl py-3 text-xl font-extrabold transition-all duration-300 ${
                    age === a
                      ? "bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] text-[hsl(var(--primary-foreground))] scale-110 shadow-lg shadow-[hsla(215,85%,58%,0.35)]"
                      : "bg-[hsl(var(--muted))]/50 text-muted-foreground border border-border hover:border-[hsl(var(--primary))]/50 hover:bg-[hsl(var(--muted))] hover:text-foreground hover:scale-105"
                  }`}
                  style={{ animationDelay: `${0.12 + idx * 0.04}s` }}
                >
                  {a}
                </button>
              ))}
            </div>
            <button
              onClick={() => age && goStep(3)}
              disabled={!age}
              className="animate-fadeInUp w-full py-4 rounded-2xl bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] text-[hsl(var(--primary-foreground))] font-bold text-lg shadow-lg shadow-[hsla(215,85%,58%,0.3)] hover:scale-[1.02] transition-all duration-200 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
              style={{ animationDelay: "0.5s" }}
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
            <div className="relative mb-8 w-32 h-32 animate-fadeInUp">
              <div className="absolute inset-0 rounded-full bg-[hsla(145,65%,50%,0.15)] blur-3xl scale-[2] animate-pulse" />
              <HologramFace voiceState="speaking" enableCamera={false} />
            </div>
            <h2 className="text-3xl font-extrabold text-foreground mb-3 animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
              Super, {name.trim()} ! 🌟
            </h2>
            <p className="text-muted-foreground text-base mb-6 animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
              Bobby est prêt à jouer avec toi !
            </p>
            <div className="flex gap-1.5 animate-fadeInUp" style={{ animationDelay: "0.3s" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--primary))] animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingScreen;
