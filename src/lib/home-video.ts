import { absoluteUrl } from "@/lib/site";

export type HomeVideoChapter = {
  start: number;
  title: string;
  summary: string;
};

export type HomeVideoConfig = {
  enabled: boolean;
  provider: "youtube" | "mp4";
  youtubeId?: string;
  src?: string;
  poster: string;
  title: string;
  description: string;
  uploadDate: string;
  durationSeconds: 45;
  captionsUrl?: string;
  chapters: HomeVideoChapter[];
  transcript: string;
};

/** Cấu hình khối video trang chủ. Mặc định tắt — bật khi có video thật. */
export const HOME_VIDEO: HomeVideoConfig = {
  enabled: false,
  provider: "youtube",
  youtubeId: "dQw4w9WgXcQ",
  poster: "/opengraph-image",
  title: "Xem Vote Đi hoạt động trong 45 giây",
  description: "Vote Đi là gì, tạo phòng và mời bạn thế nào, các kiểu vote, chốt và chia sẻ kết quả.",
  uploadDate: "2026-09-30",
  durationSeconds: 45,
  chapters: [
    {
      start: 0,
      title: "Vote Đi là gì",
      summary: "Trang web tạo bình chọn cho nhóm, không cần tài khoản.",
    },
    {
      start: 10,
      title: "Tạo phòng và mời bạn",
      summary: "Chọn mẫu, thêm lựa chọn, gửi link Zalo.",
    },
    {
      start: 22,
      title: "Các kiểu vote",
      summary: "6 kiểu cho đủ tình huống: ngày, địa điểm, mẫu áo, đặt tên.",
    },
    {
      start: 35,
      title: "Chốt và chia sẻ",
      summary: "Hết giờ tự có kết quả, thêm vào lịch, gửi lại nhóm.",
    },
  ],
  transcript:
    "0:00 Vote Đi là gì. Cả nhóm hẹn mãi không chốt được? Vote Đi là trang web tạo bình chọn online miễn phí, không cần tài khoản. 0:10 Tạo phòng và mời bạn. Chọn mẫu có sẵn, thêm lựa chọn, gửi link vào nhóm Zalo. 0:22 Các kiểu vote. Bình chọn nhanh, đấu loại World Cup, chọn lịch rảnh, quẹt chọn, xếp hạng, chấm điểm. 0:35 Chốt và chia sẻ. Hết giờ là có kết quả, thêm vào lịch và gửi lại cho nhóm.",
};

/** Preview mẫu khi enabled=false và ?preview-video=1 */
export const HOME_VIDEO_PREVIEW: HomeVideoConfig = {
  ...HOME_VIDEO,
  enabled: true,
  provider: "youtube",
  youtubeId: "dQw4w9WgXcQ",
};

export function resolveHomeVideo(preview: boolean): HomeVideoConfig | null {
  if (HOME_VIDEO.enabled) return HOME_VIDEO;
  if (preview) return HOME_VIDEO_PREVIEW;
  return null;
}

export function videoObjectJsonLd(cfg: HomeVideoConfig) {
  const thumbnailUrl = absoluteUrl(cfg.poster.startsWith("/") ? cfg.poster : `/${cfg.poster}`);
  const embedUrl =
    cfg.provider === "youtube" && cfg.youtubeId
      ? `https://www.youtube-nocookie.com/embed/${cfg.youtubeId}`
      : undefined;
  const contentUrl = cfg.provider === "mp4" && cfg.src ? absoluteUrl(cfg.src) : undefined;
  return {
    "@type": "VideoObject",
    name: cfg.title,
    description: cfg.description,
    thumbnailUrl,
    uploadDate: cfg.uploadDate,
    duration: "PT45S",
    ...(embedUrl ? { embedUrl } : {}),
    ...(contentUrl ? { contentUrl } : {}),
    hasPart: cfg.chapters.map((ch) => ({
      "@type": "Clip",
      name: ch.title,
      startOffset: ch.start,
      endOffset: Math.min(45, ch.start + 12),
    })),
  };
}
