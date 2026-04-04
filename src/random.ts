import { createHash } from "node:crypto";
import { Temporal } from "@js-temporal/polyfill";
import { RandomConfig } from "./types";
import { VERSION } from "./version";

export function selectRandomMinute(
  eligibleMinutes: Temporal.Instant[],
  anchorMinute: Temporal.Instant,
  random: RandomConfig,
): Temporal.Instant {
  const weights = eligibleMinutes.map((minute) => weightMinute(minute, anchorMinute, random));
  const total = weights.reduce((sum, value) => sum + value, 0);
  const target = deterministicUnitInterval(random.seed) * total;

  let cumulative = 0;
  for (let index = 0; index < eligibleMinutes.length; index += 1) {
    cumulative += weights[index];
    if (target < cumulative || index === eligibleMinutes.length - 1) {
      return eligibleMinutes[index];
    }
  }

  return eligibleMinutes[eligibleMinutes.length - 1];
}

export function weightMinute(
  minute: Temporal.Instant,
  anchorMinute: Temporal.Instant,
  random: Pick<RandomConfig, "shape" | "spread">,
): number {
  const spreadFactor = random.spread === "narrow" ? 0.5 : random.spread === "wide" ? 2 : 1;
  const distanceMinutes = Math.abs(minute.epochMilliseconds - anchorMinute.epochMilliseconds) / 60_000;
  const scaledDistance = distanceMinutes / spreadFactor;

  if (random.shape === "linear") {
    return 1 / (1 + scaledDistance);
  }

  const base = 1 + scaledDistance;
  return 1 / (base * base);
}

export function deterministicUnitInterval(seed: string): number {
  const hash = createHash("sha256")
    .update(VERSION, "utf8")
    .update("\0", "utf8")
    .update(seed, "utf8")
    .digest();

  const word = hash.readBigUInt64BE(0);
  const numerator = Number(word >> 11n);
  return numerator / 2 ** 53;
}
