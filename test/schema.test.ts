import { describe, expect, test } from "vitest";
import { normalizeRequest } from "../src/schema";
import { InvalidInputError } from "../src/errors";
import { instant } from "./helpers";

describe("normalizeRequest", () => {
  test("normalizes a minimal request", () => {
    const request = normalizeRequest({ expression: "tomorrow" }, instant("2026-04-03T18:00:00Z"));

    expect(request).toMatchObject({
      expression: "tomorrow",
      timezone: "UTC",
      strategy: "centered",
      avoid: [],
    });
    expect(request.now.toString()).toBe("2026-04-03T18:00:00Z");
  });

  test("applies random defaults", () => {
    const request = normalizeRequest(
      {
        expression: "tomorrow morning",
        strategy: "random",
        random: { seed: "abc" },
      },
      instant("2026-04-03T18:00:00Z"),
    );

    expect(request.random).toEqual({
      seed: "abc",
      shape: "squared",
      spread: "medium",
    });
  });

  test("rejects random without seed", () => {
    expect(() =>
      normalizeRequest({ expression: "tomorrow", strategy: "random", random: {} }, instant("2026-04-03T18:00:00Z")),
    ).toThrowError(new InvalidInputError("random.seed is required when strategy is random"));
  });

  test("rejects random on non-random strategy", () => {
    expect(() =>
      normalizeRequest(
        { expression: "tomorrow", strategy: "centered", random: { seed: "abc" } },
        instant("2026-04-03T18:00:00Z"),
      ),
    ).toThrowError(new InvalidInputError("random is only allowed when strategy is random"));
  });

  test("rejects invalid timezone", () => {
    expect(() =>
      normalizeRequest({ expression: "tomorrow", timezone: "Mars/Phobos" }, instant("2026-04-03T18:00:00Z")),
    ).toThrowError(new InvalidInputError("timezone must be a valid IANA timezone"));
  });

  test("rejects invalid strategy", () => {
    expect(() =>
      normalizeRequest({ expression: "tomorrow", strategy: "middle" }, instant("2026-04-03T18:00:00Z")),
    ).toThrowError(new InvalidInputError("strategy must be one of centered, largest-segment-midpoint, random, earliest, latest"));
  });

  test("rejects offsetless timestamps", () => {
    expect(() =>
      normalizeRequest(
        {
          expression: "tomorrow",
          now: "2026-04-03T18:00:00",
        },
        instant("2026-04-03T18:00:00Z"),
      ),
    ).toThrowError(new InvalidInputError("now must be a valid ISO 8601 timestamp with offset or Z"));
  });
});
