import { readFileSync } from "node:fs";
import { InvalidInputError } from "./errors";
import { DayPartName, DayPartWindow, EffectiveConfig } from "./types";

const DAY_PART_NAMES: DayPartName[] = ["morning", "afternoon", "evening", "night"];
const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/;

const DEFAULTS: EffectiveConfig = {
  dayParts: {
    morning: { startMinutes: 8 * 60, endMinutes: 12 * 60 },
    afternoon: { startMinutes: 12 * 60, endMinutes: 17 * 60 },
    evening: { startMinutes: 17 * 60, endMinutes: 21 * 60 },
    night: { startMinutes: 21 * 60, endMinutes: 24 * 60 },
  },
};

export function getDefaultConfig(): EffectiveConfig {
  return {
    dayParts: { ...DEFAULTS.dayParts },
  };
}

export function loadConfig(configPath?: string): EffectiveConfig {
  if (!configPath) {
    return getDefaultConfig();
  }

  let rawText: string;
  try {
    rawText = readFileSync(configPath, "utf8");
  } catch {
    throw new InvalidInputError(`config could not be read: ${configPath}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new InvalidInputError(`config must be valid JSON: ${configPath}`);
  }

  return normalizeConfig(parsed);
}

export function normalizeConfig(input: unknown): EffectiveConfig {
  const effective = getDefaultConfig();

  if (!isRecord(input)) {
    throw new InvalidInputError("config must be a JSON object");
  }

  const dayParts = input.dayParts;
  if (dayParts === undefined) {
    return effective;
  }

  if (!isRecord(dayParts)) {
    throw new InvalidInputError("config.dayParts must be an object");
  }

  for (const name of DAY_PART_NAMES) {
    const override = dayParts[name];
    if (override === undefined) {
      continue;
    }

    effective.dayParts[name] = validateDayPart(name, override);
  }

  return effective;
}

function validateDayPart(name: DayPartName, value: unknown): DayPartWindow {
  if (!isRecord(value)) {
    throw new InvalidInputError(`config.dayParts.${name} must be an object with start and end`);
  }

  const start = parseWallClock(value.start, `config.dayParts.${name}.start`, false);
  const end = parseWallClock(value.end, `config.dayParts.${name}.end`, true);

  if (start >= end) {
    throw new InvalidInputError(`config.dayParts.${name} must satisfy start < end`);
  }

  return { startMinutes: start, endMinutes: end };
}

function parseWallClock(value: unknown, field: string, allow24: boolean): number {
  if (typeof value !== "string" || !TIME_RE.test(value)) {
    throw new InvalidInputError(`${field} must be a valid HH:MM time`);
  }

  if (value === "24:00") {
    if (!allow24) {
      throw new InvalidInputError(`${field} must be a valid HH:MM time`);
    }

    return 24 * 60;
  }

  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  return hour * 60 + minute;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
