import { describe, it, expect, beforeEach } from "vitest";
import {
  tryStartScenario,
  isScenarioActive,
  getScenarioResponse,
  resetScenarios,
  getActiveScenarioInfo,
  getScenarioTriggerIntents,
} from "@/lib/bobby/emotionalScenarios";

beforeEach(() => resetScenarios());

// ── Scenario Activation ─────────────────────────────────────

describe("tryStartScenario", () => {
  it("starts 'peur_noir' on PEUR + matching text", () => {
    const started = tryStartScenario("PEUR", "j'ai peur du noir");
    expect(started).toBe(true);
    expect(isScenarioActive()).toBe(true);
  });

  it("starts 'tristesse_profonde' on TRISTESSE + matching text", () => {
    expect(tryStartScenario("TRISTESSE", "je suis très triste")).toBe(true);
    expect(getActiveScenarioInfo()?.id).toBe("tristesse_profonde");
  });

  it("starts 'confiance_soi' on MANQUE_CONFIANCE + matching text", () => {
    expect(tryStartScenario("MANQUE_CONFIANCE", "je suis nul")).toBe(true);
    expect(getActiveScenarioInfo()?.id).toBe("confiance_soi");
  });

  it("starts 'harcelement' on HARCELEMENT + matching text", () => {
    expect(tryStartScenario("HARCELEMENT", "on m'embête à l'école")).toBe(true);
    expect(getActiveScenarioInfo()?.id).toBe("harcelement");
  });

  it("starts 'crise_critique' on CRISE_SECURITE + matching text", () => {
    expect(tryStartScenario("CRISE_SECURITE", "je veux disparaître")).toBe(true);
    expect(getActiveScenarioInfo()?.id).toBe("crise_critique");
  });

  it("starts 'joie_partagee' on JOIE + matching text", () => {
    expect(tryStartScenario("JOIE", "je suis trop content")).toBe(true);
    expect(getActiveScenarioInfo()?.id).toBe("joie_partagee");
  });

  it("starts 'ennui_profond' on ENNUI + matching text", () => {
    expect(tryStartScenario("ENNUI", "je m'ennuie")).toBe(true);
    expect(getActiveScenarioInfo()?.id).toBe("ennui_profond");
  });

  it("does NOT start when intent matches but text doesn't", () => {
    expect(tryStartScenario("PEUR", "bonjour")).toBe(false);
    expect(isScenarioActive()).toBe(false);
  });

  it("does NOT start when text matches but intent doesn't", () => {
    expect(tryStartScenario("GENERAL", "j'ai peur du noir")).toBe(false);
  });

  it("does NOT start a second scenario if one is already active", () => {
    tryStartScenario("PEUR", "j'ai peur du noir");
    const second = tryStartScenario("TRISTESSE", "je suis très triste");
    expect(second).toBe(false);
    expect(getActiveScenarioInfo()?.id).toBe("peur_noir");
  });
});

// ── Scenario Info ────────────────────────────────────────────

describe("getActiveScenarioInfo", () => {
  it("returns null when no scenario is active", () => {
    expect(getActiveScenarioInfo()).toBeNull();
  });

  it("returns correct info after starting", () => {
    tryStartScenario("PEUR", "j'ai peur du noir");
    const info = getActiveScenarioInfo();
    expect(info).not.toBeNull();
    expect(info!.id).toBe("peur_noir");
    expect(info!.step).toBe(0);
    expect(info!.stage).toBe("acknowledge");
    expect(info!.totalSteps).toBe(4);
  });
});

// ── Scenario Response & Progression ─────────────────────────

describe("getScenarioResponse", () => {
  it("returns null when no scenario is active", () => {
    expect(getScenarioResponse("quelque chose")).toBeNull();
  });

  it("returns a response with faceState from step 0", () => {
    tryStartScenario("PEUR", "j'ai peur du noir");
    const resp = getScenarioResponse("oui");
    expect(resp).not.toBeNull();
    expect(resp!.text.length).toBeGreaterThan(5);
    expect(resp!.faceState).toBe("reassuring");
  });

  it("advances through all 4 stages with fallbackAdvance", () => {
    tryStartScenario("TRISTESSE", "je suis très triste");
    
    // Step 0 → acknowledge (fallbackAdvance)
    const r0 = getScenarioResponse("oui");
    expect(r0!.isComplete).toBe(false);
    expect(getActiveScenarioInfo()?.stage).toBe("explore");

    // Step 1 → explore (fallbackAdvance)
    const r1 = getScenarioResponse("je suis tout seul");
    expect(r1!.isComplete).toBe(false);
    expect(getActiveScenarioInfo()?.stage).toBe("support");

    // Step 2 → support (fallbackAdvance)
    const r2 = getScenarioResponse("d'accord");
    expect(r2!.isComplete).toBe(false);
    expect(getActiveScenarioInfo()?.stage).toBe("resolve");

    // Step 3 → resolve (no fallbackAdvance — stays until topic change)
    const r3 = getScenarioResponse("merci");
    expect(r3!.isComplete).toBe(false);
    expect(isScenarioActive()).toBe(true);
    expect(getActiveScenarioInfo()?.stage).toBe("resolve");
  });

  it("does not include child name in responses", () => {
    tryStartScenario("PEUR", "j'ai peur du noir");
    for (let i = 0; i < 4; i++) {
      const resp = getScenarioResponse("oui");
      if (resp) {
        expect(resp.text).not.toContain("TestChild");
      }
    }
  });
});

// ── Reset ────────────────────────────────────────────────────

describe("resetScenarios", () => {
  it("clears the active scenario", () => {
    tryStartScenario("PEUR", "j'ai peur du noir");
    expect(isScenarioActive()).toBe(true);
    resetScenarios();
    expect(isScenarioActive()).toBe(false);
    expect(getActiveScenarioInfo()).toBeNull();
  });

  it("allows starting a new scenario after reset", () => {
    tryStartScenario("PEUR", "j'ai peur du noir");
    resetScenarios();
    expect(tryStartScenario("TRISTESSE", "je suis très triste")).toBe(true);
    expect(getActiveScenarioInfo()?.id).toBe("tristesse_profonde");
  });
});

// ── Trigger Intents Lookup ───────────────────────────────────

describe("getScenarioTriggerIntents", () => {
  it("returns trigger intents for known scenario", () => {
    const intents = getScenarioTriggerIntents("peur_noir");
    expect(intents).toContain("PEUR");
  });

  it("returns empty array for unknown scenario", () => {
    expect(getScenarioTriggerIntents("unknown_id")).toEqual([]);
  });
});

// ── Full Multi-Turn Journey ──────────────────────────────────

describe("Full emotional journey", () => {
  it("completes a full 'peur_noir' journey through all 4 stages", () => {
    tryStartScenario("PEUR", "j'ai peur du noir");
    const responses: string[] = [];

    // acknowledge → explore → support (all have fallbackAdvance)
    responses.push(getScenarioResponse("oui j'ai peur")!.text);
    responses.push(getScenarioResponse("les monstres sous le lit")!.text);
    responses.push(getScenarioResponse("d'accord j'essaye")!.text);

    // resolve — stays active (no fallbackAdvance)
    const last = getScenarioResponse("merci Bobby")!;
    responses.push(last.text);

    expect(responses).toHaveLength(4);
    expect(last.isComplete).toBe(false); // resolve stage stays until topic change
    expect(isScenarioActive()).toBe(true);
    expect(getActiveScenarioInfo()?.stage).toBe("resolve");
    responses.forEach(r => expect(r.length).toBeGreaterThan(5));
  });

  it("completes 'crise_critique' with reassuring face states throughout", () => {
    tryStartScenario("CRISE_SECURITE", "je veux disparaître");
    const faceStates: string[] = [];

    for (let i = 0; i < 4; i++) {
      const resp = getScenarioResponse("oui");
      if (resp) faceStates.push(resp.faceState);
    }

    // crise_critique uses reassuring face states throughout
    faceStates.forEach(fs => expect(fs).toMatch(/reassuring|attentive/));
  });
});
