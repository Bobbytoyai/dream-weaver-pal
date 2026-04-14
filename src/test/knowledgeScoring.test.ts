import { describe, it, expect } from "vitest";
import { normalize, stem, tokenize } from "@/lib/bobby/knowledgeQuery/textProcessing";
import {
  fuzzyMatch,
  scoreKeywords,
  scoreQuestion,
  scoreFullContainment,
  contextBonus,
  expandWithSemantics,
  clearConversationContext,
  pushConversationContext,
} from "@/lib/bobby/knowledgeQuery/scoring";
import { extractFocus, focusPenalty } from "@/lib/bobby/knowledgeQuery/focusExtraction";

// ── Text Processing ──────────────────────────────────────────

describe("normalize", () => {
  it("lowercases and removes accents", () => {
    expect(normalize("Éléphant")).toBe("elephant");
  });
  it("replaces apostrophes with spaces", () => {
    expect(normalize("l'étoile")).toBe("l etoile");
  });
  it("removes punctuation", () => {
    expect(normalize("Bonjour! Comment ça va?")).toBe("bonjour comment ca va");
  });
});

describe("stem", () => {
  it("strips -er suffix", () => expect(stem("manger")).toBe("mang"));
  it("strips -tion suffix", () => expect(stem("education")).toBe("educa"));
  it("strips -ement suffix", () => expect(stem("doucement")).toBe("douc"));
  it("strips -eux suffix", () => expect(stem("dangereux")).toBe("danger"));
  it("strips plural -s", () => expect(stem("chats")).toBe("chat"));
  it("keeps short words", () => expect(stem("eau")).toBe("eau"));
});

describe("tokenize", () => {
  it("removes stop words", () => {
    const tokens = tokenize("je suis un petit chat");
    expect(tokens).not.toContain("je");
    expect(tokens).not.toContain("suis");
    expect(tokens).toContain("petit");
    expect(tokens).toContain("chat");
  });
  it("normalizes accents", () => {
    const tokens = tokenize("l'éléphant mange");
    expect(tokens).toContain("elephant");
  });
});

// ── Fuzzy Match ──────────────────────────────────────────────

describe("fuzzyMatch", () => {
  it("exact match → 1.0", () => {
    expect(fuzzyMatch("planete", "planete")).toBe(1.0);
  });
  it("stem match → 0.9", () => {
    expect(fuzzyMatch("manger", "mangeur")).toBe(0.9);
  });
  it("no match → 0", () => {
    expect(fuzzyMatch("chat", "voiture")).toBe(0);
  });
  it("rejects partial overlap (continent vs content)", () => {
    expect(fuzzyMatch("continent", "content")).toBeLessThan(0.8);
  });
});

// ── Semantic Expansion ───────────────────────────────────────

describe("expandWithSemantics", () => {
  it("expands tokens with related words", () => {
    const expanded = expandWithSemantics(["planete"]);
    expect(expanded.has("planete")).toBe(true);
    // Should include some space-related words
    expect(expanded.size).toBeGreaterThan(1);
  });
});

// ── Score Keywords ───────────────────────────────────────────

describe("scoreKeywords", () => {
  it("scores high when input matches keywords", () => {
    const tokens = tokenize("pourquoi le soleil brille");
    const expanded = expandWithSemantics(tokens);
    const score = scoreKeywords(tokens, expanded, ["soleil", "briller", "lumiere"]);
    expect(score).toBeGreaterThan(0.3);
  });

  it("scores low when input doesn't match", () => {
    const tokens = tokenize("je veux jouer");
    const expanded = expandWithSemantics(tokens);
    const score = scoreKeywords(tokens, expanded, ["soleil", "briller", "lumiere"]);
    expect(score).toBeLessThan(0.2);
  });

  it("handles empty keywords", () => {
    const tokens = tokenize("bonjour");
    const expanded = expandWithSemantics(tokens);
    expect(scoreKeywords(tokens, expanded, [])).toBe(0);
  });
});

// ── Score Question ───────────────────────────────────────────

describe("scoreQuestion", () => {
  it("scores high for similar questions", () => {
    const tokens = tokenize("pourquoi le ciel est bleu");
    const score = scoreQuestion(tokens, "Pourquoi le ciel est-il bleu ?");
    expect(score).toBeGreaterThan(0.4);
  });

  it("scores low for unrelated questions", () => {
    const tokens = tokenize("je veux un gâteau");
    const score = scoreQuestion(tokens, "Pourquoi les étoiles brillent ?");
    expect(score).toBeLessThan(0.2);
  });
});

// ── Full Containment ─────────────────────────────────────────

describe("scoreFullContainment", () => {
  it("scores high when input contains the question", () => {
    const score = scoreFullContainment(
      normalize("dis-moi pourquoi le ciel est bleu"),
      normalize("pourquoi le ciel est bleu")
    );
    expect(score).toBeGreaterThanOrEqual(0.85);
  });

  it("returns 0 for unrelated text", () => {
    expect(scoreFullContainment(
      normalize("je veux jouer"),
      normalize("pourquoi le ciel est bleu")
    )).toBe(0);
  });
});

// ── Context Bonus ────────────────────────────────────────────

describe("contextBonus", () => {
  beforeEach(() => clearConversationContext());

  it("returns 0 with no context", () => {
    expect(contextBonus(["espace", "planete"])).toBe(0);
  });

  it("returns bonus when context overlaps", () => {
    pushConversationContext("parle-moi des planètes");
    const bonus = contextBonus(["planete", "espace"]);
    expect(bonus).toBeGreaterThan(0);
  });
});

// ── Focus + Scoring Integration ──────────────────────────────

describe("Focus-aware scoring integration", () => {
  beforeEach(() => clearConversationContext());

  it("penalizes KB entries that don't match the question focus", () => {
    const focusWords = extractFocus("quelle est l'origine de mon prénom");

    // Entry about names → should pass
    const namePenalty = focusPenalty(focusWords, ["prenom", "nom", "origine"]);
    // Entry about China → should be penalized
    const chinaPenalty = focusPenalty(focusWords, ["chine", "pays", "asie"]);

    expect(namePenalty).toBeGreaterThan(chinaPenalty);
    expect(chinaPenalty).toBeLessThanOrEqual(0.3);
  });

  it("no penalty when no focus is detected", () => {
    expect(focusPenalty([], ["anything"])).toBe(1.0);
  });

  it("composite scoring: focus prevents wrong match", () => {
    const userText = "quelle est l'origine de mon prénom";
    const tokens = tokenize(userText);
    const expanded = expandWithSemantics(tokens);
    const focusWords = extractFocus(userText);

    // Simulate two KB entries
    const chinaKw = ["chine", "pays", "asie", "origine", "histoire"];
    const nameKw = ["prenom", "nom", "origine", "identite", "etymologie"];

    const chinaRaw = scoreKeywords(tokens, expanded, chinaKw);
    const nameRaw = scoreKeywords(tokens, expanded, nameKw);

    const chinaFinal = chinaRaw * focusPenalty(focusWords, chinaKw);
    const nameFinal = nameRaw * focusPenalty(focusWords, nameKw);

    // The name entry should win over China, even if China also has "origine"
    expect(nameFinal).toBeGreaterThan(chinaFinal);
  });
});
