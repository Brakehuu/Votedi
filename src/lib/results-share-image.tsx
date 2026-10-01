import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { createSecretClient } from "@/lib/supabase/secret";

export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 } as const;

type ShareImageData = {
  roomName: string;
  champTitle: string | null;
  champDataUri: string | null;
  hasPassword: boolean;
  closedAtMs: number | null;
};

let fontCache: { semi: Buffer; extra: Buffer } | null = null;

async function loadFonts() {
  if (fontCache) return fontCache;
  const dir = path.join(process.cwd(), "src", "assets", "fonts");
  const [semi, extra] = await Promise.all([
    readFile(path.join(dir, "BeVietnamPro-SemiBold.ttf")),
    readFile(path.join(dir, "BeVietnamPro-ExtraBold.ttf")),
  ]);
  fontCache = { semi, extra };
  return fontCache;
}

/** Convert remote image (often WebP) to JPEG data URI for Satori. */
export async function imageUrlToJpegDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const input = Buffer.from(await res.arrayBuffer());
    // Satori: no WebP. Long edge ≤700, q80 — shrink further if still huge.
    let jpeg = await sharp(input)
      .rotate()
      .resize({
        width: 700,
        height: 700,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
    if (jpeg.byteLength > 140_000) {
      jpeg = await sharp(input)
        .rotate()
        .resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 68, mozjpeg: true })
        .toBuffer();
    }
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

async function loadShareData(slug: string): Promise<ShareImageData> {
  const fallback: ShareImageData = {
    roomName: "Vote Đi",
    champTitle: null,
    champDataUri: null,
    hasPassword: false,
    closedAtMs: null,
  };
  try {
    const supabase = createSecretClient();
    if (!supabase) return fallback;

    const { data: previewRows } = await supabase.rpc("preview_room", { p_slug: slug });
    const preview = ((previewRows ?? []) as { id: string; name: string; has_password?: boolean }[])[0];
    if (!preview) return fallback;

    const hasPassword = Boolean(preview.has_password);
    const roomName = preview.name || fallback.roomName;

    const { data: room } = await supabase
      .from("rooms")
      .select("champion_item_id, result, closed_at, anonymous, has_password")
      .eq("id", preview.id)
      .maybeSingle();

    const closedAtMs = room?.closed_at ? Date.parse(String(room.closed_at)) || null : null;
    const locked = hasPassword || Boolean(room?.has_password);

    if (locked) {
      return { roomName, champTitle: null, champDataUri: null, hasPassword: true, closedAtMs };
    }

    const winnerId =
      room?.champion_item_id ??
      (room?.result as { winner_item_id?: string } | null)?.winner_item_id ??
      null;

    if (!winnerId) {
      return { roomName, champTitle: null, champDataUri: null, hasPassword: false, closedAtMs };
    }

    let champTitle: string | null = null;
    let champDataUri: string | null = null;
    try {
      const { data: item } = await supabase
        .from("items")
        .select("title, image_url, emoji")
        .eq("id", winnerId)
        .maybeSingle();
      if (item) {
        champTitle = item.title || item.emoji || "Mẫu vô địch";
        if (item.image_url) {
          champDataUri = await imageUrlToJpegDataUri(item.image_url);
        }
      }
    } catch {
      /* keep text-only card */
    }

    return {
      roomName,
      champTitle,
      champDataUri,
      hasPassword: false,
      closedAtMs,
    };
  } catch {
    return fallback;
  }
}

function ShareCard({
  roomName,
  champTitle,
  champDataUri,
  hasPassword,
}: {
  roomName: string;
  champTitle: string | null;
  champDataUri: string | null;
  hasPassword: boolean;
}) {
  const title = roomName.length > 48 ? `${roomName.slice(0, 45)}…` : roomName;
  const pill = hasPassword
    ? "Phòng có mật khẩu"
    : champTitle
      ? `${champTitle} vô địch`
      : "Cả nhóm đang vote";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: "#F3F8F8",
        fontFamily: '"Be Vietnam Pro", sans-serif',
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 720,
          height: 720,
          left: -140,
          top: -220,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(25,201,167,0.45), transparent 65%)",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 720,
          height: 720,
          right: -180,
          bottom: -280,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(56,189,248,0.4), transparent 65%)",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: "100%",
          padding: "60px 72px",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 48,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "linear-gradient(135deg, #19C9A7, #0891B2)",
                display: "flex",
              }}
            />
            <div style={{ display: "flex", fontSize: 28, fontWeight: 800, color: "#0C1B20" }}>
              <span style={{ display: "flex" }}>Vote&nbsp;</span>
              <span style={{ display: "flex", color: "#0EA5A4" }}>Đi</span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 54,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.12,
              color: "#0C1B20",
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", marginTop: 16, fontSize: 22, fontWeight: 600, color: "#6B858A" }}>
            {hasPassword ? "Mở link và nhập mật khẩu để xem" : "Cả nhóm đã chốt"}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              alignSelf: "flex-start",
              padding: "10px 22px",
              borderRadius: 999,
              background: "linear-gradient(135deg, #19C9A7, #0891B2)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 24,
            }}
          >
            {pill}
          </div>
        </div>

        {!hasPassword && champDataUri ? (
          <div
            style={{
              display: "flex",
              width: 380,
              height: 380,
              borderRadius: 28,
              overflow: "hidden",
              background: "#fff",
              boxShadow: "0 20px 40px -18px rgba(8,80,90,0.55), 0 0 0 4px #fff",
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={champDataUri}
              alt=""
              width={380}
              height={380}
              style={{ width: 380, height: 380, objectFit: "cover" }}
            />
          </div>
        ) : !hasPassword ? (
          <div
            style={{
              display: "flex",
              width: 380,
              height: 380,
              borderRadius: 28,
              background: "linear-gradient(135deg, #19C9A7, #0891B2)",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 120,
              flexShrink: 0,
              boxShadow: "0 20px 40px -18px rgba(8,80,90,0.55), 0 0 0 4px #fff",
            }}
          >
            🏆
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              width: 380,
              height: 380,
              borderRadius: 28,
              background: "#E8F0F0",
              alignItems: "center",
              justifyContent: "center",
              color: "#0C1B20",
              fontSize: 100,
              flexShrink: 0,
              boxShadow: "0 20px 40px -18px rgba(8,80,90,0.35), 0 0 0 4px #fff",
            }}
          >
            🔒
          </div>
        )}
      </div>
    </div>
  );
}

export async function buildResultsShareImageResponse(
  slug: string,
  options?: { download?: boolean },
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "image/png",
    "Cache-Control": "public, max-age=300, s-maxage=3600",
  };
  if (options?.download) {
    headers["Content-Disposition"] = 'attachment; filename="vote-di-ket-qua.png"';
  }

  const render = async (data: ShareImageData) => {
    const fonts = await loadFonts();
    const image = new ImageResponse(
      (
        <ShareCard
          roomName={data.roomName}
          champTitle={data.champTitle}
          champDataUri={data.champDataUri}
          hasPassword={data.hasPassword}
        />
      ),
      {
        ...SHARE_IMAGE_SIZE,
        fonts: [
          { name: "Be Vietnam Pro", data: fonts.semi, weight: 600, style: "normal" },
          { name: "Be Vietnam Pro", data: fonts.extra, weight: 800, style: "normal" },
        ],
      },
    );
    const raw = Buffer.from(await image.arrayBuffer());
    let png = await sharp(raw).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
    if (png.byteLength > 300_000) {
      png = await sharp(raw)
        .resize(1200, 630)
        .png({ compressionLevel: 9, palette: true, quality: 80, effort: 10 })
        .toBuffer();
    }
    if (png.byteLength > 300_000) {
      // Last resort: drop photo and re-render lean card (keep image/png)
      if (data.champDataUri) {
        return render({ ...data, champDataUri: null });
      }
      png = await sharp(raw)
        .png({ compressionLevel: 9, palette: true, quality: 70, effort: 10, colors: 128 })
        .toBuffer();
    }
    return new Response(png, { status: 200, headers });
  };

  try {
    const data = await loadShareData(slug);
    try {
      return await render(data);
    } catch {
      // Retry without embedded photo if Satori still chokes
      return await render({ ...data, champDataUri: null });
    }
  } catch {
    try {
      return await render({
        roomName: "Vote Đi",
        champTitle: null,
        champDataUri: null,
        hasPassword: false,
        closedAtMs: null,
      });
    } catch {
      // Absolute last resort: 1×1 PNG is wrong size — build tiny valid PNG via sharp
      const png = await sharp({
        create: {
          width: 1200,
          height: 630,
          channels: 3,
          background: { r: 14, g: 165, b: 164 },
        },
      })
        .png()
        .toBuffer();
      return new Response(png, { status: 200, headers });
    }
  }
}

/** Cache-bust query from closed_at / now. */
export async function resultsShareImageVersion(slug: string): Promise<string> {
  try {
    const data = await loadShareData(slug);
    if (data.closedAtMs) return String(data.closedAtMs);
  } catch {
    /* ignore */
  }
  return "0";
}
