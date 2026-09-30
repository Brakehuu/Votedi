# Bảo mật Vote Đi

Cập nhật: Phase 6 (2026-09-30).

## Nguyên tắc

- Mọi ghi dữ liệu phòng qua RPC `SECURITY DEFINER` có kiểm tra `auth.uid()`, quyền host (khi cần) và trạng thái phòng.
- Client không dùng service role. `SUPABASE_SECRET_KEY` chỉ server (OG, `db:check`, feedback).
- Không lộ PII trong analytics (chỉ sự kiện ẩn danh: tạo phòng theo kiểu/mẫu, join, vote, chốt, share).

## RLS (tóm tắt)

| Bảng | SELECT | Ghi |
|---|---|---|
| `rooms` / `members` / `items` | Thành viên chưa bị kick (`is_room_member`) | Qua RPC |
| `votes` / `qualify_votes` / `match_votes` | Thành viên; phòng **ẩn danh** chỉ thấy phiếu của mình | RPC `cast_*` |
| `reactions` / `comments` | Thành viên | RPC |
| `schedule_*` | Thành viên (answers ẩn danh: chỉ dòng của mình) | RPC |
| `room_judges` | Thành viên | RPC `set_judges` (host) |
| `feedback` | Không (service) | RPC `submit_feedback` |

Realtime: client chỉ subscribe khi đã là thành viên phòng. Payload phiếu trên phòng ẩn danh bị RLS cắt theo policy SELECT.

## RPC nhạy cảm

- `create_room` / `create_room_v2`: rate limit **10 phòng / giờ / user** (`_assert_create_room_rate`).
- `add_comment`: rate limit (Phase 2).
- `submit_feedback`: honeypot + **3 / giờ / ip_hash**.
- `duplicate_room` / `delete_room`: chỉ host (`_require_host`).
- `delete_room` trả `storage_paths` để client xoá object trong bucket `items`.

## Storage (`items`)

- Upload: authenticated, path `avatars/{uid}/…` hoặc `{room_id}/…` và phải là thành viên phòng.
- MIME: ảnh (bucket config); giới hạn **10MB** (`file_size_limit`).
- Public read ảnh; xoá/update cùng điều kiện thành viên / chủ avatar.

## Unfurl / Maps resolve

- Route server chống SSRF (DNS + chặn IP nội bộ), timeout, redirect tối đa.
- Rate limit unfurl ~20/phút/user (in-memory).

## Dọn dữ liệu

- `cleanup_stale_rooms()`: xoá phòng đã chốt / đóng > 90 ngày, hoặc phòng mở/lobby > 90 ngày không có phiếu.
- Lên lịch `pg_cron` `15 3 * * *` nếu extension có sẵn (Supabase Pro / tự bật).

## Kiểm tra định kỳ

```bash
npm run db:check
```

Đọc OpenAPI PostgREST; thiếu RPC/bảng → in migration gợi ý.
