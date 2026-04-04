# nextup examples

This document collects practical `nextup` usage examples.

For the full behavior contract, see [`spec.md`](./spec.md).

## Basic vague phrase

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

## Date-only expression

```bash
nextup '{"expression":"tomorrow","timezone":"America/New_York","now":"2026-04-03T18:00:00Z"}'
```

Returns the midpoint of the full local day after future clamping and constraint handling.

## Exact time

```bash
nextup '{"expression":"tomorrow at 09:30","timezone":"America/New_York","now":"2026-04-03T18:00:00Z"}'
```

This resolves to one exact eligible minute.

## Explicit window narrows the expression

```bash
nextup '{"expression":"tomorrow morning","timezone":"America/New_York","now":"2026-04-03T18:00:00Z","window":{"start":"2026-04-04T13:00:00Z","end":"2026-04-04T15:00:00Z"}}'
```

The explicit window narrows the candidate window; it does not replace it.

## Avoid blocked time

```bash
nextup '{"expression":"tomorrow morning","timezone":"America/New_York","now":"2026-04-03T18:00:00Z","avoid":[{"start":"2026-04-04T13:59:00Z","end":"2026-04-04T14:01:00Z"}]}'
```

The default `centered` strategy still chooses the eligible minute closest to the original anchor.

## Choose earliest or latest

Earliest:

```bash
nextup '{"expression":"tomorrow morning","timezone":"America/New_York","now":"2026-04-03T18:00:00Z","strategy":"earliest"}'
```

Latest:

```bash
nextup '{"expression":"tomorrow morning","timezone":"America/New_York","now":"2026-04-03T18:00:00Z","strategy":"latest"}'
```

## Largest-segment midpoint

```bash
nextup '{"expression":"tomorrow morning","timezone":"America/New_York","now":"2026-04-03T18:00:00Z","strategy":"largest-segment-midpoint","avoid":[{"start":"2026-04-04T13:00:00Z","end":"2026-04-04T16:00:00Z"}]}'
```

This picks the midpoint of the longest remaining eligible segment.

## Random with deterministic seed

```bash
nextup '{"expression":"tomorrow morning","timezone":"America/New_York","now":"2026-04-03T18:00:00Z","strategy":"random","random":{"seed":"task-abc-2026-04-04"}}'
```

The same seed and same inputs produce the same result for the same implementation version.

## Random with wider spread

```bash
nextup '{"expression":"tomorrow morning","timezone":"America/New_York","now":"2026-04-03T18:00:00Z","strategy":"random","random":{"seed":"task-abc-2026-04-04","shape":"linear","spread":"wide"}}'
```

This gives a broader deterministic spread across eligible minutes.

## Use a config file for day-part preferences

`nextup.config.json`:

```json
{
  "dayParts": {
    "morning": { "start": "09:00", "end": "11:30" }
  }
}
```

Command:

```bash
nextup --config ./nextup.config.json '{"expression":"tomorrow morning","timezone":"America/New_York","now":"2026-04-03T18:00:00Z"}'
```

## Read request JSON from stdin

```bash
echo '{"expression":"tomorrow morning","timezone":"America/New_York","now":"2026-04-03T18:00:00Z"}' | nextup
```

## Invalid input example

```bash
nextup '{"expression":"tomorrow","avoid":[{"start":"2026-04-04T12:00:00","end":"2026-04-04T13:00:00Z"}]}'
```

```json
{
  "ok": false,
  "error": "invalid_input",
  "detail": "avoid[0].start must be a valid ISO 8601 timestamp with offset or Z"
}
```
