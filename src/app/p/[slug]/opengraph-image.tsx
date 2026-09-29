import { ImageResponse } from "next/og";
import { createSecretClient } from "@/lib/supabase/secret";
import { getFormat } from "@/lib/formats";

export const alt = "Vote Đi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

type OgPreview = {
  name: string;
  format: string;
  has_password: boolean;
  item_count: number;
  member_count: number;
  closed: boolean;
  items: { title: string; emoji: string | null; image_url: string | null; item_type: string }[];
};

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let preview: OgPreview | null = null;
  const secret = createSecretClient();
  if (secret) {
    try {
      const { data } = await secret.rpc("og_room_preview", { p_slug: slug });
      preview = data as OgPreview | null;
    } catch {
      preview = null;
    }
  }

  const name = preview?.name || "Vote Đi";
  const formatName = preview ? getFormat(preview.format).name : "Bình chọn";
  const locked = Boolean(preview?.has_password);
  const closed = Boolean(preview?.closed);
  const tiles = locked ? [] : (preview?.items ?? []).slice(0, 4);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: 48,
          background: "linear-gradient(135deg, #19C9A7 0%, #0EA5A4 45%, #0891B2 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, fontWeight: 800, opacity: 0.95 }}>Vote Đi</div>
        <div
          style={{
            marginTop: 20,
            display: "flex",
            flexDirection: "column",
            flex: 1,
            borderRadius: 28,
            background: "rgba(255,255,255,0.14)",
            border: "1px solid rgba(255,255,255,0.3)",
            padding: 36,
          }}
        >
          <div style={{ display: "flex", fontSize: 22, fontWeight: 700, opacity: 0.9 }}>
            {closed ? "Nhóm đã chốt!" : formatName}
            {locked ? " · Có mật khẩu" : ""}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 52,
              fontWeight: 800,
              lineHeight: 1.15,
              marginTop: 12,
              maxHeight: 140,
              overflow: "hidden",
            }}
          >
            {name.length > 60 ? `${name.slice(0, 57)}…` : name}
          </div>
          {locked ? (
            <div style={{ display: "flex", marginTop: 28, fontSize: 72 }}>🔒</div>
          ) : tiles.length > 0 ? (
            <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
              {tiles.map((item, i) => (
                <div
                  key={i}
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 20,
                    background: "rgba(255,255,255,0.22)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 42,
                    overflow: "hidden",
                  }}
                >
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt=""
                      width={120}
                      height={120}
                      style={{ objectFit: "cover", width: 120, height: 120 }}
                    />
                  ) : (
                    item.emoji || (item.title || "?").charAt(0)
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", marginTop: 24, fontSize: 22, opacity: 0.9 }}>
              {preview ? `${preview.item_count} lựa chọn · ${preview.member_count} người` : "Vào vote ngay"}
            </div>
          )}
          <div style={{ display: "flex", marginTop: "auto", fontSize: 22, fontWeight: 700 }}>
            Vào vote ngay · votedi.vn
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
