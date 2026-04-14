/**
 * Bobby Local Brain v1.0 — Intelligent Conversational Engine (barrel)
 * Split into sub-modules: types, memory, intentEngine, emotionEngine, templates, assembly
 */

import type { FaceState } from "@/components/hologram/useFaceAnimation";
import type { BobbyBrainReply } from "../types";
import type { EmotionType } from "./types";
import { smartClassify } from "../smartClassifier";
import { tryStartScenario, isScenarioActive, getScenarioResponse, resetScenarios, getActiveScenarioInfo, getScenarioTriggerIntents } from "../emotionalScenarios";
import { mem, addTurn, addBobbyResponse, resetLocalBrain as resetMem } from "./memory";
import { detectLocalIntent } from "./intentEngine";
import { detectEmotion, detectTopic } from "./emotionEngine";
import { assembleResponse, INTENT_FACE_MAP } from "./assembly";

// Re-exports
export type { ConversationTurn, LocalIntent } from "./types";
export { resetLocalBrain } from "./memory";
export { getConversationContext } from "./memory";

export function getLocalBrainReply(
  userText: string,
  childName: string,
  childAge: number,
): BobbyBrainReply {
  const startTime = performance.now();

  // 1. Detect intent
  const regexIntent = detectLocalIntent(userText);
  const { intent, confidence: classifConfidence, source: classifSource } = smartClassify(userText, regexIntent);

  // 2. Detect emotion
  const emotion = detectEmotion(userText);

  // 3. Detect topic
  const topic = detectTopic(userText);

  // 4. Update memory
  if (topic) {
    if (topic === mem.currentTopic) {
      mem.topicDepth++;
    } else {
      mem.currentTopic = topic;
      mem.topicDepth = 1;
    }
  }
  mem.currentEmotion = emotion.type;
  mem.currentIntensity = emotion.intensity;

  const negEmotions: EmotionType[] = ["sadness", "fear", "anger", "shame", "jealousy"];
  const posEmotions: EmotionType[] = ["joy", "excitement", "pride", "love", "gratitude"];
  if (negEmotions.includes(emotion.type)) mem.sessionMood = "negative";
  else if (posEmotions.includes(emotion.type)) mem.sessionMood = "positive";

  addTurn({
    role: "child",
    text: userText,
    intent,
    emotion: emotion.type,
    emotionIntensity: emotion.intensity,
    topic: topic || undefined,
    timestamp: Date.now(),
  });

  // 5. Check for active scenario
  if (isScenarioActive()) {
    const scenarioInfo = getActiveScenarioInfo();
    const scenarioTriggerIntents = scenarioInfo ? getScenarioTriggerIntents(scenarioInfo.id) : [];
    const childChangedTopic = intent !== "OUI" && intent !== "NON" && intent !== "GENERAL"
      && intent !== "QUESTION_SIMPLE" && !scenarioTriggerIntents.includes(intent);

    if (childChangedTopic) {
      console.log(`[LocalBrain] 🔄 Child changed topic (${intent}), breaking scenario ${scenarioInfo?.id}`);
      resetScenarios();
    } else {
      const scenarioResp = getScenarioResponse(userText, childName);
      if (scenarioResp) {
        addTurn({ role: "bobby", text: scenarioResp.text, intent, timestamp: Date.now() });
        addBobbyResponse(scenarioResp.text);
        const latency = performance.now() - startTime;
        console.log(`[LocalBrain] 🎭 Scenario response ${latency.toFixed(1)}ms`);
        return {
          text: scenarioResp.text,
          intent,
          source: "local_brain",
          emotion: (scenarioResp.faceState as FaceState) || "reassuring",
          confidence: 0.95,
          isOffline: true,
        };
      }
    }
  }

  // 5b. Try to start a new scenario for strong emotions
  if (emotion.intensity >= 3) {
    tryStartScenario(intent, userText);
    if (isScenarioActive()) {
      const scenarioResp = getScenarioResponse(userText, childName);
      if (scenarioResp) {
        addTurn({ role: "bobby", text: scenarioResp.text, intent, timestamp: Date.now() });
        addBobbyResponse(scenarioResp.text);
        const latency = performance.now() - startTime;
        console.log(`[LocalBrain] 🎭 New scenario started ${latency.toFixed(1)}ms | ${intent}`);
        return {
          text: scenarioResp.text,
          intent,
          source: "local_brain",
          emotion: (scenarioResp.faceState as FaceState) || "reassuring",
          confidence: 0.95,
          isOffline: true,
        };
      }
    }
  }

  // 6. Generate response via template engine
  const responseText = assembleResponse(intent, emotion, childName, childAge);

  // 7. Record bobby's turn
  addTurn({ role: "bobby", text: responseText, intent, timestamp: Date.now() });
  addBobbyResponse(responseText);

  const latency = performance.now() - startTime;
  console.log(`[LocalBrain] ⚡ ${latency.toFixed(1)}ms | intent=${intent} (${classifSource}) | emotion=${emotion.type}(${emotion.intensity}) | topic=${topic || "—"}`);

  return {
    text: responseText,
    intent,
    source: "local_brain",
    emotion: INTENT_FACE_MAP[intent] || "attentive",
    confidence: intent === "GENERAL" ? 0.5 : classifConfidence,
    isOffline: true,
  };
}

/** Get memory snapshot for debugging */
export function getLocalBrainState() {
  return {
    turns: [...mem.turns],
    currentEmotion: mem.currentEmotion,
    currentIntensity: mem.currentIntensity,
    currentTopic: mem.currentTopic,
    topicDepth: mem.topicDepth,
    sessionMood: mem.sessionMood,
    turnCount: mem.turnCount,
  };
}
