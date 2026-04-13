import { supabase } from "@/integrations/supabase/client";
import type { ParentSettings } from "@/components/parentSettings";

// ─── Types ──────────────────────────────────────────────────────
export interface CloudProfile {
  id: string;
  sync_code: string;
  child_name: string;
  parent_settings: ParentSettings;
  child_memory_snapshot: Record<string, unknown>;
  device_info: string | null;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface SyncResult {
  success: boolean;
  profile?: CloudProfile;
  error?: string;
  isNew?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────

/** Generate a short, readable sync code (e.g. BOBBY-A3F9-K2M1) */
function generateSyncCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No 0/O/1/I
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `BOBBY-${seg()}-${seg()}`;
}

/** Get device fingerprint */
function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  const screen = `${window.screen.width}x${window.screen.height}`;
  const lang = navigator.language;
  return `${ua.slice(0, 80)} | ${screen} | ${lang}`;
}

const SYNC_CODE_KEY = "bobby_cloud_sync_code";

/** Get locally stored sync code */
export function getLocalSyncCode(): string | null {
  return localStorage.getItem(SYNC_CODE_KEY);
}

/** Store sync code locally */
export function setLocalSyncCode(code: string): void {
  localStorage.setItem(SYNC_CODE_KEY, code);
}

/** Clear local sync code */
export function clearLocalSyncCode(): void {
  localStorage.removeItem(SYNC_CODE_KEY);
}

// ─── Core Sync Functions ────────────────────────────────────────

/** Save current state to Bobby Cloud (create or update) */
export async function saveToCloud(
  childName: string,
  parentSettings: ParentSettings,
  childMemory?: Record<string, unknown>,
): Promise<SyncResult> {
  try {
    let syncCode = getLocalSyncCode();
    const deviceInfo = getDeviceInfo();
    const now = new Date().toISOString();

    if (syncCode) {
      // Try to update existing profile
      const { data: existing } = await supabase
        .from("cloud_profiles")
        .select("*")
        .eq("sync_code", syncCode)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("cloud_profiles")
          .update({
            child_name: childName,
            parent_settings: parentSettings as unknown as Record<string, unknown>,
            child_memory_snapshot: childMemory || {},
            device_info: deviceInfo,
            last_synced_at: now,
            updated_at: now,
          })
          .eq("sync_code", syncCode)
          .select()
          .single();

        if (error) return { success: false, error: error.message };
        return { success: true, profile: data as unknown as CloudProfile, isNew: false };
      }
    }

    // Create new profile
    syncCode = generateSyncCode();
    const { data, error } = await supabase
      .from("cloud_profiles")
      .insert({
        sync_code: syncCode,
        child_name: childName,
        parent_settings: parentSettings as unknown as Record<string, unknown>,
        child_memory_snapshot: childMemory || {},
        device_info: deviceInfo,
        last_synced_at: now,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    setLocalSyncCode(syncCode);
    return { success: true, profile: data as unknown as CloudProfile, isNew: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/** Restore from Bobby Cloud using a sync code */
export async function restoreFromCloud(syncCode: string): Promise<SyncResult> {
  try {
    const code = syncCode.trim().toUpperCase();
    const { data, error } = await supabase
      .from("cloud_profiles")
      .select("*")
      .eq("sync_code", code)
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "Code de synchronisation introuvable" };

    setLocalSyncCode(code);
    return { success: true, profile: data as unknown as CloudProfile };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/** Get current cloud profile status */
export async function getCloudProfile(): Promise<CloudProfile | null> {
  const syncCode = getLocalSyncCode();
  if (!syncCode) return null;

  const { data } = await supabase
    .from("cloud_profiles")
    .select("*")
    .eq("sync_code", syncCode)
    .maybeSingle();

  return (data as unknown as CloudProfile) || null;
}

/** Delete cloud profile */
export async function deleteCloudProfile(): Promise<boolean> {
  const syncCode = getLocalSyncCode();
  if (!syncCode) return false;

  const { error } = await supabase
    .from("cloud_profiles")
    .delete()
    .eq("sync_code", syncCode);

  if (!error) clearLocalSyncCode();
  return !error;
}

/** Format last sync time */
export function formatSyncTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days} jour${days > 1 ? "s" : ""}`;
}
