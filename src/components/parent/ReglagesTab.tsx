import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import type { ParentSettings } from "@/components/parentSettings";
import type { ParentSession as Session } from "@/lib/bobby/parentDashboard";

const LazyVoiceSettings = lazy(() => import("@/components/parent/VoiceSettings"));
const LazyLimitsSettings = lazy(() => import("@/components/parent/LimitsSettings"));
const LazyBobbyCustomizer = lazy(() => import("@/components/parent/BobbyCustomizer"));
const LazyProfilTab = lazy(() => import("@/components/parent/ProfilTab"));

interface ReglagesTabProps {
  settings: ParentSettings;
  sessions: Session[];
  childName: string;
  allInterests: [string, number][];
  settingsSaved: boolean;
  reglagesSection: "voix" | "limites" | "personnalisation" | "profil" | null;
  setReglagesSection: (s: "voix" | "limites" | "personnalisation" | "profil" | null) => void;
  onUpdate: <K extends keyof ParentSettings>(key: K, value: ParentSettings[K]) => void;
  onUpdateNested: <K extends keyof ParentSettings>(key: K, subKey: string, value: any) => void;
  onSave: () => void;
  onPendingNameChange: (name: string) => void;
}

const SuspenseFallback = () => (
  <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
);

const ReglagesTab = ({
  settings, sessions, childName, allInterests, settingsSaved,
  reglagesSection, setReglagesSection,
  onUpdate, onUpdateNested, onSave, onPendingNameChange,
}: ReglagesTabProps) => {

  if (reglagesSection === "voix") {
    return (
      <Suspense fallback={<SuspenseFallback />}>
        <LazyVoiceSettings
          settings={settings}
          onUpdate={onUpdate}
          onBack={() => setReglagesSection(null)}
          onSave={onSave}
          saved={settingsSaved}
        />
      </Suspense>
    );
  }

  if (reglagesSection === "limites") {
    const today = new Date().toLocaleDateString("fr-FR");
    const todaySessions = sessions.filter(s => new Date(s.started_at).toLocaleDateString("fr-FR") === today);
    const todayDur = todaySessions.reduce((a, s) => a + (s.duration_seconds || 0), 0);
    return (
      <Suspense fallback={<SuspenseFallback />}>
        <LazyLimitsSettings
          settings={settings}
          onUpdate={onUpdate}
          onUpdateNested={onUpdateNested}
          todayDuration={todayDur}
          onBack={() => setReglagesSection(null)}
          onSave={onSave}
          saved={settingsSaved}
        />
      </Suspense>
    );
  }

  if (reglagesSection === "personnalisation") {
    return (
      <Suspense fallback={<SuspenseFallback />}>
        <LazyBobbyCustomizer
          settings={settings}
          onUpdate={(key, value) => onUpdate(key, value)}
          onBack={() => setReglagesSection(null)}
          onSave={onSave}
          saved={settingsSaved}
        />
      </Suspense>
    );
  }

  if (reglagesSection === "profil") {
    return (
      <Suspense fallback={<SuspenseFallback />}>
        <LazyProfilTab
          settings={settings}
          childName={childName}
          allInterests={allInterests}
          onUpdate={onUpdate}
          onSave={onSave}
          saved={settingsSaved}
          onBack={() => setReglagesSection(null)}
          showBackButton
          onPendingNameChange={onPendingNameChange}
        />
      </Suspense>
    );
  }

  return (
    <div className="p-4 space-y-3" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <h2 className="text-[18px] font-black text-foreground animate-fadeInUp uppercase">⚙️ Réglages</h2>
      <div className="grid grid-cols-2 gap-3 animate-fadeInUp" style={{ animationDelay: "0.05s" }}>
        {([
          ["voix", "🎤", "Voix & Sons", "Profils vocaux, vitesse, ton", "var(--retro-blue)"],
          ["limites", "⏱️", "Limites & Contrôle", "Temps, nuit, interactions, sujets", "var(--retro-yellow)"],
          ["profil", "👤", "Profil enfant", "Intérêts, mémoire, préférences", "var(--retro-purple)"],
        ] as const).map(([key, emoji, label, desc, bg], i) => (
          <button key={key} onClick={() => setReglagesSection(key)}
            className={`retro-card retro-card-tilt-${(i % 6) + 1} p-5 text-center transition-all duration-200 hover:translate-y-[-2px]`}
            style={{ backgroundColor: bg, boxShadow: "4px 4px 0px rgba(0,0,0,0.25)" }}>
            <span className="text-4xl block mb-2">{emoji}</span>
            <span className="text-[14px] font-black text-foreground block uppercase">{label}</span>
            <span className="text-[10px] text-foreground/60 leading-tight block mt-1 font-bold">{desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ReglagesTab;
