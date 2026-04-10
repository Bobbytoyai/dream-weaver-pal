export interface ParentSettings {
  personality: "balanced" | "calm" | "energetic" | "educational";
  childAge: number;
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
}

export const DEFAULT_PARENT_SETTINGS: ParentSettings = {
  personality: "balanced",
  childAge: 7,
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
};
