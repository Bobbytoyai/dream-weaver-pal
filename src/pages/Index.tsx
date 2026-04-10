import { useState } from "react";
import OnboardingScreen from "@/components/OnboardingScreen";
import ChatScreen from "@/components/ChatScreen";

const Index = () => {
  const [profile, setProfile] = useState<{ name: string; age: number } | null>(null);

  if (!profile) {
    return <OnboardingScreen onComplete={(name, age) => setProfile({ name, age })} />;
  }

  return <ChatScreen childName={profile.name} childAge={profile.age} />;
};

export default Index;
