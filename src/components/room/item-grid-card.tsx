"use client";

import { useState } from "react";
import { ZoomableItemImage } from "@/components/room/zoomable-item-image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Item } from "@/lib/types";

/** Lobby/drawn grid card: title overlay (host can edit) + delete icon. */
export function ItemGridCard({
  item,
  items,
  canDelete,
  canRename,
  onDelete,
  onRename,
}: {
  item: Item;
  items: Item[];
  canDelete: boolean;
  canRename?: boolean;
  onDelete: (itemId: string) => Promise<void>;
  onRename?: (itemId: string, title: string) => Promise<void>;
}) {
  const [confirm, setConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.title || "");
  const [busy, setBusy] = useState(false);

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
      <article className="relative overflow-hidden rounded-2xl">
        <ZoomableItemImage item={item} items={items} />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-8">
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
              className="block w-full truncate text-left text-sm font-semibold text-white drop-shadow"
              disabled={!canRename}
              onClick={(event) => {
                if (!canRename) return;
                event.preventDefault();
                event.stopPropagation();
                setDraft(item.title || "");
                setEditing(true);
              }}
            >
              {item.title || "Không tên"}
            </button>
          )}
        </div>
        {canDelete ? (
          <button
            type="button"
            className="absolute top-1.5 right-1.5 grid size-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm hover:bg-black/75"
            aria-label={`Xóa ${item.title || "mẫu"}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setConfirm(true);
            }}
          >
            <TrashIcon />
          </button>
        ) : null}
      </article>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="!bg-[rgba(255,255,255,0.96)]">
          <DialogTitle>Xóa mẫu?</DialogTitle>
          <DialogDescription>
            Xóa “{item.title || "Không tên"}”. Không hoàn tác được.
          </DialogDescription>
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

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
