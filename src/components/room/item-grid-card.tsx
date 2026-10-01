"use client";

import { useState } from "react";
import { ZoomButton } from "@/components/ui/zoom-button";
import { ImageLightbox } from "@/components/room/image-lightbox";
import { ItemImage } from "@/components/room/item-image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Item } from "@/lib/types";

/** Lobby grid card theo mockup: ảnh vuông, số TT, ZoomButton, tên gradient, xóa chủ phòng. */
export function ItemGridCard({
  item,
  items,
  index,
  canDelete,
  canRename,
  onDelete,
  onRename,
}: {
  item: Item;
  items: Item[];
  index?: number;
  canDelete: boolean;
  canRename?: boolean;
  onDelete: (itemId: string) => Promise<void>;
  onRename?: (itemId: string, title: string) => Promise<void>;
}) {
  const [confirm, setConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.title || "");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const title = item.title || "Không tên";

  async function doDelete() {
    setBusy(true);
    try {
      await onDelete(item.id);
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }

  async function commitRename() {
    if (!canRename || !onRename) {
      setEditing(false);
      return;
    }
    const next = draft.trim().slice(0, 80);
    setEditing(false);
    if (next && next !== (item.title ?? "")) {
      await onRename(item.id, next);
    } else {
      setDraft(item.title || "");
    }
  }

  return (
    <>
      <article className="item-card relative isolate aspect-square cursor-zoom-in overflow-hidden rounded-[24px] bg-[#E8F0F0] shadow-[0_18px_30px_-22px_rgba(8,80,90,.5)] transition hover:-translate-y-0.5">
        <button
          type="button"
          className="absolute inset-0 block h-full w-full text-left"
          aria-label={`Xem to ${title}`}
          onClick={() => setOpen(true)}
        >
          <ItemImage
            src={item.image_url ?? undefined}
            alt={title}
            transparent={item.is_transparent}
            className="!aspect-auto h-full w-full !rounded-none object-cover"
          />
        </button>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[46%] bg-gradient-to-t from-[rgba(8,24,30,.62)] to-transparent"
          aria-hidden
        />
        {typeof index === "number" ? (
          <span className="absolute top-2.5 left-2.5 z-[2] grid h-[26px] min-w-[30px] place-items-center rounded-[13px] bg-[rgba(255,255,255,.88)] px-2 text-[12.5px] font-extrabold text-[#0C1B20] backdrop-blur-[6px]">
            {index + 1}
          </span>
        ) : null}
        <ZoomButton label={title} onClick={() => setOpen(true)} />
        <div className="absolute bottom-2.5 left-3 z-[2] max-w-[70%]">
          {editing ? (
            <Input
              autoFocus
              value={draft}
              maxLength={80}
              className="h-8 border-white/30 bg-black/40 text-sm text-white"
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => void commitRename()}
              onKeyDown={(event) => {
                if (event.key === "Enter") void commitRename();
                if (event.key === "Escape") {
                  setDraft(item.title || "");
                  setEditing(false);
                }
              }}
              onClick={(event) => event.stopPropagation()}
            />
          ) : (
            <button
              type="button"
              className="block w-full truncate text-left text-[15px] font-bold text-white [text-shadow:0_1px_6px_rgba(0,0,0,.35)]"
              disabled={!canRename}
              onClick={(event) => {
                if (!canRename) return;
                event.preventDefault();
                event.stopPropagation();
                setDraft(item.title || "");
                setEditing(true);
              }}
            >
              {title}
            </button>
          )}
        </div>
        {canDelete ? (
          <button
            type="button"
            className="absolute right-2.5 bottom-2.5 z-[3] grid size-8 place-items-center rounded-full bg-[rgba(12,27,32,.45)] text-white backdrop-blur-[6px] transition hover:bg-[#E5484D] before:absolute before:inset-[-7px] before:content-['']"
            aria-label={`Xóa ${title}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setConfirm(true);
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
              <path
                d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </article>

      <ImageLightbox
        open={open}
        startId={item.id}
        items={items}
        onClose={() => setOpen(false)}
        context={{
          mode: "lobby",
          canEdit: Boolean(canDelete || canRename),
          onRename: canRename
            ? () => {
                setOpen(false);
                setDraft(item.title || "");
                setEditing(true);
              }
            : undefined,
          onDelete: canDelete
            ? () => {
                setOpen(false);
                setConfirm(true);
              }
            : undefined,
        }}
      />

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="!bg-[rgba(255,255,255,0.96)]">
          <DialogTitle>Xóa mẫu?</DialogTitle>
          <DialogDescription>Xóa “{title}”. Không hoàn tác được.</DialogDescription>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setConfirm(false)}>
              Hủy
            </Button>
            <Button
              type="button"
              className="min-h-11 bg-lose text-white hover:opacity-90"
              disabled={busy}
              onClick={() => void doDelete()}
            >
              {busy ? "Đang xóa..." : "Xóa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
