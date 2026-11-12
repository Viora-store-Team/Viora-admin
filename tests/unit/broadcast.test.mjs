// تشغيل: npm run test:unit  (node --test، بلا شبكة)
import test from "node:test";
import assert from "node:assert/strict";
import {
  AUDIENCE_LABELS,
  BROADCAST_MESSAGES,
  audienceLabel,
  buildBroadcastBody,
  isShareLink,
  linkTargetLabel,
  parseEmails,
  serverBroadcastErrors,
} from "../../src/lib/admin/broadcast.ts";

function form(over = {}) {
  return { title: "متجر جديد", body: "تصفح منتجاته", audience: "ALL", emails: "", link: "", ...over };
}

test("parseEmails splits, lowercases and dedupes", () => {
  assert.deepEqual(parseEmails("A@x.com, b@y.com\nA@X.com  c@z.com;"), ["a@x.com", "b@y.com", "c@z.com"]);
  assert.deepEqual(parseEmails("  \n "), []);
});

test("isShareLink accepts only official product/store links", () => {
  assert.equal(isShareLink("https://link.vioragaza.com/s/12"), true);
  assert.equal(isShareLink(" https://link.vioragaza.com/p/5 "), true);
  assert.equal(isShareLink("http://link.vioragaza.com/s/12"), false);
  assert.equal(isShareLink("https://evil.com/s/12"), false);
  assert.equal(isShareLink("https://link.vioragaza.com/s/12/extra"), false);
  assert.equal(isShareLink("https://link.vioragaza.com/s/0"), false);
  assert.equal(isShareLink("https://link.vioragaza.com/s/-3"), false);
  assert.equal(isShareLink("https://link.vioragaza.com/x/3"), false);
  assert.equal(isShareLink("garbage"), false);
});

test("ALL form builds the body without emails or empty link", () => {
  assert.deepEqual(buildBroadcastBody(form({ title: "  hi ", body: " yo " })), {
    body: { title: "hi", body: "yo", audience: "ALL" },
  });
});

test("EMAILS form posts the parsed array and the link", () => {
  assert.deepEqual(
    buildBroadcastBody(
      form({ audience: "EMAILS", emails: "a@x.com B@y.com a@x.com", link: "https://link.vioragaza.com/s/12" }),
    ),
    {
      body: {
        title: "متجر جديد",
        body: "تصفح منتجاته",
        audience: "EMAILS",
        emails: ["a@x.com", "b@y.com"],
        link: "https://link.vioragaza.com/s/12",
      },
    },
  );
});

test("validation errors", () => {
  const { errors } = buildBroadcastBody(form({ title: " ", body: "", link: "https://x.com" }));
  assert.equal(errors.title, BROADCAST_MESSAGES.title);
  assert.equal(errors.body, BROADCAST_MESSAGES.body);
  assert.equal(errors.link, BROADCAST_MESSAGES.link);
  assert.equal(buildBroadcastBody(form({ audience: "EMAILS" })).errors.emails, BROADCAST_MESSAGES.emailsRequired);
  assert.match(buildBroadcastBody(form({ audience: "EMAILS", emails: "nope" })).errors.emails, /nope/);
  const many = Array.from({ length: 501 }, (_, i) => `u${i}@x.com`).join(" ");
  assert.equal(
    buildBroadcastBody(form({ audience: "EMAILS", emails: many })).errors.emails,
    BROADCAST_MESSAGES.emailsMax,
  );
  // الإيميلات بتتجاهل لغير EMAILS
  assert.equal("errors" in buildBroadcastBody(form({ audience: "IOS", emails: "nope" })), false);
});

test("serverBroadcastErrors maps fields and no-recipients", () => {
  assert.deepEqual(
    serverBroadcastErrors({ success: false, status: 400, errors: { link: "x", unknown: "y" } }),
    { fields: { link: "x" }, general: "" },
  );
  assert.equal(
    serverBroadcastErrors({ success: false, status: 422, errorCode: "BROADCAST_NO_RECIPIENTS" }).general,
    BROADCAST_MESSAGES.noRecipients,
  );
});

test("labels", () => {
  assert.equal(AUDIENCE_LABELS.IOS, "آيفون");
  assert.equal(audienceLabel({ audience: "EMAILS", emails: ["a@x.com", "b@x.com"] }), "إيميلات محددة (2)");
  assert.equal(audienceLabel({ audience: "ALL", emails: [] }), "الكل");
  assert.equal(linkTargetLabel("https://link.vioragaza.com/s/12"), "متجر #12");
  assert.equal(linkTargetLabel("https://link.vioragaza.com/p/5"), "منتج #5");
  assert.equal(linkTargetLabel(null), "—");
});
