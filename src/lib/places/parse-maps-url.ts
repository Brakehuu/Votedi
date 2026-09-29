/** Pure Google Maps URL parsing (no network). Used by /api/places/resolve after redirects. */

export type ParsedMapsPlace = {
  name: string | null;
  lat: number | null;
  lng: number | null;
  mapsUrl: string;
  /** Why we could not fully resolve (still may have a name). */
  hint?: string;
};

const PLACE_PATH = /\/maps\/place\/([^/]+)/i;
const AT_COORDS = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,|$)/;
const DATA_3D_4D = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/;
const Q_COORDS = /^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/;

function decodePlaceName(raw: string): string | null {
  try {
    const decoded = decodeURIComponent(raw.replace(/\+/g, " ")).trim();
    if (!decoded || /^[\d.,\s-]+$/.test(decoded)) return null;
    return decoded.slice(0, 80);
  } catch {
    return raw.replace(/\+/g, " ").trim().slice(0, 80) || null;
  }
}

function finiteCoord(value: string | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= 180 ? n : null;
}

export function isGoogleMapsHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "maps.google.com" ||
    host === "www.google.com" ||
    host === "google.com" ||
    host === "maps.app.goo.gl" ||
    host === "goo.gl" ||
    host.endsWith(".google.com")
  );
}

/** True if the URL looks like a Maps short link that still needs redirect follow. */
export function isMapsShortLink(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return host === "maps.app.goo.gl" || (host === "goo.gl" && url.pathname.toLowerCase().startsWith("/maps"));
}

export function parseMapsUrl(input: string): ParsedMapsPlace {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("INVALID_URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("INVALID_URL");
  }
  if (!isGoogleMapsHost(url.hostname)) {
    throw new Error("NOT_MAPS");
  }

  const mapsUrl = url.toString();
  let name: string | null = null;
  let lat: number | null = null;
  let lng: number | null = null;

  const placeMatch = url.pathname.match(PLACE_PATH);
  if (placeMatch?.[1]) {
    name = decodePlaceName(placeMatch[1]);
  }

  const dataCoords = url.href.match(DATA_3D_4D);
  if (dataCoords) {
    lat = finiteCoord(dataCoords[1]);
    lng = finiteCoord(dataCoords[2]);
  }

  if (lat == null || lng == null) {
    const at = url.href.match(AT_COORDS);
    if (at) {
      lat = finiteCoord(at[1]);
      lng = finiteCoord(at[2]);
    }
  }

  const q = url.searchParams.get("q") ?? url.searchParams.get("query");
  if (q) {
    const coords = q.trim().match(Q_COORDS);
    if (coords) {
      if (lat == null) lat = finiteCoord(coords[1]);
      if (lng == null) lng = finiteCoord(coords[2]);
    } else if (!name) {
      name = decodePlaceName(q);
    }
  }

  const cid = url.searchParams.get("cid");
  if (cid && lat == null && lng == null && !name) {
    return {
      name: null,
      lat: null,
      lng: null,
      mapsUrl,
      hint: "cid",
    };
  }

  if (isMapsShortLink(url) && lat == null && lng == null && !name) {
    return { name: null, lat: null, lng: null, mapsUrl, hint: "short_link" };
  }

  return { name, lat, lng, mapsUrl };
}
