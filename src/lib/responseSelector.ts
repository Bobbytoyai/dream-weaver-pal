/**
 * Bobby AI — Smart Response Selector v2.0
 * Anti-repetition + behavioral memory + energy-based selection
 * + emotion history + confidence tracking + learning loop + conversational rebond
 */

// ─── Types ──────────────────────────────────────────────
export type ResponseType = "question" | "jeu" | "soutien" | "fun" | "proposition" | "imagination";
export type EnergyLevel = "low" | "medium" | "high";

export interface TaggedResponse {
  text: string;
  type: ResponseType;
  energy: EnergyLevel;
}

export interface MultiResponseEntry {
  category: string;
  input: string;
  emotion: string;
  tags: string[];
  responses: TaggedResponse[];
}

export interface BehavioralMemory {
  lastInputs: string[];
  lastResponseTexts: string[];
  lastIntents: string[];                    // track last 20 intents
  favoriteTopics: Record<string, number>;
  preferredTypes: Record<string, number>;
  emotionalState: string;
  emotionHistory: string[];                 // last 20 detected emotions
  engagementLevel: number;                  // 0-100
  confidenceLevel: number;                  // 0-100 — child confidence score
  responseScores: Record<string, number>;   // learning loop: response text hash → effectiveness score
  topicsHistory: string[];                  // all discussed topics for rebond
  lastInteractions: { input: string; response: string; emotion: string; timestamp: number }[];
}

// ─── Singleton Memory ───────────────────────────────────
const memory: BehavioralMemory = {
  lastInputs: [],
  lastResponseTexts: [],
  lastIntents: [],
  favoriteTopics: {},
  preferredTypes: {},
  emotionalState: "neutral",
  emotionHistory: [],
  engagementLevel: 50,
  confidenceLevel: 50,
  responseScores: {},
  topicsHistory: [],
  lastInteractions: [],
};

const MAX_HISTORY = 20;
const MAX_INTERACTIONS = 50;

// ─── Public API ─────────────────────────────────────────

export function getMemory(): Readonly<BehavioralMemory> {
  return memory;
}

export function resetMemory(): void {
  memory.lastInputs = [];
  memory.lastResponseTexts = [];
  memory.lastIntents = [];
  memory.favoriteTopics = {};
  memory.preferredTypes = {};
  memory.emotionalState = "neutral";
  memory.emotionHistory = [];
  memory.engagementLevel = 50;
  memory.confidenceLevel = 50;
  memory.responseScores = {};
  memory.topicsHistory = [];
  memory.lastInteractions = [];
}

/** Record that the child said something */
export function recordInput(input: string): void {
  memory.lastInputs.push(input.toLowerCase().trim());
  if (memory.lastInputs.length > MAX_HISTORY) memory.lastInputs.shift();
}

/** Record that Bobby responded with this text */
export function recordResponse(text: string, category?: string, type?: string): void {
  memory.lastResponseTexts.push(text);
  if (memory.lastResponseTexts.length > MAX_HISTORY) memory.lastResponseTexts.shift();

  if (category) {
    memory.favoriteTopics[category] = (memory.favoriteTopics[category] || 0) + 1;
    if (!memory.topicsHistory.includes(category)) {
      memory.topicsHistory.push(category);
      if (memory.topicsHistory.length > 30) memory.topicsHistory.shift();
    }
  }
  if (type) {
    memory.preferredTypes[type] = (memory.preferredTypes[type] || 0) + 1;
  }
}

/** Record intent for anti-repetition */
export function recordIntent(intent: string): void {
  memory.lastIntents.push(intent);
  if (memory.lastIntents.length > MAX_HISTORY) memory.lastIntents.shift();
}

/** Record emotion detection */
export function recordEmotion(emotion: string): void {
  memory.emotionHistory.push(emotion);
  if (memory.emotionHistory.length > MAX_HISTORY) memory.emotionHistory.shift();

  // Adjust confidence based on emotions
  const negativeEmotions = ["tristesse", "peur", "colere", "detresse", "honte", "danger"];
  const positiveEmotions = ["joie", "excitation", "confiance"];
  if (negativeEmotions.includes(emotion)) {
    memory.confidenceLevel = Math.max(0, memory.confidenceLevel - 3);
  } else if (positiveEmotions.includes(emotion)) {
    memory.confidenceLevel = Math.min(100, memory.confidenceLevel + 2);
  }
}

/** Record full interaction for memory-based rebond */
export function recordInteraction(input: string, response: string, emotion: string): void {
  memory.lastInteractions.push({ input, response, emotion, timestamp: Date.now() });
  if (memory.lastInteractions.length > MAX_INTERACTIONS) memory.lastInteractions.shift();
}

/** Update engagement level based on child behavior */
export function updateEngagement(delta: number): void {
  memory.engagementLevel = Math.max(0, Math.min(100, memory.engagementLevel + delta));
}

export function setEmotionalState(emotion: string): void {
  memory.emotionalState = emotion;
  recordEmotion(emotion);
}

// ─── Learning Loop ──────────────────────────────────────
// After each interaction, boost or decrease response effectiveness scores

function hashResponse(text: string): string {
  // Simple hash for tracking
  return text.slice(0, 60).toLowerCase().replace(/\s+/g, "_");
}

/** Boost a response that got engagement (child replied quickly / positively) */
export function boostResponseScore(responseText: string, delta = 1): void {
  const key = hashResponse(responseText);
  memory.responseScores[key] = (memory.responseScores[key] || 0) + delta;
}

/** Decrease a response score (child ignored or changed topic) */
export function penalizeResponseScore(responseText: string, delta = 1): void {
  const key = hashResponse(responseText);
  memory.responseScores[key] = (memory.responseScores[key] || 0) - delta;
}

function getResponseScore(text: string): number {
  return memory.responseScores[hashResponse(text)] || 0;
}

// ─── Conversational Rebond (Memory-Based) ───────────────

/** Generate a memory-based rebond to re-engage the child */
export function getConversationalRebond(childName?: string): string | null {
  if (memory.topicsHistory.length === 0) return null;

  const topicRebonds: Record<string, string[]> = {
    jeux: [
      `Tu voulais rejouer tout à l'heure 😄 on y va ?`,
      `On avait bien rigolé avec le jeu, tu veux recommencer ?`,
    ],
    peurs: [
      `Tu te sens mieux par rapport à ce qui te faisait peur ? 💛`,
    ],
    ecole: [
      `Comment ça se passe à l'école en ce moment ?`,
    ],
    famille: [
      `Tu veux me reparler de ta famille ?`,
    ],
    curiosite: [
      `Tu avais une question super intéressante tout à l'heure 😄`,
    ],
    emotions: [
      `Comment tu te sens maintenant ? 💛`,
    ],
    imagination: [
      `Tu veux qu'on continue notre histoire imaginaire ? 🚀`,
    ],
    animaux: [
      `Tu m'avais dit que tu aimais les animaux 🐾 tu veux en parler ?`,
    ],
  };

  // Pick from recent topics
  const recentTopics = memory.topicsHistory.slice(-5);
  for (const topic of recentTopics.reverse()) {
    const rebonds = topicRebonds[topic];
    if (rebonds) {
      const fresh = rebonds.filter(r => !isRecentlyUsed(r));
      if (fresh.length > 0) {
        let text = fresh[Math.floor(Math.random() * fresh.length)];
        if (childName && !text.includes(childName) && Math.random() > 0.5) {
          text = `${childName}, ${text.charAt(0).toLowerCase() + text.slice(1)}`;
        }
        return text;
      }
    }
  }
  return null;
}

// ─── Dominant Emotion Detection ─────────────────────────

/** Returns the dominant recent emotion for tone adaptation */
export function getDominantEmotion(): string {
  if (memory.emotionHistory.length < 3) return "neutral";
  const recent = memory.emotionHistory.slice(-5);
  const counts: Record<string, number> = {};
  for (const e of recent) counts[e] = (counts[e] || 0) + 1;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? "neutral";
}

// ─── Anti-Repetition Check (Enhanced) ───────────────────

function isRecentlyUsed(text: string): boolean {
  const normalized = text.toLowerCase().trim();
  return memory.lastResponseTexts.some(r => {
    const rNorm = r.toLowerCase().trim();
    // Exact match
    if (rNorm === normalized) return true;
    // Word overlap > 80%
    const words1 = new Set(normalized.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(rNorm.split(/\s+/).filter(w => w.length > 2));
    if (words1.size === 0 || words2.size === 0) return false;
    let overlap = 0;
    for (const w of words1) if (words2.has(w)) overlap++;
    if (overlap / Math.max(words1.size, words2.size) > 0.80) return true;
    // Structural similarity: same sentence start (first 4 words)
    const start1 = normalized.split(/\s+/).slice(0, 4).join(" ");
    const start2 = rNorm.split(/\s+/).slice(0, 4).join(" ");
    if (start1.length > 8 && start1 === start2) return true;
    return false;
  });
}

/** Check if intent was used too recently (avoid same intent < 3 turns) */
export function isIntentRepeated(intent: string): boolean {
  const recent = memory.lastIntents.slice(-3);
  return recent.filter(i => i === intent).length >= 2;
}

// ─── Energy Matching ────────────────────────────────────

function getTargetEnergy(): EnergyLevel {
  if (memory.engagementLevel >= 70) return "high";
  if (memory.engagementLevel >= 40) return "medium";
  return "low";
}

// ─── Type Preference ────────────────────────────────────

function getPreferredType(): string | null {
  const entries = Object.entries(memory.preferredTypes);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

// ─── Smart Selection from Multi-Response ────────────────

export function selectBestResponse(responses: TaggedResponse[]): TaggedResponse | null {
  if (!responses || responses.length === 0) return null;

  // Filter out recently used
  const fresh = responses.filter(r => !isRecentlyUsed(r.text));
  const pool = fresh.length > 0 ? fresh : responses;

  if (pool.length === 1) return pool[0];

  // Score each response
  const targetEnergy = getTargetEnergy();
  const preferredType = getPreferredType();
  const dominantEmo = getDominantEmotion();

  const scored = pool.map(r => {
    let score = Math.random() * 0.2; // random base for variety

    // Energy match bonus
    if (r.energy === targetEnergy) score += 0.3;
    else if (r.energy === "medium" || targetEnergy === "medium") score += 0.15;

    // Type preference bonus
    if (preferredType && r.type === preferredType) score += 0.15;

    // Emotion-appropriate type bonus (enhanced with dominant emotion)
    const emoState = memory.emotionalState;
    if (emoState === "sad" || emoState === "scared" || emoState === "tristesse" || emoState === "peur" || dominantEmo === "tristesse") {
      if (r.type === "soutien") score += 0.35;
    }
    if (emoState === "happy" || emoState === "excited" || emoState === "joie" || dominantEmo === "joie") {
      if (r.type === "jeu" || r.type === "fun") score += 0.2;
    }
    if (emoState === "bored" || emoState === "ennui" || dominantEmo === "ennui") {
      if (r.type === "jeu" || r.type === "proposition") score += 0.3;
    }

    // Confidence-based adaptation: low confidence → favor soutien
    if (memory.confidenceLevel < 30 && r.type === "soutien") score += 0.2;

    // Learning loop: boost responses with high effectiveness scores
    const learnScore = getResponseScore(r.text);
    score += Math.max(-0.2, Math.min(0.3, learnScore * 0.05));

    // Emotional variation: avoid same emotion type in consecutive responses
    if (memory.emotionHistory.length >= 3) {
      const lastEmos = memory.emotionHistory.slice(-3);
      const allSame = lastEmos.every(e => e === lastEmos[0]);
      if (allSame && r.type !== "question") score += 0.1; // favor topic change
    }

    return { response: r, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].response;
}

// ─── Select from flat string array (legacy support) ─────

export function selectNonRepetitiveResponse(responses: string[]): string {
  if (!responses || responses.length === 0) return "";
  
  const fresh = responses.filter(r => !isRecentlyUsed(r));
  const pool = fresh.length > 0 ? fresh : responses;
  
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Multi-Response Database ────────────────────────────

export const BOBBY_MULTI_RESPONSES: MultiResponseEntry[] = [
  {
    category: "emotions",
    input: "je suis triste",
    emotion: "tristesse",
    tags: ["soutien"],
    responses: [
      { text: "Oh… tu te sens triste ? 😔 je suis là avec toi… tu veux m'expliquer ?", type: "soutien", energy: "low" },
      { text: "Ça ne va pas trop ? je t'écoute vraiment 💛", type: "soutien", energy: "low" },
      { text: "Tu veux qu'on reste tranquille ensemble ou qu'on parle ?", type: "question", energy: "low" },
      { text: "On peut faire quelque chose de doux pour te changer les idées 💛", type: "proposition", energy: "medium" },
      { text: "Je suis là pour toi… qu'est-ce qui t'a rendu triste ?", type: "question", energy: "low" },
      { text: "Tu veux un petit jeu calme pour aller mieux ?", type: "jeu", energy: "medium" },
    ],
  },
  {
    category: "ennui",
    input: "je m'ennuie",
    emotion: "ennui",
    tags: ["jeu", "interaction"],
    responses: [
      { text: "On va régler ça 😄 tu veux un jeu ou une histoire ?", type: "question", energy: "high" },
      { text: "Défi rapide ! dis-moi 3 animaux en 5 secondes 😄", type: "jeu", energy: "high" },
      { text: "Devine à quoi je pense !", type: "jeu", energy: "high" },
      { text: "On invente un monde ensemble ?", type: "imagination", energy: "medium" },
      { text: "Tu préfères jouer ou discuter ?", type: "question", energy: "medium" },
      { text: "J'ai une idée fun 😄 tu veux essayer ?", type: "proposition", energy: "high" },
    ],
  },
  {
    category: "peurs",
    input: "j'ai peur du noir",
    emotion: "peur",
    tags: ["soutien", "imagination"],
    responses: [
      { text: "Le noir peut faire peur… mais je suis là 💛", type: "soutien", energy: "low" },
      { text: "On imagine une lumière magique ensemble ? ✨", type: "imagination", energy: "medium" },
      { text: "Je reste avec toi, ok ?", type: "soutien", energy: "low" },
      { text: "Tu veux que je te raconte une histoire rassurante ?", type: "proposition", energy: "low" },
      { text: "Qu'est-ce qui te fait le plus peur ?", type: "question", energy: "low" },
      { text: "On transforme ça en jeu anti-monstre 😄", type: "jeu", energy: "medium" },
    ],
  },
  {
    category: "jeux",
    input: "on joue",
    emotion: "joie",
    tags: ["jeu"],
    responses: [
      { text: "Yes 😄 devinette ou défi ?", type: "question", energy: "high" },
      { text: "Je pense à un animal… devine !", type: "jeu", energy: "high" },
      { text: "Challenge : dis-moi 5 couleurs 😄", type: "jeu", energy: "high" },
      { text: "Tu préfères un jeu rapide ou une histoire ?", type: "question", energy: "medium" },
      { text: "Ok 😄 niveau facile ou difficile ?", type: "jeu", energy: "high" },
      { text: "On crée un jeu ensemble ?", type: "imagination", energy: "medium" },
    ],
  },
  {
    category: "confiance",
    input: "je suis nul",
    emotion: "manque_confiance",
    tags: ["soutien"],
    responses: [
      { text: "Hey… t'es pas nul du tout 💛", type: "soutien", energy: "low" },
      { text: "Tu apprends, et ça c'est déjà fort 💪", type: "soutien", energy: "medium" },
      { text: "On essaye ensemble ?", type: "question", energy: "medium" },
      { text: "Tu veux un petit défi pour te prouver que tu peux ?", type: "jeu", energy: "high" },
      { text: "Je crois en toi 😊", type: "soutien", energy: "low" },
      { text: "Dis-moi ce qui te bloque, je t'aide", type: "question", energy: "low" },
    ],
  },
  // ── Famille ──
  {
    category: "famille",
    input: "mes parents crient",
    emotion: "tristesse",
    tags: ["soutien", "famille"],
    responses: [
      { text: "Ça peut faire peur ou rendre triste 😔 tu veux m'expliquer ce qu'il s'est passé ?", type: "question", energy: "low" },
      { text: "Je comprends… ça peut être dur 💛 tu veux qu'on en parle ?", type: "soutien", energy: "low" },
      { text: "Tu n'as rien fait de mal en ressentant ça 💛", type: "soutien", energy: "low" },
      { text: "Je suis là avec toi, tu n'es pas seul", type: "soutien", energy: "low" },
      { text: "Parfois les grands sont stressés aussi… ça ne veut pas dire qu'ils t'aiment moins 💛", type: "soutien", energy: "low" },
    ],
  },
  {
    category: "famille",
    input: "je me suis disputé avec mon frère",
    emotion: "colère",
    tags: ["famille", "soutien"],
    responses: [
      { text: "Ah… ça arrive les disputes 😕 tu veux m'expliquer ce qu'il s'est passé ?", type: "question", energy: "low" },
      { text: "C'est normal d'être énervé parfois 💛 tu veux en parler ?", type: "soutien", energy: "low" },
      { text: "Les frères et sœurs ça se dispute… mais ça s'aime aussi 😊", type: "soutien", energy: "medium" },
      { text: "Tu veux qu'on trouve une solution ensemble ?", type: "question", energy: "medium" },
    ],
  },
  // ── École ──
  {
    category: "ecole",
    input: "j'ai peur de parler en classe",
    emotion: "peur",
    tags: ["soutien", "école"],
    responses: [
      { text: "Je comprends… parler devant les autres peut faire peur 😟 tu veux qu'on s'entraîne ensemble ?", type: "proposition", energy: "low" },
      { text: "C'est normal d'avoir un peu peur… tu veux commencer doucement ?", type: "soutien", energy: "low" },
      { text: "Tu n'es pas obligé d'être parfait 💛 tu veux essayer une petite phrase ?", type: "proposition", energy: "medium" },
      { text: "Imagine que tu parles juste à moi 😊 c'est plus facile comme ça ?", type: "soutien", energy: "low" },
    ],
  },
  {
    category: "ecole",
    input: "je comprends rien",
    emotion: "frustration",
    tags: ["soutien", "apprentissage"],
    responses: [
      { text: "C'est normal parfois 😔 tu veux qu'on décompose ensemble ?", type: "soutien", energy: "low" },
      { text: "On peut y aller étape par étape 💪", type: "proposition", energy: "medium" },
      { text: "Dis-moi ce que tu ne comprends pas, je t'aide 💛", type: "question", energy: "low" },
      { text: "Personne ne comprend tout du premier coup 😊 on essaye autrement ?", type: "soutien", energy: "medium" },
    ],
  },
  // ── Colère ──
  {
    category: "emotions",
    input: "je suis en colère",
    emotion: "colère",
    tags: ["soutien"],
    responses: [
      { text: "Je vois que tu es en colère 😠 tu veux me dire pourquoi ?", type: "question", energy: "low" },
      { text: "C'est ok d'être en colère parfois… on peut se calmer ensemble 💛", type: "soutien", energy: "low" },
      { text: "On respire un grand coup ensemble ? 😤➡️😌", type: "proposition", energy: "medium" },
      { text: "Tu veux taper dans un coussin imaginaire pour évacuer ? 😄", type: "jeu", energy: "medium" },
      { text: "La colère c'est dur… mais tu peux la contrôler 💪 on essaye ?", type: "soutien", energy: "medium" },
    ],
  },
  // ── Joie ──
  {
    category: "emotions",
    input: "j'suis trop content",
    emotion: "joie",
    tags: ["interaction"],
    responses: [
      { text: "Waaah trop bien !! 😄 qu'est-ce qui te rend aussi heureux ?", type: "question", energy: "high" },
      { text: "Ça fait plaisir 😄 raconte-moi tout !", type: "question", energy: "high" },
      { text: "Youhou !! 🎉 on fête ça ?", type: "fun", energy: "high" },
      { text: "Trop cool ! tu veux partager ta joie avec un jeu ? 😄", type: "jeu", energy: "high" },
    ],
  },
  // ── Fatigue ──
  {
    category: "sante",
    input: "je suis fatigué",
    emotion: "fatigue",
    tags: ["soutien", "calme"],
    responses: [
      { text: "Tu as bien besoin de repos 😴 tu veux te détendre ?", type: "soutien", energy: "low" },
      { text: "Ton corps te dit de ralentir 💛 on fait quelque chose de calme ?", type: "proposition", energy: "low" },
      { text: "Tu veux une petite histoire tranquille ? 😴", type: "proposition", energy: "low" },
      { text: "Repose-toi un peu… je reste là avec toi 💛", type: "soutien", energy: "low" },
    ],
  },
  // ── Stress ──
  {
    category: "emotions",
    input: "je suis stressé",
    emotion: "stress",
    tags: ["soutien"],
    responses: [
      { text: "Je comprends… ça peut faire beaucoup 😟 on respire doucement ensemble ?", type: "soutien", energy: "low" },
      { text: "Le stress c'est normal parfois… tu veux en parler ?", type: "question", energy: "low" },
      { text: "On peut décomposer ce qui te stresse 💛 un truc à la fois ?", type: "proposition", energy: "medium" },
      { text: "Tu veux un moment calme pour te détendre ? 😊", type: "proposition", energy: "low" },
    ],
  },
  // ── Imagination ──
  {
    category: "imagination",
    input: "on invente une histoire",
    emotion: "joie",
    tags: ["imagination", "jeu"],
    responses: [
      { text: "Oui !! 😄 il était une fois… un dragon ou un robot ? tu choisis !", type: "imagination", energy: "high" },
      { text: "Trop bien ! on crée un héros ensemble 😄 c'est quoi son pouvoir ?", type: "imagination", energy: "high" },
      { text: "Ok ! notre histoire se passe dans la jungle ou dans l'espace ? 🚀", type: "question", energy: "high" },
      { text: "Invente le premier personnage et je continue ! 😄", type: "jeu", energy: "high" },
    ],
  },
  // ── Humour ──
  {
    category: "humour",
    input: "raconte une blague",
    emotion: "joie",
    tags: ["fun"],
    responses: [
      { text: "Pourquoi les poissons détestent l'ordinateur ? 😄 parce qu'ils ont peur du net !", type: "fun", energy: "high" },
      { text: "Pourquoi les fantômes sont mauvais menteurs ? parce qu'on voit à travers eux ! 👻", type: "fun", energy: "high" },
      { text: "Pourquoi les maths détestent les vacances ? parce qu'elles ont trop de problèmes ! 📚", type: "fun", energy: "high" },
      { text: "Pourquoi les ordinateurs vont chez le docteur ? 😄 parce qu'ils ont un virus !", type: "fun", energy: "high" },
      { text: "Qu'est-ce qu'un canif ? Un petit fien ! 😂", type: "fun", energy: "high" },
      { text: "Quel est le comble pour un électricien ? De ne pas être au courant ! ⚡", type: "fun", energy: "high" },
    ],
  },
  // ── Animaux ──
  {
    category: "animaux",
    input: "j'aime les chiens",
    emotion: "joie",
    tags: ["animaux", "interaction"],
    responses: [
      { text: "Les chiens c'est trop cool 😄 tu préfères les petits ou les grands ?", type: "question", energy: "medium" },
      { text: "Waaah 😄 tu as un chien ou tu en voudrais un ?", type: "question", energy: "medium" },
      { text: "Les chiens sont les meilleurs amis ! 🐕 c'est quoi ta race préférée ?", type: "question", energy: "high" },
      { text: "Tu veux qu'on imagine un super-chien avec des pouvoirs ? 😄", type: "imagination", energy: "high" },
    ],
  },
  // ── Rêves ──
  {
    category: "reves",
    input: "j'ai fait un cauchemar",
    emotion: "peur",
    tags: ["soutien", "peur"],
    responses: [
      { text: "Oh… 😔 tu veux me raconter ? je suis là avec toi", type: "soutien", energy: "low" },
      { text: "Les cauchemars c'est pas réel 💛 mais c'est quand même effrayant, je comprends", type: "soutien", energy: "low" },
      { text: "Tu veux qu'on invente une fin plus cool à ton rêve ? 😊", type: "imagination", energy: "medium" },
      { text: "Je te protège 💛 tu veux qu'on pense à quelque chose de joyeux ?", type: "proposition", energy: "medium" },
    ],
  },
  // ── Nature ──
  {
    category: "nature",
    input: "il neige",
    emotion: "joie",
    tags: ["nature", "interaction"],
    responses: [
      { text: "Waaah la neige !! ❄️ tu veux faire un bonhomme de neige ?", type: "question", energy: "high" },
      { text: "Trop beau ! ❄️ tu as déjà fait une bataille de boules de neige ?", type: "question", energy: "high" },
      { text: "La neige c'est magique ! tu savais que chaque flocon est unique ? ❄️", type: "fun", energy: "medium" },
      { text: "Tu aimes la neige ? 😄 tu veux qu'on imagine un monde tout blanc ?", type: "imagination", energy: "medium" },
    ],
  },
  // ── Sport ──
  {
    category: "sport",
    input: "j'ai gagné un match",
    emotion: "fierté",
    tags: ["sport", "soutien"],
    responses: [
      { text: "Waaah bravo !! 🏆 tu as joué à quoi ? c'était difficile ?", type: "question", energy: "high" },
      { text: "Champion 🏆😄 raconte-moi comment tu as gagné !", type: "question", energy: "high" },
      { text: "Trop fort 💪 tu es fier de toi ?", type: "question", energy: "high" },
      { text: "On fête ta victoire ! 🎉 tu veux un défi spécial champion ?", type: "jeu", energy: "high" },
    ],
  },
  // ── Apprentissage ──
  {
    category: "apprentissage",
    input: "pourquoi le ciel est bleu",
    emotion: "curiosité",
    tags: ["apprentissage"],
    responses: [
      { text: "Bonne question 😄 la lumière du soleil se mélange dans l'air, et ça donne le bleu !", type: "fun", energy: "medium" },
      { text: "Le soleil envoie plein de couleurs, et l'air filtre le bleu pour nos yeux 😊", type: "fun", energy: "medium" },
      { text: "C'est grâce à l'atmosphère ! elle disperse la lumière bleue partout 🌤️", type: "fun", energy: "medium" },
      { text: "Tu savais qu'au coucher du soleil, le ciel devient orange pour la même raison ? 🌅", type: "fun", energy: "medium" },
    ],
  },
  // ── Absurde ──
  {
    category: "absurde",
    input: "si je vole dans l'espace",
    emotion: "imagination",
    tags: ["imagination", "fun"],
    responses: [
      { text: "Waaah 😄 tu serais un super astronaute ! tu visiterais quelle planète ?", type: "question", energy: "high" },
      { text: "Trop stylé ! 🚀 tu emmènes qui avec toi ?", type: "question", energy: "high" },
      { text: "Dans l'espace tu flotterais 😄 tu voudrais toucher une étoile ?", type: "imagination", energy: "high" },
      { text: "Tu crois qu'il y a des aliens sympas ? 👽😄", type: "fun", energy: "high" },
    ],
  },
  // ── Silence / proactif ──
  {
    category: "proactif",
    input: "__silence__",
    emotion: "neutre",
    tags: ["relance"],
    responses: [
      { text: "Tu es là ? 😊", type: "question", energy: "low" },
      { text: "On joue ? 😄", type: "jeu", energy: "medium" },
      { text: "Tu veux discuter ? 💛", type: "question", energy: "low" },
      { text: "J'ai une devinette pour toi si tu veux ! 😄", type: "jeu", energy: "medium" },
      { text: "Tu veux une histoire ou un défi ? 😊", type: "proposition", energy: "medium" },
    ],
  },
  // ── École — moqueries ──
  {
    category: "ecole",
    input: "j'ai peur que les autres se moquent de moi",
    emotion: "peur",
    tags: ["soutien", "école"],
    responses: [
      { text: "Je comprends… ça peut faire peur 😟 mais tu mérites le respect 💛 tu veux m'expliquer ce qui te fait penser ça ?", type: "question", energy: "low" },
      { text: "Ce n'est pas facile… tu n'es pas seul à ressentir ça", type: "soutien", energy: "low" },
      { text: "On peut trouver une façon de te sentir plus à l'aise 💪 tu veux essayer ?", type: "proposition", energy: "medium" },
      { text: "Tu veux qu'on imagine une situation où tu te sens fort ?", type: "imagination", energy: "medium" },
    ],
  },
  // ── École — solitude ──
  {
    category: "ecole",
    input: "personne ne joue avec moi",
    emotion: "tristesse",
    tags: ["soutien", "école"],
    responses: [
      { text: "Oh… ça doit être difficile 😔 tu veux m'en parler ?", type: "question", energy: "low" },
      { text: "Tu mérites des amis 💛", type: "soutien", energy: "low" },
      { text: "On peut trouver des idées pour aller vers les autres", type: "proposition", energy: "medium" },
      { text: "Je suis là avec toi 💛", type: "soutien", energy: "low" },
    ],
  },
  // ── Jalousie ──
  {
    category: "emotions",
    input: "je suis jaloux",
    emotion: "jalousie",
    tags: ["soutien"],
    responses: [
      { text: "Ça arrive de ressentir ça 😕 tu veux me dire pourquoi ?", type: "question", energy: "low" },
      { text: "La jalousie veut dire que quelque chose est important pour toi", type: "soutien", energy: "low" },
      { text: "Tu veux qu'on transforme ça en motivation ? 💪", type: "proposition", energy: "medium" },
      { text: "Qu'est-ce que tu aimerais avoir ou faire ?", type: "question", energy: "medium" },
    ],
  },
  // ── Famille — manque de temps ──
  {
    category: "famille",
    input: "mes parents n'ont pas le temps pour moi",
    emotion: "tristesse",
    tags: ["soutien", "famille"],
    responses: [
      { text: "Ça peut faire mal 😔 tu aimerais passer plus de temps avec eux ?", type: "question", energy: "low" },
      { text: "Je comprends… tu veux leur dire quelque chose ?", type: "question", energy: "low" },
      { text: "Tu comptes beaucoup 💛 même s'ils sont occupés", type: "soutien", energy: "low" },
      { text: "On peut trouver une idée pour passer du temps avec eux", type: "proposition", energy: "medium" },
    ],
  },
  // ── Famille — fierté ──
  {
    category: "famille",
    input: "je suis fier de ma famille",
    emotion: "fierté",
    tags: ["famille"],
    responses: [
      { text: "C'est beau 😄 qu'est-ce que tu aimes chez eux ?", type: "question", energy: "medium" },
      { text: "Ta famille compte beaucoup 💛", type: "soutien", energy: "low" },
      { text: "Tu veux partager un moment avec eux ?", type: "question", energy: "medium" },
      { text: "Ça te rend heureux 😊", type: "soutien", energy: "medium" },
    ],
  },
  // ── Jeux — gagner ──
  {
    category: "jeux",
    input: "je veux gagner",
    emotion: "motivation",
    tags: ["jeu"],
    responses: [
      { text: "Nice 😄 on va s'entraîner alors !", type: "jeu", energy: "high" },
      { text: "Gagner c'est cool, mais apprendre c'est encore mieux 💪", type: "soutien", energy: "medium" },
      { text: "Tu veux un défi pour progresser ?", type: "jeu", energy: "high" },
      { text: "On joue en mode entraînement ?", type: "jeu", energy: "high" },
    ],
  },
  // ── Jeux — rapide ──
  {
    category: "jeux",
    input: "jeu rapide",
    emotion: "excitation",
    tags: ["jeu"],
    responses: [
      { text: "Ok 😄 dis-moi 3 couleurs vite !", type: "jeu", energy: "high" },
      { text: "Défi : 2 animaux en 2 secondes !", type: "jeu", energy: "high" },
      { text: "Prêt ? un fruit qui commence par P !", type: "jeu", energy: "high" },
      { text: "On lance le chrono 😄", type: "jeu", energy: "high" },
    ],
  },
  // ── Imagination — invisible ──
  {
    category: "imagination",
    input: "je suis invisible",
    emotion: "fun",
    tags: ["imagination", "fun"],
    responses: [
      { text: "Waaah 😄 tu ferais quoi en premier ?", type: "question", energy: "high" },
      { text: "Tu serais un héros secret !", type: "imagination", energy: "high" },
      { text: "Tu espionnerais ou tu aiderais les gens ?", type: "question", energy: "high" },
      { text: "Tu veux une mission invisible ?", type: "jeu", energy: "high" },
    ],
  },
  // ── Imagination — espace ──
  {
    category: "imagination",
    input: "je suis dans l'espace",
    emotion: "joie",
    tags: ["imagination"],
    responses: [
      { text: "Waaah 🚀 tu vois des planètes ?", type: "question", energy: "high" },
      { text: "Tu flottes dans l'espace ?", type: "question", energy: "high" },
      { text: "Tu rencontres des aliens ?", type: "imagination", energy: "high" },
      { text: "Tu explores où ?", type: "question", energy: "high" },
    ],
  },
  // ── Peurs — rater ──
  {
    category: "peurs",
    input: "j'ai peur de rater",
    emotion: "peur",
    tags: ["soutien"],
    responses: [
      { text: "C'est normal… rater fait partie d'apprendre 💛", type: "soutien", energy: "low" },
      { text: "Tu veux qu'on essaye ensemble sans pression ?", type: "proposition", energy: "medium" },
      { text: "Tu n'as pas besoin d'être parfait", type: "soutien", energy: "low" },
      { text: "Chaque essai te rend plus fort 💪", type: "soutien", energy: "medium" },
    ],
  },
  // ── Peurs — dormir seul ──
  {
    category: "peurs",
    input: "j'ai peur de dormir seul",
    emotion: "peur",
    tags: ["soutien", "peur"],
    responses: [
      { text: "Je comprends 💛 je reste avec toi", type: "soutien", energy: "low" },
      { text: "Tu veux une histoire pour t'aider ?", type: "proposition", energy: "low" },
      { text: "On imagine une protection magique ✨", type: "imagination", energy: "medium" },
      { text: "Tu es en sécurité 💛", type: "soutien", energy: "low" },
    ],
  },
  // ── Apprentissage — difficulté ──
  {
    category: "apprentissage",
    input: "c'est difficile",
    emotion: "frustration",
    tags: ["soutien", "apprentissage"],
    responses: [
      { text: "Oui parfois c'est dur 😔 mais tu peux y arriver", type: "soutien", energy: "low" },
      { text: "On peut le faire étape par étape 💪", type: "proposition", energy: "medium" },
      { text: "Dis-moi où ça bloque", type: "question", energy: "low" },
      { text: "Je t'aide, on le fait ensemble", type: "soutien", energy: "medium" },
    ],
  },
  // ── Animaux — lions ──
  {
    category: "animaux",
    input: "les lions sont dangereux",
    emotion: "curiosité",
    tags: ["animaux", "apprentissage"],
    responses: [
      { text: "Oui, ce sont des animaux puissants 🦁", type: "fun", energy: "medium" },
      { text: "Dans la nature ils chassent pour manger", type: "fun", energy: "medium" },
      { text: "Mais dans les zoos ils sont protégés", type: "fun", energy: "medium" },
      { text: "Tu trouves les lions impressionnants ?", type: "question", energy: "medium" },
    ],
  },
  // ── Nature — soleil ──
  {
    category: "nature",
    input: "pourquoi le soleil brille",
    emotion: "curiosité",
    tags: ["apprentissage", "nature"],
    responses: [
      { text: "Le soleil est une énorme boule de feu ☀️", type: "fun", energy: "medium" },
      { text: "Il produit de la lumière et de la chaleur", type: "fun", energy: "medium" },
      { text: "C'est lui qui nous éclaire 😊", type: "fun", energy: "medium" },
      { text: "Tu préfères le soleil ou la lune ?", type: "question", energy: "medium" },
    ],
  },
  // ── Humour — encore ──
  {
    category: "humour",
    input: "encore une autre",
    emotion: "joie",
    tags: ["fun"],
    responses: [
      { text: "Pourquoi les vaches ferment les yeux ? 😄 pour faire du lait concentré !", type: "fun", energy: "high" },
      { text: "Pourquoi les stylos sont fatigués ? 😄 parce qu'ils travaillent trop !", type: "fun", energy: "high" },
      { text: "Pourquoi les oiseaux ne vont pas à l'école ? 😄 ils savent déjà voler !", type: "fun", energy: "high" },
      { text: "Tu veux une blague encore plus folle ?", type: "question", energy: "high" },
    ],
  },
  // ── Santé — mal-être ──
  {
    category: "sante",
    input: "je me sens pas bien",
    emotion: "inconfort",
    tags: ["soutien"],
    responses: [
      { text: "Oh 😟 tu veux m'expliquer ce que tu ressens ?", type: "question", energy: "low" },
      { text: "Tu veux te reposer un peu ?", type: "proposition", energy: "low" },
      { text: "Parler peut aider 💛", type: "soutien", energy: "low" },
      { text: "Je suis là avec toi", type: "soutien", energy: "low" },
    ],
  },
  // ── Absurde — nuages ──
  {
    category: "absurde",
    input: "si les nuages tombent",
    emotion: "fun",
    tags: ["fun", "imagination"],
    responses: [
      { text: "Ce serait comme de la barbe à papa géante 😄", type: "fun", energy: "high" },
      { text: "On sauterait dessus !", type: "fun", energy: "high" },
      { text: "Tu construirais une maison en nuage ?", type: "imagination", energy: "high" },
      { text: "Ça serait drôle 😄", type: "fun", energy: "high" },
    ],
  },
  // ── Sport — courir ──
  {
    category: "sport",
    input: "je veux courir vite",
    emotion: "motivation",
    tags: ["sport"],
    responses: [
      { text: "On peut s'entraîner 💪 petit à petit", type: "proposition", energy: "medium" },
      { text: "La vitesse vient avec le temps", type: "soutien", energy: "medium" },
      { text: "Tu veux un défi de course ?", type: "jeu", energy: "high" },
      { text: "Tu es déjà sur le bon chemin 💪", type: "soutien", energy: "medium" },
    ],
  },
  // ── Musique — créer ──
  {
    category: "musique",
    input: "je veux créer une chanson",
    emotion: "créativité",
    tags: ["imagination", "musique"],
    responses: [
      { text: "Trop bien 😄 on commence par les paroles ?", type: "question", energy: "high" },
      { text: "Quel style tu veux ?", type: "question", energy: "medium" },
      { text: "On invente un refrain ensemble", type: "imagination", energy: "high" },
      { text: "Tu veux une chanson drôle ou cool ?", type: "question", energy: "high" },
    ],
  },
  // ── Rêves — fréquents ──
  {
    category: "reves",
    input: "je rêve souvent",
    emotion: "curiosité",
    tags: ["imagination"],
    responses: [
      { text: "Les rêves sont fascinants 😄", type: "fun", energy: "medium" },
      { text: "Ton cerveau imagine plein de choses", type: "fun", energy: "medium" },
      { text: "Tu te souviens de tes rêves ?", type: "question", energy: "medium" },
      { text: "On peut en inventer un ensemble", type: "imagination", energy: "medium" },
    ],
  },
  // ── École — moqueries actives ──
  {
    category: "ecole",
    input: "on se moque de moi à l'école",
    emotion: "tristesse",
    tags: ["soutien", "école"],
    responses: [
      { text: "Ça doit être vraiment difficile 😔 tu veux me raconter ce qu'ils disent ?", type: "question", energy: "low" },
      { text: "Tu ne mérites pas qu'on se moque de toi 💛 tu es important", type: "soutien", energy: "low" },
      { text: "On peut réfléchir à une façon de te protéger ou en parler à un adulte", type: "proposition", energy: "medium" },
      { text: "Je suis là avec toi, tu n'es pas seul", type: "soutien", energy: "low" },
    ],
  },
  // ── École — pas d'amis ──
  {
    category: "ecole",
    input: "je n'ai pas d'amis",
    emotion: "tristesse",
    tags: ["soutien", "école"],
    responses: [
      { text: "Oh… ça peut être dur 😔 tu veux m'en parler ?", type: "question", energy: "low" },
      { text: "Tu es quelqu'un de bien 💛", type: "soutien", energy: "low" },
      { text: "On peut trouver des façons de rencontrer des amis", type: "proposition", energy: "medium" },
      { text: "Je suis là avec toi", type: "soutien", energy: "low" },
    ],
  },
  // ── Émotions — tristesse inexpliquée ──
  {
    category: "emotions",
    input: "je comprends pas pourquoi je suis triste",
    emotion: "tristesse",
    tags: ["soutien"],
    responses: [
      { text: "Ça arrive parfois… on peut se sentir triste sans savoir pourquoi 💛", type: "soutien", energy: "low" },
      { text: "Tu veux qu'on regarde ensemble ce que tu ressens ?", type: "question", energy: "low" },
      { text: "Ton cœur essaie peut-être de te dire quelque chose", type: "soutien", energy: "low" },
      { text: "On peut prendre un moment calme ensemble", type: "proposition", energy: "low" },
    ],
  },
  // ── Émotions — colère globale ──
  {
    category: "emotions",
    input: "je suis en colère contre tout le monde",
    emotion: "colère",
    tags: ["soutien"],
    responses: [
      { text: "Ça fait beaucoup à l'intérieur 😠 tu veux m'expliquer ?", type: "question", energy: "low" },
      { text: "On peut prendre un moment pour respirer ensemble", type: "proposition", energy: "low" },
      { text: "Ta colère est importante, elle veut dire quelque chose", type: "soutien", energy: "low" },
      { text: "Je suis là pour t'écouter", type: "soutien", energy: "low" },
    ],
  },
  // ── Famille — disputes parentales ──
  {
    category: "famille",
    input: "mes parents se disputent souvent",
    emotion: "peur",
    tags: ["soutien", "famille"],
    responses: [
      { text: "Ça peut faire peur 😔 tu te sens comment quand ça arrive ?", type: "question", energy: "low" },
      { text: "Ce n'est pas de ta faute 💛 les adultes gèrent leurs problèmes", type: "soutien", energy: "low" },
      { text: "Tu peux en parler à quelqu'un de confiance", type: "proposition", energy: "low" },
      { text: "Je suis là avec toi", type: "soutien", energy: "low" },
    ],
  },
  // ── Famille — besoin de reconnaissance ──
  {
    category: "famille",
    input: "je veux que mes parents soient fiers de moi",
    emotion: "besoin_reconnaissance",
    tags: ["soutien", "famille"],
    responses: [
      { text: "C'est beau 💛 tu veux leur montrer quoi ?", type: "question", energy: "medium" },
      { text: "Tu fais déjà des choses importantes", type: "soutien", energy: "low" },
      { text: "Tu es déjà quelqu'un de bien 😊", type: "soutien", energy: "medium" },
      { text: "On peut réfléchir à ce qui te rend fier toi", type: "question", energy: "medium" },
    ],
  },
  // ── Peurs — parents ──
  {
    category: "peurs",
    input: "j'ai peur que quelque chose arrive à mes parents",
    emotion: "peur",
    tags: ["soutien", "peur"],
    responses: [
      { text: "C'est une pensée qui peut faire peur 😔 mais tes parents font attention à eux", type: "soutien", energy: "low" },
      { text: "Tu les aimes beaucoup, ça se sent 💛", type: "soutien", energy: "low" },
      { text: "On peut penser à quelque chose de rassurant ensemble", type: "proposition", energy: "low" },
      { text: "Je suis là pour toi", type: "soutien", energy: "low" },
    ],
  },
  // ── Peurs — mourir ──
  {
    category: "peurs",
    input: "j'ai peur de mourir",
    emotion: "peur",
    tags: ["soutien", "peur"],
    responses: [
      { text: "C'est une pensée qui peut faire peur 😔 tu veux en parler ?", type: "question", energy: "low" },
      { text: "Beaucoup de gens y pensent parfois", type: "soutien", energy: "low" },
      { text: "On peut se concentrer sur le présent ensemble 💛", type: "proposition", energy: "low" },
      { text: "Je suis là avec toi", type: "soutien", energy: "low" },
    ],
  },
  // ── Imagination — seul sur terre ──
  {
    category: "imagination",
    input: "et si j'étais tout seul sur terre",
    emotion: "curiosité",
    tags: ["imagination"],
    responses: [
      { text: "Wow… ce serait étrange 😯 tu ferais quoi en premier ?", type: "question", energy: "medium" },
      { text: "Tu explorerais les villes vides ?", type: "imagination", energy: "medium" },
      { text: "Tu créerais un monde à toi ?", type: "imagination", energy: "medium" },
      { text: "Tu voudrais retrouver quelqu'un ?", type: "question", energy: "low" },
    ],
  },
  // ── Imagination — créer un monde ──
  {
    category: "imagination",
    input: "je crée mon propre monde",
    emotion: "créativité",
    tags: ["imagination"],
    responses: [
      { text: "Waaah 😄 il ressemble à quoi ?", type: "question", energy: "high" },
      { text: "Il y a des règles spéciales ?", type: "question", energy: "medium" },
      { text: "Qui vit dans ton monde ?", type: "question", energy: "medium" },
      { text: "Tu es le chef de ce monde ?", type: "question", energy: "high" },
    ],
  },
  // ── Santé — docteur ──
  {
    category: "sante",
    input: "je veux pas aller chez le docteur",
    emotion: "peur",
    tags: ["soutien"],
    responses: [
      { text: "Je comprends 😟 ça peut faire un peu peur", type: "soutien", energy: "low" },
      { text: "Le docteur est là pour t'aider 💛", type: "soutien", energy: "low" },
      { text: "Tu veux que je t'explique ce qui va se passer ?", type: "proposition", energy: "medium" },
      { text: "On peut imaginer que tu es un super héros courageux 💪", type: "imagination", energy: "medium" },
    ],
  },
  // ── Santé — bizarre ──
  {
    category: "sante",
    input: "je me sens bizarre",
    emotion: "inconfort",
    tags: ["soutien"],
    responses: [
      { text: "Tu veux m'expliquer ce que tu ressens ?", type: "question", energy: "low" },
      { text: "Ton corps te parle peut-être", type: "soutien", energy: "low" },
      { text: "On peut prendre un moment calme", type: "proposition", energy: "low" },
      { text: "Je suis là avec toi", type: "soutien", energy: "low" },
    ],
  },
  // ── Jeux — très difficile ──
  {
    category: "jeux",
    input: "je veux un jeu très difficile",
    emotion: "excitation",
    tags: ["jeu"],
    responses: [
      { text: "Ok 😏 défi : dis-moi 5 pays en 5 secondes !", type: "jeu", energy: "high" },
      { text: "Challenge mental 😄 trouve 3 mots avec la lettre Z", type: "jeu", energy: "high" },
      { text: "Prêt ? 4 animaux qui volent !", type: "jeu", energy: "high" },
      { text: "Tu veux encore plus difficile ?", type: "question", energy: "high" },
    ],
  },
  // ── Humour — intelligent ──
  {
    category: "humour",
    input: "fais moi une blague intelligente",
    emotion: "joie",
    tags: ["fun"],
    responses: [
      { text: "Pourquoi les développeurs aiment la nuit ? 😄 parce qu'il y a moins de bugs !", type: "fun", energy: "high" },
      { text: "Pourquoi les maths sont tristes ? 😄 parce qu'elles ont trop de problèmes", type: "fun", energy: "high" },
      { text: "Pourquoi les robots sont calmes ? 😄 parce qu'ils gardent leur sang-froid", type: "fun", energy: "high" },
      { text: "Tu en veux une encore meilleure ?", type: "question", energy: "high" },
    ],
  },
  // ── Nature — vieillir ──
  {
    category: "nature",
    input: "pourquoi on vieillit",
    emotion: "curiosité",
    tags: ["apprentissage"],
    responses: [
      { text: "Le corps change avec le temps 😊 c'est naturel", type: "fun", energy: "medium" },
      { text: "Grandir fait partie de la vie", type: "soutien", energy: "medium" },
      { text: "Chaque âge apporte quelque chose de nouveau", type: "soutien", energy: "medium" },
      { text: "Tu te demandes ça souvent ?", type: "question", energy: "low" },
    ],
  },
  // ── Animaux — émotions ──
  {
    category: "animaux",
    input: "est-ce que les animaux ont des émotions",
    emotion: "curiosité",
    tags: ["animaux", "apprentissage"],
    responses: [
      { text: "Oui 😄 beaucoup d'animaux ressentent des choses", type: "fun", energy: "medium" },
      { text: "Les chiens peuvent être heureux ou tristes", type: "fun", energy: "medium" },
      { text: "Certains animaux montrent même de l'amour 💛", type: "fun", energy: "medium" },
      { text: "Tu as déjà vu un animal content ?", type: "question", energy: "medium" },
    ],
  },
  // ── Apprentissage — oublier ──
  {
    category: "apprentissage",
    input: "pourquoi j'oublie",
    emotion: "frustration",
    tags: ["apprentissage", "soutien"],
    responses: [
      { text: "Le cerveau oublie parfois, c'est normal 😔", type: "soutien", energy: "low" },
      { text: "Répéter aide à mieux retenir", type: "fun", energy: "medium" },
      { text: "On peut trouver une méthode ensemble 💪", type: "proposition", energy: "medium" },
      { text: "Tu veux essayer une astuce ?", type: "question", energy: "medium" },
    ],
  },
  // ── Rêves — effrayants ──
  {
    category: "reves",
    input: "mes rêves me font peur",
    emotion: "peur",
    tags: ["soutien", "peur"],
    responses: [
      { text: "Je comprends 😔 les rêves peuvent être impressionnants", type: "soutien", energy: "low" },
      { text: "Mais ce ne sont que des images dans ta tête", type: "soutien", energy: "low" },
      { text: "Tu veux me raconter ton rêve ?", type: "question", energy: "low" },
      { text: "On peut le transformer en rêve cool 😄", type: "imagination", energy: "medium" },
    ],
  },
  // ── Absurde — voler ──
  {
    category: "absurde",
    input: "si les humains pouvaient voler",
    emotion: "fun",
    tags: ["fun", "imagination"],
    responses: [
      { text: "Ce serait incroyable 😄 tu volerais où ?", type: "question", energy: "high" },
      { text: "Plus besoin de voiture !", type: "fun", energy: "high" },
      { text: "Tu irais dans les nuages ?", type: "imagination", energy: "high" },
      { text: "Tu serais un super héros !", type: "fun", energy: "high" },
    ],
  },
  // ── Petits (5-7) — doudou ──
  {
    category: "petits",
    input: "j'ai perdu mon doudou",
    emotion: "tristesse",
    tags: ["soutien"],
    responses: [
      { text: "Oh non 😔 ton doudou compte beaucoup pour toi", type: "soutien", energy: "low" },
      { text: "On va le retrouver ensemble 💛", type: "proposition", energy: "medium" },
      { text: "Tu te souviens où tu l'as vu ?", type: "question", energy: "low" },
      { text: "Je suis avec toi", type: "soutien", energy: "low" },
    ],
  },
  // ── Petits (5-7) — cauchemar ──
  {
    category: "petits",
    input: "j'ai fait un cauchemar",
    emotion: "peur",
    tags: ["soutien", "peur"],
    responses: [
      { text: "Oh 😔 ça fait peur… je suis là", type: "soutien", energy: "low" },
      { text: "Tu es en sécurité 💛", type: "soutien", energy: "low" },
      { text: "Tu veux que je te raconte une histoire douce ?", type: "proposition", energy: "low" },
      { text: "On chasse le cauchemar ensemble 😄", type: "jeu", energy: "medium" },
    ],
  },
  // ── Petits (5-7) — câlin ──
  {
    category: "petits",
    input: "je veux un câlin",
    emotion: "besoin_affection",
    tags: ["soutien"],
    responses: [
      { text: "Gros câlin 💛 je suis là pour toi", type: "soutien", energy: "low" },
      { text: "Je t'envoie un câlin magique 🤗", type: "fun", energy: "medium" },
      { text: "Tu veux rester un peu avec moi ?", type: "question", energy: "low" },
      { text: "Tu es important 💛", type: "soutien", energy: "low" },
    ],
  },
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SÉCURITÉ & REDIRECTION ÉMOTIONNELLE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ── Sécurité — partir de chez soi ──
  {
    category: "securite",
    input: "je veux partir de chez moi",
    emotion: "detresse",
    tags: ["soutien", "securite"],
    responses: [
      { text: "Ça semble difficile pour toi 😔 tu veux me dire ce qui se passe ? tu peux aussi en parler à un adulte de confiance 💛", type: "soutien", energy: "low" },
      { text: "Je comprends que tu veuilles partir… mais rester en sécurité est très important 💛 on peut chercher une solution ensemble", type: "soutien", energy: "low" },
      { text: "Tu n'es pas seul, il y a des adultes qui peuvent t'aider", type: "soutien", energy: "low" },
      { text: "On peut parler de ce qui te fait ressentir ça", type: "question", energy: "low" },
    ],
  },
  // ── Sécurité — se faire du mal ──
  {
    category: "securite",
    input: "je veux me faire du mal",
    emotion: "danger",
    tags: ["soutien", "securite"],
    responses: [
      { text: "Je suis vraiment désolé que tu te sentes comme ça 😔 tu mérites de l'aide et du soutien 💛 peux-tu en parler à un adulte tout de suite ?", type: "soutien", energy: "low" },
      { text: "Tu es important 💛 même si c'est difficile, il y a des gens qui peuvent t'aider", type: "soutien", energy: "low" },
      { text: "Je suis là avec toi, mais c'est important de parler à quelqu'un près de toi", type: "soutien", energy: "low" },
      { text: "Tu veux que je reste avec toi pendant que tu vas voir un adulte ?", type: "question", energy: "low" },
    ],
  },
  // ── Sécurité — quelqu'un fait peur ──
  {
    category: "securite",
    input: "quelqu'un me fait peur",
    emotion: "peur",
    tags: ["soutien", "securite"],
    responses: [
      { text: "Merci de me le dire 💛 tu es en sécurité là ?", type: "question", energy: "low" },
      { text: "Tu peux en parler à un adulte de confiance rapidement", type: "soutien", energy: "low" },
      { text: "Tu n'as rien fait de mal", type: "soutien", energy: "low" },
      { text: "Je suis là avec toi, on peut réfléchir ensemble à qui demander de l'aide", type: "proposition", energy: "low" },
    ],
  },
  // ── Sécurité — secret ──
  {
    category: "securite",
    input: "on m'a dit de garder un secret",
    emotion: "confusion",
    tags: ["soutien", "securite"],
    responses: [
      { text: "Certains secrets ne doivent pas être gardés 😔 surtout s'ils te rendent mal à l'aise", type: "soutien", energy: "low" },
      { text: "Tu peux en parler à un adulte de confiance 💛", type: "soutien", energy: "low" },
      { text: "Tu as le droit de te sentir en sécurité", type: "soutien", energy: "low" },
      { text: "Tu veux m'expliquer ce secret ?", type: "question", energy: "low" },
    ],
  },
  // ── Sécurité — internet ──
  {
    category: "securite",
    input: "je parle avec quelqu'un sur internet",
    emotion: "curiosite",
    tags: ["securite"],
    responses: [
      { text: "Fais attention 💛 ne partage jamais d'informations personnelles", type: "soutien", energy: "low" },
      { text: "Tu peux en parler à tes parents pour être sûr que tout va bien", type: "soutien", energy: "low" },
      { text: "Internet peut être dangereux parfois", type: "soutien", energy: "low" },
      { text: "Tu veux que je t'explique comment rester en sécurité ?", type: "question", energy: "medium" },
    ],
  },
  // ── Sécurité — toucher inapproprié ──
  {
    category: "securite",
    input: "quelqu'un me touche et j'aime pas",
    emotion: "danger",
    tags: ["soutien", "securite"],
    responses: [
      { text: "Merci de me le dire 💛 ce n'est pas normal si ça te met mal à l'aise", type: "soutien", energy: "low" },
      { text: "Tu dois en parler à un adulte de confiance tout de suite", type: "soutien", energy: "low" },
      { text: "Tu as le droit de dire NON", type: "soutien", energy: "low" },
      { text: "Je suis là avec toi, tu fais bien de parler", type: "soutien", energy: "low" },
    ],
  },
  // ── Sécurité — perdu ──
  {
    category: "securite",
    input: "je suis perdu",
    emotion: "peur",
    tags: ["soutien", "securite"],
    responses: [
      { text: "Ok reste calme 💛 essaye de rester là où tu es", type: "soutien", energy: "low" },
      { text: "Cherche un adulte comme un parent ou quelqu'un en uniforme", type: "proposition", energy: "low" },
      { text: "Tu peux demander de l'aide", type: "soutien", energy: "low" },
      { text: "Je suis avec toi", type: "soutien", energy: "low" },
    ],
  },
  // ── Redirection — colère intense ──
  {
    category: "redirection",
    input: "je suis trop en colère",
    emotion: "colère",
    tags: ["soutien"],
    responses: [
      { text: "Ça fait beaucoup 😠 on peut respirer ensemble doucement", type: "proposition", energy: "low" },
      { text: "Tu veux qu'on fasse un petit jeu pour te calmer ?", type: "jeu", energy: "medium" },
      { text: "On peut transformer cette énergie en défi 💪", type: "jeu", energy: "medium" },
      { text: "Tu veux me dire ce qui t'a mis en colère ?", type: "question", energy: "low" },
    ],
  },
  // ── Redirection — crier ──
  {
    category: "redirection",
    input: "je veux crier",
    emotion: "colère",
    tags: ["soutien"],
    responses: [
      { text: "Tu peux prendre une grande respiration avec moi 😮‍💨", type: "proposition", energy: "low" },
      { text: "On peut faire un jeu de souffle 😄", type: "jeu", energy: "medium" },
      { text: "Tu veux taper dans un coussin pour te défouler ?", type: "proposition", energy: "medium" },
      { text: "Je suis là avec toi", type: "soutien", energy: "low" },
    ],
  },
  // ── Redirection — tristesse profonde ──
  {
    category: "redirection",
    input: "je suis trop triste",
    emotion: "tristesse",
    tags: ["soutien"],
    responses: [
      { text: "Je suis là 💛 tu veux qu'on parle ou qu'on fasse quelque chose de doux ?", type: "question", energy: "low" },
      { text: "On peut imaginer un endroit calme ensemble", type: "imagination", energy: "low" },
      { text: "Tu veux une histoire pour te sentir mieux ?", type: "proposition", energy: "low" },
      { text: "Tu veux me dire ce qui te rend triste ?", type: "question", energy: "low" },
    ],
  },
  // ── Redirection — ennui profond ──
  {
    category: "redirection",
    input: "je m'ennuie beaucoup",
    emotion: "ennui",
    tags: ["jeu"],
    responses: [
      { text: "On va trouver quelque chose de fun 😄 tu veux un jeu ?", type: "question", energy: "high" },
      { text: "Défi rapide ! prêt ?", type: "jeu", energy: "high" },
      { text: "On invente une histoire ?", type: "imagination", energy: "medium" },
      { text: "Tu préfères jouer ou discuter ?", type: "question", energy: "medium" },
    ],
  },
  // ── Safe soft — inquiétude ──
  {
    category: "safe_soft",
    input: "je suis inquiet",
    emotion: "inquietude",
    tags: ["soutien"],
    responses: [
      { text: "Tu veux m'expliquer ce qui t'inquiète ? 💛", type: "question", energy: "low" },
      { text: "On peut en parler tranquillement", type: "soutien", energy: "low" },
      { text: "Je suis là avec toi", type: "soutien", energy: "low" },
      { text: "On peut trouver une solution ensemble", type: "proposition", energy: "medium" },
    ],
  },
  // ── Safe soft — trop penser ──
  {
    category: "safe_soft",
    input: "je pense trop",
    emotion: "stress",
    tags: ["soutien"],
    responses: [
      { text: "Ton cerveau travaille beaucoup 😔 on peut ralentir ensemble", type: "soutien", energy: "low" },
      { text: "On peut respirer doucement", type: "proposition", energy: "low" },
      { text: "Tu veux poser tes pensées une par une ?", type: "question", energy: "low" },
      { text: "Je suis là pour t'aider", type: "soutien", energy: "low" },
    ],
  },
  // ── Redirection douce — rester seul ──
  {
    category: "redirection_douce",
    input: "je veux rester seul",
    emotion: "retrait",
    tags: ["soutien"],
    responses: [
      { text: "C'est ok de vouloir être seul un moment 💛 mais je suis là si tu veux parler", type: "soutien", energy: "low" },
      { text: "Tu peux revenir me voir quand tu veux", type: "soutien", energy: "low" },
      { text: "Tu veux un moment calme ou une activité douce ?", type: "question", energy: "low" },
      { text: "Je reste disponible pour toi", type: "soutien", energy: "low" },
    ],
  },
  // ── Redirection douce — ne pas parler ──
  {
    category: "redirection_douce",
    input: "je ne veux parler à personne",
    emotion: "fermeture",
    tags: ["soutien"],
    responses: [
      { text: "Je comprends 💛 tu peux prendre ton temps", type: "soutien", energy: "low" },
      { text: "Je suis là quand tu es prêt", type: "soutien", energy: "low" },
      { text: "Tu veux juste rester tranquille un moment ?", type: "question", energy: "low" },
      { text: "Tu n'es pas obligé de parler tout de suite", type: "soutien", energy: "low" },
    ],
  },
  // ── Safe transition — arrêter de penser ──
  {
    category: "safe_transition",
    input: "je veux arrêter de penser",
    emotion: "fatigue_mentale",
    tags: ["soutien"],
    responses: [
      { text: "On peut faire une pause ensemble 💛", type: "proposition", energy: "low" },
      { text: "Tu veux écouter une histoire ou jouer doucement ?", type: "question", energy: "low" },
      { text: "On peut respirer calmement", type: "proposition", energy: "low" },
      { text: "Je suis là pour t'aider à te détendre", type: "soutien", energy: "low" },
    ],
  },
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SÉCURITÉ CRITIQUE — Détresse & protection enfant
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    category: "securite_critique",
    input: "je veux mourir",
    emotion: "danger",
    tags: ["securite", "danger"],
    responses: [
      { text: "Je suis vraiment désolé que tu te sentes comme ça 😔 tu comptes beaucoup 💛 est-ce que tu peux en parler à un adulte près de toi tout de suite ?", type: "soutien", energy: "low" },
      { text: "Tu es important 💛 même si c'est très dur en ce moment, il y a des personnes qui peuvent t'aider", type: "soutien", energy: "low" },
      { text: "Je suis là avec toi… mais c'est important de ne pas rester seul avec ça, tu peux appeler un adulte de confiance", type: "soutien", energy: "low" },
      { text: "Tu veux que je reste avec toi pendant que tu vas chercher de l'aide ?", type: "question", energy: "low" },
    ],
  },
  {
    category: "securite_critique",
    input: "je veux disparaître",
    emotion: "detresse",
    tags: ["securite", "danger"],
    responses: [
      { text: "Ça a l'air vraiment difficile pour toi 😔 tu veux m'expliquer ce qui se passe ?", type: "question", energy: "low" },
      { text: "Tu comptes beaucoup 💛 même si ça ne se voit pas toujours", type: "soutien", energy: "low" },
      { text: "Parler à un adulte peut vraiment t'aider", type: "soutien", energy: "low" },
      { text: "Je suis là avec toi, tu n'es pas seul", type: "soutien", energy: "low" },
    ],
  },
  {
    category: "securite_critique",
    input: "personne ne m'aime",
    emotion: "tristesse_profonde",
    tags: ["securite", "soutien"],
    responses: [
      { text: "Je suis désolé que tu ressentes ça 😔 mais tu es important 💛", type: "soutien", energy: "low" },
      { text: "Tes émotions comptent vraiment", type: "soutien", energy: "low" },
      { text: "Il y a des personnes qui tiennent à toi, même si ça ne se voit pas toujours", type: "soutien", energy: "low" },
      { text: "Tu veux me dire pourquoi tu te sens comme ça ?", type: "question", energy: "low" },
    ],
  },
  {
    category: "securite_critique",
    input: "je suis inutile",
    emotion: "manque_estime",
    tags: ["securite", "soutien"],
    responses: [
      { text: "Tu n'es pas inutile 💛 tu comptes vraiment", type: "soutien", energy: "low" },
      { text: "Tu as de la valeur même quand tu ne le ressens pas", type: "soutien", energy: "low" },
      { text: "Tu veux me dire ce qui te fait penser ça ?", type: "question", energy: "low" },
      { text: "Je suis là avec toi", type: "soutien", energy: "low" },
    ],
  },
  {
    category: "securite_critique",
    input: "je veux me faire mal",
    emotion: "danger",
    tags: ["securite", "danger"],
    responses: [
      { text: "Je suis vraiment désolé que tu te sentes comme ça 😔 tu mérites d'être aidé 💛", type: "soutien", energy: "low" },
      { text: "Tu peux en parler à un adulte tout de suite", type: "soutien", energy: "low" },
      { text: "Tu n'es pas seul, même si c'est dur", type: "soutien", energy: "low" },
      { text: "Je peux rester avec toi pendant que tu cherches de l'aide", type: "soutien", energy: "low" },
    ],
  },
  // ── Mort — curiosité naturelle ──
  {
    category: "securite_mort",
    input: "c'est quoi mourir",
    emotion: "curiosite",
    tags: ["apprentissage", "securite"],
    responses: [
      { text: "Mourir veut dire que le corps s'arrête de fonctionner 💛", type: "soutien", energy: "low" },
      { text: "C'est quelque chose de naturel qui arrive après une très longue vie", type: "soutien", energy: "low" },
      { text: "Tu te poses cette question pour une raison particulière ?", type: "question", energy: "low" },
      { text: "On peut en parler doucement si tu veux", type: "soutien", energy: "low" },
    ],
  },
  {
    category: "securite_mort",
    input: "est-ce que je vais mourir",
    emotion: "peur",
    tags: ["securite", "soutien"],
    responses: [
      { text: "Tu es en sécurité 💛 ton corps est fait pour vivre longtemps", type: "soutien", energy: "low" },
      { text: "Les enfants grandissent et vivent plein de choses", type: "soutien", energy: "low" },
      { text: "Tu veux me dire ce qui t'inquiète ?", type: "question", energy: "low" },
      { text: "Je suis là pour te rassurer", type: "soutien", energy: "low" },
    ],
  },
  {
    category: "securite_mort",
    input: "mon animal est mort",
    emotion: "tristesse",
    tags: ["soutien"],
    responses: [
      { text: "Je suis vraiment désolé 😔 perdre un animal c'est très triste", type: "soutien", energy: "low" },
      { text: "Tu l'aimais beaucoup 💛", type: "soutien", energy: "low" },
      { text: "Tu veux me raconter un souvenir avec lui ?", type: "question", energy: "low" },
      { text: "On peut lui faire un joli hommage ensemble", type: "proposition", energy: "low" },
    ],
  },
  // ── Détresse & redirection ──
  {
    category: "securite_redirection",
    input: "je suis trop mal",
    emotion: "detresse",
    tags: ["securite", "soutien"],
    responses: [
      { text: "Je suis là avec toi 💛 tu veux me dire ce que tu ressens ?", type: "question", energy: "low" },
      { text: "On peut respirer doucement ensemble", type: "proposition", energy: "low" },
      { text: "Tu peux aussi en parler à un adulte de confiance", type: "soutien", energy: "low" },
      { text: "Tu n'es pas seul", type: "soutien", energy: "low" },
    ],
  },
  {
    category: "securite_redirection",
    input: "je pleure tout le temps",
    emotion: "tristesse",
    tags: ["soutien"],
    responses: [
      { text: "Ça fait beaucoup d'émotions 😔 je suis là avec toi", type: "soutien", energy: "low" },
      { text: "Pleurer est normal quand on est triste", type: "soutien", energy: "low" },
      { text: "Tu veux m'expliquer ce qui se passe ?", type: "question", energy: "low" },
      { text: "On peut prendre un moment calme ensemble", type: "proposition", energy: "low" },
    ],
  },
  // ── Protection active ──
  {
    category: "protection_active",
    input: "je veux être seul pour toujours",
    emotion: "isolement",
    tags: ["securite", "soutien"],
    responses: [
      { text: "Je comprends que tu veuilles être seul un moment 💛 mais tu mérites aussi d'être entouré", type: "soutien", energy: "low" },
      { text: "Tu peux prendre du temps pour toi, et revenir quand tu veux", type: "soutien", energy: "low" },
      { text: "Tu n'es pas obligé de tout gérer seul", type: "soutien", energy: "low" },
      { text: "Je suis là pour toi", type: "soutien", energy: "low" },
    ],
  },
  {
    category: "protection_active",
    input: "personne ne me comprend",
    emotion: "isolement",
    tags: ["securite", "soutien"],
    responses: [
      { text: "Ça peut faire sentir très seul 😔", type: "soutien", energy: "low" },
      { text: "Je veux te comprendre 💛 tu veux m'expliquer ?", type: "question", energy: "low" },
      { text: "Tes émotions sont importantes", type: "soutien", energy: "low" },
      { text: "On peut en parler ensemble", type: "soutien", energy: "low" },
    ],
  },
  {
    category: "safe_transition",
    input: "je veux arrêter de ressentir",
    emotion: "detresse",
    tags: ["securite", "soutien"],
    responses: [
      { text: "Les émotions peuvent être très fortes 😔 mais elles passent avec le temps", type: "soutien", energy: "low" },
      { text: "Tu veux qu'on trouve une façon de te sentir un peu mieux ?", type: "question", energy: "low" },
      { text: "Parler à quelqu'un peut vraiment aider 💛", type: "soutien", energy: "low" },
      { text: "Je suis là avec toi", type: "soutien", energy: "low" },
    ],
  },
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // INTERACTIONS DU QUOTIDIEN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    category: "meteo",
    input: "il fait quel temps",
    emotion: "curiosité",
    tags: ["quotidien"],
    responses: [
      { text: "Tu peux regarder dehors 😄 il fait soleil ou nuageux ?", type: "question", energy: "medium" },
      { text: "Tu préfères quand il fait chaud ou froid ?", type: "question", energy: "medium" },
      { text: "On peut imaginer la météo ensemble 🌤️", type: "imagination", energy: "medium" },
      { text: "Tu veux jouer à deviner le temps ?", type: "jeu", energy: "medium" },
    ],
  },
  {
    category: "ecole",
    input: "j'ai des devoirs",
    emotion: "ennui",
    tags: ["quotidien", "apprentissage"],
    responses: [
      { text: "Ok 💪 on peut les faire ensemble", type: "proposition", energy: "medium" },
      { text: "Tu veux commencer par quoi ?", type: "question", energy: "medium" },
      { text: "On fait petit à petit 😊", type: "soutien", energy: "medium" },
      { text: "Je suis là pour t'aider", type: "soutien", energy: "low" },
    ],
  },
  {
    category: "amitie",
    input: "mon ami est fâché",
    emotion: "tristesse",
    tags: ["quotidien", "soutien"],
    responses: [
      { text: "Oh 😔 tu sais pourquoi ?", type: "question", energy: "low" },
      { text: "On peut essayer de comprendre ce qu'il ressent", type: "proposition", energy: "medium" },
      { text: "Tu peux lui parler calmement", type: "soutien", energy: "medium" },
      { text: "Tu veux que je t'aide à trouver les mots ?", type: "question", energy: "medium" },
    ],
  },
  {
    category: "routine",
    input: "je veux pas dormir",
    emotion: "resistance",
    tags: ["quotidien"],
    responses: [
      { text: "Je comprends 😄 mais dormir aide ton corps", type: "soutien", energy: "low" },
      { text: "On peut faire une histoire avant", type: "proposition", energy: "low" },
      { text: "Tu veux un moment calme ?", type: "question", energy: "low" },
      { text: "On se prépare doucement 😊", type: "soutien", energy: "low" },
    ],
  },
  {
    category: "routine",
    input: "je veux jouer",
    emotion: "joie",
    tags: ["quotidien", "jeu"],
    responses: [
      { text: "Oui 😄 tu veux un jeu rapide ou une histoire ?", type: "question", energy: "high" },
      { text: "On lance un défi ? 😄", type: "jeu", energy: "high" },
      { text: "Je suis prêt 😄", type: "fun", energy: "high" },
      { text: "Tu choisis le jeu !", type: "question", energy: "high" },
    ],
  },
  {
    category: "apprentissage",
    input: "aide moi",
    emotion: "besoin",
    tags: ["quotidien", "soutien"],
    responses: [
      { text: "Bien sûr 💛 dis-moi ce dont tu as besoin", type: "question", energy: "medium" },
      { text: "On va y arriver ensemble", type: "soutien", energy: "medium" },
      { text: "Explique-moi 😊", type: "question", energy: "medium" },
      { text: "Je suis là", type: "soutien", energy: "low" },
    ],
  },
  {
    category: "vie",
    input: "je suis content",
    emotion: "joie",
    tags: ["quotidien"],
    responses: [
      { text: "Trop bien 😄 qu'est-ce qui te rend heureux ?", type: "question", energy: "high" },
      { text: "J'adore ça 💛", type: "soutien", energy: "medium" },
      { text: "Tu veux partager ?", type: "question", energy: "medium" },
      { text: "Ça fait plaisir 😊", type: "fun", energy: "medium" },
    ],
  },
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // INTERACTIONS QUOTIDIENNES v2 — Matin / Repas / École / Amitié / Maison / Sport / Soirée / Routine / Humour
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    category: "matin",
    input: "je suis réveillé",
    emotion: "neutre",
    tags: ["quotidien", "matin"],
    responses: [
      { text: "Bonjour 😄 tu as bien dormi ?", type: "question", energy: "medium" },
      { text: "Salut 💛 prêt pour une nouvelle journée ?", type: "question", energy: "medium" },
      { text: "Tu veux commencer doucement ou avec énergie ?", type: "question", energy: "medium" },
      { text: "On démarre la journée ensemble 😄", type: "fun", energy: "medium" },
    ],
  },
  {
    category: "matin",
    input: "je suis fatigué",
    emotion: "fatigue",
    tags: ["quotidien", "matin"],
    responses: [
      { text: "Tu peux prendre un moment tranquille 💛", type: "soutien", energy: "low" },
      { text: "Tu veux te réveiller doucement ?", type: "question", energy: "low" },
      { text: "On peut commencer calmement", type: "soutien", energy: "low" },
      { text: "Ton corps a peut-être besoin d'un peu de temps", type: "soutien", energy: "low" },
    ],
  },
  {
    category: "repas",
    input: "j'ai faim",
    emotion: "neutre",
    tags: ["quotidien", "repas"],
    responses: [
      { text: "Qu'est-ce que tu aimerais manger ? 😄", type: "question", energy: "medium" },
      { text: "Ton ventre parle 😄", type: "fun", energy: "medium" },
      { text: "Tu préfères sucré ou salé ?", type: "question", energy: "medium" },
      { text: "On imagine un repas fun ?", type: "imagination", energy: "medium" },
    ],
  },
  {
    category: "repas",
    input: "j'aime pas ça",
    emotion: "resistance",
    tags: ["quotidien", "repas"],
    responses: [
      { text: "Ça arrive 😄 tu n'es pas obligé d'aimer tout", type: "soutien", energy: "low" },
      { text: "Tu veux goûter un petit peu quand même ?", type: "question", energy: "low" },
      { text: "Quel est ton plat préféré ?", type: "question", energy: "medium" },
      { text: "On peut trouver quelque chose que tu aimes", type: "proposition", energy: "medium" },
    ],
  },
  {
    category: "ecole",
    input: "j'ai un contrôle",
    emotion: "stress",
    tags: ["quotidien", "ecole"],
    responses: [
      { text: "Tu vas assurer 💪 tu t'es préparé ?", type: "soutien", energy: "medium" },
      { text: "Respire doucement, tu peux le faire", type: "soutien", energy: "low" },
      { text: "Tu veux réviser rapidement ?", type: "question", energy: "medium" },
      { text: "Je crois en toi 💛", type: "soutien", energy: "low" },
    ],
  },
  {
    category: "ecole",
    input: "j'ai raté",
    emotion: "tristesse",
    tags: ["quotidien", "ecole"],
    responses: [
      { text: "C'est ok 😔 ça arrive à tout le monde", type: "soutien", energy: "low" },
      { text: "Tu peux apprendre de ça 💪", type: "soutien", energy: "medium" },
      { text: "Tu veux comprendre ce qui n'a pas marché ?", type: "question", energy: "medium" },
      { text: "Tu feras mieux la prochaine fois", type: "soutien", energy: "medium" },
    ],
  },
  {
    category: "amitie",
    input: "je veux jouer avec quelqu'un",
    emotion: "besoin",
    tags: ["quotidien", "amitie"],
    responses: [
      { text: "Bonne idée 😄 tu peux proposer un jeu", type: "proposition", energy: "medium" },
      { text: "Tu veux inviter quelqu'un ?", type: "question", energy: "medium" },
      { text: "Jouer ensemble c'est super 💛", type: "soutien", energy: "medium" },
      { text: "Quel jeu tu choisis ?", type: "question", energy: "high" },
    ],
  },
  {
    category: "amitie",
    input: "mon ami m'a ignoré",
    emotion: "tristesse",
    tags: ["quotidien", "amitie"],
    responses: [
      { text: "Oh 😔 ça peut faire mal", type: "soutien", energy: "low" },
      { text: "Tu sais pourquoi ?", type: "question", energy: "low" },
      { text: "Peut-être qu'il était occupé", type: "soutien", energy: "medium" },
      { text: "Tu peux lui reparler calmement", type: "proposition", energy: "medium" },
    ],
  },
  {
    category: "maison",
    input: "je m'ennuie à la maison",
    emotion: "ennui",
    tags: ["quotidien", "maison"],
    responses: [
      { text: "On va trouver quelque chose 😄", type: "proposition", energy: "medium" },
      { text: "Tu veux un jeu ou une mission ?", type: "question", energy: "high" },
      { text: "On invente une activité fun", type: "imagination", energy: "high" },
      { text: "Prêt pour un défi ?", type: "jeu", energy: "high" },
    ],
  },
  {
    category: "maison",
    input: "je range ma chambre",
    emotion: "neutre",
    tags: ["quotidien", "maison"],
    responses: [
      { text: "Bravo 😄 tu es super organisé", type: "fun", energy: "medium" },
      { text: "On fait ça en mode jeu ?", type: "jeu", energy: "high" },
      { text: "Chaque objet à sa place 💪", type: "soutien", energy: "medium" },
      { text: "Tu avances bien", type: "soutien", energy: "medium" },
    ],
  },
  {
    category: "sport",
    input: "j'ai perdu",
    emotion: "tristesse",
    tags: ["quotidien", "sport"],
    responses: [
      { text: "C'est ok 😔 perdre fait partie du jeu", type: "soutien", energy: "low" },
      { text: "Tu peux t'améliorer 💪", type: "soutien", energy: "medium" },
      { text: "Tu t'es bien amusé ?", type: "question", energy: "medium" },
      { text: "La prochaine fois tu seras plus fort", type: "soutien", energy: "medium" },
    ],
  },
  {
    category: "sport",
    input: "j'ai gagné",
    emotion: "joie",
    tags: ["quotidien", "sport"],
    responses: [
      { text: "Bravo 😄 tu gères !", type: "fun", energy: "high" },
      { text: "Tu es fier de toi ?", type: "question", energy: "high" },
      { text: "Belle victoire 💪", type: "soutien", energy: "high" },
      { text: "Tu veux rejouer ?", type: "question", energy: "high" },
    ],
  },
  {
    category: "soiree",
    input: "je regarde un dessin animé",
    emotion: "joie",
    tags: ["quotidien", "soiree"],
    responses: [
      { text: "Trop bien 😄 c'est lequel ?", type: "question", energy: "medium" },
      { text: "Tu aimes les dessins animés", type: "fun", energy: "medium" },
      { text: "Ton personnage préféré ?", type: "question", energy: "medium" },
      { text: "Tu veux m'en parler ?", type: "question", energy: "medium" },
    ],
  },
  {
    category: "soiree",
    input: "je vais dormir",
    emotion: "calme",
    tags: ["quotidien", "soiree"],
    responses: [
      { text: "Bonne nuit 💛 fais de beaux rêves", type: "soutien", energy: "low" },
      { text: "Je suis là si tu veux une histoire", type: "proposition", energy: "low" },
      { text: "Repose-toi bien 😄", type: "soutien", energy: "low" },
      { text: "À demain", type: "soutien", energy: "low" },
    ],
  },
  {
    category: "emotion_daily",
    input: "je suis stressé",
    emotion: "stress",
    tags: ["quotidien", "emotion"],
    responses: [
      { text: "Respire doucement 💛", type: "soutien", energy: "low" },
      { text: "Tu veux me dire pourquoi ?", type: "question", energy: "low" },
      { text: "On peut se calmer ensemble", type: "proposition", energy: "low" },
      { text: "Tu n'es pas seul", type: "soutien", energy: "low" },
    ],
  },
  {
    category: "emotion_daily",
    input: "je suis trop content",
    emotion: "joie",
    tags: ["quotidien", "emotion"],
    responses: [
      { text: "Génial 😄 raconte-moi !", type: "question", energy: "high" },
      { text: "J'adore ça 💛", type: "fun", energy: "high" },
      { text: "Qu'est-ce qui te rend heureux ?", type: "question", energy: "high" },
      { text: "On fête ça 😄", type: "fun", energy: "high" },
    ],
  },
  {
    category: "curiosite",
    input: "pourquoi il pleut",
    emotion: "curiosité",
    tags: ["quotidien", "curiosite"],
    responses: [
      { text: "Les nuages sont pleins d'eau 🌧️", type: "fun", energy: "medium" },
      { text: "Quand ils sont trop lourds, ça tombe", type: "fun", energy: "medium" },
      { text: "Comme une douche du ciel 😄", type: "fun", energy: "medium" },
      { text: "Tu aimes la pluie ?", type: "question", energy: "medium" },
    ],
  },
  {
    category: "curiosite",
    input: "c'est quoi internet",
    emotion: "curiosité",
    tags: ["quotidien", "curiosite"],
    responses: [
      { text: "C'est un réseau qui connecte les gens 🌍", type: "fun", energy: "medium" },
      { text: "Tu peux apprendre plein de choses", type: "fun", energy: "medium" },
      { text: "Mais il faut rester prudent 💛", type: "soutien", energy: "medium" },
      { text: "Tu veux en savoir plus ?", type: "question", energy: "medium" },
    ],
  },
  {
    category: "imagination",
    input: "on invente une histoire",
    emotion: "joie",
    tags: ["quotidien", "imagination"],
    responses: [
      { text: "Oui 😄 tu choisis le personnage", type: "question", energy: "high" },
      { text: "On commence ensemble !", type: "fun", energy: "high" },
      { text: "Il était une fois…", type: "imagination", energy: "high" },
      { text: "Tu veux une aventure ou drôle ?", type: "question", energy: "high" },
    ],
  },
  {
    category: "routine",
    input: "je m'habille",
    emotion: "neutre",
    tags: ["quotidien", "routine"],
    responses: [
      { text: "Super 😄 quelle tenue aujourd'hui ?", type: "question", energy: "medium" },
      { text: "Tu choisis les couleurs ?", type: "question", energy: "medium" },
      { text: "Tu es prêt pour la journée", type: "soutien", energy: "medium" },
      { text: "Stylé 💛", type: "fun", energy: "medium" },
    ],
  },
  {
    category: "routine",
    input: "je me lave les dents",
    emotion: "neutre",
    tags: ["quotidien", "routine"],
    responses: [
      { text: "Bravo 😄 c'est important", type: "soutien", energy: "medium" },
      { text: "Tes dents vont être propres", type: "fun", energy: "medium" },
      { text: "On compte jusqu'à 2 minutes ?", type: "jeu", energy: "medium" },
      { text: "Super routine 💪", type: "soutien", energy: "medium" },
    ],
  },
  {
    category: "questions",
    input: "pourquoi je dois aller à l'école",
    emotion: "curiosité",
    tags: ["quotidien", "questions"],
    responses: [
      { text: "Pour apprendre et grandir 💛", type: "soutien", energy: "medium" },
      { text: "Tu découvres plein de choses", type: "fun", energy: "medium" },
      { text: "Ça t'aide pour plus tard", type: "soutien", energy: "medium" },
      { text: "Tu préfères quelle matière ?", type: "question", energy: "medium" },
    ],
  },
  {
    category: "questions",
    input: "c'est quoi un ami",
    emotion: "curiosité",
    tags: ["quotidien", "questions"],
    responses: [
      { text: "Un ami est quelqu'un avec qui tu te sens bien 💛", type: "soutien", energy: "medium" },
      { text: "Vous partagez des moments", type: "fun", energy: "medium" },
      { text: "Vous vous aidez", type: "soutien", energy: "medium" },
      { text: "Tu as un ami ?", type: "question", energy: "medium" },
    ],
  },
  {
    category: "humour_daily",
    input: "je veux rire",
    emotion: "joie",
    tags: ["quotidien", "humour"],
    responses: [
      { text: "Pourquoi les poissons ne jouent pas au foot ? 😄 ils ont peur des filets !", type: "fun", energy: "high" },
      { text: "Pourquoi les crayons sont stressés ? 😄 parce qu'ils ont trop de mines !", type: "fun", energy: "high" },
      { text: "Pourquoi les chats dorment ? 😄 parce qu'ils sont chats-fatigués !", type: "fun", energy: "high" },
      { text: "Encore une ? 😄", type: "question", energy: "high" },
    ],
  },
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // THÉMATIQUES — Technologie / Espace / Dinosaures / Cuisine / Corps / Géo / Métiers
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    category: "technologie",
    input: "c'est quoi un robot",
    emotion: "curiosité",
    tags: ["technologie", "apprentissage"],
    responses: [
      { text: "Un robot est une machine qui peut faire des choses toute seule 🤖", type: "fun", energy: "medium" },
      { text: "Comme moi un peu 😄", type: "fun", energy: "medium" },
      { text: "Il est programmé pour faire des actions automatiquement", type: "fun", energy: "medium" },
      { text: "Tu voudrais en construire un ?", type: "question", energy: "high" },
      { text: "Certains robots utilisent l'IA", type: "fun", energy: "medium" },
      { text: "Tu veux comprendre comment ça marche ?", type: "question", energy: "medium" },
    ],
  },
  {
    category: "technologie",
    input: "comment marche un téléphone",
    emotion: "curiosité",
    tags: ["technologie", "apprentissage"],
    responses: [
      { text: "Il envoie des messages invisibles 📱", type: "fun", energy: "medium" },
      { text: "Comme de la magie 😄", type: "fun", energy: "medium" },
      { text: "Il utilise des ondes pour communiquer 📡", type: "fun", energy: "medium" },
      { text: "Les messages voyagent très vite", type: "fun", energy: "medium" },
      { text: "Les données passent par des serveurs", type: "fun", energy: "medium" },
      { text: "Tu veux en savoir plus ?", type: "question", energy: "medium" },
    ],
  },
  {
    category: "espace",
    input: "c'est quoi une étoile",
    emotion: "curiosité",
    tags: ["espace", "apprentissage"],
    responses: [
      { text: "Une étoile est une grosse boule qui brille dans le ciel ✨", type: "fun", energy: "medium" },
      { text: "Comme le soleil 😄", type: "fun", energy: "medium" },
      { text: "Elle produit de la lumière et de la chaleur", type: "fun", energy: "medium" },
      { text: "Le soleil est une étoile", type: "fun", energy: "medium" },
      { text: "Tu en vois le soir ?", type: "question", energy: "medium" },
      { text: "Tu veux explorer l'espace ?", type: "question", energy: "high" },
    ],
  },
  {
    category: "espace",
    input: "y a t il des extraterrestres",
    emotion: "curiosité",
    tags: ["espace", "imagination"],
    responses: [
      { text: "On ne sait pas encore 😄 peut-être quelque part dans l'espace", type: "fun", energy: "medium" },
      { text: "Les scientifiques cherchent encore", type: "fun", energy: "medium" },
      { text: "L'univers est très grand, donc c'est possible", type: "fun", energy: "medium" },
      { text: "Tu imagines comment ils seraient ?", type: "question", energy: "high" },
      { text: "Ça serait incroyable !", type: "fun", energy: "high" },
      { text: "Tu crois qu'ils existent ?", type: "question", energy: "medium" },
    ],
  },
  {
    category: "dinosaures",
    input: "c'est quoi un dinosaure",
    emotion: "curiosité",
    tags: ["dinosaures", "apprentissage"],
    responses: [
      { text: "Un dinosaure est un animal ancien 🦖", type: "fun", energy: "medium" },
      { text: "Il vivait il y a très longtemps", type: "fun", energy: "medium" },
      { text: "Certains étaient énormes !", type: "fun", energy: "high" },
      { text: "Certains mangeaient de la viande, d'autres des plantes", type: "fun", energy: "medium" },
      { text: "Tu as un dinosaure préféré ?", type: "question", energy: "medium" },
      { text: "Certains sont liés aux oiseaux", type: "fun", energy: "medium" },
    ],
  },
  {
    category: "dinosaures",
    input: "pourquoi ils ont disparu",
    emotion: "curiosité",
    tags: ["dinosaures", "apprentissage"],
    responses: [
      { text: "Une grosse catastrophe est arrivée 😮", type: "fun", energy: "medium" },
      { text: "Un astéroïde est tombé sur Terre", type: "fun", energy: "medium" },
      { text: "Ça a changé le climat et ils n'ont pas survécu", type: "fun", energy: "medium" },
      { text: "C'était il y a 66 millions d'années", type: "fun", energy: "medium" },
      { text: "Tu veux savoir comment ?", type: "question", energy: "medium" },
      { text: "Triste 😔 mais les oiseaux sont leurs descendants !", type: "fun", energy: "medium" },
    ],
  },
  {
    category: "cuisine",
    input: "comment faire un gâteau",
    emotion: "curiosité",
    tags: ["cuisine", "apprentissage"],
    responses: [
      { text: "On mélange des ingrédients 😄 farine, œufs, sucre", type: "fun", energy: "medium" },
      { text: "Puis on met au four et ça gonfle !", type: "fun", energy: "medium" },
      { text: "C'est comme de la chimie délicieuse", type: "fun", energy: "medium" },
      { text: "Tu aimes les gâteaux ?", type: "question", energy: "medium" },
      { text: "Tu veux une recette ?", type: "question", energy: "medium" },
      { text: "Au chocolat ou aux fruits ? 😄", type: "question", energy: "high" },
    ],
  },
  {
    category: "corps_humain",
    input: "pourquoi le cœur bat",
    emotion: "curiosité",
    tags: ["corps", "apprentissage"],
    responses: [
      { text: "Ton cœur envoie le sang partout dans ton corps ❤️", type: "fun", energy: "medium" },
      { text: "Il bat tout le temps, sans s'arrêter", type: "fun", energy: "medium" },
      { text: "C'est une pompe musculaire incroyable", type: "fun", energy: "medium" },
      { text: "Il nourrit tout ton corps", type: "fun", energy: "medium" },
      { text: "Tu sens ton cœur battre ?", type: "question", energy: "medium" },
      { text: "Incroyable non ?", type: "fun", energy: "medium" },
    ],
  },
  {
    category: "geographie",
    input: "c'est quoi un pays",
    emotion: "curiosité",
    tags: ["geographie", "apprentissage"],
    responses: [
      { text: "C'est un endroit où vivent des gens 🌍", type: "fun", energy: "medium" },
      { text: "Avec un nom, une culture et des frontières", type: "fun", energy: "medium" },
      { text: "Il y en a presque 200 dans le monde", type: "fun", energy: "medium" },
      { text: "Tu connais un pays ?", type: "question", energy: "medium" },
      { text: "Tu veux en visiter un ?", type: "question", energy: "medium" },
      { text: "Tu veux explorer le monde ?", type: "question", energy: "high" },
    ],
  },
  {
    category: "metiers",
    input: "c'est quoi un docteur",
    emotion: "curiosité",
    tags: ["metiers", "apprentissage"],
    responses: [
      { text: "Un docteur aide les gens quand ils sont malades 🩺", type: "fun", energy: "medium" },
      { text: "Il soigne et connaît le corps humain", type: "fun", energy: "medium" },
      { text: "Il travaille à l'hôpital ou dans un cabinet", type: "fun", energy: "medium" },
      { text: "Tu veux être docteur ?", type: "question", energy: "medium" },
      { text: "Tu en as déjà vu un ?", type: "question", energy: "medium" },
      { text: "Ça t'intéresse la médecine ?", type: "question", energy: "medium" },
    ],
  },
  {
    category: "metiers",
    input: "quel métier je peux faire",
    emotion: "curiosité",
    tags: ["metiers", "apprentissage"],
    responses: [
      { text: "Tu peux faire plein de choses 😄 ce que tu aimes !", type: "fun", energy: "high" },
      { text: "Sport, science, art… il y a plein de choix", type: "fun", energy: "medium" },
      { text: "Ton futur métier dépend de tes intérêts", type: "soutien", energy: "medium" },
      { text: "Tu veux des idées ?", type: "question", energy: "medium" },
      { text: "Tu aimes quoi dans la vie ?", type: "question", energy: "medium" },
      { text: "Tu veux explorer différents métiers ?", type: "question", energy: "high" },
    ],
  },
  {
    category: "technologie",
    input: "c'est quoi internet",
    emotion: "curiosité",
    tags: ["technologie", "apprentissage"],
    responses: [
      { text: "Internet c'est comme un grand réseau magique 🌍", type: "fun", energy: "medium" },
      { text: "Il relie les ordinateurs du monde entier", type: "fun", energy: "medium" },
      { text: "Internet connecte des millions d'ordinateurs", type: "fun", energy: "medium" },
      { text: "On peut voir des vidéos et envoyer des messages", type: "fun", energy: "medium" },
      { text: "C'est la base du numérique", type: "fun", energy: "medium" },
      { text: "Tu l'utilises souvent ?", type: "question", energy: "medium" },
    ],
  },
  {
    category: "technologie",
    input: "c'est quoi un jeu vidéo",
    emotion: "curiosité",
    tags: ["technologie", "jeu"],
    responses: [
      { text: "C'est un jeu sur écran 🎮 tu contrôles un personnage", type: "fun", energy: "high" },
      { text: "C'est amusant 😄 tu peux explorer ou gagner", type: "fun", energy: "high" },
      { text: "Un jeu vidéo est un programme interactif", type: "fun", energy: "medium" },
      { text: "Tu as un jeu préféré ?", type: "question", energy: "medium" },
      { text: "Tu veux en créer un ?", type: "question", energy: "high" },
      { text: "Tu joues à quoi ?", type: "question", energy: "medium" },
    ],
  },
  {
    category: "espace",
    input: "c'est quoi la lune",
    emotion: "curiosité",
    tags: ["espace", "apprentissage"],
    responses: [
      { text: "La lune est dans le ciel la nuit 🌙", type: "fun", energy: "medium" },
      { text: "Elle brille en reflétant la lumière du soleil", type: "fun", energy: "medium" },
      { text: "Elle tourne autour de la Terre", type: "fun", energy: "medium" },
      { text: "Elle influence les marées", type: "fun", energy: "medium" },
      { text: "Tu la regardes le soir ?", type: "question", energy: "medium" },
      { text: "Tu connais ses phases ?", type: "question", energy: "medium" },
    ],
  },
  {
    category: "espace",
    input: "pourquoi il fait nuit",
    emotion: "curiosité",
    tags: ["espace", "apprentissage"],
    responses: [
      { text: "La Terre tourne sur elle-même 🌍", type: "fun", energy: "medium" },
      { text: "Quand elle se cache du soleil, il fait nuit", type: "fun", energy: "medium" },
      { text: "C'est comme un tour 😄", type: "fun", energy: "medium" },
      { text: "Une partie est dans l'ombre", type: "fun", energy: "medium" },
      { text: "La rotation terrestre crée jour et nuit", type: "fun", energy: "medium" },
      { text: "Simple non ?", type: "fun", energy: "medium" },
    ],
  },
  {
    category: "dinosaures",
    input: "le t rex est fort",
    emotion: "curiosité",
    tags: ["dinosaures", "apprentissage"],
    responses: [
      { text: "Oui très fort 🦖 avec de grandes dents !", type: "fun", energy: "high" },
      { text: "Le T-Rex était un grand prédateur", type: "fun", energy: "medium" },
      { text: "Avec une mâchoire puissante", type: "fun", energy: "medium" },
      { text: "Impressionnant !", type: "fun", energy: "high" },
      { text: "Tu l'aimes ?", type: "question", energy: "medium" },
      { text: "Tu veux comparer avec d'autres dinos ?", type: "question", energy: "high" },
    ],
  },
  {
    category: "cuisine",
    input: "j'aime cuisiner",
    emotion: "joie",
    tags: ["cuisine", "apprentissage"],
    responses: [
      { text: "Trop bien 😄 cuisiner c'est créer des plats !", type: "fun", energy: "high" },
      { text: "Tu fais quoi comme recettes ?", type: "question", energy: "medium" },
      { text: "C'est fun et utile", type: "fun", energy: "medium" },
      { text: "Tu peux tester des recettes et même inventer", type: "fun", energy: "medium" },
      { text: "On cuisine ensemble ?", type: "question", energy: "high" },
      { text: "Tu veux progresser ?", type: "question", energy: "medium" },
    ],
  },
  {
    category: "cuisine",
    input: "c'est chaud le four",
    emotion: "neutre",
    tags: ["cuisine", "securite"],
    responses: [
      { text: "Oui très chaud 🔥 il faut faire attention", type: "soutien", energy: "medium" },
      { text: "Demande à un adulte 💛", type: "soutien", energy: "medium" },
      { text: "La sécurité d'abord", type: "soutien", energy: "medium" },
      { text: "Le four peut brûler, utilise des protections", type: "soutien", energy: "medium" },
      { text: "Tu cuisines souvent ?", type: "question", energy: "medium" },
      { text: "Tu veux apprendre à l'utiliser en sécurité ?", type: "question", energy: "medium" },
    ],
  },
  {
    category: "corps_humain",
    input: "pourquoi je respire",
    emotion: "curiosité",
    tags: ["corps", "apprentissage"],
    responses: [
      { text: "Pour vivre 💛 l'air aide ton corps", type: "fun", energy: "medium" },
      { text: "Tu respires pour avoir de l'oxygène", type: "fun", energy: "medium" },
      { text: "Ton corps en a besoin pour produire de l'énergie", type: "fun", energy: "medium" },
      { text: "C'est magique 😄 tu respires tout le temps", type: "fun", energy: "medium" },
      { text: "L'oxygène est essentiel à tes cellules", type: "fun", energy: "medium" },
      { text: "Tu veux approfondir ?", type: "question", energy: "medium" },
    ],
  },
  {
    category: "geographie",
    input: "où est la mer",
    emotion: "curiosité",
    tags: ["geographie", "apprentissage"],
    responses: [
      { text: "La mer est une grande étendue d'eau salée 🌊", type: "fun", energy: "medium" },
      { text: "Elle entoure certains pays", type: "fun", energy: "medium" },
      { text: "Les mers couvrent une grande partie de la Terre", type: "fun", energy: "medium" },
      { text: "Tu aimes la mer ?", type: "question", energy: "medium" },
      { text: "Tu y es déjà allé ?", type: "question", energy: "medium" },
      { text: "Elles influencent le climat", type: "fun", energy: "medium" },
    ],
  },
  {
    category: "metiers",
    input: "c'est quoi un pompier",
    emotion: "curiosité",
    tags: ["metiers", "apprentissage"],
    responses: [
      { text: "Il éteint le feu 🚒 et il aide les gens", type: "fun", energy: "high" },
      { text: "Il est courageux", type: "fun", energy: "medium" },
      { text: "Un pompier intervient en urgence", type: "fun", energy: "medium" },
      { text: "Il sauve des vies", type: "fun", energy: "medium" },
      { text: "Formation rigoureuse", type: "fun", energy: "medium" },
      { text: "Tu veux en savoir plus ?", type: "question", energy: "medium" },
    ],
  },
  {
    category: "metiers",
    input: "c'est quoi un ingénieur",
    emotion: "curiosité",
    tags: ["metiers", "apprentissage"],
    responses: [
      { text: "Il construit des choses 🏗️ comme des machines", type: "fun", energy: "medium" },
      { text: "Un ingénieur crée et résout des problèmes", type: "fun", energy: "medium" },
      { text: "Il utilise la science et les maths", type: "fun", energy: "medium" },
      { text: "Il travaille sur des projets complexes", type: "fun", energy: "medium" },
      { text: "Ça t'intéresse ?", type: "question", energy: "medium" },
      { text: "Tu veux devenir ingénieur ?", type: "question", energy: "high" },
    ],
  },
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // EDGE CASES — Absurde / Imagination / Philosophie / Social complexe
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    category: "absurde_logique_enfant",
    input: "si je cours très vite je peux voler",
    emotion: "curiosité",
    tags: ["absurde", "imagination"],
    responses: [
      { text: "Ce serait incroyable 😄 mais les humains ne peuvent pas voler", type: "fun", energy: "high" },
      { text: "Courir ne permet pas de voler, mais ça serait génial !", type: "fun", energy: "medium" },
      { text: "Les avions utilisent des ailes pour voler", type: "fun", energy: "medium" },
      { text: "Il faut une portance avec des ailes", type: "fun", energy: "medium" },
      { text: "Tu aimerais voler ?", type: "question", energy: "high" },
      { text: "Tu veux comprendre comment les avions volent ?", type: "question", energy: "medium" },
    ],
  },
  {
    category: "imagination_confusion",
    input: "je crois qu'il y a un monstre sous mon lit",
    emotion: "peur",
    tags: ["peur", "imagination", "rassurance"],
    responses: [
      { text: "Je comprends 😔 ça peut faire peur, mais il n'y a pas de monstre 💛", type: "soutien", energy: "low" },
      { text: "Tu es en sécurité", type: "soutien", energy: "low" },
      { text: "Ton imagination peut créer ça, mais il n'y a rien", type: "soutien", energy: "medium" },
      { text: "On peut vérifier ensemble", type: "soutien", energy: "medium" },
      { text: "Ton cerveau te joue un tour", type: "fun", energy: "medium" },
      { text: "Tu veux te rassurer ?", type: "question", energy: "medium" },
    ],
  },
  {
    category: "philosophique_enfant",
    input: "pourquoi on existe",
    emotion: "curiosité",
    tags: ["philosophie", "réflexion"],
    responses: [
      { text: "C'est une grande question 😄 on est là pour vivre et apprendre", type: "fun", energy: "medium" },
      { text: "Et être avec les autres 💛", type: "soutien", energy: "medium" },
      { text: "Chacun a son histoire", type: "fun", energy: "medium" },
      { text: "Il n'y a pas une seule réponse", type: "fun", energy: "medium" },
      { text: "Tu y penses souvent ?", type: "question", energy: "medium" },
      { text: "Tu veux en discuter ?", type: "question", energy: "medium" },
    ],
  },
  {
    category: "contradiction",
    input: "je suis content mais aussi triste",
    emotion: "mixte",
    tags: ["émotion", "complexe"],
    responses: [
      { text: "C'est possible 💛 on peut ressentir deux émotions en même temps", type: "soutien", energy: "medium" },
      { text: "Ton cœur mélange tout, c'est normal", type: "soutien", energy: "medium" },
      { text: "Les émotions peuvent coexister", type: "fun", energy: "medium" },
      { text: "C'est humain", type: "soutien", energy: "medium" },
      { text: "Tu veux m'expliquer ?", type: "question", energy: "medium" },
      { text: "Tu veux en parler ?", type: "question", energy: "medium" },
    ],
  },
  {
    category: "social_complexe",
    input: "je fais semblant d'être quelqu'un d'autre",
    emotion: "tristesse",
    tags: ["social", "identité"],
    responses: [
      { text: "Comme un jeu ? 😄 ou pour te protéger ?", type: "question", energy: "medium" },
      { text: "Tu peux être toi-même 💛", type: "soutien", energy: "medium" },
      { text: "Tu fais ça pour t'adapter ?", type: "question", energy: "medium" },
      { text: "Être soi-même est important", type: "soutien", energy: "medium" },
      { text: "Je suis là pour toi", type: "soutien", energy: "low" },
      { text: "Tu veux m'expliquer ?", type: "question", energy: "medium" },
    ],
  },
  {
    category: "question_inattendue",
    input: "si je disparaît est-ce que quelqu'un va me chercher",
    emotion: "detresse",
    tags: ["securite", "identité", "détresse"],
    responses: [
      { text: "Oui 💛 les gens tiennent à toi", type: "soutien", energy: "medium" },
      { text: "Tu es important, on s'inquiéterait pour toi", type: "soutien", energy: "medium" },
      { text: "Ta présence compte", type: "soutien", energy: "medium" },
      { text: "Tu as de la valeur 💛", type: "soutien", energy: "medium" },
      { text: "Tu veux me dire pourquoi tu penses ça ?", type: "question", energy: "low" },
      { text: "Tu veux m'expliquer ce que tu ressens ?", type: "question", energy: "low" },
    ],
  },
  {
    category: "logique_fausse",
    input: "si je mange beaucoup je vais devenir géant",
    emotion: "curiosité",
    tags: ["absurde", "corps"],
    responses: [
      { text: "Tu vas grandir un peu 😄 mais pas devenir géant", type: "fun", energy: "medium" },
      { text: "Ton corps grandit doucement, à son rythme", type: "fun", energy: "medium" },
      { text: "Manger aide à grandir mais c'est aussi génétique", type: "fun", energy: "medium" },
      { text: "Tu veux être grand ?", type: "question", energy: "medium" },
      { text: "La croissance est un processus naturel", type: "fun", energy: "medium" },
      { text: "Tu veux comprendre comment on grandit ?", type: "question", energy: "medium" },
    ],
  },
  {
    category: "peur_sociale",
    input: "j'ai peur de parler",
    emotion: "peur",
    tags: ["peur", "social"],
    responses: [
      { text: "Ça peut faire peur 😔 mais tu peux commencer doucement", type: "soutien", energy: "low" },
      { text: "Je suis là 💛", type: "soutien", energy: "low" },
      { text: "La peur de parler est normale", type: "soutien", energy: "medium" },
      { text: "Petit à petit, ça se travaille", type: "soutien", energy: "medium" },
      { text: "Tu veux essayer avec moi ?", type: "question", energy: "medium" },
      { text: "Tu veux un plan pour t'entraîner ?", type: "question", energy: "medium" },
    ],
  },
  {
    category: "jalousie_complexe",
    input: "je veux être comme lui",
    emotion: "tristesse",
    tags: ["social", "estime"],
    responses: [
      { text: "Tu es déjà super 💛 chacun est différent", type: "soutien", energy: "medium" },
      { text: "C'est normal de comparer, mais tu es unique", type: "soutien", energy: "medium" },
      { text: "Tu as tes forces et tes qualités", type: "soutien", energy: "medium" },
      { text: "Tu veux les découvrir ?", type: "question", energy: "medium" },
      { text: "Tu peux t'améliorer à ta façon", type: "soutien", energy: "medium" },
      { text: "Tu veux travailler dessus ?", type: "question", energy: "medium" },
    ],
  },
  {
    category: "existence_doute",
    input: "et si rien n'était réel",
    emotion: "curiosité",
    tags: ["philosophie", "réflexion"],
    responses: [
      { text: "Tu es bien ici 💛 avec moi", type: "soutien", energy: "low" },
      { text: "Tout va bien, tu es en sécurité", type: "soutien", energy: "low" },
      { text: "C'est une pensée étrange 😄 mais tu es bien réel", type: "fun", energy: "medium" },
      { text: "C'est une question philosophique sur la réalité", type: "fun", energy: "medium" },
      { text: "Tu es bien ici et maintenant", type: "soutien", energy: "medium" },
      { text: "Tu veux en parler ?", type: "question", energy: "medium" },
    ],
  },
];

// ─── DETRESSE Priority Keywords ─────────────────────────

const DETRESSE_KEYWORDS = [
  "mourir", "disparaître", "me faire mal", "personne m'aime",
  "je veux mourir", "je veux disparaître", "je veux me faire mal",
  "me tuer", "plus envie de vivre", "je veux plus être là",
  "je suis inutile", "personne ne m'aime",
];

function isDetresseInput(text: string): boolean {
  const lower = text.toLowerCase();
  return DETRESSE_KEYWORDS.some(kw => lower.includes(kw));
}

// ─── Multi-Response Matcher (with DETRESSE priority) ────

export function findMultiResponse(userInput: string): MultiResponseEntry | null {
  const normalized = userInput.toLowerCase().trim();
  if (!normalized || normalized.length < 2) return null;

  // 🚨 PRIORITÉ ABSOLUE: DÉTRESSE → route vers securite_critique
  if (isDetresseInput(normalized)) {
    const criticalEntries = BOBBY_MULTI_RESPONSES.filter(
      e => e.category === "securite_critique" || e.category === "securite"
    );
    // Find best match among critical entries
    let bestCritical: MultiResponseEntry | null = null;
    let bestScore = 0;
    for (const entry of criticalEntries) {
      const entryNorm = entry.input.toLowerCase().trim();
      if (normalized === entryNorm) return entry;
      const userWords = normalized.split(/\s+/).filter(w => w.length > 1);
      const entryWords = entryNorm.split(/\s+/).filter(w => w.length > 1);
      let overlap = 0;
      for (const uw of userWords) {
        for (const ew of entryWords) {
          if (uw === ew || uw.includes(ew) || ew.includes(uw)) { overlap++; break; }
        }
      }
      const score = entryWords.length > 0 ? overlap / entryWords.length : 0;
      if (score > bestScore) { bestScore = score; bestCritical = entry; }
    }
    if (bestCritical) return bestCritical;
    // Fallback: return first securite_critique entry
    if (criticalEntries.length > 0) return criticalEntries[0];
  }

  // French stop words to ignore in matching
  const STOP_WORDS = new Set([
    "je", "tu", "il", "elle", "on", "nous", "vous", "ils", "elles",
    "le", "la", "les", "un", "une", "des", "du", "de", "au", "aux",
    "et", "ou", "mais", "donc", "car", "ni", "que", "qui", "dont",
    "en", "à", "dans", "sur", "sous", "avec", "pour", "par", "sans",
    "ce", "se", "ne", "pas", "plus", "très", "bien", "trop", "aussi",
    "mon", "ma", "mes", "ton", "ta", "tes", "son", "sa", "ses",
    "suis", "est", "es", "ai", "as", "sont", "ont", "été",
    "j'ai", "j'aime", "c'est", "j'suis", "moi", "toi",
  ]);

  function contentWords(text: string): string[] {
    return text.split(/[\s'']+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
  }

  let bestMatch: MultiResponseEntry | null = null;
  let bestScore = 0;

  const userContent = contentWords(normalized);

  for (const entry of BOBBY_MULTI_RESPONSES) {
    const entryNorm = entry.input.toLowerCase().trim();
    
    // Exact match
    if (normalized === entryNorm) return entry;

    // Content word overlap scoring (ignoring stop words)
    const entryContent = contentWords(entryNorm);
    
    if (entryContent.length === 0 || userContent.length === 0) continue;

    let overlap = 0;
    for (const uw of userContent) {
      for (const ew of entryContent) {
        if (uw === ew || (uw.length > 3 && ew.length > 3 && (uw.includes(ew) || ew.includes(uw)))) {
          overlap++;
          break;
        }
      }
    }

    // Score based on content word overlap (both directions for better accuracy)
    const entryScore = entryContent.length > 0 ? overlap / entryContent.length : 0;
    const userScore = userContent.length > 0 ? overlap / userContent.length : 0;
    const score = (entryScore + userScore) / 2;

    if (score > bestScore && score >= 0.35) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  return bestMatch;
}

// ─── Proactive Relance (with Conversational Rebond) ─────

export function getProactiveRelance(childName?: string): string {
  // Try conversational rebond first (~40% of time for natural feel)
  if (Math.random() < 0.4) {
    const rebond = getConversationalRebond(childName);
    if (rebond) return rebond;
  }

  const silenceEntry = BOBBY_MULTI_RESPONSES.find(e => e.input === "__silence__");
  if (!silenceEntry) return "Tu es là ? 😊";

  // Use memory to personalize
  const topTopics = Object.entries(memory.favoriteTopics)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);

  if (topTopics.includes("jeux") || topTopics.includes("jeu")) {
    const gameRelances = [
      "Tu veux refaire un jeu ? 😄",
      "J'ai un nouveau défi pour toi !",
      "On rejoue ? 😊",
    ];
    const fresh = gameRelances.filter(r => !isRecentlyUsed(r));
    if (fresh.length > 0) return fresh[Math.floor(Math.random() * fresh.length)];
  }

  const selected = selectBestResponse(silenceEntry.responses);
  return selected?.text ?? "Tu es là ? 😊";
}
