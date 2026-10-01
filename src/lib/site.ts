export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const siteName = "Vote Đi";

/** Title trang chủ (metadata default). */
export const siteTitle = "Vote Đi – Tạo bình chọn online miễn phí cho nhóm";

export const siteDescription =
  "Tạo bình chọn online miễn phí, gửi link Zalo là cả nhóm vote được. Chọn đi đâu, ăn gì, ngày nào rảnh, mẫu áo nào. Đấu loại như World Cup, không cần tài khoản.";

export const absoluteUrl = (path = "/") => {
  const base = siteUrl.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p === "/" ? "/" : p}`;
};
