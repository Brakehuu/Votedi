"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SharePanel } from "@/components/share-panel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function ResultsActions({ slug, roomName }: { slug: string; roomName: string }) {
  const [open, setOpen] = useState(false);

  async function download() {
    try {
      const res = await fetch(`/p/${slug}/ket-qua/opengraph-image`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vote-di-${slug}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Đã tải ảnh kết quả");
    } catch {
      toast.error("Không tải được ảnh. Thử lại nhé.");
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="min-h-11" onClick={() => void download()}>
          Tải ảnh kết quả
        </Button>
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
