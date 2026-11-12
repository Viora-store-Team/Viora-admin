import { test, expect, type Page, type Route } from "@playwright/test";

const api = "https://api.vioragaza.com/api";
const user = { id: 1, name: "QA Admin", email: "qa@example.test", role: "ADMIN", isActive: true };
const emptyPage = { page: 1, limit: 15, total: 0, totalPages: 0 };

type Row = Record<string, unknown>;

function row(over: Row = {}): Row {
  return {
    id: 7, title: "متجر جديد", body: "تعرّف على متجر الشام", link: "https://link.vioragaza.com/s/12",
    audience: "ALL", emails: [], recipients: 1240, devices: 1388, delivered: 1302,
    createdAt: "2026-11-12T10:00:00.000Z", ...over,
  };
}

interface Server {
  history: Row[];
  previews: Row[];
  sends: Row[];
  previewReply?: { status: number; json: Record<string, unknown> };
  sendReply?: { status: number; json: Record<string, unknown> };
  notFoundEmails: string[];
}

async function serve(page: Page, server: Server) {
  await page.addInitScript(() => localStorage.setItem("token", "qa-fixture"));
  await page.route(`${api}/**`, async (route: Route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api/, "");
    const base: Record<string, unknown> = {
      "/health": { success: true }, "/admin/me": { success: true, user },
      "/notifications/count": { success: true, unread: 0 },
      "/notifications": { success: true, notifications: [], unread: 0, pagination: emptyPage },
    };
    if (base[path]) return route.fulfill({ json: base[path] });

    if (path === "/admin/broadcasts" && request.method() === "GET") {
      return route.fulfill({ json: { success: true, broadcasts: server.history,
        pagination: { page: 1, limit: 15, total: server.history.length, totalPages: server.history.length ? 1 : 0 } } });
    }
    if (path === "/admin/broadcasts/preview" && request.method() === "POST") {
      server.previews.push(request.postDataJSON() as Row);
      if (server.previewReply) return route.fulfill(server.previewReply);
      return route.fulfill({ json: { success: true, preview: {
        recipients: 1240, devices: 1388, notFoundEmails: server.notFoundEmails,
        target: { type: "store", id: 12, name: "متجر الشام" } } } });
    }
    if (path === "/admin/broadcasts" && request.method() === "POST") {
      const body = request.postDataJSON() as Row;
      server.sends.push(body);
      await new Promise((r) => setTimeout(r, 150));
      if (server.sendReply) return route.fulfill(server.sendReply);
      const created = row({ id: 8, title: body.title, body: body.body, audience: body.audience,
        emails: body.emails ?? [], link: body.link ?? null });
      server.history.unshift(created);
      return route.fulfill({ status: 201, json: { success: true, broadcast: created } });
    }
    return route.fulfill({ status: 404, json: { success: false, message: "Unavailable" } });
  });
}

function server(history: Row[] = []): Server {
  return { history, previews: [], sends: [], notFoundEmails: [] };
}

test("history lists past broadcasts", async ({ page }) => {
  await serve(page, server([
    row(),
    row({ id: 6, title: "عرض خاص", link: null, audience: "EMAILS", emails: ["a@x.com", "b@x.com"] }),
  ]));
  await page.goto("/broadcasts");
  await expect(page.getByRole("cell", { name: /متجر جديد/ })).toBeVisible();
  await expect(page.getByText("متجر #12")).toBeVisible();
  await expect(page.getByText("إيميلات محددة (2)")).toBeVisible();
});

test("empty history shows the empty state", async ({ page }) => {
  await serve(page, server());
  await page.goto("/broadcasts");
  await expect(page.getByText("ما انبعت أي إشعار بعد")).toBeVisible();
});

test("preview, confirm and send posts one request with the contract body", async ({ page }) => {
  const s = server();
  await serve(page, s);
  await page.goto("/broadcasts");
  await page.getByLabel("العنوان").fill("متجر جديد");
  await page.getByLabel("نص الإشعار").fill("تعرّف على متجر الشام");
  await page.getByLabel("رابط (اختياري)").fill("https://link.vioragaza.com/s/12");
  await page.getByRole("button", { name: "مراجعة وإرسال" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("1,240");
  await expect(dialog).toContainText("متجر: متجر الشام");
  expect(s.previews).toEqual([{
    title: "متجر جديد", body: "تعرّف على متجر الشام", audience: "ALL", link: "https://link.vioragaza.com/s/12",
  }]);

  await dialog.getByRole("button", { name: "إرسال", exact: true }).dblclick();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(s.sends).toHaveLength(1);
  expect(s.sends[0]).toEqual(s.previews[0]);
  await expect(page.getByLabel("إشعارات العمليات").getByRole("status")).toContainText("تم الإرسال");
  await expect(page.getByLabel("العنوان")).toHaveValue("");
  await expect(page.getByRole("cell", { name: /متجر جديد/ })).toBeVisible();
});

test("emails audience shows the textarea, counts and posts the array", async ({ page }) => {
  const s = server();
  s.notFoundEmails = ["b@y.com"];
  await serve(page, s);
  await page.goto("/broadcasts");
  await expect(page.getByLabel("الإيميلات")).toHaveCount(0);
  await page.getByRole("button", { name: "إيميلات محددة", exact: true }).click();
  await page.getByLabel("الإيميلات").fill("A@x.com, b@y.com\na@x.com");
  await expect(page.getByText("2 إيميل")).toBeVisible();
  await page.getByLabel("العنوان").fill("مرحبا");
  await page.getByLabel("نص الإشعار").fill("نص");
  await page.getByRole("button", { name: "مراجعة وإرسال" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("b@y.com");
  expect(s.previews).toEqual([{ title: "مرحبا", body: "نص", audience: "EMAILS", emails: ["a@x.com", "b@y.com"] }]);
  await dialog.getByRole("button", { name: "إرسال", exact: true }).click();
  await expect.poll(() => s.sends.length).toBe(1);
});

test("invalid link blocks submit", async ({ page }) => {
  const s = server();
  await serve(page, s);
  await page.goto("/broadcasts");
  await page.getByLabel("العنوان").fill("x");
  await page.getByLabel("نص الإشعار").fill("y");
  await page.getByLabel("رابط (اختياري)").fill("https://example.com/s/1");
  await page.getByRole("button", { name: "مراجعة وإرسال" }).click();
  await expect(page.getByText("الرابط لازم يكون رابط مشاركة لمتجر أو منتج من التطبيق")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(s.previews).toEqual([]);
});

test("no recipients shows a clear message", async ({ page }) => {
  const s = server();
  s.previewReply = { status: 422, json: { success: false, errorCode: "BROADCAST_NO_RECIPIENTS", message: "x" } };
  await serve(page, s);
  await page.goto("/broadcasts");
  await page.getByLabel("العنوان").fill("x");
  await page.getByLabel("نص الإشعار").fill("y");
  await page.getByRole("button", { name: "مراجعة وإرسال" }).click();
  await expect(page.getByText("لا يوجد زبائن مطابقون لهذا الاستهداف")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("server field error shows under the link field", async ({ page }) => {
  const s = server();
  s.previewReply = { status: 400, json: { success: false, message: "x",
    errors: { link: "الرابط لا يشير إلى منتج أو متجر موجود" },
    fieldErrors: { link: { code: "INVALID" } } } };
  await serve(page, s);
  await page.goto("/broadcasts");
  await page.getByLabel("العنوان").fill("x");
  await page.getByLabel("نص الإشعار").fill("y");
  await page.getByLabel("رابط (اختياري)").fill("https://link.vioragaza.com/s/999");
  await page.getByRole("button", { name: "مراجعة وإرسال" }).click();
  await expect(page.getByText("الرابط لا يشير إلى منتج أو متجر موجود")).toBeVisible();
});
