import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

const POST = "/blog/chon-ngay-di-choi-hop-lop-ca-nhom";
const MAU = "/mau/hom-nay-an-gi";

async function assertTop(page: Page) {
  await page.waitForTimeout(500);
  const y = await page.evaluate(() => window.scrollY);
  expect(y).toBeLessThanOrEqual(5);
}

test.describe("scroll restoration", () => {
  test("/ → /blog stays at top", async ({ page }) => {
    await page.goto("/");
    await page.locator('header a[href="/blog"]').click();
    await page.waitForURL("**/blog");
    await assertTop(page);
  });

  test("/ → /mau stays at top", async ({ page }) => {
    await page.goto("/");
    await page.locator('header a[href="/mau"]').first().click();
    await page.waitForURL("**/mau");
    await assertTop(page);
  });

  test("/blog → article stays at top", async ({ page }) => {
    await page.goto("/blog");
    await page.locator(`a[href="${POST}"]`).first().click();
    await page.waitForURL(`**${POST}`);
    await assertTop(page);
  });

  test("/blog → /huong-dan stays at top", async ({ page }) => {
    await page.goto("/blog");
    await page.locator('header a[href="/huong-dan"]').click();
    await page.waitForURL("**/huong-dan");
    await assertTop(page);
  });

  test("/huong-dan → /mau stays at top", async ({ page }) => {
    await page.goto("/huong-dan");
    await page.locator('header a[href="/mau"]').click();
    await page.waitForURL("**/mau");
    await assertTop(page);
  });

  test("/mau → /kieu-vote stays at top", async ({ page }) => {
    await page.goto("/mau");
    await page.locator(".site-footer a[href='/kieu-vote']").click();
    await page.waitForURL("**/kieu-vote");
    await assertTop(page);
  });

  test("/mau → /mau/<slug> stays at top", async ({ page }) => {
    await page.goto("/mau");
    await page.locator(`a[href="${MAU}"]`).first().click();
    await page.waitForURL(`**${MAU}`);
    await assertTop(page);
  });

  test("header logo stays at top", async ({ page }) => {
    await page.goto("/blog");
    await page.locator('header a[aria-label="Vote Đi"]').click();
    await page.waitForURL("**/");
    await assertTop(page);
  });

  test("footer link from page bottom stays at top", async ({ page }) => {
    await page.goto(POST);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.locator('footer a[href="/huong-dan"]').click();
    await page.waitForURL("**/huong-dan");
    await assertTop(page);
  });

  test("hash anchor still scrolls to heading", async ({ page }) => {
    await page.goto(POST);
    const toc = page.locator(".blog-side a[href^='#']").first();
    await expect(toc).toBeVisible({ timeout: 15_000 });
    const href = await toc.getAttribute("href");
    expect(href?.startsWith("#")).toBeTruthy();
    await toc.click();
    await page.waitForTimeout(400);
    const id = href!.slice(1);
    const top = await page.evaluate((headingId) => {
      const el = document.getElementById(headingId);
      return el?.getBoundingClientRect().top ?? 9999;
    }, id);
    expect(top).toBeGreaterThan(40);
    expect(top).toBeLessThan(200);
  });
});

test.describe("share buttons desktop", () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test("Sao chép + Facebook on rail", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(POST);
    const rail = page.locator(".blog-share");
    await expect(rail.getByRole("button", { name: "Sao chép" })).toBeVisible();
    await expect(rail.getByRole("link", { name: "Facebook" })).toBeVisible();
    const fb = await rail.getByRole("link", { name: "Facebook" }).getAttribute("href");
    expect(fb).toContain("facebook.com/sharer");
    expect(fb).toContain(encodeURIComponent(POST));
    await rail.getByRole("button", { name: "Sao chép" }).click();
    await expect(page.getByText("Đã sao chép liên kết")).toBeVisible({ timeout: 8000 });
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain(POST);
    expect(copied.startsWith("http")).toBeTruthy();
    await expect(page.locator(".blog-share-fallback")).toHaveCount(0);
  });
});

test.describe("share buttons mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Chia sẻ + Sao chép liên kết", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: async (data: ShareData) => {
          (window as unknown as { __shared?: ShareData }).__shared = data;
        },
      });
    });
    await page.goto(POST);
    const mob = page.locator(".blog-share-mob");
    await expect(mob.getByRole("button", { name: "Chia sẻ" })).toBeVisible();
    await expect(mob.getByRole("button", { name: "Sao chép liên kết" })).toBeVisible();
    await mob.getByRole("button", { name: "Chia sẻ" }).click();
    const shared = await page.evaluate(() => (window as unknown as { __shared?: ShareData }).__shared);
    expect(shared?.title).toBeTruthy();
    expect(shared?.url).toContain(POST);
    await mob.getByRole("button", { name: "Sao chép liên kết" }).click();
    await expect(page.getByText("Đã sao chép liên kết")).toBeVisible({ timeout: 8000 });
  });
});

test.describe("blog copy + dates", () => {
  test("index hero and featured match mockup copy", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Chốt việc chung cho cả nhóm");
    await expect(page.locator("h1 em")).toHaveText("không cãi nhau");
    await expect(page.getByText("Blog Vote Đi").first()).toBeVisible();
    await expect(page.getByText("Bài mới nhất").first()).toBeVisible();
    await expect(page.getByText("Đọc bài viết").first()).toBeVisible();
    const date = page.locator(".blog-feat .blog-meta span").first();
    await expect(date).toHaveText(/\d{2}\/\d{2}\/\d{4}/);
  });

  test("guide index hero", async ({ page }) => {
    await page.goto("/huong-dan");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Từ tạo phòng đến chốt kết quả");
    await expect(page.locator("h1 em")).toHaveText("trong 3 bước");
    await expect(page.locator(".guide-start-card").first()).toContainText("Tạo phòng");
  });

  test("category filter links", async ({ page }) => {
    await page.goto("/mau");
    await page.locator(".cat-chips a", { hasText: "Ăn uống" }).click();
    await page.waitForURL("**/mau/danh-muc/food");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Ăn uống");
  });
});

test.describe("mockup vs live styles", () => {
  test("key tokens match mockup at 1366", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    const mockup = path.resolve("docs/votedi-blog-mockup.html");
    await page.goto(`file://${mockup.replace(/\\/g, "/")}`);
    const mock = await page.evaluate(() => {
      const wrap = document.querySelector(".wrap") as HTMLElement | null;
      const hero = document.querySelector(".bl-hero h1") as HTMLElement | null;
      const em = document.querySelector(".bl-hero h1 em") as HTMLElement | null;
      const prose = document.querySelector(".prose") as HTMLElement | null;
      const band = document.querySelector(".band") as HTMLElement | null;
      const cs = (el: HTMLElement | null) => (el ? getComputedStyle(el) : null);
      return {
        wrapMax: wrap ? getComputedStyle(wrap).maxWidth : "",
        wrapPad: wrap ? getComputedStyle(wrap).paddingLeft : "",
        h1Size: hero ? cs(hero)!.fontSize : "",
        emClip: em ? cs(em)!.backgroundImage : "",
        bandBg: band ? cs(band)!.backgroundImage : "",
        proseSize: prose ? cs(prose)!.fontSize : "",
        proseLh: prose ? cs(prose)!.lineHeight : "",
      };
    });

    await page.goto("/blog");
    const live = await page.evaluate(() => {
      const wrap = document.querySelector(".blog-wrap") as HTMLElement | null;
      const navWrap = document.querySelector(".nav .wrap") as HTMLElement | null;
      const footWrap = document.querySelector("footer")?.closest(".wrap") as HTMLElement | null;
      const hero = document.querySelector(".blog-hero h1") as HTMLElement | null;
      const em = document.querySelector(".blog-hero h1 em") as HTMLElement | null;
      const band = document.querySelector(".blog-band") as HTMLElement | null;
      const cs = (el: HTMLElement | null) => (el ? getComputedStyle(el) : null);
      const rect = (el: HTMLElement | null) => el?.getBoundingClientRect().width ?? 0;
      return {
        wrapMax: wrap ? getComputedStyle(wrap).maxWidth : "",
        wrapPad: wrap ? getComputedStyle(wrap).paddingLeft : "",
        navW: rect(navWrap),
        contentW: rect(wrap),
        footW: rect(footWrap),
        h1Size: hero ? cs(hero)!.fontSize : "",
        emClip: em ? cs(em)!.backgroundImage : "",
        bandBg: band ? cs(band)!.backgroundImage : "",
      };
    });

    expect(live.wrapMax).toBe(mock.wrapMax);
    expect(live.wrapPad).toBe(mock.wrapPad);
    expect(Math.abs(live.navW - live.contentW)).toBeLessThan(8);
    expect(Math.abs(live.footW - live.contentW)).toBeLessThan(8);
    expect(live.emClip).toContain("25, 201, 167");
    expect(live.bandBg).toContain("25, 201, 167");
    expect(live.bandBg).toContain("8, 145, 178");

    await page.goto(POST);
    const article = await page.evaluate(() => {
      const prose = document.querySelector(".blog-prose") as HTMLElement | null;
      const grid = document.querySelector(".blog-pg") as HTMLElement | null;
      return {
        fontSize: prose ? getComputedStyle(prose).fontSize : "",
        lineHeight: prose ? getComputedStyle(prose).lineHeight : "",
        cols: grid ? getComputedStyle(grid).gridTemplateColumns : "",
      };
    });
    expect(article.fontSize).toBe("17.5px");
    expect(Number.parseFloat(article.lineHeight) / 17.5).toBeCloseTo(1.85, 2);
    expect(article.cols.startsWith("210px")).toBeTruthy();
    expect(article.cols.includes("230px")).toBeTruthy();
  });
});
