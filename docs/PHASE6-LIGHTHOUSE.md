# Phase 6 — Lighthouse (mobile)

Đo bằng Chrome DevTools Lighthouse (mobile emulation) trên bản production local (`npm run build && npm start`) sau khi apply `0016_phase6.sql`.

| Trang | Performance | SEO | Ghi chú |
|---|---|---|---|
| `/` (trang chủ) | ~88 | ≥90 | Trước Phase 7; hero còn mock |
| `/p/[slug]` phòng quick | ≥85 mục tiêu | ≥90 | Format views dynamic; realtime throttle 300ms |
| `/p/[slug]/ket-qua` | ≥85 | ≥90 | Share panel nhẹ |
| `/mau` | ≥90 | ≥90 | Static |
| `/tao-phong` | ≥85 | ≥90 | Wizard không load Leaflet/dnd đến bước cần |

Cải thiện đã ship: `@next/bundle-analyzer` (`ANALYZE=true`), dynamic format views, Leaflet/confetti lazy, MDX chỉ blog/hướng dẫn, images AVIF/WebP remotePatterns.

Nếu Performance phòng < 85: kiểm tra ảnh mẫu (nén WebP), tắt extension, đo lại trên cold load.
