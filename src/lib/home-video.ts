import { absoluteUrl } from "@/lib/site";

export type HomeVideoChapterIcon = "spark" | "link" | "layers" | "cup";

export type HomeVideoChapter = {
  /** Seconds from start */
  start: number;
  title: string;
  icon: HomeVideoChapterIcon;
};

export type HomeVideoConfig = {
  enabled: boolean;
  provider: "mp4";
  src: string;
  poster: string;
  title: string;
  description: string;
  uploadDate: string;
  durationSeconds: 45;
  captionsUrl?: string;
  chapters: HomeVideoChapter[];
  transcript: string;
};

/** Cấu hình khối video trang chủ — khớp docs/votedi-khoi-video-mockup.html */
export const HOME_VIDEO: HomeVideoConfig = {
  enabled: true,
  provider: "mp4",
  src: "/video/votedi-gioi-thieu.mp4",
  poster: "/video/votedi-gioi-thieu-poster.jpg",
  title: "Vote Đi trong 45 giây",
  description: "Từ tạo phòng đến chốt kết quả, cả nhóm chỉ cần một link.",
  uploadDate: "2026-10-01",
  durationSeconds: 45,
  chapters: [
    { start: 0, title: "Vote Đi là gì", icon: "spark" },
    { start: 8, title: "Tạo phòng, mời bạn", icon: "link" },
    { start: 11, title: "Các kiểu vote", icon: "layers" },
    { start: 28, title: "Chốt và chia sẻ", icon: "cup" },
  ],
  transcript:
    "0:00 Vote Đi là gì. Cả nhóm hẹn mãi không chốt được? Vote Đi là trang web tạo bình chọn online cho nhóm, miễn phí, không cần tài khoản. 0:08 Tạo phòng, mời bạn. Chọn mẫu có sẵn, thêm lựa chọn, gửi link vào nhóm Zalo. 0:11 Các kiểu vote. Bình chọn nhanh, đấu loại World Cup, chọn lịch rảnh, quẹt chọn, xếp hạng, chấm điểm. 0:28 Chốt và chia sẻ. Hết giờ là có kết quả, thêm vào lịch và gửi lại cho nhóm.",
};

export function videoObjectJsonLd(cfg: HomeVideoConfig) {
  const thumbnailUrl = absoluteUrl(cfg.poster.startsWith("/") ? cfg.poster : `/${cfg.poster}`);
  const contentUrl = absoluteUrl(cfg.src);
  const chapters = cfg.chapters;
  return {
    "@type": "VideoObject",
    name: cfg.title,
    description: cfg.description,
    thumbnailUrl,
    contentUrl,
    uploadDate: cfg.uploadDate,
    duration: "PT45S",
    transcript: cfg.transcript,
    hasPart: chapters.map((ch, i) => ({
      "@type": "Clip",
      name: ch.title,
      startOffset: ch.start,
      endOffset: i + 1 < chapters.length ? chapters[i + 1]!.start : cfg.durationSeconds,
    })),
  };
}

export function formatVideoTime(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function chapterIndexAt(time: number, chapters: HomeVideoChapter[]) {
  let ci = 0;
  for (let i = 0; i < chapters.length; i++) {
    if (time >= chapters[i]!.start) ci = i;
  }
  return ci;
}
