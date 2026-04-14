import type { FaceState } from "@/components/hologram/useFaceAnimation";
import type { LocalIntent, EmotionType, DetectedEmotion } from "./types";
import { isResponseUsed, getLastChildTurn, mem } from "./memory";
import { TEMPLATES } from "./templates";

export function pick(arr: string[]): string {
  if (!arr || arr.length === 0) return "";
  // Try to pick a non-recently-used response
  const fresh = arr.filter(s => !isResponseUsed(s));
  const pool = fresh.length > 0 ? fresh : arr;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function assembleResponse(
  intent: LocalIntent,
  emotion: DetectedEmotion,
  childName: string,
  childAge: number,
): string {
  const templateGroup = TEMPLATES[intent] || TEMPLATES.GENERAL!;
  const template = templateGroup[emotion.type as EmotionType] || templateGroup.default;

  // Context-aware YES/NO
  if (intent === "OUI" || intent === "NON") {
    const lastTurn = getLastChildTurn();
    if (lastTurn && mem.turns.length > 1) {
      // Bobby asked something, child said yes/no → respond contextually
      const lastBobbyTurn = mem.turns.filter(t => t.role === "bobby").pop();
      if (lastBobbyTurn?.text) {
        if (intent === "OUI") {
          if (/histoire|raconte/i.test(lastBobbyTurn.text)) return "Super ! Alors écoute bien… 📖";
          if (/jeu|jouer|défi/i.test(lastBobbyTurn.text)) return "C'est parti ! 🎮 Prêt ?";
          if (/parler|expliquer|raconter/i.test(lastBobbyTurn.text)) return "Je t'écoute, vas-y 💛";
        } else {
          if (/histoire|jeu/i.test(lastBobbyTurn.text)) return "Pas de souci ! Tu veux faire quoi à la place ? 😊";
        }
      }
    }
  }

  // Build response parts
  const parts: string[] = [];

  // Empathy (always for emotional intents, ~60% for others)
  if (emotion.intensity >= 3 || Math.random() < 0.6) {
    const empathy = pick(template.empathy);
    if (empathy) parts.push(empathy);
  }

  // Core response
  const response = pick(template.response);
  if (response) parts.push(response);

  // Opening (question/interaction) — not for farewells/sleep
  if (intent !== "AU_REVOIR" && intent !== "DODO" && intent !== "CONTENU_BLOQUE") {
    if (template.opening.length > 0 && Math.random() < 0.7) {
      const opening = pick(template.opening);
      if (opening) parts.push(opening);
    }
  }

  let text = parts.join(" ");

  // Topic continuity — if same topic, add depth
  if (mem.currentTopic && mem.topicDepth >= 2 && Math.random() < 0.3) {
    const topicRef = TOPIC_DEPTH_RESPONSES[mem.currentTopic];
    if (topicRef) {
      const topicLine = pick(topicRef);
      if (topicLine) text += " " + topicLine;
    }
  }

  // Smart name injection:
  // - Always on first turn of session
  // - ~70% for emotional intents (intensity >= 3)
  // - ~40% for normal conversation
  // - ~20% for trivial/fun intents
  if (childName && !text.includes(childName)) {
    const emotionalIntents: LocalIntent[] = [
      "PEUR", "TRISTESSE", "COLERE", "HONTE", "SOLITUDE", "HARCELEMENT",
      "MANQUE_CONFIANCE", "CRISE_SECURITE", "PEUR_ABANDON", "PEUR_ECHEC",
      "ABANDON", "FATIGUE_EMOTIONNELLE", "ANXIETE", "IDENTITE_PEUR",
    ];
    const isEmotional = emotionalIntents.includes(intent) || emotion.intensity >= 3;
    const isFirstTurn = mem.turnCount <= 2;
    const nameChance = isFirstTurn ? 1.0 : isEmotional ? 0.7 : 0.35;

    if (Math.random() < nameChance) {
      // Place name at start with 💛 for emotional, plain for others
      if (isEmotional) {
        text = `${childName} 💛 ${text.charAt(0).toLowerCase() + text.slice(1)}`;
      } else {
        text = `${childName}, ${text.charAt(0).toLowerCase() + text.slice(1)}`;
      }
    }
  }

  // Age adaptation
  if (childAge <= 4) {
    text = text.replace(/formidable|extraordinaire/g, "super")
               .replace(/frustrant/g, "embêtant")
               .replace(/contagieux/g, "magique");
  }

  return text;
}

// Topic depth responses — when child stays on same topic
export const TOPIC_DEPTH_RESPONSES: Record<string, string[]> = {
  animaux: [
    "Tu sais vraiment plein de trucs sur les animaux ! 🐾",
    "On dirait un vrai expert des animaux !",
  ],
  espace: [
    "Tu es un vrai astronaute ! 🚀",
    "L'espace n'a plus de secrets pour toi !",
  ],
  famille: [
    "Ta famille a l'air géniale 💛",
  ],
  école: [
    "Tu es vraiment motivé pour l'école, c'est super ! 📝",
  ],
  sport: [
    "Tu es un vrai sportif ! ⚽",
  ],
  nature: [
    "Tu adores la nature, c'est beau ! 🌿",
  ],
  musique: [
    "Tu es un vrai mélomane ! 🎵",
  ],
  art: [
    "Tu as l'âme d'un artiste ! 🎨",
  ],
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. INTENT → FACE STATE MAPPING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const INTENT_FACE_MAP: Partial<Record<LocalIntent, FaceState>> = {
  PEUR: "reassuring",
  TRISTESSE: "reassuring",
  COLERE: "calm",
  JOIE: "happy",
  ENNUI: "playful",
  HONTE: "reassuring",
  JALOUSIE: "reassuring",
  SURPRISE: "surprised",
  FIERTE: "proud",
  AMOUR: "happy",
  TIMIDITE: "calm",
  CONFUSION: "curious",
  CONFLIT_FAMILLE: "reassuring",
  CONFLIT_AMI: "reassuring",
  SOLITUDE: "reassuring",
  HARCELEMENT: "reassuring",
  BESOIN_AFFECTION: "happy",
  BESOIN_AIDE: "attentive",
  MANQUE_CONFIANCE: "reassuring",
  GRATITUDE: "happy",
  ECOLE: "curious",
  NOURRITURE: "playful",
  DODO: "calm",
  HISTOIRE: "curious",
  JEU: "playful",
  BLAGUE: "playful",
  DEVINETTE: "curious",
  AVENTURE: "excited",
  IMAGINATION: "curious",
  APPRENDRE: "curious",
  SALUT: "happy",
  AU_REVOIR: "calm",
  IDENTITE_BOBBY: "proud",
  COMPLIMENT: "proud",
  CONTENU_BLOQUE: "reassuring",
  CRISE_SECURITE: "reassuring",
  FATIGUE: "calm",
  ECHEC: "reassuring",
  OBJECTIF: "excited",
  SANTE: "reassuring",
  PERTE: "reassuring",
  REVE_AVENIR: "excited",
  ABANDON: "reassuring",
  EXCITATION: "excited",
  AMOUREUX: "happy",
  MENSONGE: "reassuring",
  ANXIETE: "reassuring",
  PERFECTIONNISME: "reassuring",
  COMPARAISON: "reassuring",
  FATIGUE_EMOTIONNELLE: "reassuring",
  RETRAIT: "calm",
  PEUR_ABANDON: "reassuring",
  PEUR_ECHEC: "reassuring",
  AVERSION: "reassuring",
  PEOPLE_PLEASING: "reassuring",
  CURIOSITE: "excited",
  CREATION: "excited",
  IDENTITE_PEUR: "reassuring",
  MAUVAIS_COMPORTEMENT: "reassuring",
  STRESS: "reassuring",
  RESISTANCE: "reassuring",
  PARTAGE_QUOTIDIEN: "happy",
  ENVIE: "playful",
  QUESTION_ABSURDE: "playful",
  QUESTION_EXISTENTIELLE: "curious",
};
