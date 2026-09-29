"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ImageLightbox({
  items,
  startId,
  open,
  onClose,
  chosenId,
  canVote,
  onVote,
  voteCounts,
  keepOpen,
  selectedIds,
}: {
  items: Item[];
  startId: string;
  open: boolean;
  onClose: () => void;
  chosenId?: string | null;
  canVote?: boolean;
  onVote?: (itemId: string) => void;
  voteCounts?: Record<string, number>;
  keepOpen?: boolean;
  selectedIds?: Set<string>;
}) {
  const startIndex = Math.max(0, items.findIndex((item) => item.id === startId));
  const [index, setIndex] = useState(startIndex);
  const [scale, setScale] = useState(1);
  const [snap, setSnap] = useState(`${open}:${startId}`);
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const lastTap = useRef(0);

  const nextSnap = `${open}:${startId}`;
  if (nextSnap !== snap) {
    setSnap(nextSnap);
    if (open) {
      setIndex(startIndex);
      setScale(1);
    }
  }

  const go = useCallback(
    (delta: number) => {
      setIndex((value) => Math.min(items.length - 1, Math.max(0, value + delta)));
      setScale(1);
    },
    [items.length],
  );

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [go, onClose, open]);

  if (!open || items.length === 0) return null;
  const item = items[Math.min(index, items.length - 1)]!;
  const votes = voteCounts?.[item.id];
  const selected = selectedIds ? selectedIds.has(item.id) : chosenId === item.id;

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-[#071316]/90 p-3 backdrop-blur-xl sm:p-5"
      role="dialog"
      aria-modal
      aria-label="Xem ảnh mẫu"
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-3 text-white" onClick={(event) => event.stopPropagation()}>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{item.title || "Mẫu"}</p>
          {typeof votes === "number" ? (
            <p className="text-sm text-white/75">{votes} phiếu</p>
          ) : null}
        </div>
        <button
          type="button"
          className="grid size-12 shrink-0 place-items-center rounded-full bg-white/15 text-3xl leading-none"
          aria-label="Đóng"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center touch-none"
        onTouchStart={(event) => {
          if (event.touches.length === 2) {
            const dist = Math.hypot(
              event.touches[0]!.clientX - event.touches[1]!.clientX,
              event.touches[0]!.clientY - event.touches[1]!.clientY,
            );
            pinch.current = { dist, scale };
            swipe.current = null;
            return;
          }
          if (event.touches.length === 1) {
            swipe.current = { x: event.touches[0]!.clientX, y: event.touches[0]!.clientY };
          }
        }}
        onTouchMove={(event) => {
          if (event.touches.length === 2 && pinch.current) {
            event.preventDefault();
            const dist = Math.hypot(
              event.touches[0]!.clientX - event.touches[1]!.clientX,
              event.touches[0]!.clientY - event.touches[1]!.clientY,
            );
            setScale(Math.min(4, Math.max(1, pinch.current.scale * (dist / pinch.current.dist))));
          }
        }}
        onTouchEnd={(event) => {
          if (pinch.current) {
            pinch.current = null;
            return;
          }
          const start = swipe.current;
          swipe.current = null;
          if (!start || event.changedTouches.length === 0) return;
          const touch = event.changedTouches[0]!;
          const dx = touch.clientX - start.x;
          const dy = touch.clientY - start.y;
          if (scale <= 1.05 && dy > 80 && Math.abs(dy) > Math.abs(dx)) {
            onClose();
            return;
          }
          if (scale <= 1.05 && Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy)) {
            go(dx < 0 ? 1 : -1);
          }
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          setScale((value) => (value > 1.2 ? 1 : 2.2));
        }}
        onClick={(event) => {
          event.stopPropagation();
          const now = Date.now();
          if (now - lastTap.current < 280) {
            setScale((value) => (value > 1.2 ? 1 : 2.2));
            lastTap.current = 0;
          } else {
            lastTap.current = now;
          }
        }}
      >
        <div
          className="flex max-h-full max-w-full items-center justify-center transition-transform duration-150"
          style={{ transform: `scale(${scale})` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image_url ?? undefined}
            alt={item.title || "Mẫu"}
            className={cn(
              "max-h-[min(72dvh,900px)] max-w-[min(100%,900px)] object-contain",
              item.is_transparent && "drop-shadow-2xl",
            )}
            draggable={false}
          />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-lg flex-col gap-3" onClick={(event) => event.stopPropagation()}>
        {items.length > 1 ? (
          <div className="flex items-center justify-center gap-2">
            <Button type="button" variant="outline" className="min-h-11 bg-white/90" disabled={index === 0} onClick={() => go(-1)}>
              ←
            </Button>
            <span className="text-sm font-semibold text-white/80">
              {index + 1}/{items.length}
            </span>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 bg-white/90"
              disabled={index >= items.length - 1}
              onClick={() => go(1)}
            >
              →
            </Button>
          </div>
        ) : null}
        {canVote && onVote ? (
          <Button
            type="button"
            className="min-h-12 w-full"
            onClick={() => {
              onVote(item.id);
              if (!keepOpen) onClose();
            }}
          >
            {selected ? "Đã chọn ✓ (bấm để bỏ)" : "Chọn mẫu này"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
