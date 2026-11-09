// تشغيل: npm run test:unit  (node --test، بلا أي مكتبة إضافية وبلا شبكة)
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPromoBody,
  promoOwnerLabel,
  promoValueLabel,
  serverPromoErrors,
  orderPromoLines,
  PROMO_MESSAGES,
} from "../../src/lib/admin/promo.ts";

const NOW = new Date("2026-11-09T10:00:00Z");

/** نموذج كامل؛ كل تست بيغيّر اللي بيلزمه. */
function form(overrides = {}) {
  return {
    code: "VIORA10",
    type: "PERCENT",
    percent: "10",
    maxDiscount: "",
    minOrder: "",
    duration: "1D",
    customEnd: "",
    ...overrides,
  };
}

/** قيمة `datetime-local` (توقيت الجهاز) لتاريخ معيّن. */
function local(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

test("percent form builds the body", () => {
  const result = buildPromoBody(
    form({ code: " ramal10 ", minOrder: "50" }),
    NOW,
  );
  assert.deepEqual(result, {
    body: { code: "RAMAL10", type: "PERCENT", percent: 10, minOrder: 50, duration: "1D" },
  });
});

test("max discount is sent with two decimals for percent codes", () => {
  const result = buildPromoBody(form({ maxDiscount: "30.5" }), NOW);
  assert.equal(result.body.maxDiscount, 30.5);
});

test("free delivery drops percent and max discount", () => {
  const result = buildPromoBody(
    form({ type: "FREE_DELIVERY", percent: "95", maxDiscount: "x", duration: "7D" }),
    NOW,
  );
  assert.deepEqual(result, {
    body: { code: "VIORA10", type: "FREE_DELIVERY", duration: "7D" },
  });
});

test("custom end converts to UTC and validates range", () => {
  const soon = new Date(NOW.getTime() + 30 * 60 * 1000);
  assert.equal(
    buildPromoBody(form({ duration: "CUSTOM", customEnd: local(soon) }), NOW).errors.endsAt,
    PROMO_MESSAGES.endRange,
  );
  const far = new Date(NOW.getTime() + 91 * 24 * 60 * 60 * 1000);
  assert.equal(
    buildPromoBody(form({ duration: "CUSTOM", customEnd: local(far) }), NOW).errors.endsAt,
    PROMO_MESSAGES.endRange,
  );
  assert.equal(
    buildPromoBody(form({ duration: "CUSTOM", customEnd: "" }), NOW).errors.endsAt,
    PROMO_MESSAGES.endMissing,
  );
  const ok = local(new Date(NOW.getTime() + 2 * 24 * 60 * 60 * 1000));
  const result = buildPromoBody(form({ duration: "CUSTOM", customEnd: ok }), NOW);
  assert.equal(result.body.endsAt, new Date(ok).toISOString());
  assert.equal(result.body.duration, "CUSTOM");
});

test("non-custom durations never send endsAt", () => {
  const ok = local(new Date(NOW.getTime() + 2 * 24 * 60 * 60 * 1000));
  const result = buildPromoBody(form({ duration: "12H", customEnd: ok }), NOW);
  assert.equal("endsAt" in result.body, false);
});

test("invalid code, percent and money produce field errors", () => {
  const { errors } = buildPromoBody(
    form({ code: "AB!", percent: "95", minOrder: "1.234", maxDiscount: "0" }),
    NOW,
  );
  assert.equal(errors.code, PROMO_MESSAGES.code);
  assert.equal(errors.percent, PROMO_MESSAGES.percent);
  assert.equal(errors.minOrder, PROMO_MESSAGES.money);
  assert.equal(errors.maxDiscount, PROMO_MESSAGES.money);
  assert.equal(buildPromoBody(form({ code: "ABC" }), NOW).errors.code, PROMO_MESSAGES.code);
  assert.equal(buildPromoBody(form({ percent: "10.5" }), NOW).errors.percent, PROMO_MESSAGES.percent);
  assert.equal(buildPromoBody(form({ percent: "0" }), NOW).errors.percent, PROMO_MESSAGES.percent);
});

test("serverPromoErrors maps PROMO_CODE_TAKEN and plain field errors", () => {
  assert.deepEqual(
    serverPromoErrors({
      success: false,
      status: 409,
      errorCode: "PROMO_CODE_TAKEN",
      errors: { code: "محجوز" },
      fieldErrors: { code: { code: "PROMO_CODE_TAKEN" } },
    }),
    { code: PROMO_MESSAGES.taken },
  );
  assert.deepEqual(
    serverPromoErrors({
      success: false,
      status: 400,
      errors: { percent: "النسبة غلط", unknownField: "x" },
    }),
    { percent: "النسبة غلط" },
  );
  assert.deepEqual(serverPromoErrors({ success: false, status: 500 }), {});
});

test("labels", () => {
  const base = {
    id: 1, code: "X1X1", owner: "PLATFORM", store: null, type: "PERCENT", percent: 10,
    maxDiscount: null, minOrder: null, startsAt: "", endsAt: "", stoppedAt: null,
    status: "ACTIVE", usesCount: 0, discountTotal: "0.00",
  };
  assert.equal(promoValueLabel(base), "خصم 10%");
  assert.equal(promoValueLabel({ ...base, type: "FREE_DELIVERY", percent: null }), "توصيل مجاني");
  assert.equal(promoOwnerLabel(base), "Viora");
  assert.equal(
    promoOwnerLabel({ ...base, owner: "STORE", store: { id: 4, name: "روز بوتيك" } }),
    "روز بوتيك",
  );
});

test("orderPromoLines lists code, discount, waived delivery and net", () => {
  const detail = {
    money: {
      productsTotal: "400.00", deliveryFee: "6.00", payableTotal: "386.00",
      discount: "20.00", deliveryWaived: "0.00",
      promo: { code: "PMONEYP", fundedBy: "PLATFORM", type: "PERCENT", percent: 10, freeDelivery: false },
    },
    group: { promo: { code: "PMONEYP", owner: "PLATFORM", type: "PERCENT", percent: 10, store: null }, discountTotal: "30.00" },
  };
  assert.deepEqual(orderPromoLines(detail), [
    { kind: "code", code: "PMONEYP", fundedBy: "PLATFORM" },
    { kind: "discount", amount: 20 },
    { kind: "net", amount: 386 },
  ]);
});

test("orderPromoLines uses the group promo for an uncovered store and waived delivery", () => {
  const detail = {
    money: { productsTotal: "50.00", discount: "0.00", deliveryWaived: "6.00", finalTotal: "50.00", promo: null },
    group: { promo: { code: "FREE5", owner: "STORE", type: "FREE_DELIVERY", percent: null, store: { id: 4, name: "روز" } } },
  };
  assert.deepEqual(orderPromoLines(detail), [
    { kind: "code", code: "FREE5", fundedBy: "STORE" },
    { kind: "waived", amount: 6 },
    { kind: "net", amount: 50 },
  ]);
});

test("orderPromoLines is empty without a promo", () => {
  assert.deepEqual(orderPromoLines({ money: { productsTotal: "10.00" }, group: null }), []);
  assert.deepEqual(orderPromoLines({}), []);
});
