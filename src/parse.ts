import * as chrono from "chrono-node";
import { UnparseableError } from "./errors";
import { getReferenceOffsetMinutes } from "./time";
import { DayPartName, ParsedDateTime, ParsedExpression } from "./types";
import { Temporal } from "@js-temporal/polyfill";

const DAY_PART_RE = /\b(morning|afternoon|evening|night)\b/i;
const COMPONENT_NAMES = [
  "year",
  "month",
  "day",
  "hour",
  "minute",
  "second",
  "millisecond",
] as const;

export function parseExpression(
  expression: string,
  now: Temporal.Instant,
  timeZone: string,
): ParsedExpression {
  const referenceOffset = getReferenceOffsetMinutes(now, timeZone);
  const results = chrono.parse(expression, {
    instant: new Date(now.epochMilliseconds),
    timezone: referenceOffset,
  });

  const result = results[0];
  if (!result) {
    throw new UnparseableError();
  }

  const start = toParsedDateTime(result.start as chrono.ParsingComponents);
  const end = result.end ? toParsedDateTime(result.end as chrono.ParsingComponents) : undefined;
  const dayPart = detectDayPart(expression, [...result.tags()]);

  const kind = end
    ? "range"
    : isSpecificClockTime(start)
      ? "exact"
      : dayPart
        ? "day-part"
        : "date";

  return {
    originalText: expression,
    matchedText: result.text,
    start,
    end,
    kind,
    dayPart,
  };
}

function toParsedDateTime(value: chrono.ParsingComponents): ParsedDateTime {
  const certain = new Set<string>(value.getCertainComponents());
  const resolved: Record<string, number> = {};

  for (const name of COMPONENT_NAMES) {
    const componentValue = value.get(name);
    if (componentValue === null || componentValue === undefined) {
      throw new UnparseableError();
    }

    resolved[name] = componentValue;
  }

  return {
    year: resolved.year,
    month: resolved.month,
    day: resolved.day,
    hour: resolved.hour,
    minute: resolved.minute,
    second: resolved.second,
    millisecond: resolved.millisecond,
    certain,
  };
}

function isSpecificClockTime(value: ParsedDateTime): boolean {
  return value.certain.has("hour") || value.certain.has("minute");
}

function detectDayPart(expression: string, tags: string[]): DayPartName | undefined {
  const directMatch = expression.match(DAY_PART_RE)?.[1]?.toLowerCase();
  if (directMatch === "morning" || directMatch === "afternoon" || directMatch === "evening" || directMatch === "night") {
    return directMatch;
  }

  const tagMatch = tags.find((tag) =>
    tag === "casualReference/morning" ||
    tag === "casualReference/afternoon" ||
    tag === "casualReference/evening",
  );

  if (tagMatch?.endsWith("morning")) {
    return "morning";
  }

  if (tagMatch?.endsWith("afternoon")) {
    return "afternoon";
  }

  if (tagMatch?.endsWith("evening")) {
    return "evening";
  }

  return undefined;
}
