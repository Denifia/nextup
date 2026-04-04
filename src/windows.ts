import { Temporal } from "@js-temporal/polyfill";
import { UnparseableError } from "./errors";
import { compareInstants, localDateTimeToInstant, parsedDateTimeToPlainDateTime, plainDateAtMinutes, roundToNearestMinuteTiesLater } from "./time";
import { EffectiveConfig, ParsedExpression, UtcInterval } from "./types";

export function deriveCandidateWindow(
  parsed: ParsedExpression,
  timeZone: string,
  config: EffectiveConfig,
): UtcInterval {
  if (parsed.kind === "range") {
    const start = localDateTimeToInstant(parsedDateTimeToPlainDateTime(parsed.start), timeZone, "exact-or-start");
    const end = localDateTimeToInstant(parsedDateTimeToPlainDateTime(parsed.end!), timeZone, "end");
    ensureInterval(start, end);
    return { start, end };
  }

  if (parsed.kind === "exact") {
    const start = localDateTimeToInstant(parsedDateTimeToPlainDateTime(parsed.start), timeZone, "exact-or-start");
    const end = start.add({ minutes: 1 });
    return { start, end };
  }

  const localDate = new Temporal.PlainDate(parsed.start.year, parsed.start.month, parsed.start.day);

  if (parsed.kind === "day-part") {
    const dayPart = parsed.dayPart;
    if (!dayPart) {
      throw new UnparseableError();
    }

    const window = config.dayParts[dayPart];
    const startDateTime = plainDateAtMinutes(localDate, window.startMinutes);
    const endDateTime = plainDateAtMinutes(localDate, window.endMinutes);
    const start = localDateTimeToInstant(startDateTime, timeZone, "exact-or-start");
    const end = localDateTimeToInstant(endDateTime, timeZone, "end");
    ensureInterval(start, end);
    return { start, end };
  }

  const startDateTime = localDate.toPlainDateTime(new Temporal.PlainTime(0, 0));
  const endDateTime = localDate.add({ days: 1 }).toPlainDateTime(new Temporal.PlainTime(0, 0));
  const start = localDateTimeToInstant(startDateTime, timeZone, "exact-or-start");
  const end = localDateTimeToInstant(endDateTime, timeZone, "end");
  ensureInterval(start, end);
  return { start, end };
}

export function deriveAnchorMinute(
  parsed: ParsedExpression,
  timeZone: string,
  config: EffectiveConfig,
): Temporal.Instant {
  if (parsed.kind === "range") {
    const interval = deriveCandidateWindow(parsed, timeZone, config);
    return midpointMinute(interval.start, interval.end);
  }

  if (parsed.kind === "exact") {
    const instant = localDateTimeToInstant(parsedDateTimeToPlainDateTime(parsed.start), timeZone, "exact-or-start");
    return roundToNearestMinuteTiesLater(instant);
  }

  const interval = deriveCandidateWindow(parsed, timeZone, config);
  return midpointMinute(interval.start, interval.end);
}

export function midpointMinute(start: Temporal.Instant, end: Temporal.Instant): Temporal.Instant {
  const startMs = start.epochMilliseconds;
  const endMs = end.epochMilliseconds;
  const midpointMs = startMs + (endMs - startMs) / 2;
  return roundToNearestMinuteTiesLater(Temporal.Instant.fromEpochMilliseconds(midpointMs));
}

function ensureInterval(start: Temporal.Instant, end: Temporal.Instant): void {
  if (compareInstants(start, end) >= 0) {
    throw new UnparseableError();
  }
}
