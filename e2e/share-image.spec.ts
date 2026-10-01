import { test, expect } from "@playwright/test";
import sharp from "sharp";

/**
 * Share-image route contracts on a production build (`next start`).
 * Slugs point at real rooms in the shared Supabase project.
 */
const CASES = [
  { name: "webp champion", slug: process.env.E2E_SHARE_WEBP || "GrLW3p4n" },
  { name: "jpeg champion", slug: process.env.E2E_SHARE_JPEG || "e2eJpeg1" },
  { name: "password room", slug: process.env.E2E_SHARE_PASSWORD || "cNnvTwYa" },
  { name: "no champion", slug: process.env.E2E_SHARE_NO_CHAMP || "XNqBBiES" },
] as const;

async function assertSharePng(request: import("@playwright/test").APIRequestContext, path: string) {
  const res = await request.get(path);
  expect(res.status(), path).toBe(200);
  expect(res.headers()["content-type"]).toMatch(/image\/png/);
  const buf = Buffer.from(await res.body());
  expect(buf.byteLength, `${path} size`).toBeLessThan(300_000);
  expect(buf.byteLength).toBeGreaterThan(1_000);
  const meta = await sharp(buf).metadata();
  expect(meta.width).toBe(1200);
  expect(meta.height).toBe(630);
  expect(meta.format).toBe("png");
  return { res, buf };
}

test.describe("ket-qua share-image", () => {
  for (const c of CASES) {
    test(`${c.name}: 200 / image/png / 1200x630 / <300KB`, async ({ request }) => {
      await assertSharePng(request, `/p/${c.slug}/ket-qua/share-image?v=test`);
    });
  }

  test("download=1 sets Content-Disposition attachment", async ({ request }) => {
    const { res } = await assertSharePng(
      request,
      `/p/${CASES[0].slug}/ket-qua/share-image?download=1&v=test`,
    );
    const cd = res.headers()["content-disposition"] || "";
    expect(cd).toMatch(/attachment/i);
    expect(cd).toMatch(/vote-di-ket-qua\.png/i);
  });

  test("opengraph-image also returns valid png", async ({ request }) => {
    await assertSharePng(request, `/p/${CASES[0].slug}/ket-qua/opengraph-image`);
  });
});
