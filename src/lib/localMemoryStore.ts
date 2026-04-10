/**
 * Bobby Hybrid Memory Engine v5.0
 * 
 * 3-layer architecture:
 * Layer 1 — SHORT TERM (RAM): last 10 messages, immediate context
 * Layer 2 — LOCAL (IndexedDB + localStorage): preferences, habits, patterns, AI cache
 * Layer 3 — CLOUD (Supabase): long-term history, parent analytics, backup
 * 
 * RULE: local FIRST → cloud SYNC async
 */

const STORAGE_PREFIX = "bobby_";
const MAX_CACHE_ENTRIES = 500;
const MAX_CACHE_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const DB_NAME = "bobby_memory";
const DB_VERSION = 1;
const STORE_NAME = "memory_entries";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 1 — SHORT TERM (RAM)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ShortTermEntry {
  role: "user" | "assistant";
  content: string;
  emotion?: string;
  timestamp: number;
}

const shortTermBuffer: ShortTermEntry[] = [];
const MAX_SHORT_TERM = 10;

/** Add a message to short-term RAM buffer */
export function addToShortTerm(role: "user" | "assistant", content: string, emotion?: string): void {
  shortTermBuffer.push({ role, content, emotion, timestamp: Date.now() });
  if (shortTermBuffer.length > MAX_SHORT_TERM) {
    shortTermBuffer.shift();
  }
}

/** Get short-term context for enriching responses */
export function getShortTermContext(): ShortTermEntry[] {
  return [...shortTermBuffer];
}

/** Clear short-term buffer (e.g., new session) */
export function clearShortTerm(): void {
  shortTermBuffer.length = 0;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 2 — STRUCTURED MEMORY (IndexedDB)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type MemoryType = "preference" | "emotion" | "behavior" | "event";

export interface MemoryEntry {
  id: string;
  childName: string;
  type: MemoryType;
  key: string;          // e.g. "aime_pirates", "triste_le_soir"
  value: string;
  confidence: number;   // 0-1
  priority: number;     // 1-10, auto-adjusted
  timestamp: number;
  lastUsed: number;
  useCount: number;
  synced: boolean;      // has been synced to cloud
}

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("childName", "childName", { unique: false });
        store.createIndex("type", "type", { unique: false });
        store.createIndex("priority", "priority", { unique: false });
        store.createIndex("childType", ["childName", "type"], { unique: false });
      }
    };
    req.onsuccess = () => { dbInstance = req.result; resolve(req.result); };
    req.onerror = () => reject(req.error);
  });
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Store a memory entry (local, <10ms) */
export async function storeMemory(
  childName: string,
  type: MemoryType,
  key: string,
  value: string,
  confidence = 0.7,
  priority = 5,
): Promise<MemoryEntry> {
  const db = await openDB();
  
  // Check if similar entry exists (merge instead of duplicate)
  const existing = await findMemory(childName, type, key);
  if (existing) {
    existing.value = value;
    existing.confidence = Math.min(1, (existing.confidence + confidence) / 2 + 0.1);
    existing.lastUsed = Date.now();
    existing.useCount++;
    existing.priority = Math.min(10, existing.priority + (existing.useCount > 5 ? 1 : 0));
    existing.synced = false;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(existing);
      tx.oncomplete = () => resolve(existing);
      tx.onerror = () => reject(tx.error);
    });
  }

  const entry: MemoryEntry = {
    id: generateId(),
    childName,
    type,
    key,
    value,
    confidence,
    priority,
    timestamp: Date.now(),
    lastUsed: Date.now(),
    useCount: 1,
    synced: false,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add(entry);
    tx.oncomplete = () => resolve(entry);
    tx.onerror = () => reject(tx.error);
  });
}

/** Find a specific memory entry */
async function findMemory(childName: string, type: MemoryType, key: string): Promise<MemoryEntry | null> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const idx = tx.objectStore(STORE_NAME).index("childType");
    const req = idx.openCursor(IDBKeyRange.only([childName, type]));
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) { resolve(null); return; }
      if ((cursor.value as MemoryEntry).key === key) {
        resolve(cursor.value);
      } else {
        cursor.continue();
      }
    };
    req.onerror = () => resolve(null);
  });
}

/** Get all memories for a child, sorted by priority desc */
export async function getMemories(childName: string, type?: MemoryType): Promise<MemoryEntry[]> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const idx = type
      ? store.index("childType")
      : store.index("childName");
    const range = type
      ? IDBKeyRange.only([childName, type])
      : IDBKeyRange.only(childName);
    const req = idx.getAll(range);
    req.onsuccess = () => {
      const results = (req.result as MemoryEntry[])
        .sort((a, b) => b.priority - a.priority || b.lastUsed - a.lastUsed);
      resolve(results);
    };
    req.onerror = () => resolve([]);
  });
}

/** Get high-priority memories for prompt enrichment (<5ms) */
export async function getTopMemories(childName: string, limit = 8): Promise<MemoryEntry[]> {
  const all = await getMemories(childName);
  return all.slice(0, limit);
}

/** Mark a memory as used (boosts priority via auto-learning) */
export async function touchMemory(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => {
      const entry = req.result as MemoryEntry | undefined;
      if (entry) {
        entry.lastUsed = Date.now();
        entry.useCount++;
        // Auto-learning: frequently used → higher priority
        if (entry.useCount > 3 && entry.priority < 8) entry.priority++;
        if (entry.useCount > 10 && entry.priority < 10) entry.priority++;
        entry.synced = false;
        store.put(entry);
      }
      tx.oncomplete = () => resolve();
    };
    req.onerror = () => resolve();
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FORGET SYSTEM — Clean stale/noisy data
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const FORGET_THRESHOLD_MS = 60 * 24 * 60 * 60 * 1000; // 60 days unused
const LOW_PRIORITY_THRESHOLD = 2;

/** Run the forget system — delete stale, low-priority entries */
export async function runForgetCycle(childName: string): Promise<number> {
  const db = await openDB();
  const all = await getMemories(childName);
  const now = Date.now();
  let deleted = 0;

  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  for (const entry of all) {
    const age = now - entry.lastUsed;
    const shouldForget =
      (age > FORGET_THRESHOLD_MS && entry.priority <= LOW_PRIORITY_THRESHOLD) ||
      (age > FORGET_THRESHOLD_MS * 2 && entry.useCount <= 1) ||
      (entry.confidence < 0.3 && entry.useCount <= 1);

    // Never forget high-priority entries (name, strong preferences)
    if (shouldForget && entry.priority < 7) {
      store.delete(entry.id);
      deleted++;
    }
  }

  return new Promise((resolve) => {
    tx.oncomplete = () => { console.log(`[Memory] 🧹 Forgot ${deleted} stale entries`); resolve(deleted); };
    tx.onerror = () => resolve(0);
  });
}

/** Delete a specific memory (parent action) */
export async function deleteMemory(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

/** Delete all memories for a child */
export async function deleteAllMemories(childName: string): Promise<void> {
  const all = await getMemories(childName);
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  for (const entry of all) store.delete(entry.id);
  return new Promise((resolve) => { tx.oncomplete = () => resolve(); tx.onerror = () => resolve(); });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLOUD SYNC — async, non-blocking
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Get all unsynced entries for cloud push */
export async function getUnsyncedEntries(childName: string): Promise<MemoryEntry[]> {
  const all = await getMemories(childName);
  return all.filter(e => !e.synced);
}

/** Mark entries as synced */
export async function markSynced(ids: string[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  for (const id of ids) {
    const req = store.get(id);
    req.onsuccess = () => {
      const entry = req.result as MemoryEntry | undefined;
      if (entry) {
        entry.synced = true;
        store.put(entry);
      }
    };
  }
  return new Promise((resolve) => { tx.oncomplete = () => resolve(); tx.onerror = () => resolve(); });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI RESPONSE CACHE (localStorage, fast)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface CachedAIResponse {
  question: string;
  answer: string;
  intent: string;
  emotion: string;
  timestamp: number;
  useCount: number;
  childName: string;
}

function getCacheKey(): string { return STORAGE_PREFIX + "ai_cache"; }

function loadCache(): CachedAIResponse[] {
  try {
    const raw = localStorage.getItem(getCacheKey());
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCache(entries: CachedAIResponse[]): void {
  try {
    localStorage.setItem(getCacheKey(), JSON.stringify(entries));
  } catch {
    const trimmed = entries.sort((a, b) => b.useCount - a.useCount).slice(0, MAX_CACHE_ENTRIES / 2);
    try { localStorage.setItem(getCacheKey(), JSON.stringify(trimmed)); } catch {}
  }
}

function normalizeForCache(text: string): string {
  return text.toLowerCase().trim().replace(/[!?.…,;:"""«»()[\]{}]+/g, "").replace(/\s+/g, " ").trim();
}

export function cacheAIResponse(userText: string, aiResponse: string, intent: string, emotion: string, childName: string): void {
  const normalized = normalizeForCache(userText);
  if (normalized.length < 3 || aiResponse.length < 5) return;

  const entries = loadCache();
  const existing = entries.find(e => e.question === normalized);
  if (existing) {
    existing.answer = aiResponse;
    existing.timestamp = Date.now();
    existing.useCount++;
    saveCache(entries);
    return;
  }

  entries.push({ question: normalized, answer: aiResponse, intent, emotion, timestamp: Date.now(), useCount: 1, childName });

  if (entries.length > MAX_CACHE_ENTRIES) {
    const now = Date.now();
    saveCache(entries.filter(e => now - e.timestamp < MAX_CACHE_AGE_MS)
      .sort((a, b) => (b.useCount * 2 + b.timestamp) - (a.useCount * 2 + a.timestamp))
      .slice(0, MAX_CACHE_ENTRIES));
  } else {
    saveCache(entries);
  }
}

export function lookupCachedAI(userText: string): CachedAIResponse | null {
  const normalized = normalizeForCache(userText);
  if (normalized.length < 3) return null;
  const entries = loadCache();

  const exact = entries.find(e => e.question === normalized);
  if (exact) { exact.useCount++; saveCache(entries); return exact; }

  const inputWords = normalized.split(/\s+/).filter(w => w.length > 2);
  if (!inputWords.length) return null;

  let bestMatch: CachedAIResponse | null = null;
  let bestScore = 0;
  for (const entry of entries) {
    const entryWords = entry.question.split(/\s+/).filter(w => w.length > 2);
    if (!entryWords.length) continue;
    let matched = 0;
    for (const iw of inputWords) {
      if (entryWords.some(ew => ew === iw || (ew.length > 4 && iw.startsWith(ew.slice(0, 4))))) matched++;
    }
    const score = matched / Math.max(inputWords.length, entryWords.length);
    if (score > bestScore && score >= 0.7) { bestScore = score; bestMatch = entry; }
  }

  if (bestMatch) { bestMatch.useCount++; saveCache(entries); }
  return bestMatch;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LOCAL CHILD PROFILE (localStorage, backward compat)
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

function getProfileKey(childName: string): string { return STORAGE_PREFIX + "profile_" + childName.toLowerCase(); }

export function loadLocalProfile(childName: string): LocalChildProfile | null {
  try { const raw = localStorage.getItem(getProfileKey(childName)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export function saveLocalProfile(profile: LocalChildProfile): void {
  try { profile.lastUpdated = Date.now(); localStorage.setItem(getProfileKey(profile.childName), JSON.stringify(profile)); } catch {}
}

export function updateLocalProfileFromCognitive(
  childName: string,
  data: { engagementTriggers?: string[]; behaviorPatterns?: string[]; learningSpeed?: string; interactionStyle?: string; preferredTopics?: Record<string, number>; }
): void {
  const existing = loadLocalProfile(childName) || {
    childName, favoriteTopics: {}, engagementTriggers: [], learningSpeed: "normal",
    interactionStyle: "balanced", behaviorPatterns: [], lastSessionTime: Date.now(),
    sessionCount: 0, avgSessionDuration: 0, lastUpdated: Date.now(),
  };
  if (data.engagementTriggers?.length) existing.engagementTriggers = data.engagementTriggers;
  if (data.behaviorPatterns?.length) existing.behaviorPatterns = data.behaviorPatterns;
  if (data.learningSpeed) existing.learningSpeed = data.learningSpeed;
  if (data.interactionStyle) existing.interactionStyle = data.interactionStyle;
  if (data.preferredTopics) {
    for (const [topic, score] of Object.entries(data.preferredTopics)) existing.favoriteTopics[topic] = score;
  }
  saveLocalProfile(existing);
}

export function recordLocalSessionStart(childName: string): void {
  const profile = loadLocalProfile(childName);
  if (profile) { profile.sessionCount++; profile.lastSessionTime = Date.now(); saveLocalProfile(profile); }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATS & CLEANUP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function getCacheStats(): { entries: number; totalUses: number } {
  const cache = loadCache();
  return { entries: cache.length, totalUses: cache.reduce((sum, e) => sum + e.useCount, 0) };
}

export function clearLocalData(): void {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
  keys.forEach(k => localStorage.removeItem(k));
  // Also clear IndexedDB
  indexedDB.deleteDatabase(DB_NAME);
  dbInstance = null;
}
