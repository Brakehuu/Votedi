# Vote Đi

## Đăng bài blog / hướng dẫn (4 bước)

1. **Tạo thư mục bài** (hoặc copy một bài mẫu):

   ```bash
   npm run blog:new "Tiêu đề bài viết"
   ```

   Tạo `content/blog/<slug>/index.mdx`. Hướng dẫn: tạo thủ công `content/huong-dan/<slug>/index.mdx` cùng cấu trúc.

2. **Viết nội dung + thả ảnh** vào cùng thư mục (`cover.jpg|png|webp`, `heatmap.webp`, …). Trong MDX gọi ảnh bằng tên file:

   ```md
   ![Mô tả ảnh](heatmap.webp)
   ```

   Frontmatter bắt buộc: `title`, `description` (120–160 ký tự), `date` (`YYYY-MM-DD`). Tuỳ chọn: `updated`, `tags` (phần tử đầu = chủ đề), `template`, `author`, `draft`.

3. **Kiểm tra** (chạy tự động trước `build`):

   ```bash
   npm run blog:check
   ```

4. **Commit + push** thư mục trong `content/` — không cần sửa code, không chép ảnh vào `public/` (script `predev`/`prebuild` sync sang `public/blog/<slug>/`).

**Hẹn giờ đăng:** đặt `date` ở tương lai + `draft: false`. Bài ẩn đến ngày đó; cấu hình [Vercel Deploy Hook](https://vercel.com/docs/deployments/deploy-hooks) + cron hằng ngày để build lại khi tới hạn.

Chủ đề cho phép: Chọn ngày, Ăn uống, Du lịch, Áo lớp & thiết kế, Hướng dẫn, So sánh, Cộng đồng & cuộc thi.

## Supabase migrations

Chạy `supabase/migrations/` **theo thứ tự** trong SQL editor (mỗi file safe to re-run):

`0001` → … → **`0016_phase6`**

```bash
npm run db:check
```

Cần `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SECRET_KEY` trong `.env.local`.

Optional: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY`.

## Scripts

```bash
npm run dev          # sync blog assets rồi next dev
npm run build        # sync + blog:check rồi build (lỗi check → fail, Vercel giữ bản cũ)
npm run blog:new "…"
npm run blog:check
npm run blog:sync
npm test
npm run lint
npm run db:check
```

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
