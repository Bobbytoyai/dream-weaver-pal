/**
 * KB Local Cache — IndexedDB + RAM index for 100% offline knowledge_base queries
 * 
 * Architecture:
 * 1. On first load: fetch all KB from Supabase → store in IndexedDB
 * 2. Build RAM index (keyword → entry IDs) for <5ms lookups
 * 3. Periodic sync every 10 min when online
 * 4. All queries hit local cache, never Supabase directly
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Types ──────────────────────────────────────────────────────────

export interface KBEntry {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  emotion: string;
  priority: number;
  category: string;
  age_min: number;
  age_max: number;
  source_content_id: string | null;
  is_active: boolean;
  trust_score: number;
  learning_source: string;
}

// ─── IndexedDB Layer ────────────────────────────────────────────────

const DB_NAME = "bobby-kb-cache";
const DB_VERSION = 2;
const STORE = "entries";
const META_STORE = "meta";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("age", ["age_min", "age_max"]);
        store.createIndex("active", "is_active");
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getLastSyncTime(): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction(META_STORE, "readonly");
    const req = tx.objectStore(META_STORE).get("lastSync");
    const result = await new Promise<any>((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = rej; });
    db.close();
    return result?.value ?? 0;
  } catch { return 0; }
}

async function setLastSyncTime(ts: number) {
  try {
    const db = await openDB();
    const tx = db.transaction(META_STORE, "readwrite");
    tx.objectStore(META_STORE).put({ key: "lastSync", value: ts });
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
    db.close();
  } catch {}
}

async function writeEntriesToIDB(entries: KBEntry[]) {
  const db = await openDB();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  store.clear();
  for (const e of entries) store.put(e);
  await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
  db.close();
}

async function readEntriesFromIDB(): Promise<KBEntry[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    const result = await new Promise<KBEntry[]>((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = rej; });
    db.close();
    return result;
  } catch { return []; }
}

// ─── RAM Cache ──────────────────────────────────────────────────────

let ramEntries: KBEntry[] = [];
let isLoaded = false;
let isLoading = false;
let loadPromise: Promise<void> | null = null;
let syncTimer: ReturnType<typeof setInterval> | null = null;

const SYNC_INTERVAL = 10 * 60 * 1000; // 10 minutes
const BATCH_SIZE = 1000; // Supabase row limit

/** Fetch ALL KB entries from Supabase (handles pagination) */
async function fetchAllFromCloud(): Promise<KBEntry[]> {
  const all: KBEntry[] = [];
  let offset = 0;
  
  while (true) {
    const { data, error } = await supabase
      .from("knowledge_base")
      .select("id, question, answer, keywords, emotion, priority, category, age_min, age_max, source_content_id, is_active")
      .eq("is_active", true)
      .range(offset, offset + BATCH_SIZE - 1)
      .order("id");

    if (error) {
      console.warn("[KBCache] Cloud fetch error:", error.message);
      break;
    }
    if (!data || data.length === 0) break;
    
    all.push(...data.map(d => ({
      id: d.id,
      question: d.question,
      answer: d.answer,
      keywords: d.keywords || [],
      emotion: d.emotion || "happy",
      priority: d.priority || 5,
      category: d.category || "général",
      age_min: d.age_min ?? 3,
      age_max: d.age_max ?? 12,
      source_content_id: d.source_content_id,
      is_active: true,
    })));

    if (data.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  return all;
}

/** Initialize: load from IDB first, then sync from cloud in background */
async function initCache(): Promise<void> {
  if (isLoaded) return;
  if (loadPromise) return loadPromise;

  isLoading = true;
  loadPromise = (async () => {
    try {
      // Layer 1: Load from IndexedDB (instant, works offline)
      const local = await readEntriesFromIDB();
      if (local.length > 0) {
        ramEntries = local;
        isLoaded = true;
        console.log(`[KBCache] 📦 Loaded ${local.length} entries from IndexedDB`);
      }

      // Layer 2: Sync from cloud if online
      if (navigator.onLine) {
        const lastSync = await getLastSyncTime();
        const age = Date.now() - lastSync;
        
        // Fresh sync if never synced or stale (>10min)
        if (local.length === 0 || age > SYNC_INTERVAL) {
          await syncFromCloud();
        } else {
          // Schedule a deferred sync
          setTimeout(() => syncFromCloud().catch(() => {}), 5000);
        }
      }

      isLoaded = true;

      // Start periodic sync
      if (!syncTimer) {
        syncTimer = setInterval(() => {
          if (navigator.onLine) syncFromCloud().catch(() => {});
        }, SYNC_INTERVAL);
      }
    } catch (e) {
      console.warn("[KBCache] Init failed:", e);
      isLoaded = ramEntries.length > 0;
    } finally {
      isLoading = false;
    }
  })();

  return loadPromise;
}

/** Sync from cloud → IDB → RAM */
async function syncFromCloud(): Promise<void> {
  try {
    const entries = await fetchAllFromCloud();
    if (entries.length === 0) return;

    ramEntries = entries;
    await writeEntriesToIDB(entries);
    await setLastSyncTime(Date.now());
    
    console.log(`[KBCache] ☁️ Synced ${entries.length} KB entries from cloud`);
  } catch (e) {
    console.warn("[KBCache] Sync failed:", e);
  }
}

// ─── Public API ─────────────────────────────────────────────────────

/** Ensure cache is ready (call before queries) */
export async function ensureKBCache(): Promise<void> {
  await initCache();
}

/** Get all active entries for a given age (from RAM, <1ms) */
export function getEntriesForAge(childAge: number): KBEntry[] {
  return ramEntries.filter(e => e.age_min <= childAge && e.age_max >= childAge);
}

/** Get all cached entries (for debug) */
export function getAllCachedEntries(): KBEntry[] {
  return ramEntries;
}

/** Get cache stats */
export function getCacheStats(): { total: number; loaded: boolean; lastSync: Promise<number> } {
  return {
    total: ramEntries.length,
    loaded: isLoaded,
    lastSync: getLastSyncTime(),
  };
}

/** Force a re-sync from cloud */
export async function forceKBSync(): Promise<number> {
  await syncFromCloud();
  return ramEntries.length;
}

/** Cleanup */
export function destroyKBCache() {
  if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
  ramEntries = [];
  isLoaded = false;
  loadPromise = null;
}
