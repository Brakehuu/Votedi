"use client";

import { useEffect, useRef, useState } from "react";
import { ZoomIcon } from "@/components/icons/zoom-icon";
import { Countdown } from "@/components/room/countdown";
import { ImageLightbox } from "@/components/room/image-lightbox";
import { MemberAvatar } from "@/components/room/member-avatar";
import { Button } from "@/components/ui/button";
import { roundLabel } from "@/lib/bracket";
import type { Item, Match, MatchVote, Member } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MatchSheet({
  open,
  match,
  size,
  items,
  members,
  votes,
  meId,
  needIds,
  onClose,
  onVote,
  onExpire,
  onNext,
}: {
  open: boolean;
  match: Match | null;
  size: number;
  items: Item[];
  members: Member[];
  votes: MatchVote[];
  meId: string;
  needIds: string[];
  onClose: () => void;
  onVote: (matchId: string, itemId: string) => void;
  onExpire: () => void;
  onNext: () => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number } | null>(null);
  const [offset, setOffset] = useState(0);
  const [offsetSnap, setOffsetSnap] = useState(`${open}:${match?.id ?? ""}`);
  const [lightboxId, setLightboxId] = useState<string | null>(null);

  const sheetKey = `${open}:${match?.id ?? ""}`;
  if (sheetKey !== offsetSnap) {
    setOffsetSnap(sheetKey);
    setOffset(0);
  }

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, open]);

  if (!open || !match) return null;

  const itemById = new Map(items.map((item) => [item.id, item]));
  const memberById = new Map(members.map((member) => [member.id, member]));
  const a = match.item_a ? itemById.get(match.item_a) : undefined;
  const b = match.item_b ? itemById.get(match.item_b) : undefined;
  const pair = [a, b].filter((item): item is Item => Boolean(item));
  const mine = votes.find((vote) => vote.member_id === meId)?.item_id ?? null;
  const countA = votes.filter((vote) => vote.item_id === match.item_a).length;
  const countB = votes.filter((vote) => vote.item_id === match.item_b).length;
  const totalVotes = Math.max(1, votes.length);
  const live = match.status === "live";
  const done = match.status === "done";
  const pending = match.status === "pending";
  const rest = needIds.filter((id) => id !== match.id);
  const title = `${roundLabel(match.round, size)}${roundLabel(match.round, size) === "Chung kết" ? "" : ` · Cặp ${match.position + 1}`}`;
  const voteCounts = Object.fromEntries(pair.map((item) => [item.id, votes.filter((v) => v.item_id === item.id).length]));

  function people(itemId: string | null) {
    return votes
      .filter((vote) => vote.item_id === itemId)
      .map((vote) => memberById.get(vote.member_id))
      .filter((member): member is Member => Boolean(member));
  }

  return (
    <>
      <div className="ko-scrim open" onClick={onClose} aria-hidden />
      <div
        ref={sheetRef}
        className="ko-sheet open"
        role="dialog"
        aria-modal
        aria-label={title}
        style={offset ? { transform: `translateY(${offset}px)` } : undefined}
        onTouchStart={(event) => {
          if (window.matchMedia("(min-width: 1000px)").matches) return;
          drag.current = { y: event.touches[0]!.clientY };
        }}
        onTouchMove={(event) => {
          if (!drag.current) return;
          const dy = event.touches[0]!.clientY - drag.current.y;
          if (dy > 0) setOffset(dy);
        }}
        onTouchEnd={() => {
          if (offset > 90) onClose();
          setOffset(0);
          drag.current = null;
        }}
      >
        <div className="ko-grab" aria-hidden />
        <div className="ko-s-head">
          <div>
            <b>{title}</b>
            <span>
              {pending
                ? "Chưa bắt đầu"
                : live
                  ? "Đang vote, đổi được đến khi hết giờ"
                  : "Đã có kết quả"}
            </span>
          </div>
          {live && match.deadline ? (
            <span className="ko-timer">
              <ClockIcon />
              <Countdown deadline={match.deadline} onDone={onExpire} />
            </span>
          ) : null}
        </div>

        {pending ? (
          <div className="ko-result">Cặp này mở khi các cặp trước có kết quả.</div>
        ) : (
          <>
            <div className="ko-duel">
              <Pick
                item={a}
                votes={countA}
                bar={countA / totalVotes}
                voters={people(match.item_a)}
                chosen={mine === match.item_a}
                won={done && match.winner_item_id === match.item_a}
                lost={done && Boolean(match.winner_item_id) && match.winner_item_id !== match.item_a}
                canVote={live && Boolean(a)}
                onVote={() => a && onVote(match.id, a.id)}
                onView={() => a && setLightboxId(a.id)}
              />
              <div className="ko-vs">VS</div>
              <Pick
                item={b}
                votes={countB}
                bar={countB / totalVotes}
                voters={people(match.item_b)}
                chosen={mine === match.item_b}
                won={done && match.winner_item_id === match.item_b}
                lost={done && Boolean(match.winner_item_id) && match.winner_item_id !== match.item_b}
                canVote={live && Boolean(b)}
                onVote={() => b && onVote(match.id, b.id)}
                onView={() => b && setLightboxId(b.id)}
              />
            </div>

            {done && match.winner_item_id ? (
              <div className="ko-result">
                {itemById.get(match.winner_item_id)?.title || "Mẫu"} thắng {Math.max(countA, countB)}–{Math.min(countA, countB)}
              </div>
            ) : (
              <div className="ko-s-foot">
                <span>
                  <strong>
                    {votes.length}/{members.length}
                  </strong>{" "}
                  người đã vote
                </span>
                <span>Bấm ảnh để xem to</span>
              </div>
            )}
          </>
        )}

        <div className="ko-s-nav">
          <Button type="button" variant="outline" className="min-h-12" onClick={onClose}>
            Xem sơ đồ
          </Button>
          <Button type="button" className="min-h-12" disabled={rest.length === 0} onClick={onNext}>
            {rest.length ? `Cặp tiếp theo (${rest.length})` : "Hết cặp cần vote"}
          </Button>
        </div>
      </div>

      {lightboxId && pair.length > 0 ? (
        <ImageLightbox
          open
          startId={lightboxId}
          items={pair}
          onClose={() => setLightboxId(null)}
          chosenId={mine}
          canVote={live}
          onVote={(itemId) => {
            onVote(match.id, itemId);
            setLightboxId(null);
          }}
          voteCounts={voteCounts}
        />
      ) : null}
    </>
  );
}

function Pick({
  item,
  votes,
  bar,
  voters,
  chosen,
  won,
  lost,
  canVote,
  onVote,
  onView,
}: {
  item?: Item;
  votes: number;
  bar: number;
  voters: Member[];
  chosen: boolean;
  won: boolean;
  lost: boolean;
  canVote: boolean;
  onVote: () => void;
  onView: () => void;
}) {
  if (!item) {
    return (
      <div className="ko-pick pending-slot">
        <div className="ko-shot empty">?</div>
        <p className="ko-p-name">Chưa có</p>
      </div>
    );
  }

  return (
    <div className={cn("ko-pick", chosen && "chosen", won && "won", lost && "lost")}>
      <button type="button" className="ko-shot" aria-label={`Xem to ${item.title || "mẫu"}`} onClick={onView}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image_url ?? undefined}
          alt={item.title || "Mẫu"}
          className={cn(item.is_transparent && "drop-shadow-lg")}
        />
        <span className="zoom" aria-hidden>
          <ZoomIcon />
        </span>
      </button>
      <div className="ko-p-name">
        {item.title || "Mẫu"}
        <small>{votes} phiếu</small>
      </div>
      <div className="ko-pbar">
        <i style={{ width: `${bar * 100}%` }} />
      </div>
      <div className="ko-voters">
        {voters.map((member) => (
          <MemberAvatar key={member.id} member={member} className="size-[26px] border-2 border-white text-[10px]" />
        ))}
      </div>
      {canVote ? (
        <button type="button" className="ko-vote-btn" onClick={onVote}>
          {chosen ? "Bạn đã chọn ✓" : "Chọn mẫu này"}
        </button>
      ) : null}
    </div>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 6.5V9l1.6 1.2M6.5 2h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
