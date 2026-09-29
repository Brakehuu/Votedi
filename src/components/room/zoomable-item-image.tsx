"use client";

import { useState } from "react";
import { ZoomIcon } from "@/components/icons/zoom-icon";
import { ImageLightbox } from "@/components/room/image-lightbox";
import { ItemImage } from "@/components/room/item-image";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Ảnh mẫu bấm được → lightbox. Không vote khi bấm ảnh. */
export function ZoomableItemImage({
  item,
  items,
  className,
  chosenId,
  canVote,
  onVote,
  voteCounts,
}: {
  item: Item;
  items: Item[];
  className?: string;
  chosenId?: string | null;
  canVote?: boolean;
  onVote?: (itemId: string) => void;
  voteCounts?: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const group = items.length > 0 ? items : [item];

  return (
    <>
      <button
        type="button"
        className={cn("group relative block w-full cursor-zoom-in text-left", className)}
        aria-label={`Xem to ${item.title || "mẫu"}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <ItemImage src={item.image_url} alt={item.title || "Mẫu"} transparent={item.is_transparent} />
        <span className="zoom-badge" aria-hidden>
          <ZoomIcon />
        </span>
      </button>
      <ImageLightbox
        open={open}
        startId={item.id}
        items={group}
        onClose={() => setOpen(false)}
        chosenId={chosenId}
        canVote={canVote}
        onVote={onVote}
        voteCounts={voteCounts}
      />
    </>
  );
}
