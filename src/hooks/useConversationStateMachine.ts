import type { ParentSettings } from "@/components/parentSettings";
import { useBobbyVoiceCore } from "./useBobbyVoiceCore";
import type { ConversationState, PendingNarration, VoiceState } from "@/lib/bobby/types";

export type { ConversationState, PendingNarration, VoiceState } from "@/lib/bobby/types";
export { toVoiceState } from "@/lib/bobby/types";

export const FALLBACK_FR = {
  not_heard: "Je n'ai pas bien entendu. Réessaie !",
  thinking: "Une seconde…",
  error: "Petit souci ! Réessaie.",
};

export function useConversationStateMachine(options: {
  childName: string;
  childAge: number;
  parentSettings?: ParentSettings;
  pendingNarration?: PendingNarration | null;
  onNarrationConsumed?: () => void;
  onParentMode?: () => void;
}) {
  return useBobbyVoiceCore(options);
}
