import { test, expect } from "@playwright/test";

test.describe("Be Vietnam Pro font", () => {
  test("homepage loads Be Vietnam Pro 800 after fonts ready", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    await page.waitForFunction(
      async () => {
        await document.fonts.ready;
        return document.fonts.check('800 40px "Be Vietnam Pro"');
      },
      null,
      { timeout: 15_000 },
    );
    const ready = await page.evaluate(() => document.fonts.check('800 40px "Be Vietnam Pro"'));
    expect(ready).toBe(true);
  });
});

test.describe("ZoomButton + lightbox + SVG bounds", () => {
  test("homepage ZoomButtons are 34px, no runaway SVGs, no horizontal scroll", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/", { waitUntil: "load" });
    await page.waitForSelector(".home .zbtn", { timeout: 15_000 });

    const zoomButtons = page.locator(".home .zbtn");
    const count = await zoomButtons.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 8); i++) {
      const box = await zoomButtons.nth(i).boundingBox();
      expect(box).toBeTruthy();
      expect(Math.round(box!.width)).toBe(34);
      expect(Math.round(box!.height)).toBe(34);
    }

    const oversized = await page.evaluate(() => {
      const skip = ".tee, .vis, .poster, .pl, .home-lb-img, [data-illustration], svg.tee, .v-b";
      return [...document.querySelectorAll("svg")]
        .filter((svg) => !svg.closest(skip))
        .map((svg) => {
          const r = svg.getBoundingClientRect();
          return { w: Math.round(r.width), h: Math.round(r.height), cls: svg.getAttribute("class") || "" };
        })
        .filter((x) => x.w > 64 || x.h > 64);
    });
    expect(oversized).toEqual([]);

    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflowX).toBeLessThanOrEqual(1);
  });

  test("lightbox opens from ZoomButton and closes with Esc / X", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    const zoom = page.locator(".home .zbtn").first();
    await expect(zoom).toBeVisible({ timeout: 15_000 });
    await zoom.click();

    const dialog = page.getByRole("dialog", { name: "Xem ảnh mẫu" });
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0, { timeout: 5_000 });

    await zoom.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Đóng" }).click();
    await expect(dialog).toHaveCount(0);
  });

  for (const width of [390, 768, 1366]) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 768 });
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".home", { timeout: 15_000 });
      const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflowX).toBeLessThanOrEqual(1);
    });
  }
});
