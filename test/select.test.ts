import { describe, expect, test } from "vitest";
import { Temporal } from "@js-temporal/polyfill";
import { selectCentered, selectLargestSegmentMidpoint } from "../src/select";
import { selectRandomMinute, weightMinute } from "../src/random";
import { RandomConfig } from "../src/types";

const base = Temporal.Instant.from("2026-04-04T12:00:00Z");

function minute(offset: number): Temporal.Instant {
  return base.add({ minutes: offset });
}

describe("selection helpers", () => {
  test("centered chooses the later minute on ties", () => {
    expect(selectCentered([minute(0), minute(2)], minute(1)).toString()).toBe("2026-04-04T12:02:00Z");
  });

  test("largest segment midpoint chooses later segment on equal length tie", () => {
    const result = selectLargestSegmentMidpoint([
      { start: minute(0), end: minute(2) },
      { start: minute(10), end: minute(12) },
    ]);

    expect(result.toString()).toBe("2026-04-04T12:11:00Z");
  });

  test("largest segment midpoint chooses midpoint eligible minute", () => {
    const result = selectLargestSegmentMidpoint([{ start: minute(0).add({ seconds: 30 }), end: minute(3).add({ seconds: 30 }) }]);
    expect(result.toString()).toBe("2026-04-04T12:02:00Z");
  });
});

describe("random selection", () => {
  const squaredMedium: RandomConfig = { seed: "task-abc-2026-04-04", shape: "squared", spread: "medium" };

  test("same seed produces same minute", () => {
    const eligible = Array.from({ length: 11 }, (_, index) => minute(index));
    const first = selectRandomMinute(eligible, minute(5), squaredMedium);
    const second = selectRandomMinute(eligible, minute(5), squaredMedium);
    expect(first.toString()).toBe(second.toString());
  });

  test("weight curves differ by shape", () => {
    const linear = weightMinute(minute(3), minute(5), { shape: "linear", spread: "medium" });
    const squared = weightMinute(minute(3), minute(5), { shape: "squared", spread: "medium" });
    expect(linear).toBeGreaterThan(squared);
  });

  test("wider spread increases far-minute weight", () => {
    const narrow = weightMinute(minute(0), minute(5), { shape: "squared", spread: "narrow" });
    const wide = weightMinute(minute(0), minute(5), { shape: "squared", spread: "wide" });
    expect(wide).toBeGreaterThan(narrow);
  });

  test("random example remains stable", () => {
    const eligible = Array.from({ length: 240 }, (_, index) => minute(index));
    const chosen = selectRandomMinute(eligible, minute(120), squaredMedium);
    expect(chosen.toString()).toMatchInlineSnapshot('"2026-04-04T14:00:00Z"');
  });
});
