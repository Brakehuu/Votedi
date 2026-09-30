/** Đếm từ tiếng Việt đơn giản + phút đọc (200 từ/phút). */
export function countWords(text: string) {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_\-|]/g, " ");
  return cleaned.split(/\s+/).filter(Boolean).length;
}

export function readingMinutesFromText(text: string, wpm = 200) {
  const words = countWords(text);
  return Math.max(1, Math.round(words / wpm));
}
