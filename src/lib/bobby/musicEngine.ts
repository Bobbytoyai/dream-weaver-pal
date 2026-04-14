/**
 * Bobby Music Engine
 * 
 * Detects music requests, matches to stored tracks,
 * and manages playback state (play, replay, next).
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

interface MusicState {
  isPlaying: boolean;
  currentTrack: MusicTrack | null;
  tracks: MusicTrack[];
  loaded: boolean;
  waitingForReplayAnswer: boolean;
  audio: HTMLAudioElement | null;
}

const state: MusicState = {
  isPlaying: false,
  currentTrack: null,
  tracks: [],
  loaded: false,
  waitingForReplayAnswer: false,
  audio: null,
};

// ── Load tracks from DB ──
async function ensureLoaded(): Promise<void> {
  if (state.loaded) return;
  try {
    const { data } = await supabase
      .from("music_tracks" as any)
      .select("id, title, artist, file_path, duration_seconds, trigger_phrases, category")
      .eq("is_active", true)
      .order("sort_order");
    state.tracks = (data || []) as unknown as MusicTrack[];
    state.loaded = true;
    console.log(`[Music] 🎵 Loaded ${state.tracks.length} tracks`);
  } catch (e) {
    console.warn("[Music] Failed to load tracks:", e);
  }
}

// ── Detect if user is requesting music ──
const MUSIC_TRIGGERS = [
  /(?:joue|mets|chante|écouter?|lance|passe)\s+(?:moi\s+)?(?:la?\s+)?(?:chanson|musique|comptine|berceuse|hymne)/i,
  /(?:joue|mets|chante|écouter?|lance|passe)\s+(?:moi\s+)?/i,
  /(?:je\s+veux\s+(?:écouter?|entendre))\s+/i,
  /(?:tu\s+(?:peux|connais)\s+(?:jouer|chanter|mettre))\s+/i,
  /(?:une?\s+(?:chanson|musique|comptine|berceuse))/i,
];

// Child-speech typos / phonetic variants for music-related words
const MUSIC_WORD_VARIANTS = [
  "musique", "chanson", "comptine", "berceuse",
  // Common child mispronunciations
  "chane", "chancon", "chançon", "muzik", "muzique", "muszique",
  "contine", "conptine", "comtine",
];

export function detectMusicRequest(text: string): boolean {
  const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return MUSIC_TRIGGERS.some(r => r.test(lower)) || 
    MUSIC_WORD_VARIANTS.some(w => lower.includes(w));
}

// ── Match text to a specific track ──
function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/['']/g, "'");
}

export async function matchTrack(text: string): Promise<MusicTrack | null> {
  await ensureLoaded();
  const norm = normalize(text);
  
  // Direct trigger phrase match
  for (const track of state.tracks) {
    for (const phrase of track.trigger_phrases) {
      if (norm.includes(normalize(phrase))) return track;
    }
  }
  
  // Fuzzy title match
  for (const track of state.tracks) {
    const titleNorm = normalize(track.title);
    if (norm.includes(titleNorm)) return track;
    // Check individual significant words (>3 chars)
    const words = titleNorm.split(/\s+/).filter(w => w.length > 3);
    if (words.length > 0 && words.every(w => norm.includes(w))) return track;
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
  
  // Ambiguous — assume they want to move on
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
    // No match — list available songs
    const available = state.tracks.filter(t => t.file_path).map(t => t.title);
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
  
  return {
    text: `🎵 C'est parti ! Je lance "${track.title}" de ${track.artist} ! Écoute bien… Après, dis-moi si tu veux la réécouter ou entendre une autre chanson !`,
    track,
    shouldPlay: true,
  };
}

// ── Get all available tracks ──
export async function getAvailableTracks(): Promise<MusicTrack[]> {
  await ensureLoaded();
  return state.tracks.filter(t => t.file_path);
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
