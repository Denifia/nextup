import { Temporal } from "@js-temporal/polyfill";
import { InvalidInputError } from "./errors";
import { isValidTimeZone, parseIsoInstant } from "./time";
import { NormalizedRequest, RandomConfig, RandomShape, RandomSpread, Strategy, UtcInterval } from "./types";

const STRATEGIES = new Set<Strategy>([
  "centered",
  "largest-segment-midpoint",
  "random",
  "earliest",
  "latest",
]);

const RANDOM_SHAPES = new Set<RandomShape>(["squared", "linear"]);
const RANDOM_SPREADS = new Set<RandomSpread>(["narrow", "medium", "wide"]);

export function normalizeRequest(input: unknown, nowOverride?: Temporal.Instant): NormalizedRequest {
  if (!isRecord(input)) {
    throw new InvalidInputError("request must be a JSON object");
  }

  const expression = input.expression;
  if (typeof expression !== "string" || expression.trim() === "") {
    throw new InvalidInputError("expression must be a non-empty string");
  }

  const timezone = input.timezone === undefined ? "UTC" : validateTimezone(input.timezone);
  const now = input.now === undefined ? nowOverride ?? Temporal.Now.instant() : parseIsoInstantField(input.now, "now");
  const strategy = input.strategy === undefined ? "centered" : validateStrategy(input.strategy);
  const window = input.window === undefined ? undefined : validateIntervalObject(input.window, "window");
  const avoid = input.avoid === undefined ? [] : validateAvoid(input.avoid);

  let random: RandomConfig | undefined;
  if (strategy === "random") {
    random = normalizeRandom(input.random);
  } else if (input.random !== undefined) {
    throw new InvalidInputError("random is only allowed when strategy is random");
  }

  return {
    expression: expression.trim(),
    timezone,
    now,
    strategy,
    random,
    window,
    avoid,
  };
}

function validateTimezone(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new InvalidInputError("timezone must be a valid IANA timezone");
  }

  if (!isValidTimeZone(value)) {
    throw new InvalidInputError("timezone must be a valid IANA timezone");
  }

  return value;
}

function validateStrategy(value: unknown): Strategy {
  if (typeof value !== "string" || !STRATEGIES.has(value as Strategy)) {
    throw new InvalidInputError("strategy must be one of centered, largest-segment-midpoint, random, earliest, latest");
  }

  return value as Strategy;
}

function normalizeRandom(value: unknown): RandomConfig {
  if (value === undefined) {
    throw new InvalidInputError("random.seed is required when strategy is random");
  }

  if (!isRecord(value)) {
    throw new InvalidInputError("random must be an object when strategy is random");
  }

  const seed = value.seed;
  if (typeof seed !== "string" || seed.length === 0) {
    throw new InvalidInputError("random.seed is required when strategy is random");
  }

  const shape = value.shape === undefined ? "squared" : validateRandomShape(value.shape);
  const spread = value.spread === undefined ? "medium" : validateRandomSpread(value.spread);

  return { seed, shape, spread };
}

function validateRandomShape(value: unknown): RandomShape {
  if (typeof value !== "string" || !RANDOM_SHAPES.has(value as RandomShape)) {
    throw new InvalidInputError("random.shape must be one of squared, linear");
  }

  return value as RandomShape;
}

function validateRandomSpread(value: unknown): RandomSpread {
  if (typeof value !== "string" || !RANDOM_SPREADS.has(value as RandomSpread)) {
    throw new InvalidInputError("random.spread must be one of narrow, medium, wide");
  }

  return value as RandomSpread;
}

function validateAvoid(value: unknown): UtcInterval[] {
  if (!Array.isArray(value)) {
    throw new InvalidInputError("avoid must be an array of intervals");
  }

  return value.map((entry, index) => validateIntervalObject(entry, `avoid[${index}]`));
}

function validateIntervalObject(value: unknown, field: string): UtcInterval {
  if (!isRecord(value)) {
    throw new InvalidInputError(`${field} must be an object with start and end`);
  }

  const start = parseIsoInstantField(value.start, `${field}.start`);
  const end = parseIsoInstantField(value.end, `${field}.end`);

  if (Temporal.Instant.compare(start, end) >= 0) {
    throw new InvalidInputError(`${field}.start must be earlier than ${field}.end`);
  }

  return { start, end };
}

function parseIsoInstantField(value: unknown, fieldName: string): Temporal.Instant {
  if (typeof value !== "string") {
    throw new InvalidInputError(`${fieldName} must be a valid ISO 8601 timestamp with offset or Z`);
  }

  return parseIsoInstant(value, fieldName);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
