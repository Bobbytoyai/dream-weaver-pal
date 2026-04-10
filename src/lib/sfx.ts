/**
 * Lightweight synth sound effects for hologram state transitions.
 * Uses Web Audio API — no external dependencies.
 * 
 * Now reactive: call initSfxEventBus() once to have SFX auto-play
 * in response to STATE_CHANGED events from the event bus.
 */

import { eventBus, type AppEvent } from "./eventBus";

let audioCtx: AudioContext | null = null;
let masterVolume = 0.7; // 0 = muted, 1 = max
let busSubscribed = false;

export function setSfxVolume(v: number) {
  masterVolume = Math.max(0, Math.min(1, v));
  eventBus.emit({ type: "CONFIG_CHANGED", key: "sfxVolume", value: v });
}

function getCtx(): AudioContext | null {
  if (masterVolume === 0) return null;
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function vol(base: number) {
  return base * masterVolume;
}

/** Short rising "pling" — used when Buddy starts listening */
export function playListeningPling() {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.12);
  gain.gain.setValueAtTime(vol(0.15), ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.25);
}

/** Soft descending tone — used when Buddy stops listening */
export function playStopBip() {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(vol(0.12), ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}

/** Thinking shimmer — gentle bubbly tones that loop while processing */
export function playThinkingShimmer() {
  const ctx = getCtx();
  if (!ctx) return;
  // Instant soft "pop" for immediate feedback
  const pop = ctx.createOscillator();
  const popGain = ctx.createGain();
  pop.type = "sine";
  pop.frequency.setValueAtTime(880, ctx.currentTime);
  pop.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.06);
  popGain.gain.setValueAtTime(vol(0.12), ctx.currentTime);
  popGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  pop.connect(popGain).connect(ctx.destination);
  pop.start();
  pop.stop(ctx.currentTime + 0.12);

  // Two soft trailing sparkle tones
  [0.08, 0.18].forEach((delay, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(i === 0 ? 750 : 950, ctx.currentTime + delay);
    gain.gain.setValueAtTime(vol(0.06), ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.15);
  });
}

/** Happy chime — ascending three-note arpeggio */
export function playSpeakingChime() {
  const ctx = getCtx();
  if (!ctx) return;
  [0, 0.08, 0.16].forEach((delay, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime([520, 660, 780][i], ctx.currentTime + delay);
    gain.gain.setValueAtTime(vol(0.1), ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.2);
  });
}

/** Session end — gentle descending chord */
export function playSessionEnd() {
  const ctx = getCtx();
  if (!ctx) return;
  [0, 0.12, 0.24].forEach((delay, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime([660, 520, 390][i], ctx.currentTime + delay);
    gain.gain.setValueAtTime(vol(0.1), ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.35);
  });
}

/** Interrupted — quick wobble */
export function playInterrupted() {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(500, ctx.currentTime);
  osc.frequency.setValueAtTime(600, ctx.currentTime + 0.05);
  osc.frequency.setValueAtTime(500, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(vol(0.06), ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

/** Gentle wake chime — soft "boop" when wake word detected */
export function playWakeChime() {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.08);
  osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(vol(0.1), ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}

/**
 * Initialize event-bus-driven SFX.
 * Call once at app startup. SFX will auto-play on STATE_CHANGED events.
 * Also responds to SFX_PLAY events for ad-hoc sounds.
 */
export function initSfxEventBus(): () => void {
  if (busSubscribed) return () => {};
  busSubscribed = true;

  const sfxMap: Record<string, () => void> = {
    listening_pling: playListeningPling,
    stop_bip: playStopBip,
    thinking_shimmer: playThinkingShimmer,
    speaking_chime: playSpeakingChime,
    session_end: playSessionEnd,
    interrupted: playInterrupted,
    wake_chime: playWakeChime,
  };

  const unsubState = eventBus.on("STATE_CHANGED", (event) => {
    if (event.type !== "STATE_CHANGED") return;
    const { state, prev } = event;
    switch (state) {
      case "listening": playListeningPling(); break;
      case "processing": playThinkingShimmer(); break;
      case "speaking": if (prev !== "processing") playSpeakingChime(); break;
      case "interrupted": playInterrupted(); break;
      case "session_end": playSessionEnd(); break;
      case "idle": if (prev === "listening") playStopBip(); break;
    }
  });

  const unsubWake = eventBus.on("WAKE_DETECTED", () => {
    playWakeChime();
  });

  const unsubSfx = eventBus.on("SFX_PLAY", (event) => {
    if (event.type !== "SFX_PLAY") return;
    sfxMap[event.sound]?.();
  });

  return () => {
    unsubState();
    unsubWake();
    unsubSfx();
    busSubscribed = false;
  };
}
