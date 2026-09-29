/** Shared line classification for wizard + in-room "Thêm lựa chọn" + Thêm nhanh. */

import { isGoogleMapsHost, isMapsShortLink } from "@/lib/places/parse-maps-url";

export type LineKind = "place" | "link" | "text";

const URL_RE = /^https?:\/\/\S+/i;
/** Catch Maps short links even if pasted with junk, or without detecting host via URL ctor. */
const MAPS_HINT =
  /(?:maps\.app\.goo\.gl|goo\.gl\/maps|google\.com\/maps|maps\.google\.com)/i;

export function extractUrl(line: string): string | null {
  const trimmed = line.trim();
  const m = trimmed.match(URL_RE);
  if (!m) return null;
  // Strip trailing punctuation often pasted from chat
  return m[0].replace(/[),.;!?]+$/g, "");
}

export function isMapsUrlString(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    return isGoogleMapsHost(url.hostname) || isMapsShortLink(url) || MAPS_HINT.test(url.href);
  } catch {
    return MAPS_HINT.test(raw);
  }
}

/** Classify one pasted line. URLs are never "text". */
export function classifyOptionLine(line: string): { kind: LineKind; value: string } {
  const trimmed = line.trim();
  if (!trimmed) throw new Error("EMPTY");
  const url = extractUrl(trimmed);
  if (url) {
    if (isMapsUrlString(url) || MAPS_HINT.test(trimmed)) {
      return { kind: "place", value: url };
    }
    return { kind: "link", value: url };
  }
  // Whole line looks like a maps short path without scheme
  if (MAPS_HINT.test(trimmed) && !/\s/.test(trimmed)) {
    const withScheme = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    return { kind: "place", value: withScheme };
  }
  return { kind: "text", value: trimmed };
}
