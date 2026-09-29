"use client";

import { Countdown } from "@/components/room/countdown";
import { VoterStack } from "@/components/room/voter-stack";
import { ZoomableItemImage } from "@/components/room/zoomable-item-image";
import { Button } from "@/components/ui/button";
import type { Item, Match, MatchVote, Member } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MatchCard({
  match,
  items,
  members,
  votes,
  meId,
  onVote,
  onExpire,
  preview,
}: {
  match?: Match;
  items: Item[];
  members: Member[];
  votes: MatchVote[];
  meId: string;
  onVote: (matchId: string, itemId: string) => void;
  onExpire: () => void;
  preview?: boolean;
}) {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const memberById = new Map(members.map((member) => [member.id, member]));
  const mine = votes.find((vote) => vote.member_id === meId)?.item_id;
  const countFor = (itemId: string | null) => votes.filter((vote) => vote.item_id === itemId).length;
  const peopleFor = (itemId: string | null) =>
    votes
      .filter((vote) => vote.item_id === itemId)
      .map((vote) => memberById.get(vote.member_id))
      .filter((member): member is Member => Boolean(member));
  const live = match?.status === "live" && !preview;
  const done = match?.status === "done";
  const total = Math.max(1, votes.length);
  const a = countFor(match?.item_a ?? null);
  const b = countFor(match?.item_b ?? null);
  const pair = [match?.item_a, match?.item_b]
    .map((id) => (id ? itemById.get(id) : undefined))
    .filter((item): item is Item => Boolean(item));
  const voteCounts = Object.fromEntries(pair.map((item) => [item.id, countFor(item.id)]));

  return (
    <article
      className={cn(
        "glass rounded-[22px] p-3",
        live && "win-glow border-2",
        match?.status === "pending" && !preview && "opacity-60",
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-semibold">
          {live ? <span className="text-primary">Đang vote · </span> : null}
          {votes.length}/{members.length} người đã vote
        </span>
        {live && match?.deadline ? <Countdown deadline={match.deadline} onDone={onExpire} /> : null}
        {done ? <span className="font-semibold text-primary">Đã có thắng</span> : null}
        {!match ? <span className="text-muted-foreground">Chưa mở</span> : null}
        {match && ((match.item_a && !match.item_b) || (!match.item_a && match.item_b)) && done ? (
          <span className="rounded-full bg-primary-soft px-2 py-1 text-xs font-semibold text-primary">Miễn đấu</span>
        ) : null}
      </div>

      <div className="flex items-stretch gap-2">
        <Side
          item={match?.item_a ? itemById.get(match.item_a) : undefined}
          pair={pair}
          bye={!match?.item_a && Boolean(match?.item_b)}
          waiting={!match?.item_a && !match?.item_b}
          label="Mẫu A"
          votes={a}
          bar={a / total}
          members={peopleFor(match?.item_a ?? null)}
          chosen={Boolean(match?.item_a && mine === match.item_a)}
          winner={Boolean(done && match?.winner_item_id && match.winner_item_id === match.item_a)}
          faded={Boolean(done && match?.winner_item_id && match.winner_item_id !== match.item_a)}
          canVote={Boolean(live && match?.item_a)}
          chosenId={mine}
          voteCounts={voteCounts}
          onVoteItem={(itemId) => match && onVote(match.id, itemId)}
          onVote={() => match?.item_a && onVote(match.id, match.item_a)}
        />
        <div className="grid place-items-center self-center">
          <span className="grid size-10 place-items-center rounded-full bg-foreground text-xs font-extrabold text-background">VS</span>
        </div>
        <Side
          item={match?.item_b ? itemById.get(match.item_b) : undefined}
          pair={pair}
          bye={!match?.item_b && Boolean(match?.item_a)}
          waiting={!match?.item_a && !match?.item_b}
          label="Mẫu B"
          votes={b}
          bar={b / total}
          members={peopleFor(match?.item_b ?? null)}
          chosen={Boolean(match?.item_b && mine === match.item_b)}
          winner={Boolean(done && match?.winner_item_id && match.winner_item_id === match.item_b)}
          faded={Boolean(done && match?.winner_item_id && match.winner_item_id !== match.item_b)}
          canVote={Boolean(live && match?.item_b)}
          chosenId={mine}
          voteCounts={voteCounts}
          onVoteItem={(itemId) => match && onVote(match.id, itemId)}
          onVote={() => match?.item_b && onVote(match.id, match.item_b)}
        />
      </div>
    </article>
  );
}

function Side({
  item,
  pair,
  bye,
  waiting,
  label,
  votes,
  bar,
  members,
  chosen,
  faded,
  winner,
  canVote,
  chosenId,
  voteCounts,
  onVoteItem,
  onVote,
}: {
  item?: Item;
  pair: Item[];
  bye?: boolean;
  waiting?: boolean;
  label: string;
  votes: number;
  bar: number;
  members: Member[];
  chosen: boolean;
  faded: boolean;
  winner: boolean;
  canVote: boolean;
  chosenId?: string | null;
  voteCounts: Record<string, number>;
  onVoteItem: (itemId: string) => void;
  onVote: () => void;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-2 rounded-2xl border border-transparent bg-white/50 p-2 dark:bg-white/5",
        faded && "opacity-40 grayscale",
        winner && "win-glow border-2",
        chosen && "border-primary",
      )}
    >
      {item ? (
        <ZoomableItemImage
          item={item}
          items={pair}
          chosenId={chosenId}
          canVote={canVote}
          onVote={onVoteItem}
          voteCounts={voteCounts}
        />
      ) : (
        <div className="grid aspect-square place-items-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
          {bye ? "Miễn đấu" : waiting ? "Chờ trận trước" : "Trống"}
        </div>
      )}
      <div className="flex items-center justify-between gap-2 px-0.5">
        <span className="truncate text-sm font-semibold">{item?.title || (bye ? "Miễn đấu" : label)}</span>
        <span className="text-sm font-extrabold tabular-nums">{votes}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <i className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.round(bar * 100)}%`, background: "var(--grad)" }} />
      </div>
      <VoterStack members={members} />
      {canVote ? (
        <Button type="button" size="sm" className="min-h-11 w-full" variant={chosen ? "secondary" : "default"} onClick={onVote}>
          {chosen ? "Bạn đã chọn ✓" : "Chọn mẫu này"}
        </Button>
      ) : null}
    </div>
  );
}
