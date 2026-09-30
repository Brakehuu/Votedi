import { ImageResponse } from "next/og";
import { findFormat } from "@/lib/formats";

export const alt = "Kiểu vote Vote Đi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = findFormat(slug);
  const title = f ? `${f.name} online` : "Kiểu vote";

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
          background: "linear-gradient(135deg, #0EA5A4 0%, #0891B2 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 700 }}>Vote Đi</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 52, fontWeight: 800, maxWidth: 900 }}>{title}</div>
          <div style={{ fontSize: 24, opacity: 0.9 }}>{f?.description ?? "Bình chọn cho nhóm"}</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
