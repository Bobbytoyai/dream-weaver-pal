# 🧠 BOBBY BRAIN V8 — Architecture Complète

> **Version**: 8.0 — "Companion Intelligence"  
> **Date**: 2026-04-14  
> **Auteur**: Architecture IA  
> **Objectif**: Transformer Bobby d'un agent conversationnel en compagnon cognitif + social + relationnel  
> **Contraintes**: <700ms latence, 90-95% offline, sécurité enfant maximale, 3-12 ans

---

## TABLE DES MATIÈRES

1. [Pipeline V8 Complet](#1-pipeline-v8-complet)
2. [Theory of Mind Engine](#2-theory-of-mind-engine)
3. [Child World Model](#3-child-world-model)
4. [Deep Goal & Need Engine V2](#4-deep-goal--need-engine-v2)
5. [Advanced Cognition Engine V2](#5-advanced-cognition-engine-v2)
6. [Conversation Orchestration V2](#6-conversation-orchestration-v2)
7. [Proactive Initiative Engine](#7-proactive-initiative-engine)
8. [Response Variation Engine](#8-response-variation-engine)
9. [Silence & Attention Engine](#9-silence--attention-engine)
10. [Relationship Evolution Engine](#10-relationship-evolution-engine)
11. [Uncertainty Management Engine](#11-uncertainty-management-engine)
12. [Micro-LLM Augmentation V2](#12-micro-llm-augmentation-v2)
13. [Safe Learning System V3](#13-safe-learning-system-v3)
14. [Performance Architecture](#14-performance-architecture)

---

## ÉVOLUTION V7 → V8

| Dimension | V7 | V8 |
|---|---|---|
| Compréhension | 4 niveaux (explicit → goal) | 6 niveaux (+ ToM + World Model) |
| Cognition | WHY/WHAT/HOW | WHY/WHAT/HOW/WHEN/WHO |
| Proactivité | Aucune (réactif pur) | Initiative Engine avec déclencheurs |
| Variation | Templates statiques | Variation Engine dynamique |
| Silence | Timer fixe (30s/60s) | Intelligence du silence contextuelle |
| Relation | Score linéaire | Phases évolutives + mémoire émotionnelle |
| Incertitude | ambiguityScore simple | Uncertainty Engine multi-stratégies |
| Réponse | Assembly 3 phases | Assembly 5 phases + Variation Engine |
| LLM | Fallback Layer 3 | Augmentation intelligente ciblée |
| Apprentissage | Auto-learning basique | Safe Learning V3 avec scoring qualité |

---

## 1. 🔄 PIPELINE V8 COMPLET

```
VOICE/TEXT INPUT
    ↓
┌─────────────────────────────────────────────────────┐
│  STAGE 0: PREPROCESSING (<5ms)                       │
│  ├─ STT normalization                                │
│  ├─ Language detection                               │
│  └─ Gibberish / noise filter                         │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│  STAGE 1: DEEP UNDERSTANDING (<15ms)                 │
│  ├─ NLU (V7 intentEngine)                            │
│  ├─ Deep Intent & Goal Engine V2                     │
│  ├─ 🔥 Theory of Mind snapshot                       │
│  └─ 🔥 Child World Model check                       │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│  STAGE 2: DECISION (<10ms)                           │
│  ├─ Priority Engine (5-dim scoring)                  │
│  ├─ 🔥 Uncertainty Engine                            │
│  ├─ Cognition V2 (WHY/WHAT/HOW/WHEN/WHO)            │
│  └─ 🔥 Proactive Initiative check                    │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│  STAGE 3: CONTENT GENERATION (<300ms)                │
│  ├─ Strategy Selector                                │
│  ├─ Layer 1: LocalBrain (templates)                  │
│  ├─ Layer 2: Knowledge Base (TF-IDF)                 │
│  ├─ Layer 3: Micro-LLM V2 (augmentation)             │
│  └─ Conversation Orchestration V2                    │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│  STAGE 4: RESPONSE SHAPING (<10ms)                   │
│  ├─ Response Assembly V2 (5 phases)                  │
│  ├─ 🔥 Variation Engine                              │
│  ├─ Personality Engine                               │
│  ├─ Age simplification                               │
│  └─ Safety filter                                    │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│  STAGE 5: POST-PROCESSING (<5ms)                     │
│  ├─ Understanding Feedback Loop                      │
│  ├─ 🔥 Silence & Attention Engine                    │
│  └─ 🔥 Relationship Memory Update                    │
└────────────────────┬────────────────────────────────┘
                     ↓
                 TTS OUTPUT
```

**Budget latence total**: 5 + 15 + 10 + 300 + 10 + 5 = **~345ms** (offline), **~650ms** (avec LLM)

---

## 2. 🧠 THEORY OF MIND ENGINE

### 2.1 Concept

La Theory of Mind (ToM) modélise ce que l'enfant **croit, comprend et ressent** — pas ce qu'il **dit**. C'est la différence entre un chatbot et un compagnon.

**Exemple**: L'enfant dit "le père Noël va m'apporter un dragon". 
- Un chatbot répond: "Les dragons n'existent pas."
- Bobby V8 (avec ToM): comprend que l'enfant **croit** au Père Noël et **imagine** le dragon → répond avec émerveillement.

### 2.2 Architecture

```typescript
// src/lib/bobby/v8/theoryOfMind.ts

interface MentalModel {
  // Ce que l'enfant CROIT être vrai
  beliefs: {
    aboutSelf: Belief[];       // "je suis nul en maths", "je suis courageux"
    aboutWorld: Belief[];       // "le père Noël existe", "les monstres sont sous le lit"
    aboutBobby: Belief[];       // "Bobby est mon ami", "Bobby sait tout"
    confidence: number;         // 0-1, confiance dans le modèle
  };

  // Ce que l'enfant COMPREND
  understanding: {
    cognitiveLevel: CognitiveLevel;  // concret, transitionnel, abstrait
    vocabularyLevel: "basic" | "moderate" | "advanced";
    canDistinguishRealFiction: boolean;
    canHandleNuance: boolean;
    conceptsGrasped: string[];     // concepts déjà compris dans la session
    conceptsStruggled: string[];   // concepts qui ont posé problème
  };

  // Ce que l'enfant RESSENT réellement (vs ce qu'il dit)
  emotionalState: {
    surfaceEmotion: EmotionType;     // ce qu'il montre
    inferredEmotion: EmotionType;    // ce qu'on pense qu'il ressent
    emotionDelta: number;            // écart surface/profond (0 = cohérent)
    emotionalTrajectory: "improving" | "stable" | "declining";
  };

  // Ce que l'enfant ATTEND de Bobby
  expectations: {
    wantsFun: number;        // 0-1
    wantsComfort: number;    // 0-1
    wantsKnowledge: number;  // 0-1
    wantsControl: number;    // 0-1
    expectationShift: string | null;  // changement récent détecté
  };
}

interface Belief {
  content: string;         // "les dinosaures existent encore"
  type: "factual" | "emotional" | "social" | "fantasy";
  confidence: number;      // 0-1, combien Bobby est sûr de cette croyance
  source: "stated" | "inferred" | "pattern";
  timestamp: number;
}

type CognitiveLevel = "preoperational" | "concrete" | "transitional" | "formal";
```

### 2.3 Déduction du Niveau Cognitif

```typescript
function inferCognitiveLevel(age: number, signals: CognitiveSignals): CognitiveLevel {
  // Baseline par âge (Piaget adapté)
  let baseline: CognitiveLevel;
  if (age <= 5) baseline = "preoperational";
  else if (age <= 8) baseline = "concrete";
  else if (age <= 10) baseline = "transitional";
  else baseline = "formal";

  // Ajustements par signaux observés
  // L'enfant utilise "parce que" correctement → +1 niveau
  if (signals.usesCausalReasoning && baseline === "preoperational") {
    baseline = "concrete";
  }
  // L'enfant confond corrélation et causalité → -1 niveau
  if (signals.confusesCausality && baseline !== "preoperational") {
    baseline = "preoperational";
  }
  // L'enfant formule des hypothèses → au moins transitionnel
  if (signals.formulatesHypotheses) {
    baseline = baseline === "preoperational" ? "concrete" : 
               baseline === "concrete" ? "transitional" : baseline;
  }

  return baseline;
}

interface CognitiveSignals {
  usesCausalReasoning: boolean;    // "parce que X, alors Y"
  confusesCausality: boolean;      // "il pleut parce que je suis triste"
  formulatesHypotheses: boolean;   // "et si on faisait..."
  understandsIrony: boolean;       // détecte le second degré
  canAbstract: boolean;            // "l'amitié c'est important"
  canReversible: boolean;          // "si A > B alors B < A"
}
```

### 2.4 Mise à Jour Dynamique du Modèle Mental

```typescript
/**
 * Appelé à chaque tour. Met à jour le modèle mental avec les signaux du tour.
 * <3ms, offline.
 */
function updateMentalModel(
  current: MentalModel,
  frame: UnderstandingFrame,
  userText: string,
  bobbyResponse: string,
): MentalModel {
  const updated = structuredClone(current);

  // ── Extraction de croyances ──
  const newBeliefs = extractBeliefs(userText, frame);
  for (const belief of newBeliefs) {
    // Merge: si croyance contradictoire, remplacer avec confidence réduite
    const existing = updated.beliefs.aboutWorld.find(b => b.content === belief.content);
    if (existing) {
      existing.confidence = (existing.confidence + belief.confidence) / 2;
      existing.timestamp = Date.now();
    } else {
      updated.beliefs.aboutWorld.push(belief);
    }
  }

  // ── Mise à jour de la compréhension ──
  const cogSignals = detectCognitiveSignals(userText);
  updated.understanding.cognitiveLevel = inferCognitiveLevel(
    0, // age comes from context
    cogSignals,
  );

  // ── Tracking des concepts ──
  if (frame.userGoal === "learn_something") {
    const topic = frame.explicitIntent;
    if (!updated.understanding.conceptsGrasped.includes(topic)) {
      // On le met en "grasped" pour l'instant, on le déplacera en "struggled"
      // si l'enfant repose la même question
      updated.understanding.conceptsGrasped.push(topic);
    }
  }

  // ── Mise à jour émotionnelle ──
  updated.emotionalState.surfaceEmotion = frame.emotion.type;
  // L'émotion inférée combine le dit et le contexte
  if (frame.implicitIntent === "seek_comfort" && frame.emotion.type === "neutral") {
    updated.emotionalState.inferredEmotion = "sadness";
    updated.emotionalState.emotionDelta = 0.5;
  } else {
    updated.emotionalState.inferredEmotion = frame.emotion.type;
    updated.emotionalState.emotionDelta = 0;
  }

  // ── Mise à jour des attentes ──
  updated.expectations = updateExpectations(updated.expectations, frame);

  // ── Confiance du modèle augmente avec les tours ──
  updated.beliefs.confidence = Math.min(1, updated.beliefs.confidence + 0.02);

  return updated;
}
```

### 2.5 Extraction de Croyances

```typescript
const BELIEF_PATTERNS: Array<{ pattern: RegExp; type: Belief["type"]; extract: (m: RegExpMatchArray) => string }> = [
  // Croyances factuelles
  { pattern: /(?:les? |la |le |l')(\w+ (?:existe|sont vraies?|c'est vrai))/i, type: "factual", extract: m => m[1] },

  // Croyances sur soi
  { pattern: /je suis ([\w\s]+)/i, type: "emotional", extract: m => `croit être ${m[1]}` },
  { pattern: /je (n'?arrive|ne sais?) pas/i, type: "emotional", extract: m => `difficulté perçue` },

  // Croyances fantasy
  { pattern: /(père noël|fée|monstre|dragon|licorne|magie)/i, type: "fantasy", extract: m => `croit en ${m[1]}` },

  // Croyances sociales
  { pattern: /(personne|tout le monde|les autres) (?:m'aime|me déteste|est méchant)/i, type: "social", extract: m => `perception sociale: ${m[0]}` },
];

function extractBeliefs(text: string, frame: UnderstandingFrame): Belief[] {
  const beliefs: Belief[] = [];
  for (const { pattern, type, extract } of BELIEF_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      beliefs.push({
        content: extract(match),
        type,
        confidence: frame.intentConfidence * 0.8,
        source: "stated",
        timestamp: Date.now(),
      });
    }
  }
  return beliefs;
}
```

### 2.6 Impact sur les Réponses

```typescript
/**
 * La ToM influence 3 aspects de la réponse :
 * 1. Vocabulaire (adapté au niveau de compréhension)
 * 2. Contenu (respecte les croyances de l'enfant)
 * 3. Ton (aligné sur l'émotion inférée, pas la surface)
 */
function applyToMToResponse(
  response: string,
  model: MentalModel,
  plan: CognitionPlan,
): string {
  let adjusted = response;

  // ── Ajustement vocabulaire ──
  if (model.understanding.cognitiveLevel === "preoperational") {
    // Simplifier drastiquement
    adjusted = adjusted.replace(/parce que/g, "car");
    adjusted = adjusted.replace(/cependant|néanmoins|toutefois/g, "mais");
    // Limiter à 2 phrases
    const sentences = adjusted.match(/[^.!?]+[.!?]+/g);
    if (sentences && sentences.length > 2) {
      adjusted = sentences.slice(0, 2).join(" ");
    }
  }

  // ── Respect des croyances fantasy ──
  const fantasyBeliefs = model.beliefs.aboutWorld.filter(b => b.type === "fantasy");
  for (const belief of fantasyBeliefs) {
    // Ne jamais contredire une croyance fantasy (Père Noël, fée, etc.)
    if (adjusted.match(/n'existe pas|pas vrai|pas réel/i)) {
      adjusted = adjusted.replace(
        /(?:ça |ce )n'existe pas|(?:ce n'est )?pas vrai|pas réel/gi,
        "c'est magique"
      );
    }
  }

  // ── Alignement émotionnel ──
  if (model.emotionalState.emotionDelta > 0.3) {
    // L'enfant masque une émotion → Bobby répond à l'émotion inférée
    // Le plan devrait déjà refléter cela via la ToM
  }

  return adjusted;
}
```

---

## 3. 🌍 CHILD WORLD MODEL

### 3.1 Concept

Le Child World Model encode la **logique cognitive typique** d'un enfant à chaque âge. Il permet à Bobby de prédire les erreurs de raisonnement et d'adapter ses explications.

### 3.2 Architecture

```typescript
// src/lib/bobby/v8/childWorldModel.ts

interface ChildWorldModel {
  ageGroup: AgeGroup;
  cognitiveTraits: CognitiveTraits;
  worldRules: WorldRule[];        // Ce que l'enfant considère comme "normal"
  confusionZones: ConfusionZone[]; // Zones de confusion typiques
}

type AgeGroup = "toddler_3_4" | "preschool_5_6" | "early_school_7_8" | "mid_school_9_10" | "preteen_11_12";

interface CognitiveTraits {
  // Capacités par âge (baseline, ajusté par observation)
  causalReasoning: number;       // 0-1: comprend cause → effet
  timePerception: number;        // 0-1: comprend passé/futur
  abstractThinking: number;      // 0-1: pense au-delà du concret
  empathyCapacity: number;       // 0-1: peut se mettre à la place d'autrui
  humorComprehension: number;    // 0-1: comprend l'humour
  realFictionBoundary: number;   // 0-1: distingue réel/fiction
  attentionSpan: number;         // en minutes
  workingMemorySlots: number;    // nombre de concepts simultanés
}

interface WorldRule {
  rule: string;                  // "les animaux parlent dans les histoires"
  ageRange: [number, number];    // [3, 6]
  impact: "adapt_content" | "avoid_contradiction" | "explain_gently";
}

interface ConfusionZone {
  topic: string;                 // "temps", "mort", "bébés"
  typicalAge: [number, number];
  typicalError: string;          // "pense que le passé est 'hier'"
  bobbyStrategy: string;         // "utiliser des repères concrets"
}
```

### 3.3 Profils Cognitifs par Âge

```typescript
const AGE_PROFILES: Record<AgeGroup, CognitiveTraits> = {
  toddler_3_4: {
    causalReasoning: 0.2,
    timePerception: 0.1,
    abstractThinking: 0.05,
    empathyCapacity: 0.2,
    humorComprehension: 0.3,  // humour physique
    realFictionBoundary: 0.1,
    attentionSpan: 3,          // minutes
    workingMemorySlots: 2,
  },
  preschool_5_6: {
    causalReasoning: 0.4,
    timePerception: 0.3,
    abstractThinking: 0.15,
    empathyCapacity: 0.4,
    humorComprehension: 0.5,
    realFictionBoundary: 0.3,
    attentionSpan: 7,
    workingMemorySlots: 3,
  },
  early_school_7_8: {
    causalReasoning: 0.65,
    timePerception: 0.6,
    abstractThinking: 0.35,
    empathyCapacity: 0.6,
    humorComprehension: 0.7,
    realFictionBoundary: 0.7,
    attentionSpan: 12,
    workingMemorySlots: 4,
  },
  mid_school_9_10: {
    causalReasoning: 0.8,
    timePerception: 0.8,
    abstractThinking: 0.55,
    empathyCapacity: 0.75,
    humorComprehension: 0.85,
    realFictionBoundary: 0.9,
    attentionSpan: 18,
    workingMemorySlots: 5,
  },
  preteen_11_12: {
    causalReasoning: 0.9,
    timePerception: 0.9,
    abstractThinking: 0.7,
    empathyCapacity: 0.85,
    humorComprehension: 0.95,
    realFictionBoundary: 0.95,
    attentionSpan: 25,
    workingMemorySlots: 6,
  },
};
```

### 3.4 Zones de Confusion

```typescript
const CONFUSION_ZONES: ConfusionZone[] = [
  {
    topic: "temps",
    typicalAge: [3, 6],
    typicalError: "Confond hier/demain, ne comprend pas 'dans 2 jours'",
    bobbyStrategy: "Utiliser des repères concrets: 'après 2 dodos'",
  },
  {
    topic: "mort",
    typicalAge: [4, 7],
    typicalError: "Pense que la mort est réversible ou temporaire",
    bobbyStrategy: "Ne pas contredire, rassurer, rediriger vers un adulte si besoin",
  },
  {
    topic: "quantité",
    typicalAge: [3, 5],
    typicalError: "Conservation non acquise (même quantité = plus si étalé)",
    bobbyStrategy: "Utiliser des comparaisons visuelles simples",
  },
  {
    topic: "causalité",
    typicalAge: [3, 6],
    typicalError: "Pensée magique: 'il pleut parce que je suis triste'",
    bobbyStrategy: "Accepter puis glisser vers l'explication réelle avec douceur",
  },
  {
    topic: "perspective",
    typicalAge: [3, 7],
    typicalError: "Égocentrisme: pense que tout le monde voit/sait ce qu'il voit/sait",
    bobbyStrategy: "Poser des questions pour décentrer: 'et ta maman, elle pense quoi?'",
  },
  {
    topic: "réel_fiction",
    typicalAge: [3, 7],
    typicalError: "Mélange personnages fictifs et réalité",
    bobbyStrategy: "Entrer dans l'imaginaire avec l'enfant, ne pas corriger brutalement",
  },
  {
    topic: "ironie",
    typicalAge: [6, 9],
    typicalError: "Prend l'ironie au premier degré",
    bobbyStrategy: "Éviter l'ironie avant 8 ans, utiliser humour littéral",
  },
];

/**
 * Vérifie si la réponse de Bobby entre dans une zone de confusion
 * et ajuste si nécessaire.
 */
function checkConfusionZones(
  response: string,
  topic: string,
  age: number,
  model: ChildWorldModel,
): { adjusted: string; warning: string | null } {
  const zone = model.confusionZones.find(
    z => z.topic === topic && age >= z.typicalAge[0] && age <= z.typicalAge[1]
  );

  if (!zone) return { adjusted: response, warning: null };

  return {
    adjusted: response, // Le moteur d'assemblage utilisera la stratégie
    warning: `⚠️ Zone de confusion "${zone.topic}": ${zone.typicalError}. Stratégie: ${zone.bobbyStrategy}`,
  };
}
```

### 3.5 Adaptation de Contenu

```typescript
/**
 * Adapte le contenu en fonction du modèle du monde de l'enfant.
 * Exécution: <2ms.
 */
function adaptToChildWorld(
  response: string,
  model: ChildWorldModel,
): string {
  const traits = model.cognitiveTraits;
  let adapted = response;

  // ── Limiter la complexité au working memory ──
  // Si l'enfant a 3 slots, max 3 informations par réponse
  const infoCount = (adapted.match(/[.!?]+/g) || []).length;
  if (infoCount > traits.workingMemorySlots) {
    const sentences = adapted.match(/[^.!?]+[.!?]+/g) || [];
    adapted = sentences.slice(0, traits.workingMemorySlots).join(" ");
  }

  // ── Éviter les concepts abstraits si niveau bas ──
  if (traits.abstractThinking < 0.3) {
    // Remplacer les concepts abstraits par des exemples concrets
    adapted = adapted.replace(/la justice/gi, "quand c'est juste pour tout le monde");
    adapted = adapted.replace(/la liberté/gi, "quand on peut choisir");
    adapted = adapted.replace(/l'amitié/gi, "quand on a un super copain");
  }

  // ── Adapter les références temporelles ──
  if (traits.timePerception < 0.3) {
    adapted = adapted.replace(/il y a (\d+) ans/gi, "il y a très longtemps");
    adapted = adapted.replace(/dans (\d+) jours/gi, (_, n) => `après ${n} dodos`);
    adapted = adapted.replace(/le siècle dernier/gi, "quand les arrière-grands-parents étaient petits");
  }

  return adapted;
}
```

---

## 4. 🎯 DEEP GOAL & NEED ENGINE V2

### 4.1 Évolution par Rapport à V7

V7 a 4 niveaux : explicit → implicit → need → goal.  
V8 ajoute : **deep motivation** (le VRAI pourquoi) et **goal trajectory** (vers quoi l'enfant va).

```typescript
// src/lib/bobby/v8/deepGoalEngine.ts

interface DeepGoalFrame extends UnderstandingFrame {
  // V8 additions
  deepMotivation: DeepMotivation;     // Le VRAI pourquoi sous-jacent
  goalTrajectory: GoalTrajectory;      // Où va la conversation
  socialContext: SocialContext;         // Contexte social inféré
}

type DeepMotivation =
  | "cope_with_change"      // L'enfant vit un changement (déménagement, divorce...)
  | "build_identity"        // Construction de soi ("je suis fort", "j'aime les sciences")
  | "master_fear"           // Apprivoiser une peur
  | "process_conflict"      // Traiter un conflit interpersonnel
  | "seek_belonging"        // Chercher sa place dans un groupe
  | "explore_boundaries"    // Tester les limites
  | "pure_curiosity"        // Curiosité intellectuelle pure
  | "boredom_escape"        // Fuir l'ennui
  | "emotional_regulation"  // Apprendre à gérer ses émotions
  | "none_detected";        // Pas de motivation profonde détectable

type GoalTrajectory =
  | "deepening"    // L'enfant veut aller plus loin sur le sujet
  | "widening"     // L'enfant explore des sujets connexes
  | "looping"      // L'enfant revient sur le même thème (peut être un besoin non résolu)
  | "jumping"      // L'enfant change complètement de sujet
  | "winding_down" // L'enfant se désintéresse (prêt à finir)
  | "stable";      // Conversation stable

interface SocialContext {
  mentionsOthers: boolean;        // L'enfant mentionne d'autres personnes
  socialRole: "protagonist" | "observer" | "victim" | "helper" | "none";
  relationshipFocus: string | null; // "ami", "parent", "frère", "maîtresse"
}
```

### 4.2 Détection de Motivation Profonde

```typescript
const MOTIVATION_SIGNALS: Array<{
  motivation: DeepMotivation;
  patterns: RegExp[];
  contextClues: string[];
}> = [
  {
    motivation: "cope_with_change",
    patterns: [
      /(?:on va |je vais )déménager/i,
      /(?:papa|maman) (?:est parti|va partir)/i,
      /(?:nouveau|nouvelle) (?:école|maison|bébé)/i,
      /(?:avant|quand) (?:c'était|on était)/i,
    ],
    contextClues: ["changement", "nouveau", "avant", "manque"],
  },
  {
    motivation: "build_identity",
    patterns: [
      /je suis (?:fort|intelligent|courageux|nul|bête)/i,
      /(?:quand je serai grand|plus tard)/i,
      /je (?:veux|voudrais) être/i,
      /je suis (?:comme|pas comme)/i,
    ],
    contextClues: ["identité", "comparaison", "futur", "rêve"],
  },
  {
    motivation: "master_fear",
    patterns: [
      /j'ai peur (?:de|du|des|que)/i,
      /(?:monstre|noir|seul|perdu|mourir)/i,
      /ça (?:fait|me fait) peur/i,
    ],
    contextClues: ["peur", "cauchemar", "nuit", "seul"],
  },
  {
    motivation: "process_conflict",
    patterns: [
      /(?:il|elle) (?:m'a|est) (?:tapé|poussé|insulté|embêté|méchant)/i,
      /on (?:s'est disputé|est fâché)/i,
      /(?:c'est pas juste|c'est injuste)/i,
    ],
    contextClues: ["conflit", "dispute", "injustice"],
  },
  {
    motivation: "seek_belonging",
    patterns: [
      /personne (?:m'aime|veut jouer|me parle)/i,
      /je (?:n'ai pas|suis tout seul|suis le seul)/i,
      /(?:les autres|tout le monde sauf moi)/i,
    ],
    contextClues: ["solitude", "exclusion", "groupe"],
  },
  {
    motivation: "emotional_regulation",
    patterns: [
      /je (?:suis|sais pas pourquoi je suis) (?:en colère|triste|énervé)/i,
      /j'arrive pas à (?:me calmer|arrêter de pleurer)/i,
      /(?:c'est trop|j'en peux plus)/i,
    ],
    contextClues: ["débordement", "colère", "tristesse", "frustration"],
  },
];

function detectDeepMotivation(
  text: string,
  frame: UnderstandingFrame,
  sessionHistory: string[],
): DeepMotivation {
  // 1. Pattern matching direct
  for (const signal of MOTIVATION_SIGNALS) {
    if (signal.patterns.some(p => p.test(text))) {
      return signal.motivation;
    }
  }

  // 2. Analyse de trajectoire (si l'enfant revient sur un thème)
  const topicCounts = new Map<string, number>();
  for (const msg of sessionHistory) {
    for (const signal of MOTIVATION_SIGNALS) {
      if (signal.patterns.some(p => p.test(msg))) {
        topicCounts.set(signal.motivation, (topicCounts.get(signal.motivation) || 0) + 1);
      }
    }
  }
  // Si un thème revient 3+ fois → motivation profonde
  for (const [motivation, count] of topicCounts) {
    if (count >= 3) return motivation as DeepMotivation;
  }

  // 3. Par défaut
  if (frame.userGoal === "learn_something") return "pure_curiosity";
  if (frame.userGoal === "have_fun") return "boredom_escape";

  return "none_detected";
}
```

### 4.3 Trajectoire Conversationnelle

```typescript
function detectGoalTrajectory(
  currentFrame: UnderstandingFrame,
  sessionContext: SessionContext,
  lastFrames: UnderstandingFrame[],  // 5 derniers frames
): GoalTrajectory {
  if (lastFrames.length < 2) return "stable";

  const lastTopic = lastFrames[lastFrames.length - 1]?.explicitIntent;
  const currentTopic = currentFrame.explicitIntent;

  // Même sujet, profondeur croissante
  if (lastTopic === currentTopic && sessionContext.topicDepth > 2) {
    return "deepening";
  }

  // Sujet lié mais différent
  if (lastTopic !== currentTopic && areRelatedTopics(lastTopic, currentTopic)) {
    return "widening";
  }

  // Retour sur un sujet vu plus tôt
  const previousTopics = lastFrames.map(f => f.explicitIntent);
  if (previousTopics.slice(0, -1).includes(currentTopic)) {
    return "looping"; // Signal potentiel de besoin non résolu
  }

  // Changement radical
  if (lastTopic !== currentTopic && !areRelatedTopics(lastTopic, currentTopic)) {
    // Vérifier si c'est un désengagement
    if (currentFrame.emotion.intensity < 2 && currentFrame.ambiguityScore > 0.5) {
      return "winding_down";
    }
    return "jumping";
  }

  return "stable";
}

function areRelatedTopics(a: string, b: string): boolean {
  const RELATED_GROUPS = [
    ["QUESTION", "QUESTION_SIMPLE", "EDUCATION"],
    ["PLAY_REQUEST", "JOKE_REQUEST", "GAME"],
    ["EMOTION_NEGATIVE", "PEUR", "TRISTESSE", "COLERE"],
    ["EMOTION_POSITIVE", "JOIE", "COMPLIMENT"],
    ["STORY_REQUEST", "NARRATION"],
  ];
  return RELATED_GROUPS.some(group => group.includes(a) && group.includes(b));
}
```

---

## 5. 🧠 ADVANCED COGNITION ENGINE V2

### 5.1 Extension WHY/WHAT/HOW → WHY/WHAT/HOW/WHEN/WHO

```typescript
// src/lib/bobby/v8/cognitionV8.ts

interface CognitionPlanV8 extends CognitionPlan {
  // V7: why, what, how

  // V8: WHEN — Timing de la réponse
  when: {
    shouldDelay: boolean;          // Faut-il attendre avant de répondre?
    delayMs: number;               // Délai suggéré (simule la réflexion)
    shouldPause: boolean;          // Pause dramatique mid-response?
    timingReason: string;          // Pourquoi ce timing
  };

  // V8: WHO — Qui Bobby est dans ce contexte
  who: {
    role: BobbyRole;               // Quel rôle Bobby joue
    relationshipMode: RelationshipMode;  // Comment Bobby se rapporte à l'enfant
    boundaryAwareness: string[];   // Limites à respecter
  };

  // V8: Meta enrichi
  tomInfluence: string;             // Comment la ToM a influencé la décision
  worldModelCheck: string | null;   // Warning du Child World Model
  motivationResponse: string | null; // Comment on adresse la motivation profonde
}

type BobbyRole =
  | "playmate"       // Copain de jeu
  | "teacher"        // Guide éducatif
  | "comfort"        // Soutien émotionnel
  | "cheerleader"    // Encourageur
  | "storyteller"    // Conteur
  | "explorer"       // Co-explorateur
  | "listener"       // Oreille attentive
  | "guardian";       // Protecteur (sécurité)

type RelationshipMode =
  | "discovering"    // Bobby et l'enfant se découvrent
  | "building"       // Construction de la confiance
  | "established"    // Relation établie
  | "intimate";      // Complicité profonde
```

### 5.2 Arbre de Décision Étendu

```typescript
function buildCognitionPlanV8(
  frame: DeepGoalFrame,
  priority: PriorityDecision,
  session: SessionContext,
  tom: MentalModel,
  worldModel: ChildWorldModel,
  relationship: RelationshipState,
): CognitionPlanV8 {
  // ── WHY (V7 base + V8 motivation) ──
  const basePlan = buildCognitionPlan(frame, priority, session);

  // ── WHEN — Timing intelligent ──
  const when = decideTimming(frame, tom, session);

  // ── WHO — Rôle contextuel ──
  const who = decideRole(frame, priority, relationship, tom);

  // ── ToM influence ──
  let tomInfluence = "";
  if (tom.emotionalState.emotionDelta > 0.3) {
    tomInfluence = `Émotion masquée détectée (surface: ${tom.emotionalState.surfaceEmotion}, inféré: ${tom.emotionalState.inferredEmotion}) → ajustement ton`;
    // Override tone to match inferred emotion
    if (tom.emotionalState.inferredEmotion === "sadness") {
      basePlan.how.tone = "warm_supportive";
    }
  }

  // ── World Model check ──
  let worldModelCheck: string | null = null;
  const confusionCheck = checkConfusionZones(
    "", // response pas encore générée
    frame.explicitIntent,
    session.turnCount, // proxy pour l'âge, sera remplacé
    worldModel,
  );
  if (confusionCheck.warning) {
    worldModelCheck = confusionCheck.warning;
  }

  // ── Deep motivation response ──
  let motivationResponse: string | null = null;
  if (frame.deepMotivation !== "none_detected" && frame.deepMotivation !== "pure_curiosity") {
    motivationResponse = MOTIVATION_STRATEGIES[frame.deepMotivation];
  }

  return {
    ...basePlan,
    when,
    who,
    tomInfluence,
    worldModelCheck,
    motivationResponse,
  };
}
```

### 5.3 Timing Intelligent

```typescript
function decideTimming(
  frame: DeepGoalFrame,
  tom: MentalModel,
  session: SessionContext,
): CognitionPlanV8["when"] {
  // Réponse émotionnelle → petit délai (simule l'empathie)
  if (frame.emotionalNeed === "security" || frame.emotion.intensity >= 4) {
    return {
      shouldDelay: true,
      delayMs: 400,  // Pause empathique
      shouldPause: false,
      timingReason: "empathy_pause",
    };
  }

  // Question de réflexion → délai moyen
  if (frame.userGoal === "learn_something" && frame.deepMotivation === "pure_curiosity") {
    return {
      shouldDelay: true,
      delayMs: 200,
      shouldPause: false,
      timingReason: "thinking_pause",
    };
  }

  // Jeu → réponse rapide
  if (frame.userGoal === "have_fun") {
    return {
      shouldDelay: false,
      delayMs: 0,
      shouldPause: false,
      timingReason: "fast_fun",
    };
  }

  // Défaut
  return {
    shouldDelay: false,
    delayMs: 100,
    shouldPause: false,
    timingReason: "default",
  };
}
```

### 5.4 Sélection du Rôle

```typescript
function decideRole(
  frame: DeepGoalFrame,
  priority: PriorityDecision,
  relationship: RelationshipState,
  tom: MentalModel,
): CognitionPlanV8["who"] {
  let role: BobbyRole;
  let relationshipMode: RelationshipMode;

  // ── Rôle par contexte ──
  if (priority.scores.safety >= 7) {
    role = "guardian";
  } else if (priority.requiresEmpathyFirst) {
    role = tom.emotionalState.inferredEmotion === "sadness" ? "comfort" : "listener";
  } else if (frame.userGoal === "have_fun") {
    role = "playmate";
  } else if (frame.userGoal === "learn_something") {
    role = "teacher";
  } else if (frame.userGoal === "be_heard") {
    role = "listener";
  } else if (frame.userGoal === "share_joy") {
    role = "cheerleader";
  } else {
    role = "explorer";
  }

  // ── Mode relationnel ──
  if (relationship.totalInteractions < 10) {
    relationshipMode = "discovering";
  } else if (relationship.totalInteractions < 50) {
    relationshipMode = "building";
  } else if (relationship.totalInteractions < 200) {
    relationshipMode = "established";
  } else {
    relationshipMode = "intimate";
  }

  // ── Limites ──
  const boundaryAwareness: string[] = [];
  if (role === "comfort" && frame.deepMotivation === "cope_with_change") {
    boundaryAwareness.push("Ne pas minimiser le changement");
    boundaryAwareness.push("Rediriger vers un adulte si sujet trop lourd");
  }
  if (role === "teacher" && tom.understanding.cognitiveLevel === "preoperational") {
    boundaryAwareness.push("Pas de concepts abstraits");
    boundaryAwareness.push("Max 1 information nouvelle");
  }

  return { role, relationshipMode, boundaryAwareness };
}
```

---

## 6. 🎬 CONVERSATION ORCHESTRATION V2

### 6.1 Évolution : Scènes → Arcs Narratifs

V7 gère des scènes individuelles. V8 introduit des **arcs narratifs** — séquences de scènes liées par un fil conducteur.

```typescript
// src/lib/bobby/v8/orchestratorV8.ts

interface NarrativeArc {
  id: string;
  theme: string;               // "exploration de l'espace", "apprivoiser sa peur"
  scenes: ConversationScene[];
  progressionGoal: string;     // Objectif de l'arc entier
  currentPhase: ArcPhase;
  estimatedTurnsLeft: number;
}

type ArcPhase =
  | "hook"         // Capturer l'attention
  | "explore"      // Développer le sujet
  | "climax"       // Moment fort (découverte, résolution)
  | "resolution"   // Conclusion satisfaisante
  | "callback";    // Rappel futur ("la prochaine fois, on ira encore plus loin!")
```

### 6.2 Gestion Avancée des Interruptions

```typescript
interface InterruptionAnalysis {
  type: "topic_switch" | "emotional_shift" | "boredom" | "external" | "curiosity_spike";
  severity: "soft" | "hard" | "critical";
  canIntegrate: boolean;     // Peut-on intégrer dans la scène actuelle?
  shouldResumeLater: boolean;
  transitionPhrase: string;
}

function analyzeInterruption(
  currentScene: ConversationScene,
  newFrame: DeepGoalFrame,
  priority: PriorityDecision,
): InterruptionAnalysis {
  // Changement émotionnel soudain → critique
  if (priority.requiresEmpathyFirst && currentScene.type !== "emotional") {
    return {
      type: "emotional_shift",
      severity: "critical",
      canIntegrate: false,
      shouldResumeLater: currentScene.progressionScore < 0.8,
      transitionPhrase: "", // L'empathie prime, pas besoin de transition
    };
  }

  // L'enfant s'ennuie → changement doux
  if (newFrame.goalTrajectory === "winding_down") {
    return {
      type: "boredom",
      severity: "soft",
      canIntegrate: false,
      shouldResumeLater: false, // L'enfant ne veut pas y revenir
      transitionPhrase: "OK, on fait autre chose ! ",
    };
  }

  // Pic de curiosité → intégrable
  if (newFrame.goalTrajectory === "widening" && currentScene.type === "learning") {
    return {
      type: "curiosity_spike",
      severity: "soft",
      canIntegrate: true,
      shouldResumeLater: false,
      transitionPhrase: "Oh, bonne question ! ",
    };
  }

  // Changement de sujet standard
  return {
    type: "topic_switch",
    severity: "soft",
    canIntegrate: false,
    shouldResumeLater: currentScene.progressionScore > 0.3 && currentScene.progressionScore < 0.8,
    transitionPhrase: "D'accord ! ",
  };
}
```

---

## 7. 🚀 PROACTIVE INITIATIVE ENGINE

### 7.1 Concept

Bobby ne se contente plus d'attendre — il **initie** des interactions quand le contexte le justifie.

```typescript
// src/lib/bobby/v8/proactiveEngine.ts

interface ProactiveInitiative {
  type: InitiativeType;
  trigger: InitiativeTrigger;
  content: string;            // Ce que Bobby propose
  urgency: number;            // 0-1
  nonIntrusiveLevel: number;  // 0-1 (1 = très non-intrusif)
}

type InitiativeType =
  | "suggest_activity"     // "Tu veux jouer à un jeu ?"
  | "share_fact"           // "Tu savais que les dauphins dorment avec un œil ouvert ?"
  | "emotional_checkin"    // "Ça va toi aujourd'hui ?"
  | "memory_callback"      // "La dernière fois tu m'avais parlé de..."
  | "challenge"            // "J'ai un défi pour toi !"
  | "story_hook"           // "J'ai une histoire incroyable à te raconter..."
  | "celebrate"            // "Eh, c'est notre 100ème discussion !"
  | "gentle_redirect";     // Relance après silence

type InitiativeTrigger =
  | "silence_timeout"      // Silence prolongé
  | "session_start"        // Début de session
  | "mood_opportunity"     // L'enfant est de bonne humeur → proposer un truc
  | "interest_match"       // Sujet lié à un intérêt connu
  | "milestone"            // Jalon atteint
  | "time_based"           // Heure spécifique (matin, soir)
  | "pattern_detected"     // Comportement récurrent détecté
  | "context_shift";       // Changement de contexte détecté
```

### 7.2 Règles de Non-Intrusion

```typescript
const INITIATIVE_RULES = {
  // ── Ne JAMAIS initier si ──
  blockers: [
    "child_is_speaking",          // L'enfant parle
    "emotional_scene_active",     // Scène émotionnelle en cours
    "safety_scene_active",        // Scène de sécurité en cours
    "less_than_3_turns",          // Moins de 3 tours dans la session
    "last_initiative_within_5_turns", // Initiative récente
  ],

  // ── Cooldowns ──
  cooldowns: {
    suggest_activity: 10,      // tours minimum entre deux suggestions
    share_fact: 8,
    emotional_checkin: 15,
    memory_callback: 12,
    challenge: 10,
    story_hook: 15,
    celebrate: 50,            // rare
    gentle_redirect: 3,       // peut être fréquent (silence)
  },

  // ── Heure du jour ──
  timeRules: {
    morning: ["share_fact", "challenge", "celebrate"],     // Matin → énergie
    afternoon: ["suggest_activity", "story_hook"],         // Après-midi → activité
    evening: ["emotional_checkin", "story_hook"],          // Soir → calme
    night: ["gentle_redirect"],                            // Nuit → minimal
  },
};

function shouldInitiate(
  trigger: InitiativeTrigger,
  session: SessionContext,
  relationship: RelationshipState,
): { should: boolean; initiative: ProactiveInitiative | null } {
  // Check blockers
  for (const blocker of INITIATIVE_RULES.blockers) {
    if (isBlockerActive(blocker, session)) {
      return { should: false, initiative: null };
    }
  }

  // Check cooldown
  const type = TRIGGER_TO_TYPE[trigger];
  if (type && turnsCountSinceLastInitiative(type) < INITIATIVE_RULES.cooldowns[type]) {
    return { should: false, initiative: null };
  }

  // Generate initiative
  const initiative = generateInitiative(trigger, session, relationship);
  return { should: true, initiative };
}
```

### 7.3 Initiatives Contextuelles

```typescript
function generateInitiative(
  trigger: InitiativeTrigger,
  session: SessionContext,
  relationship: RelationshipState,
): ProactiveInitiative {
  switch (trigger) {
    case "silence_timeout":
      return {
        type: "gentle_redirect",
        trigger,
        content: pickSilenceRedirect(session),
        urgency: 0.3,
        nonIntrusiveLevel: 0.9,
      };

    case "session_start":
      if (relationship.phase === "discovery") {
        return {
          type: "emotional_checkin",
          trigger,
          content: "Salut ! Comment ça va aujourd'hui ?",
          urgency: 0.5,
          nonIntrusiveLevel: 0.8,
        };
      }
      // Relation établie → rappel mémoire
      return {
        type: "memory_callback",
        trigger,
        content: buildMemoryGreeting(relationship),
        urgency: 0.4,
        nonIntrusiveLevel: 0.7,
      };

    case "interest_match":
      return {
        type: "share_fact",
        trigger,
        content: buildInterestFact(session),
        urgency: 0.3,
        nonIntrusiveLevel: 0.8,
      };

    case "milestone":
      return {
        type: "celebrate",
        trigger,
        content: buildMilestoneMessage(relationship),
        urgency: 0.6,
        nonIntrusiveLevel: 0.6,
      };

    default:
      return {
        type: "suggest_activity",
        trigger,
        content: "Tu veux qu'on fasse quelque chose de fun ?",
        urgency: 0.2,
        nonIntrusiveLevel: 0.9,
      };
  }
}
```

---

## 8. 🎲 RESPONSE VARIATION ENGINE

### 8.1 Anti-Répétition

```typescript
// src/lib/bobby/v8/variationEngine.ts

interface VariationContext {
  recentPhrases: string[];          // 20 dernières réponses
  recentOpenings: string[];         // 10 derniers débuts de phrase
  recentClosings: string[];         // 10 dernières fins
  recentEmojis: string[];           // 10 derniers emojis
  recentStructures: ResponseStructure[]; // 5 dernières structures
}

type ResponseStructure =
  | "statement"         // Affirmation simple
  | "question_then_fact" // Question + fait
  | "fact_then_question" // Fait + question
  | "exclamation_then_content" // Exclamation + contenu
  | "empathy_then_redirect"    // Empathie + redirection
  | "story_fragment"    // Fragment narratif
  | "challenge"         // Défi
  | "comparison";       // "C'est comme..."

/**
 * Vérifie et modifie une réponse pour éviter toute répétition.
 * <3ms, offline.
 */
function applyVariation(
  response: string,
  plan: CognitionPlanV8,
  context: VariationContext,
): string {
  let varied = response;

  // ── 1. Vérifier si l'ouverture a déjà été utilisée récemment ──
  const opening = extractOpening(varied);
  if (opening && context.recentOpenings.includes(opening)) {
    varied = replaceOpening(varied, plan.how.openingType, context.recentOpenings);
  }

  // ── 2. Vérifier si la structure est trop répétitive ──
  const structure = detectStructure(varied);
  const lastStructures = context.recentStructures.slice(-3);
  if (lastStructures.every(s => s === structure)) {
    // 3 mêmes structures d'affilée → forcer un changement
    varied = restructureResponse(varied, pickAlternativeStructure(structure));
  }

  // ── 3. Varier les emojis ──
  const emojis = (varied.match(/[\u{1F300}-\u{1FAFF}]/gu) || []);
  for (const emoji of emojis) {
    if (context.recentEmojis.includes(emoji)) {
      const alt = getAlternativeEmoji(emoji);
      varied = varied.replace(emoji, alt);
    }
  }

  // ── 4. Varier les expressions ──
  varied = varyExpressions(varied, context.recentPhrases);

  return varied;
}
```

### 8.2 Paraphrase Engine

```typescript
/**
 * Substitutions pour éviter les formulations identiques.
 */
const PARAPHRASE_MAP: Array<{ original: RegExp; alternatives: string[] }> = [
  { original: /C'est super/i, alternatives: ["C'est génial", "Trop bien", "J'adore", "Excellent"] },
  { original: /Tu veux/i, alternatives: ["Ça te dit de", "On pourrait", "Et si on"] },
  { original: /Tu sais quoi/i, alternatives: ["Figure-toi que", "Devine un peu", "J'ai un truc à te dire"] },
  { original: /Bonne question/i, alternatives: ["Quelle question !", "Ah, intéressant", "J'adore quand tu demandes ça"] },
  { original: /Je comprends/i, alternatives: ["Je vois ce que tu veux dire", "Oui, c'est normal", "Ça se comprend"] },
  { original: /Bravo/i, alternatives: ["Chapeau !", "Bien joué", "Tu assures", "Impressionnant"] },
  { original: /On joue/i, alternatives: ["On s'amuse", "J'ai un jeu pour toi", "Prêt pour un défi"] },
  { original: /Tu savais que/i, alternatives: ["Le sais-tu ?", "Petit secret :", "Écoute bien :"] },
  { original: /C'est parce que/i, alternatives: ["En fait,", "Le truc c'est que", "La raison c'est que"] },
  { original: /Ah oui/i, alternatives: ["Effectivement", "Tout à fait", "Exact", "En effet"] },
];

function varyExpressions(text: string, recentPhrases: string[]): string {
  let varied = text;
  for (const { original, alternatives } of PARAPHRASE_MAP) {
    if (original.test(varied)) {
      // Vérifier si une alternative n'a pas été utilisée récemment
      const available = alternatives.filter(
        alt => !recentPhrases.some(p => p.includes(alt))
      );
      if (available.length > 0) {
        const replacement = available[Math.floor(Math.random() * available.length)];
        varied = varied.replace(original, replacement);
      }
    }
  }
  return varied;
}
```

---

## 9. ⏳ SILENCE & ATTENTION ENGINE

### 9.1 Intelligence du Silence

```typescript
// src/lib/bobby/v8/silenceEngine.ts

interface SilenceAnalysis {
  type: SilenceType;
  duration: number;          // ms
  likelyReason: SilenceReason;
  action: SilenceAction;
  actionDelay: number;       // ms before action
}

type SilenceType = "micro" | "short" | "medium" | "long" | "extended";

type SilenceReason =
  | "thinking"        // L'enfant réfléchit
  | "hesitating"      // L'enfant hésite à parler
  | "distracted"      // L'enfant est distrait
  | "bored"           // L'enfant s'ennuie
  | "processing"      // L'enfant digère l'information
  | "emotional"       // L'enfant vit une émotion
  | "away"            // L'enfant est parti
  | "unknown";

type SilenceAction =
  | "wait"            // Attendre sans rien faire
  | "encourage"       // "Prends ton temps..."
  | "rephrase"        // Reformuler la dernière question
  | "simplify"        // Simplifier la question
  | "redirect"        // Proposer autre chose
  | "check_in"        // "Tu es toujours là ?"
  | "wind_down";      // Préparer la fin de session
```

### 9.2 Analyse Contextuelle du Silence

```typescript
function analyzeSilence(
  silenceMs: number,
  lastBobbyMessage: string,
  session: SessionContext,
  tom: MentalModel,
): SilenceAnalysis {
  const type: SilenceType =
    silenceMs < 3000 ? "micro" :
    silenceMs < 8000 ? "short" :
    silenceMs < 20000 ? "medium" :
    silenceMs < 45000 ? "long" : "extended";

  let reason: SilenceReason;
  let action: SilenceAction;
  let actionDelay: number;

  // ── Micro silence (<3s) → normal, attendre ──
  if (type === "micro") {
    return {
      type, duration: silenceMs,
      likelyReason: "thinking",
      action: "wait",
      actionDelay: 0,
    };
  }

  // ── Court silence (3-8s) → probablement en train de réfléchir ──
  if (type === "short") {
    // Si Bobby a posé une question difficile → l'enfant réfléchit
    if (lastBobbyMessage.includes("?") && tom.understanding.cognitiveLevel !== "formal") {
      reason = "thinking";
      action = "wait";
      actionDelay = 3000;
    } else {
      reason = "hesitating";
      action = "encourage";
      actionDelay = 0;
    }
    return { type, duration: silenceMs, likelyReason: reason, action, actionDelay };
  }

  // ── Silence moyen (8-20s) → probablement distrait ou a besoin d'aide ──
  if (type === "medium") {
    if (session.sessionMood === "negative") {
      reason = "emotional";
      action = "check_in";
      actionDelay = 0;
    } else {
      reason = "distracted";
      action = "redirect";
      actionDelay = 2000;
    }
    return { type, duration: silenceMs, likelyReason: reason, action, actionDelay };
  }

  // ── Long silence (20-45s) → ennui ou parti ──
  if (type === "long") {
    reason = session.turnCount > 5 ? "bored" : "away";
    action = reason === "bored" ? "redirect" : "check_in";
    actionDelay = 0;
    return { type, duration: silenceMs, likelyReason: reason, action, actionDelay };
  }

  // ── Silence étendu (>45s) → probablement parti ──
  return {
    type, duration: silenceMs,
    likelyReason: "away",
    action: "wind_down",
    actionDelay: 0,
  };
}
```

### 9.3 Messages de Silence

```typescript
const SILENCE_MESSAGES: Record<SilenceAction, string[]> = {
  wait: [], // Pas de message
  encourage: [
    "Prends ton temps...",
    "Je suis là, pas de pression ! 😊",
    "Tu réfléchis ? C'est bien de prendre son temps !",
  ],
  rephrase: [
    "Je reformule : ",  // + reformulation de la dernière question
    "En d'autres mots : ",
  ],
  simplify: [
    "Plus simplement : ",
  ],
  redirect: [
    "Tu veux qu'on fasse autre chose ?",
    "Et si on changeait de sujet ?",
    "J'ai une idée ! On pourrait jouer à un truc !",
  ],
  check_in: [
    "Tu es toujours là ? 😊",
    "Coucou ! Je suis là si tu veux parler !",
  ],
  wind_down: [
    "On se dit à bientôt ? Je serai toujours là ! 😊",
    "Passe une super journée ! On se retrouve vite ! 🌟",
  ],
};
```

---

## 10. ❤️ RELATIONSHIP EVOLUTION ENGINE

### 10.1 Phases Relationnelles

```typescript
// src/lib/bobby/v8/relationshipEngine.ts

interface RelationshipState {
  phase: RelationshipPhase;
  totalInteractions: number;
  totalSessions: number;
  trustScore: number;           // 0-100
  complicityScore: number;      // 0-100 (humour partagé, private jokes)
  emotionalBondScore: number;   // 0-100 (moments émotionnels partagés)
  milestones: RelationshipMilestone[];
  sharedMemories: SharedMemory[];
  insideJokes: InsideJoke[];
}

type RelationshipPhase =
  | "discovery"      // 0-10 interactions : Bobby apprend à connaître
  | "trust"          // 10-50 : Confiance qui se construit
  | "attachment"     // 50-200 : Lien émotionnel fort
  | "complicity";    // 200+ : Complicité totale

interface RelationshipMilestone {
  type: string;       // "first_laugh", "first_secret", "100_interactions"
  timestamp: number;
  description: string;
}

interface SharedMemory {
  event: string;      // "a ri ensemble du mot 'prout'"
  emotionAtTime: EmotionType;
  timestamp: number;
  recalled: number;   // Nombre de fois rappelé
}

interface InsideJoke {
  trigger: string;    // Le mot/phrase qui déclenche
  reference: string;  // La blague originale
  createdAt: number;
  usageCount: number;
}
```

### 10.2 Transitions de Phase

```typescript
function evaluatePhaseTransition(
  state: RelationshipState,
  sessionMetrics: SessionMetrics,
): RelationshipState {
  const updated = { ...state };

  // ── Progression naturelle ──
  if (state.phase === "discovery" && state.totalInteractions >= 10 && state.trustScore >= 30) {
    updated.phase = "trust";
    updated.milestones.push({
      type: "phase_trust",
      timestamp: Date.now(),
      description: "Bobby et l'enfant commencent à se faire confiance",
    });
  }

  if (state.phase === "trust" && state.totalInteractions >= 50 && state.emotionalBondScore >= 40) {
    updated.phase = "attachment";
    updated.milestones.push({
      type: "phase_attachment",
      timestamp: Date.now(),
      description: "Un vrai lien s'est créé",
    });
  }

  if (state.phase === "attachment" && state.totalInteractions >= 200 && state.complicityScore >= 60) {
    updated.phase = "complicity";
    updated.milestones.push({
      type: "phase_complicity",
      timestamp: Date.now(),
      description: "Bobby et l'enfant sont complices",
    });
  }

  // ── Mise à jour des scores ──
  // Confiance: augmente avec les interactions positives
  if (sessionMetrics.overallMood === "positive") {
    updated.trustScore = Math.min(100, updated.trustScore + 1);
  }
  // Complicité: augmente avec le rire et les jeux
  if (sessionMetrics.laughCount > 0) {
    updated.complicityScore = Math.min(100, updated.complicityScore + 2);
  }
  // Lien émotionnel: augmente avec les moments intimes
  if (sessionMetrics.emotionalMoments > 0) {
    updated.emotionalBondScore = Math.min(100, updated.emotionalBondScore + 3);
  }

  updated.totalInteractions += sessionMetrics.turnCount;
  updated.totalSessions += 1;

  return updated;
}
```

### 10.3 Comportement par Phase

```typescript
const PHASE_BEHAVIORS: Record<RelationshipPhase, {
  greetingStyle: string;
  humorLevel: number;
  personalReferenceRate: number; // Fréquence des rappels personnels
  vulnerabilityLevel: number;    // Bobby montre sa "vulnérabilité"
  teasingLevel: number;          // Niveau de taquinerie
}> = {
  discovery: {
    greetingStyle: "formal_warm",  // "Salut ! Comment tu t'appelles ?"
    humorLevel: 0.3,
    personalReferenceRate: 0.1,
    vulnerabilityLevel: 0,
    teasingLevel: 0,
  },
  trust: {
    greetingStyle: "warm_personal",  // "Salut [nom] ! Content de te voir !"
    humorLevel: 0.5,
    personalReferenceRate: 0.3,
    vulnerabilityLevel: 0.2,
    teasingLevel: 0.1,
  },
  attachment: {
    greetingStyle: "intimate_callback",  // "Hey [nom] ! Tu sais quoi, j'ai pensé à un truc..."
    humorLevel: 0.7,
    personalReferenceRate: 0.5,
    vulnerabilityLevel: 0.4,
    teasingLevel: 0.3,
  },
  complicity: {
    greetingStyle: "complicit_insider",  // "[inside joke] ! Salut mon pote !"
    humorLevel: 0.9,
    personalReferenceRate: 0.7,
    vulnerabilityLevel: 0.6,
    teasingLevel: 0.5,
  },
};
```

---

## 11. 🤔 UNCERTAINTY MANAGEMENT ENGINE

### 11.1 Architecture

```typescript
// src/lib/bobby/v8/uncertaintyEngine.ts

interface UncertaintyAssessment {
  level: UncertaintyLevel;
  source: UncertaintySource;
  score: number;                 // 0-1 (1 = très incertain)
  strategy: UncertaintyStrategy;
  clarificationQuestion: string | null;
}

type UncertaintyLevel = "certain" | "probable" | "uncertain" | "confused";

type UncertaintySource =
  | "speech_noise"       // Audio mal capté
  | "ambiguous_intent"   // L'intention est ambiguë
  | "unknown_topic"      // Bobby ne connaît pas le sujet
  | "conflicting_signals" // Signaux contradictoires (dit joyeux, semble triste)
  | "incomplete_input"   // Phrase incomplète
  | "multi_intent"       // Plusieurs intentions simultanées
  | "context_missing";   // Manque de contexte

type UncertaintyStrategy =
  | "proceed_best_guess"    // Avancer avec la meilleure hypothèse
  | "ask_clarification"     // Demander une clarification
  | "offer_choices"         // Proposer des options
  | "rephrase_understanding" // Reformuler pour vérifier
  | "acknowledge_ignorance" // Admettre qu'on ne sait pas
  | "defer_to_parent";      // Rediriger vers un adulte
```

### 11.2 Évaluation de l'Incertitude

```typescript
function assessUncertainty(
  frame: DeepGoalFrame,
  priority: PriorityDecision,
  tom: MentalModel,
): UncertaintyAssessment {
  let score = 0;
  let source: UncertaintySource = "ambiguous_intent";

  // ── Ambiguïté de l'intent ──
  score += frame.ambiguityScore * 0.4;
  if (frame.ambiguityScore > 0.6) source = "ambiguous_intent";

  // ── Confiance intent ──
  score += (1 - frame.intentConfidence) * 0.3;

  // ── Divergence surface/profond (ToM) ──
  if (tom.emotionalState.emotionDelta > 0.4) {
    score += 0.2;
    source = "conflicting_signals";
  }

  // ── Intent multiples ──
  if (frame.alternativeIntents.length >= 3) {
    score += 0.1;
    source = "multi_intent";
  }

  score = Math.min(1, score);

  // ── Niveau ──
  const level: UncertaintyLevel =
    score < 0.2 ? "certain" :
    score < 0.4 ? "probable" :
    score < 0.7 ? "uncertain" : "confused";

  // ── Stratégie ──
  const strategy = selectUncertaintyStrategy(level, source, tom);

  // ── Question de clarification ──
  const clarificationQuestion =
    strategy === "ask_clarification" ? buildClarificationQuestion(frame, source) :
    strategy === "offer_choices" ? buildChoiceQuestion(frame) :
    strategy === "rephrase_understanding" ? buildRephraseQuestion(frame) :
    null;

  return { level, source, score, strategy, clarificationQuestion };
}

function selectUncertaintyStrategy(
  level: UncertaintyLevel,
  source: UncertaintySource,
  tom: MentalModel,
): UncertaintyStrategy {
  // Si l'enfant est jeune et frustré → ne pas demander, deviner
  if (tom.understanding.cognitiveLevel === "preoperational" && level === "uncertain") {
    return "proceed_best_guess";
  }

  // Si le sujet est sensible → rediriger
  if (source === "conflicting_signals" && tom.emotionalState.inferredEmotion === "sadness") {
    return "rephrase_understanding";
  }

  // Standard
  switch (level) {
    case "certain": return "proceed_best_guess";
    case "probable": return "proceed_best_guess";
    case "uncertain": return "offer_choices";
    case "confused": return "ask_clarification";
  }
}
```

### 11.3 Questions de Clarification

```typescript
function buildClarificationQuestion(frame: DeepGoalFrame, source: UncertaintySource): string {
  switch (source) {
    case "speech_noise":
      return "Excuse-moi, je n'ai pas bien entendu. Tu peux répéter ?";
    case "ambiguous_intent":
      return `Hmm, tu veux ${frame.alternativeIntents[0]?.toLowerCase() || "me dire quelque chose"} ou autre chose ?`;
    case "incomplete_input":
      return "Tu n'as pas fini ta phrase ! Tu voulais dire quoi ?";
    case "multi_intent":
      return "Tu as plein d'idées ! On commence par quoi ?";
    default:
      return "Tu peux m'en dire plus ?";
  }
}

function buildChoiceQuestion(frame: DeepGoalFrame): string {
  if (frame.alternativeIntents.length >= 2) {
    const opt1 = intentToFriendly(frame.alternativeIntents[0]);
    const opt2 = intentToFriendly(frame.alternativeIntents[1]);
    return `Tu veux ${opt1} ou ${opt2} ?`;
  }
  return "Tu veux jouer, apprendre un truc, ou juste discuter ?";
}

function buildRephraseQuestion(frame: DeepGoalFrame): string {
  return `Si je comprends bien, tu ${goalToVerb(frame.userGoal)} ? C'est ça ?`;
}
```

---

## 12. 🤖 MICRO-LLM AUGMENTATION V2

### 12.1 Évolution

V7: Le LLM est un fallback (Layer 3).  
V8: Le LLM est un **augmenteur** — il enrichit les réponses locales quand le contexte le justifie.

```typescript
// src/lib/bobby/v8/llmAugmentorV2.ts

interface AugmentationDecision {
  shouldAugment: boolean;
  reason: string;
  augmentationType: AugmentationType;
  promptContext: string;         // Contexte injecté dans le prompt
  maxTokens: number;
  priority: "low" | "normal" | "high";
}

type AugmentationType =
  | "enrich_fact"        // Enrichir un fait avec plus de détails
  | "humanize"           // Rendre la réponse plus naturelle
  | "creative_content"   // Contenu créatif (histoire, blague unique)
  | "contextual_bridge"  // Pont contextuel entre sujets
  | "emotional_depth"    // Approfondir la réponse émotionnelle
  | "none";              // Pas d'augmentation
```

### 12.2 Quand Augmenter

```typescript
function decideAugmentation(
  localReply: string,
  plan: CognitionPlanV8,
  frame: DeepGoalFrame,
): AugmentationDecision {
  // ── Jamais si la réponse locale est excellente ──
  if (plan.confidence >= 0.85 && plan.what.contentStrategy !== "llm_generate") {
    return { shouldAugment: false, reason: "high_local_confidence", augmentationType: "none", promptContext: "", maxTokens: 0, priority: "low" };
  }

  // ── Enrichir si c'est un fait éducatif et que l'enfant est curieux ──
  if (plan.why.primaryGoal === "enseigner" && frame.deepMotivation === "pure_curiosity") {
    return {
      shouldAugment: true,
      reason: "enrich_educational_content",
      augmentationType: "enrich_fact",
      promptContext: buildFactEnrichmentPrompt(localReply, frame),
      maxTokens: 80,
      priority: "normal",
    };
  }

  // ── Humaniser si la réponse est trop mécanique ──
  if (detectMechanicalResponse(localReply)) {
    return {
      shouldAugment: true,
      reason: "response_too_mechanical",
      augmentationType: "humanize",
      promptContext: buildHumanizePrompt(localReply, plan),
      maxTokens: 60,
      priority: "low",
    };
  }

  // ── Contenu créatif si histoire/jeu demandé ──
  if (plan.what.contentStrategy === "game_action" || frame.userGoal === "have_fun") {
    return {
      shouldAugment: true,
      reason: "creative_content_needed",
      augmentationType: "creative_content",
      promptContext: buildCreativePrompt(frame, plan),
      maxTokens: 100,
      priority: "normal",
    };
  }

  // ── Profondeur émotionnelle si émotion forte ──
  if (plan.who.role === "comfort" && frame.emotion.intensity >= 4) {
    return {
      shouldAugment: true,
      reason: "emotional_depth_needed",
      augmentationType: "emotional_depth",
      promptContext: buildEmotionalPrompt(localReply, frame),
      maxTokens: 60,
      priority: "high",
    };
  }

  return { shouldAugment: false, reason: "no_augmentation_needed", augmentationType: "none", promptContext: "", maxTokens: 0, priority: "low" };
}
```

---

## 13. 🔒 SAFE LEARNING SYSTEM V3

### 13.1 Architecture

```typescript
// src/lib/bobby/v8/safeLearningV3.ts

interface LearningEntry {
  id: string;
  type: "qa" | "fact" | "pattern" | "response_template";
  content: { question: string; answer: string };
  quality: QualityScore;
  source: "conversation" | "parent_feedback" | "auto_generated";
  validationStatus: "pending" | "validated" | "rejected" | "quarantine";
  usageCount: number;
  successRate: number;         // % de fois où l'enfant a répondu positivement
  lastUsed: number;
  createdAt: number;
}

interface QualityScore {
  relevance: number;           // 0-1
  safety: number;              // 0-1 (MUST be 1.0 to be validated)
  ageAppropriateness: number;  // 0-1
  accuracy: number;            // 0-1
  engagement: number;          // 0-1 (mesuré post-usage)
  total: number;               // Moyenne pondérée
}
```

### 13.2 Validation en 3 Passes

```typescript
/**
 * Chaque nouveau contenu passe par 3 niveaux de validation :
 * 
 * Pass 1: Safety (automatique, immédiat) — BLOQUANT
 * Pass 2: Quality (automatique, immédiat) — SCORING
 * Pass 3: Usage (post-usage, asynchrone) — FEEDBACK
 */
function validateLearningEntry(entry: LearningEntry): ValidationResult {
  // ── PASS 1: SAFETY — Zéro tolérance ──
  const safetyCheck = checkSafety(entry.content.answer);
  if (!safetyCheck.safe) {
    return {
      status: "rejected",
      reason: safetyCheck.reason,
      canRetry: false,
    };
  }

  // ── PASS 2: QUALITY ──
  const quality: QualityScore = {
    relevance: scoreRelevance(entry.content.question, entry.content.answer),
    safety: 1.0, // Passé le check
    ageAppropriateness: scoreAgeAppropriateness(entry.content.answer),
    accuracy: scoreAccuracy(entry.content.answer),
    engagement: 0.5, // Default, sera mis à jour après usage
    total: 0, // Calculé ci-dessous
  };
  quality.total = (
    quality.relevance * 0.25 +
    quality.safety * 0.30 +
    quality.ageAppropriateness * 0.20 +
    quality.accuracy * 0.15 +
    quality.engagement * 0.10
  );

  if (quality.total < 0.5) {
    return {
      status: "quarantine",
      reason: `Qualité insuffisante (${quality.total.toFixed(2)})`,
      canRetry: true,
    };
  }

  return {
    status: "validated",
    reason: "Toutes les vérifications passées",
    canRetry: false,
    quality,
  };
}
```

### 13.3 Détection de Dérive

```typescript
/**
 * Surveille la qualité globale du système d'apprentissage.
 * Alertes si la qualité moyenne baisse ou si du contenu suspect émerge.
 */
interface DriftDetection {
  overallQuality: number;           // Moyenne de qualité sur les 100 derniers
  qualityTrend: "improving" | "stable" | "declining";
  suspiciousEntries: string[];      // IDs d'entrées suspectes
  parentAlertNeeded: boolean;
  recommendedAction: "none" | "review" | "rollback" | "pause_learning";
}

function detectDrift(entries: LearningEntry[]): DriftDetection {
  const recent = entries.slice(-100);
  const avgQuality = recent.reduce((sum, e) => sum + e.quality.total, 0) / recent.length;
  
  const older = entries.slice(-200, -100);
  const oldAvgQuality = older.length > 0 
    ? older.reduce((sum, e) => sum + e.quality.total, 0) / older.length 
    : avgQuality;

  const trend = avgQuality > oldAvgQuality + 0.05 ? "improving" :
                avgQuality < oldAvgQuality - 0.05 ? "declining" : "stable";

  const suspicious = recent
    .filter(e => e.quality.total < 0.4 || e.successRate < 0.3)
    .map(e => e.id);

  return {
    overallQuality: avgQuality,
    qualityTrend: trend,
    suspiciousEntries: suspicious,
    parentAlertNeeded: trend === "declining" || suspicious.length > 5,
    recommendedAction: 
      trend === "declining" && suspicious.length > 10 ? "pause_learning" :
      suspicious.length > 5 ? "review" :
      trend === "declining" ? "review" : "none",
  };
}
```

---

## 14. ⚡ PERFORMANCE ARCHITECTURE

### 14.1 Budget Latence par Module

```
Module                        | Target  | Max    | Strategy
────────────────────────────────────────────────────────────
STT Normalization             |   2ms   |   5ms  | Regex
Deep Goal Engine V2           |   5ms   |  10ms  | Scoring
Theory of Mind                |   3ms   |   8ms  | State update
Child World Model             |   2ms   |   5ms  | Lookup table
Priority Engine               |   3ms   |   5ms  | Scoring
Uncertainty Engine            |   2ms   |   5ms  | Scoring
Cognition V2                  |   5ms   |  10ms  | Decision tree
Proactive Engine              |   2ms   |   5ms  | Rule check
Orchestrator V2               |   3ms   |   8ms  | State machine
Layer 1 (LocalBrain)          |  10ms   |  20ms  | Templates
Layer 2 (KB)                  |  30ms   |  80ms  | TF-IDF + async
Layer 3 (LLM Augmentation)    | 400ms   | 800ms  | HTTP + streaming
Response Assembly V2          |   3ms   |   8ms  | Templates
Variation Engine              |   2ms   |   5ms  | Lookup + random
Personality Engine             |   1ms   |   3ms  | Scoring
Safety Filter                 |   2ms   |   5ms  | Regex
Understanding Loop            |   2ms   |   5ms  | Pattern match
Silence Engine                |   1ms   |   3ms  | Timer + rules
Relationship Update           |   3ms   |   8ms  | State update
────────────────────────────────────────────────────────────
TOTAL (offline, no LLM)       | ~50ms   | ~100ms |
TOTAL (with LLM augment)      | ~450ms  | ~900ms |
TOTAL (with LLM fallback)     | ~500ms  | ~1200ms|
```

### 14.2 Parallélisation

```typescript
/**
 * Stage 1 peut exécuter en parallèle :
 *   - Deep Goal Engine
 *   - Theory of Mind update
 *   - Child World Model check
 * 
 * Car ils lisent les mêmes inputs sans effets de bord.
 */
async function executeStage1(
  text: string,
  session: SessionContext,
  profile: ChildProfile,
): Promise<Stage1Result> {
  // Parallèle: ces 3 sont indépendants
  const [goalFrame, tomUpdate, worldCheck] = await Promise.all([
    Promise.resolve(extractDeepGoalFrame(text, session, profile)),
    Promise.resolve(updateMentalModel(currentToM, /* ... */)),
    Promise.resolve(checkChildWorldModel(text, profile.age)),
  ]);

  return { goalFrame, tomUpdate, worldCheck };
}
```

### 14.3 Cache Intelligent V2

```typescript
/**
 * Cache à 3 niveaux :
 * L1: RAM (Map) — <1ms — 200 entrées max
 * L2: IndexedDB — <10ms — 2000 entrées max
 * L3: Supabase — <500ms — illimité (async, ne bloque pas)
 *
 * Invalidation:
 * - Par TTL (5 min pour L1, 1h pour L2)
 * - Par changement de contexte émotionnel
 * - Par flag bypassCache de PriorityEngine
 */
interface CacheEntry {
  key: string;
  reply: BobbyBrainReply;
  plan: CognitionPlanV8;        // V8: on cache aussi le plan
  timestamp: number;
  hits: number;
  emotionalContext: string;     // "positive", "negative", "neutral"
}

function shouldUseCache(
  key: string,
  currentEmotion: string,
  priority: PriorityDecision,
): boolean {
  if (priority.bypassCache) return false;
  
  const entry = l1Cache.get(key);
  if (!entry) return false;
  
  // Invalider si contexte émotionnel différent
  if (entry.emotionalContext !== currentEmotion) return false;
  
  // Invalider si trop vieux
  if (Date.now() - entry.timestamp > 5 * 60 * 1000) return false;
  
  return true;
}
```

### 14.4 Stockage Local vs Cloud

```
Données                        | Stockage       | Sync
────────────────────────────────────────────────────────
Theory of Mind (session)       | RAM            | Non
Theory of Mind (persistant)    | localStorage   | Cloud async
Child World Model              | Code statique  | Non (config)
Relationship State             | localStorage   | Cloud async
Variation Context              | RAM            | Non
Silence Analysis               | RAM            | Non
Learning Entries (validées)    | IndexedDB      | Cloud async
Learning Entries (pending)     | RAM            | Non
Cache L1                       | RAM            | Non
Cache L2                       | IndexedDB      | Non
Session History                | RAM            | Cloud à la fin
```

---

## 📦 RÉSUMÉ DES FICHIERS V8

```
src/lib/bobby/v8/
├── theoryOfMind.ts          # 🧠 Modèle mental de l'enfant
├── childWorldModel.ts       # 🌍 Modèle cognitif par âge
├── deepGoalEngine.ts        # 🎯 Goal + motivation + trajectoire
├── cognitionV8.ts           # 🧠 WHY/WHAT/HOW/WHEN/WHO
├── orchestratorV8.ts        # 🎬 Arcs narratifs + interruptions V2
├── proactiveEngine.ts       # 🚀 Initiative proactive
├── variationEngine.ts       # 🎲 Anti-répétition linguistique
├── silenceEngine.ts         # ⏳ Intelligence du silence
├── relationshipEngine.ts    # ❤️ Relation évolutive 4 phases
├── uncertaintyEngine.ts     # 🤔 Gestion du doute
├── llmAugmentorV2.ts        # 🤖 LLM comme augmenteur
├── safeLearningV3.ts        # 🔒 Apprentissage sécurisé
└── performanceMonitor.ts    # ⚡ Monitoring latence
```

---

## 🔥 OBJECTIF FINAL

Bobby V8 n'est plus un assistant. C'est un **compagnon cognitif** qui :

1. **Comprend** l'enfant à 6 niveaux de profondeur (explicit → implicit → need → goal → motivation → mental model)
2. **Raisonne** en 5 dimensions (WHY/WHAT/HOW/WHEN/WHO) avant chaque réponse
3. **Anticipe** les besoins grâce à la Theory of Mind et au Proactive Engine
4. **Adapte** chaque mot au niveau cognitif réel (Child World Model)
5. **Évolue** dans la relation (4 phases, mémoire émotionnelle, inside jokes)
6. **Gère l'incertitude** avec intelligence (pas de faux-pas, questions ciblées)
7. **Ne se répète jamais** (Variation Engine avec tracking des 20 dernières réponses)
8. **Comprend le silence** (8 types de silence, actions adaptées)
9. **Apprend en sécurité** (validation 3 passes, détection de dérive)
10. **Répond en <700ms** (50ms offline, 450ms avec LLM)

> **Bobby V8 ne répond pas. Il comprend, anticipe et accompagne.**
