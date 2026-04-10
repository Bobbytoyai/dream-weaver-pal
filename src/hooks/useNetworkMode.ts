/**
 * useNetworkMode — React hook for network state tracking
 * Auto-switches between ONLINE/OFFLINE modes.
 */
import { useState, useEffect } from "react";
import { getNetworkMode, onNetworkChange, type NetworkMode } from "@/lib/offlineEngine";

export function useNetworkMode() {
  const [mode, setMode] = useState<NetworkMode>(getNetworkMode);

  useEffect(() => {
    return onNetworkChange(setMode);
  }, []);

  return { mode, isOffline: mode === "OFFLINE" };
}
