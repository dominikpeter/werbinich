import { defineConfig, devices } from "@playwright/test";

// mobile-first → phone viewport against a production build with canned AI (E2E_FAKE_AI: fast, free, deterministic),
// or against a deployment: BASE_URL=https://… just e2e. :3049 so it runs next to `just dev` on :3048.
const port = process.env.E2E_PORT ?? "3049";
const baseURL = process.env.BASE_URL ?? `http://localhost:${port}`;
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "android", use: devices["Pixel 7"] },
    { name: "iphone", use: devices["iPhone 15"] }, // Safari's engine: what the iOS app and most party phones run
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: `OPENROUTER_API_KEY= E2E_FAKE_AI=1 npm run build && OPENROUTER_API_KEY= E2E_FAKE_AI=1 npx next start -p ${port}`, url: baseURL, reuseExistingServer: !process.env.CI, timeout: 180_000 },
});
