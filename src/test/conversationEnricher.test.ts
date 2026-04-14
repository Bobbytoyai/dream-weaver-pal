import { describe, it, expect, beforeEach } from "vitest";
import { buildContextSummary, pickRebond, detectRebondTopic } from "@/lib/bobby/conversationEnricher";
import { resetInterestTracker, trackInterests } from "@/lib/bobby/interestTracker";

beforeEach(() => {
  resetInterestTracker();
});

describe("buildContextSummary", () => {
  it("returns empty string for < 2 messages", () => {
    expect(buildContextSummary([])).toBe("");
    expect(buildContextSummary([{ role: "user", content: "salut" }])).toBe("");
  });

  it("includes turn count", () => {
    const msgs = [
      { role: "user" as const, content: "salut" },
      { role: "assistant" as const, content: "coucou" },
    ];
    const summary = buildContextSummary(msgs);
    expect(summary).toContain("Tour n°1");
  });

  it("detects topics from messages", () => {
    const msgs = [
      { role: "user" as const, content: "j'adore mon chat" },
      { role: "assistant" as const, content: "oh super !" },
    ];
    const summary = buildContextSummary(msgs);
    expect(summary).toContain("animaux");
  });

  it("detects positive mood", () => {
    const msgs = [
      { role: "user" as const, content: "c'est super cool !" },
      { role: "assistant" as const, content: "génial !" },
    ];
    const summary = buildContextSummary(msgs);
    expect(summary).toContain("positif");
  });

  it("detects negative mood", () => {
    const msgs = [
      { role: "user" as const, content: "je suis triste" },
      { role: "assistant" as const, content: "oh non" },
    ];
    const summary = buildContextSummary(msgs);
    expect(summary).toContain("négatif");
  });

  it("extracts key facts like pet names", () => {
    const msgs = [
      { role: "user" as const, content: "mon chat s'appelle Moustache" },
      { role: "assistant" as const, content: "oh trop mignon !" },
    ];
    const summary = buildContextSummary(msgs);
    expect(summary).toContain("Moustache");
  });

  it("extracts 'j'aime' preferences", () => {
    const msgs = [
      { role: "user" as const, content: "j'adore les dinosaures" },
      { role: "assistant" as const, content: "c'est cool !" },
    ];
    const summary = buildContextSummary(msgs);
    expect(summary).toContain("les dinosaures");
  });

  it("includes last user and assistant messages", () => {
    const msgs = [
      { role: "user" as const, content: "je veux jouer" },
      { role: "assistant" as const, content: "super idée !" },
      { role: "user" as const, content: "on fait un quiz" },
      { role: "assistant" as const, content: "c'est parti" },
    ];
    const summary = buildContextSummary(msgs);
    expect(summary).toContain("on fait un quiz");
    expect(summary).toContain("c'est parti");
  });

  it("includes interest data when tracked", () => {
    trackInterests("j'adore les étoiles et les planètes");
    trackInterests("la fusée c'est trop cool");
    const msgs = [
      { role: "user" as const, content: "j'adore les étoiles" },
      { role: "assistant" as const, content: "c'est beau !" },
      { role: "user" as const, content: "la fusée c'est cool" },
      { role: "assistant" as const, content: "oui !" },
    ];
    const summary = buildContextSummary(msgs);
    expect(summary).toContain("espace");
  });

  it("adds continuity instruction for detected topic", () => {
    const msgs = [
      { role: "user" as const, content: "j'aime l'école" },
      { role: "assistant" as const, content: "super !" },
    ];
    const summary = buildContextSummary(msgs);
    expect(summary).toContain("CONSIGNE DE CONTINUITÉ");
    expect(summary).toContain("école");
  });
});

describe("pickRebond", () => {
  it("returns a question for a known topic", () => {
    const result = pickRebond("animaux", []);
    expect(result).toBeTruthy();
    expect(result!.length).toBeGreaterThan(5);
  });

  it("returns a general question for unknown topic", () => {
    const result = pickRebond("topicInconnu", []);
    expect(result).toBeTruthy();
  });

  it("returns a general question for null topic", () => {
    const result = pickRebond(null, []);
    expect(result).toBeTruthy();
  });

  it("excludes already-used rebonds", () => {
    const used: string[] = [];
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const r = pickRebond("animaux", used);
      if (r) {
        results.add(r);
        used.push(r);
      }
    }
    // Should have used multiple unique rebonds
    expect(results.size).toBeGreaterThan(1);
  });

  it("returns null when all rebonds are used", () => {
    // Use all animaux rebonds
    const allAnimaux = [
      "Tu as un animal préféré ? 🐾",
      "Si tu pouvais avoir n'importe quel animal, tu choisirais lequel ?",
      "Tu sais quel bruit il fait ? 😄",
      "Tu en as déjà vu un en vrai ?",
    ];
    const result = pickRebond("animaux", allAnimaux);
    expect(result).toBeNull();
  });
});

describe("detectRebondTopic", () => {
  it("detects animaux", () => {
    expect(detectRebondTopic("j'ai un chat")).toBe("animaux");
    expect(detectRebondTopic("les dinosaures c'est cool")).toBe("animaux");
  });

  it("detects école", () => {
    expect(detectRebondTopic("à l'école on a fait")).toBe("école");
  });

  it("detects famille", () => {
    expect(detectRebondTopic("ma maman est gentille")).toBe("famille");
  });

  it("detects espace", () => {
    expect(detectRebondTopic("les étoiles brillent")).toBe("espace");
  });

  it("detects nourriture", () => {
    expect(detectRebondTopic("je veux du chocolat")).toBe("nourriture");
  });

  it("returns null for unrecognized text", () => {
    expect(detectRebondTopic("abcdef xyz")).toBeNull();
  });
});
