"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { getFormat } from "@/lib/formats";
import type { FormatId, Room } from "@/lib/types";

const BracketVoteView = dynamic(
  () => import("@/components/formats/bracket/vote-view").then((m) => m.BracketVoteView),
  { ssr: false, loading: () => <FormatSkeleton /> },
);
const QuickVoteView = dynamic(
  () => import("@/components/formats/quick/vote-view").then((m) => m.QuickVoteView),
  { loading: () => <FormatSkeleton /> },
);
const ScheduleVoteView = dynamic(
  () => import("@/components/formats/schedule/vote-view").then((m) => m.ScheduleVoteView),
  { loading: () => <FormatSkeleton /> },
);
const SwipeVoteView = dynamic(
  () => import("@/components/formats/swipe/vote-view").then((m) => m.SwipeVoteView),
  { ssr: false, loading: () => <FormatSkeleton /> },
);
const RankingVoteView = dynamic(
  () => import("@/components/formats/ranking/vote-view").then((m) => m.RankingVoteView),
  { ssr: false, loading: () => <FormatSkeleton /> },
);
const RatingVoteView = dynamic(
  () => import("@/components/formats/rating/vote-view").then((m) => m.RatingVoteView),
  { loading: () => <FormatSkeleton /> },
);

function FormatSkeleton() {
  return (
    <div className="mt-4 space-y-3" aria-busy="true" aria-label="Đang tải">
      <div className="h-28 animate-pulse rounded-[22px] bg-muted" />
      <div className="h-40 animate-pulse rounded-[22px] bg-muted" />
    </div>
  );
}

type FormatViews = {
  VoteView: ComponentType;
  narrow: (room: Room) => boolean;
};

const VIEWS: Partial<Record<FormatId, FormatViews>> = {
  bracket: { VoteView: BracketVoteView, narrow: (room) => room.status === "qualify" },
  quick: { VoteView: QuickVoteView, narrow: () => true },
  schedule: { VoteView: ScheduleVoteView, narrow: () => true },
  swipe: { VoteView: SwipeVoteView, narrow: () => true },
  ranking: { VoteView: RankingVoteView, narrow: () => true },
  rating: { VoteView: RatingVoteView, narrow: () => true },
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
