import { expect, test, type Page } from "@playwright/test";

const loginEndpoint = /\/admin\/login(?:\?|$)/;
const admin = {
  id: 1,
  name: "QA Admin",
  email: "qa@example.test",
  role: "ADMIN",
  isActive: true,
};

test.beforeEach(async ({ page, baseURL }) => {
  const appOrigin = new URL(baseURL ?? "http://localhost:3100").origin;

  // Mock all backend fetches, including unexpected endpoints, to keep credentials local.
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const isBackend =
      ["fetch", "xhr"].includes(request.resourceType()) &&
      (url.origin !== appOrigin || url.pathname.startsWith("/api/"));
    if (!isBackend) return route.continue();

    const path = url.pathname.replace(/^\/api/, "");
    const responses: Record<string, unknown> = {
      "/health": { success: true },
      "/admin/me": { success: true, user: admin },
      "/notifications/count": { success: true, unread: 0 },
      "/notifications": { success: true, notifications: [], unread: 0 },
      "/admin/stats": {
        success: true,
        period: { days: 30, from: "2026-09-01", to: "2026-09-30" },
        stats: {
          stores: { active: 0, pending: 0, rejected: 0, suspended: 0, total: 0 },
          users: { merchants: 0, customers: 0, total: 0, newMerchants: 0, newCustomers: 0 },
          orders: { total: 0, inPeriod: 0 },
          revenue: { total: "0", inPeriod: "0" },
          reports: { open: 0 },
        },
        charts: { signups: [], orders: [] },
        topStores: [],
      },
    };

    return route.fulfill({
      status: responses[path] ? 200 : 404,
      json: responses[path] ?? { success: false, message: "Unmocked QA endpoint" },
    });
  });

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "مرحباً بعودتك." })).toBeVisible();
});

async function submitCredentials(page: Page, password = "QA-password") {
  await page.getByLabel("البريد الإلكتروني", { exact: true }).fill(admin.email);
  await page.getByLabel("كلمة المرور", { exact: true }).fill(password);
  await page.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();
}

test("login validates locally and focuses the field that needs attention", async ({ page }) => {
  let requests = 0;
  await page.route(loginEndpoint, async (route) => {
    requests += 1;
    await route.fulfill({ status: 500, json: { success: false } });
  });
  const email = page.getByLabel("البريد الإلكتروني", { exact: true });
  const password = page.getByLabel("كلمة المرور", { exact: true });
  const submit = page.getByRole("button", { name: "تسجيل الدخول", exact: true });

  await submit.click();
  await expect(email).toBeFocused();
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveAccessibleDescription("البريد الإلكتروني مطلوب");

  await email.fill("invalid-email");
  await submit.click();
  await expect(email).toBeFocused();
  await expect(email).toHaveAccessibleDescription("صيغة البريد الإلكتروني غير صحيحة");

  await email.fill(admin.email);
  await submit.click();
  await expect(password).toBeFocused();
  await expect(password).toHaveAccessibleDescription("كلمة المرور مطلوبة");
  expect(requests).toBe(0);
});

test("login preserves the password, trims email, and persists an admin session", async ({ page }) => {
  let submitted: unknown;
  await page.route(loginEndpoint, async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ json: { success: true, user: admin, token: "qa-login-token" } });
  });
  await page.getByLabel("البريد الإلكتروني", { exact: true }).fill(`  ${admin.email}  `);
  await page.getByLabel("كلمة المرور", { exact: true }).fill("  Exact password!  ");
  await page.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();

  await expect(page).toHaveURL("/");
  expect(submitted).toEqual({ email: admin.email, password: "  Exact password!  " });
  expect(await page.evaluate(() => localStorage.getItem("token"))).toBe("qa-login-token");
  await expect(page.getByRole("heading", { name: "نظرة عامة على المنصة", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "نظرة عامة على المنصة", exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("token"))).toBe("qa-login-token");
});

test("login rejects a successful response for a non-admin without storing its token", async ({ page }) => {
  await page.route(loginEndpoint, (route) => route.fulfill({
    json: { success: true, user: { ...admin, role: "MERCHANT" }, token: "must-not-be-stored" },
  }));
  await submitCredentials(page);
  await expect(page.getByRole("alert").first()).toContainText("هذا الحساب مش حساب مشرف");
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();
});

test("login exposes server field errors through their inputs", async ({ page }) => {
  await page.route(loginEndpoint, (route) => route.fulfill({
    status: 400,
    json: {
      success: false,
      message: "QA validation failed",
      errors: { email: "QA email error", password: "QA password error" },
    },
  }));
  await submitCredentials(page);
  await expect(page.getByLabel("البريد الإلكتروني", { exact: true })).toHaveAccessibleDescription("QA email error");
  await expect(page.getByLabel("كلمة المرور", { exact: true })).toHaveAccessibleDescription("QA password error");
  await expect(page.getByRole("alert").first()).toContainText("QA validation failed");
  await expect(page.getByRole("button", { name: "تسجيل الدخول", exact: true })).toBeEnabled();
});

for (const status of [401, 429]) {
  test(`login displays ${status} errors and allows another attempt`, async ({ page }) => {
    const message = status === 401 ? "QA incorrect credentials" : "QA too many attempts";
    await page.route(loginEndpoint, (route) => route.fulfill({
      status,
      json: { success: false, message },
    }));
    await submitCredentials(page);
    await expect(page.getByRole("alert").first()).toContainText(message);
    await expect(page.getByRole("button", { name: "تسجيل الدخول", exact: true })).toBeEnabled();
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();
  });
}

test("login shows a dedicated suspension explanation without duplicating its title", async ({ page }) => {
  await page.route(loginEndpoint, (route) => route.fulfill({
    status: 403,
    json: { success: false, accountSuspended: true, message: "هذا الحساب موقوف" },
  }));
  await submitCredentials(page);
  const alert = page.getByRole("main").getByRole("alert");
  await expect(alert).toHaveCount(1);
  await expect(alert.getByText("هذا الحساب موقوف", { exact: true })).toHaveCount(1);
  await expect(alert).toContainText("تواصل مع الدعم لمراجعة الإيقاف");
  expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();
});

test("login disables submission while pending and recovers from a server failure", async ({ page }) => {
  let releaseResponse!: () => void;
  const responseReady = new Promise<void>((resolve) => { releaseResponse = resolve; });
  await page.route(loginEndpoint, async (route) => {
    await responseReady;
    await route.fulfill({ status: 503, json: { success: false, message: "QA temporarily unavailable" } });
  });
  await submitCredentials(page);
  try {
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
    await expect(page.locator('button[type="submit"]')).toContainText("جارٍ الدخول");
  } finally {
    releaseResponse();
  }
  await expect(page.getByRole("alert").first()).toContainText("QA temporarily unavailable");
  await expect(page.getByRole("button", { name: "تسجيل الدخول", exact: true })).toBeEnabled();
});

test("login supports password visibility and keyboard-accessible access guidance", async ({ page }) => {
  const password = page.getByLabel("كلمة المرور", { exact: true });
  await password.fill("Readable password");
  await expect(password).toHaveAttribute("autocomplete", "current-password");
  await page.getByRole("button", { name: "إظهار كلمة المرور", exact: true }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveAttribute("dir", "ltr");
  await expect(password).toHaveValue("Readable password");
  await page.getByRole("button", { name: "إخفاء كلمة المرور", exact: true }).click();
  await expect(password).toHaveAttribute("type", "password");

  const summary = page.locator("summary", { hasText: "تحتاج مساعدة في الدخول؟" });
  const details = page.locator("details").filter({ has: summary });
  await expect(details).not.toHaveAttribute("open");
  await summary.focus();
  await summary.press("Enter");
  await expect(details).toHaveAttribute("open", "");
  await summary.press("Enter");
  await expect(details).not.toHaveAttribute("open");
});
