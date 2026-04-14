/**
 * Bobby Local Brain v1.0 — Re-export barrel
 * Implementation split into src/lib/bobby/localBrain/ directory.
 */
export { getLocalBrainReply, resetLocalBrain, getLocalBrainState, getConversationContext } from "./localBrain/index";
export type { ConversationTurn, LocalIntent } from "./localBrain/types";
