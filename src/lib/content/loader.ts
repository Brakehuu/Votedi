import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { imageSize } from "image-size";
import { readingMinutesFromText } from "@/lib/content/reading-time";
import { extractToc, flattenToc, preprocessBody, type FaqItem, type TocItem } from "@/lib/content/preprocess";
import { normalizeTags, primaryTopic } from "@/lib/content/topics";

export type ContentKind = "blog" | "huong-dan";

export type AssetMeta = {
  file: string;
  publicPath: string;
  width: number;
  height: number;
};

export type ContentDoc = {
  kind: ContentKind;
  slug: string;
  title: string;
  description: string;
  date: string;
  updated: string;
  cover: string | null;
  coverWidth: number | null;
  coverHeight: number | null;
  /** true khi dùng ảnh OG tự sinh (không có cover.*) */
  generatedCover: boolean;
  tags: string[];
  primaryTopic: string | null;
  primaryTopicSlug: string | null;
  author: string;
  draft: boolean;
  /** Future-dated — hidden until publish day */
  scheduled: boolean;
  template: string | null;
  body: string;
  summary: string | null;
  faq: FaqItem[];
  toc: TocItem[];
  flatToc: { id: string; text: string; level: 2 | 3 }[];
  readingMinutes: number;
  assets: AssetMeta[];
  assetMap: Record<string, AssetMeta>;
  dirPath: string;
  filePath: string;
};

export type ListOpts = {
  includeDrafts?: boolean;
  includeScheduled?: boolean;
};

const ROOT = path.join(process.cwd(), "content");
const COVER_NAMES = ["cover.jpg", "cover.jpeg", "cover.png", "cover.webp", "cover.JPG", "cover.PNG", "cover.WEBP"];

function dirFor(kind: ContentKind) {
  return path.join(ROOT, kind === "blog" ? "blog" : "huong-dan");
}

export function publicBaseFor(kind: ContentKind, slug: string) {
  return `/${kind}/${slug}`;
}

export function todayIsoDate(now = new Date()) {
  // Asia/Ho_Chi_Minh ≈ UTC+7
  const shifted = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function isScheduled(date: string, now = new Date()) {
  return date > todayIsoDate(now);
}

function listPostDirs(kind: ContentKind) {
  const root = dirFor(kind);
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => fs.existsSync(path.join(root, name, "index.mdx")) || fs.existsSync(path.join(root, name, "index.md")));
}

function findCoverFile(dir: string) {
  for (const name of COVER_NAMES) {
    const full = path.join(/*turbopackIgnore: true*/ dir, name);
    if (fs.existsSync(/*turbopackIgnore: true*/ full)) return name;
  }
  return null;
}

function readAssetMeta(kind: ContentKind, slug: string, dir: string): AssetMeta[] {
  const assets: AssetMeta[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (/\.(mdx?|txt|json)$/i.test(file)) continue;
    if (file.startsWith(".")) continue;
    const full = path.join(dir, file);
    if (!fs.statSync(full).isFile()) continue;
    if (!/\.(jpe?g|png|webp|gif|svg|avif)$/i.test(file)) continue;
    let width = 1200;
    let height = 630;
    try {
      const buf = fs.readFileSync(full);
      const dim = imageSize(buf);
      if (dim.width) width = dim.width;
      if (dim.height) height = dim.height;
    } catch {
      /* keep defaults */
    }
    assets.push({
      file,
      publicPath: `${publicBaseFor(kind, slug)}/${file}`,
      width,
      height,
    });
  }
  return assets;
}

function rewriteRelativeImages(body: string, kind: ContentKind, slug: string) {
  const base = publicBaseFor(kind, slug);
  return body.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (full, alt: string, src: string) => {
    const trimmed = src.trim().replace(/^<|>$/g, "");
    if (/^(https?:|\/|data:)/i.test(trimmed)) return full;
    const file = path.posix.basename(trimmed.replace(/\\/g, "/"));
    return `![${alt}](${base}/${file})`;
  });
}

function readPost(kind: ContentKind, slug: string): ContentDoc | null {
  const dir = path.join(dirFor(kind), slug);
  const mdxPath = fs.existsSync(path.join(dir, "index.mdx"))
    ? path.join(dir, "index.mdx")
    : path.join(dir, "index.md");
  if (!fs.existsSync(mdxPath)) return null;

  const raw = fs.readFileSync(mdxPath, "utf8");
  const { data, content } = matter(raw);
  const fm = data as Record<string, unknown>;

  const title = typeof fm.title === "string" ? fm.title.trim() : "";
  const description = typeof fm.description === "string" ? fm.description.trim() : "";
  const date = typeof fm.date === "string" ? fm.date.trim() : "";
  if (!title || !description || !date) return null;

  // Ignore frontmatter slug if it disagrees with folder name
  const updated = typeof fm.updated === "string" && fm.updated.trim() ? fm.updated.trim() : date;
  const author = typeof fm.author === "string" && fm.author.trim() ? fm.author.trim() : "Vote Đi";
  const draft = Boolean(fm.draft);
  const template =
    (typeof fm.template === "string" && fm.template) ||
    (typeof fm.templateSlug === "string" && fm.templateSlug) ||
    null;

  const tags = normalizeTags(Array.isArray(fm.tags) ? fm.tags.map(String) : []);
  const topic = primaryTopic(tags);

  const assets = readAssetMeta(kind, slug, dir);
  const assetMap = Object.fromEntries(assets.map((a) => [a.file, a]));

  let coverFile =
    typeof fm.cover === "string" && fm.cover.trim()
      ? path.posix.basename(fm.cover.trim().replace(/\\/g, "/"))
      : findCoverFile(dir);
  if (coverFile && !assetMap[coverFile] && !findCoverFile(dir)) {
    coverFile = findCoverFile(dir);
  }
  if (!coverFile) coverFile = findCoverFile(dir);

  let cover: string | null = null;
  let coverWidth: number | null = null;
  let coverHeight: number | null = null;
  let generatedCover = false;
  if (coverFile && (assetMap[coverFile] || fs.existsSync(path.join(dir, coverFile)))) {
    const meta = assetMap[coverFile] ?? {
      file: coverFile,
      publicPath: `${publicBaseFor(kind, slug)}/${coverFile}`,
      width: 1200,
      height: 630,
    };
    cover = meta.publicPath;
    coverWidth = meta.width;
    coverHeight = meta.height;
  } else {
    generatedCover = true;
    cover = `${publicBaseFor(kind, slug)}/opengraph-image`;
  }

  const rewritten = rewriteRelativeImages(content, kind, slug);
  const { body, summary, faq } = preprocessBody(rewritten);
  const toc = extractToc(body);
  const readingMinutes = readingMinutesFromText([summary, body, faq.map((f) => `${f.q} ${f.a}`).join(" ")].filter(Boolean).join("\n"));

  return {
    kind,
    slug,
    title,
    description,
    date,
    updated,
    cover,
    coverWidth,
    coverHeight,
    generatedCover,
    tags,
    primaryTopic: topic?.name ?? null,
    primaryTopicSlug: topic?.slug ?? null,
    author,
    draft,
    scheduled: isScheduled(date),
    template,
    body,
    summary,
    faq,
    toc,
    flatToc: flattenToc(toc),
    readingMinutes,
    assets,
    assetMap,
    dirPath: dir,
    filePath: mdxPath,
  };
}

export function listContent(kind: ContentKind, opts?: ListOpts): ContentDoc[] {
  const docs = listPostDirs(kind)
    .map((slug) => readPost(kind, slug))
    .filter((d): d is ContentDoc => Boolean(d))
    .filter((d) => (opts?.includeDrafts ? true : !d.draft))
    .filter((d) => (opts?.includeScheduled ? true : !d.scheduled));
  return docs.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

export function getContent(kind: ContentKind, slug: string, opts?: ListOpts) {
  const doc = readPost(kind, slug);
  if (!doc) return null;
  if (!opts?.includeDrafts && doc.draft) return null;
  if (!opts?.includeScheduled && doc.scheduled) return null;
  return doc;
}

export function allTopicCounts(kind: ContentKind = "blog") {
  const counts = new Map<string, { name: string; slug: string; count: number }>();
  for (const doc of listContent(kind)) {
    const slug = doc.primaryTopicSlug;
    const name = doc.primaryTopic;
    if (!slug || !name) continue;
    const cur = counts.get(slug) ?? { name, slug, count: 0 };
    cur.count += 1;
    counts.set(slug, cur);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "vi"));
}

export function relatedContent(kind: ContentKind, slug: string, limit = 3) {
  const current = getContent(kind, slug, { includeDrafts: true, includeScheduled: true });
  if (!current) return [];
  const tagSet = new Set(current.tags);
  return listContent(kind)
    .filter((d) => d.slug !== slug)
    .map((d) => ({
      doc: d,
      score: d.tags.filter((t) => tagSet.has(t)).length,
    }))
    .sort((a, b) => b.score - a.score || b.doc.date.localeCompare(a.doc.date))
    .slice(0, limit)
    .map((x) => x.doc);
}

export function paginate<T>(items: T[], page: number, perPage = 12) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const safe = Math.min(Math.max(1, page), totalPages);
  const start = (safe - 1) * perPage;
  return {
    page: safe,
    perPage,
    totalPages,
    total: items.length,
    items: items.slice(start, start + perPage),
  };
}

export { extractToc, slugifyHeading } from "@/lib/content/preprocess";
export { BLOG_TOPICS, normalizeTags, normalizeTopic, primaryTopic, topicBySlug, topicSlugFromParam } from "@/lib/content/topics";
