export type FaqItem = { q: string; a: string };

export type TocItem = {
  id: string;
  text: string;
  level: 2 | 3;
  children?: TocItem[];
};

export function slugifyHeading(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** Tách FAQ + Summary; trả body MDX còn lại. */
export function preprocessBody(raw: string) {
  let body = raw.replace(/\r\n/g, "\n").trim();
  let summary: string | null = null;
  let faq: FaqItem[] = [];

  // ## Tóm tắt nhanh → Summary markdown (until next ##)
  const sumMatch = body.match(/^##\s+Tóm tắt nhanh\s*\n([\s\S]*?)(?=\n##\s+|$)/m);
  if (sumMatch) {
    summary = sumMatch[1]!.trim();
    body = (body.slice(0, sumMatch.index!) + body.slice(sumMatch.index! + sumMatch[0].length)).trim();
  }

  // Leading blockquote titled Tóm tắt
  if (!summary) {
    const bq = body.match(/^>\s*\*?\*?Tóm tắt(?: nhanh)?\*?\*?\s*\n((?:>.*\n?)+)/i);
    if (bq) {
      summary = bq[1]!
        .split("\n")
        .map((l) => l.replace(/^>\s?/, ""))
        .join("\n")
        .trim();
      body = body.slice(bq[0].length).trim();
    }
  }

  const faqMatch = body.match(/\n##\s+Câu hỏi thường gặp\s*\n([\s\S]*?)(?=\n##\s+(?!#)|\s*$)/);
  if (faqMatch) {
    faq = parseFaqSection(faqMatch[1]!);
    body = (body.slice(0, faqMatch.index!) + body.slice(faqMatch.index! + faqMatch[0].length)).trim();
  }

  return { body, summary, faq };
}

export function parseFaqSection(section: string): FaqItem[] {
  const items: FaqItem[] = [];
  const parts = section.split(/\n###\s+/).filter(Boolean);
  for (const part of parts) {
    const lines = part.trim().split("\n");
    const q = lines[0]?.replace(/^#+\s*/, "").trim();
    if (!q) continue;
    const a = lines.slice(1).join("\n").trim();
    if (!a) continue;
    items.push({ q, a });
  }
  return items;
}

/** TOC từ h2/h3, bỏ h3 trong mục FAQ (đã tách) và không gồm Summary. */
export function extractToc(body: string): TocItem[] {
  const lines = body.split("\n");
  const flat: { id: string; text: string; level: 2 | 3 }[] = [];
  for (const line of lines) {
    const m = line.match(/^(#{2,3})\s+(.+)$/);
    if (!m) continue;
    const text = m[2]!.replace(/[#*`]/g, "").trim();
    if (/^tóm tắt nhanh$/i.test(text) || /^câu hỏi thường gặp$/i.test(text)) continue;
    flat.push({ id: slugifyHeading(text), text, level: m[1]!.length === 2 ? 2 : 3 });
  }
  const tree: TocItem[] = [];
  let current: TocItem | null = null;
  for (const item of flat) {
    if (item.level === 2) {
      current = { ...item, children: [] };
      tree.push(current);
    } else if (current) {
      current.children = current.children ?? [];
      current.children.push(item);
    } else {
      tree.push(item);
    }
  }
  return tree;
}

export function flattenToc(toc: TocItem[]) {
  const out: { id: string; text: string; level: 2 | 3 }[] = [];
  for (const item of toc) {
    out.push({ id: item.id, text: item.text, level: item.level });
    for (const child of item.children ?? []) {
      out.push({ id: child.id, text: child.text, level: child.level });
    }
  }
  return out;
}
