/** Ngày hiển thị mọi nơi: dd/MM/yyyy (Asia/Ho_Chi_Minh). */
export function formatDateVi(iso: string) {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  try {
    const d = new Date(/T/.test(iso) ? iso : `${iso}T12:00:00+07:00`);
    if (Number.isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
  } catch {
    return iso;
  }
}

/** Bài < 2 phút: "Đọc trong 1 phút"; còn lại "N phút đọc". */
export function readingLabel(minutes: number) {
  const n = Math.max(1, Math.round(minutes));
  if (n < 2) return "Đọc trong 1 phút";
  return `${n} phút đọc`;
}
