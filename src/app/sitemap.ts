import type { MetadataRoute } from "next";
import { allTopicCounts, listContent, paginate } from "@/lib/content";
import { FORMAT_LIST } from "@/lib/formats";
import { absoluteUrl } from "@/lib/site";
import { TEMPLATES } from "@/lib/templates";
import { statSync } from "node:fs";

function fileDate(filePath: string | undefined) {
  if (!filePath) return new Date();
  try {
    return statSync(filePath).mtime;
  } catch {
    return new Date();
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticPaths = [
    "/",
    "/tao-phong",
    "/mau",
    "/kieu-vote",
    "/huong-dan",
    "/blog",
    "/gioi-thieu",
    "/lien-he",
    "/dieu-khoan",
    "/quyen-rieng-tu",
  ];

  const entries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
  }));

  for (const t of TEMPLATES) {
    entries.push({
      url: absoluteUrl(`/mau/${t.slug}`),
      lastModified: now,
    });
  }

  for (const f of FORMAT_LIST.filter((x) => x.available)) {
    entries.push({
      url: absoluteUrl(`/kieu-vote/${f.slug}`),
      lastModified: now,
    });
  }

  for (const doc of listContent("huong-dan")) {
    entries.push({
      url: absoluteUrl(`/huong-dan/${doc.slug}`),
      lastModified: fileDate(doc.filePath),
    });
  }

  const blog = listContent("blog");
  for (const doc of blog) {
    entries.push({
      url: absoluteUrl(`/blog/${doc.slug}`),
      lastModified: fileDate(doc.filePath),
    });
  }

  for (const topic of allTopicCounts("blog")) {
    entries.push({
      url: absoluteUrl(`/blog/chu-de/${topic.slug}`),
      lastModified: now,
    });
  }

  const { totalPages } = paginate(blog, 1, 12);
  for (let n = 2; n <= totalPages; n += 1) {
    entries.push({
      url: absoluteUrl(`/blog/trang/${n}`),
      lastModified: now,
    });
  }

  return entries;
}
