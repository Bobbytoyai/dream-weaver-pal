/**
 * Bobby Local Brain — Response Templates (barrel)
 * Split into 6 category files for maintainability.
 */
import type { LocalIntent, EmotionType, ResponseTemplate } from "./types";

import { TEMPLATES_EMOTIONS } from "./templates-emotions";
import { TEMPLATES_SOCIAL } from "./templates-social";
import { TEMPLATES_CONVERSATION } from "./templates-conversation";
import { TEMPLATES_REQUESTS } from "./templates-requests";
import { TEMPLATES_DAILY } from "./templates-daily";
import { TEMPLATES_SAFETY } from "./templates-safety";

export const TEMPLATES: Partial<Record<LocalIntent, Partial<Record<EmotionType, ResponseTemplate>> & { default: ResponseTemplate }>> = {
  ...TEMPLATES_EMOTIONS,
  ...TEMPLATES_SOCIAL,
  ...TEMPLATES_CONVERSATION,
  ...TEMPLATES_REQUESTS,
  ...TEMPLATES_DAILY,
  ...TEMPLATES_SAFETY,
};
