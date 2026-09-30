"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MemberAvatar } from "@/components/room/member-avatar";
import { useRoom } from "@/components/room/room-context";
import {
  DAY_PARTS,
  WD_SHORT,
  buildIcs,
  downloadIcs,
  findTripWindows,
  formatDayLong,
  formatDayShort,
  googleCalendarUrl,
  monthGrid,
  parseDate,
  rankSlots,
  slotLabel,
  topNonOverlapping,
} from "@/lib/schedule";
import type {
  Member,
  ScheduleAnswerValue,
  ScheduleDayPart,
  ScheduleSlot,
  ScheduleTallySlot,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const LBL: Record<ScheduleAnswerValue, string> = {
  yes: "Rảnh",
  maybe: "Có thể",
  no: "Bận",
};

function YesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function MaybeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 9c1.5-2 3-2 5 0s3.5 2 5 0" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
function NoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
function EraseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M6 13h7M3.5 9.5l5-5a1.4 1.4 0 0 1 2 0l2 2a1.4 1.4 0 0 1 0 2L8 13H6z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function AvatarStack({
  members,
  anonymous,
  count,
}: {
  members: Member[];
  anonymous?: boolean;
  count?: number;
}) {
  if (anonymous) {
    const n = count ?? members.length;
    return n > 0 ? <em className="not-italic text-xs font-semibold text-muted-foreground">{n} người</em> : null;
  }
  if (!members.length) return null;
  return (
    <span className="flex">
      {members.slice(0, 5).map((m, i) => (
        <MemberAvatar
          key={m.id}
          member={m}
          className={cn("size-5 border-[1.5px] border-white text-[9px]", i > 0 && "-ml-1.5")}
        />
      ))}
    </span>
  );
}

export function ScheduleVoteView() {
  const { bundle, me, setScheduleAnswers, closeRoom, reopenRoom, closeIfDue } = useRoom();
  const { room } = bundle;
  const mode = room.settings.schedule_mode ?? "day_parts";
  const tripLength = room.settings.trip_length ?? 3;
  const closed = room.status === "closed";
  const anonymous = room.anonymous;
  const talliesVisible = bundle.scheduleTallies?.visible !== false;
  const memberIds = useMemo(() => bundle.members.map((m) => m.id), [bundle.members]);
  const memberById = useMemo(() => new Map(bundle.members.map((m) => [m.id, m])), [bundle.members]);
  const n = memberIds.length;

  const myAnswers = useMemo(() => {
    const map = new Map<string, ScheduleAnswerValue>();
    for (const a of bundle.scheduleAnswers) {
      if (a.member_id === me.id) map.set(a.slot_id, a.answer);
    }
    return map;
  }, [bundle.scheduleAnswers, me.id]);

  const answersBySlot = useMemo(() => {
    const map = new Map<string, Record<string, ScheduleAnswerValue | undefined>>();
    for (const a of bundle.scheduleAnswers) {
      const row = map.get(a.slot_id) ?? {};
      row[a.member_id] = a.answer;
      map.set(a.slot_id, row);
    }
    return map;
  }, [bundle.scheduleAnswers]);

  const tallyBySlot = useMemo(() => {
    const map = new Map<string, ScheduleTallySlot>();
    for (const s of bundle.scheduleTallies?.slots ?? []) map.set(s.slot_id, s);
    return map;
  }, [bundle.scheduleTallies]);

  const [localMine, setLocalMine] = useState<Map<string, ScheduleAnswerValue | null>>(new Map());
  const debounceTimer = useRef<number | undefined>(undefined);
  const debounceBuf = useRef<Map<string, ScheduleAnswerValue | null>>(new Map());

  const getMine = useCallback(
    (slotId: string): ScheduleAnswerValue | undefined => {
      if (localMine.has(slotId)) {
        const v = localMine.get(slotId);
        return v ?? undefined;
      }
      return myAnswers.get(slotId);
    },
    [localMine, myAnswers],
  );

  const saveMine = useCallback(
    (slotId: string, answer: ScheduleAnswerValue | null) => {
      if (closed) return;
      setLocalMine((prev) => new Map(prev).set(slotId, answer));
      debounceBuf.current.set(slotId, answer);
      window.clearTimeout(debounceTimer.current);
      debounceTimer.current = window.setTimeout(() => {
        const batch = [...debounceBuf.current.entries()].map(([slot_id, ans]) => ({
          slot_id,
          answer: ans,
        }));
        debounceBuf.current.clear();
        void setScheduleAnswers(batch).then(() => {
          setLocalMine((prev) => {
            const next = new Map(prev);
            for (const row of batch) next.delete(row.slot_id);
            return next;
          });
        });
      }, 400);
      try {
        navigator.vibrate?.(8);
      } catch {
        /* ignore */
      }
    },
    [closed, setScheduleAnswers],
  );

  useEffect(() => () => window.clearTimeout(debounceTimer.current), []);

  const slots = bundle.scheduleSlots;
  const dates = useMemo(
    () => [...new Set(slots.map((s) => s.slot_date))].sort(),
    [slots],
  );

  const ranked = useMemo(() => {
    if (!talliesVisible && !me.is_host) return [];
    if (mode === "trip") return [];
    if (anonymous || !talliesVisible) {
      // use tallies counts only
      return [...slots]
        .map((slot) => {
          const t = tallyBySlot.get(slot.id);
          const score = t?.score ?? 0;
          const yes = (t?.yes_ids ?? []).map((id) => id);
          const maybe = (t?.maybe_ids ?? []).map((id) => id);
          const miss = memberIds.filter((id) => !yes.includes(id) && !maybe.includes(id));
          return {
            slot,
            score,
            yes,
            maybe,
            no: t?.no_ids ?? [],
            miss,
            yesCount: t?.yes_count ?? yes.length,
            maybeCount: t?.maybe_count ?? maybe.length,
          };
        })
        .sort((a, b) => b.score - a.score || b.yesCount - a.yesCount)
        .slice(0, 3);
    }
    return rankSlots(slots, answersBySlot, memberIds)
      .slice(0, 3)
      .map((r) => ({
        ...r,
        yesCount: r.yes.length,
        maybeCount: r.maybe.length,
      }));
  }, [anonymous, answersBySlot, me.is_host, memberIds, mode, slots, talliesVisible, tallyBySlot]);

  const tripWindows = useMemo(() => {
    if (mode !== "trip") return [];
    // Prefer client calc when we can see member answers (not anonymous)
    if (!anonymous) {
      const byDate = new Map<string, Record<string, ScheduleAnswerValue | undefined>>();
      for (const slot of slots) {
        const row = { ...(answersBySlot.get(slot.id) ?? {}) };
        const mineAns = getMine(slot.id);
        if (mineAns) row[me.id] = mineAns;
        else if (localMine.has(slot.id) && localMine.get(slot.id) === null) delete row[me.id];
        byDate.set(slot.slot_date, row);
      }
      return topNonOverlapping(findTripWindows(dates, byDate, memberIds, tripLength), 3);
    }
    // Anonymous: use server tallies (counts only)
    const rows = bundle.scheduleTripWindows?.windows ?? [];
    if (!bundle.scheduleTripWindows?.visible && !me.is_host) return [];
    const mapped = rows.map((w) => ({
      start: w.start,
      end: w.end,
      dates: [] as string[],
      score: w.score,
      full: Array.from({ length: w.full }, (_, i) => `f${i}`),
      part: Array.from({ length: w.part }, (_, i) => `p${i}`),
      out: Array.from({ length: w.out }, (_, i) => `o${i}`),
    }));
    return topNonOverlapping(mapped, 3);
  }, [
    anonymous,
    answersBySlot,
    bundle.scheduleTripWindows,
    dates,
    getMine,
    localMine,
    me.id,
    me.is_host,
    memberIds,
    mode,
    slots,
    tripLength,
  ]);

  const myNote = bundle.scheduleNotes.find((n) => n.member_id === me.id)?.note ?? "";
  const [noteDraft, setNoteDraft] = useState(myNote);

  useEffect(() => {
    void closeIfDue();
  }, [closeIfDue]);

  const result = room.result;
  const winnerLabel =
    result?.winner_label ??
    (result?.winner_start && result?.winner_end
      ? `${formatDayShort(result.winner_start)} → ${formatDayShort(result.winner_end)}`
      : null);

  const modeTag =
    mode === "trip"
      ? "Chuyến đi"
      : mode === "days"
        ? "Theo ngày"
        : mode === "time_slots"
          ? "Khung giờ"
          : "Theo buổi";

  return (
    <div className="pb-28">
      <section className="glass mt-2 rounded-[24px] p-[18px]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--soft,#E3F6F5)] px-2.5 py-1 text-[13px] font-semibold text-[var(--jade-d,#0B7F7A)]">
          Chọn lịch rảnh · {modeTag}
        </span>
        <h1 className="mt-2.5 text-[21px] font-extrabold tracking-tight leading-snug">
          {mode === "trip"
            ? `Khi nào cả nhóm đi được ${tripLength} ngày?`
            : mode === "days"
              ? "Ngày nào cả nhóm rảnh nhất?"
              : "Buổi nào cả nhóm rảnh nhất?"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "trip"
            ? "Chọn cọ ở dưới rồi chạm hoặc kéo qua các ngày để tô. Hệ thống tự tìm khung đẹp nhất."
            : "Trả lời nhanh từng khung, hoặc chạm thẳng vào ô trên lưới để sửa. Đổi thoải mái tới khi chủ phòng chốt."}
        </p>
        <div className="mt-3.5 flex flex-wrap gap-3.5 text-[13px] font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <i className="grid size-[18px] place-items-center rounded-md bg-[#0EA5A4] text-[11px] font-extrabold text-white">
              <YesIcon className="size-2.5" />
            </i>
            Rảnh
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="grid size-[18px] place-items-center rounded-md bg-[#F5A524] text-[11px] font-extrabold text-white">
              <MaybeIcon className="size-2.5" />
            </i>
            Có thể
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="grid size-[18px] place-items-center rounded-md bg-[#6B7F84] text-[11px] font-extrabold text-white">
              <NoIcon className="size-2.5" />
            </i>
            Bận
          </span>
        </div>
      </section>

      {closed && winnerLabel ? (
        <section className="relative mt-3.5 overflow-hidden rounded-[24px] bg-[#0C1B20] p-5 text-[#E8F4F4]">
          <div className="pointer-events-none absolute -right-[110px] -top-[140px] size-[280px] rounded-full bg-[linear-gradient(135deg,#19C9A7,#0891B2)] opacity-55 blur-[70px]" />
          <small className="relative text-[12.5px] font-semibold text-[#7FE0CF]">Nhóm đã chốt</small>
          <b className="relative mt-1 block text-xl font-extrabold tracking-tight">{winnerLabel}</b>
          <p className="relative mt-0.5 text-[13.5px] text-[#9FB6BA]">
            {result?.tied ? "Có nhiều lựa chọn ngang điểm" : "Kết quả chính thức"}
          </p>
          <div className="relative mt-3.5 flex flex-wrap gap-2">
            {result?.winner_start && result?.winner_end ? (
              <>
                <a
                  className="inline-flex h-[42px] items-center rounded-full bg-white px-4 text-sm font-semibold text-[#0C1B20]"
                  href={googleCalendarUrl({
                    title: room.name,
                    start: result.winner_start,
                    endInclusive: result.winner_end,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Thêm vào Google Calendar
                </a>
                <button
                  type="button"
                  className="inline-flex h-[42px] items-center rounded-full border border-white/30 px-4 text-sm font-semibold text-white"
                  onClick={() =>
                    downloadIcs(
                      "votedi.ics",
                      buildIcs({
                        title: room.name,
                        start: result.winner_start!,
                        endInclusive: result.winner_end!,
                      }),
                    )
                  }
                >
                  Tải file lịch
                </button>
              </>
            ) : null}
            {me.is_host ? (
              <button
                type="button"
                className="inline-flex h-[42px] items-center rounded-full border border-white/30 px-4 text-sm font-semibold text-white"
                onClick={() => void reopenRoom()}
              >
                Mở lại
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {!talliesVisible && !closed ? (
        <p className="mt-4 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          {room.results_visibility === "after_vote"
            ? "Trả lời ít nhất một khung để xem kết quả nhóm."
            : "Kết quả nhóm hiện sau khi chủ phòng chốt."}
        </p>
      ) : null}

      {mode === "trip" ? (
        <TripView
          slots={slots}
          dates={dates}
          tripLength={tripLength}
          windows={tripWindows}
          getMine={getMine}
          saveMine={saveMine}
          answersBySlot={answersBySlot}
          memberById={memberById}
          memberIds={memberIds}
          anonymous={anonymous}
          closed={closed}
          talliesVisible={talliesVisible}
          n={n}
        />
      ) : (
        <GridView
          slots={slots}
          dates={dates}
          mode={mode}
          ranked={ranked}
          getMine={getMine}
          saveMine={saveMine}
          answersBySlot={answersBySlot}
          tallyBySlot={tallyBySlot}
          memberById={memberById}
          memberIds={memberIds}
          anonymous={anonymous}
          closed={closed}
          talliesVisible={talliesVisible}
          n={n}
        />
      )}

      <section className="glass mt-2.5 rounded-[22px] p-4">
        <h3 className="text-[15px] font-extrabold">Ghi chú</h3>
        {!closed ? (
          <div className="mt-2.5 flex gap-2">
            <input
              className="h-11 min-w-0 flex-1 rounded-[14px] border-[1.5px] border-[var(--line,#D8E6E6)] bg-white px-3.5 text-[14.5px] outline-none"
              maxLength={120}
              value={noteDraft}
              placeholder="VD: mình chỉ rảnh sau 17h"
              onChange={(e) => setNoteDraft(e.target.value)}
            />
            <button
              type="button"
              className="inline-flex h-11 items-center rounded-full bg-[#0C1B20] px-4 text-sm font-semibold text-white"
              onClick={() => void setScheduleAnswers([], noteDraft.slice(0, 120))}
            >
              Lưu
            </button>
          </div>
        ) : null}
        <div className="mt-1">
          {bundle.scheduleNotes.map((note) => {
            const author = memberById.get(note.member_id);
            return (
              <div key={note.member_id} className="mt-2.5 flex gap-2.5 text-sm">
                {author && !anonymous ? (
                  <MemberAvatar member={author} className="size-7 text-[11px]" />
                ) : (
                  <span className="grid size-7 place-items-center rounded-full bg-muted text-[11px] font-bold">?</span>
                )}
                <div>
                  <b className="font-bold">{anonymous ? "Thành viên" : author?.display_name ?? "Thành viên"}</b>{" "}
                  <span className="text-muted-foreground">{note.note}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {!closed && me.is_host ? (
        <button
          type="button"
          className="btn-p mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#19C9A7,#0EA5A4,#0891B2)] text-[14.5px] font-semibold text-white shadow-[0_0_0_4px_rgba(14,165,164,.14)]"
          onClick={() => void closeRoom()}
        >
          Chốt lựa chọn số 1
        </button>
      ) : null}
    </div>
  );
}

type RankedRow = {
  slot: ScheduleSlot;
  score: number;
  yes: string[];
  maybe: string[];
  miss: string[];
  yesCount: number;
  maybeCount: number;
};

function BestPicks({
  ranked,
  anonymous,
  memberById,
  n,
  onPick,
  ratioLabel,
}: {
  ranked: RankedRow[];
  anonymous: boolean;
  memberById: Map<string, Member>;
  n: number;
  onPick?: (slotId: string) => void;
  ratioLabel: string;
}) {
  if (!ranked.length) return null;
  return (
    <>
      <div className="mt-[22px] mb-2.5 flex items-baseline justify-between px-0.5">
        <h2 className="text-[17px] font-extrabold">Buổi đẹp nhất</h2>
        <small className="text-[13px] text-muted-foreground">Rảnh = 1 · Có thể = ½</small>
      </div>
      <div className="grid gap-2.5">
        {ranked.map((row, i) => (
          <button
            key={row.slot.id}
            type="button"
            className={cn(
              "grid w-full grid-cols-[auto_1fr_auto] items-center gap-3.5 rounded-[20px] border-[1.5px] border-[var(--line,#D8E6E6)] bg-white p-3.5 text-left",
              i === 0 && "border-transparent shadow-[0_0_0_4px_rgba(14,165,164,.1)]",
            )}
            style={
              i === 0
                ? {
                    background:
                      "linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,#19C9A7,#0EA5A4,#0891B2) border-box",
                    border: "1.5px solid transparent",
                  }
                : undefined
            }
            onClick={() => onPick?.(row.slot.id)}
          >
            <span
              className={cn(
                "grid size-10 place-items-center rounded-[13px] text-[15px] font-extrabold",
                i === 0 ? "bg-[linear-gradient(135deg,#19C9A7,#0891B2)] text-white" : "bg-[#EEF4F4] text-muted-foreground",
              )}
            >
              {i + 1}
            </span>
            <span>
              <b className="block text-[15.5px] font-bold leading-snug">{slotLabel(row.slot)}</b>
              <span className="mt-0.5 block text-[13px] text-muted-foreground">
                {row.yesCount} rảnh{row.maybeCount ? ` · ${row.maybeCount} có thể` : ""}
              </span>
              <span className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                {row.miss.length ? (
                  <>
                    Không đi được:{" "}
                    <AvatarStack
                      members={row.miss.map((id) => memberById.get(id)!).filter(Boolean)}
                      anonymous={anonymous}
                      count={row.miss.length}
                    />
                  </>
                ) : (
                  "Cả nhóm đều được 🎉"
                )}
              </span>
            </span>
            <span className="text-right">
              <b className="text-xl font-extrabold tabular-nums">
                {row.yesCount}/{n}
              </b>
              <small className="block text-[11.5px] font-semibold text-muted-foreground">{ratioLabel}</small>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function GridView({
  slots,
  dates,
  mode,
  ranked,
  getMine,
  saveMine,
  answersBySlot,
  tallyBySlot,
  memberById,
  memberIds,
  anonymous,
  closed,
  talliesVisible,
  n,
}: {
  slots: ScheduleSlot[];
  dates: string[];
  mode: string;
  ranked: RankedRow[];
  getMine: (id: string) => ScheduleAnswerValue | undefined;
  saveMine: (id: string, a: ScheduleAnswerValue | null) => void;
  answersBySlot: Map<string, Record<string, ScheduleAnswerValue | undefined>>;
  tallyBySlot: Map<string, ScheduleTallySlot>;
  memberById: Map<string, Member>;
  memberIds: string[];
  anonymous: boolean;
  closed: boolean;
  talliesVisible: boolean;
  n: number;
}) {
  const rows = useMemo(() => {
    if (mode === "days") return [{ key: "day", label: "Ngày", hours: "" }];
    if (mode === "time_slots") {
      const unique = new Map<string, { key: string; label: string; hours: string }>();
      for (const s of slots) {
        const key = `${s.start_time ?? ""}-${s.end_time ?? ""}`;
        if (!unique.has(key)) {
          unique.set(key, {
            key,
            label: (s.start_time ?? "").slice(0, 5),
            hours: s.end_time ? `→ ${(s.end_time ?? "").slice(0, 5)}` : "",
          });
        }
      }
      return [...unique.values()];
    }
    const parts = [...new Set(slots.map((s) => s.part).filter(Boolean))] as ScheduleDayPart[];
    const order: ScheduleDayPart[] = ["morning", "afternoon", "evening"];
    return order
      .filter((p) => parts.includes(p))
      .map((p) => {
        const meta = DAY_PARTS.find((d) => d.id === p)!;
        return { key: p, label: meta.label, hours: meta.hours };
      });
  }, [mode, slots]);

  const slotAt = useCallback(
    (date: string, rowKey: string) => {
      if (mode === "days") return slots.find((s) => s.slot_date === date);
      if (mode === "time_slots") {
        return slots.find((s) => s.slot_date === date && `${s.start_time ?? ""}-${s.end_time ?? ""}` === rowKey);
      }
      return slots.find((s) => s.slot_date === date && s.part === rowKey);
    },
    [mode, slots],
  );

  const keys = useMemo(() => slots.map((s) => s.id), [slots]);
  const [qi, setQi] = useState(0);
  const [selState, setSel] = useState(slots[0]?.id ?? "");
  const sel = selState || slots[0]?.id || "";
  const deckRef = useRef<HTMLElement | null>(null);

  const unanswered = keys.filter((k) => !getMine(k));
  const done = keys.length - unanswered.length;

  function nextUnanswered(from = 0) {
    for (let i = 0; i < keys.length; i++) {
      const k = keys[(from + i) % keys.length];
      if (!getMine(k)) return keys.indexOf(k);
    }
    return -1;
  }

  function answer(v: ScheduleAnswerValue) {
    const k = keys[qi];
    if (!k) return;
    saveMine(k, v);
    setSel(k);
    const nIdx = nextUnanswered(qi + 1);
    if (nIdx >= 0) setQi(nIdx);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const map: Record<string, ScheduleAnswerValue> = { "1": "no", "2": "maybe", "3": "yes" };
      if (map[e.key] && unanswered.length) answer(map[e.key]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qi, keys, unanswered.length]);

  const current = slots.find((s) => s.id === keys[qi]);
  const topId = ranked[0]?.slot.id;
  const selSlot = slots.find((s) => s.id === sel);

  function cellStats(slot: ScheduleSlot) {
    const t = tallyBySlot.get(slot.id);
    if (t && (anonymous || talliesVisible)) {
      return { yes: t.yes_count, score: t.score, yesIds: t.yes_ids, maybeIds: t.maybe_ids, noIds: t.no_ids };
    }
    const map = answersBySlot.get(slot.id) ?? {};
    const yesIds = memberIds.filter((id) => map[id] === "yes");
    const maybeIds = memberIds.filter((id) => map[id] === "maybe");
    const noIds = memberIds.filter((id) => map[id] === "no");
    return {
      yes: yesIds.length,
      score: yesIds.length + maybeIds.length * 0.5,
      yesIds,
      maybeIds,
      noIds,
    };
  }

  return (
    <>
      {!closed ? (
        <>
          <div className="mt-[22px] mb-2.5 flex items-baseline justify-between px-0.5">
            <h2 className="text-[17px] font-extrabold">Trả lời nhanh</h2>
            <small className="text-[13px] text-muted-foreground">Phím 1 · 2 · 3</small>
          </div>
          <section
            ref={deckRef as React.RefObject<HTMLElement>}
            className="relative overflow-hidden rounded-[28px] border-[1.5px] border-transparent bg-white p-5 shadow-[0_24px_50px_-30px_rgba(8,80,90,.45)]"
            style={{
              background:
                "linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,rgba(25,201,167,.55),rgba(8,145,178,.45)) border-box",
            }}
          >
            {!unanswered.length ? (
              <div className="py-2 text-center">
                <b className="block text-[22px] font-extrabold">Xong cả {keys.length} khung 🎉</b>
                <p className="mt-1 text-sm text-muted-foreground">Sửa lại bất kỳ lúc nào trên lưới bên dưới.</p>
              </div>
            ) : current ? (
              <>
                <div className="flex items-center justify-between">
                  <b className="rounded-full bg-[var(--soft,#E3F6F5)] px-2.5 py-1 text-[13px] font-bold text-[var(--jade-d,#0B7F7A)]">
                    Còn {unanswered.length} khung
                  </b>
                  <button
                    type="button"
                    className="rounded-full px-2.5 py-1.5 text-[13px] font-semibold text-muted-foreground"
                    onClick={() => {
                      const nIdx = nextUnanswered(qi + 1);
                      if (nIdx >= 0) setQi(nIdx);
                    }}
                  >
                    Bỏ qua
                  </button>
                </div>
                <div className="mt-3 flex gap-1">
                  {keys.map((k, i) => (
                    <i
                      key={k}
                      className={cn(
                        "h-1 flex-1 rounded",
                        getMine(k) ? "bg-[#0EA5A4]" : i === qi ? "bg-[#0C1B20]" : "bg-[#E3EDED]",
                      )}
                    />
                  ))}
                </div>
                <div className="mt-4">
                  <div className="text-[15px] font-semibold text-muted-foreground">{formatDayLong(current.slot_date)}</div>
                  <div className="mt-0.5 text-[28px] font-extrabold tracking-tight leading-tight">
                    {current.part
                      ? `Buổi ${DAY_PARTS.find((p) => p.id === current.part)?.label.toLowerCase()}`
                      : current.start_time
                        ? `${(current.start_time ?? "").slice(0, 5)}${current.end_time ? `–${(current.end_time ?? "").slice(0, 5)}` : ""}`
                        : "Cả ngày"}
                    <small className="mt-1 block text-[15px] font-semibold tracking-normal text-muted-foreground">
                      {current.part
                        ? DAY_PARTS.find((p) => p.id === current.part)?.hours
                        : formatDayShort(current.slot_date)}
                    </small>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-[1fr_1fr_1.25fr] gap-2">
                  <button
                    type="button"
                    className="flex h-16 flex-col items-center justify-center gap-0.5 rounded-[18px] border-[1.5px] border-[var(--line)] bg-[#F4F7F7] text-[13.5px] font-bold text-[#4E6166] active:scale-95"
                    onClick={() => answer("no")}
                  >
                    <NoIcon className="size-5" />
                    Bận
                    <kbd className="text-[10.5px] font-semibold opacity-55">1</kbd>
                  </button>
                  <button
                    type="button"
                    className="flex h-16 flex-col items-center justify-center gap-0.5 rounded-[18px] border-[1.5px] border-[#F6D08A] bg-[#FFF7E8] text-[13.5px] font-bold text-[#8A5A00] active:scale-95"
                    onClick={() => answer("maybe")}
                  >
                    <MaybeIcon className="size-5" />
                    Có thể
                    <kbd className="text-[10.5px] font-semibold opacity-55">2</kbd>
                  </button>
                  <button
                    type="button"
                    className="flex h-16 flex-col items-center justify-center gap-0.5 rounded-[18px] bg-[linear-gradient(135deg,#19C9A7,#0891B2)] text-[13.5px] font-bold text-white shadow-[0_12px_26px_-12px_rgba(8,145,178,.7)] active:scale-95"
                    onClick={() => answer("yes")}
                  >
                    <YesIcon className="size-5" />
                    Rảnh
                    <kbd className="text-[10.5px] font-semibold opacity-55">3</kbd>
                  </button>
                </div>
              </>
            ) : null}
          </section>
        </>
      ) : null}

      {talliesVisible ? (
        <BestPicks
          ranked={ranked}
          anonymous={anonymous}
          memberById={memberById}
          n={n}
          ratioLabel="người rảnh"
          onPick={(id) => setSel(id)}
        />
      ) : null}

      <div className="mt-[22px] mb-2.5 flex items-baseline justify-between px-0.5">
        <h2 className="text-[17px] font-extrabold">Lịch cả nhóm</h2>
        <small className="text-[13px] text-muted-foreground">Chạm ô để sửa</small>
      </div>
      <section className="glass rounded-[24px] p-3.5">
        <div className="-mx-3.5 overflow-x-auto px-3.5 pb-1">
          <div
            className="grid w-max min-w-full gap-1.5"
            style={{ gridTemplateColumns: `64px repeat(${dates.length}, auto)` }}
          >
            <div />
            {dates.map((d) => {
              const wd = parseDate(d).getDay();
              return (
                <div key={d} className="px-0 pb-1 text-center">
                  <b className={cn("block text-xs font-bold text-muted-foreground", wd % 6 === 0 && "text-[var(--jade-d,#0B7F7A)]")}>
                    {WD_SHORT[wd]}
                  </b>
                  <span className="text-[15px] font-extrabold tabular-nums">
                    {parseDate(d).getDate()}/{parseDate(d).getMonth() + 1}
                  </span>
                </div>
              );
            })}
            {rows.map((row) => (
              <div key={row.key} className="contents">
                <div className="sticky left-0 z-[2] flex flex-col justify-center bg-[linear-gradient(90deg,rgba(247,251,251,.98)_80%,transparent)] py-1 pr-2 text-[13px] font-bold leading-tight">
                  {row.label}
                  {row.hours ? <small className="text-[11px] font-medium text-muted-foreground">{row.hours}</small> : null}
                </div>
                {dates.map((d) => {
                  const slot = slotAt(d, row.key);
                  if (!slot) return <div key={`${row.key}-${d}`} className="size-[60px]" />;
                  const stats = cellStats(slot);
                  const mine = getMine(slot.id);
                  const r = n ? stats.score / n : 0;
                  const dark = r > 0.55;
                  const bg = talliesVisible
                    ? `rgba(14,165,164,${(0.06 + r * 0.86).toFixed(2)})`
                    : "#fff";
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      className={cn(
                        "relative flex h-[60px] w-16 flex-col items-center justify-center rounded-[14px] border-[1.5px] border-[var(--line)] tabular-nums active:scale-95",
                        slot.id === sel && "outline outline-[3px] outline-[#0C1B20] outline-offset-1",
                        slot.id === topId && talliesVisible && "before:absolute before:bottom-0.5 before:left-1 before:text-[10px] before:content-['★'] before:text-[#FFD28A]",
                      )}
                      style={{ background: bg, color: dark ? "#fff" : undefined, borderColor: dark ? "transparent" : undefined }}
                      onClick={() => setSel(slot.id)}
                    >
                      {mine ? (
                        <span
                          className={cn(
                            "absolute right-1 top-1 grid size-[15px] place-items-center rounded-[5px] text-white",
                            mine === "yes" && "bg-[#0EA5A4]",
                            mine === "maybe" && "bg-[#F5A524]",
                            mine === "no" && "bg-[#6B7F84]",
                          )}
                        >
                          {mine === "yes" ? <YesIcon className="size-[9px]" /> : mine === "maybe" ? <MaybeIcon className="size-[9px]" /> : <NoIcon className="size-[9px]" />}
                        </span>
                      ) : !closed ? (
                        <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[#E5484D] shadow-[0_0_0_2px_#fff]" title="Bạn chưa trả lời" />
                      ) : null}
                      <b className="text-[15px] font-extrabold leading-none">{talliesVisible ? stats.yes : "·"}</b>
                      <small className="mt-0.5 text-[10px] font-semibold opacity-80">
                        {talliesVisible ? `/${n} rảnh` : "—"}
                      </small>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Ít</span>
          <i className="h-2 max-w-[160px] flex-1 rounded-lg border border-[var(--line)] bg-[linear-gradient(90deg,#fff,rgba(14,165,164,.9))]" />
          <span>Nhiều người rảnh</span>
        </div>

        {selSlot ? (
          <div className="mt-3.5 rounded-[18px] border border-[var(--line)] bg-[#F6FAFA] p-3.5">
            <div className="flex items-baseline justify-between gap-2">
              <b className="text-[15.5px] font-extrabold">{slotLabel(selSlot)}</b>
              <small className="text-[12.5px] text-muted-foreground">{formatDayLong(selSlot.slot_date)}</small>
            </div>
            {talliesVisible ? (
              <div className="mt-2.5 grid gap-1.5 text-[13px]">
                {(["yes", "maybe", "no"] as const).map((s) => {
                  const stats = cellStats(selSlot);
                  const ids = s === "yes" ? stats.yesIds : s === "maybe" ? stats.maybeIds : stats.noIds;
                  return (
                    <div key={s} className="flex items-center gap-2">
                      <span className="w-[58px] font-semibold text-muted-foreground">{LBL[s]}</span>
                      {anonymous ? (
                        <em className="not-italic text-[#8AA0A4]">{ids.length || (s === "yes" ? stats.yes : 0)} người</em>
                      ) : ids.length ? (
                        <AvatarStack members={ids.map((id) => memberById.get(id)!).filter(Boolean)} />
                      ) : (
                        <em className="not-italic text-[#8AA0A4]">Chưa ai</em>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}
            {!closed ? (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(["no", "maybe", "yes"] as const).map((s) => {
                  const on = getMine(selSlot.id) === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      className={cn(
                        "flex h-[50px] items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-[var(--line)] bg-white text-sm font-bold text-muted-foreground",
                        on && s === "yes" && "border-[#0EA5A4] bg-[#0EA5A4] text-white",
                        on && s === "maybe" && "border-[#F5A524] bg-[#F5A524] text-white",
                        on && s === "no" && "border-[#6B7F84] bg-[#6B7F84] text-white",
                      )}
                      onClick={() => saveMine(selSlot.id, on ? null : s)}
                    >
                      {s === "yes" ? <YesIcon className="size-4" /> : s === "maybe" ? <MaybeIcon className="size-4" /> : <NoIcon className="size-4" />}
                      {LBL[s]}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {!closed ? (
        <div className="glass fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-[736px] items-center gap-3 rounded-[22px] p-2.5 pl-3.5">
          <svg className="size-10 shrink-0" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="16" fill="none" stroke="#E3EDED" strokeWidth="4" />
            <circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke="#0EA5A4"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="100.5"
              strokeDashoffset={(100.5 * (1 - (keys.length ? done / keys.length : 0))).toFixed(1)}
              transform="rotate(-90 20 20)"
            />
          </svg>
          <div className="min-w-0 flex-1 text-sm leading-snug">
            <b className="block font-bold">
              {done === keys.length ? "Bạn đã trả lời hết" : `Bạn đã trả lời ${done}/${keys.length} khung`}
            </b>
            <span className="text-[12.5px] text-muted-foreground">Lưu tự động · đổi được tới khi chốt</span>
          </div>
          {done < keys.length ? (
            <button
              type="button"
              className="inline-flex h-11 items-center rounded-full bg-[linear-gradient(135deg,#19C9A7,#0891B2)] px-4 text-[14.5px] font-semibold text-white"
              onClick={() => {
                const nIdx = nextUnanswered(qi);
                if (nIdx >= 0) setQi(nIdx);
                deckRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
            >
              Trả lời tiếp
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function TripView({
  slots,
  dates,
  tripLength,
  windows,
  getMine,
  saveMine,
  answersBySlot,
  memberById,
  memberIds,
  anonymous,
  closed,
  talliesVisible,
  n,
}: {
  slots: ScheduleSlot[];
  dates: string[];
  tripLength: number;
  windows: ReturnType<typeof topNonOverlapping>;
  getMine: (id: string) => ScheduleAnswerValue | undefined;
  saveMine: (id: string, a: ScheduleAnswerValue | null) => void;
  answersBySlot: Map<string, Record<string, ScheduleAnswerValue | undefined>>;
  memberById: Map<string, Member>;
  memberIds: string[];
  anonymous: boolean;
  closed: boolean;
  talliesVisible: boolean;
  n: number;
}) {
  const slotByDate = useMemo(() => {
    const m = new Map<string, ScheduleSlot>();
    for (const s of slots) m.set(s.slot_date, s);
    return m;
  }, [slots]);

  const min = dates[0];
  const max = dates[dates.length - 1];
  const startMonth = min ? parseDate(min) : new Date();
  const [cursor, setCursor] = useState({ y: startMonth.getFullYear(), m: startMonth.getMonth() });
  const [brush, setBrush] = useState<ScheduleAnswerValue | "clear">("yes");
  const [focus, setFocus] = useState(dates[Math.floor(dates.length / 2)] ?? min ?? "");
  const [selWin, setSelWin] = useState<string | null>(null);
  const painting = useRef(false);

  const needsMonthNav = useMemo(() => {
    if (!min || !max) return false;
    const a = parseDate(min);
    const b = parseDate(max);
    return a.getFullYear() !== b.getFullYear() || a.getMonth() !== b.getMonth();
  }, [min, max]);

  function paint(iso: string) {
    const slot = slotByDate.get(iso);
    if (!slot || closed) return;
    setFocus(iso);
    const cur = getMine(slot.id);
    const nx = brush === "clear" ? null : brush;
    if (cur !== nx) saveMine(slot.id, nx);
  }

  const win = windows.find((w) => w.start === selWin);
  const focusSlot = focus ? slotByDate.get(focus) : undefined;
  const focusMap = focusSlot ? answersBySlot.get(focusSlot.id) ?? {} : {};

  return (
    <>
      <div className="mt-[22px] mb-2.5 flex items-baseline justify-between gap-2 px-0.5">
        <h2 className="text-[17px] font-extrabold">Khung {tripLength} ngày đẹp nhất</h2>
        <small className="text-[13px] text-muted-foreground">Chỉ tính người đi được cả khung</small>
      </div>
      {talliesVisible ? (
        <div className="grid gap-2.5">
          {windows.map((w, i) => (
            <button
              key={w.start}
              type="button"
              className={cn(
                "grid w-full grid-cols-[auto_1fr_auto] items-center gap-3.5 rounded-[20px] border-[1.5px] border-[var(--line)] bg-white p-3.5 text-left",
                i === 0 && "shadow-[0_0_0_4px_rgba(14,165,164,.1)]",
                selWin === w.start && "shadow-[0_0_0_4px_rgba(14,165,164,.22)]",
              )}
              style={
                i === 0
                  ? {
                      background:
                        "linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,#19C9A7,#0891B2) border-box",
                      border: "1.5px solid transparent",
                    }
                  : undefined
              }
              onClick={() => {
                setSelWin(selWin === w.start ? null : w.start);
                setFocus(w.start);
              }}
            >
              <span
                className={cn(
                  "grid size-10 place-items-center rounded-[13px] text-[15px] font-extrabold",
                  i === 0 ? "bg-[linear-gradient(135deg,#19C9A7,#0891B2)] text-white" : "bg-[#EEF4F4] text-muted-foreground",
                )}
              >
                {i + 1}
              </span>
              <span>
                <b className="block text-[15.5px] font-bold">
                  {formatDayShort(w.start)} → {formatDayShort(w.end)}
                </b>
                <span className="mt-0.5 block text-[13px] text-muted-foreground">
                  {w.full.length} đi được{w.part.length ? ` · ${w.part.length} có thể` : ""}
                </span>
                <span className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  {w.out.length ? (
                    <>
                      Không đi được:{" "}
                      <AvatarStack
                        members={w.out.map((id) => memberById.get(id)!).filter(Boolean)}
                        anonymous={anonymous}
                        count={w.out.length}
                      />
                    </>
                  ) : (
                    "Cả nhóm đều được 🎉"
                  )}
                </span>
              </span>
              <span className="text-right">
                <b className="text-xl font-extrabold tabular-nums">
                  {w.full.length}/{n}
                </b>
                <small className="block text-[11.5px] font-semibold text-muted-foreground">người đi được</small>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-[22px] mb-2.5 flex items-baseline justify-between px-0.5">
        <h2 className="text-[17px] font-extrabold">Tô ngày bạn đi được</h2>
      </div>
      <div className="glass rounded-[24px] p-4">
        <div className="flex items-center justify-between">
          <b className="text-base font-extrabold">
            Tháng {cursor.m + 1}, {cursor.y}
          </b>
          <small className="text-[12.5px] text-muted-foreground">
            {min && max ? `${formatDayShort(min)} – ${formatDayShort(max)}` : ""}
          </small>
        </div>
        {needsMonthNav ? (
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="rounded-xl border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-semibold"
              onClick={() =>
                setCursor((c) => {
                  const d = new Date(c.y, c.m - 1, 1);
                  return { y: d.getFullYear(), m: d.getMonth() };
                })
              }
            >
              ‹ Tháng trước
            </button>
            <button
              type="button"
              className="rounded-xl border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-semibold"
              onClick={() =>
                setCursor((c) => {
                  const d = new Date(c.y, c.m + 1, 1);
                  return { y: d.getFullYear(), m: d.getMonth() };
                })
              }
            >
              Tháng sau ›
            </button>
          </div>
        ) : null}
        <div className="mt-3.5 grid grid-cols-7 gap-1.5">
          {WD_SHORT.map((d) => (
            <span key={d} className="text-center text-xs font-bold text-muted-foreground">
              {d}
            </span>
          ))}
        </div>
        <div
          className="mt-2 grid grid-cols-7 gap-1.5 select-none"
          style={{ touchAction: "none" }}
          onPointerDown={(e) => {
            const el = (e.target as HTMLElement).closest("[data-d]") as HTMLElement | null;
            if (!el?.dataset.d) return;
            painting.current = true;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            paint(el.dataset.d);
          }}
          onPointerMove={(e) => {
            if (!painting.current) return;
            const el = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-d]") as HTMLElement | null;
            if (el?.dataset.d && el.dataset.d !== focus) paint(el.dataset.d);
          }}
          onPointerUp={() => {
            painting.current = false;
          }}
          onPointerCancel={() => {
            painting.current = false;
          }}
        >
          {monthGrid(cursor.y, cursor.m).map((iso, idx) => {
            if (!iso) return <div key={`p-${idx}`} className="aspect-square" />;
            const inRange = min && max && iso >= min && iso <= max;
            if (!inRange) {
              return (
                <div key={iso} className="flex aspect-square flex-col items-center justify-center rounded-[14px] text-[14px] font-medium text-[#B8C8CB]">
                  {Number(iso.slice(8))}
                </div>
              );
            }
            const slot = slotByDate.get(iso)!;
            const map = answersBySlot.get(slot.id) ?? {};
            const yes = memberIds.filter((id) => map[id] === "yes").length;
            const maybe = memberIds.filter((id) => map[id] === "maybe").length;
            const r = talliesVisible ? (yes + maybe * 0.5) / n : 0;
            const dark = r > 0.55;
            const mine = getMine(slot.id);
            const inw = win && iso >= win.start && iso <= win.end;
            return (
              <button
                key={iso}
                type="button"
                data-d={iso}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-[14px] border-[1.5px] border-[var(--line)] text-[15px] font-bold tabular-nums",
                  inw && "z-[1] outline outline-[3px] outline-[#0C1B20] outline-offset-1",
                  iso === focus && "scale-95",
                )}
                style={{
                  background: talliesVisible ? `rgba(14,165,164,${(0.08 + r * 0.82).toFixed(2)})` : "#fff",
                  color: dark ? "#fff" : undefined,
                  borderColor: dark ? "transparent" : undefined,
                }}
                onClick={() => setFocus(iso)}
              >
                {mine ? (
                  <span
                    className={cn(
                      "absolute right-1 top-1 grid size-4 place-items-center rounded-[5px] text-white",
                      mine === "yes" && "bg-[#0EA5A4]",
                      mine === "maybe" && "bg-[#F5A524]",
                      mine === "no" && "bg-[#6B7F84]",
                    )}
                  >
                    {mine === "yes" ? <YesIcon className="size-2.5" /> : mine === "maybe" ? <MaybeIcon className="size-2.5" /> : <NoIcon className="size-2.5" />}
                  </span>
                ) : null}
                {Number(iso.slice(8))}
                {talliesVisible ? <span className="text-[10.5px] font-bold opacity-85">{yes}/{n}</span> : null}
              </button>
            );
          })}
        </div>
        {focusSlot ? (
          <div className="mt-3.5 rounded-2xl border border-[var(--line)] bg-[#F6FAFA] p-3 text-[13.5px]">
            <b className="mb-1.5 block text-[14.5px]">{formatDayShort(focus)}</b>
            {(["yes", "maybe", "no"] as const).map((s) => {
              const ids = memberIds.filter((id) => focusMap[id] === s);
              return (
                <div key={s} className="mt-1 flex items-center gap-2">
                  <i
                    className={cn(
                      "grid size-4 place-items-center rounded text-[10px] text-white",
                      s === "yes" && "bg-[#0EA5A4]",
                      s === "maybe" && "bg-[#F5A524]",
                      s === "no" && "bg-[#6B7F84]",
                    )}
                  >
                    {s === "yes" ? <YesIcon className="size-2.5" /> : s === "maybe" ? <MaybeIcon className="size-2.5" /> : <NoIcon className="size-2.5" />}
                  </i>
                  {anonymous ? (
                    <em className="not-italic text-muted-foreground">{ids.length} người</em>
                  ) : ids.length ? (
                    <AvatarStack members={ids.map((id) => memberById.get(id)!).filter(Boolean)} />
                  ) : (
                    <em className="not-italic text-muted-foreground">Chưa ai</em>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {!closed ? (
        <div className="glass fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-[736px] gap-1.5 rounded-[22px] p-2.5">
          {(
            [
              ["yes", "Rảnh", YesIcon],
              ["maybe", "Có thể", MaybeIcon],
              ["no", "Bận", NoIcon],
              ["clear", "Xóa", EraseIcon],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              className={cn(
                "flex h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-[14px] border-[1.5px] border-[var(--line)] bg-white text-[11.5px] font-bold text-muted-foreground",
                brush === key && key === "yes" && "border-[#0EA5A4] bg-[#0EA5A4] text-white",
                brush === key && key === "maybe" && "border-[#F5A524] bg-[#F5A524] text-white",
                brush === key && key === "no" && "border-[#6B7F84] bg-[#6B7F84] text-white",
                brush === key && key === "clear" && "border-[#0C1B20] bg-[#0C1B20] text-white",
              )}
              onClick={() => setBrush(key)}
            >
              <Icon className="size-[17px]" />
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
