"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SharePanel } from "@/components/share-panel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { downloadOrShareResultsImage, resultsShareImageUrl } from "@/components/room/share-image-preview";

export function ResultsActions({
  slug,
  roomName,
  imageVersion,
}: {
  slug: string;
  roomName: string;
  imageVersion?: string | number | null;
}) {
  const [open, setOpen] = useState(false);
  const href = resultsShareImageUrl(slug, { v: imageVersion, download: true });

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <a
          href={href}
          download="vote-di-ket-qua.png"
          className="btn btn-primary inline-flex min-h-11 items-center"
          onClick={(event) => {
            try {
              const probe = new File([], "vote-di-ket-qua.png", { type: "image/png" });
              if (
                typeof navigator !== "undefined" &&
                typeof navigator.canShare === "function" &&
                navigator.canShare({ files: [probe] })
              ) {
                event.preventDefault();
                void downloadOrShareResultsImage(slug, imageVersion);
              }
            } catch {
              /* keep native <a download> */
            }
          }}
        >
          Tải ảnh kết quả
        </a>
        <Button type="button" variant="outline" className="min-h-11" onClick={() => setOpen(true)}>
          Chia sẻ
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Chia sẻ kết quả</DialogTitle>
          <div className="mt-4">
            <SharePanel slug={`${slug}/ket-qua`} roomName={`${roomName} · kết quả`} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
