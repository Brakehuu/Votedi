"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { OptionMedia, optionTitle } from "@/components/options/option-card";
import { useRoom } from "@/components/room/room-context";
import { computeBordaResults } from "@/lib/ranking";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RankingVoteView() {
  const { bundle, me, setRanking, closeRoom, reopenRoom, closeIfDue } = useRoom();
  const closed = bundle.room.status === "closed";
  const items = bundle.items;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const myOrder = useMemo(() => {
    const mine = bundle.votes
      .filter((v) => v.member_id === me.id)
      .sort((a, b) => Number(b.value) - Number(a.value));
    if (mine.length === items.length) return mine.map((v) => v.item_id);
    return items.map((i) => i.id);
  }, [bundle.votes, items, me.id]);

  const [draft, setDraft] = useState<string[] | null>(null);
  const order = draft ?? myOrder;

  const rows = useMemo(() => computeBordaResults(items, bundle.votes), [items, bundle.votes]);

  useEffect(() => {
    void closeIfDue();
  }, [closeIfDue]);

  function persist(next: string[]) {
    setDraft(next);
    void setRanking(next).finally(() => setDraft(null));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(String(active.id));
    const newIndex = order.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    persist(arrayMove(order, oldIndex, newIndex));
  }

  function move(id: string, dir: -1 | 1) {
    const i = order.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    persist(arrayMove(order, i, j));
  }

  const orderedItems = order.map((id) => items.find((i) => i.id === id)!).filter(Boolean);
  const talliesVisible =
    bundle.room.results_visibility === "live" ||
    closed ||
    me.is_host ||
    (bundle.room.results_visibility === "after_vote" &&
      bundle.votes.some((v) => v.member_id === me.id));

  return (
    <div className="pb-24">
      <section className="glass mt-2 rounded-[24px] p-[18px]">
        <span className="inline-flex rounded-full bg-primary-soft px-2.5 py-1 text-[13px] font-semibold text-primary">
          Xếp hạng
        </span>
        <h1 className="mt-2.5 text-[21px] font-extrabold tracking-tight">Kéo thả thứ tự bạn thích</h1>
        <p className="mt-1 text-sm text-muted-foreground">Hạng 1 được nhiều điểm nhất. Lưu tự động.</p>
      </section>

      {closed && rows[0] ? (
        <section className="mt-4">
          <h2 className="mb-2 text-[17px] font-extrabold">Bục podium</h2>
          <div className="grid grid-cols-3 items-end gap-2">
            {[rows[1], rows[0], rows[2]].map((row, idx) =>
              row ? (
                <div
                  key={row.item.id}
                  className={cn(
                    "glass rounded-[18px] p-3 text-center",
                    idx === 1 && "pb-6 ring-2 ring-primary/30",
                  )}
                >
                  <div className="mx-auto mb-2 size-12 overflow-hidden rounded-xl bg-muted">
                    <OptionMedia option={row.item} className="size-full object-cover" />
                  </div>
                  <b className="block truncate text-sm font-bold">{optionTitle(row.item)}</b>
                  <span className="text-xs text-muted-foreground">{row.score} điểm</span>
                </div>
              ) : (
                <div key={idx} />
              ),
            )}
          </div>
          {me.is_host ? (
            <button type="button" className="btn btn-g mt-3 w-full" onClick={() => void reopenRoom()}>
              Mở lại
            </button>
          ) : null}
        </section>
      ) : null}

      {!closed ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <ul className="mt-4 space-y-2">
              {orderedItems.map((item, index) => (
                <SortableRow
                  key={item.id}
                  item={item}
                  rank={index + 1}
                  onUp={() => move(item.id, -1)}
                  onDown={() => move(item.id, 1)}
                  canUp={index > 0}
                  canDown={index < orderedItems.length - 1}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : null}

      {talliesVisible ? (
        <div className="mt-6 space-y-2">
          <h2 className="text-[17px] font-extrabold">Bảng điểm Borda</h2>
          {rows.map((row, i) => (
            <div key={row.item.id} className="glass flex items-center gap-3 rounded-[18px] p-3">
              <span className="grid size-9 place-items-center rounded-xl bg-muted text-sm font-extrabold">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <b className="block truncate">{optionTitle(row.item)}</b>
                <span className="text-xs text-muted-foreground">
                  {row.score} điểm
                  {row.avgRank != null ? ` · hạng TB ${row.avgRank.toFixed(2)}` : ""}
                </span>
              </div>
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
    </div>
  );
}

function SortableRow({
  item,
  rank,
  onUp,
  onDown,
  canUp,
  canDown,
}: {
  item: Item;
  rank: number;
  onUp: () => void;
  onDown: () => void;
  canUp: boolean;
  canDown: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "glass flex items-center gap-2 rounded-[18px] p-2.5",
        isDragging && "z-10 shadow-lg",
      )}
    >
      <button
        type="button"
        className="grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground touch-none"
        aria-label="Kéo"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-5" />
      </button>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,#19C9A7,#0891B2)] text-lg font-extrabold text-white">
        {rank}
      </span>
      <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-muted">
        <OptionMedia option={item} className="size-full object-cover" />
      </div>
      <b className="min-w-0 flex-1 truncate text-[15px] font-bold">{optionTitle(item)}</b>
      <div className="flex shrink-0 flex-col gap-0.5 sm:hidden">
        <button
          type="button"
          disabled={!canUp}
          className="grid size-9 place-items-center rounded-lg bg-muted disabled:opacity-30"
          onClick={onUp}
          aria-label="Lên"
        >
          <ChevronUp className="size-4" />
        </button>
        <button
          type="button"
          disabled={!canDown}
          className="grid size-9 place-items-center rounded-lg bg-muted disabled:opacity-30"
          onClick={onDown}
          aria-label="Xuống"
        >
          <ChevronDown className="size-4" />
        </button>
      </div>
    </li>
  );
}
