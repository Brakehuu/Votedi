import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const alt = "Kết quả Vote Đi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let roomName = "Vote Đi";
  let champTitle = "Mẫu vô địch";
  let champUrl: string | null = null;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.rpc("preview_room", { p_slug: slug });
      const preview = ((data ?? []) as { id: string; name: string }[])[0];
      if (preview) {
        roomName = preview.name;
        const { data: room } = await supabase
          .from("rooms")
          .select("champion_item_id")
          .eq("id", preview.id)
          .maybeSingle();
        if (room?.champion_item_id) {
          const { data: item } = await supabase
            .from("items")
            .select("title, image_url")
            .eq("id", room.champion_item_id)
            .maybeSingle();
          if (item) {
            champTitle = item.title || champTitle;
            champUrl = item.image_url;
          }
        }
      }
    } catch {
      /* fallback graphic */
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: 56,
          background: "linear-gradient(135deg, #19C9A7 0%, #0EA5A4 45%, #0891B2 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flex: 1,
            borderRadius: 32,
            background: "rgba(255,255,255,0.14)",
            border: "1px solid rgba(255,255,255,0.35)",
            padding: 40,
            gap: 36,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 280,
              height: 280,
              borderRadius: 28,
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              fontSize: 96,
            }}
          >
            {champUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={champUrl} alt="" width={280} height={280} style={{ objectFit: "cover" }} />
            ) : (
              "🏆"
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ fontSize: 28, opacity: 0.9 }}>Vote Đi</div>
            <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.1, marginTop: 12 }}>{roomName}</div>
            <div style={{ fontSize: 36, fontWeight: 700, marginTop: 24 }}>Vô địch: {champTitle}</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
