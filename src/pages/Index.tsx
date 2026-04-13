import { useState, useEffect, lazy, Suspense } from "react";
import RetroLoader from "@/components/RetroLoader";
import type { PendingNarration } from "@/hooks/useConversationStateMachine";

import { ParentSettings, DEFAULT_PARENT_SETTINGS } from "@/components/parentSettings";
import { useChildMemory } from "@/hooks/useChildMemory";
import { eventBus } from "@/lib/eventBus";

const VoiceScreen = lazy(() => import("@/components/VoiceScreen"));
const StoryMode = lazy(() => import("@/components/StoryMode"));
const ContentCategories = lazy(() => import("@/components/ContentCategories"));
const ParentMode = lazy(() => import("@/components/ParentMode"));

const SETTINGS_STORAGE_KEY = "bobby_parent_settings";

function loadSavedSettings(): ParentSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return { ...DEFAULT_PARENT_SETTINGS, ...saved };
    }
  } catch {}
  return DEFAULT_PARENT_SETTINGS;
}

const Index = () => {
  const [mode, setMode] = useState<"voice" | "story" | "parent" | "activities">("voice");
  const [pendingNarration, setPendingNarration] = useState<PendingNarration | null>(null);
  const [activeGameCategory, setActiveGameCategory] = useState<string | null>(null);
  const [parentSettings, setParentSettings] = useState<ParentSettings>(loadSavedSettings);

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

  // Restore from cloud memory ONLY if localStorage has no settings (first visit / new device)
  // localStorage is the source of truth; cloud is backup for cross-device sync
  useEffect(() => {
    if (!memory?.preferences?.parentSettings) return;
    const hasLocalSettings = !!localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (hasLocalSettings) {
      // Local exists → push local to cloud (local is truth)
      const localSettings = loadSavedSettings();
      saveSettings({ parentSettings: localSettings });
      return;
    }
    // No local settings → restore from cloud (new device)
    try {
      const saved = memory.preferences.parentSettings as Record<string, unknown>;
      setParentSettings((prev) => {
        const merged = { ...DEFAULT_PARENT_SETTINGS, ...saved };
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      });
    } catch { /* ignore */ }
  }, [memory, saveSettings]);

  const handleSettingsChange = (settings: ParentSettings) => {
    setParentSettings(settings);
    // Persist immediately to localStorage (reliable, instant)
    try { localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings)); } catch {}
    // Also sync to cloud memory (async)
    saveSettings({ parentSettings: settings });
  };

  if (mode === "parent") {
    return (
      <Suspense fallback={<RetroLoader message="Mode parent…" />}>
        <ParentMode
          childName={childName}
          onClose={() => setMode("voice")}
          parentSettings={parentSettings}
          onSettingsChange={handleSettingsChange}
        />
      </Suspense>
    );
  }

  if (mode === "activities") {
    return (
      <Suspense fallback={<RetroLoader message="Activités…" />}>
        <ContentCategories
          childName={childName}
          voiceProfile={parentSettings.voiceType || "female"}
          onSelectCategory={(cat) => {
            setActiveGameCategory(cat);
            setMode("voice");
          }}
          onBack={() => setMode("voice")}
        />
      </Suspense>
    );
  }

  if (mode === "story") {
    return (
      <Suspense fallback={<RetroLoader message="Histoire…" />}>
        <StoryMode
          childName={childName}
          childAge={childAge}
          onBack={() => setMode("voice")}
          parentSettings={parentSettings}
          onParentMode={() => setMode("parent")}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<RetroLoader />}>
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
    </Suspense>
  );
};

export default Index;
