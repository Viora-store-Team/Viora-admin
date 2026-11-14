import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rules = [
  ["hex", /#[\da-fA-F]{3,8}\b/g],
  ["palette", /\b(?:bg|text|border|ring|outline|fill|stroke|from|via|to|divide|placeholder|decoration|shadow)-(?:white|black|gray|slate|zinc|neutral|stone|red|rose|amber|emerald|green|blue|sky|yellow|orange)(?:-\d{2,3})?(?:\/\d+)?\b/g],
  ["weight", /\bfont-(?:semibold|extrabold|black)\b/g],
  ["legacy", /\b(?:bg|text|border|ring|outline|fill|stroke|placeholder)-(?:field-bg|field-label|placeholder)\b/g],
];

export function findViolations(source, file) {
  void file;
  const allowedLines = new Set(source.split(/\r?\n/).flatMap((line, index) => line.includes("tokens-allow") ? [index + 1] : []));
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g, (comment) => comment.replace(/[^\r\n]/g, " "));
  const violations = [];
  for (const [index, line] of withoutComments.split(/\r?\n/).entries()) {
    if (allowedLines.has(index + 1)) continue;
    for (const [rule, pattern] of rules) {
      pattern.lastIndex = 0;
      for (const match of line.matchAll(pattern)) {
        violations.push({ line: index + 1, rule, text: match[0] });
      }
    }
  }
  return violations;
}

function* tsxFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* tsxFiles(path);
    else if (entry.isFile() && entry.name.endsWith(".tsx")) yield path;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  let count = 0;
  for (const file of tsxFiles("src")) {
    for (const violation of findViolations(readFileSync(file, "utf8"), file)) {
      console.log(`${file}:${violation.line}: ${violation.rule}: ${violation.text}`);
      count++;
    }
  }
  if (count) {
    console.error(`${count} token violation(s)`);
    process.exitCode = 1;
  }
}
