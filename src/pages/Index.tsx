import { useState, useEffect } from "react";
import VoiceScreen from "@/components/VoiceScreen";
import StoryMode from "@/components/StoryMode";
import ContentCategories from "@/components/ContentCategories";
import ParentMode from "@/components/ParentMode";
import type { PendingNarration } from "@/hooks/useConversationStateMachine";

import { ParentSettings, DEFAULT_PARENT_SETTINGS } from "@/components/parentSettings";
import { useChildMemory } from "@/hooks/useChildMemory";
import { eventBus } from "@/lib/eventBus";

const Index = () => {
  const [mode, setMode] = useState<"voice" | "story" | "parent" | "activities">("voice");
  const [pendingNarration, setPendingNarration] = useState<PendingNarration | null>(null);
  const [activeGameCategory, setActiveGameCategory] = useState<string | null>(null);
  const [parentSettings, setParentSettings] = useState<ParentSettings>(DEFAULT_PARENT_SETTINGS);

  const childName = parentSettings.childName;
  const childAge = parentSettings.childAge;

  const { memory, loading, saveSettings } = useChildMemory(childName);

  // Listen for NARRATE_STORY events from StoryLibrary
  useEffect(() => {
    const unsub = eventBus.on("NARRATE_STORY", (event) => {
      if (event.type === "NARRATE_STORY") {
        setPendingNarration({
          storyId: event.storyId,
          title: event.title,
          text: event.text,
        });
        setMode("voice");
      }
    });
    return unsub;
  }, []);

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

  if (mode === "activities") {
    return (
      <ContentCategories
        childName={childName}
        voiceProfile={parentSettings.voiceType || "female"}
        onSelectCategory={(cat) => {
          setActiveGameCategory(cat);
          setMode("voice");
        }}
        onBack={() => setMode("voice")}
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
      activeGameCategory={activeGameCategory}
      onClearGame={() => setActiveGameCategory(null)}
      pendingNarration={pendingNarration}
      onNarrationConsumed={() => setPendingNarration(null)}
    />
  );
};

export default Index;
