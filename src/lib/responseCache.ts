/**
 * Response Cache — stores common responses to avoid LLM round-trips.
 * Reduces latency for greetings, simple commands, and re-engagement.
 */

type CachedResponse = {
  text: string;
  intent: string;
};

const GREETING_RESPONSES: CachedResponse[] = [
  { text: "Salut ! Content de te voir ! Qu'est-ce qu'on fait ?", intent: "greeting" },
  { text: "Coucou ! Je suis là ! Tu veux jouer ou discuter ?", intent: "greeting" },
  { text: "Hey ! Trop content ! On fait quoi aujourd'hui ?", intent: "greeting" },
  { text: "Salut toi ! Ça fait plaisir ! Tu as envie de quoi ?", intent: "greeting" },
];

const WAKE_RESPONSES: CachedResponse[] = [
  { text: "Oui ! Je t'écoute !", intent: "wake" },
  { text: "Je suis là ! Dis-moi !", intent: "wake" },
  { text: "Oui oui ! Qu'est-ce qu'il y a ?", intent: "wake" },
  { text: "Hé ! Je suis là !", intent: "wake" },
  { text: "Présent ! Tu veux quoi ?", intent: "wake" },
  { text: "Me voilà ! Parle-moi !", intent: "wake" },
];

const REENGAGE_RESPONSES: CachedResponse[] = [
  { text: "Tu es toujours là ? On continue ?", intent: "reengage" },
  { text: "Hey ! On fait autre chose ?", intent: "reengage" },
];

const NOT_HEARD_RESPONSES: CachedResponse[] = [
  { text: "J'ai pas bien entendu. Tu peux répéter ?", intent: "not_heard" },
  { text: "Hmm, j'ai pas compris. Redis-moi ?", intent: "not_heard" },
];

const ERROR_RESPONSES: CachedResponse[] = [
  { text: "Petit souci. Réessaie !", intent: "error" },
  { text: "Oups ! Attends, je me reprends.", intent: "error" },
];

// Track used indices to avoid repetition
const usedIndices: Record<string, number> = {};

function pickRandom(responses: CachedResponse[]): string {
  const key = responses[0]?.intent || "default";
  const lastIdx = usedIndices[key] ?? -1;
  let idx: number;
  do {
    idx = Math.floor(Math.random() * responses.length);
  } while (idx === lastIdx && responses.length > 1);
  usedIndices[key] = idx;
  return responses[idx].text;
}

// ─── Greeting detection ───
const GREETING_PATTERNS = [
  /^(salut|bonjour|coucou|hello|hi|hey|yo)\s*[!?.]*$/i,
  /^(ça va|comment vas|comment tu vas)\s*[!?.]*$/i,
];

const SIMPLE_YES_NO = [
  /^(oui|ouais|ok|d'accord|non|nan|nope|yep|yes)\s*[!?.]*$/i,
];

export function getCachedResponse(type: "greeting" | "wake" | "reengage" | "not_heard" | "error"): string {
  switch (type) {
    case "greeting": return pickRandom(GREETING_RESPONSES);
    case "wake": return pickRandom(WAKE_RESPONSES);
    case "reengage": return pickRandom(REENGAGE_RESPONSES);
    case "not_heard": return pickRandom(NOT_HEARD_RESPONSES);
    case "error": return pickRandom(ERROR_RESPONSES);
  }
}

export function isSimpleGreeting(text: string): boolean {
  return GREETING_PATTERNS.some(p => p.test(text.trim()));
}

export function isSimpleYesNo(text: string): boolean {
  return SIMPLE_YES_NO.some(p => p.test(text.trim()));
}
