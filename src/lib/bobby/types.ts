import type { FaceState } from "@/components/hologram/useFaceAnimation";

export type ConversationState = "IDLE" | "LISTENING" | "PROCESSING" | "SPEAKING" | "ERROR" | "SLEEP" | "RELANCE";
export type VoiceState = "idle" | "listening" | "processing" | "speaking" | "interrupted" | "session_end";

export interface PendingNarration {
  storyId: string;
  title: string;
  text: string;
}

export type BobbyReplySource = "offline_brain" | "library" | "narration" | "safety_filter" | "llm_gemini" | "llm_agent" | "local_brain" | "offline_games" | "flow_engine" | "uncertainty_engine";

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
    case "RELANCE":
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
