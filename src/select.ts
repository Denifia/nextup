import { Temporal } from "@js-temporal/polyfill";
import { selectRandomMinute } from "./random";
import { NormalizedRequest, UtcInterval } from "./types";

export function selectMinute(
  request: NormalizedRequest,
  eligibleMinutes: Temporal.Instant[],
  eligibleSegments: UtcInterval[],
  anchorMinute: Temporal.Instant,
): Temporal.Instant {
  switch (request.strategy) {
    case "centered":
      return selectCentered(eligibleMinutes, anchorMinute);
    case "largest-segment-midpoint":
      return selectLargestSegmentMidpoint(eligibleSegments);
    case "earliest":
      return eligibleMinutes[0];
    case "latest":
      return eligibleMinutes[eligibleMinutes.length - 1];
    case "random":
      return selectRandomMinute(eligibleMinutes, anchorMinute, request.random!);
  }
}

export function selectCentered(eligibleMinutes: Temporal.Instant[], anchorMinute: Temporal.Instant): Temporal.Instant {
  let best = eligibleMinutes[0];
  let bestDistance = Math.abs(best.epochMilliseconds - anchorMinute.epochMilliseconds);

  for (const minute of eligibleMinutes.slice(1)) {
    const distance = Math.abs(minute.epochMilliseconds - anchorMinute.epochMilliseconds);
    if (distance < bestDistance || (distance === bestDistance && Temporal.Instant.compare(minute, best) > 0)) {
      best = minute;
      bestDistance = distance;
    }
  }

  return best;
}

export function selectLargestSegmentMidpoint(eligibleSegments: UtcInterval[]): Temporal.Instant {
  let best = eligibleSegments[0];
  let bestDuration = best.end.epochMilliseconds - best.start.epochMilliseconds;

  for (const segment of eligibleSegments.slice(1)) {
    const duration = segment.end.epochMilliseconds - segment.start.epochMilliseconds;
    if (duration > bestDuration || (duration === bestDuration && Temporal.Instant.compare(segment.start, best.start) > 0)) {
      best = segment;
      bestDuration = duration;
    }
  }

  return midpointEligibleMinute(best);
}

function midpointEligibleMinute(segment: UtcInterval): Temporal.Instant {
  const first = Math.ceil(segment.start.epochMilliseconds / 60_000) * 60_000;
  const last = Math.floor((segment.end.epochMilliseconds - 1) / 60_000) * 60_000;
  const count = Math.floor((last - first) / 60_000) + 1;
  const midpointIndex = Math.floor(count / 2);
  return Temporal.Instant.fromEpochMilliseconds(first + midpointIndex * 60_000);
}
