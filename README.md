# nextup

`nextup` is a local CLI that resolves a natural-language time expression into one concrete UTC timestamp at minute precision.

- no network calls
- no persistent state
- one JSON request in
- one JSON response out

Version: **1.5.0**

## Install

```bash
npm install
npm run build
```

Run from source during development:

```bash
npm run dev -- '{"expression":"tomorrow morning"}'
```

Run the built CLI:

```bash
node dist/main.js '{"expression":"tomorrow morning"}'
```

## CLI

```bash
nextup [--config <path>] '<request-json>'
```

or:

```bash
echo '<request-json>' | nextup [--config <path>]
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

## Scripts

```bash
npm run typecheck
npm test
npm run build
```

## Notes

The docs in [`./docs`](./docs) are the source of truth for the v1.5 behavior and contract.

## Releases

- CI runs on pushes and pull requests.
- GitHub releases are created from tags matching `v*`.
- The release workflow uploads the packed npm tarball and can publish to npm when `NPM_TOKEN` is configured.
