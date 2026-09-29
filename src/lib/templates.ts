export type TemplateCategory =
  | "place"
  | "food"
  | "travel"
  | "fashion"
  | "school"
  | "work"
  | "family"
  | "community";

export type RoomTemplate = {
  slug: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  h1: string;
  category: TemplateCategory;
  emoji: string;
  format: "quick" | "bracket" | "swipe";
  /** Highlight group in wizard step 1. */
  group?: "place" | "other";
  optionKind?: "place" | "any";
  defaultSettings: {
    max_choices?: number;
    option_kind?: "place" | "any";
  };
  /** Empty = user fills; placeholders guide the UI. */
  suggestedOptions: string[];
  optionPlaceholder: string;
  intro: string;
  steps: string[];
  faq: { q: string; a: string }[];
  relatedSlugs: string[];
};

/** Place-vote templates — shown first in wizard. */
export const PLACE_TEMPLATES: RoomTemplate[] = [
  {
    slug: "di-dau-choi-cuoi-tuan",
    title: "Đi đâu chơi cuối tuần",
    seoTitle: "Tạo bình chọn đi đâu chơi cuối tuần",
    seoDescription: "Cả nhóm dán link Google Maps, vote chọn 1 địa điểm cuối tuần.",
    h1: "Cuối tuần đi đâu chơi?",
    category: "place",
    emoji: "🛵",
    format: "quick",
    group: "place",
    optionKind: "place",
    defaultSettings: { max_choices: 1, option_kind: "place" },
    suggestedOptions: [],
    optionPlaceholder: "Dán link Google Maps từng địa điểm…",
    intro: "Mỗi người dán link Maps quán / chỗ chơi. Cả nhóm chạm chọn 1 nơi.",
    steps: ["Tạo phòng", "Dán link Maps các địa điểm", "Gửi link Zalo cho nhóm vote"],
    faq: [
      { q: "Cần tài khoản Google không?", a: "Không. Chỉ cần dán link chia sẻ từ Google Maps." },
      { q: "Chọn được nhiều nơi không?", a: "Mẫu này mặc định chọn 1. Bạn đổi trong cài đặt." },
    ],
    relatedSlugs: ["chon-quan-an-nhau", "chon-diem-du-lich"],
  },
  {
    slug: "chon-quan-an-nhau",
    title: "Chọn quán ăn, quán nhậu",
    seoTitle: "Bình chọn quán ăn quán nhậu cho nhóm",
    seoDescription: "Dán link Maps các quán, cả nhóm vote chọn quán.",
    h1: "Tối nay ăn/nhậu quán nào?",
    category: "food",
    emoji: "🍜",
    format: "quick",
    group: "place",
    optionKind: "place",
    defaultSettings: { max_choices: 1, option_kind: "place" },
    suggestedOptions: [],
    optionPlaceholder: "Dán link Google Maps của quán…",
    intro: "Dán link Maps từng quán. Thấy bản đồ nhỏ, chỉ đường một chạm.",
    steps: ["Tạo phòng", "Dán link Maps các quán", "Chốt quán thắng"],
    faq: [
      { q: "Có hiện bản đồ không?", a: "Có. Mỗi quán có bản đồ nhỏ và nút Chỉ đường." },
    ],
    relatedSlugs: ["di-dau-choi-cuoi-tuan", "hop-lop-to-chuc-tiec"],
  },
  {
    slug: "chon-homestay-khach-san",
    title: "Chọn homestay, khách sạn",
    seoTitle: "Vote chọn homestay khách sạn cho nhóm",
    seoDescription: "So sánh chỗ ở: giá/đêm, link đặt phòng, vị trí trên Maps.",
    h1: "Ở homestay / khách sạn nào?",
    category: "travel",
    emoji: "🏡",
    format: "quick",
    group: "place",
    optionKind: "place",
    defaultSettings: { max_choices: 1, option_kind: "place" },
    suggestedOptions: [],
    optionPlaceholder: "Dán link Google Maps chỗ ở…",
    intro: "Dán Maps + ghi giá/đêm và link Booking/Agoda. Cả nhóm chọn nơi ngủ.",
    steps: ["Tạo phòng", "Dán Maps + giá + link đặt", "Vote và chốt"],
    faq: [
      { q: "Thêm link Booking được không?", a: "Được. Mỗi địa điểm có ô link đặt phòng tuỳ chọn." },
    ],
    relatedSlugs: ["chon-diem-du-lich", "di-dau-choi-cuoi-tuan"],
  },
  {
    slug: "chon-diem-du-lich",
    title: "Chọn điểm du lịch",
    seoTitle: "Bình chọn điểm du lịch cho nhóm",
    seoDescription: "Cả nhóm đề xuất điểm đến bằng link Maps và vote.",
    h1: "Đi du lịch ở đâu?",
    category: "travel",
    emoji: "🏝️",
    format: "quick",
    group: "place",
    optionKind: "place",
    defaultSettings: { max_choices: 1, option_kind: "place" },
    suggestedOptions: [],
    optionPlaceholder: "Dán link Google Maps điểm đến…",
    intro: "Mỗi người đề xuất một điểm đến bằng link Maps. Nhóm vote chọn.",
    steps: ["Tạo phòng", "Dán link Maps", "Chốt điểm đến"],
    faq: [],
    relatedSlugs: ["chon-homestay-khach-san", "di-dau-choi-cuoi-tuan"],
  },
  {
    slug: "hop-lop-to-chuc-tiec",
    title: "Họp lớp, tổ chức tiệc",
    seoTitle: "Chọn địa điểm họp lớp, tiệc công ty",
    seoDescription: "Dán link Maps nhà hàng / quán, cả nhóm chọn chỗ họp mặt.",
    h1: "Họp mặt ở đâu?",
    category: "school",
    emoji: "🎉",
    format: "quick",
    group: "place",
    optionKind: "place",
    defaultSettings: { max_choices: 1, option_kind: "place" },
    suggestedOptions: [],
    optionPlaceholder: "Dán link Google Maps địa điểm họp…",
    intro: "Chọn nhà hàng, quán, sân chơi cho họp lớp hay tiệc team.",
    steps: ["Tạo phòng", "Dán link Maps", "Gửi link mời cả lớp"],
    faq: [],
    relatedSlugs: ["chon-quan-an-nhau"],
  },
];

export const TEMPLATES: RoomTemplate[] = [...PLACE_TEMPLATES];

export function getTemplate(slug: string | null | undefined) {
  if (!slug) return null;
  return TEMPLATES.find((t) => t.slug === slug) ?? null;
}

export function templatesByGroup() {
  return {
    place: TEMPLATES.filter((t) => t.group === "place"),
    other: TEMPLATES.filter((t) => t.group !== "place"),
  };
}
