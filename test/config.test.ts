import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { getDefaultConfig, loadConfig, normalizeConfig } from "../src/config";
import { InvalidInputError } from "../src/errors";

describe("config", () => {
  test("returns defaults when omitted", () => {
    expect(getDefaultConfig()).toEqual({
      dayParts: {
        morning: { startMinutes: 480, endMinutes: 720 },
        afternoon: { startMinutes: 720, endMinutes: 1020 },
        evening: { startMinutes: 1020, endMinutes: 1260 },
        night: { startMinutes: 1260, endMinutes: 1440 },
      },
    });
  });

  test("merges partial day-part overrides", () => {
    const config = normalizeConfig({
      dayParts: {
        morning: { start: "09:00", end: "11:30" },
      },
    });

    expect(config.dayParts.morning).toEqual({ startMinutes: 540, endMinutes: 690 });
    expect(config.dayParts.afternoon).toEqual({ startMinutes: 720, endMinutes: 1020 });
  });

  test("rejects invalid wall-clock ranges", () => {
    expect(() =>
      normalizeConfig({
        dayParts: {
          morning: { start: "24:00", end: "11:00" },
        },
      }),
    ).toThrowError(new InvalidInputError("config.dayParts.morning.start must be a valid HH:MM time"));
  });

  test("rejects start >= end", () => {
    expect(() =>
      normalizeConfig({
        dayParts: {
          morning: { start: "11:00", end: "11:00" },
        },
      }),
    ).toThrowError(new InvalidInputError("config.dayParts.morning must satisfy start < end"));
  });

  test("loads config from disk", () => {
    const dir = mkdtempSync(join(tmpdir(), "nextup-config-"));
    const path = join(dir, "nextup.config.json");
    writeFileSync(path, JSON.stringify({ dayParts: { night: { start: "20:00", end: "24:00" } } }), "utf8");

    const config = loadConfig(path);
    expect(config.dayParts.night).toEqual({ startMinutes: 1200, endMinutes: 1440 });
  });

  test("rejects unreadable config", () => {
    expect(() => loadConfig("./does-not-exist.json")).toThrowError(
      new InvalidInputError("config could not be read: ./does-not-exist.json"),
    );
  });
});
