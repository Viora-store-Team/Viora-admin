import { test, expect, type Page, type Route } from "@playwright/test";

const api = "https://api.vioragaza.com/api";
const user = { id: 1, name: "QA Admin", email: "qa@example.test", role: "ADMIN", isActive: true };
const emptyPage = { page: 1, limit: 15, total: 0, totalPages: 0 };

type Promo = Record<string, unknown> & { id: number; status: string; owner: string };

function promo(over: Partial<Promo> = {}): Promo {
  return {
    id: 1, code: "VIORA5", owner: "PLATFORM", store: null, type: "PERCENT", percent: 5,
    maxDiscount: null, minOrder: null, startsAt: "2026-11-09T10:00:00.000Z",
    endsAt: "2026-11-10T10:00:00.000Z", stoppedAt: null, status: "ACTIVE",
    usesCount: 3, discountTotal: "12.50", ...over,
  };
}

interface PromoServer {
  codes: Promo[];
  posts: Record<string, unknown>[];
  stops: number[];
  listUrls: URL[];
  createReply?: { status: number; json: Record<string, unknown> };
  stopReply?: { status: number; json: Record<string, unknown> };
}

async function serve(page: Page, server: PromoServer) {
  await page.addInitScript(() => localStorage.setItem("token", "qa-fixture"));
  await page.route(`${api}/**`, async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, "");
    const base: Record<string, unknown> = {
      "/health": { success: true }, "/admin/me": { success: true, user },
      "/notifications/count": { success: true, unread: 0 },
      "/notifications": { success: true, notifications: [], unread: 0, pagination: emptyPage },
    };
    if (base[path]) return route.fulfill({ json: base[path] });

    if (path === "/admin/promo-codes" && request.method() === "GET") {
      server.listUrls.push(url);
      const status = (url.searchParams.get("status") ?? "active").toUpperCase();
      const owner = url.searchParams.get("owner")?.toUpperCase();
      const rows = server.codes.filter((c) =>
        c.status === status && (!owner || (owner === "STORE" ? c.owner === "STORE" : c.owner === "PLATFORM")));
      return route.fulfill({ json: { success: true, promoCodes: rows,
        pagination: { page: 1, limit: 15, total: rows.length, totalPages: rows.length ? 1 : 0 } } });
    }
    if (path === "/admin/promo-codes" && request.method() === "POST") {
      const body = request.postDataJSON() as Record<string, unknown>;
      server.posts.push(body);
      await new Promise((r) => setTimeout(r, 150));
      if (server.createReply) return route.fulfill(server.createReply);
      const created = promo({ id: 100 + server.posts.length, code: body.code as string,
        type: body.type as string, percent: (body.percent as number) ?? null, usesCount: 0, discountTotal: "0.00" });
      server.codes.unshift(created);
      return route.fulfill({ status: 201, json: { success: true, promoCode: created } });
    }
    const stop = path.match(/^\/admin\/promo-codes\/(\d+)\/stop$/);
    if (stop && request.method() === "PATCH") {
      const id = Number(stop[1]);
      server.stops.push(id);
      if (server.stopReply) return route.fulfill(server.stopReply);
      const code = server.codes.find((c) => c.id === id)!;
      code.status = "ENDED";
      code.stoppedAt = "2026-11-09T12:00:00.000Z";
      return route.fulfill({ json: { success: true, promoCode: code } });
    }
    return route.fulfill({ status: 404, json: { success: false, message: "Unavailable" } });
  });
}

function server(codes: Promo[] = []): PromoServer {
  return { codes, posts: [], stops: [], listUrls: [] };
}

async function openCreate(page: Page) {
  await page.getByRole("button", { name: "كود Viora جديد" }).click();
  await expect(page.getByRole("dialog", { name: "كود Viora جديد" })).toBeVisible();
}

test("promo page lists codes with owner and status", async ({ page }) => {
  const s = server([
    promo(),
    promo({ id: 2, code: "ROSE6", owner: "STORE", store: { id: 4, name: "روز بوتيك" }, percent: 6 }),
  ]);
  await serve(page, s);
  await page.goto("/promo-codes");
  await expect(page.getByRole("cell", { name: "VIORA5", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "ROSE6", exact: true })).toBeVisible();
  await expect(page.getByText("روز بوتيك")).toBeVisible();

  await page.getByRole("button", { name: "المتاجر", exact: true }).click();
  await expect.poll(() => s.listUrls.at(-1)?.searchParams.get("owner")).toBe("store");
  await expect(page.getByRole("cell", { name: "VIORA5", exact: true })).toHaveCount(0);
});

test("create sends one request", async ({ page }) => {
  const s = server();
  await serve(page, s);
  await page.goto("/promo-codes");
  await openCreate(page);
  await page.getByLabel("الكود", { exact: true }).fill("viora10");
  await page.getByLabel("نسبة الخصم").fill("10");
  await page.getByRole("button", { name: "إنشاء", exact: true }).dblclick();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(s.posts).toEqual([{ code: "VIORA10", type: "PERCENT", percent: 10, duration: "1D" }]);
  await expect(page.getByRole("cell", { name: "VIORA10", exact: true })).toBeVisible();
});

test("taken code shows under the field", async ({ page }) => {
  const s = server();
  s.createReply = { status: 409, json: { success: false, errorCode: "PROMO_CODE_TAKEN", message: "x",
    errors: { code: "x" }, fieldErrors: { code: { code: "PROMO_CODE_TAKEN" } } } };
  await serve(page, s);
  await page.goto("/promo-codes");
  await openCreate(page);
  await page.getByLabel("الكود", { exact: true }).fill("TAKEN1");
  await page.getByLabel("نسبة الخصم").fill("10");
  await page.getByRole("button", { name: "إنشاء", exact: true }).click();
  await expect(page.getByRole("dialog").getByText("هذا الكود مستخدم، اختر كوداً آخر")).toBeVisible();
  await expect(page.getByLabel("نسبة الخصم")).toHaveValue("10");
});

test("client validation blocks bad input", async ({ page }) => {
  const s = server();
  await serve(page, s);
  await page.goto("/promo-codes");
  await openCreate(page);
  await page.getByLabel("الكود", { exact: true }).fill("AB");
  await page.getByLabel("نسبة الخصم").fill("95");
  await page.getByRole("button", { name: "إنشاء", exact: true }).click();
  await expect(page.getByText("الكود من 4 لـ 20 حرف إنجليزي أو رقم")).toBeVisible();
  await expect(page.getByText("النسبة رقم صحيح من 1 لـ 90")).toBeVisible();
  expect(s.posts).toEqual([]);
});

test("stop asks to confirm and refreshes", async ({ page }) => {
  const s = server([promo({ id: 2, code: "ROSE6", owner: "STORE", store: { id: 4, name: "روز بوتيك" } })]);
  await serve(page, s);
  await page.goto("/promo-codes");
  await page.getByRole("button", { name: "إيقاف ROSE6" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("روز بوتيك");
  await dialog.getByRole("button", { name: "إيقاف", exact: true }).click();
  await expect.poll(() => s.stops).toEqual([2]);
  await expect(page.getByRole("cell", { name: "ROSE6", exact: true })).toHaveCount(0);
  await expect(page.getByLabel("إشعارات العمليات").getByRole("status")).toContainText("تم إيقاف الكود");
});

test("stop on a missing code shows not found and reloads", async ({ page }) => {
  const s = server([promo({ id: 7, code: "GONE7" })]);
  s.stopReply = { status: 404, json: { success: false, errorCode: "PROMO_NOT_FOUND", message: "x" } };
  await serve(page, s);
  await page.goto("/promo-codes");
  const before = s.listUrls.length;
  await page.getByRole("button", { name: "إيقاف GONE7" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "إيقاف", exact: true }).click();
  await expect(page.getByLabel("إشعارات العمليات").getByRole("alert")).toContainText("الكود غير موجود");
  await expect.poll(() => s.listUrls.length).toBeGreaterThan(before);
});

test("finance shows promo cost and columns", async ({ page }) => {
  await serve(page, server());
  const fin: Record<string, unknown> = {
    "/admin/settings/commission": { success: true, settings: { defaultRate: 10, customStoresCount: 0 } },
    "/admin/payouts/balances": { success: true, balances: [], totals: { unpaidAmount: "0.00", storesCount: 0 } },
    "/admin/payouts": { success: true, payouts: [], pagination: emptyPage },
    "/admin/settlements/summary": { success: true, summary: { platformPromoCost: "30.00", ordersCount: 3 } },
    "/admin/settlements": { success: true, pagination: { page: 1, limit: 15, total: 3, totalPages: 1 }, settlements: [
      { id: 1, orderId: 11, storeId: 4, store: { name: "متجر أ" }, storeDue: "90.00", createdAt: "2026-11-09T10:00:00.000Z",
        payoutId: null, discountAmount: "10.00", deliveryWaived: "0.00", promoFundedBy: "PLATFORM" },
      { id: 2, orderId: 12, storeId: 5, store: { name: "متجر ب" }, storeDue: "84.60", createdAt: "2026-11-09T10:00:00.000Z",
        payoutId: null, discountAmount: "0.00", deliveryWaived: "6.00", promoFundedBy: "STORE" },
      { id: 3, orderId: 13, storeId: 6, store: { name: "متجر ج" }, storeDue: "50.00", createdAt: "2026-11-09T10:00:00.000Z",
        payoutId: null, discountAmount: "0.00", deliveryWaived: "0.00", promoFundedBy: null },
    ] },
  };
  await page.route(`${api}/admin/{settings,payouts,settlements}/**`, (route) =>
    route.fulfill({ json: fin[new URL(route.request().url()).pathname.replace(/^\/api/, "")] ?? { success: false } }));
  await page.route(`${api}/admin/{payouts,settlements}?*`, (route) =>
    route.fulfill({ json: fin[new URL(route.request().url()).pathname.replace(/^\/api/, "")] ?? { success: false } }));
  await page.route(`${api}/admin/{payouts,settlements}`, (route) =>
    route.fulfill({ json: fin[new URL(route.request().url()).pathname.replace(/^\/api/, "")] ?? { success: false } }));

  await page.goto("/finance");
  const cost = page.getByText("تكلفة أكواد Viora", { exact: true });
  await expect(cost).toBeVisible();
  await expect(cost.locator("xpath=ancestor::*[2]")).toContainText("30");

  await page.getByRole("button", { name: "مستحقات الطلبات" }).click();
  const rows = page.locator("tbody tr");
  await expect(rows.nth(0)).toContainText("− ");
  await expect(rows.nth(0)).toContainText("Viora");
  await expect(rows.nth(1)).toContainText("المتجر");
  await expect(rows.nth(2).getByText("—")).toHaveCount(2);
});

test("promo filters are named for screen readers", async ({ page }) => {
  await serve(page, server([promo()]));
  await page.goto("/promo-codes");
  await expect(page.getByRole("combobox", { name: "الحالة" })).toBeVisible();
  await expect(page.getByRole("group", { name: "الجهة" })).toBeVisible();
});

test("finance metric cards share one row on wide screens", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await serve(page, server());
  await page.route(`${api}/admin/settlements/summary`, (route) =>
    route.fulfill({ json: { success: true, summary: { platformPromoCost: "30.00" } } }));
  await page.goto("/finance");
  const labels = ["عمولة الطلبات الجديدة", "متاجر في كشف المستحقات", "إجمالي بانتظار التحويل", "تكلفة أكواد Viora"];
  const tops: number[] = [];
  for (const label of labels) {
    const box = await page.getByText(label, { exact: true }).boundingBox();
    expect(box).not.toBeNull();
    tops.push(Math.round(box!.y));
  }
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(4);
});
