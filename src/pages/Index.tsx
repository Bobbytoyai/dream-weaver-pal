import { useState, useEffect } from "react";
import VoiceScreen from "@/components/VoiceScreen";
import StoryMode from "@/components/StoryMode";
import ParentMode, { ParentSettings, DEFAULT_PARENT_SETTINGS } from "@/components/ParentMode";
import { useChildMemory } from "@/hooks/useChildMemory";

const CHILD_NAME = "Bobby";

const Index = () => {
  const [mode, setMode] = useState<"voice" | "story" | "parent">("voice");
  const [parentSettings, setParentSettings] = useState<ParentSettings>(DEFAULT_PARENT_SETTINGS);
  const { memory, loading, saveSettings } = useChildMemory(CHILD_NAME);

  const childAge = parentSettings.childAge || 7;

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
        childName={CHILD_NAME}
        onClose={() => setMode("voice")}
        parentSettings={parentSettings}
        onSettingsChange={handleSettingsChange}
      />
    );
  }

  if (mode === "story") {
    return (
      <StoryMode
        childName={CHILD_NAME}
        childAge={childAge}
        onBack={() => setMode("voice")}
        parentSettings={parentSettings}
        onParentMode={() => setMode("parent")}
      />
    );
  }

  return (
    <VoiceScreen
      childName={CHILD_NAME}
      childAge={childAge}
      onSwitchToChat={() => {}}
      onSwitchToStory={() => setMode("story")}
      onParentMode={() => setMode("parent")}
      parentSettings={parentSettings}
    />
  );
};

export default Index;
