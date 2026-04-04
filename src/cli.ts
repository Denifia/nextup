import { loadConfig } from "./config";
import { NextupError, toFailure } from "./errors";
import { parseRequestJson, readCliInput } from "./input";
import { formatFailure, formatSuccess } from "./output";
import { resolveNextup } from "./resolve";
import { normalizeRequest } from "./schema";
import { getHelpText, isHelpFlag } from "./help";

export async function runCli(argv: string[], stdin: NodeJS.ReadStream, stdout: NodeJS.WriteStream, stderr: NodeJS.WriteStream): Promise<number> {
  if (argv.some(isHelpFlag)) {
    stdout.write(`${getHelpText()}\n`);
    return 0;
  }

  try {
    const cliInput = await readCliInput(argv, stdin);
    const requestJson = parseRequestJson(cliInput.requestText);
    const request = normalizeRequest(requestJson);
    const config = loadConfig(cliInput.configPath);
    const result = resolveNextup(request, config);

    stdout.write(`${JSON.stringify(formatSuccess(result))}\n`);
    return 0;
  } catch (error) {
    const failure = toFailure(error);
    stdout.write(`${JSON.stringify(formatFailure(failure))}\n`);
    if (failure.code === "usage") {
      stderr.write(`${failure.message}\n`);
    }
    return failure.exitCode;
  }
}

export function isNextupError(error: unknown): error is NextupError {
  return error instanceof NextupError;
}
