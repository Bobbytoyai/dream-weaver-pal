# 🧠 BOBBY BRAIN V7 — Architecture Cognitive Agent

**Version**: 7.0 · **Date**: 2026-04-14  
**Mission**: Transformer Bobby d'un assistant conversationnel en un **compagnon cognitif** — un agent qui comprend, raisonne, ressent et accompagne.

---

## 📐 VUE D'ENSEMBLE — PIPELINE V7

```
VOICE INPUT
  │
  ▼
┌──────────────────────────────────────────────────────────┐
│  STAGE 0 — CAPTURE & NORMALIZATION           (<10ms)     │
│  STT → Normalizer (225 rules) → Clean text               │
└──────────────┬───────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│  STAGE 1 — DEEP UNDERSTANDING                (<15ms)     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Intent NLU  │  │ Emotion Det. │  │ Deep Goal      │  │
│  │ (explicit)  │  │ (6 dims)     │  │ Extractor 🔥   │  │
│  └─────┬───────┘  └──────┬───────┘  └───────┬────────┘  │
│        └────────┬────────┘                   │           │
│                 ▼                             │           │
│        ┌───────────────┐                     │           │
│        │ Implicit Need │◄────────────────────┘           │
│        │ Analyzer 🔥   │                                 │
│        └───────┬───────┘                                 │
└────────────────┼────────────────────────────────────────┘
                 │  UnderstandingFrame
                 ▼
┌──────────────────────────────────────────────────────────┐
│  STAGE 2 — PRIORITY & ATTENTION              (<5ms)      │
│  ┌───────────────────────────────────────────────────┐   │
│  │ Priority Scorer 🔥                                │   │
│  │  safety(0-10) · emotion(0-10) · urgency(0-10)     │   │
│  │  context(0-10) · history(0-10) → weighted total    │   │
│  └───────────────────────────────┬───────────────────┘   │
│                                  │  PriorityDecision     │
└──────────────────────────────────┼──────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────┐
│  STAGE 3 — COGNITION ENGINE                  (<10ms)     │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │
│  │ WHY reply  │  │ HOW reply  │  │ Strategy Selector  │ │
│  │ (Goal)     │→ │ (Type)     │→ │ (Tone+Length+Style)│ │
│  └────────────┘  └────────────┘  └────────────────────┘ │
└──────────────────────────┬──────────────────────────────┘
                           │  CognitionPlan
                           ▼
┌──────────────────────────────────────────────────────────┐
│  STAGE 4 — CONVERSATION ORCHESTRATOR 🔥      (<5ms)      │
│  Flow Engine + Scene Manager + Transition Logic          │
│  Multi-turn tracking · Interruption recovery             │
└──────────────────────────┬──────────────────────────────┘
                           │  OrchestrationDirective
                           ▼
┌──────────────────────────────────────────────────────────┐
│  STAGE 5 — RESPONSE ASSEMBLY                 (<50ms)     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │
│  │ KB Match │  │ Template │  │ Memory Injection     │   │
│  └────┬─────┘  └────┬─────┘  └──────────┬───────────┘   │
│       └──────┬───────┘                   │               │
│              ▼                           │               │
│       ┌──────────────┐                   │               │
│       │ Base Response │◄─────────────────┘               │
│       └──────┬───────┘                                   │
└──────────────┼──────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│  STAGE 6 — PERSONALITY & AUGMENTATION        (<20ms)     │
│  Personality Engine V2 → Micro-LLM Enrichment           │
│  (tone adaptation, humanization, variation)              │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│  STAGE 7 — SAFETY & FEEDBACK LOOP           (<5ms)       │
│  Safety Filter → Understanding Loop 🔥                   │
│  (implicit confirm, error correction, adaptation)        │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
                      TTS OUTPUT
                  (Total: <350ms local, <700ms cloud)
```

---

## 1. 🧠 DEEP INTENT & GOAL UNDERSTANDING

### 1.1 Architecture — `UnderstandingFrame`

Le module V6 détecte un intent unique (PEUR, JOIE, etc.). V7 introduit un **frame de compréhension multi-niveaux** qui capture **tout ce qui se passe** dans la phrase de l'enfant.

```typescript
// src/lib/bobby/v7/deepUnderstanding.ts

interface UnderstandingFrame {
  // Niveau 1 — Explicite (V6, conservé)
  explicitIntent: string;           // "PEUR", "QUESTION", etc.
  intentConfidence: number;         // 0.0 - 1.0
  
  // Niveau 2 — Implicite (NOUVEAU V7)
  implicitIntent: ImplicitIntent;   // Ce que l'enfant veut VRAIMENT
  implicitConfidence: number;
  
  // Niveau 3 — Besoin émotionnel (NOUVEAU V7)
  emotionalNeed: EmotionalNeed;     // Besoin psychologique sous-jacent
  needIntensity: number;            // 1-5
  
  // Niveau 4 — Objectif utilisateur (NOUVEAU V7)
  userGoal: UserGoal;               // Ce que l'enfant essaie d'accomplir
  
  // Méta
  ambiguityScore: number;           // 0 = clair, 1 = très ambigu
  requiresConfirmation: boolean;    // Faut-il vérifier qu'on a compris ?
  alternativeIntents: string[];     // Autres intentions possibles
}

type ImplicitIntent =
  | "seek_comfort"       // Cherche du réconfort (même si dit "je suis fatigué")
  | "seek_attention"     // Veut qu'on s'occupe de lui
  | "seek_validation"    // Veut être approuvé
  | "seek_knowledge"     // Veut comprendre le monde
  | "seek_fun"           // Veut s'amuser
  | "seek_connection"    // Veut créer du lien
  | "seek_autonomy"      // Veut prouver qu'il est grand
  | "express_frustration"// Décharge émotionnelle
  | "test_limits"        // Teste Bobby (gros mots, provocations)
  | "share_experience"   // Partage simplement sa journée
  | "process_emotion";   // Essaie de comprendre ce qu'il ressent

type EmotionalNeed =
  | "security"           // Besoin de se sentir en sécurité
  | "belonging"          // Besoin d'appartenance
  | "competence"         // Besoin de se sentir capable
  | "autonomy"           // Besoin d'indépendance
  | "stimulation"        // Besoin d'être stimulé
  | "recognition"        // Besoin d'être reconnu
  | "calm"               // Besoin de calme
  | "expression";        // Besoin d'exprimer

type UserGoal =
  | "be_reassured"       // Être rassuré
  | "learn_something"    // Apprendre quelque chose
  | "have_fun"           // S'amuser
  | "be_heard"           // Être écouté
  | "solve_problem"      // Résoudre un problème
  | "pass_time"          // Passer le temps
  | "get_help"           // Obtenir de l'aide concrète
  | "share_joy"          // Partager sa joie
  | "explore_topic"      // Explorer un sujet
  | "wind_down";         // Se calmer / se préparer au dodo
```

### 1.2 Logique d'Extraction Multi-Niveaux

```typescript
/**
 * extractDeepUnderstanding — Transforme une phrase + contexte
 * en frame de compréhension multi-niveaux.
 * 
 * Exécution : <15ms (100% local, regex + scoring)
 */
function extractDeepUnderstanding(
  text: string,
  emotion: DetectedEmotion,
  sessionContext: SessionContext,
  childProfile: ChildProfile,
): UnderstandingFrame {
  
  // ── NIVEAU 1: Intent explicite (V6 réutilisé) ──
  const explicit = detectLocalIntent(text);
  
  // ── NIVEAU 2: Intent implicite ──
  // Combinaison de l'intent + émotion + contexte pour déduire
  // ce que l'enfant veut VRAIMENT
  const implicit = deduceImplicitIntent(explicit, emotion, sessionContext);
  
  // ── NIVEAU 3: Besoin émotionnel ──
  // Mapping psychologique basé sur la pyramide de Maslow adaptée enfant
  const need = mapToEmotionalNeed(implicit, emotion, childProfile);
  
  // ── NIVEAU 4: Objectif utilisateur ──
  const goal = inferUserGoal(explicit, implicit, need, sessionContext);
  
  // ── AMBIGUITÉ ──
  const ambiguity = computeAmbiguity(explicit, implicit, text);
  
  return {
    explicitIntent: explicit.intent,
    intentConfidence: explicit.confidence,
    implicitIntent: implicit.type,
    implicitConfidence: implicit.confidence,
    emotionalNeed: need.type,
    needIntensity: need.intensity,
    userGoal: goal,
    ambiguityScore: ambiguity.score,
    requiresConfirmation: ambiguity.score > 0.6,
    alternativeIntents: ambiguity.alternatives,
  };
}
```

### 1.3 Règles de Déduction Implicite

```typescript
// Table de déduction : (intent, émotion) → besoin implicite
const IMPLICIT_DEDUCTION_RULES: Array<{
  match: { intents?: string[]; emotions?: EmotionType[]; patterns?: RegExp[] };
  result: { implicit: ImplicitIntent; need: EmotionalNeed; goal: UserGoal };
  priority: number;
}> = [
  // "J'ai peur" → veut être rassuré (pas juste détecté)
  {
    match: { intents: ["PEUR", "ANXIETE"], emotions: ["fear"] },
    result: { implicit: "seek_comfort", need: "security", goal: "be_reassured" },
    priority: 10,
  },
  // "Regarde ce que j'ai fait !" → veut être validé
  {
    match: { intents: ["FIERTE", "CREATION"], emotions: ["pride", "excitement"] },
    result: { implicit: "seek_validation", need: "recognition", goal: "share_joy" },
    priority: 9,
  },
  // "Pourquoi le ciel est bleu ?" → veut comprendre
  {
    match: { intents: ["QUESTION_SIMPLE", "QUESTION_COMPLEXE", "CURIOSITE"] },
    result: { implicit: "seek_knowledge", need: "stimulation", goal: "learn_something" },
    priority: 8,
  },
  // "Je suis tout seul" → besoin d'appartenance
  {
    match: { intents: ["SOLITUDE", "ABANDON"], emotions: ["sadness"] },
    result: { implicit: "seek_connection", need: "belonging", goal: "be_heard" },
    priority: 10,
  },
  // "T'es nul / gros mot" → test de limites (enfant 5-8 ans)
  {
    match: { intents: ["INSULTE_BOBBY", "PROVOCATION"], patterns: [/\b(nul|méchant|bête|idiot)\b/i] },
    result: { implicit: "test_limits", need: "autonomy", goal: "be_heard" },
    priority: 7,
  },
  // "J'ai eu une bonne note" → partage d'expérience positive
  {
    match: { intents: ["ECOLE", "FIERTE"], emotions: ["joy", "pride"] },
    result: { implicit: "share_experience", need: "recognition", goal: "share_joy" },
    priority: 8,
  },
  // "Je veux dormir" → besoin de calme
  {
    match: { intents: ["DODO", "FATIGUE"] },
    result: { implicit: "seek_comfort", need: "calm", goal: "wind_down" },
    priority: 9,
  },
  // "On joue ?" → besoin de stimulation
  {
    match: { intents: ["JEU", "DEVINETTE", "AVENTURE", "BLAGUE"] },
    result: { implicit: "seek_fun", need: "stimulation", goal: "have_fun" },
    priority: 7,
  },
  // "Maman elle a crié" → besoin d'expression + sécurité
  {
    match: { intents: ["CONFLIT_FAMILLE"], emotions: ["fear", "sadness", "anger"] },
    result: { implicit: "process_emotion", need: "security", goal: "be_heard" },
    priority: 10,
  },
  // "Je sais pas quoi faire" → ennui mais aussi besoin d'attention
  {
    match: { intents: ["ENNUI"], emotions: ["neutral", "boredom"] },
    result: { implicit: "seek_attention", need: "stimulation", goal: "pass_time" },
    priority: 6,
  },
];
```

### 1.4 Gestion de l'Ambiguïté

```typescript
function computeAmbiguity(
  explicit: IntentResult,
  implicit: ImplicitResult,
  text: string,
): { score: number; alternatives: string[] } {
  let score = 0;
  const alternatives: string[] = [];
  
  // Faible confiance de l'intent → ambigu
  if (explicit.confidence < 0.5) score += 0.3;
  
  // Phrases très courtes (1-2 mots) → souvent ambiguës
  const wordCount = text.split(/\s+/).length;
  if (wordCount <= 2) score += 0.2;
  
  // Désaccord intent/émotion (dit "ça va" mais ton triste)
  if (explicit.intent === "SALUT" && implicit.type === "seek_comfort") {
    score += 0.3;
    alternatives.push("L'enfant dit que ça va mais semble triste");
  }
  
  // Multiple intents possibles avec scores proches
  if (explicit.secondBestConfidence > explicit.confidence - 0.15) {
    score += 0.2;
    alternatives.push(explicit.secondBestIntent);
  }
  
  return { score: Math.min(1.0, score), alternatives };
}
```

### 1.5 Exemple Concret Complet

```
Input: "j'ai peur du noir"

→ Level 1 (Explicite):
    intent: PEUR, confidence: 0.95
    
→ Level 2 (Implicite):
    implicit: seek_comfort, confidence: 0.90
    raisonnement: PEUR + fear → cherche du réconfort
    
→ Level 3 (Besoin):
    need: security, intensity: 4/5
    raisonnement: peur = menace perçue → besoin de sécurité
    
→ Level 4 (Goal):
    goal: be_reassured
    
→ Ambiguité: 0.1 (très clair)
→ Confirmation: false

// Bobby SAIT maintenant que l'enfant veut être RASSURÉ (pas juste qu'il a peur)
```

```
Input: "c'est nul"

→ Level 1: GENERAL (0.40) — ambigu !
→ Level 2: test_limits (0.35) OU express_frustration (0.45)
→ Level 3: autonomy (0.40) OU expression (0.50)
→ Level 4: be_heard
→ Ambiguité: 0.7 (élevée !)
→ Confirmation: true → Bobby dira "Qu'est-ce qui est nul ? Tu veux m'en parler ?"
```

---

## 2. 🎯 PRIORITY & ATTENTION ENGINE

### 2.1 Architecture

Le moteur de priorité transforme l'UnderstandingFrame en une **décision d'attention** : sur quoi Bobby doit-il se concentrer ?

```typescript
// src/lib/bobby/v7/priorityEngine.ts

interface PriorityDecision {
  // Score global 0-100
  totalScore: number;
  
  // Scores par dimension (0-10)
  scores: {
    safety: number;       // Danger détecté ? (poids: 30%)
    emotion: number;      // Intensité émotionnelle (poids: 25%)
    urgency: number;      // Besoin de réponse immédiate ? (poids: 20%)
    context: number;      // Pertinence contextuelle (poids: 15%)
    history: number;      // Patterns historiques (poids: 10%)
  };
  
  // Décision
  priorityLevel: "critical" | "high" | "normal" | "low";
  interruptCurrent: boolean;  // Doit-on interrompre le flow en cours ?
  bypassCache: boolean;       // Ignorer le cache (cas sensibles) ?
  requiresEmpathyFirst: boolean; // Répondre à l'émotion avant le contenu
}

// Poids relatifs des dimensions
const PRIORITY_WEIGHTS = {
  safety: 0.30,
  emotion: 0.25,
  urgency: 0.20,
  context: 0.15,
  history: 0.10,
};
```

### 2.2 Calcul du Score

```typescript
function computePriority(
  frame: UnderstandingFrame,
  emotion: DetectedEmotion,
  session: SessionContext,
  memory: MemoryContext,
): PriorityDecision {
  
  // ── SAFETY (0-10) ──
  const safetyIntents = ["CRISE_SECURITE", "HARCELEMENT", "DANGER", "URGENCE"];
  let safety = 0;
  if (safetyIntents.includes(frame.explicitIntent)) safety = 10;
  else if (frame.emotionalNeed === "security" && emotion.intensity >= 4) safety = 7;
  else if (frame.implicitIntent === "process_emotion") safety = 4;
  
  // ── EMOTION (0-10) ──
  const emotionScore = Math.min(10, emotion.intensity * 2);
  // Bonus si émotion négative forte
  const negativeEmotions: EmotionType[] = ["sadness", "fear", "anger", "shame"];
  const emotionBonus = negativeEmotions.includes(emotion.type) ? 2 : 0;
  const emotionFinal = Math.min(10, emotionScore + emotionBonus);
  
  // ── URGENCY (0-10) ──
  let urgency = 5; // baseline
  if (frame.userGoal === "be_reassured") urgency = 8;
  if (frame.userGoal === "get_help") urgency = 7;
  if (frame.requiresConfirmation) urgency += 1;
  // Si l'enfant répète la même chose → il n'a pas été compris → urgent
  if (session.lastUserIntent === frame.explicitIntent && session.turnCount > 1) urgency = 9;
  urgency = Math.min(10, urgency);
  
  // ── CONTEXT (0-10) ──
  let context = 5;
  // Flow actif et l'input est cohérent → boost
  if (session.activeFlow && isFlowRelevant(frame, session.activeFlow)) context = 8;
  // Sujet déjà exploré en profondeur → boost
  if (session.topicDepth >= 3) context += 2;
  context = Math.min(10, context);
  
  // ── HISTORY (0-10) ──
  let history = 3;
  // Pattern émotionnel récurrent (l'enfant est souvent triste) → attention
  if (memory.emotionalPatterns?.recurrent?.includes(emotion.type)) history = 7;
  // Sujet vu mais jamais résolu → attention
  if (memory.unresolvedTopics?.includes(frame.explicitIntent)) history = 8;
  history = Math.min(10, history);
  
  // ── SCORE TOTAL ──
  const totalScore = Math.round(
    safety * PRIORITY_WEIGHTS.safety * 10 +
    emotionFinal * PRIORITY_WEIGHTS.emotion * 10 +
    urgency * PRIORITY_WEIGHTS.urgency * 10 +
    context * PRIORITY_WEIGHTS.context * 10 +
    history * PRIORITY_WEIGHTS.history * 10
  );
  
  // ── DECISIONS ──
  const priorityLevel = 
    totalScore >= 80 ? "critical" :
    totalScore >= 55 ? "high" :
    totalScore >= 30 ? "normal" : "low";
  
  return {
    totalScore,
    scores: { safety, emotion: emotionFinal, urgency, context, history },
    priorityLevel,
    interruptCurrent: totalScore >= 70,           // Interrompre le flow si critique
    bypassCache: safety >= 7 || totalScore >= 75, // Pas de cache pour cas sensibles
    requiresEmpathyFirst: emotionFinal >= 7,      // Empathie avant le contenu
  };
}
```

### 2.3 Gestion des Conflits (Multi-Intent)

```typescript
/**
 * Quand plusieurs intentions sont détectées simultanément :
 * "J'ai peur ET je veux une histoire" → PEUR + HISTOIRE
 * 
 * Résolution par priorité + fusion intelligente :
 */
function resolveConflicts(
  frames: UnderstandingFrame[],
  priorities: PriorityDecision[],
): { primary: UnderstandingFrame; secondary: UnderstandingFrame | null; strategy: "sequential" | "merged" | "override" } {
  
  // Trier par priorité décroissante
  const ranked = frames
    .map((f, i) => ({ frame: f, priority: priorities[i] }))
    .sort((a, b) => b.priority.totalScore - a.priority.totalScore);
  
  const primary = ranked[0];
  const secondary = ranked[1] ?? null;
  
  // Si le gap de priorité est >30 → override (ignorer le secondaire)
  if (!secondary || primary.priority.totalScore - secondary.priority.totalScore > 30) {
    return { primary: primary.frame, secondary: null, strategy: "override" };
  }
  
  // Si les deux sont compatibles → merge
  // Ex: "J'ai peur" + "raconte une histoire" → histoire rassurante
  if (canMerge(primary.frame, secondary.frame)) {
    return { primary: primary.frame, secondary: secondary.frame, strategy: "merged" };
  }
  
  // Sinon → séquentiel (empathie d'abord, puis contenu)
  return { primary: primary.frame, secondary: secondary.frame, strategy: "sequential" };
}
```

---

## 3. 🧠 ADVANCED COGNITION ENGINE V7

### 3.1 Architecture — Triple Décision

V6 décide un **goal** unique. V7 raisonne en 3 étapes : **WHY → WHAT → HOW**.

```typescript
// src/lib/bobby/v7/cognitionV7.ts

interface CognitionPlan {
  // WHY — Pourquoi Bobby répond
  why: {
    primaryGoal: ResponseGoal;
    secondaryGoal: ResponseGoal | null;
    goalReason: string;  // Ex: "L'enfant a peur → rassurer"
  };
  
  // WHAT — Que dire
  what: {
    responseType: ResponseType;
    contentStrategy: ContentStrategy;
    includeMemory: boolean;
    includeQuestion: boolean;
    includeValidation: boolean;
  };
  
  // HOW — Comment le dire  
  how: {
    strategy: ResponseStrategy;
    tone: EmotionalTone;
    targetLength: "short" | "medium" | "long";
    personality: PersonalityOverrides;
    openingType: "empathy" | "fact" | "question" | "exclamation" | "continuation";
  };
  
  // META
  confidence: number;       // Confiance dans le plan (0-1)
  alternativePlan: CognitionPlan | null;  // Plan B si le A échoue
  estimatedLatency: number; // Estimation du temps de réponse (ms)
}

type ContentStrategy =
  | "kb_lookup"          // Chercher dans la knowledge base
  | "template_fill"      // Remplir un template
  | "memory_recall"      // Rappeler un souvenir
  | "flow_advance"       // Continuer un flow
  | "llm_generate"       // Appel micro-LLM
  | "game_action"        // Action de jeu
  | "empathy_pure"       // Réponse empathique pure (pas de contenu)
  | "redirect"           // Changement de sujet
  | "clarify";           // Demander une clarification
```

### 3.2 Arbre de Décision Cognitif

```typescript
function buildCognitionPlan(
  frame: UnderstandingFrame,
  priority: PriorityDecision,
  session: SessionContext,
  personality: PersonalityProfile,
): CognitionPlan {
  
  // ══════════════════════════════════════════════════════
  // WHY — Détermination du but
  // ══════════════════════════════════════════════════════
  
  let primaryGoal: ResponseGoal;
  let secondaryGoal: ResponseGoal | null = null;
  
  // CRITICAL: Émotion forte → TOUJOURS empathie d'abord
  if (priority.requiresEmpathyFirst) {
    primaryGoal = frame.userGoal === "be_reassured" ? "rassurer" : "ecouter";
    // Le secondaire est ce que l'enfant voulait à la base
    if (frame.userGoal === "learn_something") secondaryGoal = "enseigner";
    if (frame.userGoal === "have_fun") secondaryGoal = "jouer";
  }
  // SAFETY → toujours rassurer
  else if (priority.scores.safety >= 7) {
    primaryGoal = "rassurer";
  }
  // Standard: mapping par goal utilisateur
  else {
    primaryGoal = USER_GOAL_TO_RESPONSE_GOAL[frame.userGoal];
  }
  
  // ══════════════════════════════════════════════════════
  // WHAT — Que dire
  // ══════════════════════════════════════════════════════
  
  const what = decideContent(primaryGoal, frame, session);
  
  // ══════════════════════════════════════════════════════
  // HOW — Comment le dire
  // ══════════════════════════════════════════════════════
  
  const how = decideStyle(primaryGoal, frame, priority, personality, session);
  
  return {
    why: {
      primaryGoal,
      secondaryGoal,
      goalReason: buildGoalExplanation(frame, primaryGoal),
    },
    what,
    how,
    confidence: computePlanConfidence(frame, priority),
    alternativePlan: null, // Construit si confidence < 0.5
    estimatedLatency: estimateLatency(what.contentStrategy),
  };
}

const USER_GOAL_TO_RESPONSE_GOAL: Record<UserGoal, ResponseGoal> = {
  be_reassured: "rassurer",
  learn_something: "enseigner",
  have_fun: "jouer",
  be_heard: "ecouter",
  solve_problem: "enseigner",
  pass_time: "engager",
  get_help: "enseigner",
  share_joy: "valider",
  explore_topic: "approfondir",
  wind_down: "rassurer",
};
```

### 3.3 Sélection du Contenu

```typescript
function decideContent(
  goal: ResponseGoal,
  frame: UnderstandingFrame,
  session: SessionContext,
): CognitionPlan["what"] {
  let contentStrategy: ContentStrategy;
  let includeMemory = false;
  let includeQuestion = false;
  let includeValidation = false;
  
  // ── Empathie pure: pas besoin de contenu factuel ──
  if (goal === "ecouter" || goal === "rassurer") {
    contentStrategy = "empathy_pure";
    // Sauf si l'enfant a AUSSI posé une question
    if (frame.explicitIntent.startsWith("QUESTION_")) {
      contentStrategy = "kb_lookup";
      includeValidation = true; // "C'est normal d'avoir peur. Et en fait..."
    }
  }
  // ── Flow actif → continuer le flow ──
  else if (session.activeFlow) {
    contentStrategy = "flow_advance";
  }
  // ── Apprentissage → KB d'abord, LLM en fallback ──
  else if (goal === "enseigner" || goal === "approfondir") {
    contentStrategy = "kb_lookup"; // Fallback vers llm_generate si pas de match
    includeQuestion = true; // Toujours poser une question après enseigner
  }
  // ── Jeu → game engine ──
  else if (goal === "jouer") {
    contentStrategy = "game_action";
  }
  // ── Engagement → memory + question ──
  else if (goal === "engager") {
    contentStrategy = "memory_recall";
    includeQuestion = true;
    includeMemory = true;
  }
  // ── Redirection → bridge topic ──
  else if (goal === "rediriger") {
    contentStrategy = "redirect";
    includeMemory = true; // Utiliser les intérêts connus
  }
  // ── Défaut ──
  else {
    contentStrategy = "template_fill";
  }
  
  // ── Ambiguïté élevée → clarifier d'abord ──
  if (frame.ambiguityScore > 0.6) {
    contentStrategy = "clarify";
    includeQuestion = true;
  }
  
  return {
    responseType: GOAL_TO_RESPONSE_TYPE[goal],
    contentStrategy,
    includeMemory,
    includeQuestion,
    includeValidation,
  };
}
```

---

## 4. 🎬 DYNAMIC CONVERSATION ORCHESTRATOR

### 4.1 Le Concept de "Scene"

V7 traite chaque conversation comme un **scénario vivant** composé de **scènes**. Chaque scène a un objectif et un arc narratif.

```typescript
// src/lib/bobby/v7/orchestrator.ts

interface ConversationScene {
  id: string;
  type: SceneType;
  objective: string;          // "Rassurer l'enfant sur sa peur du noir"
  status: "active" | "paused" | "completed" | "abandoned";
  turnCount: number;
  maxTurns: number;           // Durée max avant transition
  progressionScore: number;   // 0-1, progression vers l'objectif
  entries: SceneEntry[];      // Historique de la scène
  resumeContext: string;      // Pour reprendre après interruption
}

type SceneType =
  | "greeting"       // Accueil
  | "exploration"    // Discussion libre, exploration d'un sujet
  | "emotional"      // Accompagnement émotionnel
  | "learning"       // Apprentissage / Q&A
  | "game"           // Jeu interactif
  | "story"          // Narration d'histoire
  | "wind_down"      // Préparation au dodo
  | "transition";    // Pont entre deux scènes

interface OrchestrationDirective {
  scene: ConversationScene;
  action: SceneAction;
  transition: TransitionPlan | null;
}

type SceneAction =
  | "continue"       // Continuer la scène actuelle
  | "deepen"         // Approfondir le sujet
  | "shift"          // Changer de direction dans la scène
  | "close"          // Clore la scène proprement
  | "interrupt"      // Interruption (enfant change de sujet)
  | "resume"         // Reprendre une scène interrompue
  | "spawn";         // Créer une nouvelle scène
```

### 4.2 Gestion des Transitions

```typescript
interface TransitionPlan {
  from: SceneType;
  to: SceneType;
  bridgeType: "natural" | "pivot" | "callback" | "surprise";
  bridgePhrase: string;   // Phrase de transition
  preserveContext: boolean; // Garder le contexte pour reprise ultérieure
}

const TRANSITION_BRIDGES: Record<string, string[]> = {
  "exploration→game": [
    "Tiens, ça me donne une idée de jeu !",
    "Et si on jouait à quelque chose en rapport ?",
    "Oh, j'ai un défi pour toi !",
  ],
  "emotional→exploration": [
    "Je comprends. Tu sais quoi ? Parlons d'un truc cool.",
    "C'est bien d'en avoir parlé. Et si on pensait à quelque chose de joyeux ?",
  ],
  "game→learning": [
    "Bravo ! Tu savais que en vrai...",
    "Super jeu ! D'ailleurs, tu connais un truc rigolo sur ce sujet ?",
  ],
  "learning→game": [
    "Maintenant qu'on sait ça, on fait un quiz ?",
    "Cool ! Et si je te posais une devinette là-dessus ?",
  ],
  "*→wind_down": [
    "Il se fait tard... Tu veux que je te raconte une petite histoire ?",
    "C'était chouette de parler avec toi. On fait un moment calme ?",
  ],
};
```

### 4.3 Gestion des Interruptions

```typescript
/**
 * Quand l'enfant interrompt le flow en cours :
 * 
 * "Bobby raconte une histoire → enfant dit 'j'ai faim'"
 * 
 * Le système doit :
 * 1. Sauvegarder le contexte de la scène en cours
 * 2. Évaluer la priorité de l'interruption
 * 3. Répondre à l'interruption
 * 4. Proposer de reprendre OU transitionner naturellement
 */
function handleInterruption(
  currentScene: ConversationScene,
  newFrame: UnderstandingFrame,
  newPriority: PriorityDecision,
): OrchestrationDirective {
  
  // Priorité critique → interrompre immédiatement
  if (newPriority.interruptCurrent) {
    currentScene.status = "paused";
    currentScene.resumeContext = buildResumeContext(currentScene);
    
    return {
      scene: createScene(newFrame),
      action: "spawn",
      transition: null, // Pas de transition, direct
    };
  }
  
  // Priorité normale → intégrer dans la scène si possible
  if (isIntegrableInScene(currentScene, newFrame)) {
    return {
      scene: currentScene,
      action: "shift",  // Shift de direction dans la même scène
      transition: null,
    };
  }
  
  // Sinon → transition douce
  return {
    scene: currentScene,
    action: "close",
    transition: {
      from: currentScene.type,
      to: inferSceneType(newFrame),
      bridgeType: "natural",
      bridgePhrase: pickBridge(currentScene.type, inferSceneType(newFrame)),
      preserveContext: true,
    },
  };
}
```

### 4.4 Reprise Contextuelle

```typescript
/**
 * Après une interruption, Bobby peut proposer de reprendre :
 * 
 * "Au fait, on était en train de parler des dinosaures, 
 *  tu voulais en savoir plus ?"
 */
function tryResume(
  pausedScenes: ConversationScene[],
  currentContext: SessionContext,
): { shouldResume: boolean; scene: ConversationScene | null; resumePhrase: string } {
  
  // Chercher la scène la plus récente et la plus engageante
  const candidate = pausedScenes
    .filter(s => s.status === "paused" && s.progressionScore < 0.8)
    .sort((a, b) => b.progressionScore - a.progressionScore)[0];
  
  if (!candidate) return { shouldResume: false, scene: null, resumePhrase: "" };
  
  // Ne pas reprendre si plus de 10 tours depuis l'interruption
  if (currentContext.turnsSinceInterrupt > 10) {
    candidate.status = "abandoned";
    return { shouldResume: false, scene: null, resumePhrase: "" };
  }
  
  return {
    shouldResume: true,
    scene: candidate,
    resumePhrase: `Au fait, ${candidate.resumeContext} — tu veux qu'on continue ?`,
  };
}
```

---

## 5. 🔁 UNDERSTANDING FEEDBACK LOOP

### 5.1 Architecture

Le feedback loop vérifie en continu que Bobby a bien compris l'enfant.

```typescript
// src/lib/bobby/v7/understandingLoop.ts

interface UnderstandingCheck {
  type: "implicit_confirm" | "explicit_confirm" | "soft_redirect" | "no_check";
  phrase: string | null;
  triggerReason: string;
}

/**
 * Décide si Bobby doit vérifier sa compréhension AVANT de répondre.
 * 
 * Appelé APRÈS la génération de réponse, AVANT le TTS.
 * Peut modifier la réponse pour ajouter une vérification.
 */
function checkUnderstanding(
  frame: UnderstandingFrame,
  response: string,
  session: SessionContext,
): UnderstandingCheck {
  
  // ── Cas 1: Ambiguïté élevée → demander confirmation ──
  if (frame.ambiguityScore > 0.6) {
    return {
      type: "explicit_confirm",
      phrase: generateConfirmQuestion(frame),
      triggerReason: `ambiguity=${frame.ambiguityScore.toFixed(2)}`,
    };
  }
  
  // ── Cas 2: L'enfant répète la même chose → on n'a pas compris ──
  if (session.lastUserIntent === frame.explicitIntent 
      && session.consecutiveRepeats >= 2) {
    return {
      type: "soft_redirect",
      phrase: "Hmm, je crois que je ne comprends pas bien. Tu peux me dire autrement ?",
      triggerReason: "consecutive_repeats",
    };
  }
  
  // ── Cas 3: Émotion forte mais intent neutre → vérifier ──
  if (frame.emotionalNeed !== "stimulation" 
      && frame.implicitIntent === "seek_comfort"
      && frame.explicitIntent === "GENERAL") {
    return {
      type: "implicit_confirm",
      phrase: null,  // Ajoutera "Tu as l'air un peu triste, ça va ?"
      triggerReason: "emotion_intent_mismatch",
    };
  }
  
  // ── Cas 4: Pas de vérification nécessaire ──
  return { type: "no_check", phrase: null, triggerReason: "clear_understanding" };
}
```

### 5.2 Correction en Temps Réel

```typescript
/**
 * Si l'enfant dit "non" ou reformule après la vérification de Bobby,
 * le système ajuste immédiatement.
 */
function handleCorrectionSignal(
  userResponse: string,
  previousFrame: UnderstandingFrame,
  session: SessionContext,
): { corrected: boolean; newFrame: UnderstandingFrame | null } {
  
  const negationPatterns = [
    /^non/i, /^pas ça/i, /^c'est pas/i, /^je voulais dire/i,
    /^en fait/i, /^mais non/i, /^nan/i,
  ];
  
  if (negationPatterns.some(p => p.test(userResponse.trim()))) {
    // L'enfant corrige Bobby → extraire le nouveau frame
    // et marquer l'ancien comme erroné (pour l'apprentissage)
    const correctedFrame = extractDeepUnderstanding(
      userResponse, 
      detectEmotion(userResponse),
      { ...session, isCorrectionMode: true },
      session.childProfile,
    );
    
    // Log pour l'auto-learning
    logMisunderstanding(previousFrame, correctedFrame);
    
    return { corrected: true, newFrame: correctedFrame };
  }
  
  return { corrected: false, newFrame: null };
}
```

### 5.3 Phrases de Confirmation Générées

```typescript
function generateConfirmQuestion(frame: UnderstandingFrame): string {
  const templates: Record<ImplicitIntent, string[]> = {
    seek_comfort: [
      "Tu as besoin d'un câlin, c'est ça ?",
      "Tu veux qu'on en parle un peu ?",
    ],
    seek_knowledge: [
      "Tu veux savoir comment ça marche ?",
      "C'est ça que tu voulais savoir ?",
    ],
    seek_fun: [
      "Tu veux qu'on joue ensemble ?",
      "On s'amuse un peu ?",
    ],
    express_frustration: [
      "Quelque chose te dérange ?",
      "Tu veux me dire ce qui ne va pas ?",
    ],
    test_limits: [
      "Hmm, tu essaies de me taquiner ? 😄",
    ],
    // ... autres
  };
  
  const options = templates[frame.implicitIntent] ?? ["Tu veux m'en dire plus ?"];
  return options[Math.floor(Math.random() * options.length)];
}
```

---

## 6. 🎭 ADAPTIVE PERSONALITY ENGINE V2

### 6.1 Évolution par Rapport à V6

V6 a 5 axes statiques avec modulation par contexte.  
V7 ajoute : **mémoire de personnalité**, **évolution long-terme**, et **cohérence narrative**.

```typescript
// src/lib/bobby/v7/personalityV2.ts

interface PersonalityV2 {
  // ── Axes dynamiques (V6, conservés) ──
  axes: {
    fun: number;        // 0-1
    curiosity: number;
    empathy: number;
    energy: number;
    wisdom: number;
  };
  
  // ── NOUVEAU V7: Axes relationnels ──
  relational: {
    familiarity: number;     // 0-1 : comment Bobby se permet d'être familier
    playfulness: number;     // 0-1 : niveau de taquinerie
    protectiveness: number;  // 0-1 : instinct de protection
    teachingDrive: number;   // 0-1 : envie d'enseigner
  };
  
  // ── NOUVEAU V7: Mémoire de personnalité ──
  memory: {
    lastShift: { from: string; to: string; reason: string; timestamp: number };
    consistencyScore: number;  // 0-1, cohérence sur les derniers N tours
    moodTrajectory: number[];  // Évolution de l'humeur sur la session
  };
  
  // ── NOUVEAU V7: Style narratif ──
  narrativeStyle: {
    verbosity: "minimal" | "balanced" | "expressive";
    humorStyle: "wordplay" | "silly" | "dry" | "none";
    exclamationLevel: number;  // 0-1
    emojiDensity: number;      // 0-1
  };
}
```

### 6.2 Évolution Long-Terme

```typescript
/**
 * La personnalité évolue au fil des sessions.
 * Un enfant qui aime les blagues → Bobby devient plus drôle au fil du temps.
 * Un enfant calme → Bobby baisse son énergie progressivement.
 */
interface PersonalityEvolution {
  childId: string;
  baselineAxes: PersonalityAxes;           // Point de départ
  currentAxes: PersonalityAxes;            // État actuel
  evolutionHistory: EvolutionEvent[];      // Historique des changements
  adaptationSpeed: number;                 // 0-1, vitesse d'adaptation
}

interface EvolutionEvent {
  timestamp: number;
  axis: keyof PersonalityAxes;
  delta: number;           // -0.1 à +0.1
  reason: string;          // "child_laughed_3_times", "child_prefers_calm"
  sessionId: string;
}

/**
 * Mise à jour post-session de la personnalité.
 * Les changements sont PETITS (±0.05 max) pour assurer la cohérence.
 */
function evolvePersonality(
  current: PersonalityEvolution,
  sessionMetrics: SessionMetrics,
): PersonalityEvolution {
  const MAX_DELTA = 0.05;
  const updated = { ...current.currentAxes };
  const events: EvolutionEvent[] = [];
  
  // Si l'enfant a ri souvent → boost fun
  if (sessionMetrics.laughCount >= 3) {
    updated.fun = Math.min(1, updated.fun + MAX_DELTA);
    events.push({ axis: "fun", delta: MAX_DELTA, reason: "child_laughed_frequently" });
  }
  
  // Si l'enfant a posé beaucoup de questions → boost curiosity
  if (sessionMetrics.questionCount >= 5) {
    updated.curiosity = Math.min(1, updated.curiosity + MAX_DELTA);
    events.push({ axis: "curiosity", delta: MAX_DELTA, reason: "high_question_rate" });
  }
  
  // Si session mood était négatif → boost empathy pour prochaine fois
  if (sessionMetrics.overallMood === "negative") {
    updated.empathy = Math.min(1, updated.empathy + MAX_DELTA);
    events.push({ axis: "empathy", delta: MAX_DELTA, reason: "negative_session_detected" });
  }
  
  // Si l'enfant se désengage quand Bobby est trop énergique → baisser energy
  if (sessionMetrics.disengagementAfterHighEnergy) {
    updated.energy = Math.max(0, updated.energy - MAX_DELTA);
    events.push({ axis: "energy", delta: -MAX_DELTA, reason: "energy_causes_disengagement" });
  }
  
  return {
    ...current,
    currentAxes: updated,
    evolutionHistory: [...current.evolutionHistory, ...events].slice(-100),
  };
}
```

### 6.3 Cohérence Narrative

```typescript
/**
 * Bobby ne doit pas changer de personnalité d'un tour à l'autre
 * sans raison. Le système de cohérence empêche les sauts brusques.
 */
function enforceConsistency(
  previous: PersonalityV2,
  proposed: PersonalityV2,
): PersonalityV2 {
  const MAX_SHIFT_PER_TURN = 0.15;
  const enforced = { ...proposed };
  
  for (const axis of Object.keys(enforced.axes) as (keyof PersonalityAxes)[]) {
    const delta = enforced.axes[axis] - previous.axes[axis];
    if (Math.abs(delta) > MAX_SHIFT_PER_TURN) {
      enforced.axes[axis] = previous.axes[axis] + Math.sign(delta) * MAX_SHIFT_PER_TURN;
    }
  }
  
  // Log la cohérence
  enforced.memory.consistencyScore = 1 - (
    Object.keys(enforced.axes).reduce((sum, axis) => {
      const k = axis as keyof PersonalityAxes;
      return sum + Math.abs(enforced.axes[k] - previous.axes[k]);
    }, 0) / 5 // 5 axes
  );
  
  return enforced;
}
```

---

## 7. 🧠 LONG-TERM RELATIONSHIP MEMORY

### 7.1 Architecture Mémoire Relationnelle

```typescript
// src/lib/bobby/v7/relationshipMemory.ts

interface RelationshipMemory {
  childId: string;
  
  // ── Souvenirs importants ──
  significantMoments: SignificantMoment[];
  
  // ── Préférences émotionnelles ──
  emotionalPreferences: {
    comfortStyle: "humor" | "empathy" | "distraction" | "silence";
    excitementResponse: "match_energy" | "gentle_celebrate" | "curious";
    frustrationResponse: "acknowledge" | "redirect" | "problem_solve";
  };
  
  // ── Habitudes ──
  habits: {
    typicalGreeting: string;          // Comment l'enfant dit bonjour
    typicalSessionLength: number;     // Durée moyenne (minutes)
    peakEngagementTime: string;       // "morning" | "afternoon" | "evening"
    favoriteActivities: string[];     // Top 5 activités
    conversationStyle: "brief" | "chatty" | "deep";
  };
  
  // ── Score relationnel ──
  bond: {
    trustLevel: number;       // 0-100
    sharedExperiences: number; // Nombre total d'interactions significatives
    insideJokes: string[];    // Références internes
    nicknames: string[];      // Surnoms utilisés
    lastSeen: number;         // Timestamp
    daysSinceLastSeen: number;
  };
}

interface SignificantMoment {
  id: string;
  type: "achievement" | "emotional" | "funny" | "learning" | "milestone";
  summary: string;          // "A eu peur de l'orage et Bobby l'a rassuré"
  emotionalValence: number; // -1 (négatif) à +1 (positif)
  importance: number;       // 1-10
  canReference: boolean;    // Bobby peut-il en parler ?
  timestamp: number;
  decayFactor: number;      // 0-1 (diminue avec le temps)
}
```

### 7.2 Rappel Intelligent

```typescript
/**
 * Choisit le meilleur souvenir à rappeler en fonction du contexte.
 * Ne rappelle pas les souvenirs négatifs sauf pour montrer de l'empathie.
 */
function selectMemoryForRecall(
  memories: RelationshipMemory,
  currentContext: {
    topic: string;
    emotion: EmotionType;
    frame: UnderstandingFrame;
  },
): { memory: SignificantMoment | null; phrase: string } {
  
  const candidates = memories.significantMoments
    .filter(m => m.canReference && m.decayFactor > 0.3)
    .filter(m => {
      // Ne pas rappeler les souvenirs négatifs sauf en contexte empathique
      if (m.emotionalValence < 0 && currentContext.emotion !== "sadness") return false;
      return true;
    })
    .sort((a, b) => {
      // Score = importance × pertinence × fraîcheur
      const relevanceA = computeTopicRelevance(a, currentContext.topic);
      const relevanceB = computeTopicRelevance(b, currentContext.topic);
      return (b.importance * relevanceB * b.decayFactor)
           - (a.importance * relevanceA * a.decayFactor);
    });
  
  if (candidates.length === 0) return { memory: null, phrase: "" };
  
  const selected = candidates[0];
  
  // Construire la phrase de rappel
  const phrases: Record<SignificantMoment["type"], (m: SignificantMoment) => string> = {
    achievement: (m) => `Tu te souviens quand ${m.summary} ? C'était super !`,
    emotional: (m) => `La dernière fois qu'on a parlé de ça, ${m.summary}.`,
    funny: (m) => `Haha, ça me rappelle quand ${m.summary} 😄`,
    learning: (m) => `Tu savais déjà un truc là-dessus ! ${m.summary}.`,
    milestone: (m) => `Waouh, depuis ${m.summary}, tu as encore grandi !`,
  };
  
  return {
    memory: selected,
    phrase: phrases[selected.type](selected),
  };
}
```

### 7.3 Effet "Il Me Connaît"

```typescript
/**
 * Génère des touches de personnalisation "il me connaît" disséminées
 * naturellement dans la conversation — PAS à chaque tour.
 * 
 * Fréquence cible : 1 rappel tous les 5-8 tours.
 */
function shouldInjectKnowledgeTouch(
  session: SessionContext,
  memories: RelationshipMemory,
): boolean {
  // Pas dans les 3 premiers tours
  if (session.turnCount < 3) return false;
  
  // Pas trop souvent (1 rappel tous les 5-8 tours)
  const turnsSinceLast = session.turnCount - (session.lastMemoryInjectionTurn ?? 0);
  if (turnsSinceLast < 5) return false;
  
  // Plus probable après 8 tours
  const probability = Math.min(0.5, (turnsSinceLast - 5) * 0.1);
  return Math.random() < probability;
}

// Types de "touches" de personnalisation
const KNOWLEDGE_TOUCHES = [
  // Utiliser le prénom
  (m: RelationshipMemory, child: string) => `${child}, `,
  
  // Référencer une préférence
  (m: RelationshipMemory) => {
    const fav = m.habits.favoriteActivities[0];
    return fav ? `Toi qui adores ${fav}, ` : null;
  },
  
  // Référencer le temps écoulé
  (m: RelationshipMemory) => {
    if (m.bond.daysSinceLastSeen > 3) {
      return `Ça faisait longtemps ! `;
    }
    return null;
  },
  
  // Inside joke
  (m: RelationshipMemory) => {
    const joke = m.bond.insideJokes[0];
    return joke ? `${joke} 😄 ` : null;
  },
];
```

---

## 8. 🤖 MICRO-LLM AUGMENTATION SYSTEM

### 8.1 Architecture d'Augmentation

Le micro-LLM n'est PAS le cerveau principal. Il **augmente** les réponses déjà générées par le cerveau local.

```typescript
// src/lib/bobby/v7/llmAugmentation.ts

interface AugmentationRequest {
  baseResponse: string;           // Réponse brute du cerveau local
  plan: CognitionPlan;            // Ce que la cognition a décidé
  childAge: number;
  personality: PersonalityV2;
  memoryContext: string[];        // Faits pertinents
  augmentationType: AugmentationType;
}

type AugmentationType =
  | "enrich"           // Ajouter du contenu (détails, exemples)
  | "humanize"         // Rendre plus naturel
  | "simplify"         // Simplifier pour l'âge
  | "add_emotion"      // Ajouter de l'affect
  | "create_variation" // Éviter la répétition
  | "generate_fresh";  // Créer une réponse from scratch (fallback)
```

### 8.2 Prompts Optimisés

```typescript
const AUGMENTATION_PROMPTS: Record<AugmentationType, (req: AugmentationRequest) => string> = {
  enrich: (req) => `
Tu es Bobby, compagnon d'un enfant de ${req.childAge} ans.
Enrichis cette réponse avec un détail surprenant ou un exemple concret.
RÉPONSE DE BASE : "${req.baseResponse}"
PERSONNALITÉ : fun=${req.personality.axes.fun.toFixed(1)}, empathy=${req.personality.axes.empathy.toFixed(1)}
RÈGLES : Max 2 phrases. Adapté à ${req.childAge} ans. Pas de contenu adulte.
MÉMOIRE : ${req.memoryContext.join(", ") || "aucune"}
Réponds directement, sans guillemets.`,

  humanize: (req) => `
Reformule comme un ami parlerait à un enfant de ${req.childAge} ans :
"${req.baseResponse}"
Ton : ${req.plan.how.tone}. Max 2 phrases. Garde le sens exact.`,

  simplify: (req) => `
Simplifie pour un enfant de ${req.childAge} ans :
"${req.baseResponse}"
Utilise des mots simples, des comparaisons. Max 2 phrases.`,

  add_emotion: (req) => `
Ajoute de l'émotion et de la chaleur à cette réponse :
"${req.baseResponse}"
L'enfant ressent : ${req.plan.why.goalReason}
Ton : ${req.plan.how.tone}. Max 2 phrases.`,

  create_variation: (req) => `
Reformule différemment (évite la répétition) :
"${req.baseResponse}"
Même sens, style différent. Max 2 phrases. Pour enfant de ${req.childAge} ans.`,

  generate_fresh: (req) => `
Tu es Bobby, compagnon IA d'un enfant de ${req.childAge} ans nommé [enfant].
CONTEXTE : ${req.plan.why.goalReason}
OBJECTIF : ${req.plan.why.primaryGoal}
TON : ${req.plan.how.tone}
PERSONNALITÉ : fun=${req.personality.axes.fun.toFixed(1)}, curiosity=${req.personality.axes.curiosity.toFixed(1)}, empathy=${req.personality.axes.empathy.toFixed(1)}
MÉMOIRE : ${req.memoryContext.join(". ") || "Première interaction"}
Réponds en 1-3 phrases naturelles. Pas de contenu adulte. Adapté ${req.childAge} ans.`,
};
```

### 8.3 Garde-fous Sécurité Post-LLM

```typescript
/**
 * Vérifie que la sortie du LLM est safe AVANT de l'utiliser.
 * Si unsafe → fallback vers la réponse brute du cerveau local.
 */
function validateLLMOutput(
  llmOutput: string,
  originalResponse: string,
  childAge: number,
): { safe: boolean; output: string; reason: string } {
  
  // 1. Safety check (réutilise le V6)
  if (isBlockedContent(llmOutput)) {
    return { safe: false, output: originalResponse, reason: "blocked_content" };
  }
  
  // 2. Length check (le LLM ne doit pas produire un roman)
  if (llmOutput.length > 500) {
    return { safe: false, output: originalResponse, reason: "too_long" };
  }
  
  // 3. Age-appropriateness check
  if (childAge <= 5 && llmOutput.split(/\s+/).length > 40) {
    return { safe: false, output: originalResponse, reason: "too_complex_for_age" };
  }
  
  // 4. Coherence check (le LLM ne doit pas contredire la réponse originale)
  // Simple heuristique : si le LLM parle d'un sujet complètement différent
  const originalWords = new Set(originalResponse.toLowerCase().split(/\s+/));
  const llmWords = llmOutput.toLowerCase().split(/\s+/);
  const overlap = llmWords.filter(w => originalWords.has(w)).length / llmWords.length;
  if (overlap < 0.05 && llmOutput.length > 50) {
    return { safe: false, output: originalResponse, reason: "topic_drift" };
  }
  
  return { safe: true, output: llmOutput, reason: "passed" };
}
```

### 8.4 Budget Latence

```typescript
/**
 * Le LLM a un budget de latence strict.
 * Si le LLM ne répond pas dans le budget → utiliser la réponse brute.
 */
const LLM_LATENCY_BUDGET_MS = {
  enrich: 400,         // 400ms max
  humanize: 300,       // 300ms max
  simplify: 300,
  add_emotion: 300,
  create_variation: 300,
  generate_fresh: 600, // Plus de temps car génération from scratch
};

async function augmentWithBudget(
  req: AugmentationRequest,
): Promise<string> {
  const budget = LLM_LATENCY_BUDGET_MS[req.augmentationType];
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), budget);
  
  try {
    const result = await callMicroLLM(req, controller.signal);
    clearTimeout(timeout);
    
    const validation = validateLLMOutput(result, req.baseResponse, req.childAge);
    return validation.output;
  } catch {
    clearTimeout(timeout);
    console.warn(`[LLM] Timeout after ${budget}ms, using base response`);
    return req.baseResponse;
  }
}
```

---

## 9. 🔒 TRUSTED AUTO-LEARNING SYSTEM V2

### 9.1 Architecture (Extension du V6 Safe Learning)

V6 a déjà : trust_score, quality_score, validation pipeline.  
V7 ajoute : **continuous quality monitoring**, **A/B testing**, **human-in-the-loop**.

```typescript
// src/lib/bobby/v7/trustedLearning.ts

interface TrustedLearningPipeline {
  // ── Phase 1: Capture ──
  capture: {
    source: "conversation" | "gap_detection" | "correction_signal";
    rawQA: { question: string; answer: string };
    context: LearningContext;
  };
  
  // ── Phase 2: Validation (V6+) ──
  validation: {
    safetyGate: boolean;          // Contenu sûr ?
    qualityScore: number;         // 0-1
    relevanceScore: number;       // Pertinent pour l'âge ?
    pedagogicalScore: number;     // Valeur éducative ?
    duplicateCheck: boolean;      // Pas un doublon ?
  };
  
  // ── Phase 3: Trust Lifecycle (NOUVEAU V7) ──
  trust: {
    initialTrust: number;         // 0.2-0.4
    currentTrust: number;         // 0-1
    promotionHistory: TrustEvent[];
    status: "probation" | "active" | "trusted" | "flagged" | "retired";
  };
  
  // ── Phase 4: Performance Monitoring (NOUVEAU V7) ──
  monitoring: {
    usageCount: number;
    positiveSignals: number;      // L'enfant a continué à engager
    negativeSignals: number;      // L'enfant a ignoré/changé de sujet
    performanceScore: number;     // positive / (positive + negative)
    lastUsed: number;
  };
}

// Trust lifecycle states
// probation → active → trusted → (flagged) → retired
//                                    ↓
//                                  active (si corrigé)
```

### 9.2 A/B Testing Automatique

```typescript
/**
 * Quand une nouvelle réponse est apprise, elle n'est pas immédiatement
 * utilisée à 100%. Elle est testée en A/B :
 * - 70% du temps : ancienne réponse (prouvée)
 * - 30% du temps : nouvelle réponse (à tester)
 * 
 * Si la nouvelle réponse obtient de meilleurs signaux → promotion
 * Si elle est pire → rejet
 */
interface ABTest {
  id: string;
  situationKey: string;
  controlResponse: string;     // Réponse actuelle
  variantResponse: string;     // Nouvelle réponse à tester
  controlScore: number;        // Score moyen du contrôle
  variantScore: number;        // Score moyen du variant
  sampleSize: number;          // Nombre de tests
  status: "running" | "variant_wins" | "control_wins" | "inconclusive";
}

function shouldUseVariant(test: ABTest): boolean {
  if (test.sampleSize < 5) return Math.random() < 0.3; // 30% variant
  if (test.variantScore > test.controlScore + 0.1) return true; // Variant clairement meilleur
  if (test.controlScore > test.variantScore + 0.1) return false; // Contrôle meilleur
  return Math.random() < 0.3; // Encore en test
}
```

### 9.3 Détection de Dérive Avancée

```typescript
/**
 * Monitoring continu pour détecter si l'auto-apprentissage
 * dégrade la qualité globale.
 */
interface DriftMonitor {
  windowSize: number;      // Nombre de sessions à surveiller
  metrics: {
    avgEngagement: number[];    // Rolling average
    avgSafetyScore: number[];
    rejectionRate: number;      // % de réponses ignorées
    parentAlerts: number;       // Alertes parentales déclenchées
  };
  
  // Seuils d'alerte
  thresholds: {
    engagementDropPercent: 15;  // Alerte si engagement baisse de 15%
    safetyMinimum: 0.95;       // Alerte si safety < 95%
    rejectionMaxPercent: 30;   // Alerte si >30% d'ignorés
    parentAlertMax: 2;         // Alerte si >2 alertes parentales
  };
}

function checkForDrift(monitor: DriftMonitor): {
  driftDetected: boolean;
  severity: "low" | "medium" | "high";
  action: "continue" | "pause_learning" | "rollback";
  reason: string;
} {
  const recent = monitor.metrics.avgEngagement.slice(-5);
  const baseline = monitor.metrics.avgEngagement.slice(0, 10);
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const baselineAvg = baseline.reduce((a, b) => a + b, 0) / baseline.length;
  
  const drop = (baselineAvg - recentAvg) / baselineAvg * 100;
  
  if (drop > 25) {
    return {
      driftDetected: true,
      severity: "high",
      action: "rollback",
      reason: `Engagement dropped ${drop.toFixed(0)}% — rolling back to last good snapshot`,
    };
  }
  
  if (drop > 15) {
    return {
      driftDetected: true,
      severity: "medium",
      action: "pause_learning",
      reason: `Engagement dropped ${drop.toFixed(0)}% — pausing auto-learning`,
    };
  }
  
  return { driftDetected: false, severity: "low", action: "continue", reason: "nominal" };
}
```

---

## 10. ⚡ ULTRA PERFORMANCE DESIGN

### 10.1 Budget Latence par Stage

```
STAGE 0 — Normalization:     <10ms  (regex, 100% local)
STAGE 1 — Deep Understanding: <15ms  (scoring rules, 100% local)
STAGE 2 — Priority Engine:    <5ms   (weighted scoring, 100% local)
STAGE 3 — Cognition Engine:   <10ms  (decision tree, 100% local)
STAGE 4 — Orchestrator:       <5ms   (scene management, 100% local)
STAGE 5 — Response Assembly:  <50ms  (KB lookup + template, local)
                               <200ms (KB lookup + micro-LLM, cloud)
STAGE 6 — Personality:        <20ms  (text transform, local)
                               <400ms (LLM augmentation, cloud)
STAGE 7 — Safety + Loop:      <5ms   (regex + rules, local)
─────────────────────────────────────────────────────────
TOTAL LOCAL:                  <120ms ✅ (objectif <700ms)
TOTAL AVEC LLM:               <350ms ✅
TOTAL AVEC LLM + TTS:         <700ms ✅
```

### 10.2 Parallélisation

```typescript
/**
 * Les stages indépendants sont exécutés en parallèle.
 * 
 * PARALLÈLE:
 *   Stage 1a (Intent NLU) ⟂ Stage 1b (Emotion) ⟂ Stage 1c (Deep Goal)
 *   → Merge dans UnderstandingFrame
 * 
 * SÉQUENTIEL:
 *   Stage 1 → Stage 2 → Stage 3 → Stage 4 → Stage 5 → Stage 6 → Stage 7
 * 
 * PIPELINE ANTICIPÉ:
 *   Pendant Stage 5 (Response Assembly), Stage 6 (Personality) 
 *   peut déjà pré-calculer les axes.
 *   Pendant Stage 6, le TTS peut déjà recevoir les premiers tokens.
 */
async function processV7Pipeline(input: PipelineInput): Promise<PipelineOutput> {
  const t0 = performance.now();
  
  // ── PARALLEL: Understanding (Intent + Emotion + DeepGoal) ──
  const [intent, emotion, deepGoal] = await Promise.all([
    detectLocalIntent(input.normalizedText),     // <5ms
    detectEmotion(input.normalizedText),          // <5ms
    extractDeepGoal(input.normalizedText, input.sessionContext), // <10ms
  ]);
  
  const frame = mergeToFrame(intent, emotion, deepGoal); // <1ms
  
  // ── SEQUENTIAL: Priority → Cognition → Orchestration ──
  const priority = computePriority(frame, emotion, input.session, input.memory); // <5ms
  const plan = buildCognitionPlan(frame, priority, input.session, input.personality); // <10ms
  const directive = orchestrate(plan, input.session); // <5ms
  
  // ── RESPONSE ASSEMBLY (peut trigger LLM) ──
  const baseResponse = await assembleResponse(plan, directive, input); // <50ms local
  
  // ── PARALLEL: Personality + Memory Injection ──
  const [styledResponse, memoryTouch] = await Promise.all([
    applyPersonalityV2(baseResponse, input.personality),
    selectMemoryForRecall(input.memories, { topic: plan.why.primaryGoal, emotion: emotion.type, frame }),
  ]);
  
  // ── SAFETY + FEEDBACK LOOP ──
  const finalResponse = applySafetyFilter(styledResponse);
  const understandingCheck = checkUnderstanding(frame, finalResponse, input.session);
  
  // ── Optionnel: LLM Augmentation (si budget le permet) ──
  const elapsed = performance.now() - t0;
  const remainingBudget = 600 - elapsed; // 600ms budget total (sans TTS)
  
  let augmentedResponse = finalResponse;
  if (remainingBudget > 300 && plan.what.contentStrategy !== "empathy_pure") {
    augmentedResponse = await augmentWithBudget({
      baseResponse: finalResponse,
      plan,
      childAge: input.childAge,
      personality: input.personality,
      memoryContext: [],
      augmentationType: "humanize",
    });
  }
  
  console.log(`[V7] Pipeline: ${(performance.now() - t0).toFixed(0)}ms`);
  
  return { response: augmentedResponse, frame, plan, directive, understandingCheck };
}
```

### 10.3 Cache Intelligent Multi-Niveaux

```
L1 — RAM Hot Cache (dernier 50 Q&A par session)
      Lookup: <0.1ms | Hit rate: ~30%

L2 — IndexedDB Warm Cache (par enfant, 500 patterns)
      Lookup: <2ms  | Hit rate: ~20%

L3 — Knowledge Base (4800+ entries, full search)
      Lookup: <20ms | Hit rate: ~40%

L4 — Micro-LLM Generation (cloud)
      Lookup: <400ms | Hit rate: 100% (fallback ultime)
```

---

## 11. 📦 ARCHITECTURE TECHNIQUE — MODULE MAP

```
src/lib/bobby/v7/
├── deepUnderstanding.ts       # Stage 1: Deep Intent & Goal
│   ├── implicitDeduction.ts   # Règles de déduction implicite
│   ├── needMapper.ts          # Mapping besoins émotionnels
│   └── ambiguityResolver.ts   # Gestion ambiguïté
│
├── priorityEngine.ts          # Stage 2: Priority & Attention
│   ├── conflictResolver.ts    # Multi-intent resolution
│   └── attentionScorer.ts     # Scoring par dimension
│
├── cognitionV7.ts             # Stage 3: Advanced Cognition
│   ├── goalSelector.ts        # WHY (extends V6 goals.ts)
│   ├── contentDecider.ts      # WHAT
│   └── styleDecider.ts        # HOW
│
├── orchestrator.ts            # Stage 4: Conversation Orchestration
│   ├── sceneManager.ts        # Scene lifecycle
│   ├── transitionEngine.ts    # Transition bridges
│   └── interruptHandler.ts    # Interruption recovery
│
├── understandingLoop.ts       # Stage 7: Feedback Loop
│   ├── confirmGenerator.ts    # Phrases de confirmation
│   └── correctionHandler.ts   # Gestion des corrections
│
├── personalityV2.ts           # Stage 6: Personality V2
│   ├── evolutionTracker.ts    # Long-term personality evolution
│   └── consistencyGuard.ts    # Cohérence narrative
│
├── relationshipMemory.ts      # Memory: Long-term relationship
│   ├── momentTracker.ts       # Significant moments
│   └── recallEngine.ts        # Smart recall
│
├── llmAugmentation.ts         # Micro-LLM augmentation
│   ├── promptTemplates.ts     # Optimized prompts
│   └── safetyValidator.ts     # Post-LLM validation
│
├── trustedLearning.ts         # Safe Auto-Learning V2
│   ├── abTesting.ts           # A/B test system
│   └── driftMonitor.ts        # Drift detection
│
├── pipeline.ts                # Main V7 pipeline orchestrator
└── types.ts                   # All V7 types
```

### Interactions entre modules

```
                    ┌──────────────────────┐
                    │   V7 Pipeline        │
                    │   (pipeline.ts)      │
                    └──────┬───────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼─────┐  ┌──────▼─────┐  ┌──────▼──────┐
    │ Deep       │  │ Priority   │  │ Cognition   │
    │ Understand │─►│ Engine     │─►│ Engine V7   │
    └──────┬─────┘  └────────────┘  └──────┬──────┘
           │                               │
           │        ┌─────────────┐        │
           │        │ Orchestrator│◄───────┘
           │        └──────┬──────┘
           │               │
    ┌──────▼─────┐  ┌──────▼──────┐  ┌─────────────┐
    │ Personality│  │ Response    │  │ LLM         │
    │ V2         │  │ Assembly    │◄─│ Augmentation│
    └────────────┘  └──────┬──────┘  └─────────────┘
                           │
                    ┌──────▼──────┐
                    │ Safety +    │
                    │ Feedback    │
                    │ Loop        │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Trusted     │
                    │ Learning V2 │ (async, post-response)
                    └─────────────┘
```

### Stockage Local vs Cloud

```
100% LOCAL (offline-first):
├── Intent Detection (regex + smart classifier)
├── Emotion Detection (rules + heuristics)
├── Deep Understanding (deduction rules)
├── Priority Engine (scoring)
├── Cognition Engine (decision tree)
├── Orchestrator (scene management)
├── Personality Engine (axis modulation)
├── Safety Filter (blocklist + regex)
├── Feedback Loop (rules)
├── KB Cache (IndexedDB, 4800+ entries)
├── Response Templates (RAM)
├── Personality Memory (localStorage)
└── Relationship Memory (localStorage + IndexedDB)

CLOUD (quand disponible):
├── Micro-LLM Augmentation (Gemini via gateway)
├── KB Sync (Supabase → IndexedDB)
├── Auto-Learning Pipeline (Edge Function)
├── Session Persistence (Supabase)
└── Profile Sync (Supabase)
```

---

## 12. 🎯 EXEMPLES CONCRETS END-TO-END

### Exemple 1 : "J'ai peur du noir"

```
INPUT: "j'ai peur du noir"

STAGE 0 — Normalization: "j'ai peur du noir" (pas de changement)

STAGE 1 — Deep Understanding:
  explicit: PEUR (0.95)
  implicit: seek_comfort (0.90)
  need: security (intensity: 4)
  goal: be_reassured
  ambiguity: 0.1

STAGE 2 — Priority:
  safety: 3, emotion: 8, urgency: 8, context: 5, history: 3
  total: 58 → HIGH
  requiresEmpathyFirst: true

STAGE 3 — Cognition:
  WHY: rassurer (primary), aucun (secondary)
  WHAT: empathy_pure, includeMemory=false
  HOW: calme, warm_supportive, short, opening=empathy

STAGE 4 — Orchestrator:
  Scene: emotional (new)
  Action: spawn
  
STAGE 5 — Response Assembly:
  Template: "C'est normal d'avoir un peu peur du noir, tu sais.
             Moi Bobby, je suis là avec toi. 
             Tu veux que je te raconte une histoire pour t'aider ?"

STAGE 6 — Personality (empathy=0.9, energy=0.3):
  → Ton très doux, rythme lent, pas d'emoji excité

STAGE 7 — Safety: ✅ | Feedback: no_check (clair)

OUTPUT: "C'est normal d'avoir un peu peur du noir, tu sais.
         Moi Bobby, je suis là avec toi.
         Tu veux que je te raconte une histoire pour t'aider ?"

TOTAL: 45ms (100% local)
```

### Exemple 2 : "C'est nul" (ambigu)

```
INPUT: "c'est nul"

STAGE 1 — Deep Understanding:
  explicit: GENERAL (0.40) ← ambigu !
  implicit: express_frustration (0.45)
  need: expression (intensity: 3)
  goal: be_heard
  ambiguity: 0.70 ← élevée !
  requiresConfirmation: true

STAGE 2 — Priority:
  total: 42 → NORMAL

STAGE 3 — Cognition:
  WHY: ecouter
  WHAT: clarify (car ambiguity > 0.6)
  HOW: calme, curious, short

STAGE 7 — Feedback Loop:
  type: explicit_confirm
  phrase: "Qu'est-ce qui est nul ? Tu veux m'en parler ?"

OUTPUT: "Qu'est-ce qui est nul ? Tu veux m'en parler ? 🤔"

→ L'enfant répond: "le jeu c'est trop dur"
→ STAGE 1 re-run: explicit=ECHEC, implicit=express_frustration, 
  need=competence, goal=be_heard
→ Bobby: "Ah je comprends, c'est frustrant quand c'est trop dur !
   Tu veux un petit conseil, ou on fait une pause ?"
```

### Exemple 3 : Interruption en plein jeu

```
Bobby est en train de jouer aux devinettes (Scene: game, turn 4)

INPUT: "maman elle a crié sur moi"

STAGE 1 — Deep Understanding:
  explicit: CONFLIT_FAMILLE (0.85)
  implicit: process_emotion (0.80)
  need: security (intensity: 4)
  goal: be_heard

STAGE 2 — Priority:
  safety: 5, emotion: 8, urgency: 9, context: 2, history: 5
  total: 63 → HIGH
  interruptCurrent: false (pas critique)
  requiresEmpathyFirst: true

STAGE 4 — Orchestrator:
  Action: INTERRUPT → pause game scene
  New scene: emotional
  Resume context: "devinette animaux, tour 4"

OUTPUT: "Oh... C'est pas facile quand maman crie.
         Tu veux me raconter ce qui s'est passé ? Je t'écoute. 💙"

→ (Après 3 tours d'écoute, Bobby propose de reprendre)
→ "Merci de m'avoir raconté. Ça me fait plaisir que tu me fasses confiance.
    Au fait, on en était au tour 4 de notre jeu de devinettes — on continue ? 😊"
```

---

## 🔥 RÉSUMÉ : CE QUI CHANGE V6 → V7

| Composant | V6 | V7 |
|-----------|-----|-----|
| Intent | 1 niveau (explicite) | 4 niveaux (explicite, implicite, besoin, goal) |
| Priorité | Implicite dans goals.ts | Module dédié, score 0-100, 5 dimensions |
| Cognition | Goal + Strategy | WHY/WHAT/HOW triple décision + plan B |
| Conversation | Flow linéaire | Scenes + transitions + interruptions + reprise |
| Compréhension | Pas de vérification | Feedback loop + correction temps réel |
| Personnalité | 5 axes, modulation simple | 5+4 axes, évolution long-terme, cohérence |
| Mémoire | Facts + interests | Mémoire relationnelle complète |
| LLM | Fallback uniquement | Augmentation ciblée avec budget latence |
| Auto-learning | V1 (trust + quality) | V2 (A/B testing + drift monitoring) |
| Performance | ~200ms local | <120ms local (parallélisation) |

---

*Ce document est directement implémentable. Chaque section contient le pseudo-code TypeScript, les types, et la logique nécessaires pour coder les modules V7.*
