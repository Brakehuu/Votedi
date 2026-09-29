const MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Phiên đăng nhập hết hạn. Tải lại trang nhé.",
  NOT_MEMBER: "Bạn chưa vào phòng này.",
  NOT_HOST: "Chỉ chủ phòng làm được việc này.",
  NOT_FOUND: "Không tìm thấy phòng.",
  ROOM_NOT_FOUND: "Không tìm thấy phòng. Kiểm tra lại link hoặc hỏi chủ phòng.",
  BAD_PASSWORD_FORMAT: "Mật khẩu phòng từ 4 đến 72 ký tự.",
  BAD_PASSWORD: "Mật khẩu không đúng. Hỏi lại chủ phòng rồi thử lần nữa.",
  PASSWORD_REQUIRED: "Phòng này có mật khẩu. Nhập mật khẩu để vào.",
  UPLOAD_DISABLED: "Chủ phòng chưa cho thành viên tải mẫu.",
  ROOM_LOCKED: "Phòng đã khóa, không nhận thêm người mới. Nhờ chủ phòng mở khóa nếu cần.",
  KICKED: "Bạn đã bị chủ phòng mời ra khỏi phòng này.",
  NOT_ENOUGH_ITEMS: "Cần ít nhất 2 mẫu trước khi tiếp tục.",
  ITEM_COUNT: "Cần từ 2 đến 16 mẫu để bốc thăm.",
  NEED_DRAW: "Cần ít nhất 2 mẫu để xếp nhánh trước khi bắt đầu đấu.",
  VOTE_LIMIT: "Bạn đã dùng hết phiếu.",
  ALREADY_VOTED: "Bạn đã vote mẫu này rồi.",
  BAD_STATUS: "Phòng chưa ở giai đoạn này. Kiểm tra lại rồi thử.",
  DEADLINE: "Đã hết giờ vote.",
  BAD_ITEM: "Mẫu không hợp lệ.",
  INVALID: "Thông tin chưa hợp lệ.",
  BAD_SIZE: "Số mẫu knockout phải từ 2 đến 16.",
  BAD_TYPE: "Chỉ nhận ảnh PNG, JPG hoặc WEBP.",
  BAD_IMAGE: "Không đọc được ảnh này. Thử ảnh khác nhé.",
  TOO_LARGE: "Ảnh lớn hơn 10MB. Hãy nén nhỏ hơn rồi tải lại.",
  TOO_MANY_ITEMS: "Mỗi phòng tối đa 32 mẫu.",
  KNOCKOUT_MAX_ITEMS: "Knockout tối đa 16 mẫu.",
  PGRST202: "Chưa có hàm trên Supabase (schema cache). Chạy 0007_upload_password.sql rồi thử lại.",
  PGRST204: "Thiếu cột trên bảng. Chạy lần lượt 0002 → 0003 → 0004 → 0005 → 0006 → 0007.",
};

type ErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  name?: string;
};

function asError(error: unknown): ErrorLike {
  if (!error || typeof error !== "object") {
    return { message: String(error ?? "") };
  }
  return error as ErrorLike;
}

/** Dịch mã quen thuộc; lỗi lạ giữ nguyên message (+ code). */
export function errorMessage(error: unknown): string {
  const err = asError(error);
  const raw = err.message ?? "";
  const code = err.code ?? "";

  for (const [key, text] of Object.entries(MESSAGES)) {
    if (raw.includes(key) || code === key) return text;
  }
  if (/anonymous/i.test(raw)) {
    return "Hãy bật Anonymous sign-in trong Supabase rồi tải lại trang.";
  }
  if (/Failed to find|Could not find the function|schema cache/i.test(raw)) {
    return `Chưa có RPC trên server (schema cache). Chạy lần lượt 0006_fixes.sql và 0007_upload_password.sql rồi thử lại. Chi tiết: ${raw}${code ? ` · ${code}` : ""}`;
  }
  if (/Failed to fetch|NetworkError|network/i.test(raw)) {
    return "Mất mạng. Kiểm tra kết nối rồi thử lại.";
  }
  if (/check constraint|rooms_status_check/i.test(raw)) {
    return `Trạng thái phòng không hợp lệ. Chạy 0004 rồi 0005_seeding.sql. Chi tiết: ${raw}`;
  }
  if (/function max\(uuid\)|42883/i.test(raw)) {
    return `Lỗi SQL max(uuid). Chạy supabase/migrations/0004_fix_uuid_autodraw.sql rồi thử lại. Chi tiết: ${raw}${code ? ` · ${code}` : ""}`;
  }
  if (/is ambiguous|42702/i.test(raw) || code === "42702") {
    return `Lỗi SQL khi xếp nhánh. Chạy supabase/migrations/0007_upload_password.sql rồi thử lại. Chi tiết: ${raw}`;
  }
  if (/row-level security/i.test(raw) || code === "42501") {
    return `Supabase chặn quyền ghi (RLS). Chạy supabase/migrations/0007_upload_password.sql rồi thử lại. Chi tiết: ${raw}`;
  }
  if (/has_password|password_hash.*not-null/i.test(raw)) {
    return `Database chưa cập nhật phần mật khẩu. Chạy supabase/migrations/0007_upload_password.sql rồi thử lại. Chi tiết: ${raw}`;
  }
  if (/seeding_mode|column .* does not exist/i.test(raw)) {
    return `Thiếu cột seeding_mode. Chạy supabase/migrations/0005_seeding.sql rồi thử lại. Chi tiết: ${raw}`;
  }

  const bits = [raw || null, code || null].filter(Boolean);
  return bits.length > 0 ? bits.join(" · ") : "Có lỗi xảy ra. Thử lại nhé.";
}

/** console.error đầy đủ + trả về chuỗi toast. */
export function reportError(error: unknown): string {
  console.error("[Vote Đi]", error);
  return errorMessage(error);
}
