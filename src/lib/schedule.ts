import type { ScheduleAnswerValue, ScheduleDayPart, ScheduleMode, ScheduleSlot } from "@/lib/types";

export const DAY_PARTS: { id: ScheduleDayPart; label: string; hours: string }[] = [
  { id: "morning", label: "Sáng", hours: "7h–11h" },
  { id: "afternoon", label: "Chiều", hours: "13h–17h" },
  { id: "evening", label: "Tối", hours: "18h–22h" },
];

export const WD_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"] as const;
export const WD_LONG = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"] as const;

/** Parse YYYY-MM-DD as local calendar date (Asia/Ho_Chi_Minh intent). */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(iso: string, n: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + n);
  return formatDateIso(d);
}

export function formatDayShort(iso: string): string {
  const d = parseDate(iso);
  return `${WD_SHORT[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

export function formatDayLong(iso: string): string {
  const d = parseDate(iso);
  return `${WD_LONG[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}`;
}

export function answerScore(answer: ScheduleAnswerValue | null | undefined): number {
  if (answer === "yes") return 1;
  if (answer === "maybe") return 0.5;
  return 0;
}

export function slotLabel(slot: Pick<ScheduleSlot, "slot_date" | "part" | "start_time" | "end_time">): string {
  if (slot.part) {
    const part = DAY_PARTS.find((row) => row.id === slot.part);
    return `${part?.label ?? slot.part} ${formatDayShort(slot.slot_date)}`;
  }
  if (slot.start_time) {
    const start = slot.start_time.slice(0, 5);
    const end = slot.end_time ? slot.end_time.slice(0, 5) : "";
    return `${formatDayShort(slot.slot_date)} ${start}${end ? `–${end}` : ""}`;
  }
  return formatDayShort(slot.slot_date);
}

export type SlotDraft = {
  date: string;
  part?: ScheduleDayPart | null;
  start_time?: string | null;
  end_time?: string | null;
};

export function buildSlotDrafts(
  dates: string[],
  mode: ScheduleMode,
  dayParts: ScheduleDayPart[] = ["morning", "afternoon", "evening"],
  timeSlots: { start: string; end: string }[] = [{ start: "19:00", end: "21:00" }],
): SlotDraft[] {
  const sorted = [...new Set(dates)].sort();
  if (mode === "days" || mode === "trip") {
    return sorted.map((date) => ({ date, part: null, start_time: null, end_time: null }));
  }
  if (mode === "day_parts") {
    const parts = dayParts.length ? dayParts : (["morning", "afternoon", "evening"] as ScheduleDayPart[]);
    return sorted.flatMap((date) => parts.map((part) => ({ date, part, start_time: null, end_time: null })));
  }
  const slots = timeSlots.length ? timeSlots : [{ start: "19:00", end: "21:00" }];
  return sorted.flatMap((date) =>
    slots.map((row) => ({
      date,
      part: null,
      start_time: row.start,
      end_time: row.end,
    })),
  );
}

export type MemberAnswerMap = Record<string, ScheduleAnswerValue | undefined>;

export type RankedSlot = {
  slot: ScheduleSlot;
  score: number;
  yes: string[];
  maybe: string[];
  no: string[];
  miss: string[];
};

export function rankSlots(
  slots: ScheduleSlot[],
  answersBySlot: Map<string, MemberAnswerMap>,
  memberIds: string[],
): RankedSlot[] {
  return slots
    .map((slot) => {
      const map = answersBySlot.get(slot.id) ?? {};
      const yes = memberIds.filter((id) => map[id] === "yes");
      const maybe = memberIds.filter((id) => map[id] === "maybe");
      const no = memberIds.filter((id) => map[id] === "no");
      const miss = memberIds.filter((id) => map[id] !== "yes" && map[id] !== "maybe");
      const score = yes.length + maybe.length * 0.5;
      return { slot, score, yes, maybe, no, miss };
    })
    .sort((a, b) => b.score - a.score || b.yes.length - a.yes.length || a.slot.position - b.slot.position);
}

export type TripWindow = {
  start: string;
  end: string;
  dates: string[];
  score: number;
  full: string[];
  part: string[];
  out: string[];
};

/** Find consecutive N-day windows; return all sorted by score. */
export function findTripWindows(
  dates: string[],
  answersByDate: Map<string, MemberAnswerMap>,
  memberIds: string[],
  length: number,
): TripWindow[] {
  const sorted = [...new Set(dates)].sort();
  const out: TripWindow[] = [];
  for (let i = 0; i + length - 1 < sorted.length; i++) {
    const start = sorted[i];
    const end = sorted[i + length - 1];
    if (end !== addDays(start, length - 1)) continue;
    const windowDates = sorted.slice(i, i + length);
    const full: string[] = [];
    const part: string[] = [];
    const miss: string[] = [];
    for (const mid of memberIds) {
      const states = windowDates.map((d) => answersByDate.get(d)?.[mid]);
      if (states.every((s) => s === "yes")) full.push(mid);
      else if (states.every((s) => s === "yes" || s === "maybe")) part.push(mid);
      else miss.push(mid);
    }
    out.push({
      start,
      end,
      dates: windowDates,
      score: full.length + part.length * 0.5,
      full,
      part,
      out: miss,
    });
  }
  return out.sort((a, b) => b.score - a.score || b.full.length - a.full.length || a.start.localeCompare(b.start));
}

/** Top N non-overlapping windows (greedy by score). */
export function topNonOverlapping(windows: TripWindow[], n = 3): TripWindow[] {
  const picked: TripWindow[] = [];
  for (const w of windows) {
    if (picked.every((p) => w.start > p.end || w.end < p.start)) {
      picked.push(w);
      if (picked.length >= n) break;
    }
  }
  return picked;
}

export function googleCalendarUrl(opts: {
  title: string;
  start: string;
  endInclusive: string;
}): string {
  const start = opts.start.replace(/-/g, "");
  const endExclusive = addDays(opts.endInclusive, 1).replace(/-/g, "");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(opts.title)}&dates=${start}/${endExclusive}`;
}

export function buildIcs(opts: {
  title: string;
  start: string;
  endInclusive: string;
  uid?: string;
}): string {
  const start = opts.start.replace(/-/g, "");
  const endExclusive = addDays(opts.endInclusive, 1).replace(/-/g, "");
  const uid = opts.uid ?? `${Date.now()}@votedi.vn`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vote Di//VI",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${endExclusive}`,
    `SUMMARY:${opts.title.replace(/\r?\n/g, " ")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Fill dates between two inclusive ISO dates (drag select). */
export function datesInRange(a: string, b: string): string[] {
  const start = a < b ? a : b;
  const end = a < b ? b : a;
  const out: string[] = [];
  let cur = start;
  while (cur <= end) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

export function monthGrid(year: number, month0: number): (string | null)[] {
  const first = new Date(year, month0, 1);
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  // Monday-first offset
  const offset = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = Array.from({ length: offset }, () => null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(formatDateIso(new Date(year, month0, d)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
