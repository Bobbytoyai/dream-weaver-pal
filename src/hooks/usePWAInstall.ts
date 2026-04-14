import { useState, useEffect, useCallback, useRef } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Hook to manage PWA install prompt.
 * Returns whether the app is installable, already installed (standalone),
 * and a function to trigger the install prompt.
 */
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check if already running as installed PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Detect when app gets installed
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setCanInstall(false);
      deferredPromptRef.current = null;
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return false;

    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    deferredPromptRef.current = null;
    setCanInstall(false);

    return outcome === "accepted";
  }, []);

  return { canInstall, isInstalled, promptInstall };
}
