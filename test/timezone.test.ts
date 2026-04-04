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

describe("Australia/Perth timezone behavior", () => {
  test("exact early-morning times map directly without DST adjustment", () => {
    const response = resolve({
      expression: "March 8 2026 at 2:30am",
      timezone: "Australia/Perth",
    });

    expect(response.result).toBe("2026-03-07T18:30:00Z");
    expect(response.anchor).toBe("2026-03-07T18:30:00Z");
  });

  test("late-year exact times are also stable without ambiguity", () => {
    const response = resolve(
      {
        expression: "November 1 2026 at 1:30am",
        timezone: "Australia/Perth",
      },
      instant("2026-10-20T12:00:00Z"),
    );

    expect(response.result).toBe("2026-10-31T17:30:00Z");
    expect(response.anchor).toBe("2026-10-31T17:30:00Z");
  });

  test("simple overnight ranges keep their literal one-hour width", () => {
    const response = resolve(
      {
        expression: "November 1 2026 12:30-1:30am",
        timezone: "Australia/Perth",
      },
      instant("2026-10-20T12:00:00Z"),
    );

    expect(response.resolved_window).toEqual({
      start: "2026-10-31T16:30:00Z",
      end: "2026-10-31T17:30:00Z",
    });
    expect(response.anchor).toBe("2026-10-31T17:00:00Z");
  });

  test("date-only windows span 24 hours in Australia/Perth", () => {
    const response = resolve({
      expression: "March 8 2026",
      timezone: "Australia/Perth",
    });

    expect(response.resolved_window).toEqual({
      start: "2026-03-07T16:00:00Z",
      end: "2026-03-08T16:00:00Z",
    });
    expect(response.result).toBe("2026-03-08T04:00:00Z");
  });
});
