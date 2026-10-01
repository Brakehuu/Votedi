import { test, expect, type Page } from "@playwright/test";

const SLUG = process.env.E2E_ROOM_SLUG || "GrLW3p4n";

async function joinIfNeeded(page: Page, slug: string) {
  await page.goto(`/p/${slug}`, { waitUntil: "load" });
  await page.waitForTimeout(800);

  const joinBtn = page.getByRole("button", { name: /Vào phòng/i });
  if (!(await joinBtn.count())) return;

  if (await page.locator('form input[type="password"]').count()) {
    test.skip(true, "Room requires password; set E2E_ROOM_SLUG to an open room");
  }

  const nameInput = page.locator('form input:not([type="password"]):not([type="file"]):not([type="hidden"])').first();
  await expect(nameInput).toBeVisible();
  await nameInput.fill(`E2E ${Date.now().toString(36).slice(-4)}`);
  await joinBtn.click();
  await page.waitForTimeout(3000);
  await page.reload({ waitUntil: "load" });
}

test.describe("room pages production smoke", () => {
  test("/p/[slug] loads without RSC error after join", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error" && /Minified React error #441|#441|deriveThirdPlace/i.test(msg.text())) {
        errors.push(msg.text());
      }
    });

    await joinIfNeeded(page, SLUG);
    await page.goto(`/p/${SLUG}`, { waitUntil: "load" });
    await page.waitForTimeout(1500);

    await expect(page.getByText("Có lỗi khi tải trang")).toHaveCount(0);
    expect(errors.filter((e) => /441|deriveThirdPlace|client function/i.test(e))).toEqual([]);
  });

  test("/p/[slug]/ket-qua loads without RSC error for member", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error" && /Minified React error #441|#441|deriveThirdPlace/i.test(msg.text())) {
        errors.push(msg.text());
      }
    });

    await joinIfNeeded(page, SLUG);
    await page.goto(`/p/${SLUG}/ket-qua`, { waitUntil: "load" });
    await page.waitForTimeout(2000);

    const body = await page.locator("body").innerText();
    expect(body).not.toContain("Có lỗi khi tải trang");
    expect(body).not.toMatch(/Minified React error #441/);
    expect(errors.filter((e) => /441|deriveThirdPlace|client function/i.test(e))).toEqual([]);
    // Member path shows results chrome; guest path shows gate — either OK if no RSC crash
    expect(/Kết quả chi tiết|Cần vào phòng|Không xem được/.test(body)).toBe(true);
  });

  test("error report flow shows digest on /lien-he", async ({ page }) => {
    await page.goto("/lien-he?digest=654872295&message=test%20digest%20654872295", { waitUntil: "load" });
    await expect(page.getByText("Digest: 654872295")).toBeVisible();
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/654872295/);
  });
});
