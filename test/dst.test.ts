import { describe, expect, test } from "vitest";
import { getDefaultConfig } from "../src/config";
import { resolveNextup } from "../src/resolve";
import { normalizeRequest } from "../src/schema";
import { formatSuccess } from "../src/output";
import { instant } from "./helpers";

function resolve(input: unknown, now = instant("2026-03-01T12:00:00Z")) {
  const request = normalizeRequest(input, now);
  return formatSuccess(resolveNextup(request, getDefaultConfig()));
}

describe("DST handling", () => {
  test("moves nonexistent spring-forward exact times forward", () => {
    const response = resolve({
      expression: "March 8 2026 at 2:30am",
      timezone: "America/New_York",
    });

    expect(response.result).toBe("2026-03-08T07:30:00Z");
    expect(response.anchor).toBe("2026-03-08T07:30:00Z");
  });

  test("chooses earlier occurrence for ambiguous fall-back exact times", () => {
    const response = resolve(
      {
        expression: "November 1 2026 at 1:30am",
        timezone: "America/New_York",
      },
      instant("2026-10-20T12:00:00Z"),
    );

    expect(response.result).toBe("2026-11-01T05:30:00Z");
    expect(response.anchor).toBe("2026-11-01T05:30:00Z");
  });

  test("chooses later occurrence for ambiguous interval ends", () => {
    const response = resolve(
      {
        expression: "November 1 2026 12:30-1:30am",
        timezone: "America/New_York",
      },
      instant("2026-10-20T12:00:00Z"),
    );

    expect(response.resolved_window).toEqual({
      start: "2026-11-01T04:30:00Z",
      end: "2026-11-01T06:30:00Z",
    });
    expect(response.anchor).toBe("2026-11-01T05:30:00Z");
  });

  test("date-only windows span 23 hours on spring-forward day", () => {
    const response = resolve({
      expression: "March 8 2026",
      timezone: "America/New_York",
    });

    expect(response.resolved_window).toEqual({
      start: "2026-03-08T05:00:00Z",
      end: "2026-03-09T04:00:00Z",
    });
    expect(response.result).toBe("2026-03-08T16:30:00Z");
  });
});
