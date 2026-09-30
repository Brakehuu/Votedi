"use client";

import { useMemo, useRef, useState } from "react";
import {
  DAY_PARTS,
  WD_SHORT,
  addDays,
  datesInRange,
  formatDateIso,
  monthGrid,
} from "@/lib/schedule";
import type { ScheduleDayPart, ScheduleMode } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ScheduleSettingsValue = {
  mode: ScheduleMode;
  dates: string[];
  dayParts: ScheduleDayPart[];
  tripLength: number;
  timeSlots: { start: string; end: string }[];
};

export const DEFAULT_SCHEDULE_SETTINGS: ScheduleSettingsValue = {
  mode: "day_parts",
  dates: [],
  dayParts: ["morning", "afternoon", "evening"],
  tripLength: 3,
  timeSlots: [{ start: "19:00", end: "21:00" }],
};

const MODES: { id: ScheduleMode; title: string; body: string }[] = [
  { id: "days", title: "Theo ngày", body: "Chỉ cần biết ngày nào rảnh" },
  { id: "day_parts", title: "Theo buổi", body: "Sáng / Chiều / Tối" },
  { id: "time_slots", title: "Khung giờ", body: "VD họp 19:00–21:00" },
  { id: "trip", title: "Chuyến đi", body: "Tìm khung N ngày liên tiếp" },
];

export function scheduleSettingsError(value: ScheduleSettingsValue): string | null {
  if (value.dates.length < 1) return "Chọn ít nhất 1 ngày.";
  if (value.mode === "trip" && value.dates.length < value.tripLength) {
    return `Chuyến ${value.tripLength} ngày cần chọn ít nhất ${value.tripLength} ngày.`;
  }
  if (value.mode === "day_parts" && value.dayParts.length < 1) return "Chọn ít nhất 1 buổi.";
  if (value.mode === "time_slots") {
    if (value.timeSlots.length < 1) return "Thêm ít nhất 1 khung giờ.";
    if (value.timeSlots.some((row) => !row.start || !row.end || row.start >= row.end)) {
      return "Khung giờ chưa hợp lệ.";
    }
  }
  if (value.dates.length > 60) return "Tối đa 60 ngày.";
  return null;
}

export function scheduleSettingsPayload(value: ScheduleSettingsValue) {
  return {
    schedule_mode: value.mode,
    trip_length: value.tripLength,
    day_parts: value.dayParts,
    time_slots: value.timeSlots,
  };
}

export function ScheduleContentFields({
  value,
  onChange,
}: {
  value: ScheduleSettingsValue;
  onChange: (next: ScheduleSettingsValue) => void;
}) {
  const today = useMemo(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  }, []);
  const [cursor, setCursor] = useState(today);
  const drag = useRef<{ start: string; additive: boolean } | null>(null);
  const [preview, setPreview] = useState<string[] | null>(null);

  const selected = useMemo(() => new Set(value.dates), [value.dates]);
  const shown = preview ? new Set(preview) : selected;
  const cells = monthGrid(cursor.y, cursor.m);

  function commitRange(from: string, to: string, additive: boolean) {
    const range = datesInRange(from, to);
    const next = new Set(value.dates);
    if (additive) {
      for (const d of range) next.delete(d);
    } else {
      for (const d of range) next.add(d);
    }
    onChange({ ...value, dates: [...next].sort() });
  }

  function onPointerDown(iso: string) {
    const additive = selected.has(iso);
    drag.current = { start: iso, additive };
    setPreview(datesInRange(iso, iso));
  }

  function onPointerEnter(iso: string) {
    if (!drag.current) return;
    setPreview(datesInRange(drag.current.start, iso));
  }

  function onPointerUp(iso?: string) {
    if (!drag.current) return;
    const end = iso ?? drag.current.start;
    commitRange(drag.current.start, end, drag.current.additive);
    drag.current = null;
    setPreview(null);
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <span className="text-sm font-semibold">Chế độ</span>
        <div className="grid grid-cols-2 gap-2">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={cn(
                "rounded-2xl border px-3 py-3 text-left transition-colors",
                value.mode === mode.id
                  ? "border-transparent bg-[linear-gradient(#fff,#fff)_padding-box,var(--grad)_border-box] shadow-[0_0_0_3px_rgba(14,165,164,.12)]"
                  : "border-[var(--line)] bg-white",
              )}
              style={
                value.mode === mode.id
                  ? { border: "1.5px solid transparent", background: "linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,#19C9A7,#0891B2) border-box" }
                  : undefined
              }
              onClick={() => onChange({ ...value, mode: mode.id })}
            >
              <b className="block text-sm font-bold">{mode.title}</b>
              <span className="mt-0.5 block text-xs text-muted-foreground">{mode.body}</span>
            </button>
          ))}
        </div>
      </div>

      {value.mode === "day_parts" ? (
        <div className="space-y-2">
          <span className="text-sm font-semibold">Buổi</span>
          <div className="flex flex-wrap gap-2">
            {DAY_PARTS.map((part) => {
              const on = value.dayParts.includes(part.id);
              return (
                <button
                  key={part.id}
                  type="button"
                  className={cn(
                    "rounded-full px-3 py-2 text-sm font-semibold",
                    on ? "bg-primary text-white" : "bg-muted text-muted-foreground",
                  )}
                  onClick={() => {
                    const next = on
                      ? value.dayParts.filter((id) => id !== part.id)
                      : [...value.dayParts, part.id];
                    onChange({ ...value, dayParts: next });
                  }}
                >
                  {part.label}
                  <span className="ml-1 font-normal opacity-80">{part.hours}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {value.mode === "time_slots" ? (
        <div className="space-y-2">
          <span className="text-sm font-semibold">Khung giờ</span>
          {value.timeSlots.map((row, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="time"
                value={row.start}
                className="h-11 flex-1 rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-semibold"
                onChange={(e) => {
                  const timeSlots = value.timeSlots.map((slot, i) =>
                    i === index ? { ...slot, start: e.target.value } : slot,
                  );
                  onChange({ ...value, timeSlots });
                }}
              />
              <span className="text-muted-foreground">→</span>
              <input
                type="time"
                value={row.end}
                className="h-11 flex-1 rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-semibold"
                onChange={(e) => {
                  const timeSlots = value.timeSlots.map((slot, i) =>
                    i === index ? { ...slot, end: e.target.value } : slot,
                  );
                  onChange({ ...value, timeSlots });
                }}
              />
              {value.timeSlots.length > 1 ? (
                <button
                  type="button"
                  className="text-sm font-semibold text-muted-foreground"
                  onClick={() =>
                    onChange({
                      ...value,
                      timeSlots: value.timeSlots.filter((_, i) => i !== index),
                    })
                  }
                >
                  Xóa
                </button>
              ) : null}
            </div>
          ))}
          {value.timeSlots.length < 4 ? (
            <button
              type="button"
              className="text-sm font-semibold text-primary"
              onClick={() =>
                onChange({
                  ...value,
                  timeSlots: [...value.timeSlots, { start: "09:00", end: "11:00" }],
                })
              }
            >
              + Thêm khung
            </button>
          ) : null}
        </div>
      ) : null}

      {value.mode === "trip" ? (
        <label className="flex items-center justify-between gap-3 rounded-2xl bg-muted px-4 py-3">
          <span className="text-sm font-semibold">Độ dài chuyến</span>
          <select
            className="h-10 rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-semibold"
            value={value.tripLength}
            onChange={(e) => onChange({ ...value, tripLength: Number(e.target.value) })}
          >
            {[2, 3, 4, 5, 7].map((n) => (
              <option key={n} value={n}>
                {n} ngày
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold">Chọn ngày</span>
          <small className="text-xs text-muted-foreground">
            {value.dates.length ? `${value.dates.length} ngày · chạm/kéo để chọn` : "Chạm hoặc kéo để chọn dải"}
          </small>
        </div>
        <div className="glass rounded-[22px] p-3 select-none" style={{ touchAction: "none" }}>
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              className="rounded-xl px-3 py-2 text-sm font-semibold hover:bg-black/5"
              onClick={() =>
                setCursor((c) => {
                  const d = new Date(c.y, c.m - 1, 1);
                  return { y: d.getFullYear(), m: d.getMonth() };
                })
              }
            >
              ‹
            </button>
            <b className="text-sm font-extrabold">
              Tháng {cursor.m + 1}, {cursor.y}
            </b>
            <button
              type="button"
              className="rounded-xl px-3 py-2 text-sm font-semibold hover:bg-black/5"
              onClick={() =>
                setCursor((c) => {
                  const d = new Date(c.y, c.m + 1, 1);
                  return { y: d.getFullYear(), m: d.getMonth() };
                })
              }
            >
              ›
            </button>
          </div>
          <div className="mb-2 grid grid-cols-7 gap-1">
            {WD_SHORT.map((d, i) => (
              <span key={d} className={cn("text-center text-[11px] font-bold text-muted-foreground", i >= 5 && "text-primary")}>
                {d}
              </span>
            ))}
          </div>
          <div
            className="grid grid-cols-7 gap-1"
            onPointerLeave={() => {
              if (drag.current) onPointerUp();
            }}
          >
            {cells.map((iso, index) => {
              if (!iso) return <div key={`pad-${index}`} className="aspect-square" />;
              const on = shown.has(iso);
              const past = iso < formatDateIso(new Date());
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={past}
                  className={cn(
                    "aspect-square rounded-xl text-sm font-bold tabular-nums transition-transform active:scale-95",
                    past && "opacity-30",
                    on
                      ? "bg-[linear-gradient(135deg,#19C9A7,#0891B2)] text-white"
                      : "border border-[var(--line)] bg-white",
                  )}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    onPointerDown(iso);
                  }}
                  onPointerEnter={() => onPointerEnter(iso)}
                  onPointerUp={() => onPointerUp(iso)}
                >
                  {Number(iso.slice(8))}
                </button>
              );
            })}
          </div>
          {value.dates.length ? (
            <button
              type="button"
              className="mt-3 text-sm font-semibold text-muted-foreground"
              onClick={() => onChange({ ...value, dates: [] })}
            >
              Xóa hết ngày đã chọn
            </button>
          ) : null}
        </div>
        {value.mode === "trip" && value.dates.length >= 2 ? (
          <p className="text-xs text-muted-foreground">
            Khoảng: {value.dates[0]} → {value.dates[value.dates.length - 1]}
            {value.dates.length < value.tripLength
              ? ` · cần thêm ${value.tripLength - value.dates.length} ngày`
              : ` · tối đa ${Math.max(0, value.dates.filter((_, i, arr) => i + value.tripLength - 1 < arr.length && arr[i + value.tripLength - 1] === addDays(arr[i], value.tripLength - 1)).length)} khung ${value.tripLength} ngày`}
          </p>
        ) : null}
      </div>
    </div>
  );
}
