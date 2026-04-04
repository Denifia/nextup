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

Release readiness check:

```bash
npm run release:check
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

Please keep changes aligned with the v1.5 spec in `./docs/spec.md`.

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
- npm publishing is configured for GitHub Actions trusted publishing

Typical release flow:

1. update `package.json` version and `CHANGELOG.md`
2. run `npm run release:check`
3. commit the release changes
4. push `main`
5. create and push a matching tag such as `v1.5.1`

Example:

```bash
git add package.json package-lock.json CHANGELOG.md
git commit -m "release: prepare v1.5.1"
git push origin main
git tag v1.5.1
git push origin v1.5.1
```

The release workflow verifies that the pushed tag matches `package.json`, uses `CHANGELOG.md` as the GitHub release notes body, and publishes to npm via trusted publishing. If the version is already present on npm, it skips the publish step instead of failing the whole release.

## Documentation

User-facing usage belongs in `README.md`.
Contributor workflow belongs in this file.
Detailed product/spec material belongs in `./docs/spec.md` and `./docs/architecture.md`.
