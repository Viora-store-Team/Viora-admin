import { spawnSync } from "node:child_process";
const result = spawnSync(process.execPath, [process.env.npm_execpath, "audit", "--json"], { encoding: "utf8" });
if (result.error) throw result.error;
const production = spawnSync(process.execPath, [process.env.npm_execpath, "audit", "--omit=dev", "--audit-level=high"], { encoding: "utf8" });
if (production.status !== 0) {
  console.error(production.stdout, production.stderr);
  process.exit(1);
}
const report = JSON.parse(result.stdout);
if (report.error || !report.vulnerabilities) throw new Error(JSON.stringify(report.error || report));
// Temporary exception: no patched braces release exists (GHSA-vfj7-8cjw-p6xm).
// Only the exact ESLint tooling chain is accepted; new advisories still fail CI.
const chain = new Set(["braces", "micromatch", "fast-glob", "@next/eslint-plugin-next", "eslint-config-next"]);
const advisory = "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm";
function accepted(name, seen = new Set()) {
  if (!chain.has(name) || seen.has(name)) return false;
  const item = report.vulnerabilities[name];
  if (!item || !item.via.length) return false;
  const next = new Set([...seen, name]);
  return item.via.every(v => typeof v === "string" ? accepted(v, next) : v.url === advisory && v.name === "braces");
}
const blocked = Object.entries(report.vulnerabilities).filter(([name, v]) => ["high", "critical"].includes(v.severity) && !accepted(name));
for (const [name, v] of Object.entries(report.vulnerabilities)) {
  console.log(`${name}: ${v.severity}${accepted(name) ? " (temporary ESLint-only exception: GHSA-vfj7-8cjw-p6xm)" : ""}`);
}
if (blocked.length) process.exit(1);
console.log("Audit passed with the documented temporary tooling exception.");
