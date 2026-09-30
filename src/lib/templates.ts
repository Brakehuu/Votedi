export type TemplateCategory =
  | "place"
  | "food"
  | "travel"
  | "fashion"
  | "school"
  | "work"
  | "family"
  | "community"
  | "entertainment";

export type RoomTemplate = {
  slug: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  h1: string;
  category: TemplateCategory;
  emoji: string;
  format: "quick" | "bracket" | "swipe" | "ranking" | "rating";
  /** Highlight group in wizard step 1. */
  group?: "place" | "other";
  optionKind?: "place" | "any";
  defaultSettings: {
    max_choices?: number;
    option_kind?: "place" | "any";
    judge_weight?: number;
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
    faq: [{ q: "Có hiện bản đồ không?", a: "Có. Mỗi quán có bản đồ nhỏ và nút Chỉ đường." }],
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
    faq: [{ q: "Thêm link Booking được không?", a: "Được. Mỗi địa điểm có ô link đặt phòng tuỳ chọn." }],
    relatedSlugs: ["chon-diem-du-lich", "di-dau-choi-cuoi-tuan"],
  },
  {
    slug: "chon-diem-du-lich",
    title: "Chọn điểm du lịch",
    seoTitle: "Quẹt chọn điểm du lịch cho nhóm",
    seoDescription: "Quẹt thích / bỏ qua các điểm đến bằng link Maps.",
    h1: "Đi du lịch ở đâu?",
    category: "travel",
    emoji: "🏝️",
    format: "swipe",
    group: "place",
    optionKind: "place",
    defaultSettings: { option_kind: "place" },
    suggestedOptions: [],
    optionPlaceholder: "Dán link Google Maps điểm đến…",
    intro: "Mỗi người đề xuất điểm đến bằng Maps. Cả nhóm quẹt chọn.",
    steps: ["Tạo phòng", "Dán link Maps", "Quẹt và chốt"],
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

export const OTHER_TEMPLATES: RoomTemplate[] = [
  {
    slug: "hom-nay-an-gi",
    title: "Hôm nay ăn gì",
    seoTitle: "Quẹt chọn hôm nay ăn gì",
    seoDescription: "Quẹt thẻ chọn món cả nhóm đều thích.",
    h1: "Hôm nay ăn gì?",
    category: "food",
    emoji: "🍽",
    format: "swipe",
    group: "other",
    defaultSettings: {},
    suggestedOptions: ["Bún bò", "Phở", "Lẩu", "Nướng", "Cơm tấm", "Mì cay"],
    optionPlaceholder: "Thêm món…",
    intro: "Thêm món với emoji. Quẹt phải nếu thích, lên nếu rất thích.",
    steps: ["Tạo phòng", "Thêm món", "Gửi link quẹt"],
    faq: [],
    relatedSlugs: ["an-trua-van-phong", "chon-phim-toi-nay"],
  },
  {
    slug: "an-trua-van-phong",
    title: "Trưa nay team ăn gì",
    seoTitle: "Quẹt chọn cơm trưa văn phòng",
    seoDescription: "Team quẹt chọn quán / món trưa.",
    h1: "Trưa nay ăn gì?",
    category: "work",
    emoji: "🥗",
    format: "swipe",
    group: "other",
    defaultSettings: {},
    suggestedOptions: [],
    optionPlaceholder: "Thêm món hoặc quán…",
    intro: "Quẹt chọn nhanh cho bữa trưa team.",
    steps: ["Tạo phòng", "Thêm lựa chọn", "Quẹt"],
    faq: [],
    relatedSlugs: ["hom-nay-an-gi"],
  },
  {
    slug: "chon-phim-toi-nay",
    title: "Tối nay xem phim gì",
    seoTitle: "Quẹt chọn phim tối nay",
    seoDescription: "Thêm tên phim hoặc link, cả nhóm quẹt chọn.",
    h1: "Tối nay xem phim gì?",
    category: "entertainment",
    emoji: "🎬",
    format: "swipe",
    group: "other",
    defaultSettings: {},
    suggestedOptions: [],
    optionPlaceholder: "Tên phim hoặc link…",
    intro: "Quẹt phải nếu muốn xem, lên nếu rất muốn.",
    steps: ["Tạo phòng", "Thêm phim", "Quẹt"],
    faq: [],
    relatedSlugs: ["hom-nay-an-gi"],
  },
  {
    slug: "dat-ten-con",
    title: "Đặt tên cho bé",
    seoTitle: "Xếp hạng đặt tên cho bé",
    seoDescription: "Kéo thả thứ tự tên, cộng điểm Borda cả nhà.",
    h1: "Đặt tên cho bé",
    category: "family",
    emoji: "👶",
    format: "ranking",
    group: "other",
    defaultSettings: {},
    suggestedOptions: [],
    optionPlaceholder: "Thêm tên…",
    intro: "Mỗi người kéo thả thứ tự. Điểm Borda chọn tên thắng.",
    steps: ["Tạo phòng", "Thêm tên", "Xếp hạng"],
    faq: [],
    relatedSlugs: ["dat-ten-team-thuong-hieu"],
  },
  {
    slug: "dat-ten-team-thuong-hieu",
    title: "Đặt tên team, thương hiệu",
    seoTitle: "Xếp hạng đặt tên team / thương hiệu",
    seoDescription: "Kéo thả ưu tiên tên, cộng điểm chung.",
    h1: "Đặt tên team / thương hiệu",
    category: "work",
    emoji: "🏷",
    format: "ranking",
    group: "other",
    defaultSettings: {},
    suggestedOptions: [],
    optionPlaceholder: "Thêm tên…",
    intro: "Xếp hạng các tên đề xuất bằng kéo thả.",
    steps: ["Tạo phòng", "Thêm tên", "Xếp hạng"],
    faq: [],
    relatedSlugs: ["dat-ten-con"],
  },
  {
    slug: "cuoc-thi-anh",
    title: "Cuộc thi ảnh đẹp",
    seoTitle: "Chấm điểm cuộc thi ảnh",
    seoDescription: "Chấm 1–5 sao, có thể thêm giám khảo.",
    h1: "Cuộc thi ảnh đẹp",
    category: "community",
    emoji: "📷",
    format: "rating",
    group: "other",
    defaultSettings: { judge_weight: 0.5 },
    suggestedOptions: [],
    optionPlaceholder: "Tải ảnh dự thi…",
    intro: "Mỗi ảnh một thẻ. Chấm sao; host có thể đặt giám khảo.",
    steps: ["Tạo phòng", "Tải ảnh", "Chấm điểm"],
    faq: [],
    relatedSlugs: ["chon-mon-an-ngon-nhat"],
  },
  {
    slug: "chon-mon-an-ngon-nhat",
    title: "Chấm điểm món ăn",
    seoTitle: "Chấm điểm món ăn ngon nhất",
    seoDescription: "Chấm 1–5 sao từng món, xem điểm trung bình.",
    h1: "Món nào ngon nhất?",
    category: "food",
    emoji: "⭐",
    format: "rating",
    group: "other",
    defaultSettings: {},
    suggestedOptions: [],
    optionPlaceholder: "Thêm món…",
    intro: "Chấm sao từng món. Điểm TB + số lượt.",
    steps: ["Tạo phòng", "Thêm món", "Chấm"],
    faq: [],
    relatedSlugs: ["cuoc-thi-anh", "hom-nay-an-gi"],
  },
];

export const TEMPLATES: RoomTemplate[] = [...PLACE_TEMPLATES, ...OTHER_TEMPLATES];

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
