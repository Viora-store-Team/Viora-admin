import { expect, test, type Page } from "@playwright/test";

const api = "https://api.vioragaza.com/api";
const user = { id: 1, name: "QA Admin", email: "qa@example.test", role: "ADMIN", isActive: true };
const sidebarNav = (page: Page) => page.getByRole("navigation", { name: "لوحة مالك المنصة" });
const pagination = { page: 1, limit: 1, total: 0, totalPages: 0 };

async function serve(page: Page, name = user.name) {
  await page.addInitScript(() => localStorage.setItem("token", "qa-shell-token"));
  await page.route(`${api}/**`, (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");
    if (path === "/admin/support/tickets") {
      return route.fulfill({ status: 500, json: { success: false, message: "Unavailable" } });
    }
    if (path === "/admin/stores") {
      const total = url.searchParams.get("status") === "PENDING" ? 3 : 0;
      return route.fulfill({ json: { success: true, stores: [], pagination: { ...pagination, total, totalPages: total ? 1 : 0 } } });
    }
    const responses: Record<string, unknown> = {
      "/health": { success: true },
      "/admin/me": { success: true, user: { ...user, name } },
      "/admin/reports": { success: true, reports: [], pagination },
      "/notifications/count": { success: true, unread: 0 },
      "/notifications": { success: true, notifications: [], unread: 0, pagination },
    };
    return route.fulfill({ status: responses[path] ? 200 : 404, json: responses[path] ?? { success: false } });
  });
}

test("sidebar shows grouped nav", async ({ page }) => {
  await serve(page);
  await page.goto("/stores");
  const nav = sidebarNav(page);
  for (const group of ["الإدارة", "المراقبة", "التسويق"]) await expect(nav.getByText(group, { exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: /المتاجر/ })).toHaveAttribute("aria-current", "page");
  await expect(nav.locator('a[href="/support"]')).toBeVisible();
});

test("nav count badge shows pending stores", async ({ page }) => {
  await serve(page);
  await page.goto("/stores");
  await expect(sidebarNav(page).getByRole("link", { name: /المتاجر/ }).getByText("3", { exact: true })).toBeVisible();
});

test("failing support count is silent", async ({ page }) => {
  await serve(page);
  const failedCount = page.waitForResponse((response) => response.url().includes("/admin/support/tickets") && response.status() === 500);
  await page.goto("/stores");
  await failedCount;
  const support = sidebarNav(page).locator('a[href="/support"]');
  await expect(support).toBeVisible();
  await expect(support.locator("span", { hasText: /^\d+$/ })).toHaveCount(0);
  await expect(page.getByLabel("إشعارات العمليات").getByRole("alert")).toHaveCount(0);
});

test("long user name truncates", async ({ page }) => {
  const name = "م".repeat(60);
  await serve(page, name);
  await page.goto("/stores");
  const button = page.locator("aside").first().locator('button[aria-haspopup="menu"]');
  await expect(button).toBeVisible();
  const text = button.getByText(name);
  await expect.poll(() => text.evaluate((element) => getComputedStyle(element).textOverflow)).toBe("ellipsis");
  expect((await button.boundingBox())!.height).toBeLessThanOrEqual(64);
});

test("mobile drawer opens and Escape closes it", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await serve(page);
  await page.goto("/stores");
  await page.getByRole("button", { name: "فتح القائمة" }).click();
  const drawer = page.locator("#mobile-sidebar");
  await expect(drawer).toHaveAttribute("aria-hidden", "false");
  await expect(drawer).toBeInViewport();
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveAttribute("aria-hidden", "true");
  await expect(drawer).not.toBeInViewport();
});
