# Bobby Brain V8 — Gap Analysis (existing dream-weaver-pal vs spec)

> **Date**: 2026-05-16
> **Source code audité** : `Bobbytoyai/dream-weaver-pal` @ HEAD (mai 2026)
> **Spec de référence** : [`../brain/V8.md`](../brain/V8.md) + `BOBBY_BRAIN_V8_ARCHITECTURE.md` racine du repo Lovable
> **Verdict en une phrase** : base solide côté **enrichissement** (KB scoring, mémoire, safety patterns) — mais les modules V8 existent en frontend (`src/lib/bobby/v8/`) et **ne sont pas branchés** au cloud `bobby-brain`.

## TL;DR

| | État |
|---|---|
| Ce qui marche bien | KB semantic search, past sessions, persistent facts, safety alerts auto |
| Ce qui est à moitié fait | 7 / 13 modules V8 existent en frontend, non utilisés côté cloud |
| Ce qui manque complètement | Pipeline 6 stages explicite, performance monitor, SafeGuard externe |
| Dette principale | Couplage à Lovable AI Gateway + Gemini 3 Flash preview + system prompt monolithique 75 lignes |
| Effort pour conformité V8 | ~ 3 sprints de 1 dev senior |

---

## 1. État de l'existant

### 1.1 Inventaire

```
dream-weaver-pal/
├── BOBBY_BRAIN_V8_ARCHITECTURE.md   ← spec
├── src/lib/bobby/
│   ├── v8/                           ← 7 modules présents
│   │   ├── theoryOfMind.ts
│   │   ├── childWorldModel.ts
│   │   ├── proactiveEngine.ts
│   │   ├── relationshipEngine.ts
│   │   ├── silenceEngine.ts
│   │   ├── uncertaintyEngine.ts
│   │   └── variationEngine.ts
│   ├── v7/                           ← orchestrator V7 actif côté front
│   │   ├── deepUnderstanding.ts
│   │   ├── responseAssembly.ts
│   │   ├── cognitionV7.ts
│   │   ├── orchestrator.ts
│   │   ├── understandingLoop.ts
│   │   └── priorityEngine.ts
│   ├── cognition/, memory/, personality/, localBrain/, flows/, knowledgeQuery/
│   ├── brain.ts, llmBrain.ts, masterControl.ts
│   └── ...
└── supabase/functions/bobby-brain/
    └── index.ts (735 LOC)            ← ce qui tourne en prod
```

### 1.2 `bobby-brain/index.ts` — ce que fait vraiment le cloud

Pipeline cloud actuel :

```
POST /bobby-brain
  ↓
1. Valide payload (messages, childName, childAge, blockedTopics…)
2. ENRICHISSEMENT PARALLEL (Promise.all) :
   a. KB semantic search (queryKBForContext)  — scoring composite
   b. loadPastSessions (5 dernières)
   c. loadPersistentFacts (memories + interests + emotions)
3. Détection safety patterns (regex) → auto-insert parent_alert
4. Build systemPrompt monolithique (SYSTEM_PROMPT + age + KB + memory + blocked)
5. Appel Lovable AI Gateway → google/gemini-3-flash-preview
6. Post-processing : remove childName placeholders, simplify words si <4 ans, block phrases mort
7. Return { reply }
```

**Bonnes pratiques observées** :

- **KB scoring composite** très propre : `kwScore × 0.6 + qScore × 0.4` + containment + focusPenalty + priorityFactor + trustFactor. Filtrage par âge `age_min ≤ childAge ≤ age_max`.
- **Stemming + semantic fields FR** (planete/etoile/dinosaure/animal/ocean/langue/etc).
- **Fuzzy matching** avec stem + prefix + substring.
- **Adaptive max_tokens** : 120 → 200 → 350 selon longueur conversation.
- **Safety patterns** auto-alert : 10 patterns regex (violence, harcèlement, abus, propos dangereux) → table `parent_alerts`.
- **Streaming SSE** supporté nativement.
- **Memory non-bloquante** : checkAndAlertSafety en `catch(() => {})`.

---

## 2. Conformité au spec V8 — module par module

Légende : ✅ implémenté · 🟡 partiel · ❌ manquant.

| # | Module V8 | Frontend `src/lib/bobby/v8/` | Cloud `bobby-brain` | Statut global |
|---|-----------|------------------------------|---------------------|---------------|
| 1 | Pipeline 6 stages | ❌ pas explicite | ❌ pas explicite | ❌ |
| 2 | Theory of Mind | ✅ module présent | ❌ non branché | 🟡 |
| 3 | Child World Model | ✅ module présent | ❌ non branché | 🟡 |
| 4 | Deep Goal Engine V2 | ❌ (v7 deepUnderstanding) | ❌ | ❌ |
| 5 | Cognition V8 (WHY/WHAT/HOW/WHEN/WHO) | ❌ (v7 cognitionV7) | ❌ | ❌ |
| 6 | Orchestration V2 / Arcs | ❌ (v7 orchestrator) | ❌ | ❌ |
| 7 | Proactive Engine | ✅ module présent | ❌ non branché | 🟡 |
| 8 | Variation Engine | ✅ module présent | ❌ non branché | 🟡 |
| 9 | Silence Engine | ✅ module présent | ❌ non branché | 🟡 |
| 10 | Relationship 4 phases | ✅ module présent | 🟡 partiel (past_sessions) | 🟡 |
| 11 | Uncertainty Engine | ✅ module présent | ❌ non branché | 🟡 |
| 12 | LLM Augmentation V2 (Layer 1/2/3 hybride) | ❌ | ❌ (LLM pur Gemini) | ❌ |
| 13 | Safe Learning V3 (3-pass validation + drift) | ❌ | 🟡 KB trust_score utilisé | 🟡 |
| 14 | Performance Monitor (budget par stage) | ❌ | ❌ aucune telemetry | ❌ |

**Score global** : 5 ✅ + 7 🟡 + 7 ❌ sur 14 (en pondérant frontend/cloud).
Sans considérer le branchement cloud : **7/14 modules existent**.
**Avec considération du branchement cloud** : **2/14 modules sont VRAIMENT actifs en prod** (Relationship via past_sessions, et SafeLearning via KB trust_score).

---

## 3. Problèmes identifiés (par sévérité)

### 🔴 Critique

**P1. Désynchro V8 frontend / V8 cloud.**
Les 7 modules `src/lib/bobby/v8/*.ts` sont théoriquement utilisables côté front (PWA, Bobby Live), mais le `bobby-brain` cloud ne les consomme pas. Résultat : le ToM, la silence detection, l'uncertainty management — rien de tout cela ne s'applique sur les conversations réelles (qui passent toutes par le cloud).

**P2. Pipeline 6 stages absent.**
Le spec exige des stages distincts avec budgets latence (5/15/10/300/10/5 ms). Le code actuel est monolithique : 1 fonction `serve()` qui fait tout. Pas de telemetry, pas de breakdown.

**P3. SafeGuard "maison" en regex hardcodés.**
Les 10 patterns regex de `SAFETY_PATTERNS` couvrent **uniquement les inputs enfant** et **uniquement le français**. Aucune pass output. Le spec exige un classifier 5 niveaux (Claude Haiku) en input ET output.

### 🟠 Important

**P4. Couplage Lovable AI Gateway.**
Modèle : `google/gemini-3-flash-preview` via `ai.gateway.lovable.dev`. Si Lovable change prix, pricing, ou disparaît, on est bloqué. De plus c'est un **modèle preview** → instabilité possible.

**P5. `SYSTEM_PROMPT` monolithique 75 lignes.**
Difficile à eval, difficile à itérer, mélange identité / persona / structure / safety / questions difficiles. À découper en **building blocks** (identity, behavior, format, safety) que l'on compose selon le contexte.

**P6. Pas de tests, pas d'eval set.**
Aucun fichier `*.test.ts` côté `bobby-brain`. Aucun eval set golden pour reproduire les comportements attendus.

**P7. Telemetry / observabilité minimale.**
`console.log` partout, pas de propagation `total_ms`, pas de breakdown stage par stage. Difficile de savoir où la latence est passée si une conversation prend 2s.

### 🟡 Mineur

**P8. Hardcoded `google/gemini-3-flash-preview`.**
Devrait être env-var ou config.

**P9. `STOPWORDS` et `SEMANTIC_FIELDS` figés dans le code.**
Devraient être en config DB / fichier JSON pour itération hors-deploy.

**P10. Single-language (FR).**
Pas de fallback EN/ES. Le système prompt et les age prompts sont FR pur. Bloquant pour l'expansion internationale.

---

## 4. Plan de mise en conformité V8

### Phase 1 — Brancher les modules V8 existants (sprint 1)

Sans toucher au système prompt, brancher les modules front au cloud.

1. Extraire `src/lib/bobby/v8/*.ts` vers `packages/brain-v8/src/` (ce qui est déjà fait dans le monorepo).
2. Faire importer ce package dans `bobby-brain/index.ts` côté cloud :
   ```ts
   import {
     buildChildWorldModel, buildDeepGoalFrame, buildCognitionPlan,
     assessUncertainty, applyVariation, analyzeSilence,
     PerfTracker, emptyMentalModel, updateMentalModel, detectEmotionFromText,
   } from 'npm:@bobby/brain-v8@latest'   // ou vendoring local
   ```
3. Pipeline 6 stages avec `PerfTracker` :
   ```ts
   const perf = new PerfTracker()
   const frame    = await perf.measure('understanding', () => buildDeepGoalFrame(...))
   const plan     = await perf.measure('decision', () => buildCognitionPlan(...))
   const tom      = await perf.measure('decision', () => updateMentalModel(...))
   const reply    = await perf.measure('contentGeneration', async () => {
     // KB matches existants restent
     // LLM appel comme aujourd'hui
   })
   const shaped   = await perf.measure('shaping', () => applyVariation(reply, ctx))
   ```
4. Renvoyer `{ reply, telemetry, plan, safetyLevel }` dans la response (front en a besoin pour debug + tracking).

**Effort estimé** : 5 jours senior. **Risque** : faible (additif, on n'enlève rien).

### Phase 2 — Brancher SafeGuard external (sprint 2)

1. Activer la function `safety` (déjà scaffoldée dans le monorepo).
2. Remplacer `SAFETY_PATTERNS` regex par appel `/v1/safety` direction=input + direction=output.
3. Garder le mécanisme `parent_alerts` MAIS le déclencher sur niveau 4 du classifier (pas regex).
4. Ajouter eval set : 100 inputs par catégorie (violence / abus / idéation / propos limites / safe normal) → mesurer FN/FP.

**Effort** : 4 jours senior + 1 jour préparation eval set.
**Risque** : moyen — il faut un fallback si le classifier timeout (fail-open ? fail-closed ?). Recommandation : fail-closed sur output (mieux vaut un faux refus que du contenu inadapté), fail-open sur input (l'enfant continue de pouvoir parler).

### Phase 3 — Refactor LLM en hybride 3-Layer (sprint 3)

Objectif : sortir de la dépendance Lovable Gateway et atteindre les 90-95 % offline du spec.

1. **Layer 1 — LocalBrain templates** (déjà existant dans `src/lib/bobby/localBrain/templates-*.ts`) : intents simples (salutations, daily, social, jeux basiques) répondus localement.
2. **Layer 2 — KB scoring** (déjà existant !) : si confidence KB > 0.7, on répond depuis la KB sans LLM.
3. **Layer 3 — LLM augment** : seulement si L1 et L2 insuffisants OU si motivation profonde détectée OU si curiosité pure non couverte par la KB. Passer par Anthropic Claude Sonnet directement (sortir de Lovable Gateway).
4. Le `decideAugmentation()` du `packages/brain-v8/src/llm-augmentor.ts` couvre déjà cette logique.

**Effort** : 8 jours senior. **Risque** : moyen-élevé. **Gain** : -50 % latence p50 si > 60 % des conversations passent en L1/L2.

### Phase 4 — Performance + tests + observabilité (sprint 4, en parallèle)

1. Telemetry persistante : table `telemetry_events` avec breakdown par stage. Dashboard interne `apps/web/admin`.
2. Tests unit `bun test packages/brain-v8/` (déjà scaffoldés).
3. Eval set "100 conversations Bobby" annotées par humains → automated regression suite.
4. Alertes SLO : p95 > 1500 ms → notification équipe.

**Effort** : 6 jours senior. **Risque** : faible.

---

## 5. Risques transverses

### R1 — Lovable comme outil d'édition
Si l'équipe édite via Lovable, toute refacto cloud doit pouvoir être reproduite par Lovable. Mitigation : garder la logique business **out** des Edge Functions (dans `packages/brain-v8/`), Edge Function devient un thin wrapper.

### R2 — Backward compat des response shapes
Le front consomme actuellement `{ reply: string }` (et `ReadableStream` en streaming). Toute extension `{ reply, telemetry, plan }` doit être backward-compatible (ne pas casser les clients existants). Acceptable si on ajoute des champs **optionnels**.

### R3 — Coût LLM
Sortir de Lovable Gateway = on paye Anthropic en direct. Estimation grossière : Claude Haiku 4.5 ≈ 0,8 $ / Mtok input, 4 $ / Mtok output. Une conversation moyenne ≈ 2k tokens input + 100 tokens output ≈ 0.2 c€. À 100 conversations / jour / enfant et 1000 enfants : ~ 20 € / mois LLM. Acceptable.

### R4 — Migration progressive
Pas de big bang. Idéalement : ajouter le pipeline V8 **derrière un feature flag** dans `bobby-brain` :
```ts
const useV8 = childAge < 8 || env.FORCE_V8 === 'true' || hash(userId) % 10 === 0  // 10 % rollout
```
Permet de comparer V8 vs legacy sur usage réel avant rollout complet.

---

## 6. Recommandation finale

| Étape | Quoi | Quand |
|-------|------|-------|
| Maintenant | Intégrer le monorepo (cf. `docs/ops/migration-from-dream-weaver-pal.md`) | Cette semaine |
| Sprint 1 | Brancher modules V8 existants au cloud + telemetry | Semaine +1 |
| Sprint 2 | SafeGuard externe + eval set | Semaine +2 |
| Sprint 3 | Hybride 3-Layer + sortir de Lovable Gateway | Semaine +3-4 |
| Sprint 4 | Tests + obs + dashboard | Continu |

**Décision clé** : ne pas refactor le `bobby-brain/index.ts` actuel pour le moment. Le **wrapper** dans un nouvel endpoint `bobby-brain-v8/` (feature flag, 10 % traffic), et migrer progressivement. Garde la prod stable, mesure l'impact, rollout sans casser.

---

## 7. Quick wins à shipper cette semaine

1. **Externaliser `SYSTEM_PROMPT`** dans `services/cloud/supabase/functions/_shared/prompts/bobby.ts` — édition + versioning facile.
2. **Ajouter `total_ms` dans la response** — 5 lignes de code, gain massif d'observabilité.
3. **Logger les KB scores top-5** dans la response — debug + analyse hors-ligne.
4. **Mettre `LLM_MODEL` en env-var** — permet de swap Gemini → Claude sans redeploy code.
5. **Test smoke `/v1/bobby-brain`** dans CI — empêche le déploiement si la function ne répond pas à un payload de référence.
