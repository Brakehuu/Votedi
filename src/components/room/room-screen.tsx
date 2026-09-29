"use client";

import { useState } from "react";
import { FormatVoteView, isNarrowRoom } from "@/components/formats/registry";
import { JoinForm } from "@/components/room/join-form";
import { RoomProvider, useRoom } from "@/components/room/room-context";
import { RoomTopBar } from "@/components/room/room-top-bar";
import { SharePanel } from "@/components/share-panel";
import { SetupNotice } from "@/components/setup-notice";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Member, RoomBundle, RoomPreview } from "@/lib/types";

export function RoomScreen({
  preview,
  member,
  initial,
  showShare,
}: {
  preview: RoomPreview;
  member: Member | null;
  initial: RoomBundle | null;
  showShare: boolean;
}) {
  if (!member) {
    return <JoinForm preview={preview} />;
  }
  if (!initial) {
    return (
      <main className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6">
        <Skeleton className="h-20 rounded-[22px]" />
        <Skeleton className="h-64 rounded-[22px]" />
        <SetupNotice detail="Không tải được dữ liệu phòng. Kiểm tra đã chạy migrations chưa." />
      </main>
    );
  }

  return (
    <RoomProvider initial={initial} me={member}>
      <RoomBody showShare={showShare} />
    </RoomProvider>
  );
}

function RoomBody({ showShare }: { showShare: boolean }) {
  const { bundle, offline } = useRoom();
  const [open, setOpen] = useState(showShare);
  const status = bundle.room.status;

  return (
    <main className="room-page mx-auto w-full max-w-[1180px] px-4 pb-8" data-status={status}>
      <div className={isNarrowRoom(bundle.room) ? "room-col room-col-narrow" : "room-col"}>
        <RoomTopBar />
        <FormatVoteView room={bundle.room} />
      </div>
      <div className={offline ? "room-offline show" : "room-offline"} role="status" aria-live="polite">
        {offline ? "Đang kết nối lại... Dữ liệu sẽ tự đồng bộ khi có mạng." : null}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!bg-[rgba(255,255,255,0.96)]">
          <DialogTitle>Gửi link cho cả nhóm</DialogTitle>
          <div className="mt-4">
            <SharePanel
              slug={bundle.room.slug}
              roomName={bundle.room.name}
              passwordNote={bundle.room.has_password ? "Dùng lại mật khẩu phòng cũ." : undefined}
            />
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
