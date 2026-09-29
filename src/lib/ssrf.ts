import "server-only";
import dns from "node:dns/promises";
import net from "node:net";

const TIMEOUT_MS = 5_000;
const MAX_BYTES = 1_048_576;
const MAX_REDIRECTS = 3;
export const UNFURL_UA = "VoteDi-Unfurl/1.0 (+https://votedi.vn)";

export type SafeFetchResult = {
  url: string;
  contentType: string | null;
  body: Buffer;
};

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    if (lower.startsWith("fe80")) return true;
    if (lower.startsWith("::ffff:")) {
      const v4 = lower.slice("::ffff:".length);
      if (net.isIPv4(v4)) return isPrivateIp(v4);
    }
    return false;
  }
  return true;
}

async function lookupAll(hostname: string): Promise<string[]> {
  const out: string[] = [];
  try {
    out.push(...(await dns.resolve4(hostname)));
  } catch {
    /* none */
  }
  try {
    out.push(...(await dns.resolve6(hostname)));
  } catch {
    /* none */
  }
  if (out.length === 0) throw new Error("DNS_FAILED");
  return out;
}

async function assertSafeUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("INVALID_URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("INVALID_URL");
  }
  if (url.username || url.password) {
    throw new Error("INVALID_URL");
  }
  const host = url.hostname;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new Error("PRIVATE_IP");
  }
  if (net.isIP(host) && isPrivateIp(host)) {
    throw new Error("PRIVATE_IP");
  }
  if (!net.isIP(host)) {
    const ips = await lookupAll(host);
    if (ips.some(isPrivateIp)) throw new Error("PRIVATE_IP");
  }
  return url;
}

/**
 * SSRF-safe fetch: http(s) only, DNS + private IP block, ≤3 redirects,
 * 5s timeout, ≤1MB body, custom User-Agent. Re-checks host on every redirect.
 */
export async function safeFetch(rawUrl: string, init?: { accept?: string }): Promise<SafeFetchResult> {
  let current = (await assertSafeUrl(rawUrl)).toString();

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertSafeUrl(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": UNFURL_UA,
          Accept: init?.accept ?? "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        },
      });

      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const loc = res.headers.get("location");
        if (!loc || hop === MAX_REDIRECTS) throw new Error("TOO_MANY_REDIRECTS");
        current = new URL(loc, current).toString();
        continue;
      }

      if (!res.ok) throw new Error("FETCH_FAILED");

      const len = Number(res.headers.get("content-length") ?? "0");
      if (len > MAX_BYTES) throw new Error("TOO_LARGE");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("FETCH_FAILED");
      const chunks: Uint8Array[] = [];
      let total = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_BYTES) {
          await reader.cancel();
          throw new Error("TOO_LARGE");
        }
        chunks.push(value);
      }
      return {
        url: current,
        contentType: res.headers.get("content-type"),
        body: Buffer.concat(chunks),
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new Error("TIMEOUT");
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("TOO_MANY_REDIRECTS");
}
