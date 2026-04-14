import { describe, it, expect } from "vitest";
import { extractFocus, focusPenalty } from "@/lib/bobby/knowledgeQuery/focusExtraction";

describe("Focus Extraction", () => {
  it("extracts focus from 'l'origine de mon prénom'", () => {
    const focus = extractFocus("quelle est l'origine de mon prénom");
    expect(focus).toContain("prenom");
  });

  it("extracts focus from 'parle-moi de la Chine'", () => {
    const focus = extractFocus("parle-moi de la Chine");
    expect(focus).toContain("chine");
  });

  it("extracts focus from 'c'est quoi un dinosaure'", () => {
    const focus = extractFocus("c'est quoi un dinosaure");
    expect(focus).toContain("dinosaure");
  });

  it("extracts focus from 'pourquoi les étoiles brillent'", () => {
    const focus = extractFocus("pourquoi les étoiles brillent");
    expect(focus.length).toBeGreaterThan(0);
    expect(focus).toContain("etoiles");
  });

  it("extracts focus from 'comment fonctionne un avion'", () => {
    const focus = extractFocus("comment fonctionne un avion");
    expect(focus).toContain("avion");
  });

  it("returns empty for simple greetings", () => {
    expect(extractFocus("salut")).toEqual([]);
    expect(extractFocus("bonjour")).toEqual([]);
  });
});

describe("Focus Penalty", () => {
  it("returns 1.0 when no focus detected", () => {
    expect(focusPenalty([], ["chine", "pays"])).toBe(1.0);
  });

  it("returns 1.0 when focus matches keywords", () => {
    expect(focusPenalty(["prenom"], ["prenom", "nom", "identite"])).toBe(1.0);
  });

  it("returns 0.3 when focus doesn't match keywords at all", () => {
    // User asks about "prénom" but KB entry is about "chine"
    expect(focusPenalty(["prenom"], ["chine", "pays", "asie", "continent"])).toBe(0.3);
  });

  it("returns partial penalty for partial match", () => {
    const penalty = focusPenalty(["prenom", "origine"], ["origine", "histoire"]);
    expect(penalty).toBeGreaterThan(0.3);
    expect(penalty).toBeLessThanOrEqual(1.0);
  });

  it("prevents China KB match when asking about name origin", () => {
    const focusWords = extractFocus("quelle est l'origine de mon prénom");
    // KB entry about China shouldn't match well
    const chinaKeywords = ["chine", "pays", "asie", "continent", "histoire"];
    const chinaPenalty = focusPenalty(focusWords, chinaKeywords);
    
    // KB entry about names should match well
    const nameKeywords = ["prenom", "nom", "origine", "identite"];
    const namePenalty = focusPenalty(focusWords, nameKeywords);

    expect(chinaPenalty).toBeLessThan(namePenalty);
    expect(chinaPenalty).toBeLessThanOrEqual(0.6);
  });
});
