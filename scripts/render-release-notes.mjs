import { readFileSync, writeFileSync } from "node:fs";

const version = process.argv[2] ?? JSON.parse(readFileSync("package.json", "utf8")).version;
const changelog = readFileSync("CHANGELOG.md", "utf8");
const lines = changelog.split(/\r?\n/);
const header = `## [${version}]`;
const startIndex = lines.findIndex((line) => line.startsWith(header));

if (startIndex === -1) {
  console.error(`Could not find changelog section for version ${version}`);
  process.exit(1);
}

const bodyLines = [];
for (let index = startIndex + 1; index < lines.length; index += 1) {
  const line = lines[index];
  if (line.startsWith("## [")) {
    break;
  }
  bodyLines.push(line);
}

const body = bodyLines.join("\n").trim();
writeFileSync("RELEASE_NOTES.md", `# nextup ${version}\n\n${body}\n`, "utf8");
