"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MemberAvatar } from "@/components/room/member-avatar";
import { ResultsActions } from "@/components/room/results-actions";
import { ZoomButton } from "@/components/ui/zoom-button";
import { ImageLightbox } from "@/components/room/image-lightbox";
import { roundCount, roundLabel } from "@/lib/bracket";
import type { Item, Match, MatchVote, Member, QualifyVote, Room } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "rank" | "matches" | "share";

export function ResultsView({
  slug,
  room,
  items,
  members,
  matches,
  matchVotes,
  qualifyVotes,
  champion,
  runnerUp,
  third,
}: {
  slug: string;
  room: Room;
  items: Item[];
  members: Member[];
  matches: Match[];
  matchVotes: MatchVote[];
  qualifyVotes: QualifyVote[];
  champion?: Item;
  runnerUp?: Item;
  third?: Item;
}) {
  const [tab, setTab] = useState<Tab>("rank");
  const [lbId, setLbId] = useState<string | null>(null);
  const anonymous = Boolean(room.anonymous);
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const topN = room.knockout_size || Math.min(8, items.length);

  const qualifyCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const vote of qualifyVotes) {
      map.set(vote.item_id, (map.get(vote.item_id) ?? 0) + 1);
    }
    return map;
  }, [qualifyVotes]);

  const rankRows = useMemo(() => {
    if (qualifyVotes.length > 0) {
      return [...items]
        .map((item) => ({
          item,
          votes: qualifyCounts.get(item.id) ?? 0,
          voters: qualifyVotes
            .filter((v) => v.item_id === item.id)
            .map((v) => memberById.get(v.member_id))
            .filter((m): m is Member => Boolean(m)),
        }))
        .sort((a, b) => b.votes - a.votes || a.item.created_at.localeCompare(b.item.created_at));
    }
    const wins = new Map<string, number>();
    for (const match of matches) {
      if (match.winner_item_id) wins.set(match.winner_item_id, (wins.get(match.winner_item_id) ?? 0) + 1);
    }
    return [...items]
      .map((item) => ({
        item,
        votes: wins.get(item.id) ?? 0,
        voters: [] as Member[],
      }))
      .sort((a, b) => {
        if (champion && a.item.id === champion.id) return -1;
        if (champion && b.item.id === champion.id) return 1;
        if (runnerUp && a.item.id === runnerUp.id) return -1;
        if (runnerUp && b.item.id === runnerUp.id) return 1;
        return b.votes - a.votes;
      });
  }, [champion, items, matches, memberById, qualifyCounts, qualifyVotes, runnerUp]);

  const maxVotes = Math.max(1, ...rankRows.map((r) => r.votes));
  const totalVotes = matchVotes.length + qualifyVotes.length;
  const doneMatches = matches.filter((m) => m.status === "done");

  const rounds = useMemo(() => {
    const map = new Map<number, Match[]>();
    for (const match of doneMatches) {
      const list = map.get(match.round) ?? [];
      list.push(match);
      map.set(match.round, list);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [doneMatches]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/p/${slug}/ket-qua`);
      toast.success("Đã sao chép link kết quả");
    } catch {
      toast.error("Không sao chép được link");
    }
  }

  async function downloadOg() {
    try {
      const res = await fetch(`/p/${slug}/ket-qua/opengraph-image`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vote-di-${slug}-ket-qua.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Đã tải ảnh kết quả");
    } catch {
      toast.error("Không tải được ảnh");
    }
  }

  const statusLabel =
    room.status === "closed" || room.status === "done"
      ? "Đã chốt"
      : room.status === "knockout" || room.status === "qualify" || room.status === "drawn"
        ? "Đang diễn ra"
        : "Kết quả";

  const lbItem = lbId ? items.find((i) => i.id === lbId) : null;
  const lbRank = lbId ? rankRows.findIndex((r) => r.item.id === lbId) + 1 : 0;
  const lbRow = lbId ? rankRows.find((r) => r.item.id === lbId) : undefined;

  return (
    <main className="mx-auto w-full max-w-[1040px] space-y-5 px-4 py-4 pb-28">
      <p className="pt-2 text-[13px] font-bold text-[#0B7F7A]">Kết quả chi tiết</p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(26px,4vw,38px)] font-extrabold tracking-tight">{room.name}</h1>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <span className="inline-flex h-7 items-center rounded-full bg-[#E3F6F5] px-3 text-[13px] font-bold text-[#0B7F7A]">
              {statusLabel}
            </span>
            {anonymous ? (
              <span className="inline-flex h-7 items-center rounded-full bg-[#FFF1D6] px-3 text-[13px] font-bold text-[#B86E00]">
                Ẩn danh
              </span>
            ) : null}
          </div>
        </div>
        <ResultsActions slug={slug} roomName={room.name} />
      </div>

      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          ["Mẫu", items.length],
          ["Thành viên", members.length],
          ["Trận đã đấu", doneMatches.length],
          ["Lượt vote", totalVotes],
        ].map(([label, value]) => (
          <div key={String(label)} className="glass rounded-[18px] px-4 py-3.5">
            <small className="block text-[12.5px] font-semibold text-muted-foreground">{label}</small>
            <b className="mt-0.5 block text-[22px] font-extrabold tabular-nums tracking-tight">{value}</b>
          </div>
        ))}
      </section>

      {(champion || runnerUp || third) && (
        <section className="mt-1 grid grid-cols-2 items-end gap-4 md:grid-cols-[1fr_1.3fr_1fr]">
          {runnerUp ? (
            <PodiumCard
              item={runnerUp}
              rank={2}
              medal="Á quân"
              votes={qualifyCounts.get(runnerUp.id)}
              onZoom={() => setLbId(runnerUp.id)}
            />
          ) : (
            <div className="hidden md:block" />
          )}
          {champion ? (
            <PodiumCard
              item={champion}
              rank={1}
              medal="Vô địch"
              first
              votes={qualifyCounts.get(champion.id)}
              onZoom={() => setLbId(champion.id)}
              className="col-span-2 order-first md:col-span-1 md:order-none"
            />
          ) : null}
          {third ? (
            <PodiumCard
              item={third}
              rank={3}
              medal="Hạng ba"
              votes={qualifyCounts.get(third.id)}
              onZoom={() => setLbId(third.id)}
            />
          ) : runnerUp ? (
            <div className="md:hidden" />
          ) : null}
        </section>
      )}

      <div className="mt-2 grid grid-cols-3 gap-2">
        {(
          [
            ["rank", "Xếp hạng"],
            ["matches", "Các cặp đấu"],
            ["share", "Ảnh chia sẻ"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={cn(
              "h-[46px] truncate rounded-full border-[1.5px] px-2.5 text-[14.5px] font-semibold",
              tab === id
                ? "border-[#0C1B20] bg-[#0C1B20] text-white"
                : "border-[var(--line,#DCE8E8)] bg-white text-muted-foreground",
            )}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "rank" ? (
        <section className="glass space-y-1 rounded-[26px] p-1.5">
          {rankRows.map((row, index) => (
            <div key={row.item.id}>
              {index === topN && qualifyVotes.length > 0 ? (
                <div className="my-2 flex items-center gap-2.5 px-1 text-[12.5px] font-bold text-[#0B7F7A]">
                  <span className="h-0 flex-1 border-t-2 border-dashed border-[rgba(14,165,164,.45)]" />
                  Vào sơ đồ · Top {topN}
                  <span className="h-0 flex-1 border-t-2 border-dashed border-[rgba(14,165,164,.45)]" />
                </div>
              ) : null}
              <div
                className={cn(
                  "grid grid-cols-[40px_72px_1fr_auto] items-center gap-3.5 rounded-[20px] px-2.5 py-2.5 max-sm:grid-cols-[30px_60px_1fr] max-sm:gap-2.5",
                  index < topN && "bg-white/80",
                )}
              >
                <span
                  className={cn(
                    "text-center text-base font-extrabold tabular-nums text-muted-foreground",
                    index === 0 &&
                      "mx-auto grid size-8 place-items-center rounded-[10px] bg-[linear-gradient(135deg,#19C9A7,#0891B2)] text-[15px] text-white",
                  )}
                >
                  {index + 1}
                </span>
                <div className="relative size-[72px] shrink-0 overflow-hidden rounded-2xl bg-[#E8F0F0] max-sm:size-[60px]">
                  <button
                    type="button"
                    className="absolute inset-0 block"
                    aria-label={`Xem to ${row.item.title || "mẫu"}`}
                    onClick={() => setLbId(row.item.id)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={row.item.image_url ?? undefined} alt="" className="h-full w-full object-cover" />
                  </button>
                  <ZoomButton label={row.item.title || "mẫu"} size="sm" onClick={() => setLbId(row.item.id)} />
                </div>
                <div className="min-w-0">
                  <b className="block truncate text-base font-bold">{row.item.title || "Mẫu"}</b>
                  <div className="mt-1.5 flex items-center gap-2.5">
                    <i className="relative block h-[7px] max-w-[260px] flex-1 overflow-hidden rounded-full bg-[#E6EFEF] not-italic">
                      <i
                        className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(135deg,#19C9A7,#0891B2)] not-italic"
                        style={{ width: `${(row.votes / maxVotes) * 100}%` }}
                      />
                    </i>
                    <span className="whitespace-nowrap text-[13px] font-bold text-muted-foreground">{row.votes} phiếu</span>
                  </div>
                  {!anonymous && row.voters.length > 0 ? (
                    <div className="mt-2 hidden flex-wrap gap-1 sm:flex">
                      {row.voters.slice(0, 6).map((m) => (
                        <span
                          key={m.id}
                          className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#F1F6F6] py-0.5 pr-2 pl-0.5 text-[12px] font-semibold"
                        >
                          <MemberAvatar member={m} className="size-6 text-[10px]" />
                          <span className="truncate">{m.display_name}</span>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {tab === "matches" ? (
        <section className="space-y-3">
          {rounds.length === 0 ? (
            <p className="glass rounded-[22px] p-6 text-sm text-muted-foreground">Chưa có cặp đấu hoàn thành.</p>
          ) : (
            rounds.map(([round, list]) => (
              <div key={round} className="space-y-3">
                <p className="px-1 text-[13px] font-extrabold tracking-[0.04em] text-muted-foreground uppercase">
                  {roundLabel(round, room.knockout_size)}
                </p>
                {list.map((match) => {
                  const a = items.find((i) => i.id === match.item_a);
                  const b = items.find((i) => i.id === match.item_b);
                  const votes = matchVotes.filter((v) => v.match_id === match.id);
                  return (
                    <article key={match.id} className="glass grid gap-3.5 rounded-[26px] p-4 md:grid-cols-[1fr_auto_1fr]">
                      <MatchSide
                        item={a}
                        won={match.winner_item_id === a?.id}
                        votes={votes.filter((v) => v.item_id === a?.id)}
                        members={memberById}
                        anonymous={anonymous}
                        onZoom={(id) => setLbId(id)}
                      />
                      <div className="hidden place-items-center md:grid">
                        <span className="grid size-9 place-items-center rounded-full bg-[#0C1B20] text-xs font-extrabold text-white">
                          VS
                        </span>
                      </div>
                      <MatchSide
                        item={b}
                        won={match.winner_item_id === b?.id}
                        votes={votes.filter((v) => v.item_id === b?.id)}
                        members={memberById}
                        anonymous={anonymous}
                        onZoom={(id) => setLbId(id)}
                      />
                    </article>
                  );
                })}
              </div>
            ))
          )}
        </section>
      ) : null}

      {tab === "share" ? (
        <section className="glass grid items-center gap-4 rounded-[26px] p-4 md:grid-cols-[1.3fr_1fr]">
          <div className="relative aspect-[1200/630] overflow-hidden rounded-[26px] border border-[var(--line)] bg-[#F3F8F8] shadow-[0_30px_50px_-30px_rgba(8,80,90,.55)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/p/${slug}/ket-qua/opengraph-image`}
              alt="Ảnh chia sẻ kết quả"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-extrabold tracking-tight">Ảnh chia sẻ</h2>
            <p className="text-sm text-muted-foreground">Ảnh 1200×630 để dán Zalo / Messenger. Có tên phòng và mẫu vô địch.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary min-h-11" onClick={() => void downloadOg()}>
                Tải ảnh kết quả
              </button>
              <button type="button" className="btn btn-g min-h-11" onClick={() => void copyLink()}>
                Sao chép link
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="relative mt-6 overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,#19C9A7,#0EA5A4_45%,#0891B2)] px-7 py-6 text-white">
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <b className="block text-[22px] font-extrabold tracking-tight">Chưa xong? Đấu lại với nhóm này</b>
            <span className="text-[15px] opacity-90">Tạo phòng mới hoặc quay lại phòng hiện tại.</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/p/${slug}`} className="btn relative border-[1.5px] border-white/60 bg-transparent text-white">
              Quay lại phòng
            </Link>
            <Link href="/tao-phong" prefetch={false} className="btn relative bg-white text-[#0C1B20]">
              Tạo phòng mới
            </Link>
          </div>
        </div>
      </section>

      {lbItem ? (
        <ImageLightbox
          open
          startId={lbItem.id}
          items={items}
          onClose={() => setLbId(null)}
          context={{
            mode: "result",
            anonymous,
            rank: lbRank || undefined,
            votes: lbRow?.votes,
            voters: anonymous
              ? undefined
              : lbRow?.voters.map((m) => ({ id: m.id, name: m.display_name })),
          }}
        />
      ) : null}
    </main>
  );
}

function PodiumCard({
  item,
  rank,
  medal,
  first,
  votes,
  onZoom,
  className,
}: {
  item: Item;
  rank: number;
  medal: string;
  first?: boolean;
  votes?: number;
  onZoom: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-[28px] border-[1.5px] border-[var(--line)] bg-white p-3.5 shadow-[0_24px_40px_-30px_rgba(8,80,90,.5)]",
        first &&
          "border-2 border-transparent bg-[linear-gradient(#fff,#fff)_padding-box,linear-gradient(135deg,#19C9A7,#0891B2)_border-box] p-4 shadow-[0_0_0_6px_rgba(14,165,164,.1),0_40px_60px_-34px_rgba(8,145,178,.65)]",
        className,
      )}
    >
      {first ? (
        <span className="absolute -top-4 left-1/2 z-[4] flex h-9 -translate-x-1/2 items-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#19C9A7,#0891B2)] px-4 text-[13.5px] font-extrabold text-white shadow-[0_12px_22px_-10px_rgba(8,145,178,.8)]">
          Vô địch
        </span>
      ) : null}
      <div className="relative aspect-square w-full overflow-hidden rounded-[20px] bg-[#E8F0F0]">
        <button type="button" className="absolute inset-0 block" aria-label={`Xem to ${item.title || "mẫu"}`} onClick={onZoom}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image_url ?? undefined}
            alt={item.title || "Mẫu"}
            className={cn("h-full w-full object-cover", item.is_transparent && "object-contain p-[8%] drop-shadow")}
          />
        </button>
        <ZoomButton label={item.title || "mẫu"} onClick={onZoom} />
      </div>
      <div className="mt-3 flex items-center gap-2 text-[13px] font-extrabold tracking-[0.03em] text-muted-foreground uppercase">
        <span
          className={cn(
            "grid size-7 place-items-center rounded-[9px] text-[14px] font-extrabold text-white",
            rank === 1 && "bg-[linear-gradient(135deg,#19C9A7,#0891B2)]",
            rank === 2 && "bg-[#8FA1A6]",
            rank === 3 && "bg-[#C98B52]",
          )}
        >
          {rank}
        </span>
        {medal}
      </div>
      <h3 className={cn("mt-1 font-extrabold tracking-tight", first ? "text-2xl" : "text-[19px]")}>{item.title || "Mẫu"}</h3>
      {typeof votes === "number" ? <p className="mt-0.5 text-[13.5px] text-muted-foreground">{votes} phiếu</p> : null}
    </div>
  );
}

function MatchSide({
  item,
  won,
  votes,
  members,
  anonymous,
  onZoom,
}: {
  item?: Item;
  won: boolean;
  votes: MatchVote[];
  members: Map<string, Member>;
  anonymous: boolean;
  onZoom: (id: string) => void;
}) {
  if (!item) {
    return <div className="rounded-[20px] border border-dashed p-3 text-sm text-muted-foreground">Miễn đấu</div>;
  }
  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 rounded-[20px] border-[1.5px] border-[var(--line)] bg-white/70 p-3",
        won &&
          "border-2 border-transparent bg-[linear-gradient(#fff,#fff)_padding-box,linear-gradient(135deg,#19C9A7,#0891B2)_border-box] shadow-[0_0_0_4px_rgba(14,165,164,.08)]",
        !won && "opacity-80",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative size-[76px] shrink-0 overflow-hidden rounded-2xl bg-[#E8F0F0]">
          <button
            type="button"
            className="absolute inset-0 block"
            aria-label={`Xem to ${item.title || "mẫu"}`}
            onClick={() => onZoom(item.id)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.image_url ?? undefined} alt="" className="h-full w-full object-cover" />
          </button>
          <ZoomButton label={item.title || "mẫu"} size="sm" onClick={() => onZoom(item.id)} />
        </div>
        <div className="min-w-0 flex-1">
          <b className="block truncate text-base font-bold">{item.title || "Mẫu"}</b>
          {won ? <small className="mt-0.5 flex items-center gap-1 text-[12.5px] font-bold text-[#0B7F7A]">Thắng</small> : null}
        </div>
        <span className={cn("text-[30px] font-extrabold tabular-nums tracking-tight", won && "text-[#0B7F7A]")}>{votes.length}</span>
      </div>
      {!anonymous && votes.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {votes.map((vote) => {
            const member = members.get(vote.member_id);
            if (!member) return null;
            return (
              <span
                key={vote.id}
                className="inline-flex items-center gap-1.5 rounded-[15px] bg-[#F1F6F6] py-0.5 pr-2.5 pl-1 text-[12.5px] font-semibold"
              >
                <MemberAvatar member={member} className="size-6 border-0 text-[10px]" />
                {member.display_name}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/** Derive podium third from semi losers (or qualify rank #3). */
export function deriveThirdPlace({
  items,
  matches,
  knockoutSize,
  championId,
  runnerUpId,
  qualifyRankIds,
}: {
  items: Item[];
  matches: Match[];
  knockoutSize: number;
  championId?: string | null;
  runnerUpId?: string | null;
  qualifyRankIds?: string[];
}): Item | undefined {
  if (qualifyRankIds?.length) {
    const thirdId = qualifyRankIds.find((id) => id !== championId && id !== runnerUpId);
    if (thirdId) return items.find((i) => i.id === thirdId);
  }
  const finalRound = roundCount(knockoutSize);
  const semiRound = finalRound - 1;
  if (semiRound < 1) return undefined;
  const semis = matches.filter((m) => m.round === semiRound && m.status === "done" && m.winner_item_id);
  const losers = semis
    .map((m) => (m.winner_item_id === m.item_a ? m.item_b : m.item_a))
    .filter((id): id is string => Boolean(id) && id !== championId && id !== runnerUpId);
  if (losers[0]) return items.find((i) => i.id === losers[0]);
  return undefined;
}
