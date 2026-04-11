/**
 * Typed event bus for decoupling modules.
 * All events are strongly typed.
 */

export type AppEvent =
  | { type: "STATE_CHANGED"; state: string; prev: string }
  | { type: "VOICE_INPUT"; transcript: string }
  | { type: "RESPONSE_READY"; text: string }
  | { type: "SPEECH_START" }
  | { type: "SPEECH_STOP" }
  | { type: "FACE_DETECTED"; position: { x: number; y: number; z: number } }
  | { type: "FACE_LOST" }
  | { type: "GAZE_UPDATED"; x: number; y: number }
  | { type: "EXPRESSION_CHANGED"; expression: string; prev: string }
  | { type: "TAP_TRIGGERED" }
  | { type: "TRIPLE_TAP" }
  | { type: "WAKE_TRIGGERED" }
  | { type: "WAKE_DETECTED"; confidence: number }
  | { type: "STORY_START"; theme: string; title: string }
  | { type: "STORY_END" }
  | { type: "STORY_CHOICE"; choice: string }
  | { type: "EMOTION_DETECTED"; emotion: string }
  | { type: "SESSION_START" }
  | { type: "SESSION_END" }
  | { type: "SFX_PLAY"; sound: string }
  | { type: "CONFIG_CHANGED"; key: string; value: unknown }
  | { type: "NARRATE_STORY"; storyId: string; title: string; text: string }
  /** Emitted when Bobby detects a potentially harmful message from the child.
   *  Parents can review alerts in Parent Mode. */
  | {
      type: "SAFETY_ALERT";
      severity: "CRITICAL" | "HIGH" | "MEDIUM";
      category: string;
      keyword: string;
      fullText: string;
      timestamp: number;
      childName: string;
    };

type Listener = (event: AppEvent) => void;
type Unsubscribe = () => void;

class EventBus {
  private listeners = new Map<string, Set<Listener>>();
  private globalListeners = new Set<Listener>();

  on(type: AppEvent["type"], listener: Listener): Unsubscribe {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
    return () => this.listeners.get(type)?.delete(listener);
  }

  onAny(listener: Listener): Unsubscribe {
    this.globalListeners.add(listener);
    return () => this.globalListeners.delete(listener);
  }

  emit(event: AppEvent) {
    this.listeners.get(event.type)?.forEach(fn => {
      try { fn(event); } catch (e) { console.error(`EventBus error [${event.type}]:`, e); }
    });
    this.globalListeners.forEach(fn => {
      try { fn(event); } catch (e) { console.error("EventBus global error:", e); }
    });
  }

  clear() {
    this.listeners.clear();
    this.globalListeners.clear();
  }
}

export const eventBus = new EventBus();
