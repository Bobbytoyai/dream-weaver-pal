/**
 * Bobby AI — Multi-Response Database (barrel)
 * Split into 7 category files for maintainability.
 */

import type { MultiResponseEntry } from "./types";

import { RESPONSES_EMOTIONS } from "./responses-emotions";
import { RESPONSES_SOCIAL } from "./responses-social";
import { RESPONSES_EDUCATION } from "./responses-education";
import { RESPONSES_GAMES } from "./responses-games";
import { RESPONSES_SAFETY } from "./responses-safety";
import { RESPONSES_DAILY } from "./responses-daily";
import { RESPONSES_SCIENCE } from "./responses-science";

export const BOBBY_MULTI_RESPONSES: MultiResponseEntry[] = [
  ...RESPONSES_EMOTIONS,
  ...RESPONSES_SOCIAL,
  ...RESPONSES_EDUCATION,
  ...RESPONSES_GAMES,
  ...RESPONSES_SAFETY,
  ...RESPONSES_DAILY,
  ...RESPONSES_SCIENCE,
];
