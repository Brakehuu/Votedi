"use client";

import { useState } from "react";
import { ZoomButton } from "@/components/ui/zoom-button";
import { ImageLightbox, type LightboxContext } from "@/components/room/image-lightbox";
import { ItemImage } from "@/components/room/item-image";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Ảnh mẫu: bấm ảnh hoặc ZoomButton → lightbox. Không vote khi bấm ảnh. */
export function ZoomableItemImage({
  item,
  items,
  className,
  chosenId,
  canVote,
  onVote,
  voteCounts,
  zoomSize = "md",
  context,
  showZoom = true,
}: {
  item: Item;
  items: Item[];
  className?: string;
  chosenId?: string | null;
  canVote?: boolean;
  onVote?: (itemId: string) => void;
  voteCounts?: Record<string, number>;
  zoomSize?: "md" | "sm";
  context?: LightboxContext;
  showZoom?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const group = items.length > 0 ? items : [item];
  const title = item.title || "mẫu";

  return (
    <>
      <div className={cn("group relative block w-full overflow-hidden", className)}>
        <button
          type="button"
          className="relative block aspect-square w-full cursor-zoom-in text-left"
          aria-label={`Xem to ${title}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setOpen(true);
          }}
        >
          <ItemImage
            src={item.image_url ?? undefined}
            alt={item.title || "Mẫu"}
            transparent={item.is_transparent}
            className="h-full w-full object-cover"
          />
        </button>
        {showZoom ? (
          <ZoomButton label={title} size={zoomSize} onClick={() => setOpen(true)} />
        ) : null}
      </div>
      <ImageLightbox
        open={open}
        startId={item.id}
        items={group}
        onClose={() => setOpen(false)}
        chosenId={chosenId}
        canVote={canVote}
        onVote={onVote}
        voteCounts={voteCounts}
        context={context}
      />
    </>
  );
}
