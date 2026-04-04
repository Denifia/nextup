# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.5.0] - 2026-04-04

### Added

- initial `nextup` CLI implementation
- strict JSON request/response contract
- request validation for expression, timestamps, intervals, timezone, strategy, and random settings
- optional side-car config for day-part overrides
- natural-language parsing with `chrono-node`
- timezone-safe and DST-aware resolution using Temporal
- supported strategies: `centered`, `largest-segment-midpoint`, `random`, `earliest`, `latest`
- deterministic seeded random mode with shape and spread controls
- unit and integration test coverage across validation, resolution, CLI behavior, and DST edge cases
- GitHub Actions CI workflow
- GitHub release workflow with packaged tarball artifacts and optional npm publish
- user-facing `README.md`
- contributor-facing `CONTRIBUTING.md`
- refactored docs split into `docs/spec.md` and `docs/architecture.md`
