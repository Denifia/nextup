import { describe, expect, test } from "vitest";
import { getDefaultConfig, normalizeConfig } from "../src/config";
import { WindowEmptyError, WindowPastError } from "../src/errors";
import { resolveNextup } from "../src/resolve";
import { normalizeRequest } from "../src/schema";
import { formatSuccess } from "../src/output";
import { instant } from "./helpers";

const FIXED_NOW = instant("2026-04-03T18:00:00Z");

function resolve(input: unknown) {
  const request = normalizeRequest(input, FIXED_NOW);
  return resolveNextup(request, getDefaultConfig());
}

describe("resolveNextup", () => {
  test("resolves tomorrow morning with centered strategy", () => {
    const response = formatSuccess(
      resolve({ expression: "tomorrow morning", timezone: "America/New_York" }),
    );

    expect(response).toEqual({
      ok: true,
      result: "2026-04-04T14:00:00Z",
      resolved_window: {
        start: "2026-04-04T12:00:00Z",
        end: "2026-04-04T16:00:00Z",
      },
      now: "2026-04-03T18:00:00Z",
      anchor: "2026-04-04T14:00:00Z",
      strategy: "centered",
    });
  });

  test("resolves date-only expressions to full local day", () => {
    const response = formatSuccess(
      resolve({ expression: "tomorrow", timezone: "America/New_York" }),
    );

    expect(response.result).toBe("2026-04-04T16:00:00Z");
    expect(response.resolved_window).toEqual({
      start: "2026-04-04T04:00:00Z",
      end: "2026-04-05T04:00:00Z",
    });
    expect(response.anchor).toBe("2026-04-04T16:00:00Z");
  });

  test("resolves exact times as exact minutes", () => {
    const response = formatSuccess(
      resolve({ expression: "tomorrow at 09:30", timezone: "America/New_York" }),
    );

    expect(response.result).toBe("2026-04-04T13:30:00Z");
    expect(response.resolved_window).toEqual({
      start: "2026-04-04T13:30:00Z",
      end: "2026-04-04T13:31:00Z",
    });
  });

  test("supports day-part config overrides", () => {
    const request = normalizeRequest(
      { expression: "tomorrow morning", timezone: "America/New_York" },
      FIXED_NOW,
    );
    const config = normalizeConfig({
      dayParts: { morning: { start: "09:00", end: "11:30" } },
    });

    const response = formatSuccess(resolveNextup(request, config));
    expect(response.result).toBe("2026-04-04T14:15:00Z");
    expect(response.resolved_window).toEqual({
      start: "2026-04-04T13:00:00Z",
      end: "2026-04-04T15:30:00Z",
    });
  });

  test("intersects explicit window", () => {
    const response = formatSuccess(
      resolve({
        expression: "tomorrow morning",
        timezone: "America/New_York",
        window: {
          start: "2026-04-04T13:00:00Z",
          end: "2026-04-04T15:00:00Z",
        },
      }),
    );

    expect(response.result).toBe("2026-04-04T14:00:00Z");
    expect(response.resolved_window).toEqual({
      start: "2026-04-04T13:00:00Z",
      end: "2026-04-04T15:00:00Z",
    });
  });

  test("subtracts avoid intervals and keeps centered anchor behavior", () => {
    const response = formatSuccess(
      resolve({
        expression: "tomorrow morning",
        timezone: "America/New_York",
        avoid: [
          { start: "2026-04-04T13:59:00Z", end: "2026-04-04T14:01:00Z" },
        ],
      }),
    );

    expect(response.result).toBe("2026-04-04T14:01:00Z");
    expect(response.resolved_window).toEqual({
      start: "2026-04-04T12:00:00Z",
      end: "2026-04-04T16:00:00Z",
    });
  });

  test("returns window_past after future clamp", () => {
    expect(() =>
      resolve({
        expression: "at 2pm",
        timezone: "America/New_York",
      }),
    ).toThrowError(new WindowPastError("no eligible future time remains after clamping"));
  });

  test("returns window_empty when avoid removes all eligible time", () => {
    expect(() =>
      resolve({
        expression: "tomorrow at 09:30",
        timezone: "America/New_York",
        avoid: [
          { start: "2026-04-04T13:30:00Z", end: "2026-04-04T13:31:00Z" },
        ],
      }),
    ).toThrowError(new WindowEmptyError("constraints leave no eligible time"));
  });
});
