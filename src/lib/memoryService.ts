/**
 * Memory Service — persists child preferences between sessions.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface ChildMemory {
  childName: string;
  preferences: Record<string, unknown>;
  favoriteThemes: string[];
  lastStoryId: string | null;
  totalStoriesHeard: number;
  // v3.0 cognitive fields
  progressionLevel: number;
  interactionCount: number;
  relationshipScore: number;
  lastEmotions: string[];
  emotionalHistory: Array<{ emotion: string; timestamp: string }>;
  // v4.0 adaptive profile
  engagementTriggers: string[];
  behaviorPatterns: string[];
  learningSpeed: string;
  interactionStyle: string;
  preferredTopics: Record<string, number>;
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
      progressionLevel: (data as any).progression_level ?? 1,
      interactionCount: (data as any).interaction_count ?? 0,
      relationshipScore: (data as any).relationship_score ?? 0,
      lastEmotions: (data as any).last_emotions ?? [],
      emotionalHistory: ((data as any).emotional_history as any[]) ?? [],
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
    progressionLevel: 1,
    interactionCount: 0,
    relationshipScore: 0,
    lastEmotions: [],
    emotionalHistory: [],
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
  updates: Partial<Pick<ChildMemory, "preferences" | "favoriteThemes" | "lastStoryId" | "totalStoriesHeard" | "progressionLevel" | "interactionCount" | "relationshipScore" | "lastEmotions" | "emotionalHistory">>
) {
  const current = await loadMemory(childName);
  const updated = { ...current, ...updates };
  memoryCache.set(childName, updated);

  const dbUpdates: any = { updated_at: new Date().toISOString() };

  if (updates.preferences !== undefined) dbUpdates.preferences = updates.preferences;
  if (updates.favoriteThemes !== undefined) dbUpdates.favorite_themes = updates.favoriteThemes;
  if (updates.lastStoryId !== undefined) dbUpdates.last_story_id = updates.lastStoryId;
  if (updates.totalStoriesHeard !== undefined) dbUpdates.total_stories_heard = updates.totalStoriesHeard;
  if (updates.progressionLevel !== undefined) dbUpdates.progression_level = updates.progressionLevel;
  if (updates.interactionCount !== undefined) dbUpdates.interaction_count = updates.interactionCount;
  if (updates.relationshipScore !== undefined) dbUpdates.relationship_score = updates.relationshipScore;
  if (updates.lastEmotions !== undefined) dbUpdates.last_emotions = updates.lastEmotions;
  if (updates.emotionalHistory !== undefined) dbUpdates.emotional_history = updates.emotionalHistory;

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
