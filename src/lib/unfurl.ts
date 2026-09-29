import "server-only";
import { safeFetch } from "@/lib/ssrf";

export type UnfurlResult = {
  url: string;
  title: string | null;
  siteName: string | null;
  description: string | null;
  imageUrl: string | null;
  /** Fetched og:image bytes (SSRF-checked), for client upload to Storage. */
  image?: { contentType: string; base64: string };
};

function metaContent(html: string, property: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
    "i",
  );
  const m = html.match(re);
  const value = (m?.[1] ?? m?.[2] ?? "").trim();
  return value || null;
}

function titleTag(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const value = (m?.[1] ?? "").trim();
  return value || null;
}

function absolutize(base: string, href: string | null): string | null {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

export async function unfurlUrl(raw: string): Promise<UnfurlResult> {
  const page = await safeFetch(raw);
  const html = page.body.toString("utf8");
  const title =
    metaContent(html, "og:title") ??
    metaContent(html, "twitter:title") ??
    titleTag(html);
  const siteName = metaContent(html, "og:site_name");
  const description =
    metaContent(html, "og:description") ?? metaContent(html, "description");
  const imageUrl = absolutize(
    page.url,
    metaContent(html, "og:image") ?? metaContent(html, "twitter:image"),
  );

  let image: UnfurlResult["image"];
  if (imageUrl) {
    try {
      const img = await safeFetch(imageUrl, { accept: "image/*,*/*;q=0.8" });
      const ct = (img.contentType ?? "image/jpeg").split(";")[0]!.trim();
      if (ct.startsWith("image/") && img.body.length > 0 && img.body.length <= 1_048_576) {
        image = { contentType: ct, base64: img.body.toString("base64") };
      }
    } catch {
      /* keep card without image */
    }
  }

  let hostLabel: string | null = null;
  try {
    hostLabel = new URL(page.url).hostname.replace(/^www\./, "");
  } catch {
    hostLabel = null;
  }

  return {
    url: page.url,
    title: title?.slice(0, 80) ?? null,
    siteName: (siteName ?? hostLabel)?.slice(0, 80) ?? null,
    description: description?.slice(0, 200) ?? null,
    imageUrl,
    image,
  };
}
