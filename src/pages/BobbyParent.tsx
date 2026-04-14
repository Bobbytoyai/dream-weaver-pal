import { useState, useEffect, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import RetroLoader from "@/components/RetroLoader";
import LazyImportBoundary from "@/components/LazyImportBoundary";
import { ParentSettings, DEFAULT_PARENT_SETTINGS } from "@/components/parentSettings";
import ParentOnboarding from "@/components/parent/ParentOnboarding";
import InvalidScreen from "@/components/parent/screens/InvalidScreen";
import NotActivatedScreen from "@/components/parent/screens/NotActivatedScreen";
import ClaimedScreen from "@/components/parent/screens/ClaimedScreen";
import PinScreen from "@/components/parent/screens/PinScreen";

const ParentMode = lazy(() => import("@/components/ParentMode"));

type Step = "loading" | "invalid" | "not_activated" | "claimed" | "pin" | "onboarding" | "active";

export default function BobbyParent() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("loading");
  const [parentCode, setParentCode] = useState<any>(null);
  const [bobbyCode, setBobbyCode] = useState<any>(null);
  const [parentSettings, setParentSettings] = useState<ParentSettings>(DEFAULT_PARENT_SETTINGS);

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
        setStep("not_activated");
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

      const alreadyWelcomed = localStorage.getItem(welcomeKey);
      const hasPin = bc?.session_data?.parentSettings?.parentPin;

      if (hasPin && hasPin.length > 0) {
        setStep("pin");
      } else if (isFirstTime && !alreadyWelcomed) {
        localStorage.setItem(welcomeKey, "1");
        setStep("onboarding");
      } else {
        setStep("active");
      }
    })();
  }, [code]);

  // ── Save settings back to bobby_codes via security definer function ──
  const handleSettingsChange = async (settings: ParentSettings) => {
    setParentSettings(settings);
    if (bobbyCode) {
      // Fetch fresh session_data to avoid overwriting other fields
      const { data: fresh, error: fetchErr } = await supabase
        .from("bobby_codes")
        .select("session_data")
        .eq("id", bobbyCode.id)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      const sd = (fresh?.session_data as Record<string, any>) || {};
      const newData = { ...sd, parentSettings: settings };
      const { error: rpcErr } = await supabase.rpc("update_bobby_session_data" as any, {
        p_bobby_code: bobbyCode.code,
        p_session_data: newData,
      });
      if (rpcErr) throw rpcErr;
    }
  };

  if (step === "loading") return <RetroLoader message="Vérification…" />;
  if (step === "invalid") return <InvalidScreen />;
  if (step === "not_activated") return <NotActivatedScreen />;
  if (step === "claimed") return <ClaimedScreen />;

  if (step === "pin") {
    return <PinScreen savedPin={parentSettings.parentPin || ""} onSuccess={() => setStep("active")} />;
  }

  if (step === "onboarding") {
    const handleOnboardingComplete = async (newChildName: string, newPin: string, newPersonality: ParentSettings["personality"]) => {
      const updatedSettings: ParentSettings = {
        ...parentSettings,
        childName: newChildName,
        parentPin: newPin,
        personality: newPersonality,
      };
      await handleSettingsChange(updatedSettings);

      if (bobbyCode && newChildName !== bobbyCode.child_name) {
        await supabase.rpc("update_bobby_child_name" as any, {
          p_bobby_code: bobbyCode.code,
          p_child_name: newChildName,
        });
      }

      setStep("active");
    };

    return (
      <ParentOnboarding
        currentChildName={bobbyCode?.child_name || "Mon ami"}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  return (
    <LazyImportBoundary label="Mode Parent">
      <Suspense fallback={<RetroLoader message="Mode parent…" />}>
        <ParentMode
          childName={bobbyCode?.child_name || "Mon ami"}
          bobbyCodeId={bobbyCode?.id}
          onClose={() => navigate("/")}
          parentSettings={parentSettings}
          onSettingsChange={handleSettingsChange}
        />
      </Suspense>
    </LazyImportBoundary>
  );
}
