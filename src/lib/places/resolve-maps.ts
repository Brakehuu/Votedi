import { isMapsShortLink, parseMapsUrl, type ParsedMapsPlace } from "@/lib/places/parse-maps-url";

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 8_000;
/** Real Chrome desktop UA — Google short links often refuse bot UAs. */
const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function log(...args: unknown[]) {
  console.error("[places/resolve]", ...args);
}

function unwrapConsentLocation(loc: string, base: string): string {
  try {
    const absolute = new URL(loc, base);
    if (absolute.hostname.toLowerCase().includes("consent.google.")) {
      const cont = absolute.searchParams.get("continue");
      if (cont) {
        log("consent → continue", cont.slice(0, 180));
        return cont;
      }
    }
    return absolute.toString();
  } catch {
    return loc;
  }
}

function extractMapsUrlFromHtml(html: string, base: string): string | null {
  const patterns = [
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i,
    /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:url["']/i,
    /https?:\/\/(?:www\.)?google\.[^"'<\s]+\/maps\/place\/[^"'<\s]+/i,
    /https?:\/\/maps\.google\.[^"'<\s]+/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (!m?.[1] && !m?.[0]) continue;
    const raw = (m[1] ?? m[0])!.replace(/&amp;/g, "&");
    try {
      const url = new URL(raw, base);
      if (/\/maps\//i.test(url.pathname) || url.hostname.includes("maps")) {
        return url.toString();
      }
    } catch {
      /* next */
    }
  }
  return null;
}

function needsFollow(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (isMapsShortLink(url)) return true;
  if (host.includes("goo.gl")) return true;
  if (host.includes("consent.google.")) return true;
  // Still on short-ish share pages
  if (host === "maps.app.goo.gl") return true;
  return false;
}

async function fetchManual(url: string): Promise<{ status: number; location: string | null; html: string | null; finalUrl: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent": CHROME_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });
    const location = res.headers.get("location");
    let html: string | null = null;
    // Only read body when we might need canonical / og:url
    if (!location && res.status >= 200 && res.status < 300) {
      const text = await res.text();
      html = text.slice(0, 500_000);
    } else if (location) {
      // drain lightly — some runtimes require body consume
      try {
        await res.arrayBuffer();
      } catch {
        /* ignore */
      }
    }
    return { status: res.status, location, html, finalUrl: res.url || url };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Follow Maps short links manually (≤5 hops).
 * Handles consent.google.com?continue=… and 200 HTML with canonical/og:url.
 */
export async function followMapsRedirects(start: string): Promise<string> {
  let current = start;
  for (let i = 0; i < MAX_REDIRECTS; i += 1) {
    let url: URL;
    try {
      url = new URL(current);
    } catch {
      log("bad url at hop", i, current);
      return current;
    }

    // Already a full maps place URL — stop
    if (!needsFollow(url) && /\/maps\/place\//i.test(url.pathname)) {
      return current;
    }
    if (!needsFollow(url) && url.hostname.includes("google.") && /\/maps\//i.test(url.pathname)) {
      return current;
    }

    log("hop", i, current.slice(0, 200));
    try {
      const res = await fetchManual(current);
      log("hop result", i, res.status, res.location?.slice(0, 160) ?? "(no location)");

      if (res.location && [301, 302, 303, 307, 308].includes(res.status)) {
        current = unwrapConsentLocation(res.location, current);
        continue;
      }

      if (res.html) {
        const fromHtml = extractMapsUrlFromHtml(res.html, current);
        if (fromHtml) {
          log("extracted from html", fromHtml.slice(0, 200));
          // If still short / consent, continue loop with extracted
          try {
            const extracted = new URL(fromHtml);
            if (needsFollow(extracted) || extracted.hostname.includes("consent.google.")) {
              current = unwrapConsentLocation(fromHtml, current);
              continue;
            }
          } catch {
            /* use as-is */
          }
          return fromHtml;
        }
      }

      // No more redirects
      return res.finalUrl || current;
    } catch (error) {
      log("hop error", i, error instanceof Error ? error.message : error);
      return current;
    }
  }
  log("max redirects reached", current.slice(0, 200));
  return current;
}

/** Resolve a pasted Maps URL (follows short links, then parses). Never throws for soft failures after valid Maps URL. */
export async function resolveMapsUrl(raw: string): Promise<ParsedMapsPlace> {
  let parsed: ParsedMapsPlace;
  try {
    parsed = parseMapsUrl(raw);
  } catch (error) {
    log("parse failed", raw.slice(0, 120), error);
    throw error;
  }

  const shouldFollow =
    parsed.hint === "short_link" ||
    isMapsShortLink(new URL(parsed.mapsUrl)) ||
    parsed.lat == null ||
    parsed.name == null;

  if (shouldFollow && (parsed.hint === "short_link" || isMapsShortLink(new URL(parsed.mapsUrl)) || parsed.lat == null)) {
    const finalUrl = await followMapsRedirects(parsed.mapsUrl);
    try {
      const next = parseMapsUrl(finalUrl);
      // Prefer richer parse; keep original short as mapsUrl fallback only if parse lost it
      parsed = {
        ...next,
        mapsUrl: next.mapsUrl || parsed.mapsUrl,
      };
    } catch (error) {
      log("parse after redirect failed", finalUrl.slice(0, 200), error);
      // Keep original short link as maps_url so "Mở Google Maps" still works
      parsed = {
        name: parsed.name,
        lat: parsed.lat,
        lng: parsed.lng,
        mapsUrl: raw.trim(),
        hint: "resolve_partial",
      };
    }
  }

  // Soft incomplete
  if (parsed.lat == null || parsed.lng == null || !parsed.name) {
    parsed = {
      ...parsed,
      mapsUrl: parsed.mapsUrl || raw.trim(),
      hint: parsed.hint ?? (parsed.lat == null ? "no_coords" : "no_name"),
    };
  }

  return parsed;
}
