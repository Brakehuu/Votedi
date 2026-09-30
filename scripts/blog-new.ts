/**
 * npm run blog:new "Tiêu đề bài"
 * Tạo content/blog/<slug>/index.mdx mẫu.
 */
import fs from "node:fs";
import path from "node:path";

function slugify(title: string) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function main() {
  const title = process.argv.slice(2).join(" ").trim();
  if (!title) {
    console.error('Dùng: npm run blog:new "Tiêu đề bài"');
    process.exit(1);
  }
  const slug = slugify(title);
  const dir = path.join(process.cwd(), "content", "blog", slug);
  if (fs.existsSync(dir)) {
    console.error(`Đã có thư mục: content/blog/${slug}`);
    process.exit(1);
  }
  fs.mkdirSync(dir, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const description =
    "Mô tả 120–160 ký tự cho SEO: nói rõ vấn đề nhóm gặp và cách Vote Đi giúp chốt nhanh.".padEnd(120, " ");
  const body = `---
title: "${title.replace(/"/g, '\\"')}"
description: "${description.slice(0, 155)}"
date: "${today}"
updated: "${today}"
tags: ["Hướng dẫn"]
template: "binh-chon-nhanh"
author: "Vote Đi"
draft: true
---

Mở đầu: nêu vấn đề nhóm đang gặp.

## Tóm tắt nhanh

1. Bước một.
2. Bước hai.
3. Bước ba.

## Nội dung chính

Viết nội dung ở đây. Ảnh đặt cạnh file này rồi gọi:

![Mô tả ảnh](example.webp)

<TemplateCta slug="binh-chon-nhanh" />

## Câu hỏi thường gặp

### Câu hỏi mẫu?

Trả lời ngắn gọn.
`;
  fs.writeFileSync(path.join(dir, "index.mdx"), body, "utf8");
  console.log(`Đã tạo content/blog/${slug}/index.mdx`);
  console.log("Thêm cover.jpg (hoặc .png/.webp) và ảnh khác vào cùng thư mục, rồi bỏ draft: true khi đăng.");
}

main();
