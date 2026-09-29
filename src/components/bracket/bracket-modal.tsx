"use client";

import { BracketBoard } from "@/components/bracket/bracket-board";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Item, Match, MatchVote, Member } from "@/lib/types";

export function BracketModal({
  open,
  onOpenChange,
  size,
  matches,
  items,
  members,
  matchVotes,
  meId,
  onSelectMatch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size: number;
  matches: Match[];
  items: Item[];
  members: Member[];
  matchVotes: MatchVote[];
  meId: string;
  onSelectMatch?: (matchId: string) => void;
  onVote?: (matchId: string, itemId: string) => void;
  onExpire?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92dvh] max-w-6xl flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <DialogTitle>Sơ đồ đấu</DialogTitle>
          <DialogClose className="inline-flex h-10 items-center rounded-2xl border border-border px-3 text-sm font-semibold">
            Đóng
          </DialogClose>
        </div>
        <div className="min-h-0 flex-1 overflow-auto rounded-2xl">
          <BracketBoard
            size={size}
            matches={matches}
            items={items}
            members={members}
            matchVotes={matchVotes}
            meId={meId}
            onSelectMatch={onSelectMatch}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
