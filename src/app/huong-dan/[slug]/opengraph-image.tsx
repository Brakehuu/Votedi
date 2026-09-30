import { ImageResponse } from "next/og";
import { getContent } from "@/lib/content";

export const alt = "Hướng dẫn Vote Đi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getContent("huong-dan", slug, { includeDrafts: true, includeScheduled: true });
  const title = doc?.title ?? "Hướng dẫn Vote Đi";

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
          background: "linear-gradient(135deg, #19C9A7 0%, #0EA5A4 45%, #0891B2 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 700 }}>Vote Đi · Hướng dẫn</div>
        <div style={{ fontSize: 48, fontWeight: 800, maxWidth: 980, lineHeight: 1.15 }}>{title}</div>
      </div>
    ),
    { ...size },
  );
}
