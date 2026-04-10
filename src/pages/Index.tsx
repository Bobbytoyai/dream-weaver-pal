import { useState } from "react";
import OnboardingScreen from "@/components/OnboardingScreen";
import ChatScreen from "@/components/ChatScreen";
import VoiceScreen from "@/components/VoiceScreen";
import ParentMode, { ParentSettings, DEFAULT_PARENT_SETTINGS } from "@/components/ParentMode";

const Index = () => {
  const [profile, setProfile] = useState<{ name: string; age: number } | null>(null);
  const [mode, setMode] = useState<"chat" | "voice" | "parent">("voice");
  const [parentSettings, setParentSettings] = useState<ParentSettings>(DEFAULT_PARENT_SETTINGS);

  if (!profile) {
    return <OnboardingScreen onComplete={(name, age) => setProfile({ name, age })} />;
  }

  if (mode === "parent") {
    return (
      <ParentMode
        childName={profile.name}
        onClose={() => setMode("voice")}
        parentSettings={parentSettings}
        onSettingsChange={setParentSettings}
      />
    );
  }

  if (mode === "voice") {
    return (
      <VoiceScreen
        childName={profile.name}
        childAge={profile.age}
        onSwitchToChat={() => setMode("chat")}
        onParentMode={() => setMode("parent")}
        parentSettings={parentSettings}
      />
    );
  }

  return (
    <ChatScreen
      childName={profile.name}
      childAge={profile.age}
      onSwitchToVoice={() => setMode("voice")}
    />
  );
};

export default Index;
