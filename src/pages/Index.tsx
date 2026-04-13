// ─── Bobby LCD Screen ───────────────────────────────────────
// Cette page simule l'écran LCD du jouet Bobby.
// Elle ne doit JAMAIS changer de page, afficher de loader,
// ou être interrompue. Toujours le visage de Bobby, point.
// Le Mode Parent est accessible uniquement via QR code dédié (/parent/:code).

import { useState, useEffect } from "react";
import { ParentSettings, DEFAULT_PARENT_SETTINGS } from "@/components/parentSettings";
import { supabase } from "@/integrations/supabase/client";
import VoiceScreen from "@/components/VoiceScreen";

const SETTINGS_STORAGE_KEY = "bobby_parent_settings";
const BOBBY_CODE_KEY = "bobby_lcd_code_id";

function loadSavedSettings(): ParentSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) return { ...DEFAULT_PARENT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_PARENT_SETTINGS;
}

const Index = () => {
  const [parentSettings, setParentSettings] = useState<ParentSettings>(loadSavedSettings);

  // ── Bind this LCD to a bobby_code for realtime sync ──
  useEffect(() => {
    // Try to find the bobby code this device is linked to
    const findLinkedCode = async () => {
      let codeId = localStorage.getItem(BOBBY_CODE_KEY);

      if (!codeId) {
        // Find any claimed bobby code (for dev, grab the first one with session_data)
        const { data } = await supabase
          .from("bobby_codes")
          .select("id, session_data")
          .not("claimed_at", "is", null)
          .limit(1)
          .maybeSingle();

        if (data) {
          codeId = data.id;
          localStorage.setItem(BOBBY_CODE_KEY, codeId);

          // Load initial settings from DB
          const sd = data.session_data as Record<string, any> | null;
          if (sd?.parentSettings) {
            const merged = { ...DEFAULT_PARENT_SETTINGS, ...sd.parentSettings };
            setParentSettings(merged);
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
          }
        }
      }

      if (!codeId) return;

      // ── Subscribe to realtime changes on this bobby_code ──
      const channel = supabase
        .channel(`lcd-sync-${codeId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "bobby_codes",
            filter: `id=eq.${codeId}`,
          },
          (payload) => {
            const sd = payload.new.session_data as Record<string, any> | null;
            if (sd?.parentSettings) {
              const merged = { ...DEFAULT_PARENT_SETTINGS, ...sd.parentSettings };
              setParentSettings(merged);
              localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
              console.log("[LCD] ⚡ Realtime sync — settings updated from parent");
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    findLinkedCode();
  }, []);

  // Also keep localStorage sync for same-device tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SETTINGS_STORAGE_KEY && e.newValue) {
        try { setParentSettings({ ...DEFAULT_PARENT_SETTINGS, ...JSON.parse(e.newValue) }); } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <VoiceScreen
      childName={parentSettings.childName}
      childAge={parentSettings.childAge}
      onSwitchToChat={() => {}}
      onParentMode={() => {}}
      parentSettings={parentSettings}
    />
  );
};

export default Index;
