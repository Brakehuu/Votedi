# Phase 6 — Rà soát kiểu vote

Kiểm tra thủ công (Chrome ẩn danh × 2–3 cửa sổ) + unit/e2e hỗ trợ. Cập nhật sau khi fix Fail.

| Kiểu | Tạo→mời→vote→realtime→chốt→/ket-qua→share | Kết quả |
|---|---|---|
| quick | Pass | Pass |
| bracket / qualify_knockout | Pass | Pass |
| bracket / knockout | Pass | Pass |
| bracket / group_knockout | Pass | Pass |
| schedule / days | Pass | Pass |
| schedule / day_parts | Pass | Pass |
| schedule / time_slots | Pass | Pass |
| schedule / trip | Pass | Pass |
| swipe | Pass | Pass |
| ranking | Pass | Pass |
| rating | Pass | Pass |

E2E: `e2e/formats.spec.ts` (2 browser context / kiểu tạo phòng + axe home). Chạy: `PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e`.

Migration bắt buộc trước khi my-rooms/duplicate/delete hoạt động trên DB: `supabase/migrations/0016_phase6.sql`.
