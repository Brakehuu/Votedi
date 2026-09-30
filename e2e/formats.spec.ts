import { test, expect } from "@playwright/test";

/**
 * E2E smoke: 2 browser contexts + SEO routes.
 * FULL flows (create→invite→vote→close) cần DB sống và PLAYWRIGHT_BASE_URL.
 *
 * npx playwright test
 * PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test
 */

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

const FORMAT_CREATE_PATHS = [
  "/tao-phong?kieu=quick",
  "/tao-phong?kieu=bracket",
  "/tao-phong?kieu=schedule",
  "/tao-phong?kieu=swipe",
  "/tao-phong?kieu=ranking",
  "/tao-phong?kieu=rating",
] as const;

test.describe("format wizard entry (2 contexts)", () => {
  for (const path of FORMAT_CREATE_PATHS) {
    test(`host+guest open ${path}`, async ({ browser }) => {
      test.skip(!process.env.PLAYWRIGHT_BASE_URL && !process.env.CI, "Set PLAYWRIGHT_BASE_URL");

      const hostCtx = await browser.newContext();
      const guestCtx = await browser.newContext();
      const host = await hostCtx.newPage();
      const guest = await guestCtx.newPage();

      const res = await host.goto(`${BASE}${path}`);
      expect(res?.ok() || res?.status() === 304).toBeTruthy();
      await expect(host.locator("main").first()).toBeVisible({ timeout: 20_000 });

      await guest.goto(`${BASE}/mau`);
      await expect(guest.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });

      await hostCtx.close();
      await guestCtx.close();
    });
  }
});

test.describe("static marketing", () => {
  test("core SEO routes", async ({ page }) => {
    test.skip(!process.env.PLAYWRIGHT_BASE_URL && !process.env.CI, "Set PLAYWRIGHT_BASE_URL");
    for (const path of ["/", "/mau", "/kieu-vote", "/huong-dan", "/gioi-thieu", "/phong-cua-toi", "/faq"]) {
      const res = await page.goto(`${BASE}${path}`);
      expect(res?.ok() || res?.status() === 304, path).toBeTruthy();
    }
  });
});

test.describe("axe", () => {
  test("home no serious/critical", async ({ page }) => {
    test.skip(!process.env.PLAYWRIGHT_BASE_URL, "needs PLAYWRIGHT_BASE_URL");
    await page.goto(BASE);
    const AxeBuilder = (await import("@axe-core/playwright")).default;
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(bad, JSON.stringify(bad.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), null, 2)).toEqual(
      [],
    );
  });
});
