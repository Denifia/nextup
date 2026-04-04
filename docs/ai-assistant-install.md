# nextup agent install/integration contract

Audience: AI assistants, coding agents, and automation systems.

This file is intentionally written for agents to consume directly. Use it as the primary install/integration contract and source of truth for how to install and use `nextup`.

If a user points you at this file, your job is to understand `nextup`, install it if needed, invoke it correctly, and integrate its output into the downstream scheduling or reminder workflow.

Live URL:

`https://github.com/Denifia/nextup/blob/main/docs/ai-assistant-install.md`

Packaged/local path:

`docs/ai-assistant-install.md`

## What nextup is

`nextup` is a local CLI that converts a natural-language time expression into **one concrete UTC timestamp at minute precision**.

It is a **time resolver**, not a scheduler.

Properties:

- local process only
- no network calls
- no persistent state
- one JSON request in
- one JSON response out on normal execution
- deterministic for the same inputs, except that `strategy: "random"` is still deterministic when given the same `random.seed`

Examples of the problem it solves:

- `"tomorrow morning"`
- `"next Tuesday at 2pm"`
- `"Friday afternoon"`
- `"in 3 hours"`

## Why an assistant should use it

Assistants often need to turn vague user phrasing into one exact instant before handing work to a scheduler, reminder tool, task queue, cron wrapper, or calendar API.

Use `nextup` when:

- the user gives natural-language timing
- you need one exact UTC timestamp
- you want deterministic local resolution
- you want optional hard constraints via `window` and `avoid`
- you want user-specific day-part tuning via a config file

Do **not** use `nextup` as a replacement for:

- reminder storage
- recurring schedules
- calendar availability lookup
- task management
- external scheduling APIs

Recommended assistant pattern:

1. extract the user's timing phrase
2. determine the user's IANA timezone
3. set `now` explicitly in UTC
4. add `window` and/or `avoid` only if you already know hard constraints
5. run `nextup`
6. if `ok: true`, pass `result` into the real scheduler
7. if `ok: false`, handle the reported error code instead of guessing

## How to install

### Global npm install

```bash
npm install -g @denifia/nextup
```

This provides the `nextup` command.

### Local project install

```bash
npm install @denifia/nextup
```

Then invoke it from the package binary path, through `npx`, or from your runtime/tooling wrapper.

### From a source checkout

```bash
npm install
npm run build
node dist/main.js '{"expression":"tomorrow morning"}'
```

## How to invoke it

CLI forms:

```bash
nextup [--config <path>] '<request-json>'
```

or:

```bash
echo '<request-json>' | nextup [--config <path>]
```

Exactly one JSON request must be provided:

- either as the first non-flag argument
- or on stdin
- but not both

Help:

```bash
nextup --help
```

## Input schema

Full request schema:

```json
{
  "expression": "<natural language time expression>",
  "window": {
    "start": "<ISO 8601 timestamp with explicit offset or Z>",
    "end": "<ISO 8601 timestamp with explicit offset or Z>"
  },
  "avoid": [
    {
      "start": "<ISO 8601 timestamp with explicit offset or Z>",
      "end": "<ISO 8601 timestamp with explicit offset or Z>"
    }
  ],
  "timezone": "<IANA timezone>",
  "now": "<ISO 8601 timestamp with explicit offset or Z>",
  "strategy": "centered | largest-segment-midpoint | random | earliest | latest",
  "random": {
    "seed": "<string>",
    "shape": "squared | linear",
    "spread": "narrow | medium | wide"
  }
}
```

### Request field rules

| field | required | rules |
|---|---|---|
| `expression` | yes | non-empty string |
| `window` | no | absolute UTC-capable interval, `start < end` |
| `avoid` | no | array of absolute intervals, each with `start < end` |
| `timezone` | no | valid IANA timezone; defaults to `UTC` |
| `now` | no | absolute timestamp; defaults to current system time |
| `strategy` | no | defaults to `centered` |
| `random` | no | only allowed when `strategy` is `random` |

### Timestamp rules

For structured timestamps in `window`, `avoid`, and `now`:

- must be valid ISO 8601
- must include an explicit UTC offset or `Z`
- naive timestamps like `2026-04-04T12:00:00` are invalid

Accepted examples:

- `2026-04-04T12:00:00Z`
- `2026-04-04T08:00:00-04:00`

### Strategy rules

Supported `strategy` values:

- `centered`
- `largest-segment-midpoint`
- `random`
- `earliest`
- `latest`

Semantics:

- `centered`: eligible minute closest to the anchor; ties choose the later minute
- `largest-segment-midpoint`: midpoint minute of the longest eligible segment; ties prefer the later segment and later midpoint minute
- `random`: deterministic seeded weighted sampling biased toward the anchor
- `earliest`: earliest eligible minute
- `latest`: latest eligible minute

Important nuance for agents: if a vague resolved window is already in progress when `nextup` runs (for example `this evening` after the evening window has started), `nextup` re-centers the anchor on the remaining future portion instead of defaulting to the next minute.

### Random rules

If `strategy` is `random`:

- `random.seed` is required and must be non-empty
- `random.shape` defaults to `squared`
- `random.spread` defaults to `medium`

If `strategy` is not `random`:

- omit `random`

### Config schema

`--config <path>` points to an optional JSON side-car config that tunes vague day-part windows.

Full config schema:

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

Config rules:

- all times are local wall-clock times in `HH:MM` 24-hour format
- supported keys: `morning`, `afternoon`, `evening`, `night`
- `end` may be `24:00`; `start` may not
- each configured interval must satisfy `start < end`
- omitted day parts fall back to built-in defaults
- unknown keys are ignored
- unreadable/malformed config is an `invalid_input` failure

## Output schema

On normal execution, `nextup` writes exactly one JSON object to stdout.

### Success output

```json
{
  "ok": true,
  "result": "<ISO 8601 UTC timestamp>",
  "resolved_window": {
    "start": "<ISO 8601 UTC timestamp>",
    "end": "<ISO 8601 UTC timestamp>"
  },
  "now": "<ISO 8601 UTC timestamp>",
  "anchor": "<ISO 8601 UTC timestamp>",
  "strategy": "centered | largest-segment-midpoint | random | earliest | latest",
  "random": {
    "shape": "squared | linear",
    "spread": "narrow | medium | wide"
  }
}
```

Success output rules:

- `random` is omitted unless `strategy` is `random`
- `random.seed` is never echoed back
- `result` is the chosen UTC minute to pass to downstream scheduling systems
- `resolved_window` is the final UTC window after expression resolution and hard constraints

### Failure output

```json
{
  "ok": false,
  "error": "<code>",
  "detail": "<human-readable message>"
}
```

Failure codes you should handle:

| code | meaning |
|---|---|
| `usage` | invalid CLI invocation |
| `invalid_input` | malformed request field, malformed config, or invalid strategy/random settings |
| `unparseable` | the expression could not be resolved to a usable date/time |
| `window_past` | no eligible future time remains after clamping |
| `window_empty` | constraints leave no eligible time |
| `internal` | unexpected internal failure |

### Exit codes

- `0` = success
- `2` = domain failure / invalid input (`invalid_input`, `unparseable`, `window_past`, `window_empty`)
- `64` = usage error
- `70` = unexpected internal error

## Assistant integration guidance

### Minimal integration request

```json
{
  "expression": "tomorrow morning",
  "timezone": "Australia/Perth",
  "now": "2026-04-03T18:00:00Z"
}
```

CLI:

```bash
nextup '{"expression":"tomorrow morning","timezone":"Australia/Perth","now":"2026-04-03T18:00:00Z"}'
```

Expected success shape:

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

### Constrained example

```bash
nextup --config ./nextup.config.json '{"expression":"Friday afternoon","timezone":"Australia/Perth","now":"2026-04-03T18:00:00Z","strategy":"earliest","avoid":[{"start":"2026-04-10T09:00:00Z","end":"2026-04-10T10:00:00Z"}]}'
```

### Deterministic random example

```bash
nextup '{"expression":"tomorrow morning","timezone":"Australia/Perth","now":"2026-04-03T18:00:00Z","strategy":"random","random":{"seed":"task-abc-2026-04-04"}}'
```

Use deterministic random when you want repeatable variety without changing behavior across identical runs.

## Operational guidance for agents

When integrating:

- prefer passing `now` explicitly instead of relying on ambient clock state
- prefer the user's explicit timezone over guessing
- treat `result` as authoritative only when `ok: true`
- do not parse human prose from stderr; parse stdout JSON
- do not assume the resolver knows calendar availability unless you encode it into `window` or `avoid`
- do not invent a timestamp when `nextup` returns `ok: false`

## File location

This file is shipped in the release archive so installed agents can read it locally from:

```text
docs/ai-assistant-install.md
```

## Related docs

- `README.md`
- `docs/spec.md`
- `docs/examples.md`
- `docs/agent-integration-example.md`
