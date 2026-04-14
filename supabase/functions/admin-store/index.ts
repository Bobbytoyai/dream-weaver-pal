import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_ADMIN_CODE = "bobby2026";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];
}

function sanitizeMusicPackItems(items: unknown) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
      const title = asString(row.title).trim();
      const trackId = asString(row.track_id || row.id).trim();

      if (!title || !trackId) return null;

      return {
        track_id: trackId,
        title,
        description: asString(row.description),
        emoji: asString(row.emoji, "🎵") || "🎵",
        image_url: asString(row.image_url),
        has_audio: asBoolean(row.has_audio, Boolean(row.file_path)),
        artist: asString(row.artist),
        file_path: asString(row.file_path),
        category: asString(row.category, "musique") || "musique",
        trigger_phrases: asStringArray(row.trigger_phrases),
        sort_order: asNumber(row.sort_order, 0),
        is_active: row.is_active === undefined ? true : asBoolean(row.is_active),
      };
    })
    .filter(Boolean);
}

function sanitizeStoreItem(item: Record<string, unknown>) {
  const hasContentItems = Array.isArray(item.content_items);
  return {
    slug: asString(item.slug).trim(),
    name: asString(item.name).trim(),
    emoji: asString(item.emoji, "📦") || "📦",
    description: asString(item.description),
    detailed_description: asString(item.detailed_description),
    category: asString(item.category, "jeux") || "jeux",
    age_min: asNumber(item.age_min, 3),
    age_max: asNumber(item.age_max, 12),
    tags: asStringArray(item.tags),
    size_label: asString(item.size_label, "1 Mo") || "1 Mo",
    is_new: asBoolean(item.is_new),
    is_popular: asBoolean(item.is_popular),
    is_featured: asBoolean(item.is_featured),
    is_active: item.is_active === undefined ? true : asBoolean(item.is_active),
    is_premium: asBoolean(item.is_premium),
    cover_image_url: asString(item.cover_image_url),
    creator_name: asString(item.creator_name, "Équipe Bobby") || "Équipe Bobby",
    creator_role: asString(item.creator_role, "Éducation & Divertissement") || "Éducation & Divertissement",
    version_label: asString(item.version_label, "1.0") || "1.0",
    changelog: asString(item.changelog),
    rating: asNumber(item.rating, 4.5),
    learning_objectives: asStringArray(item.learning_objectives),
    skills_developed: asStringArray(item.skills_developed),
    duration_estimate: asString(item.duration_estimate, "10-15 min") || "10-15 min",
    difficulty_level: asString(item.difficulty_level, "adaptatif") || "adaptatif",
    languages: (() => {
      const values = asStringArray(item.languages);
      return values.length ? values : ["fr"];
    })(),
    last_updated_at: new Date().toISOString(),
    ...(hasContentItems ? { content_items: sanitizeMusicPackItems(item.content_items) } : {}),
    ...(typeof item.content_count === "number" ? { content_count: asNumber(item.content_count, 0) } : {}),
  };
}

function sanitizeContentDataItem(contentId: string, item: Record<string, unknown>, fallbackSortOrder = 1) {
  return {
    content_id: contentId,
    data_type: asString(item.data_type, "qa") || "qa",
    title: asString(item.title),
    question: asString(item.question),
    answer: asString(item.answer),
    body: asString(item.body),
    keywords: asStringArray(item.keywords),
    emotion: asString(item.emotion, "happy") || "happy",
    age_min: asNumber(item.age_min, 3),
    age_max: asNumber(item.age_max, 12),
    priority: asNumber(item.priority, 5),
    sort_order: asNumber(item.sort_order, fallbackSortOrder),
    metadata: item.metadata && typeof item.metadata === "object" ? item.metadata : {},
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = asString(body.action);
    const adminCode = asString(body.adminCode);

    if (action === "ping") {
      return json({ ok: true });
    }

    const expectedAdminCode = Deno.env.get("ADMIN_ACCESS_CODE") || DEFAULT_ADMIN_CODE;
    if (!adminCode || adminCode !== expectedAdminCode) {
      return json({ error: "Accès admin refusé" }, 401);
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    switch (action) {
      case "save_store_item": {
        const item = body.item && typeof body.item === "object" ? body.item as Record<string, unknown> : {};
        const payload = sanitizeStoreItem(item);

        if (!payload.slug || !payload.name) {
          return json({ error: "Nom et slug requis" }, 400);
        }

        if (asString(item.id)) {
          const { error } = await sb.from("store_content").update(payload).eq("id", asString(item.id));
          if (error) throw error;
          return json({ ok: true, id: asString(item.id) });
        }

        const { data, error } = await sb.from("store_content").insert({
          ...payload,
          content_count: asNumber(item.content_count, 0),
          content_items: Array.isArray(item.content_items) ? sanitizeMusicPackItems(item.content_items) : [],
        }).select("id").single();

        if (error) throw error;
        return json({ ok: true, id: data?.id });
      }

      case "delete_store_item": {
        const id = asString(body.id);
        if (!id) return json({ error: "id requis" }, 400);

        const { data: storeItem } = await sb.from("store_content").select("category").eq("id", id).single();
        if (storeItem?.category === "musique") {
          await sb.from("music_tracks").update({ content_id: null }).eq("content_id", id);
        }

        await sb.from("content_data").delete().eq("content_id", id);
        const { error } = await sb.from("store_content").delete().eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }

      case "save_content_data_item": {
        const contentId = asString(body.contentId);
        const item = body.item && typeof body.item === "object" ? body.item as Record<string, unknown> : {};
        if (!contentId) return json({ error: "contentId requis" }, 400);

        const fallbackSortOrder = asNumber(item.sort_order, 1);
        const payload = sanitizeContentDataItem(contentId, item, fallbackSortOrder);

        if (asString(item.id)) {
          const { error } = await sb.from("content_data").update(payload).eq("id", asString(item.id));
          if (error) throw error;
        } else {
          const { error } = await sb.from("content_data").insert(payload);
          if (error) throw error;
        }

        const { count } = await sb.from("content_data").select("id", { count: "exact", head: true }).eq("content_id", contentId);
        await sb.from("store_content").update({ content_count: count ?? 0, last_updated_at: new Date().toISOString() }).eq("id", contentId);

        return json({ ok: true, count: count ?? 0 });
      }

      case "delete_content_data_item": {
        const contentId = asString(body.contentId);
        const itemId = asString(body.itemId);
        if (!contentId || !itemId) return json({ error: "contentId et itemId requis" }, 400);

        const { error } = await sb.from("content_data").delete().eq("id", itemId);
        if (error) throw error;

        const { count } = await sb.from("content_data").select("id", { count: "exact", head: true }).eq("content_id", contentId);
        await sb.from("store_content").update({ content_count: count ?? 0, last_updated_at: new Date().toISOString() }).eq("id", contentId);

        return json({ ok: true, count: count ?? 0 });
      }

      case "move_content_data_item": {
        const sourceId = asString(body.sourceId);
        const targetId = asString(body.targetId);
        const sourceSortOrder = asNumber(body.sourceSortOrder, 0);
        const targetSortOrder = asNumber(body.targetSortOrder, 0);

        if (!sourceId || !targetId) return json({ error: "sourceId et targetId requis" }, 400);

        const [aRes, bRes] = await Promise.all([
          sb.from("content_data").update({ sort_order: targetSortOrder }).eq("id", sourceId),
          sb.from("content_data").update({ sort_order: sourceSortOrder }).eq("id", targetId),
        ]);

        if (aRes.error) throw aRes.error;
        if (bRes.error) throw bRes.error;

        return json({ ok: true });
      }

      case "save_music_pack_items": {
        const contentId = asString(body.contentId);
        if (!contentId) return json({ error: "contentId requis" }, 400);

        const contentItems = sanitizeMusicPackItems(body.items);
        const { error } = await sb
          .from("store_content")
          .update({
            content_items: contentItems,
            content_count: contentItems.length,
            last_updated_at: new Date().toISOString(),
          })
          .eq("id", contentId);

        if (error) throw error;
        return json({ ok: true, count: contentItems.length });
      }

      default:
        return json({ error: `Action non supportée: ${action}` }, 400);
    }
  } catch (error) {
    console.error("admin-store error:", error);
    return json({ error: error instanceof Error ? error.message : "Erreur inconnue" }, 500);
  }
});
