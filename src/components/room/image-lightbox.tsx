"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X, ZoomOut } from "lucide-react";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/utils";

export type LightboxContext =
  | { mode: "lobby"; canEdit?: boolean; onRename?: (id: string) => void; onDelete?: (id: string) => void }
  | { mode: "qualify"; remaining?: number; chosenId?: string | null; canVote?: boolean; onVote?: (id: string) => void }
  | { mode: "result"; rank?: number; votes?: number; voters?: { id: string; name: string; color?: string }[]; anonymous?: boolean }
  | { mode: "default" };

type Props = {
  items: Item[];
  startId: string;
  open: boolean;
  onClose: () => void;
  context?: LightboxContext;
  /** @deprecated use context */
  chosenId?: string | null;
  canVote?: boolean;
  onVote?: (itemId: string) => void;
  voteCounts?: Record<string, number>;
  keepOpen?: boolean;
  selectedIds?: Set<string>;
};

const ZOOM_FACTOR = 2.4;

export function ImageLightbox({
  items,
  startId,
  open,
  onClose,
  context,
  chosenId,
  canVote,
  onVote,
  voteCounts,
  keepOpen,
  selectedIds,
}: Props) {
  const startIndex = Math.max(0, items.findIndex((item) => item.id === startId));
  const [index, setIndex] = useState(startIndex);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [snap, setSnap] = useState(`${open}:${startId}`);
  const reduceMotion = useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  const swipe = useRef<{ x: number; y: number; t: number } | null>(null);
  const pan = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const lastTap = useRef(0);
  const thumbRef = useRef<HTMLDivElement>(null);

  const nextSnap = `${open}:${startId}`;
  if (nextSnap !== snap) {
    setSnap(nextSnap);
    if (open) {
      setIndex(startIndex);
      setScale(1);
      setOffset({ x: 0, y: 0 });
    }
  }

  const resetZoom = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const go = useCallback(
    (delta: number) => {
      setIndex((value) => Math.min(items.length - 1, Math.max(0, value + delta)));
      resetZoom();
    },
    [items.length, resetZoom],
  );

  const toggleZoom = useCallback(() => {
    setScale((s) => {
      if (s > 1.2) {
        setOffset({ x: 0, y: 0 });
        return 1;
      }
      return ZOOM_FACTOR;
    });
  }, []);

  // Preload neighbors
  useEffect(() => {
    if (!open) return;
    for (const i of [index - 1, index + 1]) {
      const it = items[i];
      if (it?.image_url) {
        const img = new window.Image();
        img.src = it.image_url;
      }
    }
  }, [index, items, open]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(
        rootRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);

    window.setTimeout(() => focusables()[0]?.focus(), 0);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "z" || event.key === "Z") toggleZoom();
      if (event.key === "Tab" && rootRef.current) {
        const list = focusables();
        if (list.length === 0) return;
        const first = list[0]!;
        const last = list[list.length - 1]!;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [go, onClose, open, toggleZoom]);

  useEffect(() => {
    const el = thumbRef.current?.querySelector<HTMLElement>("[data-active='true']");
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  }, [index, reduceMotion]);

  if (!open || items.length === 0) return null;
  const item = items[Math.min(index, items.length - 1)]!;
  const votes = voteCounts?.[item.id];
  const ctx = context ?? (canVote && onVote ? { mode: "qualify" as const, canVote, onVote, chosenId } : { mode: "default" as const });
  const selected =
    ctx.mode === "qualify"
      ? selectedIds
        ? selectedIds.has(item.id)
        : (ctx.chosenId ?? chosenId) === item.id
      : false;

  const zoomed = scale > 1.05;

  return (
    <div
      ref={rootRef}
      className={cn("lb fixed inset-0 z-[80] flex flex-col text-white", zoomed && "lb-zoomed", dragging && "lb-drag")}
      style={{
        background: "rgba(7,18,22,.9)",
        backdropFilter: "blur(22px) saturate(140%)",
        WebkitBackdropFilter: "blur(22px) saturate(140%)",
        touchAction: "none",
      }}
      role="dialog"
      aria-modal
      aria-label="Xem ảnh mẫu"
    >
      <div className="flex items-center gap-3 px-3 pt-[calc(12px+env(safe-area-inset-top,0px))] pb-2 sm:px-4">
        <span className="inline-flex h-9 shrink-0 items-center rounded-[18px] bg-white/12 px-3.5 text-sm font-bold tabular-nums">
          {index + 1} / {items.length}
        </span>
        <p className="min-w-0 flex-1 truncate text-[17px] font-bold">{item.title || "Mẫu"}</p>
        <div className="flex gap-2">
          <button
            type="button"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-white/14 transition hover:bg-white/26 active:scale-95"
            aria-label={zoomed ? "Thu nhỏ" : "Phóng to"}
            onClick={toggleZoom}
          >
            {zoomed ? (
              <ZoomOut width={20} height={20} strokeWidth={2} aria-hidden className="shrink-0" />
            ) : (
              <Maximize2 width={20} height={20} strokeWidth={2} aria-hidden className="shrink-0" />
            )}
          </button>
          <button
            type="button"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-white/20 transition hover:bg-white/30 active:scale-95"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X width={20} height={20} strokeWidth={2} aria-hidden className="shrink-0" />
          </button>
        </div>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3 py-1 sm:px-4"
        onWheel={(event) => {
          if (Math.abs(event.deltaY) < 2) return;
          event.preventDefault();
          setScale((s) => {
            const next = event.deltaY < 0 ? Math.min(4, s * 1.12) : Math.max(1, s / 1.12);
            if (next <= 1.02) setOffset({ x: 0, y: 0 });
            return next;
          });
        }}
        onPointerDown={(event) => {
          if (event.pointerType === "touch") return;
          if (zoomed) {
            pan.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
            setDragging(true);
            (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
          }
        }}
        onPointerMove={(event) => {
          if (!pan.current || !zoomed) return;
          setOffset({
            x: pan.current.ox + (event.clientX - pan.current.x),
            y: pan.current.oy + (event.clientY - pan.current.y),
          });
        }}
        onPointerUp={() => {
          pan.current = null;
          setDragging(false);
        }}
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
            const t = event.touches[0]!;
            if (zoomed) {
              pan.current = { x: t.clientX, y: t.clientY, ox: offset.x, oy: offset.y };
              setDragging(true);
            } else {
              swipe.current = { x: t.clientX, y: t.clientY, t: Date.now() };
            }
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
            return;
          }
          if (zoomed && pan.current && event.touches.length === 1) {
            const t = event.touches[0]!;
            setOffset({
              x: pan.current.ox + (t.clientX - pan.current.x),
              y: pan.current.oy + (t.clientY - pan.current.y),
            });
          }
        }}
        onTouchEnd={(event) => {
          if (pinch.current) {
            pinch.current = null;
            if (scale <= 1.05) setOffset({ x: 0, y: 0 });
            return;
          }
          if (pan.current) {
            pan.current = null;
            setDragging(false);
            return;
          }
          const start = swipe.current;
          swipe.current = null;
          if (!start || event.changedTouches.length === 0 || zoomed) return;
          const touch = event.changedTouches[0]!;
          const dx = touch.clientX - start.x;
          const dy = touch.clientY - start.y;
          if (dy > 80 && Math.abs(dy) > Math.abs(dx)) {
            onClose();
            return;
          }
          if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy)) {
            go(dx < 0 ? 1 : -1);
          }
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          toggleZoom();
        }}
        onClick={(event) => {
          event.stopPropagation();
          const now = Date.now();
          if (now - lastTap.current < 280) {
            toggleZoom();
            lastTap.current = 0;
          } else {
            lastTap.current = now;
          }
        }}
      >
        {items.length > 1 ? (
          <>
            <button
              type="button"
              className="lb-nav absolute top-1/2 left-4 z-10 hidden size-[52px] -translate-y-1/2 place-items-center rounded-full bg-white/14 transition hover:bg-white/28 md:grid"
              aria-label="Ảnh trước"
              disabled={index === 0}
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
            >
              <ChevronLeft width={24} height={24} strokeWidth={2} aria-hidden className="shrink-0" />
            </button>
            <button
              type="button"
              className="lb-nav absolute top-1/2 right-4 z-10 hidden size-[52px] -translate-y-1/2 place-items-center rounded-full bg-white/14 transition hover:bg-white/28 md:grid"
              aria-label="Ảnh sau"
              disabled={index >= items.length - 1}
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
            >
              <ChevronRight width={24} height={24} strokeWidth={2} aria-hidden className="shrink-0" />
            </button>
          </>
        ) : null}

        <div
          className="grid max-h-full max-w-[min(92vw,820px)] place-items-center"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transition: dragging || reduceMotion ? "none" : "transform .3s cubic-bezier(.2,.8,.2,1)",
            cursor: zoomed ? (dragging ? "grabbing" : "grab") : "zoom-in",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image_url ?? undefined}
            alt={item.title || "Mẫu"}
            className={cn(
              "max-h-[min(70dvh,820px)] max-w-full rounded-[22px] object-contain shadow-[0_40px_80px_-30px_rgba(0,0,0,.7)]",
              item.is_transparent && "drop-shadow-2xl",
            )}
            draggable={false}
          />
        </div>
      </div>

      <div
        className="mx-auto grid w-full max-w-[900px] gap-3 px-4 pb-[calc(14px+env(safe-area-inset-bottom,0px))] pt-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <b className="block text-lg font-extrabold tracking-tight sm:text-lg">{item.title || "Mẫu"}</b>
            <LightboxMeta
              ctx={ctx}
              itemId={item.id}
              votes={votes}
              selected={selected}
              keepOpen={keepOpen}
              onClose={onClose}
            />
          </div>
          <LightboxActions
            ctx={ctx}
            itemId={item.id}
            selected={selected}
            keepOpen={keepOpen}
            onClose={onClose}
            imageUrl={item.image_url}
          />
        </div>

        {items.length > 1 ? (
          <div ref={thumbRef} className="flex gap-2 overflow-x-auto px-0.5 py-1 [scrollbar-width:none] snap-x snap-proximity">
            {items.map((it, i) => (
              <button
                key={it.id}
                type="button"
                data-active={i === index ? "true" : undefined}
                className={cn(
                  "relative h-14 w-14 shrink-0 snap-center overflow-hidden rounded-[12px] border-[2.5px] opacity-55 transition sm:h-16 sm:w-16 sm:rounded-[14px]",
                  i === index && "border-[#19C9A7] opacity-100 -translate-y-0.5",
                  i !== index && "border-transparent hover:opacity-85",
                )}
                aria-label={it.title || `Mẫu ${i + 1}`}
                onClick={() => {
                  setIndex(i);
                  resetZoom();
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.image_url ?? undefined} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}

        <p className="hidden text-center text-[12.5px] text-[#9FB6BA] md:block">
          <kbd className="mx-0.5 inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-md bg-white/16 px-1.5 text-[11.5px] font-bold">←</kbd>
          <kbd className="mx-0.5 inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-md bg-white/16 px-1.5 text-[11.5px] font-bold">→</kbd>
          đổi ảnh ·
          <kbd className="mx-0.5 inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-md bg-white/16 px-1.5 text-[11.5px] font-bold">Z</kbd>
          phóng to ·
          <kbd className="mx-0.5 inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-md bg-white/16 px-1.5 text-[11.5px] font-bold">Esc</kbd>
          đóng
        </p>
      </div>
    </div>
  );
}

function LightboxMeta({
  ctx,
  votes,
  selected,
}: {
  ctx: LightboxContext;
  itemId?: string;
  votes?: number;
  selected: boolean;
  keepOpen?: boolean;
  onClose: () => void;
}) {
  if (ctx.mode === "lobby") {
    return <span className="mt-0.5 flex items-center gap-2 text-[13.5px] text-[#B9CDD1]">Chạm ảnh để xem to · chủ phòng có thể đổi tên / xóa</span>;
  }
  if (ctx.mode === "qualify") {
    return (
      <span className="mt-0.5 flex items-center gap-2 text-[13.5px] text-[#B9CDD1]">
        {typeof ctx.remaining === "number" ? `Bạn còn ${ctx.remaining} phiếu` : typeof votes === "number" ? `${votes} phiếu` : null}
        {selected ? " · Bạn đã chọn mẫu này" : null}
      </span>
    );
  }
  if (ctx.mode === "result") {
    return (
      <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[13.5px] text-[#B9CDD1]">
        {typeof ctx.rank === "number" ? `Hạng ${ctx.rank}` : null}
        {typeof (ctx.votes ?? votes) === "number" ? ` · ${ctx.votes ?? votes} phiếu` : null}
        {!ctx.anonymous && ctx.voters && ctx.voters.length > 0 ? (
          <span className="inline-flex items-center">
            {ctx.voters.slice(0, 5).map((v) => (
              <span
                key={v.id}
                className="ml-[-7px] grid size-7 place-items-center rounded-full border-2 border-[#0A1A1F] text-[10px] font-bold text-white first:ml-0"
                style={{ background: v.color || "#0EA5A4" }}
                title={v.name}
              >
                {v.name.slice(0, 1).toUpperCase()}
              </span>
            ))}
          </span>
        ) : null}
      </span>
    );
  }
  if (typeof votes === "number") {
    return <span className="mt-0.5 text-[13.5px] text-[#B9CDD1]">{votes} phiếu</span>;
  }
  return null;
}

function LightboxActions({
  ctx,
  itemId,
  selected,
  keepOpen,
  onClose,
  imageUrl,
}: {
  ctx: LightboxContext;
  itemId: string;
  selected: boolean;
  keepOpen?: boolean;
  onClose: () => void;
  imageUrl?: string | null;
}) {
  if (ctx.mode === "lobby" && ctx.canEdit) {
    return (
      <div className="flex w-full gap-2 sm:w-auto">
        {ctx.onRename ? (
          <button
            type="button"
            className="btn h-11 flex-1 rounded-full border border-white/18 bg-white/14 px-4 text-sm font-semibold text-white sm:flex-none"
            onClick={() => ctx.onRename?.(itemId)}
          >
            Đổi tên
          </button>
        ) : null}
        {ctx.onDelete ? (
          <button
            type="button"
            className="btn h-11 flex-1 rounded-full border border-white/18 bg-white/14 px-4 text-sm font-semibold text-white sm:flex-none"
            onClick={() => ctx.onDelete?.(itemId)}
          >
            Xóa mẫu
          </button>
        ) : null}
      </div>
    );
  }
  if (ctx.mode === "qualify" && ctx.canVote && ctx.onVote) {
    return (
      <button
        type="button"
        className={cn(
          "btn h-11 min-w-[160px] flex-1 rounded-full px-5 text-sm font-semibold sm:flex-none",
          selected ? "bg-[linear-gradient(135deg,#19C9A7,#0891B2)] text-white" : "border border-white/18 bg-white/14 text-white",
        )}
        onClick={() => {
          ctx.onVote?.(itemId);
          if (!keepOpen) onClose();
        }}
      >
        {selected ? "Bạn đã chọn" : "Chọn mẫu này"}
      </button>
    );
  }
  if (ctx.mode === "result" && imageUrl) {
    return (
      <a
        href={imageUrl}
        target="_blank"
        rel="noreferrer"
        className="btn inline-flex h-11 items-center justify-center rounded-full border border-white/18 bg-white/14 px-4 text-sm font-semibold text-white"
      >
        Mở ảnh gốc
      </a>
    );
  }
  // legacy props path
  return null;
}
