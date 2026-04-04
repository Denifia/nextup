# nextup implementation plan

Implementation plan for `nextup`, a local CLI that resolves a natural-language time expression into one concrete UTC timestamp at minute precision.

This plan assumes the current `nextup.md` spec is the source of truth.

---

## Goals

Build a small, deterministic CLI with these properties:

- one JSON request in
- one JSON response out
- no network calls
- no persistent state
- strict input validation
- timezone-safe behavior
- minute-precise output
- reproducible seeded random mode

---

## Non-goals

Do not build:

- reminder/task storage
- calendar integrations
- recurring schedules
- HTTP server
- daemon/background service
- plugin or agent-specific wrapper

Keep the core implementation focused on the CLI contract.

---

## Recommended stack

- **Language:** TypeScript
- **Runtime:** Node.js 20+
- **Natural language parsing:** `chrono-node`
- **Timezone / DST / instant math:** `@js-temporal/polyfill`
- **CLI argument parsing:** minimal manual parsing or `node:util.parseArgs`
- **Testing:** `vitest`
- **Build:** `tsup` or plain `tsc`

### Why this stack

- `chrono-node` is the natural fit for English time phrases
- Temporal avoids a large class of timezone and DST bugs
- `vitest` is fast and good for snapshot/unit tests
- the tool is small enough that heavy frameworks are unnecessary

---

## High-level architecture

The implementation should separate these concerns:

1. **CLI transport**
   - parse argv
   - read stdin or argv JSON
   - map errors to exit codes

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
   - error JSON

---

## Proposed project structure

```text
nextup/
  package.json
  tsconfig.json
  README.md
  src/
    cli.ts
    main.ts
    types.ts
    errors.ts
    schema.ts
    config.ts
    input.ts
    parse.ts
    windows.ts
    anchor.ts
    intervals.ts
    eligible.ts
    random.ts
    select.ts
    resolve.ts
    output.ts
    time.ts
  test/
    cli.test.ts
    schema.test.ts
    config.test.ts
    parse.test.ts
    windows.test.ts
    anchor.test.ts
    intervals.test.ts
    select.test.ts
    random.test.ts
    dst.test.ts
    snapshots.test.ts
  fixtures/
    requests/
    configs/
```

---

## Module responsibilities

## `src/types.ts`

Define the core domain types.

Suggested types:

- `NextupRequest`
- `NextupConfig`
- `Strategy = "centered" | "largest-segment-midpoint" | "random" | "earliest" | "latest"`
- `RandomShape = "squared" | "linear"`
- `RandomSpread = "narrow" | "medium" | "wide"`
- `SuccessResult`
- `FailureResult`
- `UtcInterval`
- `LocalInterval`
- `EligibleMinute`

Keep these types small and explicit.

## `src/errors.ts`

Implement typed domain errors.

Suggested classes:

- `UsageError`
- `InvalidInputError`
- `UnparseableError`
- `WindowPastError`
- `WindowEmptyError`

Each should carry:

- `code`
- `detail`
- optional metadata for debugging/tests

## `src/schema.ts`

Validate request JSON shape and semantic constraints.

Responsibilities:

- `expression` required, non-empty string
- `window.start < window.end`
- every `avoid` interval has `start < end`
- valid timezone string
- valid strategy value
- if `strategy === "random"`:
  - allow omitted `random` object initially
  - require non-empty `random.seed`
  - default `random.shape = "squared"`
  - default `random.spread = "medium"`
- if `strategy !== "random"`:
  - reject presence of `random`

Output should be a fully normalized internal request object with defaults applied.

## `src/config.ts`

Load and validate the optional side-car config.

Responsibilities:

- read JSON file from `--config`
- detect missing/unreadable file
- validate day-part times
- merge with built-in defaults
- return effective day-part configuration

Built-in defaults:

- morning: `08:00-12:00`
- afternoon: `12:00-17:00`
- evening: `17:00-21:00`
- night: `21:00-24:00`

## `src/input.ts`

Handle request acquisition.

Responsibilities:

- detect whether request comes from argv or stdin
- error if both are provided
- error if neither is provided
- error on empty stdin
- parse JSON text into unknown value

This module should not contain business logic.

## `src/parse.ts`

Wrap `chrono-node`.

Responsibilities:

- parse expression relative to `now` and timezone
- choose first parse result
- expose only the parsed fields the app needs
- normalize parse output into internal representation

Important:
- isolate `chrono-node` quirks here
- make this module easy to mock in tests if needed

## `src/windows.ts`

Derive the candidate local interval from the parsed expression.

Rules to implement:

- explicit parsed range -> use parser start/end
- specific clock time -> `[t, t + 1 minute)`
- date + day part -> effective configured local window
- date only -> `[00:00, 24:00)` local day

This module should not know about `avoid`, explicit UTC `window`, or strategy.

## `src/anchor.ts`

Derive the local anchor instant and convert it to the anchor minute in UTC.

Rules:

- explicit parsed range -> midpoint instant
- specific clock time -> exact instant
- day part -> midpoint of effective day-part window
- date only -> midpoint of full local day
- round anchor instant to nearest UTC minute
- ties round to later minute

## `src/time.ts`

Centralize Temporal helpers.

Responsibilities:

- parse ISO instants with offsets
- validate IANA timezone
- construct local zoned date-times
- convert local boundaries to UTC instants
- format output timestamps as ISO UTC strings
- round/clamp to minute boundaries
- DST boundary handling

Put all DST-sensitive logic here or in helper functions used by `windows.ts` and `anchor.ts`.

## `src/intervals.ts`

Pure interval math over UTC instants.

Responsibilities:

- intersect two intervals
- union overlapping intervals
- subtract intervals
- sort intervals
- split into remaining eligible UTC segments

All intervals should use half-open semantics: `[start, end)`.

## `src/eligible.ts`

Convert remaining UTC intervals into eligible minute timestamps.

Responsibilities:

- enumerate minute boundaries inside eligible UTC time
- ensure exact boundary semantics are correct
- return an ordered list of eligible minutes

This module is useful because interval math and minute enumeration are easy to conflate incorrectly.

## `src/random.ts`

Implement seeded weighted sampling.

Responsibilities:

- hash `random.seed` deterministically
- map `random.spread` to spread factor
- compute weight for each eligible minute
- cumulative weighted selection in chronological order

### Weight functions

For each eligible minute `m`:

- `d(m)` = absolute distance in minutes from anchor
- `ds(m) = d(m) / S`

Where spread factor `S` is:

- narrow -> `0.5`
- medium -> `1`
- wide -> `2`

Weights:

- linear -> `1 / (1 + ds(m))`
- squared -> `1 / (1 + ds(m))^2`

Implementation note:
- use deterministic floating-point carefully, or scale to integers for stability
- document any precision strategy in code comments

## `src/select.ts`

Implement the strategy dispatch.

Strategies:

- `centered`
  - choose closest eligible minute to anchor
  - tie -> later minute
- `largest-segment-midpoint`
  - choose longest eligible segment
  - tie segment -> later segment
  - midpoint tie -> later minute
- `earliest`
  - first eligible minute
- `latest`
  - last eligible minute
- `random`
  - delegate to `random.ts`

## `src/resolve.ts`

The main orchestration pipeline.

Suggested signature:

```ts
async function resolveNextup(request: NextupRequest, config: EffectiveConfig): Promise<SuccessResult>
```

Pipeline:

1. normalize request defaults
2. parse expression
3. derive local candidate window
4. derive local anchor instant
5. convert candidate window to UTC
6. convert anchor to UTC minute
7. intersect explicit UTC `window` if present
8. clamp lower bound to first full minute after `now`
9. normalize and subtract `avoid`
10. enumerate eligible minutes
11. if none remain:
    - `window_past` if failure is due to future clamp only
    - otherwise `window_empty`
12. select final minute
13. format success JSON

## `src/output.ts`

Format JSON responses consistently.

Responsibilities:

- success object
- failure object
- optional `random` metadata only when strategy is `random`
- no accidental extra fields

## `src/cli.ts`

Bridge everything to the terminal.

Responsibilities:

- parse `--config`
- call `input.ts`
- call `schema.ts` and `config.ts`
- call `resolve.ts`
- print exactly one JSON object to stdout
- optionally print friendly diagnostics to stderr
- set exit codes correctly

## `src/main.ts`

Minimal process entrypoint.

---

## Core implementation sequence

Build in this order:

### Milestone 1: CLI shell and errors

Implement:
- entrypoint
- argv/stdin handling
- JSON parse
- usage errors
- output formatting

Acceptance:
- can echo a placeholder JSON result
- exit codes work

### Milestone 2: Validation and config

Implement:
- request validation
- random strategy validation
- config loading and day-part validation

Acceptance:
- invalid shapes rejected correctly
- defaults applied correctly

### Milestone 3: Time primitives

Implement:
- Temporal helpers
- timezone validation
- ISO parsing/formatting
- minute rounding helpers
- DST boundary conversion helpers

Acceptance:
- unit tests pass for all helper edge cases

### Milestone 4: Parsing, window derivation, anchor derivation

Implement:
- chrono integration
- local candidate windows
- local anchor derivation

Acceptance:
- examples like `tomorrow morning`, `tomorrow`, `tomorrow at 2pm`, `tomorrow between 9 and 12` work at the local-meaning level

### Milestone 5: Interval operations and eligible minutes

Implement:
- explicit window intersection
- future clamp
- avoid subtraction
- eligible minute enumeration

Acceptance:
- canonical constraint examples work
- tie/boundary behavior is correct

### Milestone 6: Strategy selection

Implement:
- centered
- earliest/latest
- largest-segment-midpoint
- random

Acceptance:
- each strategy has dedicated tests
- random is deterministic under fixed seed

### Milestone 7: Full example compliance

Implement:
- final response shaping
- output metadata
- finish snapshot tests

Acceptance:
- documented examples pass as snapshots
- stdout contains exactly one JSON object

---

## Key implementation details to settle early

## 1. JSON parser and empty stdin behavior

Decide exactly how to detect empty stdin.

Recommendation:
- trim only for the purpose of emptiness check
- preserve full original text for JSON parsing

## 2. Distinguishing `window_past` vs `window_empty`

This needs a precise rule in code.

Recommendation:

- if candidate window becomes empty immediately after future-clamp, return `window_past`
- if future-clamp leaves time but later subtraction/intersection removes it all, return `window_empty`

This is simple and matches user intuition.

## 3. DST conversion policy

Implement a single helper for local-boundary -> UTC conversion with explicit policies:

- nonexistent local time -> move forward to next valid minute
- ambiguous local time:
  - exact timestamps and interval starts -> earlier occurrence
  - interval ends -> later occurrence

Do not duplicate this logic across modules.

## 4. Floating-point stability in random sampling

The spec defines fractional weights. Avoid accidental instability.

Recommendation:
- use a stable 64-bit hash
- map hash to a deterministic fraction in `[0, totalWeight)`
- sum weights in chronological order
- keep tests tolerant only where mathematically necessary, otherwise assert exact outputs

Optional improvement:
- scale weights to integers if that meaningfully simplifies determinism

## 5. `chrono-node` ambiguity handling

`chrono-node` may interpret some phrases unexpectedly.

Recommendation:
- keep a narrow wrapper around parser output
- add tests for the supported phrase families only
- document unsupported or surprising phrases later in README if needed

---

## Validation details

## Request validation checklist

- request root must be an object
- `expression` present and non-empty
- `window`, if present, must be an object with valid `start`, `end`
- `avoid`, if present, must be an array of valid interval objects
- `timezone`, if present, must be valid IANA timezone
- `now`, if present, must be valid ISO timestamp with explicit offset/Z
- `strategy`, if present, must be supported
- `random`, if present, must be an object
- when `strategy === "random"`:
  - `random.seed` required and non-empty
  - `random.shape` defaulted/validated
  - `random.spread` defaulted/validated
- when `strategy !== "random"`:
  - reject `random`

## Config validation checklist

- config root must be an object
- `dayParts`, if present, must be an object
- each known day part must have valid `start`, `end`
- `HH:MM` parsing must be strict
- `24:00` only valid as `end`
- `start < end`

---

## Testing plan

## Unit tests

### `schema.test.ts`
- valid minimal request
- valid request with all fields
- invalid timezone
- invalid ISO timestamps
- invalid strategy
- `random` present with non-random strategy
- random missing seed
- random empty seed
- invalid shape/spread
- defaults applied for strategy/random

### `config.test.ts`
- default config behavior
- partial override merge
- invalid time format
- invalid range
- `24:00` accepted only as end
- missing file / unreadable file

### `windows.test.ts`
- explicit range
- exact time
- day part default
- day part override from config
- date-only

### `anchor.test.ts`
- range midpoint
- exact time anchor
- day-part midpoint
- date-only midpoint
- later-minute tie rounding

### `intervals.test.ts`
- intersection
- union overlap
- subtract single interval
- subtract multiple overlapping intervals
- half-open boundary correctness

### `eligible.test.ts`
- exact one-minute window
- multi-minute window
- boundary inclusion/exclusion
- empty result after subtraction

### `select.test.ts`
- centered nearest choice
- centered later tie choice
- largest segment midpoint
- tie on segment length -> later segment
- earliest/latest

### `random.test.ts`
- deterministic for same seed
- different seeds produce potentially different outputs
- default shape/spread applied
- linear vs squared differ in expected weighting behavior
- narrow/medium/wide differ in expected weighting behavior
- chronological cumulative sampling stability

## DST tests

Create dedicated tests for zones with DST, e.g. `America/New_York`.

Cover:
- spring-forward gap on exact times
- spring-forward gap on interval boundaries
- fall-back ambiguous exact time
- fall-back ambiguous range start/end
- date-only/day-part windows on DST transition dates

## Snapshot tests

Snapshot exact JSON output for canonical examples:
- `tomorrow morning`
- `tomorrow`
- exact time
- avoid constraint
- `largest-segment-midpoint`
- random default settings
- random linear wide settings
- malformed avoid
- random without seed

## CLI integration tests

Use child-process tests.

Cover:
- argv input
- stdin input
- both provided
- neither provided
- empty stdin
- malformed JSON
- missing config file
- success exit code `0`
- usage exit code `64`
- domain failure exit code `2`
- stdout is valid single JSON object
- stderr optional diagnostics do not contaminate stdout

---

## Suggested error mapping

| condition | error code | process exit |
|---|---:|---:|
| malformed CLI invocation | `usage` | 64 |
| malformed request field | `invalid_input` | 2 |
| malformed config | `invalid_input` | 2 |
| parse failure | `unparseable` | 2 |
| no future time after clamp | `window_past` | 2 |
| constraints consume all eligible time | `window_empty` | 2 |
| uncaught internal exception | internal generic error object | 70 |

For unexpected internal errors, still emit a JSON failure object.

Suggested shape:

```json
{
  "ok": false,
  "error": "internal",
  "detail": "Unexpected internal error"
}
```

---

## Output requirements checklist

## Success output must include

- `ok: true`
- `result`
- `resolved_window.start`
- `resolved_window.end`
- `now`
- `anchor`
- `strategy`
- `random.shape` and `random.spread` only for random strategy

## Failure output must include

- `ok: false`
- `error`
- `detail`

## Stdout rules

- exactly one JSON object
- no logging
- no banners
- no stack traces

---

## Developer workflow

Recommended commands:

```bash
npm install
npm test
npm run build
npm run dev -- '{"expression":"tomorrow morning"}'
```

Suggested `package.json` scripts:

```json
{
  "scripts": {
    "dev": "tsx src/main.ts",
    "build": "tsup src/main.ts --format esm,cjs --dts",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint ."
  }
}
```

---

## Acceptance checklist

Implementation is complete when:

- CLI contract matches spec
- request/config validation matches spec
- strategy/random behavior matches spec
- DST behavior is implemented and tested
- snapshot examples are stable
- random mode is deterministic under `random.seed`
- stdout/output shape is exact
- no network or persistence is introduced

---

## Nice-to-haves after v1

Only consider these after the spec-complete version works:

- richer README with supported phrase examples
- benchmark tests for large avoid lists
- property tests for interval operations
- shell completion
- npm package publishing polish
- optional machine-readable `--version-json`

Do not add new semantics until the current spec is implemented and passing.
