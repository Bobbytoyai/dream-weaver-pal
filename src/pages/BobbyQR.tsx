import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import VoiceScreen from "@/components/VoiceScreen";
import ParentMode from "@/components/ParentMode";
import { ParentSettings, DEFAULT_PARENT_SETTINGS } from "@/components/parentSettings";
import { HologramFace } from "@/components/hologram/HologramFace";
import type { PendingNarration } from "@/hooks/useConversationStateMachine";
import { eventBus } from "@/lib/eventBus";
import { usePWAInstall } from "@/hooks/usePWAInstall";

type Step = "loading" | "invalid" | "claimed" | "sleeping" | "active" | "parent";

export default function BobbyQR() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("loading");
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState<number | null>(null);
  const [bobbyCode, setBobbyCode] = useState<any>(null);
  const [pendingNarration, setPendingNarration] = useState<PendingNarration | null>(null);
  const [parentSettings, setParentSettings] = useState<ParentSettings>(DEFAULT_PARENT_SETTINGS);
  const { canInstall, isInstalled, promptInstall } = usePWAInstall();
  const [showInstallBanner, setShowInstallBanner] = useState(true);
  // Load code from DB + anti-piracy check via localStorage session token
  useEffect(() => {
    if (!code) { setStep("invalid"); return; }
    const upperCode = code.toUpperCase();
    const tokenKey = `bobby_session_${upperCode}`;

    (async () => {
      const { data, error } = await supabase
        .from("bobby_codes")
        .select("*")
        .eq("code", upperCode)
        .maybeSingle();

      if (error || !data) { setStep("invalid"); return; }
      setBobbyCode(data);

      if (data.claimed_at && data.child_name) {
        // Code already claimed — check if THIS device is the owner
        const storedToken = localStorage.getItem(tokenKey);
        const sd = data.session_data as Record<string, any> | null;
        const serverToken = sd?.sessionToken;

        if (!storedToken || storedToken !== serverToken) {
          // Not the original device → show "already used" screen
          setStep("claimed");
          return;
        }

        // Legitimate owner — restore session
        setChildName(data.child_name);
        setChildAge(data.child_age || 6);
        if (sd?.parentSettings) {
          setParentSettings({ ...DEFAULT_PARENT_SETTINGS, ...sd.parentSettings });
        }
        setStep("sleeping");
      } else {
        setStep("onboarding");
      }
    })();
  }, [code]);

  // Listen for narration events
  useEffect(() => {
    const unsub = eventBus.on("NARRATE_STORY", (event) => {
      if (event.type === "NARRATE_STORY") {
        setPendingNarration({ storyId: event.storyId, title: event.title, text: event.text });
        setStep("active");
      }
    });
    return unsub;
  }, []);

  // Save settings to bobby_codes
  const saveToCode = async (settings?: ParentSettings) => {
    if (!bobbyCode || !code) return;
    // Preserve sessionToken when saving settings
    const tokenKey = `bobby_session_${code.toUpperCase()}`;
    const sessionToken = localStorage.getItem(tokenKey);
    await supabase
      .from("bobby_codes")
      .update({ session_data: { sessionToken, parentSettings: settings || parentSettings } as any })
      .eq("id", bobbyCode.id);
  };

  const handleOnboardingComplete = async (name: string, age: number, voice: VoiceProfile, interests: string[]) => {
    if (!bobbyCode || !code) return;

    const sessionToken = crypto.randomUUID();
    const tokenKey = `bobby_session_${code.toUpperCase()}`;

    const initialSettings: ParentSettings = {
      ...DEFAULT_PARENT_SETTINGS,
      childName: name,
      childAge: age,
      voiceType: voice as ParentSettings["voiceType"],
      enabledThemes: interests.length > 0 ? interests : DEFAULT_PARENT_SETTINGS.enabledThemes,
    };

    const { error } = await supabase
      .from("bobby_codes")
      .update({
        claimed_at: new Date().toISOString(),
        child_name: name,
        child_age: age,
        session_data: { sessionToken, parentSettings: initialSettings } as any,
      })
      .eq("id", bobbyCode.id);

    if (!error) {
      localStorage.setItem(tokenKey, sessionToken);
      setChildName(name);
      setChildAge(age);
      setParentSettings(initialSettings);
      setStep("sleeping");
    }
  };

  const updateSetting = <K extends keyof ParentSettings>(key: K, val: ParentSettings[K]) => {
    const updated = { ...parentSettings, [key]: val };
    setParentSettings(updated);
    saveToCode(updated);
  };

  // ─── Render ────────────────────────────────────────

  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF6EC]">
        <div className="text-center space-y-4">
          <div className="text-5xl">🤖</div>
          <p className="text-lg font-black text-black uppercase">Chargement…</p>
        </div>
      </div>
    );
  }

  if (step === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF6EC] p-6">
        <div className="retro-card p-8 text-center max-w-sm w-full space-y-5" style={{ backgroundColor: "white" }}>
          <div className="mx-auto w-16 h-16 border-4 border-black bg-red-100 flex items-center justify-center">
            <span className="text-4xl">❌</span>
          </div>
          <h2 className="text-xl font-black text-black uppercase">Code invalide</h2>
          <p className="text-sm font-bold text-black leading-relaxed">
            Ce QR code Bobby n'existe pas ou n'est plus valide.
          </p>
          <div className="border-4 border-black bg-amber-50 p-3 text-left space-y-1">
            <p className="text-[11px] font-black text-black uppercase">💡 Besoin d'aide ?</p>
            <p className="text-[10px] font-bold text-black">
              Vérifie que tu scannes bien le QR code fourni avec ton Bobby.
            </p>
          </div>
          <button onClick={() => navigate("/")}
            className="w-full py-3 text-[13px] font-black uppercase border-4 border-black bg-foreground text-background hover:opacity-90 transition-all"
            style={{ boxShadow: "4px 4px 0px rgba(0,0,0,0.25)" }}>
            ← Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  if (step === "claimed") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: "repeating-linear-gradient(0deg, #FDF6EC 0px, #FDF6EC 28px, #e8ddd0 28px, #e8ddd0 30px)" }}>
        <div className="w-16 h-6 bg-[var(--retro-yellow)] border-2 border-black rotate-[-3deg] mb-[-12px] z-10 opacity-80" />

        <div className="retro-card retro-card-tilt-1 p-8 text-center max-w-sm w-full space-y-5"
          style={{ backgroundColor: "var(--retro-red)" }}>
          <div className="mx-auto w-20 h-20 border-4 border-black bg-white flex items-center justify-center">
            <span className="text-5xl">🔒</span>
          </div>

          <h2 className="text-2xl font-black text-black uppercase tracking-tight leading-tight">
            Ce Bobby est<br />déjà activé !
          </h2>

          <div className="border-t-4 border-black pt-4 space-y-2">
            <p className="text-[13px] font-bold text-black/70 leading-relaxed">
              Ce Bobby a été activé <strong>définitivement</strong> sur un autre appareil. L'activation est permanente et irréversible.
            </p>
            <p className="text-[11px] font-bold text-black/50">
              Même après une réinitialisation de l'appareil, ce code ne peut plus être réutilisé.
            </p>
          </div>

          <div className="retro-card p-3 text-left space-y-2" style={{ backgroundColor: "var(--retro-yellow)" }}>
            <p className="text-[11px] font-black text-black uppercase">⚠️ Liaison permanente</p>
            <p className="text-[10px] font-bold text-black/60 leading-relaxed">
              Chaque Bobby est lié <strong>à vie</strong> à l'appareil qui l'a activé en premier. Il est impossible de le transférer, le supprimer ou le réactiver — même après une réinitialisation usine de l'appareil.
            </p>
          </div>

          <div className="retro-card p-3 text-left space-y-1.5" style={{ backgroundColor: "var(--retro-blue)" }}>
            <p className="text-[11px] font-black text-black uppercase">💡 Tu as perdu ton Bobby ?</p>
            <p className="text-[10px] font-bold text-black/60 leading-relaxed">
              Contacte le support Bobby avec ta preuve d'achat pour obtenir un nouveau code d'activation.
            </p>
          </div>

          <button
            onClick={() => navigate("/")}
            className="w-full py-3 text-[13px] font-black uppercase border-4 border-black bg-foreground text-background hover:opacity-90 transition-all"
            style={{ boxShadow: "4px 4px 0px rgba(0,0,0,0.25)" }}>
            ← Retour à l'accueil
          </button>
        </div>

        <div className="mt-6 text-center">
          <span className="text-[10px] font-black text-black/30 uppercase tracking-widest">Bobby™ — Activation unique & permanente</span>
        </div>
      </div>
    );
  }

  if (step === "onboarding") {
    return (
      <OnboardingScreen onComplete={handleOnboardingComplete} />
    );
  }

  if (step === "sleeping") {
    const bgColors: Record<string, string> = {
      "soft-blue": "#E8F0FE", "soft-pink": "#FDE8F0", "soft-green": "#E8FEF0",
      "soft-purple": "#F0E8FE", "soft-yellow": "#FEF8E8", "white": "#FFFFFF",
      "dark": "#1A1A2E", "night": "#0D1B2A",
    };
    const bgHex = bgColors[parentSettings.bobbyColors?.background || "soft-blue"] || "#E8F0FE";
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative" style={{ backgroundColor: bgHex }}>

        {/* PWA Install Banner — Android (native prompt) */}
        {canInstall && !isInstalled && showInstallBanner && (
          <div className="absolute top-4 left-4 right-4 z-50 animate-in slide-in-from-top">
            <div className="retro-card p-4 space-y-3 text-center" style={{ backgroundColor: "white" }}>
              <p className="text-sm font-black text-black uppercase">📲 Installe Bobby sur ton écran</p>
              <p className="text-xs font-bold text-black">
                Bobby s'ouvrira comme une vraie app, sans barre de recherche !
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowInstallBanner(false)}
                  className="flex-1 py-2 text-xs font-black uppercase border-4 border-black bg-white text-black"
                >
                  Plus tard
                </button>
                <button
                  onClick={async () => { await promptInstall(); setShowInstallBanner(false); }}
                  className="flex-1 py-2 text-xs font-black uppercase border-4 border-black bg-black text-white"
                  style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.25)" }}
                >
                  Installer ✨
                </button>
              </div>
            </div>
          </div>
        )}

        {/* iOS Install Guide — iOS doesn't support beforeinstallprompt */}
        {isIOS && !isInstalled && showInstallBanner && !canInstall && (
          <div className="absolute top-4 left-4 right-4 z-50 animate-in slide-in-from-top">
            <div className="retro-card p-4 space-y-2 text-center" style={{ backgroundColor: "white" }}>
              <p className="text-sm font-black text-black uppercase">📲 Installe Bobby</p>
              <p className="text-xs font-bold text-black leading-relaxed">
                Appuie sur <strong>Partager</strong> (⬆️) puis <strong>"Sur l'écran d'accueil"</strong> pour ouvrir Bobby sans barre URL.
              </p>
              <button
                onClick={() => setShowInstallBanner(false)}
                className="w-full py-2 text-xs font-black uppercase border-4 border-black bg-black text-white"
              >
                Compris 👍
              </button>
            </div>
          </div>
        )}

        <div className="w-full max-w-md aspect-square cursor-pointer" onClick={() => setStep("active")}>
          <HologramFace
            voiceState="idle"
            enableCamera={false}
            bobbyColor={parentSettings.bobbyColors?.iris || "blue"}
            bobbyColors={parentSettings.bobbyColors}
            emotionOverride="sleepy"
          />
        </div>
        <p className="text-center text-muted-foreground font-bold text-lg mt-4 animate-pulse">
          Touche Bobby pour le réveiller ! 👆
        </p>

        {isInstalled && (
          <p className="absolute bottom-4 text-xs font-bold text-black/30">✅ App installée</p>
        )}
      </div>
    );
  }

  if (step === "parent") {
    return (
      <ParentMode
        childName={childName}
        onClose={() => setStep("active")}
        parentSettings={parentSettings}
        onSettingsChange={(s) => { setParentSettings(s); saveToCode(s); }}
      />
    );
  }

  // step === "active"
  return (
    <VoiceScreen
      childName={childName}
      childAge={childAge || 6}
      onSwitchToChat={() => {}}
      onParentMode={() => setStep("parent")}
      parentSettings={parentSettings}
      pendingNarration={pendingNarration}
      onNarrationConsumed={() => setPendingNarration(null)}
    />
  );
}