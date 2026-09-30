import { ImageResponse } from "next/og";
import { getTemplate } from "@/lib/templates";

export const alt = "Mẫu Vote Đi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = getTemplate(slug);
  const title = t?.seoTitle?.replace(/\s*\|\s*Vote Đi\s*$/i, "") ?? "Mẫu Vote Đi";
  const emoji = t?.emoji ?? "🗳️";

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
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, fontWeight: 700 }}>
          Vote Đi
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ fontSize: 96 }}>{emoji}</div>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 820 }}>
            <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.15 }}>{title}</div>
            <div style={{ marginTop: 12, fontSize: 22, opacity: 0.9 }}>Mẫu phòng vote miễn phí</div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
