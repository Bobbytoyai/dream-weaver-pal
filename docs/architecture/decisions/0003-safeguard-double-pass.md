# ADR-003 — SafeGuard double-pass (input + output)

- **Statut** : Accepté
- **Date** : 2026-05-16
- **Tags** : safety, brain, cloud

## Contexte

Bobby parle à des enfants 3-12 ans. Deux risques distincts :

1. **Input risk** — l'enfant dit quelque chose qui révèle une situation à risque (idéation, abus, peur intense).
   → Bobby doit détecter et adapter sa réponse, alerter le parent si critique.
2. **Output risk** — Bobby (ou le LLM derrière) génère du contenu inadapté.
   → On doit empêcher ce contenu de sortir, même si le LLM s'est laissé jailbreaker.

Une seule passe (avant LLM) ne couvre pas le 2. Une seule passe (après LLM) ne permet pas d'adapter la réponse au signal d'entrée.

## Décision

Pipeline `/voice` :

```
text → SafeGuard(input) → Brain V8 → LLM (optional) → SafeGuard(output) → TTS
```

- **SafeGuard input** classifie le texte enfant en 0-4. Si ≥3, Bobby remplace par `suggested_response` et alerte selon le niveau.
- **SafeGuard output** classifie la réponse Bobby. Si ≥3, on bloque l'audio et on renvoie un fallback safe (ex : "Hmm, on parle d'autre chose ?").

Les 2 passes utilisent le même classifier (`/v1/safety`, Claude Haiku 4.5) avec un `direction` différent dans le prompt.

## Conséquences

**Positives**
- Couverture défense-en-profondeur.
- Le classifier est un seul service à durcir.
- Niveau 4 sur input → alerte parent immédiate, traçable.

**Négatives**
- Coût × 2 sur le classifier (~ 1 c€ par conversation supplémentaire).
- Latence + 80-150 ms (parallélisable avec d'autres étapes : on lance le SafeGuard output **pendant** la génération TTS, et on coupe l'audio si refus).

## Suivi

- Ajouter des eval sets par catégorie (idéation, abus, drogue, sexuel, violence) → 100 cas par catégorie.
- Mesurer false-positive rate sur 1000 conversations réelles ; cible < 5 %.
