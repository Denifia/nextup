# nextup

`nextup` resolves a natural-language time expression into one concrete UTC timestamp at minute precision.

It is a **time resolver**, not a scheduler.

- no network calls
- no persistent state
- one JSON request in
- one JSON response out

Current version: **1.5.0**

## What it does

Given a human time expression plus optional constraints, `nextup` returns the exact UTC minute to use.

Examples:

- `"tomorrow morning"` → `2026-04-04T14:00:00Z`
- `"next Tuesday at 2pm"` → `2026-04-07T18:00:00Z`

## What it does not do

`nextup` does not:

- create reminders
- store tasks
- read calendars
- call external APIs
- manage recurring schedules

## Installation

### From a local checkout

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

Passing both is a usage error. Passing neither is also a usage error.

## Request shape

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

## Example

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

## Config file

`--config <path>` optionally overrides vague day-part defaults.

Example config:

```json
{
  "dayParts": {
    "morning": { "start": "09:00", "end": "11:30" }
  }
}
```

Example:

```bash
nextup --config ./nextup.config.json '{"expression":"tomorrow morning","timezone":"America/New_York"}'
```

## Strategies

Supported `strategy` values:

- `centered` - closest eligible minute to the anchor
- `largest-segment-midpoint` - midpoint of the longest eligible segment
- `random` - deterministic seeded weighted sample biased toward the anchor
- `earliest` - earliest eligible minute
- `latest` - latest eligible minute

`strategy` defaults to `centered`.

If `strategy` is `random`, `random.seed` is required.

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

The detailed v1.5 spec and implementation notes currently live in [`./docs`](./docs).

## Contributing

Contributor setup and development workflow are documented in [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Releases

- CI runs on pushes and pull requests.
- GitHub releases are created from tags matching `v*`.
- The release workflow uploads the npm package tarball and checksums.
- npm publishing is supported when `NPM_TOKEN` is configured.
