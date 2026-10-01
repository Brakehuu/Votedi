import { ImageResponse } from "next/og";

export const alt = "Vote Đi – Tạo bình chọn online miễn phí cho nhóm";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg, #19C9A7 0%, #0EA5A4 45%, #0891B2 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 88,
            height: 88,
            borderRadius: 24,
            background: "rgba(255,255,255,.18)",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 42,
            fontWeight: 800,
          }}
        >
          V
        </div>
        <div style={{ display: "flex", marginTop: 36, fontSize: 58, fontWeight: 800, lineHeight: 1.08, letterSpacing: -2 }}>
          Cả nhóm rủ nhau chọn nhưng mãi không chốt được?
        </div>
        <div style={{ display: "flex", marginTop: 16, fontSize: 48, fontWeight: 800, letterSpacing: -2 }}>
          Vote Đi để chốt ngay!
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 26, opacity: 0.92 }}>
          Tạo bình chọn online miễn phí · gửi link Zalo là vote được
        </div>
      </div>
    ),
    size,
  );
}
