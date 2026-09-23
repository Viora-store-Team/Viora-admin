import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  workers: process.env.CI ? 2 : 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", {open: "never"}]],
  use: {
    baseURL: "http://localhost:3100",
    channel: process.env.CI ? undefined : "chrome",
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run start -- --port 3100",
    url: "http://localhost:3100/login",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
