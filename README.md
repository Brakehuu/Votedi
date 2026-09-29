This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Vote Đi — Supabase migrations

Run the files in `supabase/migrations/` in order in the Supabase SQL editor (each one is safe to re-run):

`0001_init` → … → `0010_phase1_options` → `0011_fix_place_urls` → `0012_phase2_social`

`0011_fix_place_urls.sql` sửa item bị lưu nhầm thành chữ khi title là URL (Maps → place, khác → link), thêm RPC `update_option` (Lấy lại vị trí).

`0012_phase2_social.sql` (Phase 2): RLS ẩn danh cho `votes` / `qualify_votes` / `match_votes`, `get_room_tallies`, `host_set_anonymous`, `host_set_results_visibility`, bảng `reactions` + `comments`, `og_room_preview`.

Optional env:

- `SUPABASE_SECRET_KEY` — đọc OG an toàn (og_room_preview)
- `NEXT_PUBLIC_SITE_URL` — URL tuyệt đối cho og:url
- `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY` — embed Maps

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm test          # unit test parse Google Maps URL
```

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
