import { expect, test } from "@playwright/test";
import { pickOption } from "./helpers/select";

const api = "https://api.vioragaza.com/api";
const pagination = { page: 1, limit: 20, total: 0, totalPages: 0 };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("token", "qa-fixture"));
  await page.route(`${api}/**`, route => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, "");
    const data: Record<string, unknown> = {
      "/health": { success: true },
      "/admin/me": { success: true, user: { id: 1, name: "QA Admin", email: "qa@example.test", role: "ADMIN", isActive: true } },
      "/notifications/count": { success: true, unread: 0 },
      "/notifications": { success: true, notifications: [], unread: 0, pagination },
      "/admin/orders": { success: true, orders: [], pagination },
    };
    return route.fulfill({ status: data[path] ? 200 : 404, json: data[path] || { success: false, message: "Unavailable" } });
  });
});

test("select opens, selects by click, and reaches the server", async ({ page }) => {
  const requests: URL[] = [];
  await page.route(`${api}/admin/orders?*`, route => {
    requests.push(new URL(route.request().url()));
    return route.fulfill({ json: { success: true, orders: [], pagination } });
  });
  await page.goto("/orders");
  const field = page.getByRole("combobox", { name: "حالة الطلب", exact: true });
  await pickOption(page, field, "DELIVERED");
  await expect.poll(() => requests.at(-1)?.searchParams.get("status")).toBe("DELIVERED");
  await expect(field).toContainText("تم التوصيل");
});

test("select keyboard", async ({ page }) => {
  await page.goto("/orders");
  const field = page.getByRole("combobox", { name: "حالة الطلب", exact: true });
  await field.focus();
  await field.press("ArrowDown");
  await expect(field).toHaveAttribute("aria-expanded", "true");
  await field.press("ArrowDown");
  await field.press("Enter");
  await expect(field).toHaveAttribute("aria-expanded", "false");
  await expect(field).not.toContainText("كل الحالات");
  await field.press("ArrowDown");
  await field.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(field).toBeFocused();
});

test("select flips up near the viewport bottom", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 500 });
  await page.goto("/orders");
  const field = page.getByRole("combobox", { name: "حالة الطلب", exact: true });
  await field.evaluate(element => { (element.parentElement as HTMLElement).style.marginTop = "700px"; });
  await field.evaluate(element => { window.scrollBy(0, element.getBoundingClientRect().top - 420); });
  const trigger = await field.boundingBox();
  expect(trigger).not.toBeNull();
  expect(trigger!.y).toBeGreaterThan(380);
  await field.click();
  const menu = await page.getByRole("listbox").boundingBox();
  expect(menu).not.toBeNull();
  expect(menu!.y + menu!.height).toBeLessThanOrEqual(trigger!.y + 1);
});

test("trigger keeps its height", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/orders");
  const field = page.getByRole("combobox", { name: "حالة الطلب", exact: true });
  await pickOption(page, field, "PARTIALLY_DELIVERED");
  expect((await field.boundingBox())?.height).toBe(48);
  await expect(field.locator("[data-select-label]")).toHaveCSS("text-overflow", "ellipsis");
});
