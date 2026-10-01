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

/** Cấu hình khối video trang chủ. */
export const HOME_VIDEO: HomeVideoConfig = {
  enabled: true,
  provider: "mp4",
  src: "/video/votedi-gioi-thieu.mp4",
  poster: "/video/votedi-gioi-thieu-poster.jpg",
  title: "Vote Đi trong 45 giây",
  description:
    "Tạo bình chọn online cho nhóm trong 45 giây: Vote Đi là gì, tạo phòng, các kiểu vote, chốt và chia sẻ kết quả.",
  uploadDate: "2026-10-01",
  durationSeconds: 45,
  chapters: [
    {
      start: 0,
      title: "Vote Đi là gì",
      summary: "Trang web tạo bình chọn online cho nhóm, không cần tài khoản.",
    },
    {
      start: 8,
      title: "Tạo phòng và mời bạn",
      summary: "Chọn mẫu, thêm lựa chọn, gửi link Zalo.",
    },
    {
      start: 11,
      title: "Các kiểu vote",
      summary: "6 kiểu cho đủ tình huống: ngày, địa điểm, mẫu áo, đặt tên.",
    },
    {
      start: 28,
      title: "Chốt và chia sẻ",
      summary: "Hết giờ tự có kết quả, thêm vào lịch, gửi lại nhóm.",
    },
  ],
  transcript:
    "0:00 Vote Đi là gì. Cả nhóm hẹn mãi không chốt được? Vote Đi là trang web tạo bình chọn online cho nhóm, miễn phí, không cần tài khoản. 0:08 Tạo phòng và mời bạn. Chọn mẫu có sẵn, thêm lựa chọn, gửi link vào nhóm Zalo. 0:11 Các kiểu vote. Bình chọn nhanh, đấu loại World Cup, chọn lịch rảnh, quẹt chọn, xếp hạng, chấm điểm. 0:28 Chốt và chia sẻ. Hết giờ là có kết quả, thêm vào lịch và gửi lại cho nhóm.",
};

export function videoObjectJsonLd(cfg: HomeVideoConfig) {
  const thumbnailUrl = absoluteUrl(cfg.poster.startsWith("/") ? cfg.poster : `/${cfg.poster}`);
  const embedUrl =
    cfg.provider === "youtube" && cfg.youtubeId
      ? `https://www.youtube-nocookie.com/embed/${cfg.youtubeId}`
      : undefined;
  const contentUrl = cfg.provider === "mp4" && cfg.src ? absoluteUrl(cfg.src) : undefined;
  const chapters = cfg.chapters;
  return {
    "@type": "VideoObject",
    name: cfg.title,
    description: cfg.description,
    thumbnailUrl,
    contentUrl,
    uploadDate: cfg.uploadDate,
    duration: "PT45S",
    ...(embedUrl ? { embedUrl } : {}),
    hasPart: chapters.map((ch, i) => ({
      "@type": "Clip",
      name: ch.title,
      startOffset: ch.start,
      endOffset: i + 1 < chapters.length ? chapters[i + 1]!.start : cfg.durationSeconds,
    })),
  };
}
