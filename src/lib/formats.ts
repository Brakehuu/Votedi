import {
  CalendarDays,
  Layers,
  ListOrdered,
  Star,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { FormatId, Item, ItemType, RoomSettings, Vote } from "@/lib/types";

export type ResultRow = {
  item: Item;
  score: number;
  votes: number;
  voterIds: string[];
};

export type FormatDef = {
  id: FormatId;
  name: string;
  /** SEO slug (/kieu-vote/[slug]). */
  slug: string;
  icon: LucideIcon;
  description: string;
  useFor: string;
  optionTypes: ItemType[];
  maxOptions: number;
  minOptions: number;
  allowMemberOptions: boolean;
  defaultSettings: RoomSettings;
  /** Selectable in the create wizard. */
  available: boolean;
  hint: (settings: RoomSettings) => string;
  computeResults?: (items: Item[], votes: Vote[]) => ResultRow[];
};

function tally(items: Item[], votes: Vote[]): ResultRow[] {
  const byItem = new Map<string, ResultRow>(
    items.map((item) => [item.id, { item, score: 0, votes: 0, voterIds: [] }]),
  );
  for (const vote of votes) {
    const row = byItem.get(vote.item_id);
    if (!row) continue;
    row.score += vote.value;
    row.votes += 1;
    row.voterIds.push(vote.member_id);
  }
  return [...byItem.values()].sort(
    (a, b) =>
      b.score - a.score ||
      (a.item.position ?? 0) - (b.item.position ?? 0) ||
      a.item.created_at.localeCompare(b.item.created_at) ||
      a.item.id.localeCompare(b.item.id),
  );
}

export const FORMATS: Record<FormatId, FormatDef> = {
  quick: {
    id: "quick",
    name: "Bình chọn nhanh",
    slug: "binh-chon-nhanh",
    icon: Zap,
    description: "Mỗi người chạm chọn, đếm phiếu ngay. Nhanh nhất cho mọi câu hỏi.",
    useFor: "Đi đâu, ăn gì, quán nào, quà gì…",
    optionTypes: ["text", "image", "place", "link"],
    maxOptions: 30,
    minOptions: 2,
    allowMemberOptions: true,
    defaultSettings: { max_choices: 1 },
    available: true,
    hint: (settings) => {
      const max = settings.max_choices ?? 1;
      return max > 1 ? `Chạm để chọn tối đa ${max} lựa chọn` : "Chạm để chọn 1 lựa chọn";
    },
    computeResults: tally,
  },
  bracket: {
    id: "bracket",
    name: "Đấu loại World Cup",
    slug: "dau-loai-world-cup",
    icon: Trophy,
    description: "Các lựa chọn đấu cặp theo sơ đồ, vote từng trận đến khi còn nhà vô địch.",
    useFor: "Mẫu áo, logo, ảnh",
    optionTypes: ["image", "text"],
    maxOptions: 32,
    minOptions: 2,
    allowMemberOptions: false,
    defaultSettings: {},
    available: true,
    hint: () => "Vote từng cặp đấu, người thắng đi tiếp",
  },
  schedule: {
    id: "schedule",
    name: "Chọn lịch rảnh",
    slug: "chon-lich-ranh",
    icon: CalendarDays,
    description: "Mọi người đánh dấu ngày rảnh, hệ thống tìm ngày đẹp nhất.",
    useFor: "Ngày đi chơi, họp lớp, chuyến du lịch",
    optionTypes: [],
    maxOptions: 0,
    minOptions: 0,
    allowMemberOptions: false,
    defaultSettings: {},
    available: false,
    hint: () => "Chạm ô để báo bạn rảnh",
  },
  swipe: {
    id: "swipe",
    name: "Quẹt chọn",
    slug: "quet-chon",
    icon: Layers,
    description: "Quẹt phải thích, quẹt trái bỏ qua. Tìm món cả nhóm đều mê.",
    useFor: "Hôm nay ăn gì, chọn phim, nhiều lựa chọn",
    optionTypes: ["text", "image", "place", "link"],
    maxOptions: 50,
    minOptions: 2,
    allowMemberOptions: true,
    defaultSettings: {},
    available: false,
    hint: () => "Quẹt phải nếu thích, trái để bỏ qua",
  },
  ranking: {
    id: "ranking",
    name: "Xếp hạng",
    slug: "xep-hang",
    icon: ListOrdered,
    description: "Mỗi người kéo thả sắp thứ tự, cộng điểm ra thứ hạng chung.",
    useFor: "Đặt tên con, tên team, ưu tiên",
    optionTypes: ["text", "image"],
    maxOptions: 20,
    minOptions: 2,
    allowMemberOptions: false,
    defaultSettings: {},
    available: false,
    hint: () => "Kéo thả để xếp thứ tự bạn thích",
  },
  rating: {
    id: "rating",
    name: "Chấm điểm",
    slug: "cham-diem",
    icon: Star,
    description: "Chấm 1–5 sao từng lựa chọn, có thể thêm giám khảo.",
    useFor: "Cuộc thi ảnh, thiết kế, món ăn",
    optionTypes: ["image", "text"],
    maxOptions: 50,
    minOptions: 2,
    allowMemberOptions: false,
    defaultSettings: {},
    available: false,
    hint: () => "Chấm sao cho từng lựa chọn",
  },
};

export const FORMAT_LIST: FormatDef[] = [
  FORMATS.quick,
  FORMATS.bracket,
  FORMATS.schedule,
  FORMATS.swipe,
  FORMATS.ranking,
  FORMATS.rating,
];

export function getFormat(id: string | null | undefined): FormatDef {
  return (id && FORMATS[id as FormatId]) || FORMATS.bracket;
}

/** Accepts a format id or its SEO slug. */
export function findFormat(value: string | null | undefined): FormatDef | null {
  if (!value) return null;
  return FORMAT_LIST.find((format) => format.id === value || format.slug === value) ?? null;
}
