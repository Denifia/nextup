import { ceilToMinute } from "./time";
import { UtcInterval } from "./types";
import { Temporal } from "@js-temporal/polyfill";

export function enumerateEligibleMinutes(intervals: UtcInterval[]): Temporal.Instant[] {
  const result: Temporal.Instant[] = [];

  for (const interval of intervals) {
    let current = ceilToMinute(interval.start);
    while (Temporal.Instant.compare(current, interval.end) < 0) {
      result.push(current);
      current = current.add({ minutes: 1 });
    }
  }

  return result;
}
