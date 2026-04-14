import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Image as ImageIcon, Music2, Pencil, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { saveMusicPackItems, type EditableMusicPackItem } from "@/lib/adminStoreApi";

interface MusicTracksEditorProps {
  adminCode: string;
  contentId: string;
  contentName: string;
  onBack: () => void;
}

interface MusicTrackRow extends EditableMusicPackItem {
  id: string;
  artist: string;
  file_path: string | null;
  trigger_phrases: string[];
  category: string;
  age_min: number;
  age_max: number;
  sort_order: number;
  is_active: boolean;
}

interface StoreContentMetaItem {
  track_id?: string;
  title?: string;
  description?: string;
  emoji?: string;
  image_url?: string;
}

function normalizeKey(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function buildPackItems(tracks: MusicTrackRow[]): EditableMusicPackItem[] {
  return tracks.map((track) => ({
    track_id: track.id,
    title: track.title,
    description: track.description || "",
    emoji: track.emoji || "🎵",
    image_url: track.image_url || "",
    has_audio: Boolean(track.file_path),
    artist: track.artist,
    file_path: track.file_path || undefined,
    category: track.category,
    trigger_phrases: track.trigger_phrases || [],
    sort_order: track.sort_order,
    is_active: track.is_active,
  }));
}

export default function MusicTracksEditor({ adminCode, contentId, contentName, onBack }: MusicTracksEditorProps) {
  const [tracks, setTracks] = useState<MusicTrackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingTrack, setEditingTrack] = useState<MusicTrackRow | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTracks = useCallback(async () => {
    setLoading(true);

    const [tracksRes, packRes] = await Promise.all([
      supabase
        .from("music_tracks")
        .select("id, title, artist, file_path, trigger_phrases, category, age_min, age_max, sort_order, is_active")
        .eq("content_id", contentId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("store_content")
        .select("content_items")
        .eq("id", contentId)
        .single(),
    ]);

    if (tracksRes.error) {
      toast.error(tracksRes.error.message);
      setTracks([]);
      setLoading(false);
      return;
    }

    const metaItems = (packRes.data?.content_items || []) as StoreContentMetaItem[];
    const merged = (tracksRes.data || []).map((track) => {
      const meta =
        metaItems.find((item) => item.track_id === track.id) ||
        metaItems.find((item) => normalizeKey(item.title) === normalizeKey(track.title));

      return {
        ...track,
        track_id: track.id,
        description: meta?.description || "",
        emoji: meta?.emoji || "🎵",
        image_url: meta?.image_url || "",
      } satisfies MusicTrackRow;
    });

    setTracks(merged);
    setLoading(false);
  }, [contentId]);

  useEffect(() => {
    void fetchTracks();
  }, [fetchTracks]);

  const totalWithAudio = useMemo(() => tracks.filter((track) => track.file_path).length, [tracks]);

  const handleSaveTrack = async () => {
    if (!editingTrack) return;
    setSaving(true);

    try {
      const nextTracks = tracks.map((track) =>
        track.id === editingTrack.id
          ? {
              ...track,
              description: editingTrack.description || "",
              emoji: editingTrack.emoji || "🎵",
              image_url: editingTrack.image_url || "",
            }
          : track,
      );

      await saveMusicPackItems(adminCode, contentId, buildPackItems(nextTracks));
      setTracks(nextTracks);
      setEditingTrack(null);
      toast.success("Fiche musique mise à jour !");
    } catch (error: any) {
      toast.error(error.message || "Impossible d’enregistrer la fiche musique");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editingTrack) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Fichier image requis");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `music-covers/${contentId}/${editingTrack.id}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("store-covers").upload(path, file, { upsert: true });
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("store-covers").getPublicUrl(path);
    setEditingTrack((current) => current ? { ...current, image_url: data.publicUrl } : current);
    toast.success("Image uploadée !");
    setUploading(false);
  };

  if (editingTrack) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(240,60%,8%)] to-[hsl(250,40%,15%)] p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setEditingTrack(null)} className="text-white/70 p-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-white">🎵 Modifier la fiche musique</h1>
              <p className="text-xs text-white/40">{editingTrack.title}</p>
            </div>
          </div>

          <div className="bg-white/[0.04] backdrop-blur-xl rounded-[20px] p-5 border border-white/10 space-y-4">
            <div>
              <label className="text-xs text-white/50 mb-2 block font-bold">🖼️ Image de la musique</label>
              <div className="flex gap-3 items-start">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-28 h-28 rounded-2xl bg-white/5 border-2 border-dashed border-white/15 flex flex-col items-center justify-center cursor-pointer hover:border-white/30 transition-all overflow-hidden group"
                >
                  {editingTrack.image_url ? (
                    <img src={editingTrack.image_url} alt={editingTrack.title} className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <ImageIcon className="w-6 h-6 text-white/20 group-hover:text-white/40 transition-colors" />
                      <span className="text-[8px] text-white/20 mt-1">Upload</span>
                    </>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <div className="flex-1 space-y-1">
                  <p className="text-[9px] text-white/30">JPG/PNG recommandé</p>
                  {editingTrack.image_url && (
                    <Button variant="ghost" size="sm" onClick={() => setEditingTrack((current) => current ? { ...current, image_url: "" } : current)} className="text-red-400 text-[10px] h-6 px-2">
                      <Trash2 className="w-3 h-3 mr-1" /> Supprimer
                    </Button>
                  )}
                  {uploading && <p className="text-[10px] text-blue-400 animate-pulse">Upload…</p>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Titre audio</label>
                <Input value={editingTrack.title} disabled className="bg-white/5 border-white/10 text-white/60" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Artiste</label>
                <Input value={editingTrack.artist} disabled className="bg-white/5 border-white/10 text-white/60" />
              </div>
            </div>

            <div>
              <label className="text-xs text-white/50 mb-1 block">Emoji</label>
              <Input
                value={editingTrack.emoji || "🎵"}
                onChange={(e) => setEditingTrack((current) => current ? { ...current, emoji: e.target.value } : current)}
                placeholder="🎵"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <div>
              <label className="text-xs text-white/50 mb-1 block">Description</label>
              <Textarea
                value={editingTrack.description || ""}
                onChange={(e) => setEditingTrack((current) => current ? { ...current, description: e.target.value } : current)}
                placeholder="Description visible dans le store…"
                className="bg-white/10 border-white/20 text-white"
                rows={4}
              />
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/5 space-y-2">
              <p className="text-[11px] font-bold text-white">Infos audio</p>
              <p className="text-[10px] text-white/40">Fichier : {editingTrack.file_path || "Aucun MP3 lié"}</p>
              <div className="flex flex-wrap gap-1.5">
                {(editingTrack.trigger_phrases || []).map((phrase) => (
                  <span key={phrase} className="px-2 py-0.5 rounded-full bg-white/5 text-white/40 text-[9px] font-bold">
                    {phrase}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSaveTrack} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 flex-1 font-bold">
                <Save className="w-4 h-4 mr-1.5" /> {saving ? "…" : "Sauvegarder"}
              </Button>
              <Button variant="ghost" onClick={() => setEditingTrack(null)} className="text-white/50">Annuler</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(240,60%,8%)] to-[hsl(250,40%,15%)] p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onBack} className="text-white/70 p-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-white">🎵 Musiques — {contentName}</h1>
              <p className="text-white/40 text-xs">{tracks.length} pistes • {totalWithAudio} MP3 prêts</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-white/30 text-sm animate-pulse">Chargement…</div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-12">
            <Music2 className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/30 text-sm">Aucune musique liée à ce pack</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tracks.map((track) => (
              <div key={track.id} className="bg-white/[0.04] backdrop-blur-xl rounded-[16px] p-3 border border-white/[0.06] hover:bg-white/[0.06] transition-all group">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center shrink-0 text-2xl">
                    {track.image_url ? (
                      <img src={track.image_url} alt={track.title} className="w-full h-full object-cover" />
                    ) : (
                      <span>{track.emoji || "🎵"}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[12px] font-bold text-white truncate">{track.title}</p>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${track.file_path ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-white/30"}`}>
                        {track.file_path ? "MP3 OK" : "Sans MP3"}
                      </span>
                      {!track.is_active && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-300 font-bold">OFF</span>}
                    </div>
                    <p className="text-[10px] text-white/40 mt-0.5">{track.artist} • {track.category}</p>
                    <p className="text-[10px] text-white/60 mt-1 line-clamp-2">
                      {track.description || "Aucune description store pour cette musique."}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(track.trigger_phrases || []).slice(0, 4).map((phrase) => (
                        <span key={phrase} className="px-1.5 py-0.5 rounded bg-white/5 text-white/30 text-[8px] font-bold">
                          {phrase}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Button variant="ghost" size="sm" onClick={() => setEditingTrack(track)} className="text-white/40 hover:text-white h-8 w-8 p-0 shrink-0">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
