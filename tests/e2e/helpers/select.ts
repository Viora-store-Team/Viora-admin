import type { Locator, Page } from "@playwright/test";

export async function pickOption(page: Page, field: Locator, value: string): Promise<void> {
  if (await field.evaluate(element => element.tagName) === "SELECT") {
    await field.selectOption(value);
    return;
  }
  await field.click();
  await page.locator(`[role="listbox"] [role="option"][data-value="${value}"]`).click();
}
