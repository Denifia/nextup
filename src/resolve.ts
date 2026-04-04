import { WindowEmptyError, WindowPastError } from "./errors";
import { enumerateEligibleMinutes } from "./eligible";
import { enclosingInterval, intersectIntervals, mergeIntervals, subtractIntervals } from "./intervals";
import { parseExpression } from "./parse";
import { selectMinute } from "./select";
import { ceilToMinute } from "./time";
import { EffectiveConfig, NormalizedRequest, ResolutionResult, UtcInterval } from "./types";
import { deriveAnchorMinute, deriveCandidateWindow } from "./windows";
import { Temporal } from "@js-temporal/polyfill";

export function resolveNextup(request: NormalizedRequest, config: EffectiveConfig): ResolutionResult {
  const parsed = parseExpression(request.expression, request.now, request.timezone);
  const candidateWindow = deriveCandidateWindow(parsed, request.timezone, config);
  const anchorMinute = deriveAnchorMinute(parsed, request.timezone, config);

  let constrained: UtcInterval = candidateWindow;
  if (request.window) {
    const intersection = intersectIntervals(constrained, request.window);
    if (!intersection) {
      throw new WindowEmptyError("explicit window does not overlap the resolved expression window");
    }

    constrained = intersection;
  }

  const futureStart = ceilToMinute(request.now.add({ milliseconds: 1 }));
  if (Temporal.Instant.compare(futureStart, constrained.end) >= 0) {
    throw new WindowPastError();
  }

  if (Temporal.Instant.compare(futureStart, constrained.start) > 0) {
    constrained = { start: futureStart, end: constrained.end };
  }

  const eligibleAfterFutureClamp = enumerateEligibleMinutes([constrained]);
  if (eligibleAfterFutureClamp.length === 0) {
    throw new WindowPastError();
  }

  const remainingSegments = subtractIntervals([constrained], mergeIntervals(request.avoid));
  const eligibleMinutes = enumerateEligibleMinutes(remainingSegments);
  if (eligibleMinutes.length === 0) {
    throw new WindowEmptyError();
  }

  const result = selectMinute(request, eligibleMinutes, remainingSegments, anchorMinute);
  const resolvedWindow = enclosingInterval(remainingSegments)!;

  return {
    result,
    resolvedWindow,
    anchor: anchorMinute,
    now: request.now,
    strategy: request.strategy,
    random: request.random
      ? {
          shape: request.random.shape,
          spread: request.random.spread,
        }
      : undefined,
  };
}
