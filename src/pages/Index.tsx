import { useState } from "react";
import OnboardingScreen from "@/components/OnboardingScreen";
import ChatScreen from "@/components/ChatScreen";
import VoiceScreen from "@/components/VoiceScreen";

const Index = () => {
  const [profile, setProfile] = useState<{ name: string; age: number } | null>(null);
  const [mode, setMode] = useState<"chat" | "voice">("voice");

  if (!profile) {
    return <OnboardingScreen onComplete={(name, age) => setProfile({ name, age })} />;
  }

  if (mode === "voice") {
    return (
      <VoiceScreen
        childName={profile.name}
        childAge={profile.age}
        onSwitchToChat={() => setMode("chat")}
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
