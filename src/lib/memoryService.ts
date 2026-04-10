/**
 * Bobby Hybrid Memory Service v5.0
 * 
 * Orchestrates 3-layer memory:
 * 1. RAM cache (instant)
 * 2. Local IndexedDB/localStorage (< 10ms)
 * 3. Cloud Supabase (async sync)
 * 
 * RULE: Always read local first → cloud sync in background
 * CONFLICT: latest timestamp wins
 */
import { supabase } from "@/integrations/supabase/client";
import {
  storeMemory,
  getTopMemories,
  getUnsyncedEntries,
  markSynced,
  runForgetCycle,
  addToShortTerm,
  loadLocalProfile,
  type MemoryEntry,
} from "./localMemoryStore";

export interface ChildMemory {
  childName: string;
  preferences: Record<string, unknown>;
  favoriteThemes: string[];
  lastStoryId: string | null;
  totalStoriesHeard: number;
  progressionLevel: number;
  interactionCount: number;
  relationshipScore: number;
  lastEmotions: string[];
  emotionalHistory: Array<{ emotion: string; timestamp: string }>;
  engagementTriggers: string[];
  behaviorPatterns: string[];
  learningSpeed: string;
  interactionStyle: string;
  preferredTopics: Record<string, number>;
}

const memoryCache = new Map<string, ChildMemory>();
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let forgetRan = false;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LOCAL-FIRST LOAD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Load memory: RAM cache → local profile → cloud (async backfill) */
export async function loadMemory(childName: string): Promise<ChildMemory> {
  // Layer 1: RAM cache
  if (memoryCache.has(childName)) return memoryCache.get(childName)!;

  // Layer 2: Try local profile first (instant)
  const localProfile = loadLocalProfile(childName);
  
  // Layer 3: Cloud (may be slow, but needed for full data)
  let memory: ChildMemory;
  
  try {
    const { data } = await supabase
      .from("child_memories")
      .select("*")
      .eq("child_name", childName)
      .maybeSingle();

    if (data) {
      const d = data as any;
      memory = {
        childName: d.child_name,
        preferences: (d.preferences as Record<string, unknown>) || {},
        favoriteThemes: d.favorite_themes || [],
        lastStoryId: d.last_story_id,
        totalStoriesHeard: d.total_stories_heard,
        progressionLevel: d.progression_level ?? 1,
        interactionCount: d.interaction_count ?? 0,
        relationshipScore: d.relationship_score ?? 0,
        lastEmotions: d.last_emotions ?? [],
        emotionalHistory: (d.emotional_history as any[]) ?? [],
        engagementTriggers: d.engagement_triggers ?? [],
        behaviorPatterns: (d.behavior_patterns as string[]) ?? [],
        learningSpeed: d.learning_speed ?? "normal",
        interactionStyle: d.interaction_style ?? "balanced",
        preferredTopics: (d.preferred_topics as Record<string, number>) ?? {},
      };

      // Merge local profile data if more recent
      if (localProfile && localProfile.lastUpdated > new Date(d.updated_at).getTime()) {
        if (Object.keys(localProfile.favoriteTopics).length) {
          memory.preferredTopics = { ...memory.preferredTopics, ...localProfile.favoriteTopics };
        }
        if (localProfile.engagementTriggers.length) memory.engagementTriggers = localProfile.engagementTriggers;
        if (localProfile.learningSpeed !== "normal") memory.learningSpeed = localProfile.learningSpeed;
        if (localProfile.interactionStyle !== "balanced") memory.interactionStyle = localProfile.interactionStyle;
        if (localProfile.behaviorPatterns.length) memory.behaviorPatterns = localProfile.behaviorPatterns;
      }
    } else {
      // No cloud data — create from local or fresh
      memory = buildFromLocal(childName, localProfile);
      // Create in cloud (async)
      supabase.from("child_memories").insert({
        child_name: childName,
        preferences: {},
        favorite_themes: [],
        total_stories_heard: 0,
      }).then(() => {});
    }
  } catch {
    // Cloud unavailable — use local only
    memory = buildFromLocal(childName, localProfile);
  }

  memoryCache.set(childName, memory);
  
  // Schedule background tasks
  scheduleBackgroundSync(childName);
  if (!forgetRan) { forgetRan = true; runForgetCycle(childName).catch(() => {}); }

  return memory;
}

function buildFromLocal(childName: string, localProfile: ReturnType<typeof loadLocalProfile>): ChildMemory {
  return {
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
    engagementTriggers: localProfile?.engagementTriggers ?? [],
    behaviorPatterns: localProfile?.behaviorPatterns ?? [],
    learningSpeed: localProfile?.learningSpeed ?? "normal",
    interactionStyle: localProfile?.interactionStyle ?? "balanced",
    preferredTopics: localProfile?.favoriteTopics ?? {},
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UPDATE — local first, cloud async
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function updateMemory(
  childName: string,
  updates: Partial<Omit<ChildMemory, "childName">>
) {
  const current = await loadMemory(childName);
  const updated = { ...current, ...updates };
  memoryCache.set(childName, updated);

  // Store important changes in IndexedDB structured memory
  if (updates.favoriteThemes?.length) {
    for (const theme of updates.favoriteThemes) {
      storeMemory(childName, "preference", `theme_${theme}`, theme, 0.8, 6).catch(() => {});
    }
  }
  if (updates.lastEmotions?.length) {
    const emotion = updates.lastEmotions[updates.lastEmotions.length - 1];
    storeMemory(childName, "emotion", `recent_${emotion}`, emotion, 0.6, 4).catch(() => {});
  }

  // Cloud sync (async, non-blocking)
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
  if (updates.engagementTriggers !== undefined) dbUpdates.engagement_triggers = updates.engagementTriggers;
  if (updates.behaviorPatterns !== undefined) dbUpdates.behavior_patterns = updates.behaviorPatterns;
  if (updates.learningSpeed !== undefined) dbUpdates.learning_speed = updates.learningSpeed;
  if (updates.interactionStyle !== undefined) dbUpdates.interaction_style = updates.interactionStyle;
  if (updates.preferredTopics !== undefined) dbUpdates.preferred_topics = updates.preferredTopics;

  // Non-blocking cloud push
  supabase
    .from("child_memories")
    .update(dbUpdates)
    .eq("child_name", childName)
    .then(() => {});
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BACKGROUND SYNC — push unsynced local entries to cloud
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function scheduleBackgroundSync(childName: string): void {
  if (syncTimer) return;
  syncTimer = setTimeout(async () => {
    syncTimer = null;
    if (!navigator.onLine) return;
    try {
      const unsynced = await getUnsyncedEntries(childName);
      if (unsynced.length === 0) return;

      // Batch sync: merge structured memories into cloud memory fields
      const memory = memoryCache.get(childName);
      if (memory) {
        await supabase
          .from("child_memories")
          .update({
            updated_at: new Date().toISOString(),
            preferred_topics: memory.preferredTopics,
            engagement_triggers: memory.engagementTriggers,
            behavior_patterns: memory.behaviorPatterns,
            learning_speed: memory.learningSpeed,
            interaction_style: memory.interactionStyle,
          })
          .eq("child_name", childName);
      }

      await markSynced(unsynced.map(e => e.id));
      console.log(`[Memory] ☁️ Synced ${unsynced.length} entries to cloud`);
    } catch (err) {
      console.warn("[Memory] Sync failed, will retry later", err);
    }
  }, 5000); // 5s delay — batch sync
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONVENIENCE HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
  
  // Also store as structured memory
  storeMemory(childName, "event", `story_${storyId}`, `Listened to story: ${theme}`, 0.5, 3).catch(() => {});
}

export async function getPreference(childName: string, key: string): Promise<unknown> {
  const memory = await loadMemory(childName);
  return memory.preferences[key];
}

export async function setPreference(childName: string, key: string, value: unknown) {
  const memory = await loadMemory(childName);
  await updateMemory(childName, {
    preferences: { ...memory.preferences, [key]: value },
  });
  // High-priority structured memory
  storeMemory(childName, "preference", key, String(value), 0.9, 8).catch(() => {});
}

/** Get enrichment context from all memory layers for AI prompts */
export async function getMemoryContext(childName: string): Promise<string> {
  const topEntries = await getTopMemories(childName);
  if (topEntries.length === 0) return "";

  const lines = topEntries.map(e => {
    const typeLabel = { preference: "🎯", emotion: "💛", behavior: "🧩", event: "📌" }[e.type] || "•";
    return `${typeLabel} ${e.key}: ${e.value}`;
  });

  return `Mémoire enfant:\n${lines.join("\n")}`;
}
