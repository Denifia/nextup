# nextup v1.5

A local CLI utility that resolves a natural-language time expression into one concrete UTC timestamp at minute precision.

No network calls. No persistent state. One request in, one JSON result out.

---

## Summary

`nextup` answers one question:

> Given a human time expression plus optional hard constraints, what exact UTC minute should I use?

Examples:

- `"tomorrow morning"` -> `2026-04-04T14:00:00Z`
- `"next Tuesday at 2pm"` -> `2026-04-07T18:00:00Z`

It is a **time resolver**, not a scheduler.

---

## Non-goals

`nextup` does **not**:

- create reminders
- store tasks
- track history
- read calendars
- call external APIs
- manage recurring schedules
- guarantee deadline-safe scheduling

Callers own judgment and surrounding workflow. `nextup` only computes a timestamp.

---

## CLI contract

## Invocation

```bash
nextup [--config <path>] '<request-json>'
```

or:

```bash
echo '<request-json>' | nextup [--config <path>]
```

Exactly one JSON request must be provided, either:

1. as the first non-flag argument
2. on stdin

Passing both argv input and stdin is a usage error.

Providing neither argv input nor stdin input is also a usage error.

## Flags

| flag | short | required | meaning |
|---|---|---|---|
| `--config <path>` | — | no | path to optional side-car config |

## Supported request `strategy` values

| mode | meaning |
|---|---|
| `centered` | choose the eligible minute closest to the anchor |
| `largest-segment-midpoint` | choose the midpoint of the longest remaining eligible segment |
| `random` | choose a seeded weighted sample from an anchor-biased distribution |
| `earliest` | choose the earliest eligible minute |
| `latest` | choose the latest eligible minute |

## Strategy and random-option rules

- request `strategy` defaults to `centered`
- `random.seed` accepts any non-empty UTF-8 string
- `random.seed` is treated as opaque text and hashed deterministically
- numeric-looking values are treated as strings, not as a separate numeric type
- `random.seed` is **required and must be non-empty** when `strategy` is `random`
- `random.shape` defaults to `squared`
- `random.spread` defaults to `medium`
- `random` settings are only valid when `strategy` is `random`
- unsupported `strategy`, `random.shape`, or `random.spread` values are `invalid_input`

## Output

`nextup` writes exactly one JSON object to stdout for both success and failure.

- success: `{ "ok": true, ... }`
- failure: `{ "ok": false, ... }`

Usage errors also return a JSON failure object with `error: "usage"` and exit code `64`.

Invalid request fields, including invalid `strategy` or `random` settings, return `error: "invalid_input"` and exit code `2`.

No banners or extra text are written to stdout.

Human-oriented diagnostics may be written to stderr for usage errors.

## Exit codes

- `0` - success
- `2` - domain failure
- `64` - usage error
- `70` - unexpected internal error

---

## Request schema

```json
{
  "expression": "<natural language time expression>",
  "window": {
    "start": "<ISO 8601 with offset>",
    "end": "<ISO 8601 with offset>"
  },
  "avoid": [
    { "start": "<ISO 8601 with offset>", "end": "<ISO 8601 with offset>" }
  ],
  "timezone": "<IANA timezone>",
  "now": "<ISO 8601 with offset>",
  "strategy": "<centered|largest-segment-midpoint|random|earliest|latest>",
  "random": {
    "seed": "<string>",
    "shape": "<squared|linear>",
    "spread": "<narrow|medium|wide>"
  }
}
```

## Field rules

| field | required | rules |
|---|---|---|
| `expression` | yes | non-empty string |
| `window` | no | absolute interval, `start < end` |
| `avoid` | no | array of absolute intervals, each `start < end` |
| `timezone` | no | valid IANA timezone; default `UTC` |
| `now` | no | absolute timestamp; defaults to current system time |
| `strategy` | no | placement strategy; default `centered` |
| `random` | no | random strategy settings; only valid when `strategy` is `random` |

## Random request rules

If `strategy` is `random`:

- `random` may be omitted, in which case defaults are applied except for `random.seed`
- `random.seed` is required and must be non-empty
- `random.shape` defaults to `squared`
- `random.spread` defaults to `medium`

If `strategy` is not `random`:

- `random` must be omitted

## Structured timestamps

All structured timestamps in `window`, `avoid`, and `now` must be valid ISO 8601 timestamps with an explicit offset or `Z`.

Accepted:

- `2026-04-04T12:00:00Z`
- `2026-04-04T08:00:00-04:00`

Rejected:

- `2026-04-04 12:00:00`
- `2026-04-04T12:00:00`

This avoids ambiguity.

---

## Side-car config

The optional config side-car lets callers override default day-part windows with user preferences.

If `--config <path>` is omitted, built-in defaults are used.

## Config schema

```json
{
  "dayParts": {
    "morning": { "start": "08:00", "end": "12:00" },
    "afternoon": { "start": "12:00", "end": "17:00" },
    "evening": { "start": "17:00", "end": "21:00" },
    "night": { "start": "21:00", "end": "24:00" }
  }
}
```

## Config rules

- all times are local wall-clock times in `HH:MM` 24-hour format
- `end` may be `24:00`; `start` may not
- each configured interval must satisfy `start < end`
- omitted day parts fall back to built-in defaults
- unknown keys are ignored
- malformed config, unreadable config, missing config file, or invalid day-part override returns `invalid_input`

This side-car only affects vague day-part defaults. It does not change parsing, date-only behavior, or timezone rules.

---

## Output schema

## Success

```json
{
  "ok": true,
  "result": "<ISO 8601 UTC>",
  "resolved_window": {
    "start": "<ISO 8601 UTC>",
    "end": "<ISO 8601 UTC>"
  },
  "now": "<ISO 8601 UTC>",
  "anchor": "<ISO 8601 UTC>",
  "strategy": "<mode>",
  "random": {
    "shape": "<squared|linear>",
    "spread": "<narrow|medium|wide>"
  }
}
```

When `strategy` is not `random`, the `random` field is omitted.

The output does not echo `random.seed`.

## Failure

```json
{
  "ok": false,
  "error": "<code>",
  "detail": "<human-readable>"
}
```

## Error codes

| error code | meaning |
|---|---|
| `usage` | invalid CLI invocation |
| `unparseable` | `expression` could not be resolved to a usable date/time |
| `invalid_input` | malformed request field, malformed config, or invalid strategy/random settings |
| `window_past` | no eligible future time remains after clamping |
| `window_empty` | constraints leave no eligible time |

---

## Resolution model

Resolution is always minute-precise.

The algorithm is:

1. read request JSON
2. read optional config side-car
3. validate request and config
4. normalize `now` to UTC
5. parse `expression` relative to `now` in `timezone`
6. derive a candidate local window from the parsed expression
7. derive an **anchor instant** from the original expression meaning
8. convert the candidate window and anchor to UTC
9. intersect with explicit `window` if present
10. remove times at or before `now`
11. subtract `avoid` intervals
12. enumerate remaining eligible minutes
13. apply the selected placement strategy
14. return the chosen UTC minute

---

## Expression parsing

`nextup` uses `chrono-node` for natural-language parsing.

If multiple parses are returned, `nextup` uses the first parse returned by `chrono-node`.

If `chrono-node` cannot produce a usable parse, return `unparseable`.

---

## Candidate window derivation

The parsed expression is converted into a **candidate window** before hard constraints are applied.

Windows are constructed in the user's local timezone, then converted to UTC.

Intervals are treated as half-open: `[start, end)`.

That means:

- `start` is included
- `end` is excluded

## Built-in day-part defaults

| phrase | local window |
|---|---|
| `morning` | `08:00-12:00` |
| `afternoon` | `12:00-17:00` |
| `evening` | `17:00-21:00` |
| `night` | `21:00-24:00` |

If a config side-car provides `dayParts` overrides, those replace the corresponding defaults.

## Candidate window rules

### 1. Explicit parsed range

If the parser returns both a start and an end, use that local interval directly.

Examples:

- `"between 2 and 4pm tomorrow"` -> `[14:00, 16:00)` local
- `"tomorrow afternoon"` if parsed as a range -> use parser range

### 2. Specific clock time

If the expression resolves to a specific clock time, treat it as an exact minute.

Examples:

- `"at 2pm"`
- `"tomorrow at 09:30"`

Candidate window:

`[t, t + 1 minute)`

### 3. Date with part-of-day phrase

If the expression identifies a date and includes `morning`, `afternoon`, `evening`, or `night`, use the effective local day-part window for that date.

Examples:

- default: `"tomorrow morning"` -> `[08:00, 12:00)` local
- with config `{ "dayParts": { "morning": { "start": "09:00", "end": "11:30" } } }`, `"tomorrow morning"` -> `[09:00, 11:30)` local

### 4. Date-only expression

If the expression resolves to a date but not a time or day part, use the full local calendar day:

`[00:00, 24:00)`

Examples:

- `"tomorrow"`
- `"next Tuesday"`
- `"on April 9"`

---

## Anchor derivation

`nextup` derives an **anchor instant** from the original meaning of the expression before hard constraints are applied.

The anchor is used by anchor-based placement strategies.

## Anchor rules

### 1. Explicit parsed range

Anchor = midpoint instant of the parsed local range.

Example:

- `"between 9 and 12"` -> anchor `10:30` local

### 2. Specific clock time

Anchor = the exact resolved local time.

Example:

- `"tomorrow at 2pm"` -> anchor `14:00` local

### 3. Date with part-of-day phrase

Anchor = midpoint instant of the effective local day-part window.

Example:

- default `"tomorrow morning"` -> anchor `10:00` local
- if configured morning is `09:00-11:30`, anchor = `10:15` local

### 4. Date-only expression

Anchor = midpoint instant of the full local day.

Example:

- `"tomorrow"` -> anchor `12:00` local

## Anchor minute

Placement happens on UTC minute boundaries.

After converting the anchor instant to UTC, `nextup` derives an **anchor minute** by rounding to the nearest UTC minute boundary.

If exactly between two minute boundaries, choose the **later** minute.

---

## Explicit `window`

If `window` is provided, it is a hard constraint in absolute time.

Behavior:

- derive the candidate window from `expression`
- convert that candidate window to UTC
- intersect it with `window`

`window` narrows the expression meaning; it does not replace it.

If the intersection is empty, return `window_empty`.

---

## Future-only behavior

`nextup` never returns a timestamp at or before `now`.

After deriving and intersecting the candidate window, `nextup` removes all time `<= now`.

Because output precision is one minute, eligibility begins at the first full minute strictly after `now`.

Example:

- `now = 2026-04-03T18:00:30Z`
- earliest eligible minute = `2026-04-03T18:01:00Z`

If no future time remains, return `window_past`.

---

## Avoid intervals

`avoid` is a list of absolute intervals to exclude.

Rules:

- each avoid interval must satisfy `start < end`
- intervals may overlap and may be unsorted
- `nextup` normalizes and unions them before subtraction
- only overlap with the candidate window matters

If subtraction removes all eligible time, return `window_empty`.

---

## Eligible minutes

After all constraints are applied, `nextup` considers the remaining UTC minute boundaries inside the resolved window.

An eligible minute is a UTC timestamp on a minute boundary that lies inside the remaining eligible time.

If no eligible minutes remain, return `window_empty`.

---

## Placement strategies

## 1. `centered` (default)

This is the default strategy.

Choose the eligible minute closest to the anchor minute.

If two eligible minutes are equally close, choose the **later** minute.

This makes constraints behave like nudges away from the original intent rather than redefining the center around the largest surviving gap.

## 2. `largest-segment-midpoint`

Choose the midpoint minute of the longest remaining eligible segment.

Rules:

- choose the eligible segment with greatest duration
- if multiple segments tie, choose the **later** segment
- if the midpoint falls equally between two eligible minutes, choose the **later** minute

## 3. `random`

Choose a seeded weighted sample from an anchor-biased distribution over eligible minutes.

Rules:

- `random.seed` is required
- same `random.seed` + same inputs + same implementation version -> same result
- iteration order for cumulative sampling is chronological UTC order
- default `random.shape` is `squared`
- default `random.spread` is `medium`

### Random weight model

Let:

- `A` = anchor minute
- `M` = set of eligible minutes
- `d(m)` = absolute distance in whole minutes between `m` and `A`
- `S` = spread factor derived from `random.spread`

Spread factors:

- `narrow` -> `S = 0.5`
- `medium` -> `S = 1`
- `wide` -> `S = 2`

Scaled distance:

`ds(m) = d(m) / S`

Shape functions:

- `linear`: `w(m) = 1 / (1 + ds(m))`
- `squared`: `w(m) = 1 / (1 + ds(m))^2`

So:

- all eligible minutes remain possible
- `squared` concentrates more strongly around the anchor than `linear`
- `narrow` concentrates more strongly around the anchor than `medium`
- `wide` spreads probability more broadly than `medium`

This gives deterministic variation while keeping outcomes biased toward the anchor.

## 4. `earliest`

Choose the earliest eligible minute.

## 5. `latest`

Choose the latest eligible minute.

---

## Timezone and DST rules

All natural-language resolution happens in `timezone`.

Output is always UTC.

## DST gap handling

If a derived local boundary falls into a nonexistent wall-clock time during spring-forward DST transition, move that boundary forward to the next valid minute.

## DST ambiguity handling

If a derived local boundary falls into an ambiguous wall-clock time during fall-back DST transition:

- for exact timestamps and interval starts, choose the earlier occurrence
- for interval ends, choose the later occurrence

This preserves interval coverage and keeps resolution deterministic.

---

## Examples

All examples use:

```json
{ "now": "2026-04-03T18:00:00Z" }
```

## Basic vague phrase with default strategy

```bash
nextup '{"expression":"tomorrow morning","timezone":"America/New_York"}'
```

```json
{
  "ok": true,
  "result": "2026-04-04T14:00:00Z",
  "resolved_window": {
    "start": "2026-04-04T12:00:00Z",
    "end": "2026-04-04T16:00:00Z"
  },
  "now": "2026-04-03T18:00:00Z",
  "anchor": "2026-04-04T14:00:00Z",
  "strategy": "centered"
}
```

## Constraint nudges result but preserves the original center

```bash
nextup '{"expression":"tomorrow between 9 and 12","timezone":"America/New_York","avoid":[{"start":"2026-04-04T13:00:00Z","end":"2026-04-04T14:00:00Z"}],"now":"2026-04-03T18:00:00Z"}'
```

If the original anchor is `10:30` local on the resolved day and the avoid interval removes `09:00-10:00` local, the default `centered` strategy returns the eligible minute closest to the original anchor rather than recentering on the largest surviving segment.

## Largest segment midpoint

```bash
nextup '{"expression":"tomorrow morning","timezone":"America/New_York","avoid":[{"start":"2026-04-04T13:00:00Z","end":"2026-04-04T16:00:00Z"}],"now":"2026-04-03T18:00:00Z","strategy":"largest-segment-midpoint"}'
```

This returns the midpoint of the longest surviving segment.

## Random with seed

```bash
nextup '{"expression":"tomorrow morning","timezone":"America/New_York","now":"2026-04-03T18:00:00Z","strategy":"random","random":{"seed":"task-abc-2026-04-04"}}'
```

This returns a deterministic weighted sample biased toward the anchor.

A success response for `random` includes:

```json
{
  "strategy": "random",
  "random": {
    "shape": "squared",
    "spread": "medium"
  }
}
```

## Random with broader spread and linear falloff

```bash
nextup '{"expression":"tomorrow morning","timezone":"America/New_York","now":"2026-04-03T18:00:00Z","strategy":"random","random":{"seed":"task-abc-2026-04-04","shape":"linear","spread":"wide"}}'
```

This produces a broader seeded spread across eligible minutes than the default random settings.

## Config override for day part

```bash
nextup --config ./nextup.config.json '{"expression":"tomorrow morning","timezone":"America/New_York"}'
```

with:

```json
{
  "dayParts": {
    "morning": { "start": "09:00", "end": "11:30" }
  }
}
```

`"tomorrow morning"` resolves using the configured local morning window.

## Error: malformed avoid

```json
{
  "ok": false,
  "error": "invalid_input",
  "detail": "avoid[0].start must be a valid ISO 8601 timestamp with offset or Z"
}
```

## Error: random without seed

```json
{
  "ok": false,
  "error": "invalid_input",
  "detail": "random.seed is required when strategy is random"
}
```

---

## Design decisions

- CLI only
- local execution only
- strict JSON request/response contract
- strict validation for request and config
- exact times are exact
- date-only expressions mean the full local day
- vague day parts use default local windows, overridable via config
- explicit `window` narrows expression meaning rather than replacing it
- the default strategy chooses the eligible minute closest to the anchor
- tie breakers choose the later minute unless a strategy defines otherwise
- optional `random` mode uses seeded weighted sampling, not uniform randomness
- `random` defaults to `shape: squared` and `spread: medium`
- output is always UTC at minute precision

---

## Implementation plan

## Stack

- TypeScript
- `chrono-node` for natural-language parsing
- `@js-temporal/polyfill` for timezone-safe date math and DST handling
- small CLI wrapper using Node's stdlib

## Internal pipeline

1. parse CLI flags
2. read request JSON from argv or stdin
3. read optional config side-car
4. validate request and config
5. normalize `now`
6. parse `expression`
7. derive candidate local window and local anchor instant
8. convert window and anchor to UTC
9. intersect with explicit `window`
10. clamp to future time
11. union and subtract `avoid`
12. enumerate eligible minutes
13. apply selected placement strategy
14. emit JSON and exit with documented code

## Suggested module split

- `src/cli.ts` - argv/stdin handling, flags, exit codes
- `src/schema.ts` - request validation including strategy/random settings
- `src/config.ts` - side-car config loading and validation
- `src/parse.ts` - chrono integration
- `src/windows.ts` - candidate window derivation
- `src/anchor.ts` - anchor derivation and minute rounding
- `src/intervals.ts` - intersect/union/subtract logic
- `src/select.ts` - placement strategies and seeded sampling
- `src/random.ts` - random weight curves, spread handling, cumulative sampling
- `src/time.ts` - Temporal helpers and UTC formatting
- `src/errors.ts` - typed failures

---

## Test plan

## Unit tests

Cover:

- schema validation
- config validation
- exact time resolution
- day-part defaults
- day-part config overrides
- date-only defaults
- explicit window intersection
- avoid subtraction
- anchor derivation
- centered selection
- later-minute tie-breaking
- largest-segment-midpoint selection
- random shape weighting (`squared`, `linear`)
- random spread behavior (`narrow`, `medium`, `wide`)
- seeded random stability
- random output metadata (`shape`, `spread`)
- empty `random.seed`
- malformed inputs and invalid strategy/random combinations

## DST tests

Include cases for:

- spring-forward nonexistent local time
- fall-back ambiguous local time
- windows spanning DST transitions
- anchor conversion through DST transitions

## Snapshot tests

Use fixed `now` values and assert exact JSON outputs for canonical examples.

## CLI tests

Cover:

- argv input
- stdin input
- both provided -> usage error
- missing request -> usage error
- empty stdin -> usage error
- malformed JSON -> usage error
- invalid `strategy` -> `invalid_input`
- `strategy: random` without `random.seed` -> `invalid_input`
- empty `random.seed` -> `invalid_input`
- `random` present with non-random strategy -> `invalid_input`
- invalid `random.shape` or `random.spread` -> `invalid_input`
- malformed `random` object -> `invalid_input`
- random defaults applied when `strategy: random` is used without explicit `random.shape` or `random.spread`
- missing or unreadable `--config` -> `invalid_input`
- `earliest` and `latest` strategy selection
- `random` success output includes `random.shape` and `random.spread`
- non-random success output omits `random`
- usage error -> exit `64`
- domain failure -> exit `2`

---

## Acceptance criteria

`nextup` is done when:

- the CLI contract is implemented exactly
- anchor-based default placement is stable and tested
- all structured inputs are validated strictly
- day-part preference overrides work through config
- strategy selection works through request JSON
- random mode is deterministic under `random.seed`
- DST behavior is covered by tests
- no network or persistent state is required

---

## Positioning

`nextup` should stay small.

Its value is one dependable primitive:

> turn fuzzy human time language into one concrete UTC minute under explicit constraints

That narrow scope is the product.
