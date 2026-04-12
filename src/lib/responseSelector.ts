/**
 * Bobby AI — Smart Response Selector v1.0
 * Anti-repetition + behavioral memory + energy-based selection
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
  favoriteTopics: Record<string, number>;   // topic → interaction count
  preferredTypes: Record<string, number>;    // response type → engagement count
  emotionalState: string;
  engagementLevel: number;                   // 0-100
}

// ─── Singleton Memory ───────────────────────────────────
const memory: BehavioralMemory = {
  lastInputs: [],
  lastResponseTexts: [],
  favoriteTopics: {},
  preferredTypes: {},
  emotionalState: "neutral",
  engagementLevel: 50,
};

const MAX_HISTORY = 15;

// ─── Public API ─────────────────────────────────────────

export function getMemory(): Readonly<BehavioralMemory> {
  return memory;
}

export function resetMemory(): void {
  memory.lastInputs = [];
  memory.lastResponseTexts = [];
  memory.favoriteTopics = {};
  memory.preferredTypes = {};
  memory.emotionalState = "neutral";
  memory.engagementLevel = 50;
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
  }
  if (type) {
    memory.preferredTypes[type] = (memory.preferredTypes[type] || 0) + 1;
  }
}

/** Update engagement level based on child behavior */
export function updateEngagement(delta: number): void {
  memory.engagementLevel = Math.max(0, Math.min(100, memory.engagementLevel + delta));
}

export function setEmotionalState(emotion: string): void {
  memory.emotionalState = emotion;
}

// ─── Anti-Repetition Check ──────────────────────────────

function isRecentlyUsed(text: string): boolean {
  const normalized = text.toLowerCase().trim();
  return memory.lastResponseTexts.some(r => {
    const rNorm = r.toLowerCase().trim();
    // Exact match or very similar (>85% overlap)
    if (rNorm === normalized) return true;
    // Check significant word overlap
    const words1 = new Set(normalized.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(rNorm.split(/\s+/).filter(w => w.length > 2));
    if (words1.size === 0 || words2.size === 0) return false;
    let overlap = 0;
    for (const w of words1) if (words2.has(w)) overlap++;
    return overlap / Math.max(words1.size, words2.size) > 0.85;
  });
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
  const pool = fresh.length > 0 ? fresh : responses; // fallback to all if everything used

  if (pool.length === 1) return pool[0];

  // Score each response
  const targetEnergy = getTargetEnergy();
  const preferredType = getPreferredType();

  const scored = pool.map(r => {
    let score = Math.random() * 0.3; // random base for variety

    // Energy match bonus
    if (r.energy === targetEnergy) score += 0.4;
    else if (
      (r.energy === "medium") ||
      (targetEnergy === "medium")
    ) score += 0.2;

    // Type preference bonus
    if (preferredType && r.type === preferredType) score += 0.2;

    // Emotion-appropriate type bonus
    if (memory.emotionalState === "sad" || memory.emotionalState === "scared") {
      if (r.type === "soutien") score += 0.3;
    }
    if (memory.emotionalState === "happy" || memory.emotionalState === "excited") {
      if (r.type === "jeu" || r.type === "fun") score += 0.2;
    }
    if (memory.emotionalState === "bored") {
      if (r.type === "jeu" || r.type === "proposition") score += 0.3;
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
];

// ─── Multi-Response Matcher ─────────────────────────────

export function findMultiResponse(userInput: string): MultiResponseEntry | null {
  const normalized = userInput.toLowerCase().trim();
  if (!normalized || normalized.length < 2) return null;

  let bestMatch: MultiResponseEntry | null = null;
  let bestScore = 0;

  for (const entry of BOBBY_MULTI_RESPONSES) {
    const entryNorm = entry.input.toLowerCase().trim();
    
    // Exact match
    if (normalized === entryNorm) return entry;

    // Word overlap scoring
    const userWords = normalized.split(/\s+/).filter(w => w.length > 1);
    const entryWords = entryNorm.split(/\s+/).filter(w => w.length > 1);
    
    let overlap = 0;
    for (const uw of userWords) {
      for (const ew of entryWords) {
        if (uw === ew || uw.includes(ew) || ew.includes(uw)) {
          overlap++;
          break;
        }
      }
    }

    const score = entryWords.length > 0 ? overlap / entryWords.length : 0;
    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  return bestMatch;
}

// ─── Proactive Relance ──────────────────────────────────

export function getProactiveRelance(): string {
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
