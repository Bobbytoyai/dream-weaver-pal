import { supabase } from "@/integrations/supabase/client";

export interface EditableMusicPackItem {
  track_id: string;
  title: string;
  description: string;
  emoji: string;
  image_url?: string;
  has_audio?: boolean;
  artist?: string;
  file_path?: string;
  category?: string;
  trigger_phrases?: string[];
  sort_order?: number;
  is_active?: boolean;
}

type AdminStoreAction =
  | "ping"
  | "save_store_item"
  | "delete_store_item"
  | "save_content_data_item"
  | "delete_content_data_item"
  | "move_content_data_item"
  | "save_music_pack_items"
  | "update_music_track"
  | "deactivate_device"
  | "activate_device"
  | "delete_device";

async function callAdminStore<T>(
  adminCode: string,
  action: AdminStoreAction,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-store", {
    body: {
      adminCode,
      action,
      ...payload,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  return data as T;
}

export async function pingAdminStore(adminCode: string) {
  return callAdminStore<{ ok: boolean }>(adminCode, "ping");
}

export async function saveStoreItem(adminCode: string, item: Record<string, unknown>) {
  return callAdminStore<{ ok: boolean; id?: string }>(adminCode, "save_store_item", { item });
}

export async function deleteStoreItem(adminCode: string, id: string) {
  return callAdminStore<{ ok: boolean }>(adminCode, "delete_store_item", { id });
}

export async function saveContentDataItem(
  adminCode: string,
  contentId: string,
  item: Record<string, unknown>,
) {
  return callAdminStore<{ ok: boolean; count: number }>(adminCode, "save_content_data_item", {
    contentId,
    item,
  });
}

export async function deleteContentDataItem(adminCode: string, contentId: string, itemId: string) {
  return callAdminStore<{ ok: boolean; count: number }>(adminCode, "delete_content_data_item", {
    contentId,
    itemId,
  });
}

export async function moveContentDataItem(
  adminCode: string,
  sourceId: string,
  sourceSortOrder: number,
  targetId: string,
  targetSortOrder: number,
) {
  return callAdminStore<{ ok: boolean }>(adminCode, "move_content_data_item", {
    sourceId,
    sourceSortOrder,
    targetId,
    targetSortOrder,
  });
}

export async function saveMusicPackItems(
  adminCode: string,
  contentId: string,
  items: EditableMusicPackItem[],
) {
  return callAdminStore<{ ok: boolean; count: number }>(adminCode, "save_music_pack_items", {
    contentId,
    items,
  });
}

export async function updateMusicTrack(
  adminCode: string,
  trackId: string,
  updates: Record<string, unknown>,
) {
  return callAdminStore<{ ok: boolean }>(adminCode, "update_music_track", {
    trackId,
    ...updates,
  });
}

export async function deactivateDevice(adminCode: string, bobbyId: string) {
  return callAdminStore<{ ok: boolean }>(adminCode, "deactivate_device", { bobbyId });
}

export async function activateDevice(adminCode: string, bobbyId: string) {
  return callAdminStore<{ ok: boolean }>(adminCode, "activate_device", { bobbyId });
}

export async function deleteDevice(adminCode: string, bobbyId: string) {
  return callAdminStore<{ ok: boolean }>(adminCode, "delete_device", { bobbyId });
}
