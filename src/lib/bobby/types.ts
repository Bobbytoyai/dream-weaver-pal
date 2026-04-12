import type { FaceState } from "@/components/hologram/useFaceAnimation";

export type ConversationState = "IDLE" | "LISTENING" | "PROCESSING" | "SPEAKING" | "ERROR" | "SLEEP";
export type VoiceState = "idle" | "listening" | "processing" | "speaking" | "interrupted" | "session_end";

export interface PendingNarration {
  storyId: string;
  title: string;
  text: string;
}

export type BobbyReplySource = "offline_brain" | "library" | "narration" | "safety_filter" | "llm_gemini";

export interface BobbyBrainReply {
  text: string;
  intent: string;
  source: BobbyReplySource;
  emotion: FaceState;
  confidence: number;
  isOffline: boolean;
}

export interface BobbyLibraryCollection {
  id: "histoires" | "blagues" | "contenus";
  title: string;
  description: string;
  itemCount: number;
  downloadable: boolean;
}

export function toVoiceState(state: ConversationState): VoiceState {
  switch (state) {
    case "IDLE":
      return "idle";
    case "LISTENING":
      return "listening";
    case "PROCESSING":
      return "processing";
    case "SPEAKING":
      return "speaking";
    case "ERROR":
      return "interrupted";
    case "SLEEP":
      return "session_end";
  }
}