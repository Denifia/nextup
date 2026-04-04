import { Temporal } from "@js-temporal/polyfill";

export function instant(value: string): Temporal.Instant {
  return Temporal.Instant.from(value);
}
