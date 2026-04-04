import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, test } from "vitest";

const entry = join(process.cwd(), "src", "main.ts");

function runCli(args: string[], options?: { stdin?: string }) {
  return spawnSync(process.execPath, ["--import", "tsx", entry, ...args], {
    cwd: process.cwd(),
    input: options?.stdin,
    encoding: "utf8",
  });
}

describe("CLI", () => {
  test("accepts argv input", () => {
    const result = runCli([
      '{"expression":"tomorrow morning","timezone":"Australia/Perth","now":"2026-04-03T18:00:00Z"}',
    ]);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      result: "2026-04-05T02:00:00Z",
      strategy: "centered",
    });
  });

  test("accepts stdin input", () => {
    const result = runCli([], {
      stdin: '{"expression":"tomorrow","timezone":"Australia/Perth","now":"2026-04-03T18:00:00Z"}',
    });

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      result: "2026-04-05T04:00:00Z",
    });
  });

  test("rejects both argv and stdin input", () => {
    const result = runCli(['{"expression":"tomorrow"}'], { stdin: '{"expression":"tomorrow"}' });
    expect(result.status).toBe(64);
    expect(JSON.parse(result.stdout)).toEqual({
      ok: false,
      error: "usage",
      detail: "provide request JSON via argv or stdin, not both",
    });
  });

  test("rejects empty stdin", () => {
    const result = runCli([], { stdin: "" });
    expect(result.status).toBe(64);
    expect(JSON.parse(result.stdout)).toEqual({
      ok: false,
      error: "usage",
      detail: "stdin request must not be empty",
    });
  });

  test("rejects malformed JSON", () => {
    const result = runCli(['{"expression":']);
    expect(result.status).toBe(64);
    expect(JSON.parse(result.stdout)).toEqual({
      ok: false,
      error: "usage",
      detail: "request must be valid JSON",
    });
  });

  test("returns invalid_input for missing config", () => {
    const result = runCli([
      "--config",
      "./does-not-exist.json",
      '{"expression":"tomorrow","now":"2026-04-03T18:00:00Z"}',
    ]);

    expect(result.status).toBe(2);
    expect(JSON.parse(result.stdout)).toEqual({
      ok: false,
      error: "invalid_input",
      detail: "config could not be read: ./does-not-exist.json",
    });
  });

  test("includes random metadata for random strategy", () => {
    const result = runCli([
      '{"expression":"tomorrow morning","timezone":"Australia/Perth","now":"2026-04-03T18:00:00Z","strategy":"random","random":{"seed":"task-abc-2026-04-04"}}',
    ]);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      strategy: "random",
      random: { shape: "squared", spread: "medium" },
    });
  });

  test("respects config overrides", () => {
    const dir = mkdtempSync(join(tmpdir(), "nextup-cli-"));
    const configPath = join(dir, "nextup.config.json");
    writeFileSync(configPath, JSON.stringify({ dayParts: { morning: { start: "09:00", end: "11:30" } } }), "utf8");

    const result = runCli([
      "--config",
      configPath,
      '{"expression":"tomorrow morning","timezone":"Australia/Perth","now":"2026-04-03T18:00:00Z"}',
    ]);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      result: "2026-04-05T02:15:00Z",
    });
  });
});
