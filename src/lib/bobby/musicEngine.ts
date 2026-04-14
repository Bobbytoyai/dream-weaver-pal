/**
 * Bobby Music Engine
 * 
 * Detects music requests, matches to stored tracks,
 * manages playback state, and respects installed/uninstalled content.
 * "Bobby tu es là" is the default/priority track — pre-installed for all users.
 */
import { supabase } from "@/integrations/supabase/client";

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  file_path: string | null;
  duration_seconds: number;
  trigger_phrases: string[];
  category: string;
}

// The ID of the priority track "Bobby tu es là"
const BOBBY_PRIORITY_TRACK_ID = "389c5718-a5fc-4052-8138-35181de5b88e";

// Map music_tracks IDs → store_content IDs for install/uninstall checking
const TRACK_TO_STORE: Record<string, string> = {
  "389c5718-a5fc-4052-8138-35181de5b88e": "4fafa517-6290-4ab1-b20b-5c8137995c0a", // Bobby tu es là
  "cde642b2-dc55-469e-9956-49bb90402001": "bd7d5210-1b8c-46e6-b04d-1a6750ab4d7a", // La Marseillaise
  "711e1121-a905-4c2d-a45e-5206d7debc7d": "6bd89dd3-fede-4af3-b2c8-f04c29e4e7c0", // Frère Bobby
  "3144fb03-d9da-4012-af3e-2cfaf85da4fb": "7aa4412f-fe84-41d6-9f40-e29e387f37cc", // Au Clair de la Lune
  "8672b79c-8e78-43b5-88af-fe8b5268c287": "717a114f-e799-41b5-b4dc-1deb2a95e7e7", // Alouette
  "fabdd6fa-2a51-401b-9f4d-faa6f4a9e851": "c6b9db82-f409-49f9-a8f3-eccd1eafe3a4", // Petit navire
  "8e2a88f7-c594-49f3-aec2-4adb0cf8004a": "8fe7c6ae-4ada-4c72-ac86-93fc9d9aceed", // École amusant
  "eba9d58d-9116-4b30-8fe4-8c1c0bbefa77": "931cb344-ee77-4e53-af99-78d49db2edf0", // Dort doucement
};

interface MusicState {
  isPlaying: boolean;
  currentTrack: MusicTrack | null;
  tracks: MusicTrack[];
  loaded: boolean;
  waitingForReplayAnswer: boolean;
  audio: HTMLAudioElement | null;
  removedTrackIds: Set<string>; // tracks user has uninstalled from store
}

const state: MusicState = {
  isPlaying: false,
  currentTrack: null,
  tracks: [],
  loaded: false,
  waitingForReplayAnswer: false,
  audio: null,
  removedTrackIds: new Set(),
};

// ── Load tracks from DB + check installed content ──
async function ensureLoaded(): Promise<void> {
  if (state.loaded) return;
  try {
    const { data } = await supabase
      .from("music_tracks" as any)
      .select("id, title, artist, file_path, duration_seconds, trigger_phrases, category")
      .eq("is_active", true)
      .order("sort_order");
    state.tracks = (data || []) as unknown as MusicTrack[];
    
    // Check if user has uninstalled the music pack from the store
    await refreshRemovedTracks();
    
    state.loaded = true;
    console.log(`[Music] 🎵 Loaded ${state.tracks.length} tracks, ${state.removedTrackIds.size} removed by user`);
  } catch (e) {
    console.warn("[Music] Failed to load tracks:", e);
  }
}

/** Refresh which tracks the user has removed via the store */
async function refreshRemovedTracks() {
  try {
    const childName = localStorage.getItem("bobby_child_name") || "Ami";
    const storeIds = Object.values(TRACK_TO_STORE);
    
    // Check which music store items are disabled
    const { data: installed } = await supabase
      .from("installed_content")
      .select("content_id, is_enabled")
      .eq("child_name", childName)
      .in("content_id", storeIds);
    
    // Build set of disabled store content IDs
    const disabledStoreIds = new Set<string>();
    if (installed) {
      for (const row of installed) {
        if ((row as any).is_enabled === false) {
          disabledStoreIds.add((row as any).content_id);
        }
      }
    }
    
    // Map back to track IDs
    state.removedTrackIds = new Set<string>();
    for (const [trackId, storeId] of Object.entries(TRACK_TO_STORE)) {
      if (disabledStoreIds.has(storeId)) {
        state.removedTrackIds.add(trackId);
      }
    }
  } catch {
    // Non-critical — keep all tracks available
  }
}

/** Get playable tracks (excluding user-removed ones) */
function getPlayableTracks(): MusicTrack[] {
  return state.tracks.filter(t => t.file_path && !state.removedTrackIds.has(t.id));
}

// ── Detect if user is requesting music ──
// IMPORTANT: These must be specific to music requests only!
// Avoid broad patterns that match general conversation.
const MUSIC_TRIGGERS = [
  /(?:joue|mets|chante|écouter?|lance|passe)\s+(?:moi\s+)?(?:la?\s+)?(?:chanson|musique|comptine|berceuse|hymne)/i,
  /(?:je\s+veux\s+(?:écouter?|entendre))\s+(?:une?\s+)?(?:chanson|musique|comptine|berceuse)/i,
  /(?:tu\s+(?:peux|connais)\s+(?:jouer|chanter|mettre))\s+(?:une?\s+)?(?:chanson|musique|comptine|berceuse)/i,
  /(?:une?\s+(?:chanson|musique|comptine|berceuse))\s+(?:s'?il\s+(?:te|vous)\s+pla[iî]t)/i,
  /(?:je\s+veux\s+(?:dormir|faire\s+dodo|une?\s+berceuse))/i,
  /\bjoue\s+(?:moi\s+)?(?:bobby\s+tu\s+es\s+la|au\s+clair|alouette|frere\s+bobby|petit\s+navire|marseillaise|dort\s+doucement)/i,
];

const MUSIC_WORD_VARIANTS = [
  "comptine", "berceuse",
  "contine", "conptine", "comtine",
];

export function detectMusicRequest(text: string): boolean {
  const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Must match a specific music trigger or contain a music-specific word
  return MUSIC_TRIGGERS.some(r => r.test(lower)) || 
    MUSIC_WORD_VARIANTS.some(w => lower.includes(w));
}

// ── Match text to a specific track ──
function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/['']/g, "'");
}

function flatNorm(s: string): string {
  return normalize(s).replace(/['\s-]/g, "");
}

// Detect if this is a generic music request (no specific song named)
const GENERIC_MUSIC_PATTERNS = [
  /^(?:joue|mets|lance|passe)\s+(?:moi\s+)?(?:une?\s+)?(?:chanson|musique|comptine|berceuse)(?:\s+.+)?$/i,
  /^(?:je\s+veux\s+)?(?:écouter?|entendre)\s+(?:une?\s+)?(?:chanson|musique|comptine|berceuse)(?:\s+.+)?$/i,
  /^(?:une?\s+)?(?:chanson|musique|comptine|berceuse)\s*(?:s'?il\s+(?:te|vous)\s+pla[iî]t)?$/i,
  /^(?:chante|bobby\s+chante|tu\s+peux\s+chanter)(?:\s+(?:pour\s+moi|s'?il\s+te\s+pla[iî]t|une?\s+\w+))?$/i,
  /^(?:je\s+veux\s+)?(?:dormir|faire\s+dodo|dodo)$/i,
  /^(?:joue|mets|lance)\s+(?:moi\s+)?(?:de\s+la\s+)?musique(?:\s+.+)?$/i,
  /(?:comptine|berceuse|chanson|musique)\s+(?:pour\s+)?(?:enfants?|dormir|bebe|bébé|dodo)/i,
];

function isGenericMusicRequest(text: string): boolean {
  const norm = normalize(text).trim();
  return GENERIC_MUSIC_PATTERNS.some(r => r.test(norm));
}

export async function matchTrack(text: string): Promise<MusicTrack | null> {
  await ensureLoaded();
  const playable = getPlayableTracks();
  if (playable.length === 0) return null;
  
  const norm = normalize(text);
  const flat = flatNorm(text);
  
  // Direct trigger phrase match
  for (const track of playable) {
    for (const phrase of track.trigger_phrases) {
      if (norm.includes(normalize(phrase)) || flat.includes(flatNorm(phrase))) return track;
    }
  }
  
  // Fuzzy title match
  for (const track of playable) {
    const titleNorm = normalize(track.title);
    if (norm.includes(titleNorm) || flat.includes(flatNorm(track.title))) return track;
    const words = titleNorm.split(/\s+/).filter(w => w.length > 3);
    if (words.length > 0 && words.every(w => norm.includes(w) || flat.includes(flatNorm(w)))) return track;
  }
  
  // If generic music request → return priority track "Bobby tu es là"
  if (isGenericMusicRequest(text)) {
    const priorityTrack = playable.find(t => t.id === BOBBY_PRIORITY_TRACK_ID);
    if (priorityTrack) return priorityTrack;
    // Fallback: return first available track
    return playable[0] || null;
  }
  
  return null;
}

// ── Check if waiting for replay/next answer ──
export function isWaitingForMusicAnswer(): boolean {
  return state.waitingForReplayAnswer;
}

// ── Handle replay/next answer ──
export async function handleMusicAnswer(text: string): Promise<{ handled: boolean; text: string; playTrack?: MusicTrack }> {
  if (!state.waitingForReplayAnswer) return { handled: false, text: "" };
  
  const norm = normalize(text);
  const isYes = /oui|encore|rejoue|re(joue|mets)|la même|pareil|s'il te pla[iî]t|ouais|ouai|ok|d'accord/i.test(norm);
  const isNo = /non|autre|change|suivant|prochaine?|stop|arrête|pas|rien|c'est bon/i.test(norm);
  const isNewRequest = detectMusicRequest(text);
  
  state.waitingForReplayAnswer = false;
  
  if (isNewRequest) {
    const track = await matchTrack(text);
    if (track && track.file_path) {
      return {
        handled: true,
        text: `Super choix ! 🎵 Je lance "${track.title}" ! Écoute bien…`,
        playTrack: track,
      };
    }
  }
  
  if (isYes && state.currentTrack?.file_path) {
    return {
      handled: true,
      text: `C'est reparti ! 🎵 On réécoute "${state.currentTrack.title}" !`,
      playTrack: state.currentTrack,
    };
  }
  
  if (isNo) {
    state.currentTrack = null;
    return {
      handled: true,
      text: "D'accord ! Tu veux faire autre chose ? On peut jouer, raconter une histoire ou discuter ! 😊",
    };
  }
  
  state.currentTrack = null;
  return {
    handled: true,
    text: "OK ! Dis-moi ce que tu veux faire maintenant 😊",
  };
}

// ── Play a track (returns the public URL) ──
export function getTrackUrl(track: MusicTrack): string | null {
  if (!track.file_path) return null;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  return `https://${projectId}.supabase.co/storage/v1/object/public/bobby-music/${track.file_path}`;
}

// ── Process a music request — returns Bobby's reply + track to play ──
export async function processMusicRequest(text: string): Promise<{
  text: string;
  track: MusicTrack | null;
  shouldPlay: boolean;
}> {
  await ensureLoaded();
  
  const track = await matchTrack(text);
  
  if (!track) {
    const available = getPlayableTracks().map(t => t.title);
    if (available.length === 0) {
      return {
        text: "Oh, je n'ai pas encore de musique à jouer 😅 Mais bientôt j'aurai plein de chansons ! Tu veux faire autre chose ?",
        track: null,
        shouldPlay: false,
      };
    }
    return {
      text: `Hmm, je ne connais pas cette chanson 🤔 Mais je connais : ${available.map(t => `"${t}"`).join(", ")}. Laquelle tu veux écouter ?`,
      track: null,
      shouldPlay: false,
    };
  }
  
  if (!track.file_path) {
    return {
      text: `Je connais "${track.title}" mais je n'ai pas encore le fichier audio 😅 Il sera bientôt disponible !`,
      track: null,
      shouldPlay: false,
    };
  }
  
  state.currentTrack = track;
  state.waitingForReplayAnswer = true;
  
  // Increment play count (fire and forget)
  Promise.resolve(supabase.rpc("increment_music_play" as any, { track_id: track.id })).catch(() => {});
  
  const intros = [
    `Avec plaisir ! 🎵 Je te lance "${track.title}" ! Écoute bien…`,
    `Oh oui ! 🎵 C'est parti pour "${track.title}" ! Bonne écoute !`,
    `Super choix ! 🎵 Voilà "${track.title}" de ${track.artist} ! Profite bien !`,
  ];
  const intro = intros[Math.floor(Math.random() * intros.length)];
  
  return {
    text: `${intro} Après, dis-moi si tu veux la réécouter ou entendre une autre chanson !`,
    track,
    shouldPlay: true,
  };
}

// ── Get all available tracks ──
export async function getAvailableTracks(): Promise<MusicTrack[]> {
  await ensureLoaded();
  return getPlayableTracks();
}

// ── Force reload (after install/uninstall from store) ──
export function invalidateMusicCache(): void {
  state.loaded = false;
  state.tracks = [];
  state.removedTrackIds = new Set();
}

// ── Reset ──
export function resetMusicEngine(): void {
  state.isPlaying = false;
  state.currentTrack = null;
  state.waitingForReplayAnswer = false;
  if (state.audio) {
    state.audio.pause();
    state.audio = null;
  }
}
