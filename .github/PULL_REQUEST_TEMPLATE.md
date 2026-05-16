<!-- Merci pour ta contribution à Bobby ! Remplis ce qui s'applique. -->

## Quoi
<!-- Une phrase. Ce que cette PR fait, dans le ton du commit. -->

## Pourquoi
<!-- Le besoin. Le ticket. La douleur que ça résout. -->

## Comment
<!-- Si non trivial : décris l'approche et les trade-offs. -->

## Impact enfant
<!-- COCHE si applicable, sinon explique pourquoi non concerné. -->

- [ ] Pas d'impact sur le contenu enfant
- [ ] SafeGuard input + output toujours déclenchés
- [ ] Test d'eval ajouté pour ce type de contenu
- [ ] Pas de PII supplémentaire stocké
- [ ] Pas de régression de latence (vérifier `telemetry.totalMs`)

## Checklist

- [ ] Commits suivent Conventional Commits (`feat(scope): …`)
- [ ] `bun run lint && bun run typecheck && bun test` passent en local
- [ ] Docs mises à jour si l'API publique change
- [ ] ADR ajoutée si décision structurelle (`docs/architecture/decisions/`)
- [ ] Pas de secret commit (scan automatique en pre-commit)

## Captures / vidéo
<!-- Si UI : capture before/after. Si firmware : photo de l'écran. -->

## Liens

Closes #
Related to #
ADR : <!-- ADR-XXX si applicable -->
