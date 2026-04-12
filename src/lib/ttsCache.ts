/**
 * Proactive TTS Cache — Pre-downloads audio for offline phrases while online.
 * 
 * Uses IndexedDB for persistent storage (survives reload/close).
 * Pre-fetches greetings, farewells, encouragements, and common responses
 * so they play instantly when offline (no Piper fallback needed).
 * 
 * Strategy:
 * 1. On app start (online) → background-fetch priority phrases
 * 2. On voice profile change → re-cache for new voice
 * 3. On network restore → top-up any missing entries
 * 4. Playback: check persistent cache → memory cache → fetch live
 */

import type { VoiceProfile, Emotion } from "./voicePipeline";

const DB_NAME = "bobby-tts-cache";
const DB_VERSION = 1;
const STORE_NAME = "audio";

// ─── IndexedDB helpers ──────────────────────────────────────
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<ArrayBuffer | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ?? undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key: string, value: ArrayBuffer): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbKeys(): Promise<string[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAllKeys();
    req.onsuccess = () => resolve((req.result as string[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

async function idbClear(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ─── Cache key ──────────────────────────────────────────────
export function makeCacheKey(text: string, profile: VoiceProfile): string {
  return `${profile}:${text.toLowerCase().trim().replace(/\s+/g, " ")}`;
}

// ─── Priority phrases to pre-cache ──────────────────────────
// These are the most common offline responses — cached first
function getPriorityPhrases(childName: string): string[] {
  const n = childName || "mon ami";
  return [
    // Greetings (most used)
    `Coucou ${n} ! Content de te voir !`,
    `Salut ${n} ! Tu veux jouer ou discuter ?`,
    `Hey ! Trop content ! On fait quoi aujourd'hui ?`,
    `Coucou ! Je suis là ! Allez, on s'amuse ?`,
    `Salut ! Tu vas bien ? Je suis prêt quand tu veux !`,
    // Wake / listening
    "Oui ? Je t'écoute !",
    "Je suis là ! Dis-moi !",
    "Oui oui ! Qu'est-ce qu'il y a ?",
    // Farewell
    `Au revoir ${n} ! À très bientôt !`,
    `Bonne nuit ${n} ! Fais de beaux rêves !`,
    `À bientôt ${n} ! C'était trop bien !`,
    // Encouragement
    "Bravo ! Bien joué !",
    `Tu es fort ${n} !`,
    "Génial ! Super !",
    "Wow ! Incroyable !",
    "Tu peux le faire !",
    "Je crois en toi !",
    // Emotion support
    `Oh, je suis là ${n}. Ça va aller, je suis avec toi.`,
    `C'est pas grave ${n}. Tu peux recommencer !`,
    "Respire doucement. Je reste avec toi. Tout va bien.",
    // Identity
    `Je suis Bobby, ton copain ! Et toi c'est ${n}, je le sais bien !`,
    // Simple responses
    "Super ! Alors on continue !",
    "Pas de souci ! Tu veux faire autre chose ?",
    // Not understood
    "Hmm, je n'ai pas bien compris. Tu peux répéter ?",
    "J'ai pas tout capté ! Redis-moi ?",
    // Calm
    `Tout va bien ${n}.`,
    "Respire doucement.",
    "Je suis là. Toujours là.",
    // Fallback
    `Je ne suis pas sûr de comprendre, mais on peut jouer ensemble !`,
    // Error recovery
    "Petit souci. Réessaie !",
    "Une seconde.",
    // Games intro
    "Devinette ! Je suis jaune et je brille dans le ciel. Qui suis-je ?",
    "Vrai ou Faux ? Les dauphins dorment avec un œil ouvert.",
    "Quiz animaux ! Quel animal est le plus rapide du monde ? Indice : Il a des taches et court très très vite !",
  ];
}

// ─── Fetch TTS audio (raw, for caching) — uses Piper TTS locally ───
async function fetchRawTTS(text: string, voiceProfile: VoiceProfile): Promise<ArrayBuffer> {
  // Import piperSpeak dynamically to avoid circular deps
  const { piperSpeak } = await import("./piperTTS");
  const blobUrl = await piperSpeak(text, voiceProfile);
  const response = await fetch(blobUrl);
  URL.revokeObjectURL(blobUrl);
  return response.arrayBuffer();
}

// ─── Public API ─────────────────────────────────────────────

/** Check if a phrase is in the persistent cache */
export async function getCachedTTSAudio(text: string, profile: VoiceProfile): Promise<string | null> {
  try {
    const key = makeCacheKey(text, profile);
    const buffer = await idbGet(key);
    if (!buffer) return null;
    const blob = new Blob([buffer], { type: "audio/mpeg" });
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

/** Cache progress tracking */
let cacheProgress = { total: 0, done: 0, running: false };
export function getCacheProgress() { return { ...cacheProgress }; }

/**
 * Pre-download priority phrases for offline use.
 * Runs in background, non-blocking, with throttling.
 */
export async function preloadOfflineTTSCache(
  profile: VoiceProfile,
  childName: string,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  if (cacheProgress.running) return; // Already running
  if (!navigator.onLine) return; // Can't cache when offline

  const phrases = getPriorityPhrases(childName);
  cacheProgress = { total: phrases.length, done: 0, running: true };

  // Check which phrases are already cached
  let existingKeys: Set<string>;
  try {
    existingKeys = new Set(await idbKeys());
  } catch {
    existingKeys = new Set();
  }

  const toCacheList = phrases.filter(p => !existingKeys.has(makeCacheKey(p, profile)));

  if (toCacheList.length === 0) {
    cacheProgress = { total: phrases.length, done: phrases.length, running: false };
    onProgress?.(phrases.length, phrases.length);
    console.log("[TTSCache] ✅ All priority phrases already cached");
    return;
  }

  console.log(`[TTSCache] 🔄 Pre-caching ${toCacheList.length} phrases for "${profile}"...`);
  cacheProgress.done = phrases.length - toCacheList.length;
  onProgress?.(cacheProgress.done, cacheProgress.total);

  // Fetch in batches of 2 to avoid hammering the API
  const BATCH_SIZE = 2;
  for (let i = 0; i < toCacheList.length; i += BATCH_SIZE) {
    if (!navigator.onLine) {
      console.log("[TTSCache] ⚠️ Lost network, stopping cache");
      break;
    }

    const batch = toCacheList.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (text) => {
        const buffer = await fetchRawTTS(text, profile);
        await idbPut(makeCacheKey(text, profile), buffer);
      })
    );

    results.forEach((r, idx) => {
      if (r.status === "fulfilled") {
        cacheProgress.done++;
      } else {
        console.warn(`[TTSCache] Failed to cache: "${batch[idx].slice(0, 40)}..."`, r.reason);
      }
    });

    onProgress?.(cacheProgress.done, cacheProgress.total);

    // Small delay between batches to not block the main thread
    if (i + BATCH_SIZE < toCacheList.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  cacheProgress.running = false;
  console.log(`[TTSCache] ✅ Done! ${cacheProgress.done}/${cacheProgress.total} cached`);
}

/** Clear all cached TTS audio */
export async function clearTTSCache(): Promise<void> {
  try {
    await idbClear();
    console.log("[TTSCache] 🗑️ Cache cleared");
  } catch (e) {
    console.warn("[TTSCache] Failed to clear cache:", e);
  }
}

/** Get approximate cache size info */
export async function getCacheStats(): Promise<{ count: number }> {
  try {
    const keys = await idbKeys();
    return { count: keys.length };
  } catch {
    return { count: 0 };
  }
}
