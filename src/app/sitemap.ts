import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ["", "/tao-phong", "/phong-cua-toi", "/dieu-khoan", "/quyen-rieng-tu"].map((path) => ({
    url: `${siteUrl}${path || "/"}`,
    lastModified,
  }));
}
