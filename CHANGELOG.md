# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
