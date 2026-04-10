import { useState, useEffect } from "react";
import VoiceScreen from "@/components/VoiceScreen";
import StoryMode from "@/components/StoryMode";
import ParentMode from "@/components/ParentMode";
import { ParentSettings, DEFAULT_PARENT_SETTINGS } from "@/components/parentSettings";
import { useChildMemory } from "@/hooks/useChildMemory";

const Index = () => {
  const [mode, setMode] = useState<"voice" | "story" | "parent">("voice");
  const [parentSettings, setParentSettings] = useState<ParentSettings>(DEFAULT_PARENT_SETTINGS);

  const childName = parentSettings.childName || "Bobby";
  const childAge = parentSettings.childAge || 7;

  const { memory, loading, saveSettings } = useChildMemory(childName);

  // Restore parent settings from memory on load
  useEffect(() => {
    if (!memory?.preferences?.parentSettings) return;
    try {
      const saved = memory.preferences.parentSettings as Record<string, unknown>;
      setParentSettings((prev) => ({ ...prev, ...saved }));
    } catch { /* ignore */ }
  }, [memory]);

  const handleSettingsChange = (settings: ParentSettings) => {
    setParentSettings(settings);
    saveSettings({ parentSettings: settings });
  };

  if (mode === "parent") {
    return (
      <ParentMode
        childName={childName}
        onClose={() => setMode("voice")}
        parentSettings={parentSettings}
        onSettingsChange={handleSettingsChange}
      />
    );
  }

  if (mode === "story") {
    return (
      <StoryMode
        childName={childName}
        childAge={childAge}
        onBack={() => setMode("voice")}
        parentSettings={parentSettings}
        onParentMode={() => setMode("parent")}
      />
    );
  }

  return (
    <VoiceScreen
      childName={childName}
      childAge={childAge}
      onSwitchToChat={() => {}}
      onSwitchToStory={() => setMode("story")}
      onParentMode={() => setMode("parent")}
      parentSettings={parentSettings}
    />
  );
};

export default Index;
