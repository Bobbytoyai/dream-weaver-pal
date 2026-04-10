/**
 * Memory Service — persists child preferences between sessions.
 */
import { supabase } from "@/integrations/supabase/client";

export interface ChildMemory {
  childName: string;
  preferences: Record<string, unknown>;
  favoriteThemes: string[];
  lastStoryId: string | null;
  totalStoriesHeard: number;
}

const memoryCache = new Map<string, ChildMemory>();

/** Load or create memory for a child */
export async function loadMemory(childName: string): Promise<ChildMemory> {
  // Check cache first
  if (memoryCache.has(childName)) return memoryCache.get(childName)!;

  const { data, error } = await supabase
    .from("child_memories")
    .select("*")
    .eq("child_name", childName)
    .maybeSingle();

  if (data) {
    const memory: ChildMemory = {
      childName: data.child_name,
      preferences: (data.preferences as Record<string, unknown>) || {},
      favoriteThemes: data.favorite_themes || [],
      lastStoryId: data.last_story_id,
      totalStoriesHeard: data.total_stories_heard,
    };
    memoryCache.set(childName, memory);
    return memory;
  }

  // Create new memory
  const newMemory: ChildMemory = {
    childName,
    preferences: {},
    favoriteThemes: [],
    lastStoryId: null,
    totalStoriesHeard: 0,
  };

  await supabase.from("child_memories").insert({
    child_name: childName,
    preferences: {},
    favorite_themes: [],
    total_stories_heard: 0,
  });

  memoryCache.set(childName, newMemory);
  return newMemory;
}

/** Update a memory field and persist */
export async function updateMemory(
  childName: string,
  updates: Partial<Pick<ChildMemory, "preferences" | "favoriteThemes" | "lastStoryId" | "totalStoriesHeard">>
) {
  const current = await loadMemory(childName);
  const updated = { ...current, ...updates };
  memoryCache.set(childName, updated);

  const dbUpdates: {
    updated_at: string;
    preferences?: Record<string, unknown>;
    favorite_themes?: string[];
    last_story_id?: string | null;
    total_stories_heard?: number;
  } = { updated_at: new Date().toISOString() };

  if (updates.preferences !== undefined) dbUpdates.preferences = updates.preferences;
  if (updates.favoriteThemes !== undefined) dbUpdates.favorite_themes = updates.favoriteThemes;
  if (updates.lastStoryId !== undefined) dbUpdates.last_story_id = updates.lastStoryId;
  if (updates.totalStoriesHeard !== undefined) dbUpdates.total_stories_heard = updates.totalStoriesHeard;

  await supabase
    .from("child_memories")
    .update(dbUpdates)
    .eq("child_name", childName);
}

/** Record that a story was heard */
export async function recordStoryHeard(childName: string, storyId: string, theme: string) {
  const memory = await loadMemory(childName);
  const themes = memory.favoriteThemes.includes(theme)
    ? memory.favoriteThemes
    : [...memory.favoriteThemes, theme];

  await updateMemory(childName, {
    lastStoryId: storyId,
    totalStoriesHeard: memory.totalStoriesHeard + 1,
    favoriteThemes: themes,
  });
}

/** Get a preference value */
export async function getPreference(childName: string, key: string): Promise<unknown> {
  const memory = await loadMemory(childName);
  return memory.preferences[key];
}

/** Set a preference value */
export async function setPreference(childName: string, key: string, value: unknown) {
  const memory = await loadMemory(childName);
  await updateMemory(childName, {
    preferences: { ...memory.preferences, [key]: value },
  });
}
