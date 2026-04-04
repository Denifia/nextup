import { UsageError } from "./errors";
import { CliOptions } from "./types";

export async function readCliInput(argv: string[], stdin: NodeJS.ReadStream): Promise<CliOptions> {
  let configPath: string | undefined;
  let positional: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--config") {
      const next = argv[index + 1];
      if (!next) {
        throw new UsageError("--config requires a path");
      }

      configPath = next;
      index += 1;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new UsageError(`unknown flag: ${arg}`);
    }

    if (positional !== undefined) {
      throw new UsageError("exactly one JSON request must be provided");
    }

    positional = arg;
  }

  const stdinText = stdin.isTTY ? undefined : await readStdin(stdin);
  const hasArgvInput = positional !== undefined;
  const hasStdinInput = stdinText !== undefined && stdinText.trim() !== "";

  if (hasArgvInput && hasStdinInput) {
    throw new UsageError("provide request JSON via argv or stdin, not both");
  }

  if (!hasArgvInput && stdinText !== undefined && stdinText.trim() === "") {
    throw new UsageError("stdin request must not be empty");
  }

  if (!hasArgvInput && !hasStdinInput) {
    throw new UsageError("exactly one JSON request must be provided");
  }

  return {
    configPath,
    requestText: hasArgvInput ? positional! : stdinText!,
  };
}

export function parseRequestJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new UsageError("request must be valid JSON");
  }
}

async function readStdin(stdin: NodeJS.ReadStream): Promise<string> {
  stdin.setEncoding("utf8");

  let result = "";
  for await (const chunk of stdin) {
    result += chunk;
  }

  return result;
}
