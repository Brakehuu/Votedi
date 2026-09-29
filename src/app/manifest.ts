import type { MetadataRoute } from "next";
import { siteDescription } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vote Đi",
    short_name: "Vote Đi",
    description: siteDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#F3F8F8",
    theme_color: "#0EA5A4",
    lang: "vi",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
