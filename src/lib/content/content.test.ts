import assert from "node:assert/strict";
import test from "node:test";
import { countWords, readingMinutesFromText } from "./reading-time";
import { extractToc, parseFaqSection, preprocessBody, slugifyHeading } from "./preprocess";
import { normalizeTags, normalizeTopic, primaryTopic } from "./topics";
import { paginate, todayIsoDate } from "./loader";

test("slugifyHeading strips accents", () => {
  assert.equal(slugifyHeading("Câu hỏi thường gặp"), "cau-hoi-thuong-gap");
});

test("reading time ~200 wpm", () => {
  const text = Array.from({ length: 400 }, () => "chữ").join(" ");
  assert.equal(countWords(text), 400);
  assert.equal(readingMinutesFromText(text), 2);
});

test("normalize topics", () => {
  assert.equal(normalizeTopic("du-lich")?.name, "Du lịch");
  assert.equal(normalizeTopic("Áo lớp")?.slug, "ao-lop-thiet-ke");
  const tags = normalizeTags(["zalo", "Chọn ngày", "hop lop"]);
  assert.equal(primaryTopic(tags)?.slug, "chon-ngay");
  assert.equal(tags[0], "Chọn ngày");
});

test("preprocess FAQ + summary", () => {
  const raw = `Intro

## Tóm tắt nhanh

1. Một
2. Hai

## Nội dung

Hello

## Câu hỏi thường gặp

### Hỏi A?

Trả lời A.

### Hỏi B?

Trả lời B.

## Kết

Done
`;
  const { body, summary, faq } = preprocessBody(raw);
  assert.ok(summary?.includes("Một"));
  assert.equal(faq.length, 2);
  assert.equal(faq[0]?.q, "Hỏi A?");
  assert.ok(!body.includes("Câu hỏi thường gặp"));
  assert.ok(body.includes("## Nội dung"));
});

test("TOC nests h3 under h2", () => {
  const toc = extractToc(`## Một\n\n### Con\n\n## Hai\n`);
  assert.equal(toc.length, 2);
  assert.equal(toc[0]?.children?.length, 1);
  assert.equal(toc[0]?.children?.[0]?.text, "Con");
});

test("paginate", () => {
  const items = Array.from({ length: 25 }, (_, i) => i);
  const p2 = paginate(items, 2, 12);
  assert.equal(p2.totalPages, 3);
  assert.equal(p2.items.length, 12);
  assert.equal(p2.items[0], 12);
});

test("todayIsoDate shape", () => {
  assert.match(todayIsoDate(), /^\d{4}-\d{2}-\d{2}$/);
});

test("parseFaqSection", () => {
  const items = parseFaqSection(`### Q1?\n\nA1\n\n### Q2?\n\nA2`);
  assert.equal(items.length, 2);
});
