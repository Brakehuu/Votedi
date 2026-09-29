This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Vote Đi — Supabase migrations

Run the files in `supabase/migrations/` in order in the Supabase SQL editor (each one is safe to re-run):

`0001_init` → `0002_update` → `0003_fix` → `0004_fix_uuid_autodraw` → `0005_seeding` → `0006_fixes` → `0007_upload_password` → `0008_formats_foundation` → `0009_close_room`

`0008_formats_foundation.sql` (Phase 0) adds vote formats (`rooms.format`, `settings`, `deadline`, `result`…), option types on `items`, the `votes` table and the RPCs `create_room_v2`, `add_options`, `cast_vote`, `remove_vote`, `clear_my_votes`, `close_room_if_due`.

`0009_close_room.sql` adds host RPC `close_room` so phòng quick (không hạn giờ) chốt được kết quả từ sheet cài đặt. No new environment variables.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
