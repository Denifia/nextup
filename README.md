# nextup

`nextup` resolves a natural-language time expression into one concrete UTC timestamp at minute precision.

It is a **time resolver**, not a scheduler.

- no network calls
- no persistent state
- one JSON request in
- one JSON response out

## What it does

Given a human time expression plus optional constraints, `nextup` returns the exact UTC minute to use.

Examples:

- `"tomorrow morning"` → `2026-04-04T14:00:00Z`
- `"next Tuesday at 2pm"` → `2026-04-07T18:00:00Z`

## Install

From a local checkout:

```bash
npm install
npm run build
```

Run the built CLI:

```bash
node dist/main.js '{"expression":"tomorrow morning"}'
```

Optionally link it locally as `nextup`:

```bash
npm link
nextup '{"expression":"tomorrow morning"}'
```

## Usage

```bash
nextup [--config <path>] '<request-json>'
```

or:

```bash
echo '<request-json>' | nextup [--config <path>]
```

Exactly one JSON request must be provided:

1. as the first non-flag argument, or
2. on stdin

## Quick example

```bash
nextup '{"expression":"tomorrow morning","timezone":"America/New_York","now":"2026-04-03T18:00:00Z"}'
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

## Request fields

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

Key rules:

- `expression` is required
- `timezone` defaults to `UTC`
- `strategy` defaults to `centered`
- structured timestamps must include an explicit offset or `Z`
- `random` is only valid when `strategy` is `random`
- `random.seed` is required when `strategy` is `random`

## Config file

`--config <path>` optionally overrides vague day-part defaults.

Example:

```json
{
  "dayParts": {
    "morning": { "start": "09:00", "end": "11:30" }
  }
}
```

## Strategies

- `centered` - closest eligible minute to the anchor
- `largest-segment-midpoint` - midpoint of the longest eligible segment
- `random` - deterministic seeded weighted sample biased toward the anchor
- `earliest` - earliest eligible minute
- `latest` - latest eligible minute

## Output

`nextup` always writes exactly one JSON object to stdout.

Success:

```json
{ "ok": true, "result": "..." }
```

Failure:

```json
{ "ok": false, "error": "...", "detail": "..." }
```

## Exit codes

- `0` - success
- `2` - domain failure or invalid input
- `64` - usage error
- `70` - unexpected internal error

## Documentation

- behavior spec: [`docs/spec.md`](./docs/spec.md)
- usage examples: [`docs/examples.md`](./docs/examples.md)
- implementation notes: [`docs/architecture.md`](./docs/architecture.md)
- contributor workflow: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- security policy: [`SECURITY.md`](./SECURITY.md)
- release history: [`CHANGELOG.md`](./CHANGELOG.md)
