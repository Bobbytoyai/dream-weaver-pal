import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Image as ImageIcon, Music2, Pencil, Save, Trash2, Upload, Volume2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { saveMusicPackItems, updateMusicTrack, type EditableMusicPackItem } from "@/lib/adminStoreApi";

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

/* ── Drag-and-drop MP3 zone ── */
function Mp3DropZone({ trackId, filePath, uploading, onUpload, onRemove }: {
  trackId: string;
  filePath: string | null;
  uploading: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "audio/mpeg" || file.name.endsWith(".mp3"))) {
      onUpload(file);
    } else {
      toast.error("Seuls les fichiers MP3 sont acceptés");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = "";
  };

  if (uploading) {
    return (
      <div className="rounded-xl border-2 border-dashed border-blue-500/30 bg-blue-500/5 p-3 flex items-center justify-center gap-2">
        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-[11px] text-blue-400 font-bold">Upload en cours…</span>
      </div>
    );
  }

  if (filePath) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-center gap-3">
        <Volume2 className="w-5 h-5 text-emerald-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-emerald-300">MP3 lié</p>
          <p className="text-[9px] text-white/40 truncate">{filePath}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onRemove} className="text-red-400/60 hover:text-red-400 h-7 w-7 p-0 shrink-0">
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`rounded-xl border-2 border-dashed p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${
        dragOver
          ? "border-blue-400 bg-blue-500/10 scale-[1.01]"
          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
      }`}
    >
      <Upload className={`w-6 h-6 mb-1.5 ${dragOver ? "text-blue-400" : "text-white/20"}`} />
      <p className={`text-[11px] font-bold ${dragOver ? "text-blue-300" : "text-white/30"}`}>
        Glisser un MP3 ici
      </p>
      <p className="text-[9px] text-white/20 mt-0.5">ou cliquer pour parcourir</p>
      <input ref={inputRef} type="file" accept="audio/mpeg,.mp3" className="hidden" onChange={handleFileChange} />
    </div>
  );
}

export default function MusicTracksEditor({ adminCode, contentId, contentName, onBack }: MusicTracksEditorProps) {
  const [tracks, setTracks] = useState<MusicTrackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingTrackId, setUploadingTrackId] = useState<string | null>(null);
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

  /* ── MP3 Upload handler ── */
  const handleMp3Upload = async (trackId: string, file: File) => {
    setUploadingTrackId(trackId);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
      const path = `${trackId}-${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("bobby-music")
        .upload(path, file, { upsert: true, contentType: "audio/mpeg" });

      if (uploadError) throw uploadError;

      // Update music_tracks.file_path via edge function (service role)
      await updateMusicTrack(adminCode, trackId, { file_path: path });

      // Update local state
      setTracks((prev) =>
        prev.map((t) => (t.id === trackId ? { ...t, file_path: path } : t)),
      );

      // Sync content_items in store_content
      const updatedTracks = tracks.map((t) =>
        t.id === trackId ? { ...t, file_path: path } : t,
      );
      await saveMusicPackItems(adminCode, contentId, buildPackItems(updatedTracks));

      toast.success(`MP3 uploadé pour "${tracks.find((t) => t.id === trackId)?.title}" !`);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'upload MP3");
    } finally {
      setUploadingTrackId(null);
    }
  };

  const handleRemoveMp3 = async (trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (!track?.file_path) return;
    if (!confirm(`Supprimer le MP3 de "${track.title}" ?`)) return;

    try {
      // Remove from storage
      await supabase.storage.from("bobby-music").remove([track.file_path]);

      // Clear file_path in DB
      await updateMusicTrack(adminCode, trackId, { file_path: "" });

      setTracks((prev) =>
        prev.map((t) => (t.id === trackId ? { ...t, file_path: null } : t)),
      );

      const updatedTracks = tracks.map((t) =>
        t.id === trackId ? { ...t, file_path: null } : t,
      );
      await saveMusicPackItems(adminCode, contentId, buildPackItems(updatedTracks));

      toast.success("MP3 supprimé");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression");
    }
  };

  /* ── Save track metadata ── */
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
      toast.error(error.message || "Impossible d'enregistrer la fiche musique");
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

  /* ── Edit form ── */
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
            {/* Image upload */}
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

            {/* MP3 drop zone */}
            <div>
              <label className="text-xs text-white/50 mb-2 block font-bold">🎧 Fichier MP3</label>
              <Mp3DropZone
                trackId={editingTrack.id}
                filePath={editingTrack.file_path}
                uploading={uploadingTrackId === editingTrack.id}
                onUpload={(file) => handleMp3Upload(editingTrack.id, file)}
                onRemove={() => handleRemoveMp3(editingTrack.id)}
              />
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
              <p className="text-[11px] font-bold text-white">Trigger phrases</p>
              <div className="flex flex-wrap gap-1.5">
                {(editingTrack.trigger_phrases || []).map((phrase) => (
                  <span key={phrase} className="px-2 py-0.5 rounded-full bg-white/5 text-white/40 text-[9px] font-bold">
                    {phrase}
                  </span>
                ))}
                {(editingTrack.trigger_phrases || []).length === 0 && (
                  <span className="text-[9px] text-white/20">Aucune phrase déclencheur</span>
                )}
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

  /* ── List view with inline drop zones ── */
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
          <div className="space-y-3">
            {tracks.map((track) => (
              <div key={track.id} className="bg-white/[0.04] backdrop-blur-xl rounded-[16px] p-3 border border-white/[0.06] hover:bg-white/[0.06] transition-all group">
                <div className="flex items-start gap-3">
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-xl bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center shrink-0 text-2xl">
                    {track.image_url ? (
                      <img src={track.image_url} alt={track.title} className="w-full h-full object-cover" />
                    ) : (
                      <span>{track.emoji || "🎵"}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[12px] font-bold text-white truncate">{track.title}</p>
                      {!track.is_active && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-300 font-bold">OFF</span>}
                    </div>
                    <p className="text-[10px] text-white/40 mt-0.5">{track.artist} • {track.category}</p>
                    <p className="text-[10px] text-white/60 mt-1 line-clamp-2">
                      {track.description || "Aucune description store."}
                    </p>
                  </div>

                  {/* Edit button */}
                  <Button variant="ghost" size="sm" onClick={() => setEditingTrack(track)} className="text-white/40 hover:text-white h-8 w-8 p-0 shrink-0">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Inline MP3 drop zone */}
                <div className="mt-2.5">
                  <Mp3DropZone
                    trackId={track.id}
                    filePath={track.file_path}
                    uploading={uploadingTrackId === track.id}
                    onUpload={(file) => handleMp3Upload(track.id, file)}
                    onRemove={() => handleRemoveMp3(track.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
