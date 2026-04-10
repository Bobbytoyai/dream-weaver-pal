/**
 * Bobby Local Memory Store v4.8
 * 
 * Persists child preferences, AI response cache, and behavioral patterns
 * in localStorage for offline-first intelligence.
 * 
 * Data stored:
 * - AI response cache (question → answer mapping)
 * - Child preferences (topics, engagement scores)
 * - Session patterns (time of day, energy levels)
 * - Behavioral adaptations
 */

const STORAGE_PREFIX = "bobby_";
const MAX_CACHE_ENTRIES = 500;
const MAX_CACHE_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI RESPONSE CACHE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface CachedAIResponse {
  question: string;        // normalized user input
  answer: string;          // AI response
  intent: string;
  emotion: string;
  timestamp: number;
  useCount: number;
  childName: string;
}

function getCacheKey(): string {
  return STORAGE_PREFIX + "ai_cache";
}

function loadCache(): CachedAIResponse[] {
  try {
    const raw = localStorage.getItem(getCacheKey());
    if (!raw) return [];
    return JSON.parse(raw) as CachedAIResponse[];
  } catch {
    return [];
  }
}

function saveCache(entries: CachedAIResponse[]): void {
  try {
    localStorage.setItem(getCacheKey(), JSON.stringify(entries));
  } catch {
    // Storage full — evict oldest entries
    const trimmed = entries
      .sort((a, b) => b.useCount - a.useCount)
      .slice(0, MAX_CACHE_ENTRIES / 2);
    try {
      localStorage.setItem(getCacheKey(), JSON.stringify(trimmed));
    } catch { /* give up */ }
  }
}

/** Normalize a question for cache lookup */
function normalizeForCache(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[!?.…,;:"""«»()[\]{}]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cache an AI response for future offline use */
export function cacheAIResponse(
  userText: string,
  aiResponse: string,
  intent: string,
  emotion: string,
  childName: string,
): void {
  const normalized = normalizeForCache(userText);
  if (normalized.length < 3 || aiResponse.length < 5) return;

  const entries = loadCache();
  
  // Check if already cached
  const existing = entries.find(e => e.question === normalized);
  if (existing) {
    existing.answer = aiResponse;
    existing.timestamp = Date.now();
    existing.useCount++;
    saveCache(entries);
    return;
  }

  // Add new entry
  entries.push({
    question: normalized,
    answer: aiResponse,
    intent,
    emotion,
    timestamp: Date.now(),
    useCount: 1,
    childName,
  });

  // Evict old entries if over limit
  if (entries.length > MAX_CACHE_ENTRIES) {
    const now = Date.now();
    const filtered = entries
      .filter(e => now - e.timestamp < MAX_CACHE_AGE_MS)
      .sort((a, b) => b.useCount * 2 + b.timestamp - (a.useCount * 2 + a.timestamp))
      .slice(0, MAX_CACHE_ENTRIES);
    saveCache(filtered);
  } else {
    saveCache(entries);
  }
}

/** Look up a cached AI response. Returns null if no good match. */
export function lookupCachedAI(userText: string): CachedAIResponse | null {
  const normalized = normalizeForCache(userText);
  if (normalized.length < 3) return null;

  const entries = loadCache();
  
  // Exact match
  const exact = entries.find(e => e.question === normalized);
  if (exact) {
    exact.useCount++;
    saveCache(entries);
    return exact;
  }

  // Fuzzy match — word overlap
  const inputWords = normalized.split(/\s+/).filter(w => w.length > 2);
  if (inputWords.length === 0) return null;

  let bestMatch: CachedAIResponse | null = null;
  let bestScore = 0;

  for (const entry of entries) {
    const entryWords = entry.question.split(/\s+/).filter(w => w.length > 2);
    if (entryWords.length === 0) continue;
    
    let matched = 0;
    for (const iw of inputWords) {
      if (entryWords.some(ew => ew === iw || (ew.length > 4 && iw.startsWith(ew.slice(0, 4))))) {
        matched++;
      }
    }
    
    const score = matched / Math.max(inputWords.length, entryWords.length);
    if (score > bestScore && score >= 0.7) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  if (bestMatch) {
    bestMatch.useCount++;
    saveCache(entries);
  }

  return bestMatch;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LOCAL CHILD PREFERENCES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface LocalChildProfile {
  childName: string;
  favoriteTopics: Record<string, number>;
  engagementTriggers: string[];
  learningSpeed: string;
  interactionStyle: string;
  behaviorPatterns: string[];
  lastSessionTime: number;
  sessionCount: number;
  avgSessionDuration: number;
  lastUpdated: number;
}

function getProfileKey(childName: string): string {
  return STORAGE_PREFIX + "profile_" + childName.toLowerCase();
}

/** Load local child profile */
export function loadLocalProfile(childName: string): LocalChildProfile | null {
  try {
    const raw = localStorage.getItem(getProfileKey(childName));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Save/update local child profile */
export function saveLocalProfile(profile: LocalChildProfile): void {
  try {
    profile.lastUpdated = Date.now();
    localStorage.setItem(getProfileKey(profile.childName), JSON.stringify(profile));
  } catch { /* storage full */ }
}

/** Merge cognitive engine data into local profile */
export function updateLocalProfileFromCognitive(
  childName: string,
  data: {
    engagementTriggers?: string[];
    behaviorPatterns?: string[];
    learningSpeed?: string;
    interactionStyle?: string;
    preferredTopics?: Record<string, number>;
  }
): void {
  const existing = loadLocalProfile(childName) || {
    childName,
    favoriteTopics: {},
    engagementTriggers: [],
    learningSpeed: "normal",
    interactionStyle: "balanced",
    behaviorPatterns: [],
    lastSessionTime: Date.now(),
    sessionCount: 0,
    avgSessionDuration: 0,
    lastUpdated: Date.now(),
  };

  if (data.engagementTriggers?.length) existing.engagementTriggers = data.engagementTriggers;
  if (data.behaviorPatterns?.length) existing.behaviorPatterns = data.behaviorPatterns;
  if (data.learningSpeed) existing.learningSpeed = data.learningSpeed;
  if (data.interactionStyle) existing.interactionStyle = data.interactionStyle;
  if (data.preferredTopics) {
    for (const [topic, score] of Object.entries(data.preferredTopics)) {
      existing.favoriteTopics[topic] = score;
    }
  }

  saveLocalProfile(existing);
}

/** Record session start for local tracking */
export function recordLocalSessionStart(childName: string): void {
  const profile = loadLocalProfile(childName);
  if (profile) {
    profile.sessionCount++;
    profile.lastSessionTime = Date.now();
    saveLocalProfile(profile);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CACHE STATS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function getCacheStats(): { entries: number; totalUses: number } {
  const cache = loadCache();
  return {
    entries: cache.length,
    totalUses: cache.reduce((sum, e) => sum + e.useCount, 0),
  };
}

/** Clear all Bobby local data */
export function clearLocalData(): void {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
  keys.forEach(k => localStorage.removeItem(k));
}
