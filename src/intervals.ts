import { Temporal } from "@js-temporal/polyfill";
import { UtcInterval } from "./types";

export function intersectIntervals(left: UtcInterval, right: UtcInterval): UtcInterval | null {
  const start = Temporal.Instant.compare(left.start, right.start) >= 0 ? left.start : right.start;
  const end = Temporal.Instant.compare(left.end, right.end) <= 0 ? left.end : right.end;
  return Temporal.Instant.compare(start, end) < 0 ? { start, end } : null;
}

export function mergeIntervals(intervals: UtcInterval[]): UtcInterval[] {
  if (intervals.length === 0) {
    return [];
  }

  const sorted = [...intervals].sort((a, b) => Temporal.Instant.compare(a.start, b.start));
  const merged: UtcInterval[] = [{ ...sorted[0] }];

  for (const current of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (Temporal.Instant.compare(current.start, last.end) <= 0) {
      if (Temporal.Instant.compare(current.end, last.end) > 0) {
        last.end = current.end;
      }
      continue;
    }

    merged.push({ ...current });
  }

  return merged;
}

export function subtractIntervals(base: UtcInterval[], removes: UtcInterval[]): UtcInterval[] {
  if (base.length === 0 || removes.length === 0) {
    return [...base];
  }

  const normalizedRemoves = mergeIntervals(removes);
  let segments = [...base];

  for (const remove of normalizedRemoves) {
    const nextSegments: UtcInterval[] = [];

    for (const segment of segments) {
      if (Temporal.Instant.compare(remove.end, segment.start) <= 0 || Temporal.Instant.compare(remove.start, segment.end) >= 0) {
        nextSegments.push(segment);
        continue;
      }

      if (Temporal.Instant.compare(remove.start, segment.start) > 0) {
        nextSegments.push({ start: segment.start, end: remove.start });
      }

      if (Temporal.Instant.compare(remove.end, segment.end) < 0) {
        nextSegments.push({ start: remove.end, end: segment.end });
      }
    }

    segments = nextSegments;
  }

  return segments;
}

export function enclosingInterval(intervals: UtcInterval[]): UtcInterval | null {
  if (intervals.length === 0) {
    return null;
  }

  const merged = mergeIntervals(intervals);
  return {
    start: merged[0].start,
    end: merged[merged.length - 1].end,
  };
}
