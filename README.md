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

- `"tomorrow morning"` → `2026-04-05T02:00:00Z`
- `"next Tuesday at 2pm"` → `2026-04-07T06:00:00Z`

## Install

From npm:

```bash
npm install -g @denifia/nextup
```

This installs the `nextup` command.

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

## Agent install/integration contract

If you want a personal AI assistant or coding agent to install and integrate `nextup` for you, point it at [`docs/ai-assistant-install.md`](./docs/ai-assistant-install.md) and tell it to use that file as the source of truth.

That file gives the agent:

- what `nextup` is and is not
- how to install it
- how to invoke it
- the full input schema
- the full output schema
- how to wire `result` into a scheduler or reminder tool

Example prompts:

> Read this file and use it to install and integrate `nextup`: `https://github.com/Denifia/nextup/blob/main/docs/ai-assistant-install.md`

> Go read `docs/ai-assistant-install.md` and integrate with it.

> Read `docs/ai-assistant-install.md`, install `nextup`, and use it whenever you need to turn vague time phrases into one exact UTC timestamp.

Use the URL above if your assistant can read remote files. Use the packaged local file `docs/ai-assistant-install.md` if it is working from a local checkout or installed package.

Want to see what that workflow looks like in practice? See [`docs/agent-integration-example.md`](./docs/agent-integration-example.md).

## Usage

```bash
nextup [--config <path>] '<request-json>'
```

or:

```bash
echo '<request-json>' | nextup [--config <path>]
```

Help:

```bash
nextup --help
```

Exactly one JSON request must be provided:

1. as the first non-flag argument, or
2. on stdin

## Quick example

```bash
nextup '{"expression":"tomorrow morning","timezone":"Australia/Perth","now":"2026-04-03T18:00:00Z"}'
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

Supported configurable day parts are:

- `morning`
- `afternoon`
- `evening`
- `night`

Unknown/custom day-part keys are ignored.

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

For vague windows already in progress, `centered` re-centers on the remaining future portion instead of collapsing to the next minute.

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

- AI assistant install/integration contract: [`docs/ai-assistant-install.md`](./docs/ai-assistant-install.md) - hand this file to an agent and tell it to read it before integrating `nextup`
- behavior spec: [`docs/spec.md`](./docs/spec.md)
- usage examples: [`docs/examples.md`](./docs/examples.md)
- agent integration example: [`docs/agent-integration-example.md`](./docs/agent-integration-example.md)
- implementation notes: [`docs/architecture.md`](./docs/architecture.md)
- contributor workflow: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- security policy: [`SECURITY.md`](./SECURITY.md)
- release history: [`CHANGELOG.md`](./CHANGELOG.md)
