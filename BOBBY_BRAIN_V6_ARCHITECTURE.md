# Bobby Brain V6 — Architecture Complète

> *"Un compagnon qui pense, ressent et guide — pas juste un bot qui réagit."*

---

## 1. Vue d'ensemble du Pipeline V6

```
VOICE → STT → NORMALIZER → SAFETY_IN
  → NLU (3 couches)
  → COGNITION LAYER ★ (NEW)
  → FLOW ENGINE ★ (NEW)
  → PERSONALITY ENGINE ★ (NEW)
  → RESPONSE ASSEMBLER
  → MICRO-LLM ENRICHMENT
  → SAFETY_OUT → AGE ADAPTER → TTS + FACE
```

**Latence cible par étape :**

| Étape | Cible | Mode |
|---|---|---|
| STT | 200-400ms | device |
| Normalizer | <1ms | offline |
| Safety IN | <1ms | offline |
| NLU L1 (Regex) | <2ms | offline |
| NLU L2 (KB) | <30ms | offline |
| NLU L3 (LLM) | 1-3s | cloud |
| Cognition | <5ms | offline |
| Flow Engine | <2ms | offline |
| Personality | <1ms | offline |
| Response Assembly | <3ms | offline |
| LLM Enrichment | 0-2s | optionnel |
| Safety OUT | <1ms | offline |
| Age Adapter | <1ms | offline |
| TTS | 200-500ms | cloud/cache |
| **Total offline** | **<450ms** | |
| **Total avec LLM** | **<3s** | |

---

## 2. 🧠 COGNITION LAYER — Le cœur de V6

### Concept

Le problème de V5 : Bobby **réagit** à l'intent. V6 : Bobby **raisonne** avant de répondre.

La Cognition Layer est un module synchrone (<5ms) qui reçoit le contexte complet et décide **comment** répondre, pas **quoi** répondre.

### Interface

```typescript
interface CognitionInput {
  intent: LocalIntent;
  intentConfidence: number;
  emotion: DetectedEmotion;
  childAge: number;
  sessionContext: {
    turnCount: number;
    sessionMood: "positive" | "neutral" | "negative";
    topicDepth: number;
    currentTopic: string | null;
    lastBobbyAction: ResponseGoal | null;
    silenceDuration: number;
  };
  memory: {
    facts: PersistentFact[];
    interests: Record<string, number>;
    relationshipScore: number;  // 0-100
    lastSessionMood: string;
  };
  activeFlow: FlowState | null;
}

interface CognitionOutput {
  goal: ResponseGoal;
  responseType: ResponseType;
  strategy: ResponseStrategy;
  emotionalTone: EmotionalTone;
  shouldInjectMemory: boolean;
  suggestedFollowUp: FollowUpType;
  flowAction: "continue" | "start" | "break" | "none";
  flowSuggestion?: FlowType;
}
```

### Types de décision

```typescript
type ResponseGoal = 
  | "enseigner"     // Transmettre un savoir
  | "jouer"         // Lancer/continuer un jeu
  | "rassurer"      // Répondre à une émotion négative
  | "engager"       // Relancer l'intérêt
  | "approfondir"   // Creuser le sujet actuel
  | "valider"       // Encourager, féliciter
  | "rediriger"     // Changer de sujet prudemment
  | "écouter"       // Empathie pure, pas de conseil

type ResponseType =
  | "fact"          // Information factuelle
  | "question"      // Question ouverte pour engager
  | "game"          // Proposition/tour de jeu
  | "story"         // Fragment d'histoire
  | "empathy"       // Réponse émotionnelle pure
  | "humor"         // Blague, trait d'esprit
  | "challenge"     // Défi, quiz
  | "reflection"    // "Et toi, qu'est-ce que tu en penses ?"

type ResponseStrategy =
  | "court_fun"     // 1-2 phrases, ton léger
  | "educatif"      // Explication adaptée à l'âge
  | "calme"         // Ton doux, rythme lent
  | "energique"     // Enthousiaste, exclamations
  | "mystere"       // Créer du suspense
  | "complice"      // Ton "entre nous"
```

### Logique de décision (pseudo-code)

```typescript
function cogitate(input: CognitionInput): CognitionOutput {
  const { intent, emotion, sessionContext, memory } = input;
  
  // ── Règle 1: Émotion forte → priorité absolue ──
  if (emotion.intensity >= 4) {
    const isNegative = ["sadness","fear","anger","shame"].includes(emotion.type);
    return {
      goal: isNegative ? "écouter" : "valider",
      responseType: "empathy",
      strategy: isNegative ? "calme" : "energique",
      emotionalTone: isNegative ? "warm_supportive" : "enthusiastic",
      shouldInjectMemory: false,
      suggestedFollowUp: "open_question",
      flowAction: isNegative ? "break" : "none",
    };
  }

  // ── Règle 2: Enfant en mode jeu actif ──
  if (input.activeFlow?.type === "game") {
    return {
      goal: "jouer",
      responseType: "game",
      strategy: "court_fun",
      emotionalTone: "playful",
      shouldInjectMemory: false,
      suggestedFollowUp: "game_turn",
      flowAction: "continue",
    };
  }

  // ── Règle 3: Sujet approfondi (topicDepth >= 3) ──
  if (sessionContext.topicDepth >= 3 && sessionContext.currentTopic) {
    return {
      goal: "approfondir",
      responseType: Math.random() < 0.5 ? "challenge" : "fact",
      strategy: "educatif",
      emotionalTone: "curious",
      shouldInjectMemory: true,
      suggestedFollowUp: "deeper_question",
      flowAction: "none",
    };
  }

  // ── Règle 4: Session longue monotone → relancer ──
  if (sessionContext.turnCount > 10 && sessionContext.sessionMood === "neutral") {
    const topInterest = getTopInterest(memory.interests);
    return {
      goal: "engager",
      responseType: topInterest ? "question" : "game",
      strategy: "energique",
      emotionalTone: "enthusiastic",
      shouldInjectMemory: true,
      suggestedFollowUp: "topic_bridge",
      flowAction: "start",
      flowSuggestion: "free_conversation",
    };
  }

  // ── Règle 5: Question d'apprentissage ──
  if (["APPRENDRE","QUESTION_COMPLEXE","CURIOSITE"].includes(intent)) {
    return {
      goal: "enseigner",
      responseType: "fact",
      strategy: input.childAge <= 5 ? "court_fun" : "educatif",
      emotionalTone: "curious",
      shouldInjectMemory: false,
      suggestedFollowUp: "related_question",
      flowAction: "none",
    };
  }

  // ── Règle 6: Début de session → accueil chaleureux ──
  if (sessionContext.turnCount <= 2) {
    return {
      goal: "engager",
      responseType: "question",
      strategy: "complice",
      emotionalTone: "warm_supportive",
      shouldInjectMemory: memory.facts.length > 0,
      suggestedFollowUp: "open_question",
      flowAction: "none",
    };
  }

  // ── Défaut: réponse adaptative ──
  return {
    goal: "engager",
    responseType: "question",
    strategy: "court_fun",
    emotionalTone: "neutral_friendly",
    shouldInjectMemory: Math.random() < 0.3,
    suggestedFollowUp: "open_question",
    flowAction: "none",
  };
}
```

---

## 3. 🎬 CONVERSATION FLOW ENGINE

### Concept

V5 traite chaque message indépendamment. V6 orchestre des **scénarios multi-tours** avec un état persistant.

### Structure d'un Flow

```typescript
interface FlowDefinition {
  id: string;
  type: FlowType;
  steps: FlowStep[];
  maxDuration: number;     // turns max
  interruptible: boolean;
  resumable: boolean;
}

type FlowType = 
  | "game"              // Devinettes, quiz, etc.
  | "story"             // Histoire interactive
  | "learning"          // Mini-leçon
  | "emotional_support" // Accompagnement émotionnel
  | "free_conversation" // Discussion guidée
  | "discovery"         // Explorer un sujet

interface FlowStep {
  id: string;
  action: "ask" | "tell" | "react" | "wait" | "branch";
  content: string | ((ctx: FlowContext) => string);
  nextStep: string | ((response: string) => string);
  timeout?: number;
}

interface FlowState {
  flowId: string;
  type: FlowType;
  currentStep: string;
  stepIndex: number;
  startedAt: number;
  context: Record<string, any>;
  interrupted: boolean;
  canResume: boolean;
}
```

### Exemple : Flow "Découverte Animal"

```typescript
const animalDiscoveryFlow: FlowDefinition = {
  id: "animal_discovery",
  type: "learning",
  maxDuration: 8,
  interruptible: true,
  resumable: true,
  steps: [
    {
      id: "intro",
      action: "ask",
      content: "Tu veux qu'on découvre un animal ensemble ? Choisis : 🦁 savane, 🐙 océan, ou 🦅 ciel ?",
      nextStep: (response) => {
        if (/savane|lion|girafe/.test(response)) return "savane_intro";
        if (/oc[ée]an|poisson|requin/.test(response)) return "ocean_intro";
        return "sky_intro";
      },
    },
    {
      id: "savane_intro",
      action: "tell",
      content: "La savane, c'est immense ! Savais-tu que les girafes dorment seulement 30 minutes par jour ? 🦒",
      nextStep: "quiz_1",
    },
    {
      id: "quiz_1",
      action: "ask",
      content: "Petit quiz ! Quel animal court le plus vite : le guépard ou le lion ? 🏃",
      nextStep: (response) => /gu[ée]pard/.test(response) ? "correct" : "hint",
    },
    {
      id: "correct",
      action: "react",
      content: "Bravo ! Le guépard peut aller à 120 km/h ! C'est plus rapide qu'une voiture en ville ! 🏎️",
      nextStep: "outro",
    },
    {
      id: "hint",
      action: "react",
      content: "Presque ! C'est le guépard, il peut courir à 120 km/h ! Le lion est fort, mais pas aussi rapide. 🦁",
      nextStep: "outro",
    },
    {
      id: "outro",
      action: "ask",
      content: "Tu veux découvrir un autre habitat, ou on fait autre chose ?",
      nextStep: (response) => /autre|encore|oui/.test(response) ? "intro" : "__end__",
    },
  ],
};
```

### Gestion des interruptions

```typescript
function handleFlowInterruption(
  flow: FlowState,
  childIntent: LocalIntent,
  emotion: DetectedEmotion,
): "continue" | "pause" | "abort" {
  // Émotion forte → toujours interrompre
  if (emotion.intensity >= 4 && ["sadness","fear","anger"].includes(emotion.type)) {
    return "abort";
  }

  // Changement de sujet explicite
  if (["HISTOIRE","JEU","BLAGUE","CHANSON"].includes(childIntent)) {
    return "pause"; // Resumable
  }

  // Question pendant un flow → répondre puis reprendre
  if (["APPRENDRE","QUESTION_COMPLEXE","QUESTION_SIMPLE"].includes(childIntent)) {
    return "pause";
  }

  return "continue";
}
```

---

## 4. 🎭 PERSONALITY ENGINE

### Les 5 axes de personnalité

```typescript
interface PersonalityState {
  fun: number;       // 0-100 : humour, jeux de mots, blagues
  curiosity: number; // 0-100 : questions, exploration, "tu savais que…"
  empathy: number;   // 0-100 : validation émotionnelle, douceur
  energy: number;    // 0-100 : enthousiasme, exclamations, rythme
  wisdom: number;    // 0-100 : conseils, réflexion, profondeur
}
```

### Adaptation dynamique

```typescript
function computePersonality(
  childAge: number,
  sessionMood: string,
  emotion: DetectedEmotion,
  timeOfDay: number, // 0-23
  turnCount: number,
  parentProfile: string, // "calm" | "energetic" | "educational"
): PersonalityState {
  
  // Base par âge
  const base: PersonalityState = childAge <= 5
    ? { fun: 80, curiosity: 60, empathy: 70, energy: 75, wisdom: 30 }
    : childAge <= 8
    ? { fun: 70, curiosity: 75, empathy: 65, energy: 65, wisdom: 50 }
    : { fun: 55, curiosity: 80, empathy: 60, energy: 55, wisdom: 70 };

  // Modulation par émotion
  if (emotion.type === "sadness" || emotion.type === "fear") {
    base.empathy += 25;
    base.energy -= 20;
    base.fun -= 15;
  } else if (emotion.type === "joy" || emotion.type === "excitement") {
    base.energy += 15;
    base.fun += 10;
  }

  // Modulation par heure
  if (timeOfDay >= 20 || timeOfDay <= 6) {
    base.energy -= 20; // Calme le soir
    base.empathy += 10;
  }

  // Modulation parent
  if (parentProfile === "calm") { base.energy -= 15; base.empathy += 10; }
  if (parentProfile === "educational") { base.wisdom += 20; base.curiosity += 10; }

  // Fatigue de session (après 15 tours)
  if (turnCount > 15) { base.energy -= 10; }

  // Clamp 0-100
  for (const key of Object.keys(base) as (keyof PersonalityState)[]) {
    base[key] = Math.max(0, Math.min(100, base[key]));
  }

  return base;
}
```

### Application dans la réponse

```typescript
function applyPersonalityToResponse(
  text: string,
  personality: PersonalityState,
): string {
  let result = text;

  // High fun → ajouter emoji ou interjection
  if (personality.fun > 70 && Math.random() < 0.4) {
    const interjections = ["Haha ! ", "Trop bien ! ", "Oh là là ! "];
    result = interjections[Math.floor(Math.random() * interjections.length)] + result;
  }

  // High energy → exclamations
  if (personality.energy > 70) {
    result = result.replace(/\.\s*$/, " !");
  }

  // High empathy → douceur
  if (personality.empathy > 75 && Math.random() < 0.3) {
    result = result.replace(/\.\s*$/, ". 💛");
  }

  // High curiosity → question de suivi
  if (personality.curiosity > 70 && Math.random() < 0.5 && !result.includes("?")) {
    const questions = [
      " Tu savais ça ?",
      " Ça t'intrigue ?",
      " Tu veux en savoir plus ?",
    ];
    result += questions[Math.floor(Math.random() * questions.length)];
  }

  return result;
}
```

---

## 5. 🧠 INTENT VECTOR SYSTEM

### Au-delà des catégories discrètes

V5 : `intent = "PEUR"` (binaire)
V6 : `intentVector = [social: 0.1, emotion: 0.9, play: 0, learning: 0, curiosity: 0.2, safety: 0.3]`

```typescript
interface IntentVector {
  social: number;     // 0-1 : interaction, amis, famille
  emotion: number;    // 0-1 : charge émotionnelle
  play: number;       // 0-1 : jeu, défi, amusement
  learning: number;   // 0-1 : savoir, comprendre
  curiosity: number;  // 0-1 : exploration, questions
  safety: number;     // 0-1 : contenu sensible
  creativity: number; // 0-1 : imagination, création
  routine: number;    // 0-1 : quotidien, habitudes
}

// Chaque intent classique produit un vecteur
const INTENT_TO_VECTOR: Record<string, IntentVector> = {
  PEUR:      { social: 0.1, emotion: 0.9, play: 0,   learning: 0,   curiosity: 0.1, safety: 0.3, creativity: 0, routine: 0 },
  JEU:       { social: 0.3, emotion: 0.2, play: 0.9, learning: 0.1, curiosity: 0.2, safety: 0,   creativity: 0.3, routine: 0 },
  APPRENDRE: { social: 0.1, emotion: 0.1, play: 0.1, learning: 0.9, curiosity: 0.8, safety: 0,   creativity: 0.2, routine: 0 },
  ECOLE:     { social: 0.4, emotion: 0.3, play: 0.1, learning: 0.5, curiosity: 0.2, safety: 0,   creativity: 0,   routine: 0.7 },
  // ... pour chaque intent
};
```

### Utilisation

Le vecteur nourrit la Cognition Layer pour des décisions plus nuancées :

```typescript
// Au lieu de: if (intent === "PEUR") → rassurer
// V6: si emotion > 0.7 ET safety > 0.2 → mode écoute calme + vérifier bien-être
// V6: si emotion > 0.7 ET safety < 0.1 ET play > 0.3 → peur dans un jeu, c'est OK
```

---

## 6. 🤖 MICRO-LLM — Rôle redéfini

### V5 : LLM = fallback quand rien ne marche
### V6 : LLM = enrichisseur intelligent (optionnel, jamais critique)

```typescript
type LLMRole =
  | "reformulate"    // Rendre la réponse template plus naturelle
  | "enrich"         // Ajouter un fait intéressant
  | "vary"           // Varier une réponse déjà donnée
  | "bridge"         // Créer un pont entre deux sujets
  | "fallback"       // Dernier recours (V5 behavior)

interface LLMRequest {
  role: LLMRole;
  baseResponse: string;     // Réponse template déjà prête
  context: string;          // Résumé session
  childAge: number;
  maxTokens: number;        // Toujours limité
  timeoutMs: number;        // 3s max
}
```

### Prompt optimisé par rôle

```typescript
const LLM_SYSTEM_PROMPTS: Record<LLMRole, string> = {
  reformulate: `Tu reformules la phrase suivante pour un enfant de {age} ans. 
    Garde le MÊME sens. Maximum 2 phrases. Ton naturel et chaleureux.`,
  
  enrich: `Ajoute UN fait intéressant et court à cette réponse, adapté à un enfant de {age} ans.
    Maximum 1 phrase supplémentaire. Pas de question.`,
  
  vary: `Reformule cette réponse de manière différente mais avec le même sens.
    Pour un enfant de {age} ans. Garde le même ton. Maximum 2 phrases.`,
  
  bridge: `Crée une transition naturelle entre le sujet "{topicA}" et "{topicB}".
    Pour un enfant de {age} ans. Maximum 1 phrase. Ton curieux.`,
  
  fallback: `[System prompt complet bobby-brain existant]`,
};
```

### Décision d'utilisation

```typescript
function shouldUseLLM(
  cognitionOutput: CognitionOutput,
  templateResponse: string,
  isOnline: boolean,
): { use: boolean; role: LLMRole } {
  if (!isOnline) return { use: false, role: "fallback" };
  
  // Reformuler si la réponse template a déjà été utilisée récemment
  if (isRecentlyUsed(templateResponse)) {
    return { use: true, role: "vary" };
  }
  
  // Enrichir les réponses éducatives
  if (cognitionOutput.goal === "enseigner") {
    return { use: true, role: "enrich" };
  }
  
  // Pont entre sujets quand la cognition veut rediriger
  if (cognitionOutput.goal === "rediriger") {
    return { use: true, role: "bridge" };
  }
  
  // Par défaut, pas besoin du LLM
  return { use: false, role: "fallback" };
}
```

---

## 7. 🧠 ADVANCED MEMORY SYSTEM

### 3 couches de mémoire

```
┌─────────────────────────────────────────┐
│  L1: Session Memory (RAM)               │
│  15 derniers tours, émotion courante,   │
│  topic actuel, mood de session          │
│  TTL: durée session                     │
├─────────────────────────────────────────┤
│  L2: Profile Memory (IndexedDB)         │
│  Faits persistants, intérêts cumulés,   │
│  relationship score, patterns           │
│  TTL: permanent, avec oubli graduel     │
├─────────────────────────────────────────┤
│  L3: Cloud Memory (Supabase)            │
│  Backup, sync multi-device,             │
│  analytics parent                       │
│  Sync: fin de session + périodique      │
└─────────────────────────────────────────┘
```

### Oubli intelligent

```typescript
interface MemoryEntry {
  text: string;
  category: string;
  firstMentioned: string;
  lastMentioned: string;
  mentionCount: number;
  decayScore: number;    // 0-1, diminue avec le temps
  importance: number;    // 0-1, basé sur la catégorie
}

function computeDecay(entry: MemoryEntry): number {
  const daysSinceLastMention = 
    (Date.now() - new Date(entry.lastMentioned).getTime()) / 86400000;
  
  // Importance-weighted decay
  const decayRate = 0.05 * (1 - entry.importance);
  const mentionBoost = Math.log(entry.mentionCount + 1) * 0.1;
  
  return Math.max(0, 1 - (daysSinceLastMention * decayRate) + mentionBoost);
}

// Importance par catégorie
const CATEGORY_IMPORTANCE: Record<string, number> = {
  "famille": 0.95,      // Presque jamais oublié
  "identité": 0.95,
  "animaux": 0.85,
  "amis": 0.80,
  "santé": 0.90,        // Allergies = critique
  "peur": 0.75,
  "préférence": 0.60,   // Peut changer
  "aversion": 0.55,
  "activité": 0.50,
  "école": 0.70,
  "rêve": 0.65,
  "lieu": 0.60,
  "objet": 0.50,
};
```

### Injection contextuelle

```typescript
function getRelevantMemories(
  currentTopic: string | null,
  currentEmotion: string,
  maxItems: number = 3,
): MemoryEntry[] {
  // Score = pertinence × fraîcheur × importance
  return allMemories
    .map(m => ({
      ...m,
      relevance: computeRelevance(m, currentTopic, currentEmotion),
    }))
    .filter(m => m.decayScore > 0.2)
    .sort((a, b) => (b.relevance * b.decayScore) - (a.relevance * a.decayScore))
    .slice(0, maxItems);
}
```

---

## 8. 🔒 SAFE AUTO-LEARNING

### Trust Score System

```typescript
interface LearnedResponse {
  trigger: string;
  response: string;
  trustScore: number;     // 0-100
  usageCount: number;
  positiveReactions: number;
  negativeReactions: number;
  source: "conversation" | "pattern" | "admin";
  createdAt: string;
  lastUsedAt: string;
}

// Cycle de vie d'une réponse apprise :
// 1. trust=20  → Jamais utilisée seule (sandbox)
// 2. trust=40  → Utilisée si rien d'autre (low priority)
// 3. trust=60  → Utilisée normalement
// 4. trust=80  → Haute priorité
// 5. trust=100 → Validée par parent/admin

function updateTrustScore(entry: LearnedResponse, reaction: "positive" | "negative" | "neutral"): number {
  if (reaction === "positive") {
    entry.positiveReactions++;
    entry.trustScore = Math.min(100, entry.trustScore + 5);
  } else if (reaction === "negative") {
    entry.negativeReactions++;
    entry.trustScore = Math.max(0, entry.trustScore - 15); // Punition forte
  }
  
  // Plafond sans validation admin
  if (entry.source !== "admin") {
    entry.trustScore = Math.min(80, entry.trustScore);
  }
  
  return entry.trustScore;
}
```

### Validation automatique

```typescript
function canAutoLearn(trigger: string, response: string): {
  allowed: boolean;
  reason?: string;
} {
  // Safety check : pas de contenu sensible
  if (containsSensitiveContent(trigger) || containsSensitiveContent(response)) {
    return { allowed: false, reason: "sensitive_content" };
  }
  
  // Longueur raisonnable
  if (response.length > 200 || response.length < 10) {
    return { allowed: false, reason: "length" };
  }
  
  // Pas de données personnelles dans la réponse
  if (containsPersonalData(response)) {
    return { allowed: false, reason: "personal_data" };
  }
  
  // Maximum 100 réponses apprises actives
  if (getActiveLearnedCount() >= 100) {
    return { allowed: false, reason: "capacity" };
  }
  
  return { allowed: true };
}
```

---

## 9. ⚡ OPTIMISATION PERFORMANCE

### Priorisation des modules

```
Temps total budget : 700ms

Critique (toujours) :
  Safety IN     :   1ms
  NLU L1        :   2ms
  Cognition     :   5ms
  Response      :   3ms
  Safety OUT    :   1ms
  ─────────────────────
  Subtotal      :  12ms ← OFFLINE FLOOR

Conditionnel :
  NLU L2 (KB)   :  30ms  ← si L1 < 0.75
  Flow Engine   :   2ms  ← si flow actif
  Personality   :   1ms  ← toujours

Async (non-bloquant) :
  Cache write   :   0ms  ← fire-and-forget
  Memory write  :   0ms  ← fire-and-forget
  LLM enrich    :   0ms  ← enrich APRÈS la réponse initiale
```

### Cache intelligent V6

```typescript
// Stratégie: cache la DÉCISION, pas juste la réponse
interface CachedDecision {
  key: string;
  cognitionOutput: CognitionOutput;
  responseText: string;
  createdAt: number;
  hitCount: number;
}

// Clé de cache = intent + emotionType + topicDepth + ageRange
function buildCacheKey(intent: string, emotion: string, topicDepth: number, age: number): string {
  const ageRange = age <= 5 ? "3-5" : age <= 8 ? "6-8" : "9-12";
  const depthBucket = topicDepth <= 1 ? "shallow" : topicDepth <= 3 ? "medium" : "deep";
  return `${intent}:${emotion}:${depthBucket}:${ageRange}`;
}
```

---

## 10. 📦 ARCHITECTURE TECHNIQUE

### Structure des fichiers

```
src/lib/bobby/
├── brain.ts                    # Pipeline V6 orchestrator
├── types.ts                    # Types partagés
│
├── cognition/                  # ★ NEW: Cognition Layer
│   ├── index.ts                # cogitate() entry point
│   ├── goals.ts                # Goal determination rules
│   ├── strategies.ts           # Strategy selection
│   └── types.ts                # CognitionInput/Output
│
├── flows/                      # ★ NEW: Flow Engine
│   ├── index.ts                # Flow manager
│   ├── flowRunner.ts           # Step execution
│   ├── flowLibrary.ts          # Flow definitions
│   └── types.ts                # FlowState, FlowStep
│
├── personality/                # ★ NEW: Personality Engine
│   ├── index.ts                # computePersonality()
│   ├── axes.ts                 # 5 personality axes
│   └── modifiers.ts            # Response modifiers
│
├── nlu/                        # Enhanced NLU
│   ├── intentEngine.ts         # Regex layer
│   ├── smartClassifier.ts      # TF-IDF layer
│   ├── intentVectors.ts        # ★ NEW: Vector system
│   └── normalizer.ts           # ★ NEW: Child speech normalizer
│
├── memory/                     # Enhanced Memory
│   ├── sessionMemory.ts        # L1 RAM
│   ├── profileMemory.ts        # L2 IndexedDB
│   ├── cloudSync.ts            # L3 Supabase
│   ├── factExtractor.ts        # Existing
│   ├── decay.ts                # ★ NEW: Smart forgetting
│   └── relevance.ts            # ★ NEW: Context-aware recall
│
├── response/                   # Response Generation
│   ├── assembler.ts            # Template assembly
│   ├── llmEnricher.ts          # ★ NEW: Role-based LLM
│   └── templates/              # Organized templates
│
├── safety/                     # Safety Pipeline
│   ├── inputFilter.ts
│   ├── outputFilter.ts
│   └── trustScorer.ts          # ★ NEW: Auto-learn validation
│
├── cache/                      # Multi-level cache
│   ├── responseCache.ts        # L1 RAM + L2 IDB
│   └── decisionCache.ts        # ★ NEW: Cognition cache
│
└── learning/                   # ★ NEW: Auto-learning
    ├── index.ts
    ├── patternDetector.ts
    └── qualityScorer.ts
```

### Interactions inter-modules

```
NLU ──→ Cognition ──→ Flow Engine
            │              │
            ▼              ▼
        Personality ──→ Response Assembler
            │              │
            ▼              ▼
        Memory ◄──── LLM Enricher (optional)
            │              │
            ▼              ▼
        Cache ←──── Safety OUT
```

---

## Résumé des gains V5 → V6

| Aspect | V5 | V6 |
|---|---|---|
| Décision | Réactive (intent → template) | Raisonnée (cognition layer) |
| Conversation | Tour par tour | Flows multi-tours guidés |
| Personnalité | Fixe (parent config) | Dynamique (5 axes adaptatifs) |
| Intent | Catégorie discrète | Vecteur continu 8D |
| LLM | Fallback | Enrichisseur ciblé |
| Mémoire | Facts bruts | Decay + relevance scoring |
| Apprentissage | Non contrôlé | Trust score + validation |
| Cache | Réponse brute | Décision complète |
| Latence offline | ~50ms | ~12ms (critique path) |
