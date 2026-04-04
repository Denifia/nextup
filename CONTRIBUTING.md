# Contributing to nextup

Thanks for contributing.

## Prerequisites

- Node.js 20+
- npm

## Setup

```bash
npm install
```

## Common commands

Run from source:

```bash
npm run dev -- '{"expression":"tomorrow morning"}'
```

Typecheck:

```bash
npm run typecheck
```

Run tests:

```bash
npm test
```

Build:

```bash
npm run build
```

Clean build output:

```bash
npm run clean
```

## Project expectations

Before opening a PR, make sure all of these pass:

```bash
npm run typecheck
npm test
npm run build
```

## Scope

Please keep changes aligned with the v1.5 spec in `./docs`.

This project is intentionally narrow:

- local CLI only
- strict JSON request/response contract
- deterministic behavior
- no network calls
- no persistent state

## Notes for changes

- preserve the documented exit codes and error codes
- keep stdout machine-readable JSON only
- add tests for behavior changes and edge cases
- keep timezone and DST handling deterministic

## Releases

GitHub Actions handles CI and release automation.

- `CI` runs on pushes and pull requests
- `Release` runs for tags matching `v*`

If publishing a release:

1. update versioned artifacts as needed
2. ensure tests and build pass
3. create and push a tag such as `v1.5.0`

## Documentation

User-facing usage belongs in `README.md`.
Contributor workflow belongs in this file.
Detailed product/spec material belongs in `./docs`.
