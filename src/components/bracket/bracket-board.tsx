"use client";

import { useEffect, useMemo, useState } from "react";
import {
  feederMatch,
  halfPositions,
  matchKey,
  matchesInRound,
  roundAbbr,
  roundCount,
  roundLabel,
} from "@/lib/bracket";
import type { Item, Match, MatchVote, Member } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Legacy helper — board is fluid now. */
export function bracketSize(size: number) {
  const rounds = roundCount(size);
  return { width: Math.max(320, rounds * 220), height: Math.max(360, size * 28) };
}

function findMatch(matches: Match[], round: number, position: number) {
  return matches.find((match) => match.round === round && match.position === position);
}

function isBye(match?: Match) {
  if (!match) return false;
  return (
    (Boolean(match.item_a) && !match.item_b) ||
    (Boolean(match.item_b) && !match.item_a)
  );
}

export type SlotEditConfig = {
  selectedSlot: number | null;
  onSlotActivate: (slotIndex: number) => void;
  onSlotDrop?: (from: number, to: number) => void;
};

export function BracketBoard({
  size,
  matches,
  items,
  matchVotes,
  meId,
  championItemId,
  preview,
  onSelectMatch,
  seedByItem,
  showSeeds,
  slotEdit,
}: {
  size: number;
  matches: Match[];
  items: Item[];
  members: Member[];
  matchVotes: MatchVote[];
  meId: string;
  championItemId?: string | null;
  preview?: boolean;
  onSelectMatch?: (matchId: string) => void;
  seedByItem?: Record<string, number>;
  showSeeds?: boolean;
  slotEdit?: SlotEditConfig;
}) {
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const finalRound = roundCount(size);
  const champion =
    (championItemId ? itemById.get(championItemId) : undefined) ??
    (findMatch(matches, finalRound, 0)?.winner_item_id
      ? itemById.get(findMatch(matches, finalRound, 0)!.winner_item_id!)
      : undefined);

  const [flash, setFlash] = useState<Set<string>>(new Set());
  const [seenDone, setSeenDone] = useState(() =>
    new Set(matches.filter((m) => m.status === "done").map((m) => m.id)),
  );
  const doneIds = matches.filter((m) => m.status === "done").map((m) => m.id);
  const doneKey = doneIds.join(",");
  const seenKey = [...seenDone].join(",");
  if (doneKey !== seenKey) {
    const nextFlash = new Set<string>();
    for (const match of matches) {
      if (match.status === "done" && match.winner_item_id && !seenDone.has(match.id)) {
        nextFlash.add(matchKey(match.round, match.position));
      }
    }
    setSeenDone(new Set(doneIds));
    if (nextFlash.size > 0) setFlash(nextFlash);
  }

  useEffect(() => {
    if (flash.size === 0) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setFlash(new Set()), reduce ? 0 : 700);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const leftRounds = Array.from({ length: Math.max(0, finalRound - 1) }, (_, i) => i + 1);
  const rightRounds = [...leftRounds].reverse();

  return (
    <div className="ko-board">
      <div className="ko-board-head">
        <h2>Sơ đồ đấu</h2>
        <div className="ko-legend">
          <span>
            <i className="lg-live" />
            Đang vote
          </span>
          <span>
            <i className="lg-done" />
            Đã xong
          </span>
          <span>
            <i className="lg-wait" />
            Chờ
          </span>
        </div>
      </div>

      {/* Mobile vertical */}
      <div className="ko-vbr">
        {leftRounds.map((round) => {
          const positions = halfPositions(size, round, "left");
          return (
            <div key={`v-l-${round}`}>
              {round === 1 ? <div className="ko-lbl">{roundLabel(round, size)}</div> : null}
              <MatchRow
                size={size}
                round={round}
                positions={positions}
                matches={matches}
                items={itemById}
                matchVotes={matchVotes}
                meId={meId}
                preview={preview}
                onSelectMatch={onSelectMatch}
                seedByItem={seedByItem}
                showSeeds={showSeeds}
                slotEdit={slotEdit}
              />
              <VConn
                from={positions.map((position) => findMatch(matches, round, position))}
                flash={flash}
                upward={false}
              />
            </div>
          );
        })}

        <div className="ko-final-wrap">
          <div className="ko-lbl" style={{ margin: 0 }}>
            Chung kết
          </div>
          <MatchNode
            size={size}
            match={findMatch(matches, finalRound, 0)}
            round={finalRound}
            position={0}
            items={itemById}
            matchVotes={matchVotes}
            meId={meId}
            preview={preview}
            onSelectMatch={onSelectMatch}
            seedByItem={seedByItem}
            showSeeds={showSeeds}
            slotEdit={slotEdit}
            compact
          />
          <CupBadge item={champion} />
        </div>

        {rightRounds.map((round) => {
          const positions = halfPositions(size, round, "right");
          return (
            <div key={`v-r-${round}`}>
              <VConn
                from={positions.map((position) => findMatch(matches, round, position))}
                flash={flash}
                upward
              />
              <MatchRow
                size={size}
                round={round}
                positions={positions}
                matches={matches}
                items={itemById}
                matchVotes={matchVotes}
                meId={meId}
                preview={preview}
                onSelectMatch={onSelectMatch}
                seedByItem={seedByItem}
                showSeeds={showSeeds}
                slotEdit={slotEdit}
              />
              {round === 1 ? (
                <div className="ko-lbl" style={{ marginTop: 6 }}>
                  {roundLabel(round, size)}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Desktop horizontal */}
      <div className="ko-hbr">
        {leftRounds.map((round) => {
          const positions = halfPositions(size, round, "left");
          return (
            <div key={`h-l-${round}`} className="ko-h-pair">
              <div className="ko-col">
                {positions.map((position) => (
                  <MatchNode
                    key={matchKey(round, position)}
                    size={size}
                    match={findMatch(matches, round, position)}
                    round={round}
                    position={position}
                    items={itemById}
                    matchVotes={matchVotes}
                    meId={meId}
                    preview={preview}
                    onSelectMatch={onSelectMatch}
                    seedByItem={seedByItem}
                    showSeeds={showSeeds}
                    slotEdit={slotEdit}
                  />
                ))}
              </div>
              <HConn
                matches={positions.map((position) => findMatch(matches, round, position))}
                flash={flash}
                reverse={false}
              />
            </div>
          );
        })}

        <div className="ko-col ko-col-f">
          <div className="ko-final-wrap">
            <CupBadge item={champion} />
            <div className="ko-lbl">Chung kết</div>
            <MatchNode
              size={size}
              match={findMatch(matches, finalRound, 0)}
              round={finalRound}
              position={0}
              items={itemById}
              matchVotes={matchVotes}
              meId={meId}
              preview={preview}
              onSelectMatch={onSelectMatch}
              seedByItem={seedByItem}
              showSeeds={showSeeds}
              slotEdit={slotEdit}
            />
          </div>
        </div>

        {rightRounds.map((round) => {
          const positions = halfPositions(size, round, "right");
          return (
            <div key={`h-r-${round}`} className="ko-h-pair">
              <HConn
                matches={positions.map((position) => findMatch(matches, round, position))}
                flash={flash}
                reverse
              />
              <div className="ko-col">
                {positions.map((position) => (
                  <MatchNode
                    key={matchKey(round, position)}
                    size={size}
                    match={findMatch(matches, round, position)}
                    round={round}
                    position={position}
                    items={itemById}
                    matchVotes={matchVotes}
                    meId={meId}
                    preview={preview}
                    onSelectMatch={onSelectMatch}
                    seedByItem={seedByItem}
                    showSeeds={showSeeds}
                    slotEdit={slotEdit}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatchRow({
  size,
  round,
  positions,
  matches,
  items,
  matchVotes,
  meId,
  preview,
  onSelectMatch,
  seedByItem,
  showSeeds,
  slotEdit,
}: {
  size: number;
  round: number;
  positions: number[];
  matches: Match[];
  items: Map<string, Item>;
  matchVotes: MatchVote[];
  meId: string;
  preview?: boolean;
  onSelectMatch?: (matchId: string) => void;
  seedByItem?: Record<string, number>;
  showSeeds?: boolean;
  slotEdit?: SlotEditConfig;
}) {
  const dense = positions.length >= 4;
  return (
    <div className={cn("ko-vrow", positions.length === 1 && "one", dense && "dense")}>
      {positions.map((position) => (
        <MatchNode
          key={matchKey(round, position)}
          size={size}
          match={findMatch(matches, round, position)}
          round={round}
          position={position}
          items={items}
          matchVotes={matchVotes}
          meId={meId}
          preview={preview}
          onSelectMatch={onSelectMatch}
          seedByItem={seedByItem}
          showSeeds={showSeeds}
          slotEdit={slotEdit}
        />
      ))}
    </div>
  );
}

function MatchNode({
  size,
  match,
  round,
  position,
  items,
  matchVotes,
  meId,
  preview,
  onSelectMatch,
  seedByItem,
  showSeeds,
  slotEdit,
  compact,
}: {
  size: number;
  match?: Match;
  round: number;
  position: number;
  items: Map<string, Item>;
  matchVotes: MatchVote[];
  meId: string;
  preview?: boolean;
  onSelectMatch?: (matchId: string) => void;
  seedByItem?: Record<string, number>;
  showSeeds?: boolean;
  slotEdit?: SlotEditConfig;
  compact?: boolean;
}) {
  const votes = match ? matchVotes.filter((vote) => vote.match_id === match.id) : [];
  const mine = votes.find((vote) => vote.member_id === meId)?.item_id ?? null;
  const status = match?.status ?? "pending";
  const bye = isBye(match);
  const need = status === "live" && !mine && !preview;
  const voted = status === "live" && Boolean(mine) && !preview;
  const editing = Boolean(slotEdit && round === 1);

  const label = `${roundLabel(round, size)}${roundCount(size) === round ? "" : ` ${position + 1}`}`;
  const className = cn(
    "ko-mn",
    status,
    need && "need",
    bye && status === "done" && "bye",
    compact && "compact",
    editing && "editing",
  );

  const sides = (
    <>
      {need ? <span className="ko-tag need">Chờ bạn vote</span> : null}
      {voted ? <span className="ko-tag ok">Đã vote ✓</span> : null}
      <SideRow
        size={size}
        match={match}
        round={round}
        position={position}
        side="a"
        items={items}
        votes={votes}
        mine={mine}
        seedByItem={seedByItem}
        showSeeds={showSeeds}
        slotEdit={slotEdit}
      />
      <SideRow
        size={size}
        match={match}
        round={round}
        position={position}
        side="b"
        items={items}
        votes={votes}
        mine={mine}
        seedByItem={seedByItem}
        showSeeds={showSeeds}
        slotEdit={slotEdit}
      />
    </>
  );

  if (editing) {
    return (
      <div className={className} aria-label={label}>
        {sides}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      disabled={!match || !onSelectMatch}
      onClick={() => match && onSelectMatch?.(match.id)}
    >
      {sides}
    </button>
  );
}

function SideRow({
  size,
  match,
  round,
  position,
  side,
  items,
  votes,
  mine,
  seedByItem,
  showSeeds,
  slotEdit,
}: {
  size: number;
  match?: Match;
  round: number;
  position: number;
  side: "a" | "b";
  items: Map<string, Item>;
  votes: MatchVote[];
  mine: string | null;
  seedByItem?: Record<string, number>;
  showSeeds?: boolean;
  slotEdit?: SlotEditConfig;
}) {
  const itemId = side === "a" ? match?.item_a : match?.item_b;
  const otherId = side === "a" ? match?.item_b : match?.item_a;
  const item = itemId ? items.get(itemId) : undefined;
  const count = itemId ? votes.filter((vote) => vote.item_id === itemId).length : 0;
  const done = match?.status === "done";
  const win = Boolean(done && match?.winner_item_id === itemId);
  const lose = Boolean(done && match?.winner_item_id && match.winner_item_id !== itemId);
  const bye = Boolean(itemId && !otherId);
  const chosen = Boolean(itemId && mine === itemId);
  const slotIndex = round === 1 ? position * 2 + (side === "a" ? 0 : 1) : -1;
  const editable = Boolean(slotEdit && round === 1);
  const selected = editable && slotEdit?.selectedSlot === slotIndex;
  const seed = itemId && showSeeds && seedByItem ? seedByItem[itemId] : undefined;

  function activate() {
    if (!editable || !slotEdit) return;
    slotEdit.onSlotActivate(slotIndex);
  }

  const interactiveProps = editable
    ? {
        role: "button" as const,
        tabIndex: 0,
        "aria-pressed": selected,
        onClick: (event: React.MouseEvent) => {
          event.stopPropagation();
          activate();
        },
        onKeyDown: (event: React.KeyboardEvent) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            activate();
          }
        },
        draggable: Boolean(itemId),
        onDragStart: (event: React.DragEvent) => {
          if (!itemId) {
            event.preventDefault();
            return;
          }
          event.dataTransfer.setData("text/slot", String(slotIndex));
          event.dataTransfer.effectAllowed = "move";
        },
        onDragOver: (event: React.DragEvent) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        },
        onDrop: (event: React.DragEvent) => {
          event.preventDefault();
          const raw = event.dataTransfer.getData("text/slot");
          const from = Number(raw);
          if (!Number.isFinite(from) || !slotEdit?.onSlotDrop) return;
          slotEdit.onSlotDrop(from, slotIndex);
        },
      }
    : {};

  if (!itemId) {
    // Ô bye đối diện mẫu đang đi tiếp
    if (otherId && match && isBye(match)) {
      return (
        <span
          className={cn("ko-it tbd", selected && "slot-selected")}
          {...interactiveProps}
        >
          <span className="ko-th q">—</span>
          <span className="ko-nm">Miễn đấu</span>
        </span>
      );
    }
    if (editable) {
      return (
        <span className={cn("ko-it tbd", selected && "slot-selected")} {...interactiveProps}>
          <span className="ko-th q">—</span>
          <span className="ko-nm">Trống</span>
        </span>
      );
    }
    const feeder = feederMatch(size, round, position, side);
    const placeholder = feeder
      ? `Thắng ${roundAbbr(feeder.round, size)}${matchesInRound(size, feeder.round) > 1 ? feeder.position + 1 : ""}`
      : "…";
    return (
      <span className="ko-it tbd">
        <span className="ko-th q">?</span>
        <span className="ko-nm">{placeholder}</span>
      </span>
    );
  }

  if (!item) {
    return (
      <span className="ko-it tbd">
        <span className="ko-th q">?</span>
        <span className="ko-nm">…</span>
      </span>
    );
  }

  return (
    <span
      className={cn("ko-it", win && "win", lose && "lose", bye && "bye-side", selected && "slot-selected")}
      {...interactiveProps}
    >
      <span className="ko-th">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.image_url ?? undefined} alt="" className={cn(item.is_transparent && "drop-shadow")} />
        {seed ? <span className="ko-seed">#{seed}</span> : null}
        {chosen ? (
          <span className="ko-me-dot" aria-hidden>
            <svg viewBox="0 0 16 16">
              <path
                d="M3 8.5 6.5 12 13 4.5"
                stroke="currentColor"
                strokeWidth="2.6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        ) : null}
      </span>
      <span className="ko-nm">{item.title || "Mẫu"}</span>
      {match?.status !== "pending" ? <span className="ko-ct">{count}</span> : null}
    </span>
  );
}

function CupBadge({ item }: { item?: Item }) {
  return (
    <div className="ko-cup glass">
      <span className="ko-th">
        {item ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url ?? undefined} alt="" className={cn(item.is_transparent && "drop-shadow")} />
        ) : (
          <span aria-hidden>🏆</span>
        )}
      </span>
      {item ? <span>{item.title || "Mẫu"} vô địch</span> : <em>Nhà vô địch</em>}
    </div>
  );
}

function VConn({
  from,
  flash,
  upward,
}: {
  from: (Match | undefined)[];
  flash: Set<string>;
  upward: boolean;
}) {
  if (from.length === 0) return null;
  if (from.length === 1) {
    const m = from[0];
    const on = m?.status === "done" ? "on" : "";
    const run = m && flash.has(matchKey(m.round, m.position)) ? "path-run" : "";
    return (
      <svg className="ko-conn" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden>
        <path
          className={cn(on, run)}
          d={upward ? "M50 24V0" : "M50 0V24"}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }
  const a = from[0];
  const b = from[1];
  // For 4+ in a row (size 16 R1), simplify: vertical stems from center of each pair group
  if (from.length >= 4) {
    return (
      <svg className="ko-conn" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden>
        {from.map((m, index) => {
          const x = ((index + 0.5) / from.length) * 100;
          const on = m?.status === "done" ? "on" : "";
          const run = m && flash.has(matchKey(m.round, m.position)) ? "path-run" : "";
          return (
            <path
              key={index}
              className={cn(on, run)}
              d={upward ? `M${x} 28V14H50` : `M${x} 0V14H50`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        <path
          d={upward ? "M50 14V0" : "M50 14V28"}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }
  const onA = a?.status === "done" ? "on" : "";
  const onB = b?.status === "done" ? "on" : "";
  const runA = a && flash.has(matchKey(a.round, a.position)) ? "path-run" : "";
  const runB = b && flash.has(matchKey(b.round, b.position)) ? "path-run" : "";
  return (
    <svg className="ko-conn" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden>
      {upward ? (
        <>
          <path className={cn(onA, runA)} d="M25 24V12H50" fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          <path className={cn(onB, runB)} d="M75 24V12H50" fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          <path d="M50 12V0" fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </>
      ) : (
        <>
          <path className={cn(onA, runA)} d="M25 0V12H50" fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          <path className={cn(onB, runB)} d="M75 0V12H50" fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          <path d="M50 12V24" fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </>
      )}
    </svg>
  );
}

function HConn({
  matches,
  flash,
  reverse,
}: {
  matches: (Match | undefined)[];
  flash: Set<string>;
  reverse: boolean;
}) {
  if (matches.length === 1) {
    const m = matches[0];
    const on = m?.status === "done" ? "on" : "";
    const run = m && flash.has(matchKey(m.round, m.position)) ? "path-run" : "";
    return (
      <svg className="ko-conn-h" viewBox="0 0 24 100" preserveAspectRatio="none" aria-hidden>
        <path
          className={cn(on, run)}
          d={reverse ? "M24 50H0" : "M0 50H24"}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }
  // Pair connectors for 2 matches; for 4+, space evenly
  const ys = matches.map((_, index) => ((index + 0.5) / matches.length) * 100);
  return (
    <svg className="ko-conn-h" viewBox="0 0 24 100" preserveAspectRatio="none" aria-hidden>
      {matches.map((m, index) => {
        const y = ys[index]!;
        const on = m?.status === "done" ? "on" : "";
        const run = m && flash.has(matchKey(m.round, m.position)) ? "path-run" : "";
        const d = reverse ? `M24 ${y}H12V50` : `M0 ${y}H12V50`;
        return (
          <path
            key={index}
            className={cn(on, run)}
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      <path
        d={reverse ? "M12 50H0" : "M12 50H24"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
