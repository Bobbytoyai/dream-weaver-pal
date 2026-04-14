import {
  BLAGUES,
  CONTENU_CATEGORIES,
  HISTOIRES,
  formatBlagueForTTS,
  getBibliothequeStats,
  getRandomBlague,
  getRandomHistoire,
} from "@/lib/bobby-content";
import type { BobbyBrainReply, BobbyLibraryCollection, PendingNarration } from "./types";

const STORY_THEME_KEYWORDS: Record<string, string[]> = {
  pirate: ["pirate", "trésor", "tresor", "bateau", "capitaine"],
  princesse: ["princesse", "château", "chateau", "reine", "fée", "fee"],
  espace: ["espace", "fusée", "fusee", "lune", "étoile", "etoile", "planète", "planete"],
  animaux: ["animal", "lion", "chat", "chien", "dinosaure", "renard", "lapin"],
  magie: ["magie", "sorcier", "sorcière", "sorciere", "baguette", "fée", "fee"],
  dodo: ["dodo", "nuit", "rêve", "reve", "berceuse", "sommeil"],
};

function personalize(text: string, _childName: string): string {
  return text.replace(/\{child_name\}/g, "");
}

function detectStoryTheme(text: string): string | undefined {
  const normalized = text.toLowerCase();
  return Object.entries(STORY_THEME_KEYWORDS).find(([, keywords]) => keywords.some((keyword) => normalized.includes(keyword)))?.[0];
}

function getCollectionsForAge(age: number): BobbyLibraryCollection[] {
  return [
    {
      id: "histoires",
      title: "Histoires",
      description: "Histoires complètes adaptées à l'âge et prêtes hors ligne.",
      itemCount: HISTOIRES.filter((story) => age >= story.ageMin && age <= story.ageMax).length,
      downloadable: true,
    },
    {
      id: "blagues",
      title: "Blagues",
      description: "Blagues et réponses courtes pour faire rire Bobby sans cloud.",
      itemCount: BLAGUES.filter((joke) => age >= joke.ageMin && age <= joke.ageMax).length,
      downloadable: true,
    },
    {
      id: "contenus",
      title: "Contenus",
      description: "Catégories éducatives et thèmes parentaux disponibles localement.",
      itemCount: CONTENU_CATEGORIES.length,
      downloadable: true,
    },
  ];
}

export function getBobbyLibrarySnapshot(childAge: number) {
  return {
    stats: getBibliothequeStats(),
    collections: getCollectionsForAge(childAge),
  };
}

export function getLibraryReply(text: string, childName: string, childAge: number): BobbyBrainReply | null {
  const normalized = text.toLowerCase();

  if (/blague|drôle|drole|rigol|rire/.test(normalized)) {
    const blague = getRandomBlague(childAge);
    if (!blague) return null;

    return {
      text: formatBlagueForTTS(blague),
      intent: "JOKE_REQUEST",
      source: "library",
      emotion: "playful",
      confidence: 1,
      isOffline: true,
    };
  }

  if (/histoire|conte|raconte/.test(normalized)) {
    const theme = detectStoryTheme(normalized);
    const histoire = getRandomHistoire(childAge, theme);
    if (!histoire) return null;

    return {
      text: personalize(histoire.texte, childName),
      intent: "STORY_REQUEST",
      source: "library",
      emotion: histoire.theme === "dodo" ? "calm" : "curious",
      confidence: 1,
      isOffline: true,
    };
  }

  if (/bibliothèque|bibliotheque|contenu|télécharg|telecharg/.test(normalized)) {
    const snapshot = getBobbyLibrarySnapshot(childAge);
    const summary = snapshot.collections.map((collection) => `${collection.title.toLowerCase()} (${collection.itemCount})`).join(", ");

    return {
      text: `Ma bibliothèque hors ligne est prête avec ${summary}. Je peux lancer une histoire, une blague ou un contenu éducatif immédiatement.`,
      intent: "LIBRARY_OVERVIEW",
      source: "library",
      emotion: "proud",
      confidence: 1,
      isOffline: true,
    };
  }

  return null;
}

export function getNarrationText(pendingNarration: PendingNarration, childName: string): string {
  const intro = pendingNarration.title ? `${pendingNarration.title}. ` : "";
  return personalize(`${intro}${pendingNarration.text}`.trim(), childName);
}