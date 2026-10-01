/**
 * Compare homepage FAQ→footer vs mockup (1366 & 390).
 * Usage: PLAYWRIGHT_BASE_URL=http://localhost:3000 npx tsx scripts/home-bottom-compare.ts
 */
import { chromium, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

const OUT = path.join(process.cwd(), ".tmp-home-bottom");
const MOCKUP = path.join(process.cwd(), "docs/votedi-home-v5.html");
const LIVE = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

const VIEWPORTS = [
  { name: "1366x768", width: 1366, height: 768 },
  { name: "390x844", width: 390, height: 844 },
] as const;

async function bottomMetrics(page: Page) {
  return page.evaluate(`(() => {
    const pick = (sel) => document.querySelector(sel);
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        mt: s.marginTop,
        pt: s.paddingTop,
        pb: s.paddingBottom,
        pl: s.paddingLeft,
        pr: s.paddingRight,
        radius: s.borderRadius,
        fs: s.fontSize,
        color: s.color,
        bg: s.backgroundImage !== "none" ? "grad/img" : s.backgroundColor,
        display: s.display,
        gap: s.gap,
        cols: s.gridTemplateColumns,
      };
    };

    const faq = pick("#hoi-dap");
    const video = pick("#video");
    const fin = pick(".fin");
    const footer = pick("footer");
    const player = pick(".player");
    const play = pick(".play");
    const chap = pick(".chap");
    const faqGrid = pick(".faq-grid");
    const help = pick(".help");
    const order = [...document.querySelectorAll("#hoi-dap, #video, .fin, footer")].map(
      (el) => el.id || el.className.split(/\\s+/)[0] || el.tagName,
    );

    return {
      order,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      faq: box(faq),
      faqGrid: box(faqGrid),
      help: box(help),
      video: box(video),
      player: box(player),
      play: box(play),
      chap: box(chap),
      fin: box(fin),
      footer: box(footer),
      footerCols: cs(footer)?.gridTemplateColumns ?? null,
      faqDetails: document.querySelectorAll("#hoi-dap details").length,
      chapBtns: document.querySelectorAll(".chap button").length,
      poster: !!pick(".poster"),
      videoEl: !!pick("video"),
      secPadTop: cs(faq)?.paddingTop ?? null,
    };
  })()`);
}

async function shotBottom(page: Page, file: string) {
  const faq = page.locator("#hoi-dap");
  await faq.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: file, fullPage: true });
}

function diff(a: unknown, b: unknown, pathKey: string, out: string[]) {
  if (a === b) return;
  if (typeof a === "object" && a && typeof b === "object" && b) {
    const ak = Object.keys(a as object);
    const bk = Object.keys(b as object);
    for (const k of new Set([...ak, ...bk])) {
      diff((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${pathKey}.${k}`, out);
    }
    return;
  }
  out.push(`${pathKey}: mock=${JSON.stringify(a)} live=${JSON.stringify(b)}`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const allDiffs: string[] = [];

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const mock = await ctx.newPage();
    const live = await ctx.newPage();
    await mock.goto(`file://${MOCKUP.replace(/\\/g, "/")}`, { waitUntil: "domcontentloaded" });
    await live.goto(`${LIVE}/`, { waitUntil: "networkidle" });
    await mock.waitForTimeout(400);
    await live.waitForTimeout(400);

    await shotBottom(mock, path.join(OUT, `mock-${vp.name}-full.png`));
    await shotBottom(live, path.join(OUT, `live-${vp.name}-full.png`));

    // Crop-ish: viewport shots at FAQ
    await mock.locator("#hoi-dap").scrollIntoViewIfNeeded();
    await live.locator("#hoi-dap").scrollIntoViewIfNeeded();
    await mock.screenshot({ path: path.join(OUT, `mock-${vp.name}-faq.png`) });
    await live.screenshot({ path: path.join(OUT, `live-${vp.name}-faq.png`) });

    await mock.locator("#video").scrollIntoViewIfNeeded();
    await live.locator("#video").scrollIntoViewIfNeeded();
    await mock.screenshot({ path: path.join(OUT, `mock-${vp.name}-video.png`) });
    await live.screenshot({ path: path.join(OUT, `live-${vp.name}-video.png`) });

    await mock.locator(".fin").scrollIntoViewIfNeeded();
    await live.locator(".fin").scrollIntoViewIfNeeded();
    await mock.screenshot({ path: path.join(OUT, `mock-${vp.name}-cta.png`) });
    await live.screenshot({ path: path.join(OUT, `live-${vp.name}-cta.png`) });

    const m = await bottomMetrics(mock);
    const l = await bottomMetrics(live);
    writeFileSync(path.join(OUT, `metrics-${vp.name}.json`), JSON.stringify({ mock: m, live: l }, null, 2));

    const local: string[] = [];
    if (m.order.join(">") !== l.order.join(">")) {
      local.push(`order mock=${m.order.join(">")} live=${l.order.join(">")}`);
    }
    if (l.overflowX) local.push(`horizontal overflow scrollW=${l.scrollW} clientW=${l.clientW}`);
    if (l.faqDetails < 10) local.push(`FAQ details=${l.faqDetails}`);
    if (l.chapBtns !== 4) local.push(`chapters=${l.chapBtns}`);
    if (!l.poster) local.push("missing poster before play");
    if (l.videoEl) local.push("video element loaded before play (should be absent)");
    diff(m.player?.radius, l.player?.radius, "player.radius", local);
    diff(m.player?.w, l.player?.w, "player.w", local);
    diff(m.fin?.radius, l.fin?.radius, "fin.radius", local);
    diff(m.fin?.mt, l.fin?.mt, "fin.mt", local);
    diff(m.faqGrid?.cols, l.faqGrid?.cols, "faqGrid.cols", local);
    diff(m.footerCols, l.footerCols, "footer.cols", local);
    diff(m.help?.radius, l.help?.radius, "help.radius", local);
    diff(m.play?.w, l.play?.w, "play.w", local);

    console.log(`\n=== ${vp.name} ===`);
    console.log("order mock/live", m.order.join(">"), l.order.join(">"));
    console.log("footer cols", m.footerCols, "|", l.footerCols);
    console.log("player", m.player, l.player);
    console.log("fin", m.fin, l.fin);
    console.log("diffs:", local.length ? local.join("\n  ") : "none significant");
    allDiffs.push(...local.map((d) => `${vp.name}: ${d}`));

    await ctx.close();
  }

  writeFileSync(path.join(OUT, "diffs.txt"), allDiffs.join("\n") || "none");
  console.log("\nALL DIFFS:\n" + (allDiffs.join("\n") || "none"));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
