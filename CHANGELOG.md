# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.6.0] - 2026-04-04

### Added

- add a Unix-style `--help` / `-h` command with arguments, request schema, output schema, exit codes, and examples
- add `docs/ai-assistant-install.md` as an agent install/integration contract with full install and schema details

### Changed

- include the `docs/` directory in the published package so local agents can read packaged documentation
- document the agent-install workflow directly in `README.md` and align related docs around the install/integration contract terminology
- re-center in-progress vague `day-part` and `date` windows on their remaining future-eligible portion instead of collapsing default `centered` behavior to the next minute
- expand examples and specification docs to cover the updated in-progress vague-window behavior

## [1.5.1] - 2026-04-04

### Changed

- publish package as `@denifia/nextup` while keeping the `nextup` CLI command
- update release automation to use npm trusted publishing from GitHub Actions
- generate GitHub release notes from `CHANGELOG.md`
- skip npm publish in the release workflow when the version already exists on npm
- update development dependencies and GitHub Actions used by CI/release workflows
- trim unnecessary build artifacts from the published npm package

## [1.5.0] - 2026-04-04

### Added

- initial `nextup` CLI implementation
- strict JSON request/response contract
- request validation for expressions, structured timestamps, intervals, timezone, strategy, and random settings
- optional side-car config for `morning`, `afternoon`, `evening`, and `night` overrides
- natural-language parsing with `chrono-node`
- timezone-safe resolution using Temporal
- supported strategies: `centered`, `largest-segment-midpoint`, `random`, `earliest`, and `latest`
- deterministic seeded random mode with shape and spread controls
- test coverage for validation, resolution, CLI behavior, and timezone edge cases
- GitHub Actions CI and release automation
