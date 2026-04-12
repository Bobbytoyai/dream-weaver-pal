import { useState, useEffect, useRef } from "react";
import VoiceScreen from "@/components/VoiceScreen";
import StoryMode from "@/components/StoryMode";
import ContentCategories from "@/components/ContentCategories";
import ParentMode from "@/components/ParentMode";
import OnboardingScreen from "@/components/OnboardingScreen";
import type { PendingNarration } from "@/hooks/useConversationStateMachine";

import { ParentSettings, DEFAULT_PARENT_SETTINGS } from "@/components/parentSettings";
import { useChildMemory } from "@/hooks/useChildMemory";
import { eventBus } from "@/lib/eventBus";

const PROFILE_KEY = "bobby_child_profile";

function loadProfile(): { name: string; age: number } | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.name && parsed?.age) return parsed;
  } catch { /* ignore */ }
  return null;
}

function saveProfile(name: string, age: number) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ name, age }));
}

const Index = () => {
  const [profile, setProfile] = useState<{ name: string; age: number } | null>(loadProfile);
  const [mode, setMode] = useState<"voice" | "story" | "parent" | "activities">("voice");
  const [pendingNarration, setPendingNarration] = useState<PendingNarration | null>(null);
  const [activeGameCategory, setActiveGameCategory] = useState<string | null>(null);
  const [parentSettings, setParentSettings] = useState<ParentSettings>(() => {
    const saved = loadProfile();
    return {
      ...DEFAULT_PARENT_SETTINGS,
      ...(saved ? { childName: saved.name, childAge: saved.age } : {}),
    };
  });

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
        // Switch to voice mode (home screen)
        setMode("voice");
      }
    });
    return unsub;
  }, []);

  // Restore parent settings from memory on load
  // CRITICAL: localStorage profile is the ONLY source of truth for childName/childAge
  // The DB may contain stale names from old sessions — never trust it for the name.
  useEffect(() => {
    if (!memory?.preferences?.parentSettings) return;
    try {
      const saved = memory.preferences.parentSettings as Record<string, unknown>;
      const localProfile = loadProfile();
      // Strip childName/childAge from DB settings — only use non-identity fields
      const { childName: _dbName, childAge: _dbAge, ...safeSettings } = saved;
      setParentSettings((prev) => ({
        ...prev,
        ...safeSettings,
        // localStorage profile ALWAYS wins — never overwritten by DB
        childName: localProfile?.name ?? prev.childName,
        childAge: localProfile?.age ?? prev.childAge,
      }));
    } catch { /* ignore */ }
  }, [memory]);

  const handleOnboardingComplete = (name: string, age: number, voice?: string, interests?: string[]) => {
    saveProfile(name, age);
    setProfile({ name, age });
    const voiceType = (voice === "child" ? "child" : voice === "male" ? "male" : "female") as ParentSettings["voiceType"];
    setParentSettings((prev) => ({
      ...prev,
      childName: name,
      childAge: age,
      voiceType,
      ...(interests?.length ? { enabledThemes: interests } : {}),
    }));
  };

  const handleSettingsChange = (settings: ParentSettings) => {
    setParentSettings(settings);
    saveProfile(settings.childName, settings.childAge);
    saveSettings({ parentSettings: settings });
  };

  // Show onboarding if no profile saved
  if (!profile) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

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
