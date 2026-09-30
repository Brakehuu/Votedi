"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Heart, RotateCcw, Flame, Navigation, X } from "lucide-react";
import { OptionMedia, optionTitle } from "@/components/options/option-card";
import { PlaceMapEmbed, directionsUrl } from "@/components/options/place-map";
import { ImageLightbox } from "@/components/room/image-lightbox";
import { useRoom } from "@/components/room/room-context";
import { VoterStack } from "@/components/room/voter-stack";
import {
  computeSwipeResults,
  countSuperlikes,
  mySwipeMap,
  remainingSwipeItems,
  type SwipeValue,
} from "@/lib/swipe";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const THRESH_X = 110;
const THRESH_UP = 90;

export function SwipeVoteView() {
  const { bundle, me, castVoteValue, removeVote, clearMyVotes, closeRoom, reopenRoom, closeIfDue } = useRoom();
  const { room } = bundle;
  const closed = room.status === "closed";
  const anonymous = room.anonymous;
  const items = bundle.items;
  const mine = useMemo(() => mySwipeMap(bundle.votes, me.id), [bundle.votes, me.id]);
  const remaining = useMemo(() => remainingSwipeItems(items, bundle.votes, me.id), [items, bundle.votes, me.id]);
  const supersLeft = Math.max(0, 3 - countSuperlikes(bundle.votes, me.id));
  const rows = useMemo(
    () => computeSwipeResults(items, bundle.votes, bundle.members),
    [items, bundle.votes, bundle.members],
  );
  const memberById = useMemo(() => new Map(bundle.members.map((m) => [m.id, m])), [bundle.members]);
  const doneCount = items.length - remaining.length;
  const allDone = remaining.length === 0 && items.length > 0;
  const [lbId, setLbId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const celebrated = useRef(false);

  useEffect(() => {
    void closeIfDue();
  }, [closeIfDue]);

  useEffect(() => {
    if (!allDone || closed || celebrated.current) return;
    const matches = rows.filter((r) => r.matchAll);
    if (matches.length) {
      celebrated.current = true;
      confetti({ particleCount: 80, spread: 0.9, origin: { y: 0.65 } });
    }
  }, [allDone, closed, rows]);

  async function swipe(item: Item, value: SwipeValue) {
    if (closed) return;
    if (value === 2 && supersLeft <= 0 && mine.get(item.id) !== 2) {
      toast.error("Bạn đã dùng hết 3 lần Rất thích");
      return;
    }
    setUndoStack((s) => [...s, item.id]);
    await castVoteValue(item.id, value);
    try {
      navigator.vibrate?.(10);
    } catch {
      /* ignore */
    }
  }

  async function undo() {
    const last = undoStack[undoStack.length - 1];
    if (!last) return;
    setUndoStack((s) => s.slice(0, -1));
    await removeVote(last);
    toast.message("Đã hoàn tác");
  }

  const talliesVisible =
    room.results_visibility === "live" ||
    closed ||
    me.is_host ||
    (room.results_visibility === "after_vote" && allDone);

  if (!items.length) {
    return (
      <section className="glass mt-4 rounded-[22px] p-6 text-center">
        <p className="font-semibold">Chưa có lựa chọn</p>
        <p className="mt-1 text-sm text-muted-foreground">Chủ phòng thêm lựa chọn rồi mới quẹt được.</p>
      </section>
    );
  }

  return (
    <div className="pb-8">
      <section className="glass mt-2 rounded-[24px] p-[18px]">
        <span className="inline-flex rounded-full bg-primary-soft px-2.5 py-1 text-[13px] font-semibold text-primary">
          Quẹt chọn
        </span>
        <h1 className="mt-2.5 text-[21px] font-extrabold tracking-tight">Quẹt để chọn</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Phải = thích · Trái = bỏ qua · Lên = rất thích (còn {supersLeft}/3)
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[linear-gradient(135deg,#19C9A7,#0891B2)] transition-all"
            style={{ width: `${items.length ? (doneCount / items.length) * 100 : 0}%` }}
          />
        </div>
        <p className="mt-1.5 text-[13px] font-semibold text-muted-foreground">
          {doneCount}/{items.length}
        </p>
      </section>

      {closed && room.result?.winner_item_id ? (
        <section className="glass mt-3 rounded-[22px] p-4">
          <p className="text-sm font-semibold text-primary">Đã chốt</p>
          <p className="text-xl font-extrabold">
            {optionTitle(items.find((i) => i.id === room.result?.winner_item_id) ?? items[0])}
          </p>
          {me.is_host ? (
            <button type="button" className="btn btn-g mt-3" onClick={() => void reopenRoom()}>
              Mở lại
            </button>
          ) : null}
        </section>
      ) : null}

      {!closed && !allDone ? (
        <SwipeDeck
          key={remaining[0]?.id ?? "empty"}
          stack={remaining}
          supersLeft={supersLeft}
          onSwipe={swipe}
          onUndo={undo}
          canUndo={undoStack.length > 0}
          onZoom={setLbId}
        />
      ) : null}

      {!closed && allDone ? (
        <section className="glass mt-4 rounded-[24px] p-5 text-center">
          <b className="block text-2xl font-extrabold">Chờ mọi người 🎉</b>
          <p className="mt-1 text-sm text-muted-foreground">Bạn đã quẹt hết. Kết quả tạm bên dưới.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 text-sm font-semibold"
              onClick={() => void clearMyVotes().then(() => setUndoStack([]))}
            >
              <RotateCcw className="size-4" /> Quẹt lại
            </button>
            {me.is_host ? (
              <button
                type="button"
                className="inline-flex h-11 items-center rounded-full bg-[linear-gradient(135deg,#19C9A7,#0891B2)] px-4 text-sm font-semibold text-white"
                onClick={() => void closeRoom()}
              >
                Chốt kết quả
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {talliesVisible ? (
        <div className="mt-5 space-y-2.5">
          <div className="flex items-baseline justify-between px-0.5">
            <h2 className="text-[17px] font-extrabold">Kết quả tạm</h2>
            <small className="text-[13px] text-muted-foreground">Thích = 1 · Rất thích = 2</small>
          </div>
          {rows.map((row, i) => {
            const voters = row.voterIds
              .map((id) => memberById.get(id))
              .filter(Boolean)
              .filter((m) => {
                const v = bundle.votes.find((vote) => vote.item_id === row.item.id && vote.member_id === m!.id);
                return v && Number(v.value) >= 1;
              }) as typeof bundle.members;
            return (
              <div
                key={row.item.id}
                className={cn(
                  "glass flex gap-3 rounded-[20px] p-3",
                  row.matchAll && "ring-2 ring-primary/40",
                )}
              >
                <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-muted">
                  <OptionMedia option={row.item} className="size-full object-cover" />
                  <span className="absolute left-1 top-1 grid size-6 place-items-center rounded-full bg-black/55 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <b className="block truncate font-bold">{optionTitle(row.item)}</b>
                  {row.matchAll ? (
                    <span className="mt-0.5 inline-flex rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">
                      Match cả nhóm 🎉
                    </span>
                  ) : null}
                  <p className="mt-1 text-sm text-muted-foreground">
                    {row.score} điểm · {row.likes + row.supers} thích
                    {row.supers ? ` · ${row.supers} 🔥` : ""}
                  </p>
                  {!anonymous && voters.length ? <VoterStack members={voters.slice(0, 6)} /> : null}
                  {anonymous && row.likes + row.supers > 0 ? (
                    <span className="text-xs font-semibold text-muted-foreground">
                      {row.likes + row.supers} người thích
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          Quẹt xong mới xem kết quả nhóm.
        </p>
      )}

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

function SwipeDeck({
  stack,
  supersLeft,
  onSwipe,
  onUndo,
  canUndo,
  onZoom,
}: {
  stack: Item[];
  supersLeft: number;
  onSwipe: (item: Item, value: SwipeValue) => void;
  onUndo: () => void;
  canUndo: boolean;
  onZoom: (id: string) => void;
}) {
  const top = stack[0];
  const next = stack[1];
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState<"left" | "right" | "up" | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  const reset = useCallback(() => {
    setDx(0);
    setDy(0);
    setDragging(false);
    setLeaving(null);
    start.current = null;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!top || leaving) return;
      if (e.key === "ArrowRight") void fly("right", 1);
      if (e.key === "ArrowLeft") void fly("left", 0);
      if (e.key === "ArrowUp") void fly("up", 2);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top?.id, leaving, supersLeft]);

  function fly(dir: "left" | "right" | "up", value: SwipeValue) {
    if (!top || leaving) return;
    if (value === 2 && supersLeft <= 0) {
      toast.error("Hết lượt Rất thích");
      return;
    }
    setLeaving(dir);
    setDx(dir === "right" ? 480 : dir === "left" ? -480 : 0);
    setDy(dir === "up" ? -520 : 0);
    window.setTimeout(() => {
      onSwipe(top, value);
      reset();
    }, 220);
  }

  if (!top) return null;

  const rot = dx / 18;
  const likeOpacity = Math.min(1, Math.max(0, dx / THRESH_X));
  const nopeOpacity = Math.min(1, Math.max(0, -dx / THRESH_X));
  const superOpacity = Math.min(1, Math.max(0, -dy / THRESH_UP));

  return (
    <div className="mt-4">
      <div className="relative mx-auto h-[min(62vh,520px)] w-full max-w-md touch-none select-none">
        {next ? (
          <div className="absolute inset-x-3 bottom-2 top-4 overflow-hidden rounded-[28px] bg-white shadow-lg scale-[0.96] opacity-80">
            <CardFace item={next} dim />
          </div>
        ) : null}
        <div
          className={cn(
            "absolute inset-0 overflow-hidden rounded-[28px] bg-white shadow-[0_24px_50px_-24px_rgba(8,80,90,.45)] will-change-transform",
            !dragging && !leaving && "transition-transform duration-200 ease-out",
          )}
          style={{
            transform: `translate3d(${dx}px, ${dy}px, 0) rotate(${rot}deg)`,
          }}
          onPointerDown={(e) => {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            start.current = { x: e.clientX, y: e.clientY };
            setDragging(true);
          }}
          onPointerMove={(e) => {
            if (!start.current || leaving) return;
            setDx(e.clientX - start.current.x);
            setDy(e.clientY - start.current.y);
          }}
          onPointerUp={() => {
            if (leaving) return;
            if (dy < -THRESH_UP) fly("up", 2);
            else if (dx > THRESH_X) fly("right", 1);
            else if (dx < -THRESH_X) fly("left", 0);
            else {
              setDx(0);
              setDy(0);
              setDragging(false);
              start.current = null;
            }
          }}
          onPointerCancel={reset}
        >
          <CardFace item={top} onZoom={onZoom} />
          <div
            className="pointer-events-none absolute left-5 top-6 rounded-xl border-4 border-[#0EA5A4] px-3 py-1 text-xl font-extrabold text-[#0EA5A4]"
            style={{ opacity: likeOpacity, transform: `rotate(-12deg)` }}
          >
            THÍCH
          </div>
          <div
            className="pointer-events-none absolute right-5 top-6 rounded-xl border-4 border-[#94A3A8] px-3 py-1 text-xl font-extrabold text-[#64748B]"
            style={{ opacity: nopeOpacity, transform: `rotate(12deg)` }}
          >
            BỎ QUA
          </div>
          <div
            className="pointer-events-none absolute left-1/2 top-8 -translate-x-1/2 rounded-xl border-4 border-[#F59E0B] px-3 py-1 text-xl font-extrabold text-[#B45309]"
            style={{ opacity: superOpacity }}
          >
            RẤT THÍCH 🔥
          </div>
        </div>
      </div>

      <div className="mx-auto mt-5 flex max-w-md items-center justify-center gap-4">
        <button
          type="button"
          className="grid size-14 place-items-center rounded-full border-[1.5px] border-[var(--line)] bg-white text-[#64748B] shadow-sm active:scale-95"
          aria-label="Bỏ qua"
          onClick={() => fly("left", 0)}
        >
          <X className="size-7" />
        </button>
        <button
          type="button"
          disabled={supersLeft <= 0}
          className="grid size-12 place-items-center rounded-full bg-[#FFF7E8] text-[#B45309] shadow-sm enabled:active:scale-95 disabled:opacity-40"
          aria-label="Rất thích"
          onClick={() => fly("up", 2)}
        >
          <Flame className="size-6" />
        </button>
        <button
          type="button"
          className="grid size-14 place-items-center rounded-full bg-[linear-gradient(135deg,#19C9A7,#0891B2)] text-white shadow-md active:scale-95"
          aria-label="Thích"
          onClick={() => fly("right", 1)}
        >
          <Heart className="size-7 fill-current" />
        </button>
        <button
          type="button"
          disabled={!canUndo}
          className="grid size-11 place-items-center rounded-full border border-[var(--line)] bg-white text-muted-foreground disabled:opacity-40"
          aria-label="Hoàn tác"
          onClick={onUndo}
        >
          <RotateCcw className="size-4" />
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">Phím ← ↑ → · hoặc kéo thẻ</p>
    </div>
  );
}

function CardFace({
  item,
  dim,
  onZoom,
}: {
  item: Item;
  dim?: boolean;
  onZoom?: (id: string) => void;
}) {
  return (
    <div className={cn("flex h-full flex-col", dim && "pointer-events-none")}>
      <div className="relative min-h-0 flex-1 bg-[#EEF4F4]">
        {item.item_type === "image" && item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt=""
            className="size-full object-cover"
            draggable={false}
            onClick={() => onZoom?.(item.id)}
          />
        ) : item.item_type === "place" && item.place?.lat != null && item.place?.lng != null ? (
          <PlaceMapEmbed lat={item.place.lat} lng={item.place.lng} className="size-full min-h-[220px]" />
        ) : (
          <div className="grid size-full place-items-center text-6xl">{item.emoji || "✨"}</div>
        )}
      </div>
      <div className="space-y-1 p-4">
        <b className="block text-xl font-extrabold leading-snug">{optionTitle(item)}</b>
        {item.description ? <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p> : null}
        {item.price_text ? (
          <span className="inline-flex rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-bold text-primary">
            {item.price_text}
          </span>
        ) : null}
        {item.item_type === "place" && item.place?.lat != null && item.place?.lng != null ? (
          <a
            className="mt-2 inline-flex h-10 items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-3 text-sm font-semibold"
            href={directionsUrl(item.place.lat, item.place.lng)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <Navigation className="size-4" /> Chỉ đường
          </a>
        ) : null}
      </div>
    </div>
  );
}
