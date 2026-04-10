import { useState, useEffect } from "react";
import VoiceScreen from "@/components/VoiceScreen";
import ParentMode, { ParentSettings, DEFAULT_PARENT_SETTINGS } from "@/components/ParentMode";
import { useChildMemory } from "@/hooks/useChildMemory";

const CHILD_NAME = "Buddy";
const CHILD_AGE = 7;

const Index = () => {
  const [mode, setMode] = useState<"voice" | "parent">("voice");
  const [parentSettings, setParentSettings] = useState<ParentSettings>(DEFAULT_PARENT_SETTINGS);
  const { memory, loading, saveSettings } = useChildMemory(CHILD_NAME);

  // Restore parent settings from memory on load
  useEffect(() => {
    if (!memory?.preferences?.parentSettings) return;
    try {
      const saved = memory.preferences.parentSettings as Record<string, unknown>;
      setParentSettings((prev) => ({ ...prev, ...saved }));
    } catch { /* ignore */ }
  }, [memory]);

  // Persist parent settings to memory on change
  const handleSettingsChange = (settings: ParentSettings) => {
    setParentSettings(settings);
    saveSettings({ parentSettings: settings });
  };

  if (mode === "parent") {
    return (
      <ParentMode
        childName={CHILD_NAME}
        onClose={() => setMode("voice")}
        parentSettings={parentSettings}
        onSettingsChange={handleSettingsChange}
      />
    );
  }

  return (
    <VoiceScreen
      childName={CHILD_NAME}
      childAge={CHILD_AGE}
      onSwitchToChat={() => {}}
      onParentMode={() => setMode("parent")}
      parentSettings={parentSettings}
    />
  );
};

export default Index;
