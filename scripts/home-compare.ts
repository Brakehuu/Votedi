/**
 * Compare homepage mockup vs live site at key viewports.
 * Usage: npx tsx scripts/home-compare.ts
 */
import { chromium, type Page } from "@playwright/test";
import { mkdirSync } from "fs";
import path from "path";

const OUT = path.join(process.cwd(), ".tmp-home-compare");
const MOCKUP = path.join(process.cwd(), "docs/votedi-home-v5.html");
const LIVE = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

const VIEWPORTS = [
  { name: "1366x768", width: 1366, height: 768 },
  { name: "820x1000", width: 820, height: 1000 },
  { name: "390x844", width: 390, height: 844 },
  { name: "360x740", width: 360, height: 740 },
] as const;

async function metrics(page: Page) {
  return page.evaluate(() => {
    const home = document.querySelector(".home") || document.body;
    const h1 = document.querySelector("h1");
    const hero = document.querySelector(".hero");
    const fin = document.querySelector(".fin");
    const mbar = document.querySelector(".mbar");
    const cats = document.querySelectorAll(".cat").length;
    const fmts = document.querySelectorAll(".fmt").length;
    const steps = document.querySelectorAll(".step").length;
    const faqs = document.querySelectorAll("details").length;
    const chips = [...document.querySelectorAll(".chip")].slice(0, 3).map((el) => {
      const s = getComputedStyle(el);
      return {
        text: (el.textContent || "").trim().slice(0, 40),
        position: s.position,
        top: s.top,
        left: s.left,
      };
    });
    const overflowX = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    return {
      title: document.title,
      h1: (h1?.textContent || "").replace(/\s+/g, " ").trim(),
      heroPad: hero ? getComputedStyle(hero).padding : null,
      finDisplay: fin ? getComputedStyle(fin).display : null,
      mbarDisplay: mbar ? getComputedStyle(mbar).display : null,
      cats,
      fmts,
      steps,
      faqs,
      chips,
      overflowX,
      bodyW: document.documentElement.clientWidth,
      scrollW: document.documentElement.scrollWidth,
      homeBg: home ? getComputedStyle(document.body).backgroundColor : null,
    };
  });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const diffs: string[] = [];

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const mock = await ctx.newPage();
    const live = await ctx.newPage();
    await mock.goto(`file://${MOCKUP.replace(/\\/g, "/")}`, { waitUntil: "domcontentloaded" });
    await live.goto(`${LIVE}/`, { waitUntil: "networkidle" });
    await mock.waitForTimeout(400);
    await live.waitForTimeout(400);

    await mock.screenshot({ path: path.join(OUT, `mock-${vp.name}.png`), fullPage: false });
    await live.screenshot({ path: path.join(OUT, `live-${vp.name}.png`), fullPage: false });
    await live.screenshot({ path: path.join(OUT, `live-${vp.name}-full.png`), fullPage: true });

    const m = await metrics(mock);
    const l = await metrics(live);
    console.log(`\n=== ${vp.name} ===`);
    console.log("mock h1:", m.h1.slice(0, 80));
    console.log("live h1:", l.h1.slice(0, 80));
    console.log("counts mock/live formats", m.fmts, l.fmts, "cats", m.cats, l.cats, "steps", m.steps, l.steps, "faqs", m.faqs, l.faqs);
    console.log("overflowX mock/live", m.overflowX, l.overflowX, "scrollW", m.scrollW, l.scrollW);
    console.log("chip position sample live", JSON.stringify(l.chips));

    if (m.h1.replace(/\s/g, "") !== l.h1.replace(/\s/g, "")) {
      // mock may still have old "mẫu" wording — note only
      diffs.push(`${vp.name}: H1 text differs (mock vs live) — check copy`);
    }
    if (l.overflowX) diffs.push(`${vp.name}: live horizontal overflow`);
    if (l.fmts !== 6) diffs.push(`${vp.name}: expected 6 formats, got ${l.fmts}`);
    if (l.cats !== 8) diffs.push(`${vp.name}: expected 8 cats, got ${l.cats}`);
    if (l.steps !== 3) diffs.push(`${vp.name}: expected 3 steps, got ${l.steps}`);
    if (l.faqs < 10) diffs.push(`${vp.name}: expected ≥10 FAQ details, got ${l.faqs}`);
    for (const c of l.chips) {
      if (c.position === "absolute") diffs.push(`${vp.name}: chip still absolute: ${c.text}`);
    }

    await ctx.close();
  }

  await browser.close();
  console.log("\n=== DIFFS ===");
  if (!diffs.length) console.log("No structural diffs flagged.");
  else diffs.forEach((d) => console.log("-", d));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
