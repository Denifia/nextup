# nextup specification

Version: **1.5.0**

`nextup` is a local CLI that resolves a natural-language time expression into one concrete UTC timestamp at minute precision.

- no network calls
- no persistent state
- one request in
- one JSON result out

It is a **time resolver**, not a scheduler.

## Summary

`nextup` answers one question:

> Given a human time expression plus optional hard constraints, what exact UTC minute should I use?

Examples:

- `"tomorrow morning"` -> `2026-04-05T02:00:00Z`
- `"next Tuesday at 2pm"` -> `2026-04-07T06:00:00Z`

## Non-goals

`nextup` does **not**:

- create reminders
- store tasks
- track history
- read calendars
- call external APIs
- manage recurring schedules
- guarantee deadline-safe scheduling

## CLI contract

### Invocation

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

### Flags

| flag | required | meaning |
|---|---|---|
| `--config <path>` | no | path to optional side-car config |

### Supported `strategy` values

| mode | meaning |
|---|---|
| `centered` | choose the eligible minute closest to the anchor |
| `largest-segment-midpoint` | choose the midpoint of the longest remaining eligible segment |
| `random` | choose a seeded weighted sample from an anchor-biased distribution |
| `earliest` | choose the earliest eligible minute |
| `latest` | choose the latest eligible minute |

### Strategy and random rules

- request `strategy` defaults to `centered`
- `random.seed` accepts any non-empty UTF-8 string
- `random.seed` is hashed deterministically as opaque text
- numeric-looking values are treated as strings
- `random.seed` is required when `strategy` is `random`
- `random.shape` defaults to `squared`
- `random.spread` defaults to `medium`
- `random` settings are only valid when `strategy` is `random`
- unsupported `strategy`, `random.shape`, or `random.spread` are `invalid_input`

## Output and exit codes

`nextup` writes exactly one JSON object to stdout for both success and failure.

- success: `{ "ok": true, ... }`
- failure: `{ "ok": false, ... }`

Usage errors return `error: "usage"` and exit code `64`.

Invalid request fields, malformed config, and invalid strategy/random settings return `error: "invalid_input"` and exit code `2`.

No banners or extra text are written to stdout.

### Exit codes

- `0` - success
- `2` - domain failure or invalid input
- `64` - usage error
- `70` - unexpected internal error

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

### Field rules

| field | required | rules |
|---|---|---|
| `expression` | yes | non-empty string |
| `window` | no | absolute interval, `start < end` |
| `avoid` | no | array of absolute intervals, each `start < end` |
| `timezone` | no | valid IANA timezone; default `UTC` |
| `now` | no | absolute timestamp; defaults to current system time |
| `strategy` | no | placement strategy; default `centered` |
| `random` | no | only valid when `strategy` is `random` |

### Random request rules

If `strategy` is `random`:

- `random` may omit `shape` and `spread`
- `random.seed` is required and must be non-empty
- `random.shape` defaults to `squared`
- `random.spread` defaults to `medium`

If `strategy` is not `random`:

- `random` must be omitted

### Structured timestamps

All structured timestamps in `window`, `avoid`, and `now` must be valid ISO 8601 timestamps with an explicit offset or `Z`.

Accepted:

- `2026-04-04T12:00:00Z`
- `2026-04-04T08:00:00-04:00`

Rejected:

- `2026-04-04 12:00:00`
- `2026-04-04T12:00:00`

## Side-car config

If `--config <path>` is omitted, built-in defaults are used.

### Config schema

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

### Config rules

- all times are local wall-clock times in `HH:MM` 24-hour format
- `end` may be `24:00`; `start` may not
- each configured interval must satisfy `start < end`
- omitted day parts fall back to built-in defaults
- unknown keys are ignored
- malformed, unreadable, or missing config returns `invalid_input`

This side-car only affects vague day-part defaults.

## Output schema

### Success

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

### Failure

```json
{
  "ok": false,
  "error": "<code>",
  "detail": "<human-readable>"
}
```

### Error codes

| error code | meaning |
|---|---|
| `usage` | invalid CLI invocation |
| `unparseable` | `expression` could not be resolved to a usable date/time |
| `invalid_input` | malformed request field, malformed config, or invalid strategy/random settings |
| `window_past` | no eligible future time remains after clamping |
| `window_empty` | constraints leave no eligible time |

## Resolution model

Resolution is always minute-precise.

Algorithm:

1. read request JSON
2. read optional config side-car
3. validate request and config
4. normalize `now` to UTC
5. parse `expression` relative to `now` in `timezone`
6. derive a candidate local window from the parsed expression
7. derive an anchor instant from the original expression meaning
8. convert candidate window and anchor to UTC
9. intersect with explicit `window` if present
10. remove times at or before `now`
11. subtract `avoid` intervals
12. enumerate remaining eligible minutes
13. apply the selected placement strategy
14. return the chosen UTC minute

## Expression parsing

`nextup` uses `chrono-node` for natural-language parsing.

If multiple parses are returned, `nextup` uses the first parse returned by `chrono-node`.

If `chrono-node` cannot produce a usable parse, return `unparseable`.

## Candidate window derivation

Windows are constructed in the user's local timezone, then converted to UTC.

Intervals are half-open: `[start, end)`.

### Built-in day-part defaults

| phrase | local window |
|---|---|
| `morning` | `08:00-12:00` |
| `afternoon` | `12:00-17:00` |
| `evening` | `17:00-21:00` |
| `night` | `21:00-24:00` |

### Candidate window rules

1. **Explicit parsed range** -> use the parsed local interval directly
2. **Specific clock time** -> `[t, t + 1 minute)`
3. **Date with part-of-day phrase** -> use the effective local day-part window for that date
4. **Date-only expression** -> use the full local calendar day `[00:00, 24:00)`

## Anchor derivation

The anchor is derived from the original expression meaning before hard constraints are applied.

### Anchor rules

1. **Explicit parsed range** -> midpoint instant of the parsed local range
2. **Specific clock time** -> the exact resolved local time
3. **Date with part-of-day phrase** -> midpoint instant of the effective local day-part window
4. **Date-only expression** -> midpoint instant of the full local day

### Anchor minute

Placement happens on UTC minute boundaries.

After converting the anchor instant to UTC, `nextup` rounds to the nearest UTC minute boundary.

If exactly between two minute boundaries, choose the later minute.

## Explicit `window`

If `window` is provided, it narrows the expression meaning; it does not replace it.

If the intersection is empty, return `window_empty`.

## Future-only behavior

`nextup` never returns a timestamp at or before `now`.

Eligibility begins at the first full minute strictly after `now`.

Example:

- `now = 2026-04-03T18:00:30Z`
- earliest eligible minute = `2026-04-03T18:01:00Z`

If no future time remains, return `window_past`.

## Avoid intervals

`avoid` is a list of absolute intervals to exclude.

Rules:

- each interval must satisfy `start < end`
- intervals may overlap and may be unsorted
- `nextup` normalizes and unions them before subtraction
- only overlap with the candidate window matters

If subtraction removes all eligible time, return `window_empty`.

## Eligible minutes

An eligible minute is a UTC timestamp on a minute boundary that lies inside the remaining eligible time.

If no eligible minutes remain, return `window_empty`.

## Placement strategies

### `centered` (default)

Choose the eligible minute closest to the anchor minute.

If two eligible minutes are equally close, choose the later minute.

### `largest-segment-midpoint`

Choose the midpoint minute of the longest remaining eligible segment.

Rules:

- choose the eligible segment with greatest duration
- if multiple segments tie, choose the later segment
- if the midpoint falls equally between two eligible minutes, choose the later minute

### `random`

Choose a seeded weighted sample from an anchor-biased distribution over eligible minutes.

Rules:

- `random.seed` is required
- same `random.seed` + same inputs + same implementation version -> same result
- iteration order for cumulative sampling is chronological UTC order
- default `random.shape` is `squared`
- default `random.spread` is `medium`

#### Random weight model

Let:

- `A` = anchor minute
- `M` = set of eligible minutes
- `d(m)` = absolute distance in whole minutes between `m` and `A`
- `S` = spread factor derived from `random.spread`

Spread factors:

- `narrow` -> `0.5`
- `medium` -> `1`
- `wide` -> `2`

Scaled distance:

`ds(m) = d(m) / S`

Shape functions:

- `linear`: `w(m) = 1 / (1 + ds(m))`
- `squared`: `w(m) = 1 / (1 + ds(m))^2`

### `earliest`

Choose the earliest eligible minute.

### `latest`

Choose the latest eligible minute.

## Timezone and DST rules

All natural-language resolution happens in `timezone`.

Output is always UTC.

### DST gap handling

If a derived local boundary falls into a nonexistent wall-clock time during spring-forward DST transition, move that boundary forward to the next valid minute.

### DST ambiguity handling

If a derived local boundary falls into an ambiguous wall-clock time during fall-back DST transition:

- for exact timestamps and interval starts, choose the earlier occurrence
- for interval ends, choose the later occurrence

## Examples

All examples use:

```json
{ "now": "2026-04-03T18:00:00Z" }
```

### Basic vague phrase with default strategy

```bash
nextup '{"expression":"tomorrow morning","timezone":"Australia/Perth"}'
```

```json
{
  "ok": true,
  "result": "2026-04-05T02:00:00Z",
  "resolved_window": {
    "start": "2026-04-05T00:00:00Z",
    "end": "2026-04-05T04:00:00Z"
  },
  "now": "2026-04-03T18:00:00Z",
  "anchor": "2026-04-05T02:00:00Z",
  "strategy": "centered"
}
```

### Random with seed

```bash
nextup '{"expression":"tomorrow morning","timezone":"Australia/Perth","now":"2026-04-03T18:00:00Z","strategy":"random","random":{"seed":"task-abc-2026-04-04"}}'
```

### Config override for day part

```bash
nextup --config ./nextup.config.json '{"expression":"tomorrow morning","timezone":"Australia/Perth"}'
```

with:

```json
{
  "dayParts": {
    "morning": { "start": "09:00", "end": "11:30" }
  }
}
```

### Error: malformed avoid

```json
{
  "ok": false,
  "error": "invalid_input",
  "detail": "avoid[0].start must be a valid ISO 8601 timestamp with offset or Z"
}
```

### Error: random without seed

```json
{
  "ok": false,
  "error": "invalid_input",
  "detail": "random.seed is required when strategy is random"
}
```
