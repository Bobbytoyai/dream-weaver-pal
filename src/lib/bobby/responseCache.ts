/**
 * Bobby Brain V5 — Multi-Level Response Cache
 * 
 * L1: RAM LRU cache (50 entries, <0.1ms lookup)
 * L2: IndexedDB warm cache (500 entries, ~3ms lookup)
 * 
 * Caches full pipeline responses keyed by normalized input.
 * Avoids re-processing identical/similar queries through the 3-layer pipeline.
 * 
 * Features:
 * - Normalized key generation (accent/case/punctuation insensitive)
 * - TTL-based expiration (L1: 15min, L2: 2h)
 * - Automatic L2→L1 promotion on hit
 * - Source-aware caching (never caches safety/game responses)
 * - Anti-repetition: skips cache ~20% of the time for variety
 */

import type { BobbyBrainReply } from "./types";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const L1_MAX_SIZE = 50;
const L1_TTL_MS = 15 * 60 * 1000;   // 15 minutes
const L2_MAX_SIZE = 500;
const L2_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const VARIETY_SKIP_RATE = 0.2;        // 20% cache miss for variety

const DB_NAME = "bobby-response-cache";
const DB_VERSION = 1;
const STORE_NAME = "responses";

// Sources that should NEVER be cached
const UNCACHEABLE_SOURCES = new Set(["safety_filter", "narration", "offline_games"]);
const UNCACHEABLE_INTENTS = new Set(["BLOCKED", "GAME", "NARRATION", "CRISE_SECURITE"]);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// KEY NORMALIZATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function normalizeKey(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// L1: RAM LRU CACHE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface CacheEntry {
  key: string;
  reply: BobbyBrainReply;
  createdAt: number;
  hitCount: number;
}

// Using a Map for LRU behavior (insertion order)
const l1Cache = new Map<string, CacheEntry>();

function l1Get(key: string): BobbyBrainReply | null {
  const entry = l1Cache.get(key);
  if (!entry) return null;

  // Check TTL
  if (Date.now() - entry.createdAt > L1_TTL_MS) {
    l1Cache.delete(key);
    return null;
  }

  // Promote to most recent (LRU refresh)
  entry.hitCount++;
  l1Cache.delete(key);
  l1Cache.set(key, entry);

  return entry.reply;
}

function l1Set(key: string, reply: BobbyBrainReply): void {
  // Evict oldest if at capacity
  if (l1Cache.size >= L1_MAX_SIZE) {
    const oldest = l1Cache.keys().next().value;
    if (oldest) l1Cache.delete(oldest);
  }

  l1Cache.set(key, {
    key,
    reply: { ...reply },
    createdAt: Date.now(),
    hitCount: 0,
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// L2: INDEXEDDB WARM CACHE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface L2Entry {
  key: string;
  reply: BobbyBrainReply;
  createdAt: number;
  hitCount: number;
}

let db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (db) return Promise.resolve(db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const database = req.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: "key" });
        store.createIndex("createdAt", "createdAt");
      }
    };
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

async function l2Get(key: string): Promise<BobbyBrainReply | null> {
  try {
    const database = await openDB();
    const tx = database.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    const entry = await new Promise<L2Entry | undefined>((res, rej) => {
      req.onsuccess = () => res(req.result);
      req.onerror = rej;
    });

    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.createdAt > L2_TTL_MS) {
      // Delete expired entry in background
      l2Delete(key).catch(() => {});
      return null;
    }

    // Promote to L1
    l1Set(key, entry.reply);

    // Update hit count in L2
    l2UpdateHitCount(key, entry.hitCount + 1).catch(() => {});

    return entry.reply;
  } catch {
    return null;
  }
}

async function l2Set(key: string, reply: BobbyBrainReply): Promise<void> {
  try {
    const database = await openDB();

    // Evict oldest entries if at capacity
    const tx1 = database.transaction(STORE_NAME, "readonly");
    const countReq = tx1.objectStore(STORE_NAME).count();
    const count = await new Promise<number>((res, rej) => {
      countReq.onsuccess = () => res(countReq.result);
      countReq.onerror = rej;
    });

    if (count >= L2_MAX_SIZE) {
      await l2EvictOldest(Math.floor(L2_MAX_SIZE * 0.2)); // Evict 20%
    }

    const tx2 = database.transaction(STORE_NAME, "readwrite");
    tx2.objectStore(STORE_NAME).put({
      key,
      reply: { ...reply },
      createdAt: Date.now(),
      hitCount: 0,
    } as L2Entry);
    await new Promise<void>((res, rej) => { tx2.oncomplete = () => res(); tx2.onerror = rej; });
  } catch {
    // Silently fail — cache is best-effort
  }
}

async function l2Delete(key: string): Promise<void> {
  try {
    const database = await openDB();
    const tx = database.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = rej; });
  } catch {}
}

async function l2UpdateHitCount(key: string, hitCount: number): Promise<void> {
  try {
    const database = await openDB();
    const tx = database.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => {
      const entry = req.result as L2Entry | undefined;
      if (entry) {
        entry.hitCount = hitCount;
        store.put(entry);
      }
    };
    await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = rej; });
  } catch {}
}

async function l2EvictOldest(count: number): Promise<void> {
  try {
    const database = await openDB();
    const tx = database.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("createdAt");
    const req = index.openCursor();
    let evicted = 0;

    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor && evicted < count) {
        cursor.delete();
        evicted++;
        cursor.continue();
      }
    };

    await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = rej; });
  } catch {}
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PUBLIC API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Check if a response is cacheable (not safety, games, or narration).
 */
function isCacheable(reply: BobbyBrainReply): boolean {
  if (UNCACHEABLE_SOURCES.has(reply.source)) return false;
  if (UNCACHEABLE_INTENTS.has(reply.intent)) return false;
  if (reply.confidence < 0.5) return false; // Don't cache low-confidence replies
  return true;
}

/**
 * Look up a cached response. Checks L1 (RAM) first, then L2 (IndexedDB).
 * Returns null on miss. Introduces ~20% deliberate misses for variety.
 */
export async function getCachedReply(userText: string): Promise<BobbyBrainReply | null> {
  // Deliberate cache skip for variety
  if (Math.random() < VARIETY_SKIP_RATE) return null;

  const key = normalizeKey(userText);
  if (!key || key.length < 3) return null; // Don't cache very short inputs

  // L1: RAM (~0.01ms)
  const l1Hit = l1Get(key);
  if (l1Hit) {
    console.log(`[ResponseCache] ⚡ L1 RAM hit: "${key.slice(0, 30)}…"`);
    return { ...l1Hit }; // Return a copy
  }

  // L2: IndexedDB (~3ms)
  const l2Hit = await l2Get(key);
  if (l2Hit) {
    console.log(`[ResponseCache] 💾 L2 IDB hit: "${key.slice(0, 30)}…" (promoted to L1)`);
    return { ...l2Hit };
  }

  return null;
}

/**
 * Store a pipeline response in both cache levels.
 */
export async function cacheReply(userText: string, reply: BobbyBrainReply): Promise<void> {
  if (!isCacheable(reply)) return;

  const key = normalizeKey(userText);
  if (!key || key.length < 3) return;

  // Write to L1 (sync, instant)
  l1Set(key, reply);

  // Write to L2 (async, best-effort)
  l2Set(key, reply).catch(() => {});
}

/**
 * Get cache statistics for debugging.
 */
export function getResponseCacheStats(): {
  l1Size: number;
  l1MaxSize: number;
  l2MaxSize: number;
} {
  return {
    l1Size: l1Cache.size,
    l1MaxSize: L1_MAX_SIZE,
    l2MaxSize: L2_MAX_SIZE,
  };
}

/**
 * Clear all cache levels. Called on session reset.
 */
export async function clearResponseCache(): Promise<void> {
  // Clear L1
  l1Cache.clear();

  // Clear L2
  try {
    const database = await openDB();
    const tx = database.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = rej; });
  } catch {}

  console.log("[ResponseCache] 🗑️ All levels cleared");
}
