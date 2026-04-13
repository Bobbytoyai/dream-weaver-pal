// ─── Bobby LCD Screen ───────────────────────────────────────
// Cette page simule l'écran LCD du jouet Bobby.
// Elle ne doit JAMAIS changer de page, afficher de loader,
// ou être interrompue. Toujours le visage de Bobby, point.
// Le Mode Parent est accessible uniquement via QR code dédié (/parent/:code).

import { useState, useEffect } from "react";
import { ParentSettings, DEFAULT_PARENT_SETTINGS } from "@/components/parentSettings";
import VoiceScreen from "@/components/VoiceScreen";

const SETTINGS_STORAGE_KEY = "bobby_parent_settings";

function loadSavedSettings(): ParentSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) return { ...DEFAULT_PARENT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_PARENT_SETTINGS;
}

const Index = () => {
  const [parentSettings, setParentSettings] = useState<ParentSettings>(loadSavedSettings);

  // Sync settings from localStorage changes (e.g. parent updated via QR page)
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
