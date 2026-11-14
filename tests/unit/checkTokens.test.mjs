import test from "node:test";
import assert from "node:assert/strict";
import { findViolations } from "../../scripts/check-tokens.mjs";

test("flags hex in className", () => {
  assert.deepEqual(findViolations('<div className="text-[#712631]"/>', "a.tsx").map(({ rule, line }) => ({ rule, line })), [{ rule: "hex", line: 1 }]);
});

test("flags raw palette", () => {
  assert.deepEqual(findViolations('bg-rose-500 text-white', "a.tsx").map(({ rule }) => rule), ["palette", "palette"]);
});

test("flags banned weights", () => {
  assert.deepEqual(findViolations('font-semibold font-extrabold font-black', "a.tsx").map(({ rule }) => rule), ["weight", "weight", "weight"]);
});

test("flags legacy tokens", () => {
  assert.deepEqual(findViolations('bg-field-bg text-field-label placeholder:text-placeholder', "a.tsx").map(({ rule }) => rule), ["legacy", "legacy", "legacy"]);
});

test("allows tokens", () => {
  assert.deepEqual(findViolations('bg-primary text-on-primary border-border font-medium', "a.tsx"), []);
});

test("allows data hex", () => {
  assert.deepEqual(findViolations('const swatch = "#712631"; // tokens-allow', "a.tsx"), []);
});

test("ignores comments", () => {
  assert.deepEqual(findViolations('/* #fff */', "a.tsx"), []);
  assert.deepEqual(findViolations('// bg-white', "a.tsx"), []);
});
