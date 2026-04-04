# Agent install/integration example

This is a simple example of using `nextup` as part of a real assistant workflow.

The recommended path is to point the assistant at the agent install/integration contract:

- local/package path: `docs/ai-assistant-install.md`
- live URL: `https://github.com/Denifia/nextup/blob/main/docs/ai-assistant-install.md`

A user asked their AI assistant to read that file and integrate `nextup` for ad-hoc scheduling. The assistant correctly recognized that `nextup` fit as a resolver layer between conversational requests like "tomorrow morning" and the final scheduler that needs one concrete timestamp.

The nice part was how little ceremony was required. The assistant:

1. read the agent install/integration contract
2. understood what `nextup` does and what schema it expects
3. proposed a concrete integration plan
4. installed it
5. added a local config file for preferred day-part windows
6. updated its own notes so it would keep using `nextup` for future reminder flows

## The back-and-forth

The conversation was roughly:

> **User:** Go read `https://github.com/Denifia/nextup/blob/main/docs/ai-assistant-install.md` and integrate with it so you handle ad-hoc scheduling better.
>
> **Assistant:** `nextup` is a natural-language time resolver. I should use it before creating reminders so phrases like "next Saturday evening" or "tomorrow morning" resolve to one exact UTC timestamp instead of me guessing. I also have the exact install steps and request/response schema. Do you want me to set that up?
>
> **User:** Do it.
>
> **Assistant:** Installed. I also added a config so day parts match your preferences and updated my internal notes so I use `nextup` before creating `at`-style scheduled reminders.

That is exactly the kind of integration `nextup` is meant to make easy: the human points the assistant at one file, and the assistant gets the install details plus the full contract it needs.

## Why it worked well

The assistant did not need a deep custom integration or a hosted service. It just needed to call `nextup` as a deterministic local tool.

The workflow became:

1. user says something vague like "remind me about the Warframe update next Saturday evening"
2. assistant extracts the time phrase
3. assistant calls `nextup`
4. `nextup` returns one UTC timestamp
5. assistant passes that timestamp into its scheduler

Example request:

```json
{
  "expression": "next Saturday evening",
  "timezone": "Australia/Perth",
  "now": "2026-04-04T15:00:00Z"
}
```

Example CLI call:

```bash
nextup '{"expression":"next Saturday evening","timezone":"Australia/Perth","now":"2026-04-04T15:00:00Z"}'
```

The returned `result` is ready to hand to a reminder system, cron wrapper, task runner, or any other scheduler.

## Personal day-part tuning

In this setup, the assistant also added a config file so vague phrases better matched the user's expectations in `Australia/Perth`.

`nextup.config.json`:

```json
{
  "dayParts": {
    "morning": { "start": "07:30", "end": "10:00" },
    "afternoon": { "start": "12:00", "end": "17:00" },
    "evening": { "start": "18:00", "end": "21:00" }
  }
}
```

Then the assistant could call:

```bash
nextup --config ./nextup.config.json '{"expression":"tomorrow morning","timezone":"Australia/Perth","now":"2026-04-03T18:00:00Z"}'
```

This is a good example of how `nextup` can improve an assistant immediately: install it, set a timezone, optionally tune day parts, and start resolving vague scheduling language into precise UTC times.

## A practical pattern for assistants

For personal assistant and reminder workflows, a good pattern is:

- use the user's IANA timezone
- pass the current time as `now`
- use `centered` when the phrasing is casual
- use `earliest` when the task feels deadline-oriented
- add `avoid` windows if the assistant already knows blocked times
- only create the scheduled task after `nextup` returns `ok: true`

Example with constraints:

```json
{
  "expression": "Friday afternoon",
  "timezone": "Australia/Perth",
  "now": "<current_utc_iso>",
  "strategy": "earliest",
  "avoid": [
    {
      "start": "2026-04-10T09:00:00Z",
      "end": "2026-04-10T10:00:00Z"
    }
  ]
}
```
