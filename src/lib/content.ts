import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";

export type ContentKind = "blog" | "huong-dan";

export type ContentFrontmatter = {
  title: string;
  description: string;
  slug: string;
  date: string;
  updated?: string;
  cover?: string;
  tags?: string[];
  author?: string;
  draft?: boolean;
  templateSlug?: string;
};

export type ContentDoc = ContentFrontmatter & {
  kind: ContentKind;
  body: string;
  readingMinutes: number;
  filePath: string;
};

const ROOT = path.join(process.cwd(), "content");

function dirFor(kind: ContentKind) {
  return path.join(ROOT, kind === "blog" ? "blog" : "huong-dan");
}

export function listContent(kind: ContentKind, opts?: { includeDrafts?: boolean }): ContentDoc[] {
  const dir = dirFor(kind);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mdx") || f.endsWith(".md"));
  const docs = files
    .map((file) => readContentFile(kind, path.join(dir, file)))
    .filter((d): d is ContentDoc => Boolean(d))
    .filter((d) => (opts?.includeDrafts ? true : !d.draft));
  return docs.sort((a, b) => b.date.localeCompare(a.date));
}

export function getContent(kind: ContentKind, slug: string, opts?: { includeDrafts?: boolean }) {
  return listContent(kind, { includeDrafts: true }).find(
    (d) => d.slug === slug && (opts?.includeDrafts || !d.draft),
  );
}

function readContentFile(kind: ContentKind, filePath: string): ContentDoc | null {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const fm = data as Partial<ContentFrontmatter>;
  if (!fm.title || !fm.slug || !fm.date) return null;
  const stats = readingTime(content);
  return {
    kind,
    title: fm.title,
    description: fm.description ?? "",
    slug: fm.slug,
    date: fm.date,
    updated: fm.updated ?? fm.date,
    cover: fm.cover,
    tags: fm.tags ?? [],
    author: fm.author ?? "Vote Đi",
    draft: Boolean(fm.draft),
    templateSlug: fm.templateSlug,
    body: content,
    readingMinutes: Math.max(1, Math.round(stats.minutes)),
    filePath,
  };
}

export function allTags(kind: ContentKind) {
  const tags = new Set<string>();
  for (const doc of listContent(kind)) {
    for (const t of doc.tags ?? []) tags.add(t);
  }
  return [...tags].sort((a, b) => a.localeCompare(b, "vi"));
}

export function relatedContent(kind: ContentKind, slug: string, limit = 3) {
  const current = getContent(kind, slug);
  if (!current) return [];
  const tagSet = new Set(current.tags ?? []);
  return listContent(kind)
    .filter((d) => d.slug !== slug)
    .map((d) => ({
      doc: d,
      score: (d.tags ?? []).filter((t) => tagSet.has(t)).length,
    }))
    .sort((a, b) => b.score - a.score || b.doc.date.localeCompare(a.doc.date))
    .slice(0, limit)
    .map((x) => x.doc);
}

/** Extract ## headings for TOC. */
export function extractToc(body: string) {
  const lines = body.split("\n");
  const toc: { id: string; text: string; level: 2 | 3 }[] = [];
  for (const line of lines) {
    const m = line.match(/^(#{2,3})\s+(.+)$/);
    if (!m) continue;
    const text = m[2]!.replace(/[#*`]/g, "").trim();
    const id = slugifyHeading(text);
    toc.push({ id, text, level: m[1]!.length === 2 ? 2 : 3 });
  }
  return toc;
}

export function slugifyHeading(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}
