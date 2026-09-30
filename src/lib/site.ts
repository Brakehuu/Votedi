export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const siteName = "Vote Đi";

/** Title trang chủ (metadata default). */
export const siteTitle = "Vote Đi – Tạo bình chọn online miễn phí cho nhóm";

export const siteDescription =
  "Tạo bình chọn online miễn phí cho nhóm: mẫu áo, quán ăn, lịch rảnh, quẹt chọn. Không cần tài khoản, gửi link Zalo là vote được.";

export const absoluteUrl = (path = "/") => {
  const base = siteUrl.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p === "/" ? "/" : p}`;
};
