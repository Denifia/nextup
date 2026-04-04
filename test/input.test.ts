import { Readable } from "node:stream";
import { describe, expect, test } from "vitest";
import { UsageError } from "../src/errors";
import { readCliInput } from "../src/input";

function ttyStdin(text?: string): NodeJS.ReadStream {
  const stream = Readable.from(text === undefined ? [] : [text]) as NodeJS.ReadStream;
  Object.defineProperty(stream, "isTTY", { value: true });
  return stream;
}

describe("readCliInput", () => {
  test("rejects missing request when stdin is a tty", async () => {
    await expect(readCliInput([], ttyStdin())).rejects.toEqual(
      new UsageError("exactly one JSON request must be provided"),
    );
  });
});
