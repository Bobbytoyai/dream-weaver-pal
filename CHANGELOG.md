# Changelog

Toutes les modifications notables sont documentées ici.
Format : [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning : [SemVer](https://semver.org/).

## [Unreleased]

### Added
- Monorepo studio-grade : `apps/`, `services/`, `firmware/`, `packages/`, `docs/`, `tools/`.
- `packages/brain-v8/` — skeleton du moteur cognitif V8 (13 modules + tests smoke).
- ADRs 001-005 (Supabase, brain isolé, SafeGuard double-pass, Lovable web, Watcher MVP).
- CI/CD : workflows `ci`, `deploy-cloud`, `deploy-web`, `build-firmware`, `codeql`.
- `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`.
- Biome + Lefthook + commitlint configurés.
- Documentation autoritaire `docs/brain/V8.md`.

### Changed
- DA Watcher : violet `#9333EA`, yeux dot-matrix réduits, menus recalibrés pour le LCD rond Ø340 inscrit.
- LVGL heap 48 → 192 KB (résout crash StoreProhibited).

### Fixed
- PCA9535 P06 partagé LCD reset / touch reset → `reset_touch()` désactivé.
- LVGL mutex timeout 200 ms → 1500 ms.
- Parent dashboard auto-demo passe en one-shot (au lieu de loop infini).
- Boot script auto-régénère `sdkconfig` si `sdkconfig.defaults` plus récent.

## [0.1.0] — 2026-05-14

- Première version stable du firmware Watcher (LCD + touch diag + wheel + face + boot screen).
- Pipeline cloud `/v1/voice` et `/v1/safety` draft.
- App PWA parent draft (login magic link, onboarding 4 étapes, dashboard).
