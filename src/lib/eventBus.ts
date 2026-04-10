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
  | { type: "TAP_TRIGGERED" }
  | { type: "TRIPLE_TAP" }
  | { type: "STORY_START"; theme: string; title: string }
  | { type: "STORY_END" }
  | { type: "STORY_CHOICE"; choice: string }
  | { type: "EMOTION_DETECTED"; emotion: string }
  | { type: "SESSION_START" }
  | { type: "SESSION_END" }
  | { type: "SFX_PLAY"; sound: string }
  | { type: "CONFIG_CHANGED"; key: string; value: unknown };

type Listener = (event: AppEvent) => void;
type Unsubscribe = () => void;

class EventBus {
  private listeners = new Map<string, Set<Listener>>();
  private globalListeners = new Set<Listener>();

  /** Subscribe to a specific event type */
  on(type: AppEvent["type"], listener: Listener): Unsubscribe {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
    return () => this.listeners.get(type)?.delete(listener);
  }

  /** Subscribe to all events */
  onAny(listener: Listener): Unsubscribe {
    this.globalListeners.add(listener);
    return () => this.globalListeners.delete(listener);
  }

  /** Emit an event */
  emit(event: AppEvent) {
    // Type-specific listeners
    this.listeners.get(event.type)?.forEach(fn => {
      try { fn(event); } catch (e) { console.error(`EventBus error [${event.type}]:`, e); }
    });
    // Global listeners
    this.globalListeners.forEach(fn => {
      try { fn(event); } catch (e) { console.error("EventBus global error:", e); }
    });
  }

  /** Remove all listeners */
  clear() {
    this.listeners.clear();
    this.globalListeners.clear();
  }
}

// Singleton
export const eventBus = new EventBus();
