/**
 * QA Database — Chargé depuis un fichier JSON compact.
 * 537 interactions couvrant salutations, animaux, espace, sciences, etc.
 */
import type { OfflineIntent } from "./offline-intents";
import qaData from "./qa-database.json";

export interface QAEntry {
  triggers: string[];
  responses: string[];
  intent?: OfflineIntent;
}

export const QA_DATABASE: QAEntry[] = qaData as QAEntry[];
