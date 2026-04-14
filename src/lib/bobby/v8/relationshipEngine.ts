/**
 * Bobby Brain V8 — Relationship Evolution Engine
 *
 * Tracks the evolving relationship between Bobby and the child across
 * 4 phases: discovery → trust → attachment → complicity.
 * Manages milestones, shared memories, inside jokes, and phase-specific
 * behaviour modifiers.
 *
 * Persisted via localStorage; synced to cloud through persistentMemory.
 * Execution: <1ms, 100% offline.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type RelationshipPhase =
  | "discovery"     // 0-10 interactions
  | "trust"         // 10-50
  | "attachment"    // 50-200
  | "complicity";   // 200+

export interface RelationshipMilestone {
  type: string;
  timestamp: number;
  description: string;
}

export interface SharedMemory {
  event: string;
  emotion: string;
  timestamp: number;
  recalled: number;
}

export interface InsideJoke {
  trigger: string;
  reference: string;
  createdAt: number;
  usageCount: number;
}

export interface RelationshipState {
  phase: RelationshipPhase;
  totalInteractions: number;
  totalSessions: number;
  trustScore: number;          // 0-100
  complicityScore: number;     // 0-100
  emotionalBondScore: number;  // 0-100
  milestones: RelationshipMilestone[];
  sharedMemories: SharedMemory[];
  insideJokes: InsideJoke[];
}

export interface SessionMetrics {
  turnCount: number;
  overallMood: "positive" | "neutral" | "negative";
  laughCount: number;
  emotionalMoments: number;
  topicsDiscussed: string[];
}

export interface PhaseBehavior {
  greetingStyle: string;
  humorLevel: number;
  personalReferenceRate: number;
  vulnerabilityLevel: number;
  teasingLevel: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONSTANTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const LOCAL_KEY = "bobby_relationship_v8";
const MAX_SHARED_MEMORIES = 20;
const MAX_INSIDE_JOKES = 10;

const PHASE_BEHAVIORS: Record<RelationshipPhase, PhaseBehavior> = {
  discovery: {
    greetingStyle: "formal_warm",
    humorLevel: 0.3,
    personalReferenceRate: 0.1,
    vulnerabilityLevel: 0,
    teasingLevel: 0,
  },
  trust: {
    greetingStyle: "warm_personal",
    humorLevel: 0.5,
    personalReferenceRate: 0.3,
    vulnerabilityLevel: 0.2,
    teasingLevel: 0.1,
  },
  attachment: {
    greetingStyle: "intimate_callback",
    humorLevel: 0.7,
    personalReferenceRate: 0.5,
    vulnerabilityLevel: 0.4,
    teasingLevel: 0.3,
  },
  complicity: {
    greetingStyle: "complicit_insider",
    humorLevel: 0.9,
    personalReferenceRate: 0.7,
    vulnerabilityLevel: 0.6,
    teasingLevel: 0.5,
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INSIDE JOKE DETECTION PATTERNS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const FUNNY_TRIGGERS = [
  /\bprout\b/i, /\bcaca\b/i, /\bpipi\b/i, /\bpouet\b/i,
  /\bfesses\b/i, /\broter\b/i, /\bpéter\b/i, /\bboudin\b/i,
  /\bcornichon\b/i, /\bsaucisse\b/i, /\bpatate\b/i,
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function createEmptyState(): RelationshipState {
  return {
    phase: "discovery",
    totalInteractions: 0,
    totalSessions: 0,
    trustScore: 0,
    complicityScore: 0,
    emotionalBondScore: 0,
    milestones: [],
    sharedMemories: [],
    insideJokes: [],
  };
}

let state: RelationshipState = createEmptyState();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PERSISTENCE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function loadRelationship(): RelationshipState {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RelationshipState;
      // Ensure arrays exist (backward compat)
      parsed.milestones = parsed.milestones ?? [];
      parsed.sharedMemories = parsed.sharedMemories ?? [];
      parsed.insideJokes = parsed.insideJokes ?? [];
      state = parsed;
    }
  } catch { /* keep defaults */ }
  return state;
}

function save(): void {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(state)); } catch { /* quota */ }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MILESTONE DETECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MILESTONE_DEFS: Array<{
  type: string;
  check: (s: RelationshipState) => boolean;
  description: string;
}> = [
  { type: "first_interaction", check: s => s.totalInteractions === 1, description: "Première conversation avec Bobby !" },
  { type: "10_interactions", check: s => s.totalInteractions >= 10, description: "10 échanges ensemble 🎉" },
  { type: "50_interactions", check: s => s.totalInteractions >= 50, description: "50 échanges — on se connaît bien ! 🌟" },
  { type: "100_interactions", check: s => s.totalInteractions >= 100, description: "100 échanges — Bobby et toi êtes de vrais amis ! 💙" },
  { type: "200_interactions", check: s => s.totalInteractions >= 200, description: "200 échanges — complices pour la vie ! 🚀" },
  { type: "first_laugh", check: s => s.complicityScore >= 5, description: "Premier fou rire ensemble 😂" },
  { type: "first_emotional", check: s => s.emotionalBondScore >= 10, description: "Premier moment émouvant partagé 💕" },
  { type: "first_inside_joke", check: s => s.insideJokes.length >= 1, description: "Première blague secrète entre nous ! 🤫" },
  { type: "trust_established", check: s => s.trustScore >= 50, description: "Confiance bien installée ✨" },
  { type: "deep_bond", check: s => s.emotionalBondScore >= 60, description: "Un lien profond s'est créé 🤗" },
];

function checkMilestones(): RelationshipMilestone[] {
  const newMilestones: RelationshipMilestone[] = [];
  const existing = new Set(state.milestones.map(m => m.type));

  for (const def of MILESTONE_DEFS) {
    if (!existing.has(def.type) && def.check(state)) {
      const ms: RelationshipMilestone = {
        type: def.type,
        timestamp: Date.now(),
        description: def.description,
      };
      state.milestones.push(ms);
      newMilestones.push(ms);
    }
  }

  return newMilestones;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PHASE TRANSITIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function evaluatePhase(): boolean {
  const prev = state.phase;

  if (state.phase === "discovery" && state.totalInteractions >= 10 && state.trustScore >= 30) {
    state.phase = "trust";
    state.milestones.push({
      type: "phase_trust",
      timestamp: Date.now(),
      description: "Bobby et l'enfant commencent à se faire confiance",
    });
  }

  if (state.phase === "trust" && state.totalInteractions >= 50 && state.emotionalBondScore >= 40) {
    state.phase = "attachment";
    state.milestones.push({
      type: "phase_attachment",
      timestamp: Date.now(),
      description: "Un vrai lien s'est créé",
    });
  }

  if (state.phase === "attachment" && state.totalInteractions >= 200 && state.complicityScore >= 60) {
    state.phase = "complicity";
    state.milestones.push({
      type: "phase_complicity",
      timestamp: Date.now(),
      description: "Bobby et l'enfant sont complices",
    });
  }

  if (state.phase !== prev) {
    console.log(`[Relationship V8] 🎭 Phase transition: ${prev} → ${state.phase}`);
    return true;
  }
  return false;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INSIDE JOKE DETECTION & USAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function detectInsideJoke(userText: string): void {
  const lower = userText.toLowerCase();

  for (const pattern of FUNNY_TRIGGERS) {
    if (pattern.test(lower)) {
      const word = lower.match(pattern)?.[0] ?? "";
      const existing = state.insideJokes.find(j => j.trigger === word);
      if (existing) {
        existing.usageCount++;
      } else if (state.insideJokes.length < MAX_INSIDE_JOKES) {
        state.insideJokes.push({
          trigger: word,
          reference: `On a ri ensemble à propos de "${word}" !`,
          createdAt: Date.now(),
          usageCount: 1,
        });
      }
    }
  }
}

/** Get an inside joke reference if appropriate (random chance based on phase) */
export function getInsideJokeReference(): string | null {
  if (state.insideJokes.length === 0) return null;
  const behavior = PHASE_BEHAVIORS[state.phase];
  if (Math.random() > behavior.teasingLevel) return null;

  // Pick least-used joke
  const sorted = [...state.insideJokes].sort((a, b) => a.usageCount - b.usageCount);
  const joke = sorted[0];
  joke.usageCount++;

  const templates = [
    `Haha, ça me rappelle quand on parlait de "${joke.trigger}" ! 😄`,
    `Tu te souviens de "${joke.trigger}" ? 😂`,
    `"${joke.trigger}"... ça me fait toujours rire nous deux ! 🤭`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHARED MEMORIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function addSharedMemory(event: string, emotion: string): void {
  if (state.sharedMemories.length >= MAX_SHARED_MEMORIES) {
    // Remove oldest, least-recalled
    state.sharedMemories.sort((a, b) => a.recalled - b.recalled || a.timestamp - b.timestamp);
    state.sharedMemories.shift();
  }
  state.sharedMemories.push({ event, emotion, timestamp: Date.now(), recalled: 0 });
}

/** Get a shared memory to recall if appropriate */
export function getSharedMemoryCallback(): string | null {
  if (state.sharedMemories.length === 0) return null;
  const behavior = PHASE_BEHAVIORS[state.phase];
  if (Math.random() > behavior.personalReferenceRate) return null;

  // Pick least-recalled memory
  const sorted = [...state.sharedMemories].sort((a, b) => a.recalled - b.recalled);
  const memory = sorted[0];
  memory.recalled++;

  return `Tu te rappelles quand ${memory.event} ? C'était chouette ! 😊`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SESSION UPDATE (called at end of each session)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface RelationshipUpdate {
  phaseChanged: boolean;
  newMilestones: RelationshipMilestone[];
  phase: RelationshipPhase;
}

export function updateRelationship(metrics: SessionMetrics): RelationshipUpdate {
  // Update scores
  if (metrics.overallMood === "positive") {
    state.trustScore = Math.min(100, state.trustScore + 1);
  } else if (metrics.overallMood === "negative") {
    state.trustScore = Math.max(0, state.trustScore - 0.5);
  }

  if (metrics.laughCount > 0) {
    state.complicityScore = Math.min(100, state.complicityScore + Math.min(metrics.laughCount, 3));
  }

  if (metrics.emotionalMoments > 0) {
    state.emotionalBondScore = Math.min(100, state.emotionalBondScore + Math.min(metrics.emotionalMoments * 2, 6));
  }

  state.totalInteractions += metrics.turnCount;
  state.totalSessions += 1;

  // Detect inside jokes from topics
  for (const topic of metrics.topicsDiscussed) {
    detectInsideJoke(topic);
  }

  // Evaluate phase
  const phaseChanged = evaluatePhase();

  // Check milestones
  const newMilestones = checkMilestones();

  if (newMilestones.length > 0) {
    console.log(`[Relationship V8] 🏆 New milestones: ${newMilestones.map(m => m.type).join(", ")}`);
  }

  save();

  return { phaseChanged, newMilestones, phase: state.phase };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PER-TURN UPDATE (lightweight, called each turn)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function recordInteraction(userText: string, emotion: string): void {
  detectInsideJoke(userText);

  // Emotional moments boost
  const emotionalEmotions = ["sadness", "fear", "love", "shame", "jealousy"];
  if (emotionalEmotions.includes(emotion)) {
    state.emotionalBondScore = Math.min(100, state.emotionalBondScore + 0.5);
  }

  // Laughter detection
  if (/\b(haha|mdr|lol|😂|🤣|hihi|ptdr)\b/i.test(userText)) {
    state.complicityScore = Math.min(100, state.complicityScore + 0.5);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// QUERY API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function getRelationshipState(): RelationshipState {
  return state;
}

export function getRelationshipPhase(): RelationshipPhase {
  return state.phase;
}

export function getPhaseBehavior(): PhaseBehavior {
  return PHASE_BEHAVIORS[state.phase];
}

/** Build a context block for LLM prompts */
export function buildRelationshipBlock(): string {
  const b = PHASE_BEHAVIORS[state.phase];
  const lines: string[] = [
    `[RELATION V8] Phase: ${state.phase} | Trust: ${state.trustScore} | Complicité: ${state.complicityScore} | Lien: ${state.emotionalBondScore}`,
    `Style: humour=${b.humorLevel}, refs_perso=${b.personalReferenceRate}, taquinerie=${b.teasingLevel}`,
  ];

  if (state.insideJokes.length > 0) {
    lines.push(`Inside jokes: ${state.insideJokes.map(j => `"${j.trigger}"`).join(", ")}`);
  }

  return lines.join("\n");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RESET
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function resetRelationshipEngine(): void {
  state = createEmptyState();
}
