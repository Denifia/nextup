import { Temporal } from "@js-temporal/polyfill";
import { InvalidInputError } from "./errors";
import { ParsedDateTime } from "./types";

const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;
const MINUTE_MS = 60_000;
const OFFSET_NS_PER_MINUTE = 60_000_000_000;

export type BoundaryRole = "exact-or-start" | "end";

export function parseIsoInstant(value: string, fieldName: string): Temporal.Instant {
  if (!ISO_WITH_OFFSET.test(value)) {
    throw new InvalidInputError(`${fieldName} must be a valid ISO 8601 timestamp with offset or Z`);
  }

  try {
    return Temporal.Instant.from(value);
  } catch {
    throw new InvalidInputError(`${fieldName} must be a valid ISO 8601 timestamp with offset or Z`);
  }
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function getReferenceOffsetMinutes(now: Temporal.Instant, timeZone: string): number {
  const zoned = now.toZonedDateTimeISO(timeZone);
  return zoned.offsetNanoseconds / OFFSET_NS_PER_MINUTE;
}

export function toUtcString(instant: Temporal.Instant): string {
  return instant.toString();
}

export function floorToMinute(instant: Temporal.Instant): Temporal.Instant {
  const ms = instant.epochMilliseconds;
  return Temporal.Instant.fromEpochMilliseconds(Math.floor(ms / MINUTE_MS) * MINUTE_MS);
}

export function ceilToMinute(instant: Temporal.Instant): Temporal.Instant {
  const ms = instant.epochMilliseconds;
  return Temporal.Instant.fromEpochMilliseconds(Math.ceil(ms / MINUTE_MS) * MINUTE_MS);
}

export function roundToNearestMinuteTiesLater(instant: Temporal.Instant): Temporal.Instant {
  const ms = instant.epochMilliseconds;
  const remainder = ((ms % MINUTE_MS) + MINUTE_MS) % MINUTE_MS;
  const floor = ms - remainder;
  const rounded = remainder >= MINUTE_MS / 2 ? floor + MINUTE_MS : floor;
  return Temporal.Instant.fromEpochMilliseconds(rounded);
}

export function parsedDateTimeToPlainDateTime(value: ParsedDateTime): Temporal.PlainDateTime {
  return new Temporal.PlainDateTime(
    value.year,
    value.month,
    value.day,
    value.hour,
    value.minute,
    value.second,
    value.millisecond,
  );
}

export function localDateTimeToInstant(
  dateTime: Temporal.PlainDateTime,
  timeZone: string,
  role: BoundaryRole,
): Temporal.Instant {
  const earlier = dateTime.toZonedDateTime(timeZone, { disambiguation: "earlier" });
  const later = dateTime.toZonedDateTime(timeZone, { disambiguation: "later" });

  const earlierMatches = earlier.toPlainDateTime().equals(dateTime);
  const laterMatches = later.toPlainDateTime().equals(dateTime);

  if (earlierMatches && laterMatches) {
    if (earlier.epochNanoseconds === later.epochNanoseconds) {
      return earlier.toInstant();
    }

    return role === "end" ? later.toInstant() : earlier.toInstant();
  }

  return later.toInstant();
}

export function plainDateAtMinutes(date: Temporal.PlainDate, minutes: number): Temporal.PlainDateTime {
  if (minutes === 24 * 60) {
    return date.add({ days: 1 }).toPlainDateTime(new Temporal.PlainTime(0, 0));
  }

  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return date.toPlainDateTime(new Temporal.PlainTime(hour, minute));
}

export function addMinutes(instant: Temporal.Instant, minutes: number): Temporal.Instant {
  return instant.add({ minutes });
}

export function compareInstants(a: Temporal.Instant, b: Temporal.Instant): number {
  return Temporal.Instant.compare(a, b);
}
