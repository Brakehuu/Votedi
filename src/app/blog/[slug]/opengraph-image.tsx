import { ImageResponse } from "next/og";
import { getContent } from "@/lib/content";

export const alt = "Blog Vote Đi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getContent("blog", slug, { includeDrafts: true });
  const title = doc?.title ?? "Blog Vote Đi";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 56,
          background: "linear-gradient(135deg, #0891B2 0%, #0F766E 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 700 }}>Vote Đi · Blog</div>
        <div style={{ fontSize: 48, fontWeight: 800, maxWidth: 980, lineHeight: 1.15 }}>{title}</div>
      </div>
    ),
    { ...size },
  );
}
