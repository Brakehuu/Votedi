import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { listContent, type ContentKind } from "./loader";
import { FORMAT_LIST } from "../formats";
import { TEMPLATES } from "../templates";
import { normalizeTopic } from "./topics";

export type CheckIssue = {
  level: "error" | "warn";
  file: string;
  message: string;
};

const ROOT = path.join(process.cwd(), "content");

function kindDirs(kind: ContentKind) {
  const root = path.join(ROOT, kind === "blog" ? "blog" : "huong-dan");
  if (!fs.existsSync(root)) return [] as string[];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(root, d.name));
}

function knownInternalPaths() {
  const paths = new Set<string>([
    "/",
    "/blog",
    "/huong-dan",
    "/mau",
    "/kieu-vote",
    "/tao-phong",
    "/phong-cua-toi",
    "/gioi-thieu",
    "/lien-he",
    "/faq",
  ]);
  for (const t of TEMPLATES) paths.add(`/mau/${t.slug}`);
  for (const f of FORMAT_LIST) paths.add(`/kieu-vote/${f.slug}`);
  for (const kind of ["blog", "huong-dan"] as ContentKind[]) {
    for (const doc of listContent(kind, { includeDrafts: true, includeScheduled: true })) {
      paths.add(`/${kind}/${doc.slug}`);
    }
  }
  return paths;
}

function extractMarkdownImages(body: string) {
  const out: { alt: string; src: string }[] = [];
  const re = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    out.push({ alt: m[1] ?? "", src: m[2]!.trim() });
  }
  return out;
}

function extractHtmlImgs(body: string) {
  const out: { alt: string | null; src: string }[] = [];
  const re = /<img\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const tag = m[0];
    const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ?? "";
    const altM = tag.match(/\balt=["']([^"']*)["']/i);
    out.push({ alt: altM ? altM[1]! : null, src });
  }
  return out;
}

function extractInternalLinks(body: string) {
  const hrefs: string[] = [];
  const md = /\]\((\/[^)\s]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = md.exec(body))) hrefs.push(m[1]!);
  const html = /href=["'](\/[^"']+)["']/g;
  while ((m = html.exec(body))) hrefs.push(m[1]!);
  return hrefs;
}

export function validateContent(): CheckIssue[] {
  const issues: CheckIssue[] = [];
  const known = knownInternalPaths();

  for (const kind of ["blog", "huong-dan"] as ContentKind[]) {
    for (const dir of kindDirs(kind)) {
      const slug = path.basename(dir);
      const mdx =
        fs.existsSync(path.join(dir, "index.mdx"))
          ? path.join(dir, "index.mdx")
          : fs.existsSync(path.join(dir, "index.md"))
            ? path.join(dir, "index.md")
            : null;
      if (!mdx) {
        issues.push({ level: "error", file: dir, message: "Thiếu index.mdx" });
        continue;
      }
      const raw = fs.readFileSync(mdx, "utf8");
      const { data, content } = matter(raw);
      const fm = data as Record<string, unknown>;
      const rel = path.relative(process.cwd(), mdx).replace(/\\/g, "/");

      if (typeof fm.title !== "string" || !fm.title.trim()) {
        issues.push({ level: "error", file: rel, message: "Thiếu title" });
      } else if (fm.title.trim().length > 70) {
        issues.push({ level: "warn", file: rel, message: `Title dài ${fm.title.trim().length} ký tự (gợi ý ≤ 70)` });
      }

      if (typeof fm.description !== "string" || !fm.description.trim()) {
        issues.push({ level: "error", file: rel, message: "Thiếu description" });
      } else {
        const len = fm.description.trim().length;
        if (len < 120 || len > 160) {
          issues.push({
            level: "warn",
            file: rel,
            message: `Description ${len} ký tự (gợi ý 120–160)`,
          });
        }
      }

      if (typeof fm.date !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(fm.date)) {
        issues.push({ level: "error", file: rel, message: "Thiếu date (YYYY-MM-DD)" });
      }

      if (typeof fm.slug === "string" && fm.slug.trim() && fm.slug.trim() !== slug) {
        issues.push({
          level: "warn",
          file: rel,
          message: `Frontmatter slug “${fm.slug}” khác tên thư mục “${slug}” — sẽ bỏ qua, dùng tên thư mục`,
        });
      }

      const tags = Array.isArray(fm.tags) ? fm.tags.map(String) : [];
      if (tags[0] && !normalizeTopic(tags[0])) {
        issues.push({
          level: "warn",
          file: rel,
          message: `Tag đầu “${tags[0]}” không khớp chủ đề cho phép`,
        });
      }

      const files = new Set(
        fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isFile()),
      );

      for (const img of extractMarkdownImages(content)) {
        if (!img.alt.trim()) {
          issues.push({ level: "error", file: rel, message: `Ảnh thiếu alt: ${img.src}` });
        }
        const src = img.src.replace(/^<|>$/g, "");
        if (/^(https?:|data:)/i.test(src)) continue;
        const file = path.posix.basename(src.replace(/\\/g, "/"));
        if (!files.has(file) && !src.startsWith("/")) {
          issues.push({ level: "error", file: rel, message: `Ảnh không có file: ${file}` });
        }
        if (src.startsWith(`/${kind}/${slug}/`)) {
          const file2 = path.posix.basename(src);
          if (!files.has(file2)) {
            issues.push({ level: "error", file: rel, message: `Ảnh không có file: ${file2}` });
          }
        }
      }

      for (const img of extractHtmlImgs(content)) {
        if (img.alt === null) {
          issues.push({ level: "error", file: rel, message: `Thẻ <img> thiếu alt: ${img.src}` });
        }
      }

      for (const href of extractInternalLinks(content)) {
        const clean = href.split(/[?#]/)[0]!;
        if (clean.startsWith("/mau/") || clean.startsWith("/kieu-vote/") || clean.startsWith("/huong-dan/") || clean.startsWith("/blog/")) {
          if (!known.has(clean)) {
            issues.push({ level: "error", file: rel, message: `Link nội bộ không tồn tại: ${clean}` });
          }
        }
      }
    }
  }

  return issues;
}

export function formatCheckReport(issues: CheckIssue[]) {
  const errors = issues.filter((i) => i.level === "error");
  const warns = issues.filter((i) => i.level === "warn");
  const lines: string[] = [];
  if (!issues.length) {
    lines.push("OK — mọi bài hợp lệ.");
    return lines.join("\n");
  }
  for (const i of issues) {
    lines.push(`${i.level === "error" ? "ERROR" : "WARN "}  ${i.file}\n        ${i.message}`);
  }
  lines.push("");
  lines.push(`${errors.length} lỗi, ${warns.length} cảnh báo.`);
  return lines.join("\n");
}
