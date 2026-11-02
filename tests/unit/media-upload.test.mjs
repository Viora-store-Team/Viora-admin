// تشغيل: npm run test:unit  (node --test، بلا أي مكتبة إضافية وبلا شبكة)
import test from "node:test";
import assert from "node:assert/strict";
import { uploadOne, uploadFiles, thumbUrl } from "../../src/lib/media-upload.ts";

const TICKET_URL = "https://viora-media.acc.r2.cloudflarestorage.com/platform/abc.jpg?sig=1";
const FINAL_URL = "https://media.vioragaza.com/platform/abc.jpg";

function makeFile(type = "image/jpeg", size = 1234, name = "a.jpg") {
  return new File([new Uint8Array(size)], name, { type });
}

function setup({ ticket, put }) {
  const calls = { api: [], put: [] };
  const deps = {
    apiFetch: async (endpoint, options) => {
      calls.api.push({ endpoint, options });
      return ticket;
    },
    fetch: async (url, init) => {
      calls.put.push({ url, init });
      if (put instanceof Error) throw put;
      return new Response(null, { status: put ?? 200 });
    },
  };
  return { deps, calls };
}

const okTicket = {
  success: true,
  status: 201,
  uploadUrl: TICKET_URL,
  headers: { "Content-Type": "image/jpeg" },
  url: FINAL_URL,
};

test("posts the ticket body with purpose platform and the file's type and size", async () => {
  const { deps, calls } = setup({ ticket: okTicket });
  const file = makeFile("image/jpeg", 1234);
  await uploadOne(file, deps);
  assert.equal(calls.api[0].endpoint, "/uploads/image-ticket");
  assert.equal(calls.api[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls.api[0].options.body), {
    contentType: "image/jpeg",
    size: 1234,
    purpose: "platform",
  });
});

test("PUTs the exact file to uploadUrl with the ticket Content-Type and no auth", async () => {
  const { deps, calls } = setup({
    ticket: { ...okTicket, headers: { "Content-Type": "image/png" } },
  });
  const file = makeFile("image/png", 99, "b.png");
  const url = await uploadOne(file, deps);
  assert.equal(url, FINAL_URL);
  const { url: target, init } = calls.put[0];
  assert.equal(target, TICKET_URL);
  assert.equal(init.method, "PUT");
  assert.equal(init.body, file);
  assert.deepEqual(init.headers, { "Content-Type": "image/png" });
  const names = Object.keys(init.headers).map((h) => h.toLowerCase());
  assert.ok(!names.includes("authorization"));
});

test("ticket 400 maps to the field error", async () => {
  const { deps, calls } = setup({
    ticket: { success: false, status: 400, message: "بيانات غير صحيحة", errors: { size: "حجم الصورة كبير" } },
  });
  await assert.rejects(uploadOne(makeFile(), deps), { message: "حجم الصورة كبير" });
  assert.equal(calls.put.length, 0);
});

test("ticket 5xx shows the generic text, not the server text", async () => {
  const { deps } = setup({
    ticket: { success: false, status: 503, message: "stack trace internals" },
  });
  await assert.rejects(uploadOne(makeFile(), deps), { message: "فشل رفع الصورة" });
});

test("PUT 403 counts as failed", async () => {
  const { deps } = setup({ ticket: okTicket, put: 403 });
  const result = await uploadFiles([makeFile()], deps);
  assert.deepEqual(result.urls, []);
  assert.deepEqual(result.failed, [{ name: "a.jpg", message: "فشل رفع الصورة" }]);
});

test("PUT network error counts as failed", async () => {
  const { deps } = setup({ ticket: okTicket, put: new TypeError("fetch failed") });
  const result = await uploadFiles([makeFile()], deps);
  assert.equal(result.urls.length, 0);
  assert.equal(result.failed.length, 1);
});

test("local checks reject bad type and oversize without any request", async () => {
  const { deps, calls } = setup({ ticket: okTicket });
  const result = await uploadFiles(
    [makeFile("image/gif", 10, "x.gif"), makeFile("image/jpeg", 10 * 1024 * 1024 + 1, "big.jpg")],
    deps,
  );
  assert.equal(result.failed.length, 2);
  assert.equal(calls.api.length, 0);
  assert.equal(calls.put.length, 0);
});

test("PUT carries an abort signal", async () => {
  const { deps, calls } = setup({ ticket: okTicket });
  await uploadOne(makeFile(), deps);
  assert.ok(calls.put[0].init.signal instanceof AbortSignal);
});

test("PUT timeout counts as that file's generic failure", async () => {
  const { deps } = setup({
    ticket: okTicket,
    put: new DOMException("The operation timed out", "TimeoutError"),
  });
  const result = await uploadFiles([makeFile("image/jpeg", 5, "t.jpg"), makeFile()], deps);
  assert.deepEqual(result.urls, []);
  assert.deepEqual(result.failed, [
    { name: "t.jpg", message: "فشل رفع الصورة" },
    { name: "a.jpg", message: "فشل رفع الصورة" },
  ]);
});

test("ticket without headers fails generically, no PUT", async () => {
  const { headers: _omit, ...noHeaders } = okTicket;
  void _omit;
  const { deps, calls } = setup({ ticket: noHeaders });
  await assert.rejects(uploadOne(makeFile(), deps), { message: "فشل رفع الصورة" });
  assert.equal(calls.put.length, 0);
});

test("non-https uploadUrl fails generically, no PUT", async () => {
  const { deps, calls } = setup({
    ticket: { ...okTicket, uploadUrl: "http://viora-media.acc.r2.cloudflarestorage.com/x" },
  });
  await assert.rejects(uploadOne(makeFile(), deps), { message: "فشل رفع الصورة" });
  assert.equal(calls.put.length, 0);
});

test("success returns urls", async () => {
  const { deps } = setup({ ticket: okTicket });
  const result = await uploadFiles([makeFile()], deps);
  assert.deepEqual(result, { urls: [FINAL_URL], failed: [] });
});

test("thumbUrl resizes only plain https media URLs", () => {
  assert.equal(
    thumbUrl("https://media.vioragaza.com/platform/abc.jpg", 96),
    "https://media.vioragaza.com/cdn-cgi/image/width=96,quality=80,format=auto/platform/abc.jpg",
  );
  const already = "https://media.vioragaza.com/cdn-cgi/image/width=10/platform/abc.jpg";
  assert.equal(thumbUrl(already, 96), already);
  const legacy = "https://res.cloudinary.com/x/image/upload/a.jpg";
  assert.equal(thumbUrl(legacy, 96), legacy);
  const http = "http://media.vioragaza.com/platform/abc.jpg";
  assert.equal(thumbUrl(http, 96), http);
  assert.equal(thumbUrl("", 96), "");
  assert.equal(thumbUrl(null, 96), "");
});
