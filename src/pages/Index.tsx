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
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const bindToCode = async (codeId: string) => {
      if (cancelled) return;
      localStorage.setItem(BOBBY_CODE_KEY, codeId);

      // Load initial settings
      const { data } = await supabase
        .from("bobby_codes")
        .select("session_data")
        .eq("id", codeId)
        .maybeSingle();

      if (cancelled) return;
      const sd = data?.session_data as Record<string, any> | null;
      if (sd?.parentSettings) {
        const merged = { ...DEFAULT_PARENT_SETTINGS, ...sd.parentSettings };
        setParentSettings(merged);
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
      }

      // Subscribe to realtime changes
      channel = supabase
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
              console.log("[LCD] ⚡ Realtime sync — settings updated");
            }
          }
        )
        .subscribe();
    };

    const init = async () => {
      // 1. Check localStorage first
      const savedId = localStorage.getItem(BOBBY_CODE_KEY);
      if (savedId) {
        await bindToCode(savedId);
        return;
      }

      // 2. Find any claimed bobby_code
      const { data } = await supabase
        .from("bobby_codes")
        .select("id")
        .not("claimed_at", "is", null)
        .limit(1)
        .maybeSingle();

      if (data) {
        await bindToCode(data.id);
        return;
      }

      // 3. No claimed code yet — poll every 3s until one appears
      const poll = setInterval(async () => {
        if (cancelled) { clearInterval(poll); return; }
        const { data } = await supabase
          .from("bobby_codes")
          .select("id")
          .not("claimed_at", "is", null)
          .limit(1)
          .maybeSingle();
        if (data) {
          clearInterval(poll);
          await bindToCode(data.id);
        }
      }, 3000);
    };

    init();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
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
