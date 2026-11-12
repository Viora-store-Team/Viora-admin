import test from "node:test";
import assert from "node:assert/strict";
import { colorsInUseMessage } from "../../src/lib/admin/categoryColors.ts";

const conflict = (productIds, over = {}) => ({
  success: false,
  status: 409,
  errorCode: "CATEGORY_COLORS_IN_USE",
  details: { productIds },
  ...over,
});

test("returns null for other failures", () => {
  assert.equal(colorsInUseMessage({ success: false, status: 409, errorCode: "CATEGORY_SIZE_IN_USE" }), null);
  assert.equal(colorsInUseMessage(conflict([1], { status: 400 })), null);
  assert.equal(colorsInUseMessage({ success: true, status: 200 }), null);
});

test("states the product count", () => {
  assert.match(colorsInUseMessage(conflict([5])), /في منتج واحد/);
  assert.match(colorsInUseMessage(conflict([5, 6])), /في منتجان/);
  assert.match(colorsInUseMessage(conflict([1, 2, 3, 4, 5])), /في 5 منتجات/);
});

test("caps at the 20 listed ids", () => {
  const ids = Array.from({ length: 20 }, (_, i) => i + 1);
  assert.match(colorsInUseMessage(conflict(ids)), /20 منتج أو أكثر/);
});

test("still explains without details", () => {
  assert.match(colorsInUseMessage(conflict(undefined, { details: undefined })), /بدون ألوان/);
});
