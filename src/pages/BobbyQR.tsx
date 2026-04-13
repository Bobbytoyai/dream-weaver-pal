import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import VoiceScreen from "@/components/VoiceScreen";
import ParentMode from "@/components/ParentMode";
import { ParentSettings, DEFAULT_PARENT_SETTINGS } from "@/components/parentSettings";
import { HologramFace } from "@/components/hologram/HologramFace";
import type { PendingNarration } from "@/hooks/useConversationStateMachine";
import { eventBus } from "@/lib/eventBus";

type Step = "loading" | "invalid" | "claimed" | "onboarding-name" | "onboarding-age" | "sleeping" | "active" | "parent";

export default function BobbyQR() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("loading");
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState<number | null>(null);
  const [bobbyCode, setBobbyCode] = useState<any>(null);
  const [pendingNarration, setPendingNarration] = useState<PendingNarration | null>(null);
  const [parentSettings, setParentSettings] = useState<ParentSettings>(DEFAULT_PARENT_SETTINGS);

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
        setStep("onboarding-name");
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
    if (!bobbyCode) return;
    await supabase
      .from("bobby_codes")
      .update({ session_data: { parentSettings: settings || parentSettings } as any })
      .eq("id", bobbyCode.id);
  };

  const claimCode = async () => {
    if (!bobbyCode || !childName.trim() || !childAge || !code) return;

    // Generate a unique session token for anti-piracy
    const sessionToken = crypto.randomUUID();
    const tokenKey = `bobby_session_${code.toUpperCase()}`;

    const { error } = await supabase
      .from("bobby_codes")
      .update({
        claimed_at: new Date().toISOString(),
        child_name: childName.trim(),
        child_age: childAge,
        session_data: { sessionToken } as any,
      })
      .eq("id", bobbyCode.id);

    if (!error) {
      // Store token on this device so only this device can re-access
      localStorage.setItem(tokenKey, sessionToken);
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
          <div className="text-5xl animate-bounce">🤖</div>
          <p className="text-lg font-black text-foreground uppercase">Chargement…</p>
        </div>
      </div>
    );
  }

  if (step === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF6EC] p-6">
        <div className="retro-card p-8 text-center max-w-sm space-y-4" style={{ backgroundColor: "var(--retro-red)" }}>
          <span className="text-5xl">❌</span>
          <h2 className="text-xl font-black text-foreground uppercase">Code invalide</h2>
          <p className="text-sm font-bold text-foreground/70">Ce QR code Bobby n'existe pas ou n'est plus valide.</p>
        </div>
      </div>
    );
  }

  if (step === "claimed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF6EC] p-6">
        <div className="retro-card p-8 text-center max-w-sm space-y-4" style={{ backgroundColor: "var(--retro-yellow)" }}>
          <span className="text-5xl">🔒</span>
          <h2 className="text-xl font-black text-foreground uppercase">Déjà utilisé</h2>
          <p className="text-sm font-bold text-foreground/70">Ce Bobby a déjà été activé par quelqu'un d'autre.</p>
        </div>
      </div>
    );
  }

  if (step === "onboarding-name") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF6EC] p-6">
        <div className="retro-card p-8 max-w-sm w-full space-y-6 text-center" style={{ backgroundColor: "var(--retro-blue)" }}>
          <span className="text-6xl block">🤖</span>
          <h2 className="text-2xl font-black text-foreground uppercase">Salut ! Je suis Bobby</h2>
          <p className="text-sm font-bold text-foreground/70">Comment tu t'appelles ?</p>
          <input
            type="text"
            value={childName}
            onChange={e => setChildName(e.target.value)}
            placeholder="Ton prénom…"
            autoFocus
            className="w-full px-4 py-3 text-lg font-black text-center border-4 border-black bg-white outline-none focus:ring-2 focus:ring-foreground/20"
            onKeyDown={e => { if (e.key === "Enter" && childName.trim()) setStep("onboarding-age"); }}
          />
          <button
            onClick={() => childName.trim() && setStep("onboarding-age")}
            disabled={!childName.trim()}
            className="w-full py-3 text-sm font-black uppercase border-4 border-black bg-foreground text-background hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
            style={{ boxShadow: "4px 4px 0px rgba(0,0,0,0.25)" }}
          >
            Suivant →
          </button>
        </div>
      </div>
    );
  }

  if (step === "onboarding-age") {
    const ages = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF6EC] p-6">
        <div className="retro-card p-8 max-w-sm w-full space-y-6 text-center" style={{ backgroundColor: "var(--retro-green)" }}>
          <span className="text-5xl block">🎂</span>
          <h2 className="text-xl font-black text-foreground uppercase">Super {childName} !</h2>
          <p className="text-sm font-bold text-foreground/70">Tu as quel âge ?</p>
          <div className="grid grid-cols-5 gap-2">
            {ages.map(a => (
              <button
                key={a}
                onClick={() => setChildAge(a)}
                className={`aspect-square flex items-center justify-center text-lg font-black border-4 border-black transition-all active:scale-90 ${
                  childAge === a
                    ? "bg-foreground text-background scale-110"
                    : "bg-white text-foreground hover:bg-[var(--retro-yellow)]"
                }`}
                style={{ boxShadow: childAge === a ? "3px 3px 0px rgba(0,0,0,0.25)" : "1px 1px 0px rgba(0,0,0,0.1)" }}
              >
                {a}
              </button>
            ))}
          </div>
          <button
            onClick={claimCode}
            disabled={!childAge}
            className="w-full py-3 text-sm font-black uppercase border-4 border-black bg-foreground text-background hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
            style={{ boxShadow: "4px 4px 0px rgba(0,0,0,0.25)" }}
          >
            C'est parti ! 🚀
          </button>
        </div>
      </div>
    );
  }

  if (step === "sleeping") {
    const bgColors: Record<string, string> = {
      "soft-blue": "#E8F0FE", "soft-pink": "#FDE8F0", "soft-green": "#E8FEF0",
      "soft-purple": "#F0E8FE", "soft-yellow": "#FEF8E8", "white": "#FFFFFF",
      "dark": "#1A1A2E", "night": "#0D1B2A",
    };
    const bgHex = bgColors[parentSettings.bobbyColors?.background || "soft-blue"] || "#E8F0FE";

    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative" style={{ backgroundColor: bgHex }}>
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