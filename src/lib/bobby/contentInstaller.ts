/**
 * Content Installer — Connects Bobby Store to Bobby's Brain
 * 
 * When a pack is installed:
 * 1. Fetches content_data for the pack from cloud
 * 2. Injects Q&A entries into knowledge_base (tagged with source_content_id)
 * 3. Caches content in IndexedDB for offline use
 * 
 * When uninstalled:
 * 1. Removes Q&A entries from knowledge_base
 * 2. Clears local cache
 */

import { supabase } from "@/integrations/supabase/client";
import { getCloudUsage, estimatePackSizeKB, formatStorage } from "@/lib/bobby/cloudQuota";

// ─── IndexedDB Cache ────────────────────────────────────────────────

const DB_NAME = "bobby-content-cache";
const DB_VERSION = 1;
const STORE_NAME = "packs";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "content_id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function cachePackLocally(contentId: string, data: any[]) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ content_id: contentId, items: data, cached_at: new Date().toISOString() });
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
    db.close();
  } catch (e) {
    console.warn("[ContentInstaller] Cache write failed:", e);
  }
}

async function clearLocalCache(contentId: string) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(contentId);
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
    db.close();
  } catch (e) {
    console.warn("[ContentInstaller] Cache clear failed:", e);
  }
}

export async function getCachedPack(contentId: string): Promise<any[] | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(contentId);
    const result = await new Promise<any>((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = rej; });
    db.close();
    return result?.items || null;
  } catch {
    return null;
  }
}

export async function getLocalCacheSize(): Promise<{ totalPacks: number; estimatedKB: number }> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const all = await new Promise<any[]>((res, rej) => {
      const req = store.getAll();
      req.onsuccess = () => res(req.result);
      req.onerror = rej;
    });
    db.close();
    const sizeStr = JSON.stringify(all);
    return { totalPacks: all.length, estimatedKB: Math.round(new Blob([sizeStr]).size / 1024) };
  } catch {
    return { totalPacks: 0, estimatedKB: 0 };
  }
}

// ─── Install / Uninstall Logic ──────────────────────────────────────

export interface InstallResult {
  success: boolean;
  itemsInstalled: number;
  cachedLocally: boolean;
  error?: string;
}

/**
 * Install a content pack: fetch data, inject into knowledge_base, cache locally
 */
export async function installContentPack(contentId: string, childName: string): Promise<InstallResult> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, itemsInstalled: 0, cachedLocally: false, error: "Non connecté" };

    // 1. Mark as installed in installed_content (uses unique constraint)
    const { error: installError } = await supabase
      .from("installed_content")
      .upsert(
        { child_name: childName, content_id: contentId, user_id: user.id },
        { onConflict: "child_name,content_id" }
      );
    
    if (installError) {
      console.warn("[ContentInstaller] Upsert failed:", installError.message);
      return { success: false, itemsInstalled: 0, cachedLocally: false, error: installError.message };
    }

    // 2. Fetch content data from cloud
    const { data: contentData, error: fetchError } = await supabase
      .from("content_data")
      .select("*")
      .eq("content_id", contentId)
      .order("sort_order", { ascending: true });

    if (fetchError || !contentData?.length) {
      // Rollback: remove from installed_content since pack is empty
      await supabase.from("installed_content").delete().eq("child_name", childName).eq("content_id", contentId);
      console.warn("[ContentInstaller] Pack vide, installation annulée:", contentId);
      return { success: false, itemsInstalled: 0, cachedLocally: false, error: "Ce pack ne contient pas encore de contenu. Installation annulée." };
    }

    // 3. Inject Q&A entries into knowledge_base
    const qaItems = contentData.filter(d => d.data_type === "qa" && d.question && d.answer);
    
    if (qaItems.length > 0) {
      // First remove any existing entries from this pack
      await supabase.from("knowledge_base").delete().eq("source_content_id", contentId);
      
      // Insert fresh entries
      const kbEntries = qaItems.map(item => ({
        question: item.question,
        answer: item.answer,
        keywords: item.keywords || [],
        category: "store_content",
        age_min: item.age_min,
        age_max: item.age_max,
        emotion: item.emotion || "happy",
        priority: item.priority || 5,
        is_active: true,
        source_content_id: contentId,
      }));

      const { error: kbError } = await supabase.from("knowledge_base").insert(kbEntries);
      if (kbError) {
        console.warn("[ContentInstaller] KB injection failed:", kbError.message);
      } else {
        console.log(`[ContentInstaller] ✅ Injected ${kbEntries.length} Q&A into Bobby's brain`);
      }
    }

    // 4. Cache locally in IndexedDB
    await cachePackLocally(contentId, contentData);

    // 5. Update install count
    const { data: storeItem } = await supabase.from("store_content").select("install_count").eq("id", contentId).single();
    if (storeItem) {
      await supabase.from("store_content").update({ install_count: (storeItem.install_count || 0) + 1 }).eq("id", contentId);
    }

    console.log(`[ContentInstaller] ✅ Pack installed: ${contentData.length} items, ${qaItems.length} Q&A injected`);
    return { success: true, itemsInstalled: contentData.length, cachedLocally: true };

  } catch (e: any) {
    console.error("[ContentInstaller] Install failed:", e);
    return { success: false, itemsInstalled: 0, cachedLocally: false, error: e.message };
  }
}

/**
 * Uninstall a content pack: remove from knowledge_base, clear cache
 */
export async function uninstallContentPack(contentId: string, childName: string): Promise<{ success: boolean }> {
  try {
    // 1. Remove from installed_content
    await supabase.from("installed_content").delete().eq("child_name", childName).eq("content_id", contentId);

    // 2. Remove injected Q&A from knowledge_base
    const { error: kbError } = await supabase.from("knowledge_base").delete().eq("source_content_id", contentId);
    if (kbError) {
      console.warn("[ContentInstaller] KB cleanup failed:", kbError.message);
    } else {
      console.log(`[ContentInstaller] 🗑️ Removed Q&A from Bobby's brain for pack:`, contentId);
    }

    // 3. Clear local cache
    await clearLocalCache(contentId);

    console.log(`[ContentInstaller] ✅ Pack uninstalled:`, contentId);
    return { success: true };

  } catch (e) {
    console.error("[ContentInstaller] Uninstall failed:", e);
    return { success: false };
  }
}
