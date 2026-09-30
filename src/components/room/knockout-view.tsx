"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BracketBoard } from "@/components/bracket/bracket-board";
import { MatchSheet } from "@/components/bracket/match-sheet";
import { Countdown } from "@/components/room/countdown";
import { useRoom } from "@/components/room/room-context";
import { SharePanel } from "@/components/share-panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { roundLabel, roundList } from "@/lib/bracket";
import { seedNumbersFromMatches } from "@/lib/seeding";
import { cn } from "@/lib/utils";

function ClockIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 6.5V9l1.6 1.2M6.5 2h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function KnockoutView() {
  const { bundle, me, voteMatch, advance } = useRoom();
  const size = bundle.room.knockout_size;
  const done = bundle.room.status === "done";
  const [openId, setOpenId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const needIds = useMemo(() => {
    return bundle.matches
      .filter((match) => {
        if (match.status !== "live") return false;
        if (!match.item_a || !match.item_b) return false;
        const mine = bundle.matchVotes.find(
          (vote) => vote.match_id === match.id && vote.member_id === me.id,
        );
        return !mine;
      })
      .sort((a, b) => a.round - b.round || a.position - b.position)
      .map((match) => match.id);
  }, [bundle.matchVotes, bundle.matches, me.id]);

  const openMatch = openId ? bundle.matches.find((match) => match.id === openId) ?? null : null;
  const openVotes = openMatch
    ? bundle.matchVotes.filter((vote) => vote.match_id === openMatch.id)
    : [];

  const nearestDeadline = bundle.matches
    .filter((match) => match.status === "live" && match.deadline)
    .map((match) => match.deadline!)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];

  const rounds = roundList(size);
  const currentRound =
    done
      ? null
      : rounds.find((round) => bundle.matches.some((match) => match.round === round && match.status !== "done")) ??
        rounds[rounds.length - 1]!;

  const todo = done
    ? { title: "Đã có mẫu vô địch 🏆", sub: "Xem lại toàn bộ sơ đồ bên dưới" }
    : needIds.length > 0
      ? {
          title: `Còn ${needIds.length} cặp chờ bạn vote`,
          sub: "Bấm vào cặp có viền xanh trên sơ đồ, hoặc vote lần lượt",
        }
      : {
          title: "Bạn đã vote hết các cặp đang mở",
          sub: "Chờ mọi người vote xong hoặc hết giờ",
        };

  function openFirstNeed() {
    if (needIds[0]) setOpenId(needIds[0]);
  }

  function openNext() {
    const rest = needIds.filter((id) => id !== openId);
    if (rest[0]) setOpenId(rest[0]);
  }

  return (
    <div className="ko">

      <section className="ko-summary glass">
        <div className="ko-rounds" aria-label="Các vòng">
          {rounds.map((round, index) => {
            const past =
              done ||
              (currentRound != null && round < currentRound) ||
              bundle.matches.filter((m) => m.round === round).every((m) => m.status === "done");
            const on = !done && currentRound === round;
            return (
              <span key={round} className="contents">
                {index > 0 ? <span className="ko-sep" /> : null}
                <span className={cn("ko-rnd", on && "on", past && "past")}>
                  <i />
                  {roundLabel(round, size)}
                </span>
              </span>
            );
          })}
        </div>

        <div className="ko-summary-body">
          <div className="ko-todo">
            {todo.title}
            <small>{todo.sub}</small>
          </div>
          <div className="ko-sum-right">
            {done ? null : nearestDeadline ? (
              <span className="ko-timer">
                <ClockIcon />
                <Countdown deadline={nearestDeadline} onDone={() => void advance(false)} />
              </span>
            ) : (
              <span className="ko-timer muted">—</span>
            )}
            {done ? (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Link href={`/p/${bundle.room.slug}/ket-qua`} className="btn btn-primary min-h-12 flex-1">
                  Xem kết quả chi tiết
                </Link>
                <Button type="button" variant="outline" className="min-h-12 flex-1" onClick={() => setShareOpen(true)}>
                  Chia sẻ
                </Button>
              </div>
            ) : (
              <Button type="button" className="min-h-12" disabled={needIds.length === 0} onClick={openFirstNeed}>
                {needIds.length ? "Vote ngay" : "Đã vote xong"}
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="ko-board-shell glass" aria-label="Sơ đồ đấu">
        <BracketBoard
          size={size}
          matches={bundle.matches}
          items={bundle.items}
          members={bundle.members}
          matchVotes={bundle.matchVotes}
          meId={me.id}
          championItemId={bundle.room.champion_item_id}
          onSelectMatch={(matchId) => setOpenId(matchId)}
          showSeeds={
            bundle.room.mode === "qualify_knockout" || bundle.room.mode === "group_knockout"
          }
          seedByItem={
            bundle.room.mode === "qualify_knockout" || bundle.room.mode === "group_knockout"
              ? seedNumbersFromMatches(bundle.matches, size)
              : undefined
          }
        />
      </section>

      <MatchSheet
        open={Boolean(openMatch)}
        match={openMatch}
        size={size}
        items={bundle.items}
        members={bundle.members}
        votes={openVotes}
        meId={me.id}
        needIds={needIds}
        onClose={() => setOpenId(null)}
        onVote={(matchId, itemId) => void voteMatch(matchId, itemId)}
        onExpire={() => void advance(false)}
        onNext={openNext}
      />

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="!bg-[rgba(255,255,255,0.96)]">
          <DialogTitle>Chia sẻ kết quả</DialogTitle>
          <div className="mt-4">
            <SharePanel slug={bundle.room.slug} roomName={`${bundle.room.name} · mẫu vô địch`} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
