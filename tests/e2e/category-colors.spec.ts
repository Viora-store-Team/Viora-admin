import { test, expect, type Page, type Route } from "@playwright/test";

const api = "https://api.vioragaza.com/api";
const user = { id: 1, name: "QA Admin", email: "qa@example.test", role: "ADMIN", isActive: true };
const emptyPage = { page: 1, limit: 15, total: 0, totalPages: 0 };

type Cat = Record<string, unknown> & { id: number; noColors: boolean };

function cat(over: Partial<Cat> & { id: number; name: string }): Cat {
  return {
    slug: `cat-${over.id}`, imageUrl: null, sortOrder: 0, isActive: true, sizeGroup: null,
    sizes: [], noSizes: false, noColors: false, parentId: null, createdAt: "2026-11-01", updatedAt: "2026-11-01",
    childrenCount: 0, productsCount: 0, storesCount: 0, ...over,
  };
}

interface Server {
  patches: Record<string, unknown>[];
  patchReply?: { status: number; json: Record<string, unknown> };
  child: Cat;
}

function makeServer(): Server {
  return { patches: [], child: cat({ id: 2, name: "مكياج", parentId: 1, noSizes: true, sizes: [{ id: 9, name: "مقاس واحد", sizeGroup: "ONE_SIZE" }] }) };
}

async function serve(page: Page, s: Server) {
  await page.addInitScript(() => localStorage.setItem("token", "qa-fixture"));
  await page.route(`${api}/**`, async (route: Route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api/, "");
    const base: Record<string, unknown> = {
      "/health": { success: true }, "/admin/me": { success: true, user },
      "/notifications/count": { success: true, unread: 0 },
      "/notifications": { success: true, notifications: [], unread: 0, pagination: emptyPage },
      "/admin/sizes": { success: true, sizes: [] },
    };
    if (base[path]) return route.fulfill({ json: base[path] });

    if (path === "/admin/categories" && request.method() === "GET") {
      const root = cat({ id: 1, name: "جمال", childrenCount: 1 });
      return route.fulfill({ json: { success: true, categories: [{ ...root, children: [s.child] }], count: 2 } });
    }
    if (path === "/admin/categories/2" && request.method() === "GET") {
      return route.fulfill({ json: { success: true, category: s.child } });
    }
    if (path === "/admin/categories/2" && request.method() === "PATCH") {
      s.patches.push(request.postDataJSON() as Record<string, unknown>);
      if (s.patchReply) return route.fulfill(s.patchReply);
      s.child = { ...s.child, ...(request.postDataJSON() as object) } as Cat;
      return route.fulfill({ json: { success: true, category: s.child } });
    }
    return route.fulfill({ status: 404, json: { success: false, message: "Unavailable" } });
  });
}

async function openEdit(page: Page) {
  await page.goto("/categories");
  await page.getByText("مكياج", { exact: true }).first().waitFor();
  await page.getByRole("button", { name: "تعديل" }).last().click();
  await expect(page.getByRole("dialog", { name: "التصنيف" })).toBeVisible();
}

test("turning on no-colors sends noColors and the tree badge shows it", async ({ page }) => {
  const s = makeServer();
  await serve(page, s);
  await openEdit(page);
  const toggle = page.getByRole("switch", { name: "بدون ألوان" });
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "حفظ التغييرات", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(s.patches).toHaveLength(1);
  expect(s.patches[0]).toMatchObject({ noColors: true });
  await expect(page.getByText("بدون ألوان", { exact: true })).toBeVisible();
});

test("an unchanged toggle is not sent", async ({ page }) => {
  const s = makeServer();
  await serve(page, s);
  await openEdit(page);
  await page.getByLabel("ترتيب العرض").fill("5");
  await page.getByRole("button", { name: "حفظ التغييرات", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(s.patches[0]).not.toHaveProperty("noColors");
});

test("409 CATEGORY_COLORS_IN_USE explains the count and keeps the dialog open", async ({ page }) => {
  const s = makeServer();
  s.patchReply = { status: 409, json: { success: false, errorCode: "CATEGORY_COLORS_IN_USE", message: "x",
    details: { productIds: [11, 12, 13] } } };
  await serve(page, s);
  await openEdit(page);
  await page.getByRole("switch", { name: "بدون ألوان" }).click();
  await page.getByRole("button", { name: "حفظ التغييرات", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "التصنيف" });
  await expect(dialog.getByRole("alert")).toContainText("في 3 منتجات بأكثر من لون");
  await expect(dialog.getByRole("switch", { name: "بدون ألوان" })).toHaveAttribute("aria-checked", "true");
});
