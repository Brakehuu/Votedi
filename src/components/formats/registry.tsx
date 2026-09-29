"use client";

import type { ComponentType } from "react";
import { BracketVoteView } from "@/components/formats/bracket/vote-view";
import { QuickVoteView } from "@/components/formats/quick/vote-view";
import { getFormat } from "@/lib/formats";
import type { FormatId, Room } from "@/lib/types";

type FormatViews = {
  VoteView: ComponentType;
  /** Narrow single column (lists) vs full width (bracket boards). */
  narrow: (room: Room) => boolean;
};

const VIEWS: Partial<Record<FormatId, FormatViews>> = {
  bracket: { VoteView: BracketVoteView, narrow: (room) => room.status === "qualify" },
  quick: { VoteView: QuickVoteView, narrow: () => true },
};

function UnsupportedView({ room }: { room: Room }) {
  return (
    <section className="glass mt-4 rounded-[22px] p-6 text-center">
      <p className="font-semibold">Kiểu vote “{getFormat(room.format).name}” sắp có.</p>
      <p className="mt-1 text-sm text-muted-foreground">Phòng này chưa mở được trên phiên bản hiện tại.</p>
    </section>
  );
}

export function FormatVoteView({ room }: { room: Room }) {
  const View = VIEWS[room.format]?.VoteView;
  return View ? <View /> : <UnsupportedView room={room} />;
}

export function isNarrowRoom(room: Room) {
  return VIEWS[room.format]?.narrow(room) ?? true;
}
