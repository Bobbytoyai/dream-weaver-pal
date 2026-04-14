import { lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import RetroLoader from "@/components/RetroLoader";
import LazyImportBoundary from "@/components/LazyImportBoundary";
import { DEFAULT_PARENT_SETTINGS, ParentSettings } from "@/components/parentSettings";
import { useState } from "react";

const ParentMode = lazy(() => import("@/components/ParentMode"));

export default function ParentTest() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<ParentSettings>(DEFAULT_PARENT_SETTINGS);

  return (
    <LazyImportBoundary label="Mode Parent Test">
      <Suspense fallback={<RetroLoader message="Mode parent test…" />}>
        <ParentMode
          childName="Mika"
          onClose={() => navigate("/")}
          parentSettings={settings}
          onSettingsChange={setSettings}
        />
      </Suspense>
    </LazyImportBoundary>
  );
}
