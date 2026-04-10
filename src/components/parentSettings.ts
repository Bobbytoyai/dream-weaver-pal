export interface ParentSettings {
  childName: string;
  personality: "balanced" | "calm" | "energetic" | "educational";
  childAge: number;
  voiceType: "child" | "female" | "male" | "custom";
  voiceSpeed: "normal" | "slow" | "fast";
  voicePitch: number;
  sfxVolume: number;
  enableCamera: boolean;
  contentModes: { freeChat: boolean; educational: boolean; games: boolean; stories: boolean };
  enabledThemes: string[];
  storyDuration: "courte" | "moyenne" | "longue";
  storyInteractive: boolean;
  contentFilter: "standard" | "strict";
  blockedTopics: string[];
  ultraSafe: boolean;
  timeLimitMinutes: number | null;
  autoStop: boolean;
  nightMode: { active: boolean; startHour: string; endHour: string };
  interactions: { wakeWord: boolean; tap: boolean; interruption: boolean };
  recordConversations: boolean;
  privacyMode: boolean;
  // ─── Advanced security ───
  parentPin: string;
  safeWord: string;
  safeWordAction: "pause" | "alert" | "stop";
  emergencyContact: { name: string; email: string };
  alertOnSensitive: boolean;
  alertTopics: string[];
  maxMessageLength: number;
  blockPersonalInfo: boolean;
  languageLevel: "simple" | "adapté" | "avancé";
  blockExternalLinks: boolean;
  sessionWatermark: boolean;
  dataRetention: "7j" | "30j" | "90j" | "forever";
  consentAnalysis: boolean;
  consentImprovement: boolean;
  consentStats: boolean;
}

export const DEFAULT_PARENT_SETTINGS: ParentSettings = {
  childName: "Bobby",
  personality: "balanced",
  childAge: 7,
  voiceType: "female",
  voiceSpeed: "normal",
  voicePitch: 1.0,
  sfxVolume: 0.7,
  enableCamera: false,
  contentModes: { freeChat: true, educational: true, games: true, stories: true },
  enabledThemes: ["princesse", "pirate", "espace", "animaux", "éducatif"],
  storyDuration: "moyenne",
  storyInteractive: true,
  contentFilter: "standard",
  blockedTopics: [],
  ultraSafe: true,
  timeLimitMinutes: null,
  autoStop: true,
  nightMode: { active: false, startHour: "20:00", endHour: "07:00" },
  interactions: { wakeWord: true, tap: true, interruption: true },
  recordConversations: true,
  privacyMode: false,
  // ─── Advanced security defaults ───
  parentPin: "",
  safeWord: "",
  safeWordAction: "pause",
  emergencyContact: { name: "", email: "" },
  alertOnSensitive: true,
  alertTopics: ["violence", "peur extrême", "harcèlement", "contenu adulte"],
  maxMessageLength: 500,
  blockPersonalInfo: true,
  languageLevel: "adapté",
  blockExternalLinks: true,
  sessionWatermark: false,
  dataRetention: "forever",
  consentAnalysis: true,
  consentImprovement: false,
  consentStats: false,
};
