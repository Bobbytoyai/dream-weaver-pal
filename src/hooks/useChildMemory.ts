import { useEffect, useRef, useCallback, useState } from "react";
import { loadMemory, updateMemory, recordStoryHeard, setPreference, type ChildMemory } from "@/lib/memoryService";

/**
 * Hook that loads & exposes a child's persistent memory,
 * and provides helpers to update it throughout the session.
 */
export function useChildMemory(childName: string) {
  const [memory, setMemory] = useState<ChildMemory | null>(null);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!childName || loadedRef.current) return;
    loadedRef.current = true;
    loadMemory(childName)
      .then((m) => setMemory(m))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [childName]);

  const addFavoriteTheme = useCallback(async (theme: string) => {
    if (!memory) return;
    if (memory.favoriteThemes.includes(theme)) return;
    const updated = [...memory.favoriteThemes, theme];
    setMemory((m) => m ? { ...m, favoriteThemes: updated } : m);
    await updateMemory(childName, { favoriteThemes: updated });
  }, [childName, memory]);

  const incrementStoriesHeard = useCallback(async (storyId: string, theme: string) => {
    await recordStoryHeard(childName, storyId, theme);
    setMemory((m) => m ? {
      ...m,
      totalStoriesHeard: m.totalStoriesHeard + 1,
      lastStoryId: storyId,
      favoriteThemes: m.favoriteThemes.includes(theme)
        ? m.favoriteThemes
        : [...m.favoriteThemes, theme],
    } : m);
  }, [childName]);

  const savePref = useCallback(async (key: string, value: unknown) => {
    await setPreference(childName, key, value);
    setMemory((m) => m ? { ...m, preferences: { ...m.preferences, [key]: value } } : m);
  }, [childName]);

  const saveSettings = useCallback(async (settings: Record<string, unknown>) => {
    if (!memory) return;
    const merged = { ...memory.preferences, ...settings };
    setMemory((m) => m ? { ...m, preferences: merged } : m);
    await updateMemory(childName, { preferences: merged });
  }, [childName, memory]);

  return { memory, loading, addFavoriteTheme, incrementStoriesHeard, savePref, saveSettings };
}
