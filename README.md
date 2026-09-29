This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Vote Đi — Supabase migrations

Run the files in `supabase/migrations/` in order in the Supabase SQL editor (each one is safe to re-run):

`0001_init` → `0002_update` → `0003_fix` → `0004_fix_uuid_autodraw` → `0005_seeding` → `0006_fixes` → `0007_upload_password` → `0008_formats_foundation` → `0009_close_room` → `0010_phase1_options` → `0011_fix_place_urls`

`0008_formats_foundation.sql` (Phase 0) adds vote formats (`rooms.format`, `settings`, `deadline`, `result`…), option types on `items`, the `votes` table and the RPCs `create_room_v2`, `add_options`, `cast_vote`, `remove_vote`, `clear_my_votes`, `close_room_if_due`.

`0009_close_room.sql` adds host RPC `close_room` so phòng quick (không hạn giờ) chốt được kết quả từ sheet cài đặt.

`0010_phase1_options.sql` (Phase 1) extends `add_options` for `place` / `link`, and adds `reopen_room`, `host_set_member_options`, `remove_option`.

`0011_fix_place_urls.sql` sửa item bị lưu nhầm thành chữ khi title là URL Maps/link; thêm RPC `update_option` (nút Lấy lại vị trí).

## Environment

Required (đã có từ trước):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Optional (Phase 1):

- `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY` — nếu có thì thẻ địa điểm dùng Maps Embed API; không có thì dùng `maps.google.com/...&output=embed`.

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
