#!/usr/bin/env node
import { runCli } from "./cli";

void runCli(process.argv.slice(2), process.stdin, process.stdout, process.stderr).then((exitCode) => {
  process.exitCode = exitCode;
});
