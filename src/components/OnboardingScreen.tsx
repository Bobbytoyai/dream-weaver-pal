import { useState } from "react";
import { Button } from "@/components/ui/button";
import companionAvatar from "@/assets/companion-avatar.png";

interface OnboardingScreenProps {
  onComplete: (name: string, age: number) => void;
}

const ageGroups = [5, 6, 7, 8, 9, 10, 11, 12];

const OnboardingScreen = ({ onComplete }: OnboardingScreenProps) => {
  const [step, setStep] = useState<"welcome" | "name" | "age">("welcome");
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | null>(null);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      {step === "welcome" && (
        <div className="text-center bounce-in max-w-md">
          <img
            src={companionAvatar}
            alt="Buddy"
            width={200}
            height={200}
            className="mx-auto float mb-6"
          />
          <h1 className="text-4xl font-extrabold text-foreground mb-3">
            Salut ! 👋
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Je suis <span className="text-primary font-bold">Buddy</span>, ton compagnon ! J'adore les histoires, les jeux et apprendre plein de trucs !
          </p>
          <Button
            size="lg"
            className="text-lg px-10 py-6 bg-primary text-primary-foreground hover:scale-105 transition-transform"
            onClick={() => setStep("name")}
          >
            C'est parti ! 🚀
          </Button>
        </div>
      )}

      {step === "name" && (
        <div className="text-center bounce-in max-w-md w-full">
          <img
            src={companionAvatar}
            alt="Buddy"
            width={120}
            height={120}
            className="mx-auto mb-6"
          />
          <h2 className="text-3xl font-extrabold text-foreground mb-2">
            Comment tu t'appelles ? 😊
          </h2>
          <p className="text-muted-foreground mb-6">J'aimerais savoir ton prénom !</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ton prénom..."
            className="w-full max-w-xs mx-auto block rounded-full border-2 border-primary/30 bg-card px-6 py-4 text-lg text-center font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) setStep("age");
            }}
          />
          <Button
            size="lg"
            className="mt-6 text-lg px-10 py-6 bg-primary text-primary-foreground hover:scale-105 transition-transform"
            onClick={() => name.trim() && setStep("age")}
            disabled={!name.trim()}
          >
            Suivant ✨
          </Button>
        </div>
      )}

      {step === "age" && (
        <div className="text-center bounce-in max-w-md w-full">
          <h2 className="text-3xl font-extrabold text-foreground mb-2">
            Tu as quel âge, {name} ? 🎂
          </h2>
          <p className="text-muted-foreground mb-6">Choisis ton âge !</p>
          <div className="grid grid-cols-4 gap-3 max-w-xs mx-auto mb-8">
            {ageGroups.map((a) => (
              <button
                key={a}
                onClick={() => setAge(a)}
                className={`rounded-2xl py-3 text-xl font-bold transition-all duration-200 ${
                  age === a
                    ? "bg-primary text-primary-foreground scale-110 shadow-md"
                    : "bg-card text-foreground border-2 border-border hover:border-primary hover:scale-105"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
          <Button
            size="lg"
            className="text-lg px-10 py-6 bg-primary text-primary-foreground hover:scale-105 transition-transform"
            onClick={() => age && onComplete(name.trim(), age)}
            disabled={!age}
          >
            Commencer ! 🎉
          </Button>
        </div>
      )}
    </div>
  );
};

export default OnboardingScreen;
