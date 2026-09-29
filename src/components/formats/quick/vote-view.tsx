"use client";

import { useMemo, useState } from "react";
import { Check, Clock3, Plus } from "lucide-react";
import { OptionCard, OptionMedia, optionTitle } from "@/components/options/option-card";
import { Countdown } from "@/components/room/countdown";
import { ImageLightbox } from "@/components/room/image-lightbox";
import { useRoom } from "@/components/room/room-context";
import { VoterStack } from "@/components/room/voter-stack";
import { ZoomIcon } from "@/components/icons/zoom-icon";
import { FORMATS } from "@/lib/formats";
import type { Member } from "@/lib/types";
import { cn } from "@/lib/utils";

const format = FORMATS.quick;

export function QuickVoteView() {
  const { bundle, me, castVote, removeVote, clearMyVotes, closeIfDue } = useRoom();
  const { room } = bundle;
  const max = Math.max(1, room.settings.max_choices ?? 1);
  const closed = room.status === "closed";
  const [lbId, setLbId] = useState<string | null>(null);

  const rows = useMemo(() => format.computeResults!(bundle.items, bundle.votes), [bundle.items, bundle.votes]);
  const memberById = useMemo(() => new Map(bundle.members.map((member) => [member.id, member])), [bundle.members]);
  const mine = useMemo(
    () => new Set(bundle.votes.filter((vote) => vote.member_id === me.id).map((vote) => vote.item_id)),
    [bundle.votes, me.id],
  );
  const votedPeople = new Set(bundle.votes.map((vote) => vote.member_id)).size;
  const maxScore = Math.max(1, ...rows.map((row) => row.score));
  const lead = rows[0]?.score ?? 0;
  const tiedLead = lead > 0 && rows[1]?.score === lead;
  const winnerId = closed ? (room.result?.winner_item_id ?? room.champion_item_id) : null;
  const winnerRow = winnerId ? rows.find((row) => row.item.id === winnerId) : undefined;
  const imageItems = useMemo(
    () => rows.map((row) => row.item).filter((item) => item.item_type === "image" && item.image_url),
    [rows],
  );
  const left = Math.max(0, max - mine.size);

  function onPick(itemId: string) {
    if (closed) return;
    void (mine.has(itemId) ? removeVote(itemId) : castVote(itemId));
  }

  return (
    <div className="ql">
      <section className="ql-sum glass">
        <div className="ql-sum-top">
          <span className="ql-stage">
            <format.icon aria-hidden size={15} />
            {format.name}
          </span>
          {closed ? (
            <span className="ql-stage">Đã chốt</span>
          ) : room.deadline ? (
            <span className="ko-timer">
              <Clock3 aria-hidden size={15} />
              <Countdown deadline={room.deadline} onDone={() => void closeIfDue()} />
            </span>
          ) : null}
        </div>
        <h1>{closed ? "Nhóm đã chốt!" : format.hint(room.settings)}</h1>
        <p>
          {room.description ||
            (closed
              ? "Kết quả cuối cùng bên dưới."
              : room.deadline
                ? "Đổi ý thoải mái đến khi hết giờ."
                : "Đổi ý thoải mái đến khi chủ phòng chốt.")}
        </p>
        {winnerRow ? (
          <div className="qk-win">
            <OptionCard option={winnerRow.item} badge="#1" selected />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">Lựa chọn thắng</p>
              <p className="mt-1 text-2xl font-extrabold tracking-tight break-words">{optionTitle(winnerRow.item)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {winnerRow.votes} phiếu{room.result?.tied ? " · hòa, đã xử lý theo luật hòa" : ""}
              </p>
            </div>
          </div>
        ) : null}
        <div className="ql-stats">
          <div className="ql-stat">
            <small>Lựa chọn</small>
            <b>{bundle.items.length}</b>
          </div>
          <div className="ql-stat">
            <small>Đã vote</small>
            <b>
              {votedPeople}/{bundle.members.length}
            </b>
          </div>
          <div className="ql-stat">
            <small>Bạn</small>
            <b>{mine.size > 0 ? "Đã vote" : "Chưa vote"}</b>
          </div>
        </div>
      </section>

      <div className="ql-tools">
        <h2>{closed ? "Kết quả" : "Bảng xếp hạng"}</h2>
        {tiedLead && !closed ? <span className="ql-stage">Đang hòa</span> : null}
      </div>

      <section className="ql-board glass" aria-live="polite">
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Phòng chưa có lựa chọn nào.</p>
        ) : (
          rows.map((row, index) => {
            const { item } = row;
            const selected = mine.has(item.id);
            const title = optionTitle(item);
            const voters = row.voterIds
              .map((id) => memberById.get(id))
              .filter((member): member is Member => Boolean(member));
            const isImage = item.item_type === "image" && Boolean(item.image_url);
            return (
              <div
                key={item.id}
                className={cn("ql-row in", index === 0 && row.score > 0 && "top1", selected && "mine")}
              >
                <div className="ql-rank">{index + 1}</div>
                {isImage ? (
                  <button type="button" className="ql-thumb" aria-label={`Xem to ${title}`} onClick={() => setLbId(item.id)}>
                    <OptionMedia option={item} />
                    <span className="ql-zoom" aria-hidden>
                      <ZoomIcon />
                    </span>
                  </button>
                ) : (
                  <span className="ql-thumb cursor-default">
                    <OptionMedia option={item} size="sm" />
                  </span>
                )}
                <div className="ql-info">
                  <b>{title}</b>
                  {item.description ? (
                    <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                  ) : null}
                  <div className="ql-meta">
                    <div className="ql-pbar">
                      <i style={{ width: `${(row.score / maxScore) * 100}%` }} />
                    </div>
                    <span className="ql-cnt">{row.votes} phiếu</span>
                  </div>
                  {voters.length > 0 ? (
                    <div className="ql-voters">
                      <VoterStack members={voters} />
                    </div>
                  ) : null}
                </div>
                {closed ? (
                  <span />
                ) : (
                  <button
                    type="button"
                    className={cn("ql-pick", selected && "on", !selected && max > 1 && left <= 0 && "dim")}
                    aria-label={selected ? `Bỏ chọn ${title}` : `Chọn ${title}`}
                    aria-pressed={selected}
                    onClick={() => onPick(item.id)}
                  >
                    {selected ? <Check aria-hidden /> : <Plus aria-hidden />}
                    <span className="t">{selected ? "Đã chọn" : "Chọn"}</span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </section>

      {!closed ? (
        <div className="ql-dock glass">
          {max > 1 ? (
            <div className="ql-pips" aria-hidden>
              {Array.from({ length: max }, (_, i) => (
                <i key={i} className={i < mine.size ? "used" : undefined} />
              ))}
            </div>
          ) : null}
          <div className="ql-dock-txt">
            <b>
              {mine.size === 0
                ? "Bạn chưa vote"
                : max > 1
                  ? left > 0
                    ? `Bạn còn ${left} lựa chọn`
                    : "Bạn đã chọn đủ"
                  : "Bạn đã vote"}
            </b>
            <span>{max > 1 ? `Mỗi người chọn tối đa ${max}` : "Chạm lựa chọn khác để đổi"}</span>
          </div>
          {mine.size > 0 ? (
            <button type="button" className="btn btn-dark min-h-11 shrink-0" onClick={() => void clearMyVotes()}>
              Bỏ chọn hết
            </button>
          ) : null}
        </div>
      ) : null}

      <ImageLightbox
        open={Boolean(lbId)}
        startId={lbId ?? ""}
        items={imageItems}
        onClose={() => setLbId(null)}
        chosenId={lbId && mine.has(lbId) ? lbId : null}
        canVote={!closed && Boolean(lbId)}
        onVote={onPick}
        voteCounts={Object.fromEntries(rows.map((row) => [row.item.id, row.votes]))}
        keepOpen
        selectedIds={mine}
      />
    </div>
  );
}
