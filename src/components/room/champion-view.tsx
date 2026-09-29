"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRoom } from "@/components/room/room-context";
import { ZoomableItemImage } from "@/components/room/zoomable-item-image";
import { SharePanel } from "@/components/share-panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { reportError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";

export function ChampionView() {
  const { bundle } = useRoom();
  const router = useRouter();
  const [shareOpen, setShareOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const champion = bundle.items.find((item) => item.id === bundle.room.champion_item_id);

  useEffect(() => {
    let cancelled = false;
    void import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return;
      void confetti({
        particleCount: 140,
        spread: 78,
        origin: { y: 0.65 },
        colors: ["#19C9A7", "#0EA5A4", "#0891B2", "#38BDF8", "#FFFFFF"],
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function rematch() {
    setBusy(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("rematch_room", { p_room_id: bundle.room.id });
      if (error) throw error;
      router.push(`/p/${data}?moi=1`);
    } catch (error) {
      toast.error(reportError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="mx-auto max-w-md space-y-5 rounded-[32px] px-5 py-10 pb-28 text-center text-white"
      style={{ background: "var(--grad)" }}
    >
      <p className="text-5xl" aria-hidden>
        🏆
      </p>
      <p className="text-sm font-semibold">Kết quả</p>
      <div className="champion-flip mx-auto max-w-sm">
        {champion ? (
          <ZoomableItemImage item={champion} items={bundle.items} />
        ) : (
          <div className="grid aspect-square place-items-center rounded-2xl bg-primary-soft text-6xl">🏆</div>
        )}
      </div>
      <h2 className="text-3xl font-extrabold tracking-tight">Mẫu vô địch 🏆</h2>
      <p className="text-white/90">{champion?.title || bundle.room.name}</p>
      <div className="grid gap-2">
        <Button
          type="button"
          style={{ background: "#fff", color: "#0C1B20", boxShadow: "0 12px 30px -12px rgba(0,0,0,.35)" }}
          onClick={() => router.push(`/p/${bundle.room.slug}/ket-qua`)}
        >
          Xem kết quả chi tiết
        </Button>
        <Button
          type="button"
          variant="outline"
          className="border-white/40 bg-white/10 text-white hover:bg-white/20"
          onClick={() => setShareOpen(true)}
        >
          Chia sẻ
        </Button>
        <Button type="button" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20" disabled={busy} onClick={() => void rematch()}>
          {busy ? "Đang tạo phòng..." : "Đấu lại"}
        </Button>
      </div>
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogTitle>Chia sẻ kết quả</DialogTitle>
          <div className="mt-4">
            <SharePanel slug={bundle.room.slug} roomName={`${bundle.room.name} · mẫu vô địch`} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
