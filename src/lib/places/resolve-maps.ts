import "server-only";
import { isMapsShortLink, parseMapsUrl, type ParsedMapsPlace } from "@/lib/places/parse-maps-url";

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 5_000;
const UA = "VoteDi-Places/1.0 (+https://votedi.vn)";

async function followMapsRedirects(start: string): Promise<string> {
  let current = start;
  for (let i = 0; i < MAX_REDIRECTS; i += 1) {
    const url = new URL(current);
    if (!isMapsShortLink(url) && !url.hostname.toLowerCase().includes("goo.gl")) {
      return current;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": UA, Accept: "text/html" },
      });
      const loc = res.headers.get("location");
      if (loc && (res.status === 301 || res.status === 302 || res.status === 303 || res.status === 307 || res.status === 308)) {
        current = new URL(loc, current).toString();
        continue;
      }
      return res.url || current;
    } finally {
      clearTimeout(timer);
    }
  }
  return current;
}

/** Resolve a pasted Maps URL (follows short links, then parses). */
export async function resolveMapsUrl(raw: string): Promise<ParsedMapsPlace> {
  let parsed = parseMapsUrl(raw);
  if (parsed.hint === "short_link" || isMapsShortLink(new URL(parsed.mapsUrl))) {
    const finalUrl = await followMapsRedirects(parsed.mapsUrl);
    parsed = parseMapsUrl(finalUrl);
  }
  return parsed;
}
