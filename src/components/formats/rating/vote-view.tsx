"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Star } from "lucide-react";
import { OptionMedia, optionTitle } from "@/components/options/option-card";
import { ImageLightbox } from "@/components/room/image-lightbox";
import { useRoom } from "@/components/room/room-context";
import { computeRatingResults } from "@/lib/rating";
import { createClient } from "@/lib/supabase/client";
import type { Item, Member } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function RatingVoteView() {
  const { bundle, me, castVoteValue, closeRoom, reopenRoom, closeIfDue, refresh } = useRoom();
  const closed = bundle.room.status === "closed";
  const items = bundle.items;
  const judgeWeight = bundle.room.settings.judge_weight ?? 0.5;
  const [judges, setJudges] = useState<Set<string>>(new Set());
  const [lbId, setLbId] = useState<string | null>(null);
  const [judgeSheet, setJudgeSheet] = useState(false);

  useEffect(() => {
    void closeIfDue();
  }, [closeIfDue]);

  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from("room_judges")
      .select("member_id")
      .eq("room_id", bundle.room.id)
      .then(({ data }) => {
        if (data) setJudges(new Set(data.map((r) => r.member_id as string)));
      });
  }, [bundle.room.id, bundle.room.settings.has_judges]);

  const myScores = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of bundle.votes) {
      if (v.member_id === me.id) map.set(v.item_id, Number(v.value));
    }
    return map;
  }, [bundle.votes, me.id]);

  const rated = myScores.size;
  const rows = useMemo(
    () => computeRatingResults(items, bundle.votes, judges, judgeWeight),
    [items, bundle.votes, judges, judgeWeight],
  );

  async function saveJudges(next: Set<string>, weight: number) {
    const supabase = createClient();
    const { error } = await supabase.rpc("set_judges", {
      p_room_id: bundle.room.id,
      p_judge_member_ids: [...next],
      p_judge_weight: weight,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setJudges(next);
    toast.success("Đã lưu giám khảo");
    await refresh();
  }

  const talliesVisible =
    bundle.room.results_visibility === "live" ||
    closed ||
    me.is_host ||
    (bundle.room.results_visibility === "after_vote" && rated > 0);

  return (
    <div className="pb-24">
      <section className="glass mt-2 rounded-[24px] p-[18px]">
        <span className="inline-flex rounded-full bg-primary-soft px-2.5 py-1 text-[13px] font-semibold text-primary">
          Chấm điểm
        </span>
        <h1 className="mt-2.5 text-[21px] font-extrabold tracking-tight">Chấm 1–5 sao</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Đã chấm {rated}/{items.length}
          {judges.size ? ` · Giám khảo ${Math.round(judgeWeight * 100)}%` : ""}
        </p>
        {me.is_host && !closed ? (
          <button
            type="button"
            className="mt-3 text-sm font-semibold text-primary"
            onClick={() => setJudgeSheet(true)}
          >
            Cài giám khảo…
          </button>
        ) : null}
      </section>

      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <RatingCard
            key={item.id}
            item={item}
            value={myScores.get(item.id) ?? 0}
            closed={closed}
            onRate={(v) => void castVoteValue(item.id, v)}
            onZoom={() => item.image_url && setLbId(item.id)}
          />
        ))}
      </ul>

      {talliesVisible ? (
        <div className="mt-6 space-y-2">
          <h2 className="text-[17px] font-extrabold">Bảng điểm</h2>
          {judges.size > 0 ? (
            <div className="mb-2 grid grid-cols-3 gap-2 text-center text-[11px] font-bold text-muted-foreground">
              <span>Giám khảo</span>
              <span>Khán giả</span>
              <span>Tổng</span>
            </div>
          ) : null}
          {rows.map((row, i) => (
            <div key={row.item.id} className="glass rounded-[18px] p-3">
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-lg bg-muted text-sm font-extrabold">
                  {i + 1}
                </span>
                <b className="min-w-0 flex-1 truncate">{optionTitle(row.item)}</b>
                <span className="text-lg font-extrabold tabular-nums">{row.score.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">{row.votes} lượt</span>
              </div>
              {judges.size > 0 ? (
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm font-semibold">
                  <span>{row.judgeScore?.toFixed(1) ?? "—"}</span>
                  <span>{row.audienceScore?.toFixed(1) ?? "—"}</span>
                  <span className="text-primary">{row.score.toFixed(1)}</span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {!closed && me.is_host ? (
        <button
          type="button"
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#19C9A7,#0891B2)] text-sm font-semibold text-white"
          onClick={() => void closeRoom()}
        >
          Chốt kết quả
        </button>
      ) : null}
      {closed && me.is_host ? (
        <button type="button" className="btn btn-g mt-3 w-full" onClick={() => void reopenRoom()}>
          Mở lại
        </button>
      ) : null}

      {judgeSheet ? (
        <JudgeSheet
          members={bundle.members}
          selected={judges}
          weight={judgeWeight}
          onClose={() => setJudgeSheet(false)}
          onSave={(sel, w) => {
            setJudgeSheet(false);
            void saveJudges(sel, w);
          }}
        />
      ) : null}

      {lbId ? (
        <ImageLightbox
          items={items.filter((i) => i.item_type === "image" && i.image_url)}
          startId={lbId}
          open
          onClose={() => setLbId(null)}
        />
      ) : null}
    </div>
  );
}

function RatingCard({
  item,
  value,
  closed,
  onRate,
  onZoom,
}: {
  item: Item;
  value: number;
  closed: boolean;
  onRate: (v: number) => void;
  onZoom: () => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  function starFromPointer(clientX: number) {
    const el = track.current;
    if (!el) return 1;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.min(5, Math.max(1, Math.ceil(ratio * 5)));
  }
  return (
    <li className="glass overflow-hidden rounded-[22px]">
      <button type="button" className="relative block aspect-[16/10] w-full bg-muted" onClick={onZoom}>
        <OptionMedia option={item} className="size-full object-cover" />
      </button>
      <div className="p-4">
        <b className="block text-[17px] font-extrabold">{optionTitle(item)}</b>
        {item.description ? <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p> : null}
        <div
          ref={track}
          className="mt-3 flex touch-none justify-between gap-1"
          onPointerDown={(e) => {
            if (closed) return;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            onRate(starFromPointer(e.clientX));
          }}
          onPointerMove={(e) => {
            if (closed || !e.buttons) return;
            onRate(starFromPointer(e.clientX));
          }}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={closed}
              className="grid size-11 flex-1 place-items-center rounded-xl"
              aria-label={`${n} sao`}
              onClick={() => onRate(n)}
            >
              <Star
                className={cn(
                  "size-8",
                  n <= value ? "fill-[#F5A524] text-[#F5A524]" : "text-[#D8E6E6]",
                )}
              />
            </button>
          ))}
        </div>
      </div>
    </li>
  );
}

function JudgeSheet({
  members,
  selected,
  weight,
  onClose,
  onSave,
}: {
  members: Member[];
  selected: Set<string>;
  weight: number;
  onClose: () => void;
  onSave: (sel: Set<string>, weight: number) => void;
}) {
  const [sel, setSel] = useState(new Set(selected));
  const [w, setW] = useState(weight);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <div className="glass max-h-[80vh] w-full max-w-md overflow-auto rounded-[24px] p-4">
        <h3 className="text-lg font-extrabold">Giám khảo</h3>
        <p className="mt-1 text-sm text-muted-foreground">Chọn người chấm với tỉ trọng riêng.</p>
        <label className="mt-4 flex items-center justify-between gap-3 text-sm font-semibold">
          Tỉ trọng giám khảo
          <select
            className="h-10 rounded-xl border border-[var(--line)] bg-white px-3"
            value={w}
            onChange={(e) => setW(Number(e.target.value))}
          >
            {[0.3, 0.4, 0.5, 0.6, 0.7].map((n) => (
              <option key={n} value={n}>
                {Math.round(n * 100)}%
              </option>
            ))}
          </select>
        </label>
        <ul className="mt-3 space-y-2">
          {members.map((m) => {
            const on = sel.has(m.id);
            return (
              <button
                key={m.id}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left text-sm font-semibold",
                  on ? "border-primary bg-primary-soft" : "border-[var(--line)] bg-white",
                )}
                onClick={() => {
                  const next = new Set(sel);
                  if (on) next.delete(m.id);
                  else next.add(m.id);
                  setSel(next);
                }}
              >
                {m.display_name}
                <span>{on ? "✓" : ""}</span>
              </button>
            );
          })}
        </ul>
        <div className="mt-4 flex gap-2">
          <button type="button" className="btn btn-g flex-1" onClick={onClose}>
            Huỷ
          </button>
          <button type="button" className="btn btn-primary flex-1" onClick={() => onSave(sel, w)}>
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
