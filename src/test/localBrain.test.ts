import { describe, it, expect } from "vitest";
import { detectLocalIntent, isGarbledText } from "@/lib/bobby/localBrain/intentEngine";
import { assembleResponse } from "@/lib/bobby/localBrain/assembly";
import { TEMPLATES } from "@/lib/bobby/localBrain/templates";
import { resetLocalBrain } from "@/lib/bobby/localBrain/memory";
import type { LocalIntent } from "@/lib/bobby/localBrain/types";

describe("Intent Detection", () => {
  beforeEach(() => resetLocalBrain());

  const cases: [string, LocalIntent][] = [
    ["bonjour", "SALUT"],
    ["salut Bobby", "SALUT"],
    ["au revoir", "AU_REVOIR"],
    ["j'ai peur du noir", "PEUR"],
    ["je suis triste", "TRISTESSE"],
    ["je suis en colère", "COLERE"],
    ["je m'ennuie", "ENNUI"],
    ["raconte-moi une histoire", "HISTOIRE"],
    ["on joue à un jeu", "JEU"],
    ["dis-moi une blague", "BLAGUE"],
    ["j'ai faim", "NOURRITURE"],
    ["je suis fatigué", "DODO"],
    ["on se moque de moi à l'école", "HARCELEMENT"],
    ["mes parents se disputent", "CONFLIT_FAMILLE"],
    ["je suis nul", "MANQUE_CONFIANCE"],
    ["merci Bobby", "GRATITUDE"],
    ["oui", "OUI"],
    ["non", "NON"],
    ["qui es-tu", "IDENTITE_BOBBY"],
    ["pourquoi le ciel est bleu", "QUESTION_COMPLEXE"],
    ["je veux mourir", "CRISE_SECURITE"],
    ["parle anglais", "DEMANDE_LANGUE"],
  ];

  it.each(cases)("'%s' → %s", (input, expected) => {
    expect(detectLocalIntent(input)).toBe(expected);
  });

  it("returns GENERAL for unknown input", () => {
    expect(detectLocalIntent("le chat mange du poisson")).toBe("GENERAL");
  });
});

describe("Garbled Text Detection", () => {
  it("detects garbled text", () => {
    expect(isGarbledText("xkfgh")).toBe(true);
    expect(isGarbledText("")).toBe(true);
  });

  it("passes valid French", () => {
    expect(isGarbledText("je suis content")).toBe(false);
    expect(isGarbledText("oui")).toBe(false);
  });

  it("passes valid English", () => {
    expect(isGarbledText("speak english please")).toBe(false);
  });
});

describe("Template Coverage", () => {
  const requiredIntents: LocalIntent[] = [
    "SALUT", "AU_REVOIR", "PEUR", "TRISTESSE", "COLERE", "JOIE",
    "ENNUI", "HISTOIRE", "JEU", "BLAGUE", "GENERAL",
    "CRISE_SECURITE", "CONTENU_BLOQUE", "HARCELEMENT",
  ];

  it.each(requiredIntents)("TEMPLATES has entry for %s", (intent) => {
    expect(TEMPLATES[intent]).toBeDefined();
    expect(TEMPLATES[intent]!.default).toBeDefined();
    expect(TEMPLATES[intent]!.default.response.length).toBeGreaterThan(0);
  });
});

describe("Response Assembly", () => {
  beforeEach(() => resetLocalBrain());

  it("produces a non-empty string for each intent", () => {
    const intents: LocalIntent[] = ["SALUT", "PEUR", "TRISTESSE", "HISTOIRE", "JEU", "GENERAL"];
    const emotion = { type: "neutral" as const, intensity: 1 };

    for (const intent of intents) {
      const result = assembleResponse(intent, emotion, "Enfant", 7);
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(3);
    }
  });

  it("uses emotional template when emotion matches", () => {
    const emotion = { type: "fear" as const, intensity: 4 };
    const result = assembleResponse("PEUR", emotion, "Enfant", 7);
    expect(result).toBeTruthy();
  });

  it("falls back to default template for unknown emotion", () => {
    const emotion = { type: "neutral" as const, intensity: 1 };
    const result = assembleResponse("SALUT", emotion, "Enfant", 7);
    expect(result).toBeTruthy();
  });

  it("does not inject child name", () => {
    const emotion = { type: "neutral" as const, intensity: 1 };
    // Run many times to cover probabilistic paths
    for (let i = 0; i < 20; i++) {
      const result = assembleResponse("SALUT", emotion, "TestName123", 7);
      expect(result).not.toContain("TestName123");
    }
  });
});

describe("Priority Ordering", () => {
  beforeEach(() => resetLocalBrain());

  it("CRISE_SECURITE beats TRISTESSE for 'je veux mourir'", () => {
    expect(detectLocalIntent("je veux mourir")).toBe("CRISE_SECURITE");
  });

  it("HARCELEMENT beats generic for 'on se moque de moi'", () => {
    expect(detectLocalIntent("on se moque de moi")).toBe("HARCELEMENT");
  });

  it("DEMANDE_LANGUE has highest priority", () => {
    expect(detectLocalIntent("parle en anglais s'il te plaît")).toBe("DEMANDE_LANGUE");
  });
});
