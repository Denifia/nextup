# nextup architecture and implementation notes

This document describes the implementation shape of `nextup` v1.5.1.

For product behavior and contract details, see [`spec.md`](./spec.md).

## Stack

- TypeScript
- Node.js 20+
- `chrono-node` for natural-language parsing
- `@js-temporal/polyfill` for timezone-safe date math and DST handling
- `vitest` for tests

## High-level architecture

The implementation is separated into these concerns:

1. **CLI transport**
   - parse argv
   - read stdin or argv JSON
   - map failures to exit codes

2. **Validation**
   - request schema
   - config schema
   - semantic validation for strategy/random combinations

3. **Parsing**
   - natural-language expression -> parsed temporal intent

4. **Window derivation**
   - parsed intent -> candidate local interval
   - parsed intent -> local anchor instant

5. **Constraint resolution**
   - convert to UTC
   - intersect with explicit window
   - clamp to future-only
   - subtract avoid intervals
   - enumerate eligible minutes

6. **Selection**
   - centered
   - largest-segment-midpoint
   - earliest
   - latest
   - random

7. **Formatting**
   - success JSON
   - failure JSON

## Current project structure

```text
src/
  cli.ts
  config.ts
  eligible.ts
  errors.ts
  input.ts
  intervals.ts
  main.ts
  output.ts
  parse.ts
  random.ts
  resolve.ts
  schema.ts
  select.ts
  time.ts
  types.ts
  version.ts
  windows.ts

test/
  cli.test.ts
  config.test.ts
  dst.test.ts
  helpers.ts
  input.test.ts
  resolve.test.ts
  schema.test.ts
  select.test.ts
```

## Module responsibilities

### `src/main.ts`
Minimal process entrypoint.

### `src/cli.ts`
CLI orchestration:
- read flags and request input
- load config
- normalize request
- run resolver
- print exactly one JSON object to stdout
- map failures to exit codes

### `src/input.ts`
Transport-only input handling:
- argv vs stdin detection
- usage errors for invalid invocation
- JSON parse for request text

### `src/schema.ts`
Request validation and normalization:
- required `expression`
- strict ISO timestamp validation for structured inputs
- timezone validation
- interval validation for `window` and `avoid`
- strategy validation
- random validation/defaulting

### `src/config.ts`
Config loading and validation:
- read optional side-car config from disk
- validate `dayParts`
- merge overrides with built-in defaults

### `src/parse.ts`
`chrono-node` integration:
- parse expression relative to `now`
- choose the first parse result
- normalize parser output into internal types
- classify parse as range / exact / day-part / date

### `src/windows.ts`
Derive:
- candidate UTC window
- anchor UTC minute

### `src/time.ts`
Shared time helpers:
- ISO parsing/validation
- timezone validation
- minute rounding helpers
- local boundary -> UTC conversion
- DST disambiguation policy

### `src/intervals.ts`
Pure UTC interval math:
- intersection
- merge/union
- subtraction
- enclosing interval helper

### `src/eligible.ts`
Enumerate eligible minute boundaries from remaining UTC intervals.

### `src/select.ts`
Implements non-random strategy selection.

### `src/random.ts`
Implements deterministic seeded weighted sampling.

### `src/resolve.ts`
Main orchestration pipeline for the domain logic.

### `src/output.ts`
Formats success and failure objects.

### `src/errors.ts`
Typed errors with stable error code and exit code mapping.

## Resolution pipeline

1. parse CLI flags
2. read request JSON from argv or stdin
3. read optional config side-car
4. validate request and config
5. normalize `now`
6. parse `expression`
7. derive candidate local window and anchor
8. convert to UTC
9. intersect explicit `window`
10. clamp to the first full minute after `now`
11. union and subtract `avoid`
12. enumerate eligible minutes
13. apply selected strategy
14. emit JSON and exit with documented code

## Key implementation decisions

### Request and config validation are strict

Structured timestamps require explicit offsets or `Z`.

This avoids ambiguity and keeps behavior deterministic.

### `window_past` vs `window_empty`

The implementation distinguishes these as follows:

- if no future time remains immediately after future clamping -> `window_past`
- if later constraints remove all remaining eligibility -> `window_empty`

### DST policy is centralized

DST-sensitive local-boundary handling lives in `src/time.ts`.

Policy:

- nonexistent local times -> move forward to the next valid minute
- ambiguous exact times and interval starts -> earlier occurrence
- ambiguous interval ends -> later occurrence

### Random mode is deterministic by version

Random selection uses:

- the request seed
- the eligible minute set
- the anchor minute
- implementation version `1.5.1`

That keeps results stable for the same inputs within the same implementation version.

## Testing strategy

The test suite covers:

- request validation
- config validation
- exact time resolution
- day-part defaults and overrides
- date-only behavior
- explicit window intersection
- avoid subtraction
- strategy behavior and tie-breaking
- deterministic random selection
- CLI integration behavior
- DST gap and ambiguity behavior

## Current command set

```bash
npm run typecheck
npm test
npm run build
npm run dev -- '{"expression":"tomorrow morning"}'
```

## Error mapping

| condition | error code | process exit |
|---|---:|---:|
| malformed CLI invocation | `usage` | 64 |
| malformed request field | `invalid_input` | 2 |
| malformed config | `invalid_input` | 2 |
| parse failure | `unparseable` | 2 |
| no future time after clamp | `window_past` | 2 |
| constraints consume all eligible time | `window_empty` | 2 |
| uncaught internal exception | `internal` | 70 |

## Suggested future doc boundaries

- `README.md` -> user-facing overview and usage
- `CONTRIBUTING.md` -> contributor workflow
- `docs/spec.md` -> product contract and semantics
- `docs/architecture.md` -> implementation notes
