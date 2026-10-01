"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Countdown } from "@/components/room/countdown";
import { MemberAvatar } from "@/components/room/member-avatar";
import { useRoom } from "@/components/room/room-context";
import { ZoomButton } from "@/components/ui/zoom-button";
import { ImageLightbox } from "@/components/room/image-lightbox";
import { splitGroups } from "@/lib/group-knockout";
import { cn } from "@/lib/utils";
import type { Member } from "@/lib/types";

function ClockIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden width="15" height="15">
      <circle cx="8" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 6.5V9l1.6 1.2M6.5 2h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 8.5 6.5 12 13 4.5"
        stroke="currentColor"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function tieRuleLabel(rule: string) {
  return rule === "host" ? "ưu tiên chủ phòng" : "bốc ngẫu nhiên";
}

export function QualifyView() {
  const { bundle, me, onlineIds, toggleQualify, advance } = useRoom();
  void onlineIds;
  const isGroup = bundle.room.mode === "group_knockout";
  const topN = isGroup ? 2 : bundle.room.knockout_size;
  const groups = useMemo(() => (isGroup ? splitGroups(bundle.items) : []), [bundle.items, isGroup]);
  const [groupTab, setGroupTab] = useState(0);
  const activeGroup = groups[groupTab] ?? groups[0];
  const quota = isGroup ? 2 : bundle.room.votes_per_member;
  const memberById = useMemo(
    () => new Map(bundle.members.map((member) => [member.id, member])),
    [bundle.members],
  );

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const vote of bundle.qualifyVotes) {
      map.set(vote.item_id, (map.get(vote.item_id) ?? 0) + 1);
    }
    return map;
  }, [bundle.qualifyVotes]);

  const votersByItem = useMemo(() => {
    const map = new Map<string, Member[]>();
    for (const vote of bundle.qualifyVotes) {
      const member = memberById.get(vote.member_id);
      if (!member) continue;
      const list = map.get(vote.item_id) ?? [];
      list.push(member);
      map.set(vote.item_id, list);
    }
    return map;
  }, [bundle.qualifyVotes, memberById]);

  const mine = useMemo(
    () => new Set(bundle.qualifyVotes.filter((v) => v.member_id === me.id).map((v) => v.item_id)),
    [bundle.qualifyVotes, me.id],
  );
  const groupItemIds = useMemo(
    () => new Set((activeGroup?.items ?? bundle.items).map((i) => i.id)),
    [activeGroup, bundle.items],
  );
  const usedInGroup = [...mine].filter((id) => groupItemIds.has(id)).length;
  const used = isGroup ? usedInGroup : mine.size;
  const left = Math.max(0, quota - used);

  const ranked = useMemo(() => {
    const pool = isGroup && activeGroup ? activeGroup.items : bundle.items;
    return [...pool].sort((a, b) => {
      const delta = (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0);
      if (delta !== 0) return delta;
      return a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);
    });
  }, [activeGroup, bundle.items, counts, isGroup]);

  const maxVotes = Math.max(1, ...ranked.map((item) => counts.get(item.id) ?? 0));
  const edgeVotes = ranked[topN - 1] ? counts.get(ranked[topN - 1]!.id) ?? 0 : 0;
  const nextVotes = ranked[topN] ? counts.get(ranked[topN]!.id) ?? 0 : -1;
  const tiedAtCut = Boolean(ranked[topN] && edgeVotes > 0 && nextVotes === edgeVotes);

  const votedPeople = useMemo(() => {
    const ids = new Set(bundle.qualifyVotes.map((v) => v.member_id));
    return ids.size;
  }, [bundle.qualifyVotes]);

  const [view, setView] = useState<"list" | "grid">("list");
  const [lbId, setLbId] = useState<string | null>(null);
  const boardRef = useRef<HTMLElement>(null);
  const positionsRef = useRef<Map<string, number>>(new Map());
  const prevVotesRef = useRef<string>("");
  const toastQueue = useRef<string[]>([]);
  const toastTimer = useRef<number | undefined>(undefined);
  const [liveToast, setLiveToast] = useState<string | null>(null);
  const [toastOn, setToastOn] = useState(false);

  // FLIP: capture positions before paint when ranking changes
  useLayoutEffect(() => {
    const root = boardRef.current;
    if (!root || view !== "list") return;
    const rows = root.querySelectorAll<HTMLElement>("[data-ql-id]");
    rows.forEach((el) => {
      const id = el.dataset.qlId;
      if (!id) return;
      const prev = positionsRef.current.get(id);
      const next = el.getBoundingClientRect().top;
      if (prev != null) {
        const delta = prev - next;
        if (Math.abs(delta) > 1) {
          el.animate([{ transform: `translateY(${delta}px)` }, { transform: "none" }], {
            duration: 450,
            easing: "cubic-bezier(.2,.8,.2,1)",
          });
        }
      }
      positionsRef.current.set(id, next);
    });
  }, [ranked, view]);

  // Live toast when others vote (throttle 2s, coalesce)
  useEffect(() => {
    const key = bundle.qualifyVotes.map((v) => `${v.member_id}:${v.item_id}`).sort().join("|");
    const prev = prevVotesRef.current;
    if (!prev) {
      prevVotesRef.current = key;
      return;
    }
    if (key === prev) return;

    const prevSet = new Set(prev.split("|").filter(Boolean));
    const added: string[] = [];
    for (const vote of bundle.qualifyVotes) {
      const token = `${vote.member_id}:${vote.item_id}`;
      if (prevSet.has(token)) continue;
      if (vote.member_id === me.id) continue;
      const member = memberById.get(vote.member_id);
      const item = bundle.items.find((i) => i.id === vote.item_id);
      if (member && item) {
        added.push(`${member.display_name} vừa chọn ${item.title || "mẫu"}`);
      }
    }
    prevVotesRef.current = key;
    if (added.length === 0) return;

    toastQueue.current.push(...added);
    if (toastTimer.current) return;
    const flush = () => {
      const batch = toastQueue.current.splice(0, toastQueue.current.length);
      if (batch.length === 0) {
        toastTimer.current = undefined;
        return;
      }
      const text =
        batch.length === 1
          ? batch[0]!
          : `${batch[0]} · +${batch.length - 1} vote khác`;
      setLiveToast(text);
      setToastOn(true);
      window.setTimeout(() => setToastOn(false), 1600);
      toastTimer.current = window.setTimeout(flush, 2000);
    };
    flush();
  }, [bundle.items, bundle.qualifyVotes, me.id, memberById]);

  async function onPick(itemId: string) {
    const selected = mine.has(itemId);
    if (!selected && left <= 0) {
      toast.error("Hết phiếu, bỏ chọn một mẫu để đổi");
      return;
    }
    await toggleQualify(itemId);
  }

  const voteCounts = Object.fromEntries(counts);
  const lbItem = lbId ? bundle.items.find((i) => i.id === lbId) : null;

  return (
    <div className={cn("ql", view === "grid" && "gv")}>

      <section className="ql-sum glass">
        <div className="ql-sum-top">
          <span className="ql-stage">{isGroup ? `Vòng bảng ${activeGroup?.label ?? ""}` : "Vòng loại"}</span>
          {bundle.room.qualify_deadline ? (
            <span className="ko-timer">
              <ClockIcon />
              <Countdown deadline={bundle.room.qualify_deadline} onDone={() => void advance(false)} />
            </span>
          ) : null}
        </div>
        <h1>
          {isGroup
            ? `Nhất và nhì bảng ${activeGroup?.label ?? ""} vào sơ đồ`
            : `Top ${topN} mẫu nhiều phiếu nhất vào sơ đồ đấu`}
        </h1>
        <p>
          {isGroup
            ? "Mỗi bảng chọn 2 mẫu bạn thích. Vạch “Vào vòng trong” sau hạng 2."
            : "Chọn những mẫu bạn thích. Đổi phiếu thoải mái đến khi hết giờ."}
        </p>
        <div className="ql-stats">
          <div className="ql-stat">
            <small>Mẫu</small>
            <b>{bundle.items.length}</b>
          </div>
          <div className="ql-stat">
            <small>Đã vote</small>
            <b>
              {votedPeople}/{bundle.members.length}
            </b>
          </div>
          <div className="ql-stat">
            <small>Vào sơ đồ</small>
            <b>Top {topN}</b>
          </div>
        </div>
      </section>

      {isGroup && groups.length > 1 ? (
        <div className="ql-seg mb-3 mt-3" role="tablist">
          {groups.map((g, i) => (
            <button
              key={g.label}
              type="button"
              role="tab"
              className={groupTab === i ? "on" : undefined}
              onClick={() => setGroupTab(i)}
            >
              Bảng {g.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="ql-tools">
        <h2>{view === "grid" ? "Tất cả mẫu" : isGroup ? `Bảng ${activeGroup?.label ?? ""}` : "Bảng xếp hạng"}</h2>
        <div className="ql-seg" role="tablist">
          <button
            type="button"
            role="tab"
            className={view === "list" ? "on" : undefined}
            aria-selected={view === "list"}
            onClick={() => setView("list")}
          >
            Xếp hạng
          </button>
          <button
            type="button"
            role="tab"
            className={view === "grid" ? "on" : undefined}
            aria-selected={view === "grid"}
            onClick={() => setView("grid")}
          >
            Lưới ảnh
          </button>
        </div>
      </div>

      <section className="ql-board glass" ref={boardRef} aria-live="polite">
        {ranked.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Chưa có mẫu trong vòng loại.</p>
        ) : (
          ranked.map((item, index) => {
            const votes = counts.get(item.id) ?? 0;
            const inTop = index < topN;
            const selected = mine.has(item.id);
            const dim = left <= 0 && !selected;
            const voters = votersByItem.get(item.id) ?? [];
            return (
              <div key={item.id} className="contents">
                {index === topN ? (
                  <>
                    <div className="ql-cut">
                      <span>{isGroup ? "Vào vòng trong · Hạng 1–2" : `Vạch vào sơ đồ · Top ${topN}`}</span>
                    </div>
                    {tiedAtCut ? (
                      <p className="ql-tie">
                        Đang hòa phiếu ở vạch, hết giờ sẽ xử lý theo luật: {tieRuleLabel(bundle.room.tie_rule)}
                      </p>
                    ) : null}
                  </>
                ) : null}
                <div
                  className={cn("ql-row", inTop && "in", index === 0 && votes > 0 && "top1", selected && "mine")}
                  data-ql-id={item.id}
                >
                  <div className="ql-rank">{index + 1}</div>
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      className="ql-thumb"
                      aria-label={`Xem to ${item.title || "mẫu"}`}
                      onClick={() => setLbId(item.id)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image_url ?? undefined} alt="" className={cn(item.is_transparent && "drop-shadow")} />
                    </button>
                    <ZoomButton label={item.title || "mẫu"} size="sm" onClick={() => setLbId(item.id)} />
                  </div>
                  <div className="ql-info">
                    <b>{item.title || "Mẫu"}</b>
                    <div className="ql-meta">
                      <div className="ql-pbar">
                        <i style={{ width: `${(votes / maxVotes) * 100}%` }} />
                      </div>
                      <span className="ql-cnt">{votes} phiếu</span>
                    </div>
                    <div className="ql-voters">
                      <VoterChips members={voters} />
                    </div>
                  </div>
                  <PickButton selected={selected} dim={dim} onClick={() => void onPick(item.id)} name={item.title || "mẫu"} />
                </div>
              </div>
            );
          })
        )}
      </section>

      <section className="ql-grid">
        {ranked.map((item, index) => {
          const votes = counts.get(item.id) ?? 0;
          const inTop = index < topN;
          const selected = mine.has(item.id);
          const dim = left <= 0 && !selected;
          return (
            <div key={item.id} className={cn("ql-card", inTop && "in", selected && "mine")}>
              <div className="relative">
                <button type="button" className="ql-img" aria-label={`Xem to ${item.title || "mẫu"}`} onClick={() => setLbId(item.id)}>
                  <span className="ql-badge">#{index + 1}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image_url ?? undefined} alt="" className={cn(item.is_transparent && "drop-shadow")} />
                </button>
                <ZoomButton label={item.title || "mẫu"} onClick={() => setLbId(item.id)} />
              </div>
              <b>{item.title || "Mẫu"}</b>
              <div className="ql-meta">
                <div className="ql-pbar">
                  <i style={{ width: `${(votes / maxVotes) * 100}%` }} />
                </div>
                <span className="ql-cnt">{votes}</span>
              </div>
              <PickButton selected={selected} dim={dim} full onClick={() => void onPick(item.id)} name={item.title || "mẫu"} />
            </div>
          );
        })}
      </section>

      <div className="ql-dock glass">
        <div className="ql-pips" aria-hidden>
          {Array.from({ length: quota }, (_, i) => (
            <i key={i} className={i < used ? "used" : undefined} />
          ))}
        </div>
        <div className="ql-dock-txt">
          <b>{left > 0 ? `Bạn còn ${left} phiếu` : "Bạn đã dùng hết phiếu"}</b>
          <span>Mỗi người có {quota} phiếu</span>
        </div>
        <button
          type="button"
          className="btn btn-dark min-h-11 shrink-0"
          onClick={() => {
            setView("list");
            boardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        >
          Xem top {topN}
        </button>
      </div>

      {liveToast ? (
        <div className={cn("ql-toast", toastOn && "show")} role="status">
          {liveToast}
        </div>
      ) : null}

      <ImageLightbox
        open={Boolean(lbItem)}
        startId={lbId ?? ""}
        items={ranked.length > 0 ? ranked : bundle.items}
        onClose={() => setLbId(null)}
        voteCounts={voteCounts}
        keepOpen
        selectedIds={mine}
        context={{
          mode: "qualify",
          remaining: left,
          chosenId: lbId && mine.has(lbId) ? lbId : null,
          canVote: true,
          onVote: (itemId) => void onPick(itemId),
        }}
      />
    </div>
  );
}

function PickButton({
  selected,
  dim,
  full,
  onClick,
  name,
}: {
  selected: boolean;
  dim: boolean;
  full?: boolean;
  onClick: () => void;
  name: string;
}) {
  return (
    <button
      type="button"
      className={cn("ql-pick", selected && "on", dim && "dim", full && "w-full")}
      aria-label={selected ? `Bỏ chọn ${name}` : `Chọn ${name}`}
      onClick={onClick}
    >
      {selected ? <CheckIcon /> : <PlusIcon />}
      <span className="t">{selected ? "Đã chọn" : "Chọn"}</span>
    </button>
  );
}

function VoterChips({ members }: { members: Member[] }) {
  if (members.length === 0) return null;
  const shown = members.slice(0, 5);
  const extra = members.length - shown.length;
  return (
    <>
      <div className="flex">
        {shown.map((member, index) => (
          <span key={member.id} style={{ marginLeft: index === 0 ? 0 : -7 }}>
            <MemberAvatar member={member} className="size-6 border-2 border-white text-[10px]" />
          </span>
        ))}
      </div>
      {extra > 0 ? <span className="more ml-1.5 text-[11px] font-bold text-muted-foreground">+{extra}</span> : null}
    </>
  );
}
