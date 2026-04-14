import { useState, useEffect, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import RetroLoader from "@/components/RetroLoader";
import LazyImportBoundary from "@/components/LazyImportBoundary";
import { ParentSettings, DEFAULT_PARENT_SETTINGS } from "@/components/parentSettings";

const ParentMode = lazy(() => import("@/components/ParentMode"));

type Step = "loading" | "invalid" | "claimed" | "pin" | "welcome" | "active";

export default function BobbyParent() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("loading");
  const [parentCode, setParentCode] = useState<any>(null);
  const [bobbyCode, setBobbyCode] = useState<any>(null);
  const [parentSettings, setParentSettings] = useState<ParentSettings>(DEFAULT_PARENT_SETTINGS);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  // ── Load & verify QR code ──
  useEffect(() => {
    if (!code) { setStep("invalid"); return; }
    const upperCode = code.toUpperCase();
    const tokenKey = `bobby_parent_${upperCode}`;
    const welcomeKey = `bobby_parent_welcomed_${upperCode}`;

    (async () => {
      const { data: pc, error: pcErr } = await supabase
        .from("bobby_parent_codes")
        .select("*, bobby_codes(*)")
        .eq("code", upperCode)
        .maybeSingle();

      if (pcErr || !pc || !pc.is_active) { setStep("invalid"); return; }

      setParentCode(pc);
      const bc = (pc as any).bobby_codes;
      setBobbyCode(bc);

      if (bc?.session_data) {
        const sd = bc.session_data as Record<string, any>;
        if (sd.parentSettings) {
          setParentSettings({ ...DEFAULT_PARENT_SETTINGS, ...sd.parentSettings });
        }
      }

      if (!bc?.claimed_at) {
        setStep("invalid");
        return;
      }

      const isFirstTime = !pc.claimed_at;

      if (pc.claimed_at && pc.device_token) {
        const storedToken = localStorage.getItem(tokenKey);
        if (!storedToken || storedToken !== pc.device_token) {
          setStep("claimed");
          return;
        }
      } else {
        const deviceToken = crypto.randomUUID();
        await supabase
          .from("bobby_parent_codes")
          .update({ claimed_at: new Date().toISOString(), device_token: deviceToken })
          .eq("id", pc.id);
        localStorage.setItem(tokenKey, deviceToken);
      }

      // Check if we need to show welcome (first time only)
      const alreadyWelcomed = localStorage.getItem(welcomeKey);
      const hasPin = bc?.session_data?.parentSettings?.parentPin;

      if (hasPin && hasPin.length > 0) {
        setStep("pin");
      } else if (isFirstTime && !alreadyWelcomed) {
        localStorage.setItem(welcomeKey, "1");
        setStep("welcome");
      } else {
        setStep("active");
      }
    })();
  }, [code]);

  // ── PIN verification ──
  const handlePinSubmit = () => {
    const savedPin = parentSettings.parentPin;
    if (!savedPin || savedPin === "" || pinInput === savedPin) {
      setStep("active");
    } else {
      setPinError(true);
      setPinInput("");
      setTimeout(() => setPinError(false), 2000);
    }
  };

  // ── Save settings back to bobby_codes ──
  const handleSettingsChange = async (settings: ParentSettings) => {
    setParentSettings(settings);
    if (bobbyCode) {
      const sd = (bobbyCode.session_data as Record<string, any>) || {};
      await supabase
        .from("bobby_codes")
        .update({ session_data: { ...sd, parentSettings: settings } as any })
        .eq("id", bobbyCode.id);
    }
  };

  // ═══ RENDERS ═══

  if (step === "loading") {
    return <RetroLoader message="Vérification…" />;
  }

  if (step === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <div className="w-full max-w-sm border-4 border-foreground bg-white p-8 text-center space-y-4"
          style={{ boxShadow: "6px 6px 0 hsl(var(--foreground)/0.2)" }}>
          <span className="text-5xl block">❌</span>
          <h2 className="text-xl font-black text-black uppercase">Code parent invalide</h2>
          <p className="text-sm font-bold text-muted-foreground">
            Ce QR code parent n'existe pas, n'est plus actif, ou le Bobby associé n'a pas encore été activé.
          </p>
          <button onClick={() => navigate("/")}
            className="w-full py-3 text-sm font-black uppercase border-4 border-foreground bg-primary text-primary-foreground hover:opacity-90 transition-all"
            style={{ boxShadow: "4px 4px 0 rgba(0,0,0,0.25)" }}>
            ← Retour
          </button>
        </div>
      </div>
    );
  }

  if (step === "claimed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 p-6">
        <div className="w-full max-w-sm border-4 border-foreground bg-white p-8 text-center space-y-5"
          style={{ boxShadow: "6px 6px 0 hsl(var(--foreground)/0.2)" }}>
          <div className="mx-auto w-20 h-20 border-4 border-foreground bg-orange-100 flex items-center justify-center rounded-xl">
            <span className="text-5xl">🔒</span>
          </div>
          <h2 className="text-xl font-black text-black uppercase leading-tight">
            Accès parent déjà lié
          </h2>
          <p className="text-[13px] font-bold text-muted-foreground leading-relaxed">
            Ce code parent est <strong>définitivement lié</strong> à un autre appareil.
            Pour des raisons de sécurité, le Mode Parent est accessible uniquement depuis l'appareil qui l'a activé en premier.
          </p>
          <div className="border-4 border-foreground bg-amber-50 p-3 text-left space-y-1 rounded-lg">
            <p className="text-[11px] font-black text-black uppercase">💡 Besoin d'aide ?</p>
            <p className="text-[10px] font-bold text-muted-foreground">
              Contacte le support Bobby avec ta preuve d'achat pour obtenir un nouveau code parent.
            </p>
          </div>
          <button onClick={() => navigate("/")}
            className="w-full py-3 text-sm font-black uppercase border-4 border-foreground bg-primary text-primary-foreground hover:opacity-90 transition-all"
            style={{ boxShadow: "4px 4px 0 rgba(0,0,0,0.25)" }}>
            ← Retour
          </button>
        </div>
      </div>
    );
  }

  if (step === "welcome") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-6">
        <div className="w-full max-w-sm border-4 border-foreground bg-white p-8 text-center space-y-5"
          style={{ boxShadow: "6px 6px 0 hsl(var(--foreground)/0.2)" }}>
          <span className="text-5xl block">👋</span>
          <h2 className="text-xl font-black text-black uppercase">Bienvenue, Parent !</h2>
          <p className="text-sm font-bold text-muted-foreground">
            Appareil lié avec succès. Accédez au tableau de bord de {bobbyCode?.child_name || "votre enfant"}.
          </p>
          <button onClick={() => setStep("active")}
            className="w-full py-3 text-sm font-black uppercase border-4 border-foreground bg-primary text-primary-foreground hover:opacity-90 transition-all"
            style={{ boxShadow: "4px 4px 0 rgba(0,0,0,0.25)" }}>
            Accéder au Mode Parent →
          </button>
        </div>
      </div>
    );
  }

  if (step === "pin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
        <div className="w-full max-w-sm border-4 border-foreground bg-white p-8 text-center space-y-5"
          style={{ boxShadow: "6px 6px 0 hsl(var(--foreground)/0.2)" }}>
          <span className="text-5xl block">🔐</span>
          <h2 className="text-xl font-black text-black uppercase">Code PIN Parent</h2>
          <p className="text-sm font-bold text-muted-foreground">
            Entrez votre code PIN pour accéder au Mode Parent.
          </p>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pinInput}
            onChange={e => setPinInput(e.target.value.replace(/\D/g, ""))}
            placeholder="••••"
            autoFocus
            className={`w-full px-4 py-3 text-2xl font-black text-center tracking-[0.5em] border-4 bg-white outline-none ${
              pinError ? "border-destructive" : "border-foreground"
            }`}
            onKeyDown={e => { if (e.key === "Enter") handlePinSubmit(); }}
          />
          {pinError && (
            <p className="text-destructive text-sm font-black">
              ❌ Code PIN incorrect
            </p>
          )}
          <button onClick={handlePinSubmit}
            disabled={pinInput.length === 0}
            className="w-full py-3 text-sm font-black uppercase border-4 border-foreground bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-40"
            style={{ boxShadow: "4px 4px 0 rgba(0,0,0,0.25)" }}>
            Valider →
          </button>
        </div>
      </div>
    );
  }

  // step === "active"
  return (
    <LazyImportBoundary label="Mode Parent">
      <Suspense fallback={<RetroLoader message="Mode parent…" />}>
        <ParentMode
          childName={bobbyCode?.child_name || "Mon ami"}
          onClose={() => navigate("/")}
          parentSettings={parentSettings}
          onSettingsChange={handleSettingsChange}
        />
      </Suspense>
    </LazyImportBoundary>
  );
}
