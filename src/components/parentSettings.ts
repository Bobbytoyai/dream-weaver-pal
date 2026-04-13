export interface ParentSettings {
  childName: string;
  personality: "balanced" | "calm" | "energetic" | "educational";
  childAge: number;
  voiceType: "child" | "female" | "male" | "sister" | "brother" | "custom";
  voiceSpeed: "normal" | "slow" | "fast";
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
  wakeSensitivity: "low" | "medium" | "high";
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
  bobbyColor: string;
  bobbyColors: {
    iris: string;
    cheek: string;
    eyebrow: string;
    background: string;
  };
  bobbyCustomization: {
    eyeSize: number;
    eyeSpacing: number;
    pupilSize: number;
    eyebrowHeight: number;
    eyebrowCurve: number;
    eyebrowThickness: number;
    mouthWidth: number;
    mouthCurve: number;
    cheekSize: number;
    eyelidDroop: number;
  };
}

export const BOBBY_COLORS = [
  { id: "blue", label: "Bleu", hsl: "215, 80%, 65%" },
  { id: "purple", label: "Violet", hsl: "270, 60%, 60%" },
  { id: "green", label: "Vert", hsl: "155, 55%, 50%" },
  { id: "pink", label: "Rose", hsl: "330, 65%, 65%" },
  { id: "orange", label: "Orange", hsl: "25, 85%, 58%" },
  { id: "gold", label: "Or", hsl: "45, 80%, 55%" },
];

export const DEFAULT_PARENT_SETTINGS: ParentSettings = {
  childName: "Mon ami",
  personality: "balanced",
  childAge: 7,
  voiceType: "female",
  voiceSpeed: "normal",
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
  wakeSensitivity: "high",
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
  bobbyColor: "blue",
  bobbyColors: {
    iris: "blue",
    cheek: "pink",
    eyebrow: "brown",
    background: "soft-blue",
  },
  bobbyCustomization: {
    eyeSize: 1,
    eyeSpacing: 1,
    pupilSize: 1,
    eyebrowHeight: 1,
    eyebrowCurve: 0.5,
    eyebrowThickness: 1,
    mouthWidth: 1,
    mouthCurve: 0.7,
    cheekSize: 1,
    eyelidDroop: 0.2,
  },
};
