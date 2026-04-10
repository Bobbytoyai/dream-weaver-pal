import { useState, useEffect } from "react";
import VoiceScreen from "@/components/VoiceScreen";
import StoryMode from "@/components/StoryMode";
import ParentMode from "@/components/ParentMode";
import OnboardingScreen from "@/components/OnboardingScreen";
import { ParentSettings, DEFAULT_PARENT_SETTINGS } from "@/components/parentSettings";
import { useChildMemory } from "@/hooks/useChildMemory";

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
  const [mode, setMode] = useState<"voice" | "story" | "parent">("voice");
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

  // Restore parent settings from memory on load
  useEffect(() => {
    if (!memory?.preferences?.parentSettings) return;
    try {
      const saved = memory.preferences.parentSettings as Record<string, unknown>;
      setParentSettings((prev) => ({ ...prev, ...saved }));
    } catch { /* ignore */ }
  }, [memory]);

  const handleOnboardingComplete = (name: string, age: number) => {
    saveProfile(name, age);
    setProfile({ name, age });
    setParentSettings((prev) => ({ ...prev, childName: name, childAge: age }));
  };

  const handleSettingsChange = (settings: ParentSettings) => {
    setParentSettings(settings);
    // Also update persisted profile when parent changes name/age
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
