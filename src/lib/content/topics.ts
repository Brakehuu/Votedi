/** Chủ đề blog cho phép (phần tử đầu của tags). */
export const BLOG_TOPICS = [
  { name: "Chọn ngày", slug: "chon-ngay" },
  { name: "Ăn uống", slug: "an-uong" },
  { name: "Du lịch", slug: "du-lich" },
  { name: "Áo lớp & thiết kế", slug: "ao-lop-thiet-ke" },
  { name: "Hướng dẫn", slug: "huong-dan" },
  { name: "So sánh", slug: "so-sanh" },
  { name: "Cộng đồng & cuộc thi", slug: "cong-dong-cuoc-thi" },
] as const;

export type BlogTopicName = (typeof BLOG_TOPICS)[number]["name"];
export type BlogTopicSlug = (typeof BLOG_TOPICS)[number]["slug"];

function fold(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const ALIASES: Record<string, BlogTopicSlug> = {
  "chon ngay": "chon-ngay",
  "hop lop": "chon-ngay",
  "an uong": "an-uong",
  "du lich": "du-lich",
  "du lich nhom": "du-lich",
  "ao lop": "ao-lop-thiet-ke",
  "ao lop thiet ke": "ao-lop-thiet-ke",
  "thiet ke": "ao-lop-thiet-ke",
  "huong dan": "huong-dan",
  "so sanh": "so-sanh",
  "cong dong": "cong-dong-cuoc-thi",
  "cong dong cuoc thi": "cong-dong-cuoc-thi",
  schedule: "chon-ngay",
  bracket: "ao-lop-thiet-ke",
  "ao-lop": "ao-lop-thiet-ke",
  "du-lich": "du-lich",
  "bat dau": "huong-dan",
  "tao phong": "huong-dan",
};

export function topicBySlug(slug: string) {
  return BLOG_TOPICS.find((t) => t.slug === slug) ?? null;
}

export function topicByName(name: string) {
  return BLOG_TOPICS.find((t) => t.name === name) ?? null;
}

/** Chuẩn hoá một thẻ về chủ đề cho phép (hoặc null nếu không khớp). */
export function normalizeTopic(raw: string): (typeof BLOG_TOPICS)[number] | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const byName = BLOG_TOPICS.find((t) => t.name === trimmed);
  if (byName) return byName;
  const bySlug = BLOG_TOPICS.find((t) => t.slug === trimmed);
  if (bySlug) return bySlug;
  const key = fold(trimmed);
  const alias = ALIASES[key];
  if (alias) return topicBySlug(alias);
  for (const t of BLOG_TOPICS) {
    if (fold(t.name) === key) return t;
  }
  return null;
}

/** Chuẩn hoá mảng tags: chủ đề chính đứng đầu, bỏ trùng. */
export function normalizeTags(tags: string[] | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of tags ?? []) {
    const topic = normalizeTopic(raw);
    const label = topic?.name ?? raw.trim();
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  // Promote first matching allowed topic to front
  const primaryIdx = out.findIndex((t) => normalizeTopic(t));
  if (primaryIdx > 0) {
    const [primary] = out.splice(primaryIdx, 1);
    out.unshift(primary!);
  }
  return out;
}

export function primaryTopic(tags: string[] | undefined) {
  for (const t of tags ?? []) {
    const topic = normalizeTopic(t);
    if (topic) return topic;
  }
  return null;
}

export function topicSlugFromParam(param: string) {
  const decoded = decodeURIComponent(param);
  const topic = normalizeTopic(decoded) ?? topicBySlug(decoded);
  return topic;
}
