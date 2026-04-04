import { FailureResponse, ResolutionResult, SuccessResponse } from "./types";
import { NextupError } from "./errors";
import { toUtcString } from "./time";

export function formatSuccess(result: ResolutionResult): SuccessResponse {
  return {
    ok: true,
    result: toUtcString(result.result),
    resolved_window: {
      start: toUtcString(result.resolvedWindow.start),
      end: toUtcString(result.resolvedWindow.end),
    },
    now: toUtcString(result.now),
    anchor: toUtcString(result.anchor),
    strategy: result.strategy,
    ...(result.random ? { random: result.random } : {}),
  };
}

export function formatFailure(error: NextupError): FailureResponse {
  return {
    ok: false,
    error: error.code,
    detail: error.message,
  };
}
