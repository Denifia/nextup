import { Temporal } from "@js-temporal/polyfill";

export type Strategy =
  | "centered"
  | "largest-segment-midpoint"
  | "random"
  | "earliest"
  | "latest";

export type RandomShape = "squared" | "linear";
export type RandomSpread = "narrow" | "medium" | "wide";
export type DayPartName = "morning" | "afternoon" | "evening" | "night";

export interface UtcInterval {
  start: Temporal.Instant;
  end: Temporal.Instant;
}

export interface DayPartWindow {
  startMinutes: number;
  endMinutes: number;
}

export interface EffectiveConfig {
  dayParts: Record<DayPartName, DayPartWindow>;
}

export interface RandomConfig {
  seed: string;
  shape: RandomShape;
  spread: RandomSpread;
}

export interface NormalizedRequest {
  expression: string;
  timezone: string;
  now: Temporal.Instant;
  strategy: Strategy;
  random?: RandomConfig;
  window?: UtcInterval;
  avoid: UtcInterval[];
}

export interface CliOptions {
  configPath?: string;
  requestText: string;
}

export interface ParsedDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  certain: Set<string>;
}

export interface ParsedExpression {
  originalText: string;
  matchedText: string;
  start: ParsedDateTime;
  end?: ParsedDateTime;
  kind: "range" | "exact" | "day-part" | "date";
  dayPart?: DayPartName;
}

export interface ResolutionResult {
  result: Temporal.Instant;
  resolvedWindow: UtcInterval;
  anchor: Temporal.Instant;
  now: Temporal.Instant;
  strategy: Strategy;
  random?: {
    shape: RandomShape;
    spread: RandomSpread;
  };
}

export interface SuccessResponse {
  ok: true;
  result: string;
  resolved_window: {
    start: string;
    end: string;
  };
  now: string;
  anchor: string;
  strategy: Strategy;
  random?: {
    shape: RandomShape;
    spread: RandomSpread;
  };
}

export interface FailureResponse {
  ok: false;
  error: string;
  detail: string;
}
