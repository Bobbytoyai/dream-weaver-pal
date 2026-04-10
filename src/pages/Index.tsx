import { useState } from "react";
import VoiceScreen from "@/components/VoiceScreen";
import ParentMode, { ParentSettings, DEFAULT_PARENT_SETTINGS } from "@/components/ParentMode";

const Index = () => {
  const [mode, setMode] = useState<"voice" | "parent">("voice");
  const [parentSettings, setParentSettings] = useState<ParentSettings>(DEFAULT_PARENT_SETTINGS);

  if (mode === "parent") {
    return (
      <ParentMode
        childName="Buddy"
        onClose={() => setMode("voice")}
        parentSettings={parentSettings}
        onSettingsChange={setParentSettings}
      />
    );
  }

  return (
    <VoiceScreen
      childName="Buddy"
      childAge={7}
      onSwitchToChat={() => {}}
      onParentMode={() => setMode("parent")}
      parentSettings={parentSettings}
    />
  );
};

export default Index;
