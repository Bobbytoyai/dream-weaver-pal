/**
 * Bobby Brain V7 — Conversation Orchestrator
 *
 * Manages conversation as a sequence of "Scenes" — each with an objective,
 * progression tracking, and transition logic.
 *
 * Features:
 *  - Scene lifecycle (spawn → active → paused/completed/abandoned)
 *  - Smart transitions with bridge phrases
 *  - Interruption handling (pause + priority-based decisions)
 *  - Contextual resume ("on parlait des dinosaures, tu veux continuer ?")
 *  - Scene type inference from UnderstandingFrame
 *
 * Execution: <5ms (100% local, pure state machine)
 */

import type { UnderstandingFrame, ImplicitIntent, UserGoal } from "./deepUnderstanding";
import type { PriorityDecision } from "./priorityEngine";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type SceneType =
  | "greeting"
  | "exploration"
  | "emotional"
  | "learning"
  | "game"
  | "story"
  | "wind_down"
  | "transition";

export type SceneStatus = "active" | "paused" | "completed" | "abandoned";

export type SceneAction =
  | "continue"
  | "deepen"
  | "shift"
  | "close"
  | "interrupt"
  | "resume"
  | "spawn";

export interface SceneEntry {
  role: "child" | "bobby";
  text: string;
  timestamp: number;
}

export interface ConversationScene {
  id: string;
  type: SceneType;
  objective: string;
  status: SceneStatus;
  turnCount: number;
  maxTurns: number;
  progressionScore: number;  // 0-1
  entries: SceneEntry[];
  resumeContext: string;
  topic: string | null;
  createdAt: number;
  pausedAt: number | null;
}

export interface TransitionPlan {
  from: SceneType;
  to: SceneType;
  bridgeType: "natural" | "pivot" | "callback" | "surprise";
  bridgePhrase: string;
  preserveContext: boolean;
}

export interface OrchestrationDirective {
  scene: ConversationScene;
  action: SceneAction;
  transition: TransitionPlan | null;
  bridgePhrase: string | null;
  resumePrompt: string | null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TRANSITION BRIDGES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const TRANSITION_BRIDGES: Record<string, string[]> = {
  "exploration→game": [
    "Tiens, ça me donne une idée de jeu !",
    "Et si on jouait à quelque chose en rapport ?",
    "Oh, j'ai un défi pour toi !",
  ],
  "emotional→exploration": [
    "Je comprends. Tu sais quoi ? Parlons d'un truc cool.",
    "C'est bien d'en avoir parlé. Et si on pensait à quelque chose de joyeux ?",
  ],
  "emotional→game": [
    "Tu sais ce qui remonte le moral ? Un bon petit jeu !",
    "Allez, on fait un jeu pour se changer les idées ?",
  ],
  "game→learning": [
    "Bravo ! Tu savais que en vrai...",
    "Super jeu ! D'ailleurs, tu connais un truc rigolo sur ce sujet ?",
  ],
  "learning→game": [
    "Maintenant qu'on sait ça, on fait un quiz ?",
    "Cool ! Et si je te posais une devinette là-dessus ?",
  ],
  "game→exploration": [
    "C'était super ! Dis-moi, de quoi tu veux qu'on parle ?",
    "Bien joué ! Tu as envie de discuter de quelque chose ?",
  ],
  "exploration→learning": [
    "Oh, tu veux que je t'explique comment ça marche ?",
    "C'est super intéressant ! Laisse-moi te raconter un truc cool.",
  ],
  "story→exploration": [
    "C'était une chouette histoire ! De quoi tu veux parler maintenant ?",
    "Fin de l'histoire ! Tu veux qu'on discute d'autre chose ?",
  ],
  "exploration→story": [
    "Ça me rappelle une histoire ! Tu veux l'entendre ?",
    "Et si je te racontais quelque chose en rapport ?",
  ],
  "greeting→exploration": [
    "Qu'est-ce qui te ferait plaisir aujourd'hui ?",
    "Alors, de quoi on parle ? 😊",
  ],
  "*→wind_down": [
    "Il se fait tard... Tu veux que je te raconte une petite histoire ?",
    "C'était chouette de parler avec toi. On fait un moment calme ?",
    "On se calme un peu ? Je peux te raconter quelque chose de doux.",
  ],
  "*→emotional": [
    "Je suis là pour toi. Raconte-moi.",
    "Tu peux tout me dire, je t'écoute. 💙",
  ],
};

function pickBridge(from: SceneType, to: SceneType): string {
  const key = `${from}→${to}`;
  const bridges = TRANSITION_BRIDGES[key]
    ?? TRANSITION_BRIDGES[`*→${to}`]
    ?? null;

  if (bridges && bridges.length > 0) {
    return bridges[Math.floor(Math.random() * bridges.length)];
  }
  // Generic fallback
  return "D'accord ! On change un peu ?";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENE TYPE INFERENCE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const GOAL_TO_SCENE: Record<UserGoal, SceneType> = {
  be_reassured: "emotional",
  learn_something: "learning",
  have_fun: "game",
  be_heard: "emotional",
  solve_problem: "exploration",
  pass_time: "exploration",
  get_help: "emotional",
  share_joy: "exploration",
  explore_topic: "learning",
  wind_down: "wind_down",
};

const IMPLICIT_TO_SCENE: Partial<Record<ImplicitIntent, SceneType>> = {
  seek_comfort: "emotional",
  seek_fun: "game",
  seek_knowledge: "learning",
  process_emotion: "emotional",
  share_experience: "exploration",
  test_limits: "exploration",
};

function inferSceneType(frame: UnderstandingFrame): SceneType {
  // Emotional needs take priority
  if (frame.emotionalNeed === "security" && frame.needIntensity >= 3) {
    return "emotional";
  }
  if (frame.emotionalNeed === "calm") {
    return "wind_down";
  }

  // Check implicit intent
  const fromImplicit = IMPLICIT_TO_SCENE[frame.implicitIntent];
  if (fromImplicit) return fromImplicit;

  // Fall back to goal
  return GOAL_TO_SCENE[frame.userGoal] ?? "exploration";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENE MAX TURNS BY TYPE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MAX_TURNS: Record<SceneType, number> = {
  greeting: 3,
  exploration: 15,
  emotional: 20,
  learning: 12,
  game: 15,
  story: 10,
  wind_down: 8,
  transition: 2,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let currentScene: ConversationScene | null = null;
let pausedScenes: ConversationScene[] = [];
let sceneCounter = 0;
let turnsSinceLastSceneChange = 0;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENE CREATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function createScene(frame: UnderstandingFrame): ConversationScene {
  const type = inferSceneType(frame);
  sceneCounter++;

  const objectives: Partial<Record<SceneType, string>> = {
    emotional: "Accompagner l'enfant émotionnellement",
    learning: "Transmettre un savoir de façon ludique",
    game: "Divertir et stimuler l'enfant",
    exploration: "Explorer un sujet avec l'enfant",
    wind_down: "Calmer et préparer au repos",
    greeting: "Accueillir l'enfant chaleureusement",
    story: "Raconter une histoire captivante",
  };

  return {
    id: `scene_${sceneCounter}_${Date.now()}`,
    type,
    objective: objectives[type] ?? "Accompagner l'enfant",
    status: "active",
    turnCount: 0,
    maxTurns: MAX_TURNS[type],
    progressionScore: 0,
    entries: [],
    resumeContext: "",
    topic: null,
    createdAt: Date.now(),
    pausedAt: null,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENE COMPATIBILITY CHECK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function isIntegrableInScene(
  scene: ConversationScene,
  frame: UnderstandingFrame,
): boolean {
  const newType = inferSceneType(frame);

  // Same type → always integrable
  if (newType === scene.type) return true;

  // Emotional scenes accept most things (child may shift while being comforted)
  if (scene.type === "emotional") return true;

  // Exploration is flexible
  if (scene.type === "exploration" && (newType === "learning" || newType === "game")) return true;

  // Learning can integrate questions
  if (scene.type === "learning" && newType === "exploration") return true;

  return false;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RESUME LOGIC
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const RESUME_TEMPLATES: Record<SceneType, string[]> = {
  exploration: [
    "Au fait, on parlait de {topic} tout à l'heure, tu veux qu'on continue ?",
    "Tu te souviens, on discutait de {topic} — tu voulais en savoir plus ?",
  ],
  learning: [
    "On n'avait pas fini notre exploration de {topic}, tu veux qu'on reprenne ?",
    "D'ailleurs, j'allais t'expliquer un truc cool sur {topic} !",
  ],
  game: [
    "On avait un jeu en cours ! Tu veux reprendre ?",
    "Notre jeu n'est pas fini, on continue ? 😄",
  ],
  story: [
    "On n'avait pas fini l'histoire ! Tu veux la suite ?",
    "J'ai pas fini de te raconter, tu veux continuer ?",
  ],
  emotional: [
    "Tu voulais me parler de quelque chose, tu te souviens ?",
    "On discutait de quelque chose d'important, tu veux en reparler ?",
  ],
  wind_down: [
    "On faisait un moment calme, on reprend ?",
  ],
  greeting: [],
  transition: [],
};

function buildResumePrompt(scene: ConversationScene): string | null {
  const templates = RESUME_TEMPLATES[scene.type];
  if (!templates || templates.length === 0) return null;

  const template = templates[Math.floor(Math.random() * templates.length)];
  const topic = scene.topic ?? scene.resumeContext ?? "ça";
  return template.replace("{topic}", topic);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN — orchestrate
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Main orchestration function. Called after Deep Understanding + Priority.
 * Returns an OrchestrationDirective that guides the response assembly.
 */
export function orchestrate(
  frame: UnderstandingFrame,
  priority: PriorityDecision,
  userText: string,
): OrchestrationDirective {
  turnsSinceLastSceneChange++;

  // ── No active scene → spawn one ──
  if (!currentScene) {
    currentScene = createScene(frame);
    currentScene.entries.push({ role: "child", text: userText, timestamp: Date.now() });
    console.log(`[Orchestrator V7] 🎬 New scene: ${currentScene.type} — "${currentScene.objective}"`);

    return {
      scene: currentScene,
      action: "spawn",
      transition: null,
      bridgePhrase: null,
      resumePrompt: null,
    };
  }

  // ── Priority-based interruption ──
  if (priority.interruptCurrent) {
    return handleInterruption(frame, priority, userText);
  }

  // ── Check if new input fits current scene ──
  if (isIntegrableInScene(currentScene, frame)) {
    // Continue or deepen
    currentScene.turnCount++;
    currentScene.entries.push({ role: "child", text: userText, timestamp: Date.now() });

    // Update progression
    currentScene.progressionScore = Math.min(
      1.0,
      currentScene.progressionScore + 1 / currentScene.maxTurns,
    );

    // Update topic if detected
    if (frame.explicitIntent !== "GENERAL" && frame.explicitIntent !== "OUI" && frame.explicitIntent !== "NON") {
      currentScene.topic = frame.explicitIntent;
    }

    // Determine action
    let action: SceneAction = "continue";
    if (currentScene.turnCount >= currentScene.maxTurns) {
      action = "close";
    } else if (currentScene.progressionScore > 0.6 && frame.implicitIntent === "seek_knowledge") {
      action = "deepen";
    }

    // If closing, build transition
    let transition: TransitionPlan | null = null;
    let resumePrompt: string | null = null;

    if (action === "close") {
      const nextType = inferSceneType(frame);
      if (nextType !== currentScene.type) {
        transition = {
          from: currentScene.type,
          to: nextType,
          bridgeType: "natural",
          bridgePhrase: pickBridge(currentScene.type, nextType),
          preserveContext: true,
        };
      }
      currentScene.status = "completed";

      // Check for paused scenes to resume
      resumePrompt = tryResumeCheck();
    }

    console.log(
      `[Orchestrator V7] ➡️ Scene "${currentScene.type}" action=${action} turn=${currentScene.turnCount}/${currentScene.maxTurns} progress=${(currentScene.progressionScore * 100).toFixed(0)}%`,
    );

    return {
      scene: currentScene,
      action,
      transition,
      bridgePhrase: transition?.bridgePhrase ?? null,
      resumePrompt,
    };
  }

  // ── Input doesn't fit → transition to new scene ──
  return handleSceneTransition(frame, userText);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTERRUPTION HANDLING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function handleInterruption(
  frame: UnderstandingFrame,
  priority: PriorityDecision,
  userText: string,
): OrchestrationDirective {
  // Save current scene for potential resume
  if (currentScene && currentScene.progressionScore < 0.9) {
    currentScene.status = "paused";
    currentScene.pausedAt = Date.now();
    currentScene.resumeContext = buildResumeContext(currentScene);
    pausedScenes.push(currentScene);

    // Keep only last 3 paused scenes
    if (pausedScenes.length > 3) {
      pausedScenes[0].status = "abandoned";
      pausedScenes.shift();
    }

    console.log(`[Orchestrator V7] ⏸️ Scene paused: "${currentScene.type}" (progress ${(currentScene.progressionScore * 100).toFixed(0)}%)`);
  }

  // Spawn new scene
  currentScene = createScene(frame);
  currentScene.entries.push({ role: "child", text: userText, timestamp: Date.now() });
  turnsSinceLastSceneChange = 0;

  console.log(`[Orchestrator V7] ⚡ Interrupt → New scene: ${currentScene.type} (priority: ${priority.priorityLevel})`);

  return {
    scene: currentScene,
    action: "spawn",
    transition: null,
    bridgePhrase: null,
    resumePrompt: null,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENE TRANSITION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function handleSceneTransition(
  frame: UnderstandingFrame,
  userText: string,
): OrchestrationDirective {
  const oldType = currentScene!.type;
  const newType = inferSceneType(frame);
  const bridge = pickBridge(oldType, newType);

  // Complete old scene
  currentScene!.status = "completed";

  const transition: TransitionPlan = {
    from: oldType,
    to: newType,
    bridgeType: "natural",
    bridgePhrase: bridge,
    preserveContext: currentScene!.progressionScore < 0.8,
  };

  // If old scene had good progress but wasn't done, save for resume
  if (transition.preserveContext && currentScene!.progressionScore > 0.2) {
    currentScene!.status = "paused";
    currentScene!.pausedAt = Date.now();
    currentScene!.resumeContext = buildResumeContext(currentScene!);
    pausedScenes.push(currentScene!);
    if (pausedScenes.length > 3) pausedScenes.shift();
  }

  // Create new scene
  currentScene = createScene(frame);
  currentScene.entries.push({ role: "child", text: userText, timestamp: Date.now() });
  turnsSinceLastSceneChange = 0;

  console.log(`[Orchestrator V7] 🔄 Transition: ${oldType} → ${newType} | bridge: "${bridge}"`);

  return {
    scene: currentScene,
    action: "spawn",
    transition,
    bridgePhrase: bridge,
    resumePrompt: null,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RESUME CHECK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function tryResumeCheck(): string | null {
  // Look for a paused scene that's worth resuming
  const candidate = pausedScenes
    .filter(s =>
      s.status === "paused" &&
      s.progressionScore < 0.8 &&
      s.progressionScore > 0.1 &&
      Date.now() - (s.pausedAt ?? 0) < 10 * 60 * 1000, // < 10 min
    )
    .sort((a, b) => b.progressionScore - a.progressionScore)[0];

  if (!candidate) return null;

  return buildResumePrompt(candidate);
}

function buildResumeContext(scene: ConversationScene): string {
  // Use the topic or last meaningful entry
  if (scene.topic) return scene.topic;

  const lastChild = [...scene.entries]
    .reverse()
    .find(e => e.role === "child");

  if (lastChild) {
    // Summarize: take first 40 chars
    const summary = lastChild.text.length > 40
      ? lastChild.text.slice(0, 40) + "…"
      : lastChild.text;
    return summary;
  }

  return "notre discussion";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RECORD BOBBY RESPONSE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function recordBobbyResponse(text: string): void {
  if (currentScene) {
    currentScene.entries.push({ role: "bobby", text, timestamp: Date.now() });
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PUBLIC GETTERS & RESET
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function getCurrentScene(): ConversationScene | null {
  return currentScene;
}

export function getPausedScenes(): ConversationScene[] {
  return [...pausedScenes];
}

export function resetOrchestrator(): void {
  currentScene = null;
  pausedScenes = [];
  sceneCounter = 0;
  turnsSinceLastSceneChange = 0;
}
