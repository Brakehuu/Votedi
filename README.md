This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Vote Đi — Supabase migrations

Run the files in `supabase/migrations/` **in order** in the Supabase SQL editor (each one is safe to re-run):

`0001` → … → `0014_phase4` → **`0015_feedback`**

Phase gần đây:
- `0013_schedule.sql` — chọn lịch rảnh
- `0014_phase4.sql` — swipe / ranking / rating / group_knockout
- `0015_feedback.sql` — bảng `feedback` + RPC `submit_feedback` (trang Liên hệ)

Kiểm tra schema so với code:

```bash
npm run db:check
```

(cần `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SECRET_KEY` trong `.env.local`)

Optional env:

- `SUPABASE_SECRET_KEY` — OG an toàn + `db:check` + góp ý
- `NEXT_PUBLIC_SITE_URL` — URL tuyệt đối cho canonical / OG
- `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY` — embed Maps

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm test
npm run db:check
```

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
