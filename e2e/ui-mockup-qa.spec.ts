import { test, expect, type Page, type Locator } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const OUT = path.join(process.cwd(), ".tmp-ui-qa");

function relativeLuminance(r: number, g: number, b: number) {
  const lin = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
}

function contrastRatio(fg: [number, number, number], bg: [number, number, number]) {
  const L1 = relativeLuminance(...fg);
  const L2 = relativeLuminance(...bg);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseRgb(input: string): [number, number, number] | null {
  const m = input.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

async function solidBgBehind(page: Page, el: Locator): Promise<[number, number, number]> {
  return page.evaluate((node) => {
    function parse(c: string): [number, number, number] | null {
      const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
      if (!m) return null;
      const a = m[4] === undefined ? 1 : Number(m[4]);
      if (a < 0.95) return null;
      return [Number(m[1]), Number(m[2]), Number(m[3])];
    }
    let cur: Element | null = node as Element;
    while (cur) {
      const bg = getComputedStyle(cur).backgroundColor;
      const rgb = parse(bg);
      if (rgb) return rgb;
      cur = cur.parentElement;
    }
    return [243, 248, 248];
  }, await el.elementHandle());
}

async function assertFooterLinkContrast(page: Page, minRatio = 4.5) {
  const links = page.locator(".site-footer a[href]");
  const count = await links.count();
  expect(count).toBeGreaterThan(0);
  const sample = Math.min(count, 6);
  for (let i = 0; i < sample; i++) {
    const link = links.nth(i);
    await link.scrollIntoViewIfNeeded();
    const color = await link.evaluate((n) => getComputedStyle(n).color);
    const fg = parseRgb(color);
    expect(fg, `parse color ${color}`).not.toBeNull();
    const bg = await solidBgBehind(page, link);
    const ratio = contrastRatio(fg!, bg);
    expect(ratio, `footer link contrast ${color} on ${bg}`).toBeGreaterThanOrEqual(minRatio);
  }
}

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.emulateMedia({ colorScheme: theme });
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    localStorage.setItem("theme", t);
  }, theme);
  await page.waitForTimeout(200);
}

test.describe("footer contrast", () => {
  for (const route of ["/", "/blog", "/blog/chon-ngay-di-choi-hop-lop-ca-nhom", "/mau"] as const) {
    for (const theme of ["light", "dark"] as const) {
      test(`${route} ${theme} ≥ 4.5:1`, async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto(route);
        await setTheme(page, theme);
        await assertFooterLinkContrast(page);
      });
    }
  }
});

test.describe("mobile menu mockup", () => {
  test("format grid links are separate at 390", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Mở menu" }).click();
    const drawer = page.locator("#mobile-nav-drawer");
    await expect(drawer).toBeVisible();
    const tiles = drawer.locator(".sheet-ft");
    await expect(tiles).toHaveCount(6);
    const box0 = await tiles.nth(0).boundingBox();
    const box1 = await tiles.nth(1).boundingBox();
    expect(box0 && box1).toBeTruthy();
    expect(box1!.x).toBeGreaterThan(box0!.x + box0!.width - 4);
    await expect(drawer.getByRole("switch", { name: "Giao diện tối" })).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Tạo phòng miễn phí" })).toBeVisible();
  });
});

test.describe("home hero iPad", () => {
  const sizes = [
    { w: 768, h: 1024 },
    { w: 820, h: 1180 },
    { w: 834, h: 1194 },
    { w: 1024, h: 768 },
    { w: 1180, h: 820 },
  ] as const;

  test.beforeAll(() => {
    fs.mkdirSync(OUT, { recursive: true });
  });

  for (const { w, h } of sizes) {
    test(`${w}x${h} no horizontal scroll + demo visible`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto("/");
      await page.waitForSelector(".home .hero");
      const metrics = await page.evaluate(() => {
        const hero = document.querySelector(".home .hero") as HTMLElement | null;
        const stage = document.querySelector(".home .stage") as HTMLElement | null;
        const docW = document.documentElement.scrollWidth;
        const clientW = document.documentElement.clientWidth;
        const stageRect = stage?.getBoundingClientRect();
        return {
          overflowX: docW - clientW,
          stageWidth: stageRect?.width ?? 0,
          stageBottom: stageRect?.bottom ?? 0,
          vh: window.innerHeight,
          heroCols: hero ? getComputedStyle(hero).gridTemplateColumns : "",
        };
      });
      expect(metrics.overflowX).toBeLessThanOrEqual(1);
      expect(metrics.stageWidth).toBeGreaterThan(200);
      // demo card should be largely in first viewport (touch-visible)
      expect(metrics.stageBottom).toBeLessThan(metrics.vh + 80);
      await page.screenshot({
        path: path.join(OUT, `hero-${w}x${h}.png`),
        fullPage: false,
      });
    });
  }
});
