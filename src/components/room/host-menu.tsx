"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Flag, ImagePlus, KeyRound, Link2, Lock, ListPlus, Pencil, RotateCcw, Settings, Shuffle, Timer, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { MemberAvatar } from "@/components/room/member-avatar";
import { useRoom } from "@/components/room/room-context";
import { roundLabel, roundList } from "@/lib/bracket";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";

type Confirm = {
  title: string;
  body: string;
  ok: string;
  run: () => Promise<void>;
};

export function HostMenu() {
  const {
    bundle,
    me,
    onlineIds,
    extendDeadline,
    endRound,
    shuffleBracket,
    setSeedingMode,
    setLocked,
    setPassword,
    setMemberUpload,
    setMemberOptions,
    kickMember,
    closeRoom,
    reopenRoom,
    setAnonymous,
    setResultsVisibility,
  } = useRoom();
  const mounted = useMounted();
  const [open, setOpen] = useState(false);
  const [pwEditing, setPwEditing] = useState(false);
  const [pwDraft, setPwDraft] = useState("");
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [busy, setBusy] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const status = bundle.room.status;
  const size = bundle.room.knockout_size;
  const inLobbyish = status === "lobby" || status === "drawn";
  const isKnockoutMode = bundle.room.mode === "knockout";
  const seeding = bundle.room.seeding_mode ?? "random";
  const canShuffle = inLobbyish && isKnockoutMode && seeding === "random" && bundle.items.length >= 2;

  const currentRound = useMemo(() => {
    if (status !== "knockout") return null;
    return (
      roundList(size).find((round) =>
        bundle.matches.some((match) => match.round === round && match.status !== "done"),
      ) ?? null
    );
  }, [bundle.matches, size, status]);

  const roundTitle =
    status === "qualify"
      ? "vòng loại"
      : currentRound != null
        ? roundLabel(currentRound, size).toLowerCase()
        : "vòng";

  const memberSub = useMemo(() => {
    const map = new Map<string, string>();
    if (status === "qualify") {
      const quota = bundle.room.votes_per_member;
      for (const member of bundle.members) {
        const used = bundle.qualifyVotes.filter((vote) => vote.member_id === member.id).length;
        map.set(member.id, `${used}/${quota} phiếu`);
      }
      return map;
    }
    if (status === "knockout") {
      const live = bundle.matches.filter((match) => match.status === "live" && match.item_a && match.item_b);
      for (const member of bundle.members) {
        const voted =
          live.length > 0 &&
          live.every((match) =>
            bundle.matchVotes.some((vote) => vote.match_id === match.id && vote.member_id === member.id),
          );
        map.set(member.id, voted ? "Đã vote" : "Chưa vote");
      }
      return map;
    }
    if (status === "open") {
      for (const member of bundle.members) {
        map.set(member.id, bundle.votes.some((vote) => vote.member_id === member.id) ? "Đã vote" : "Chưa vote");
      }
      return map;
    }
    for (const member of bundle.members) {
      map.set(member.id, onlineIds.has(member.id) ? "Đang online" : "Chưa online");
    }
    return map;
  }, [bundle.matchVotes, bundle.matches, bundle.members, bundle.qualifyVotes, bundle.room.votes_per_member, bundle.votes, onlineIds, status]);

  useEffect(() => {
    if (!open && !confirm) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (confirm) setConfirm(null);
      else setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirm, open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });
    const trigger = triggerRef.current;
    return () => {
      document.body.style.overflow = previous;
      trigger?.focus({ preventScroll: true });
    };
  }, [open]);

  if (!me.is_host) return null;

  async function copyInvite() {
    const url = `${window.location.origin}/p/${bundle.room.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Đã copy link mời");
    } catch {
      toast.error("Không copy được link. Hãy copy từ thanh địa chỉ.");
    }
  }

  async function savePassword() {
    const value = pwDraft.trim();
    if (value.length < 4 || value.length > 72) {
      toast.error("Mật khẩu từ 4 đến 72 ký tự.");
      return;
    }
    setBusy(true);
    try {
      if (await setPassword(value)) {
        setPwEditing(false);
        setPwDraft("");
      }
    } finally {
      setBusy(false);
    }
  }

  function togglePassword() {
    if (bundle.room.has_password) {
      setConfirm({
        title: "Bỏ mật khẩu phòng?",
        body: "Ai có link mời cũng vào được phòng.",
        ok: "Bỏ mật khẩu",
        run: async () => {
          await setPassword(null);
          setPwEditing(false);
        },
      });
      return;
    }
    setPwEditing((value) => !value);
  }

  async function runConfirm() {
    if (!confirm) return;
    setBusy(true);
    try {
      await confirm.run();
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }

  function askEnd() {
    setConfirm(
      status === "qualify"
        ? {
            title: "Kết thúc vòng loại?",
            body: `Top ${size} mẫu hiện tại sẽ vào sơ đồ đấu ngay. Không hoàn tác được.`,
            ok: "Kết thúc",
            run: async () => {
              await endRound();
              setOpen(false);
            },
          }
        : {
            title: `Kết thúc ${roundTitle}?`,
            body: "Các cặp đang vote sẽ chốt kết quả ngay theo số phiếu hiện tại. Không hoàn tác được.",
            ok: "Kết thúc",
            run: async () => {
              await endRound();
              setOpen(false);
            },
          },
    );
  }

  function askKick(memberId: string, name: string) {
    setConfirm({
      title: `Mời ${name} ra khỏi phòng?`,
      body: "Người này sẽ không vote được nữa.",
      ok: "Mời ra",
      run: async () => {
        await kickMember(memberId);
        toast.success("Đã mời ra");
      },
    });
  }

  const canControlRound = status === "qualify" || status === "knockout";
  const canCloseQuick = bundle.room.format !== "bracket" && status === "open";
  const canReopenQuick = bundle.room.format !== "bracket" && status === "closed";
  const isQuickish = bundle.room.format !== "bracket";
  const narrow = status === "qualify";

  function askCloseQuick() {
    setConfirm({
      title: "Chốt kết quả phòng?",
      body: "Mọi người sẽ thấy lựa chọn thắng. Không vote thêm được nữa.",
      ok: "Chốt kết quả",
      run: async () => {
        await closeRoom();
        setOpen(false);
      },
    });
  }

  function askReopenQuick() {
    setConfirm({
      title: "Mở lại vote?",
      body: "Kết quả chốt sẽ xoá, mọi người vote tiếp được.",
      ok: "Mở lại",
      run: async () => {
        await reopenRoom();
        setOpen(false);
      },
    });
  }

  const layer = mounted
    ? createPortal(
        <>
          <div
            className={cn("rs-scrim", (open || confirm) && "open", confirm && "over")}
            aria-hidden
            onClick={() => {
              if (confirm) setConfirm(null);
              else setOpen(false);
            }}
          />
          <aside
            className={cn("rs-set", narrow && "rs-set-narrow", open && "open")}
            role="dialog"
            aria-modal="true"
            aria-label="Cài đặt phòng"
            aria-hidden={!open}
            inert={!open}
          >
            <div className="rs-grab" />
            <div className="rs-head">
              <b>Cài đặt phòng</b>
              <button ref={closeRef} type="button" className="rs-x" aria-label="Đóng" onClick={() => setOpen(false)}>
                <X width={17} height={17} strokeWidth={1.9} className="shrink-0" aria-hidden />
              </button>
            </div>

            {canControlRound ? (
              <div className="rs-grp">
                <h3>Điều khiển {roundTitle}</h3>
                <div className="rs-list">
                  <button type="button" className="rs-opt" onClick={() => void extendDeadline(5)}>
                    <span className="rs-oi"><Timer width={17} height={17} strokeWidth={1.9} className="shrink-0" aria-hidden /></span>
                    <span className="rs-grow">Gia hạn +5 phút</span>
                  </button>
                  <button type="button" className="rs-opt" onClick={() => void extendDeadline(15)}>
                    <span className="rs-oi"><Timer width={17} height={17} strokeWidth={1.9} className="shrink-0" aria-hidden /></span>
                    <span className="rs-grow">Gia hạn +15 phút</span>
                  </button>
                  <button type="button" className="rs-opt danger" onClick={askEnd}>
                    <span className="rs-oi"><Flag width={17} height={17} strokeWidth={1.9} className="shrink-0" aria-hidden /></span>
                    <span className="rs-grow">
                      Kết thúc {roundTitle} ngay
                      <small>
                        {status === "qualify" ? `Chốt top ${size} vào sơ đồ đấu` : "Chốt kết quả các cặp đang vote"}
                      </small>
                    </span>
                  </button>
                </div>
              </div>
            ) : null}

            {canCloseQuick ? (
              <div className="rs-grp">
                <h3>Điều khiển vote</h3>
                <div className="rs-list">
                  <button type="button" className="rs-opt danger" onClick={askCloseQuick}>
                    <span className="rs-oi"><Flag width={17} height={17} strokeWidth={1.9} className="shrink-0" aria-hidden /></span>
                    <span className="rs-grow">
                      Chốt kết quả
                      <small>Khóa vote và công bố lựa chọn thắng</small>
                    </span>
                  </button>
                </div>
              </div>
            ) : null}

            {canReopenQuick ? (
              <div className="rs-grp">
                <h3>Điều khiển vote</h3>
                <div className="rs-list">
                  <button type="button" className="rs-opt" onClick={askReopenQuick}>
                    <span className="rs-oi"><RotateCcw width={17} height={17} strokeWidth={1.9} className="shrink-0" aria-hidden /></span>
                    <span className="rs-grow">
                      Mở lại vote
                      <small>Xoá kết quả chốt, cho vote tiếp</small>
                    </span>
                  </button>
                </div>
              </div>
            ) : null}

            <div className="rs-grp">
              <h3>Phòng</h3>
              <div className="rs-list">
                <button
                  type="button"
                  className="rs-opt"
                  role="switch"
                  aria-checked={bundle.room.locked}
                  onClick={() => void setLocked(!bundle.room.locked)}
                >
                  <span className="rs-oi"><Lock width={17} height={17} strokeWidth={1.9} className="shrink-0" aria-hidden /></span>
                  <span className="rs-grow">
                    Khóa phòng
                    <small>Không nhận thêm người mới</small>
                  </span>
                  <span className={cn("rs-sw", bundle.room.locked && "on")} aria-hidden />
                </button>
                <button
                  type="button"
                  className="rs-opt"
                  role="switch"
                  aria-checked={bundle.room.has_password}
                  onClick={togglePassword}
                >
                  <span className="rs-oi"><KeyRound width={17} height={17} strokeWidth={1.9} className="shrink-0" aria-hidden /></span>
                  <span className="rs-grow">
                    Mật khẩu phòng
                    <small>
                      {bundle.room.has_password ? "Người mới phải nhập mật khẩu" : "Tắt · có link là vào được"}
                    </small>
                  </span>
                  <span className={cn("rs-sw", (bundle.room.has_password || pwEditing) && "on")} aria-hidden />
                </button>
                {bundle.room.has_password && !pwEditing ? (
                  <button type="button" className="rs-opt" onClick={() => setPwEditing(true)}>
                    <span className="rs-oi"><Pencil width={17} height={17} strokeWidth={1.9} className="shrink-0" aria-hidden /></span>
                    <span className="rs-grow">Đổi mật khẩu</span>
                  </button>
                ) : null}
                {pwEditing ? (
                  <form
                    className="rs-pw"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void savePassword();
                    }}
                  >
                    <input
                      type="text"
                      autoComplete="off"
                      className="rs-input"
                      placeholder={bundle.room.has_password ? "Mật khẩu mới (4–72 ký tự)" : "Mật khẩu (4–72 ký tự)"}
                      aria-label="Mật khẩu phòng"
                      value={pwDraft}
                      maxLength={72}
                      onChange={(event) => setPwDraft(event.target.value)}
                    />
                    <div className="rs-pw-acts">
                      <button
                        type="button"
                        className="rs-btn rs-btn-ghost"
                        onClick={() => {
                          setPwEditing(false);
                          setPwDraft("");
                        }}
                      >
                        Hủy
                      </button>
                      <button type="submit" className="rs-btn rs-btn-dark" disabled={busy}>
                        {busy ? "Đang lưu..." : "Lưu"}
                      </button>
                    </div>
                  </form>
                ) : null}
                <button type="button" className="rs-opt" onClick={() => void copyInvite()}>
                  <span className="rs-oi"><Link2 width={17} height={17} strokeWidth={1.9} className="shrink-0" aria-hidden /></span>
                  <span className="rs-grow">Copy link mời</span>
                </button>
                {inLobbyish ? (
                  <button
                    type="button"
                    className="rs-opt"
                    role="switch"
                    aria-checked={bundle.room.allow_member_upload}
                    onClick={() => void setMemberUpload(!bundle.room.allow_member_upload)}
                  >
                    <span className="rs-oi"><ImagePlus width={17} height={17} strokeWidth={1.9} className="shrink-0" aria-hidden /></span>
                    <span className="rs-grow">
                      Thành viên được tải mẫu
                      <small>Tắt thì chỉ chủ phòng tải ảnh</small>
                    </span>
                    <span className={cn("rs-sw", bundle.room.allow_member_upload && "on")} aria-hidden />
                  </button>
                ) : null}
                {isQuickish && status === "open" ? (
                  <button
                    type="button"
                    className="rs-opt"
                    role="switch"
                    aria-checked={bundle.room.allow_member_options}
                    onClick={() => void setMemberOptions(!bundle.room.allow_member_options)}
                  >
                    <span className="rs-oi"><ListPlus width={17} height={17} strokeWidth={1.9} className="shrink-0" aria-hidden /></span>
                    <span className="rs-grow">
                      Thành viên được thêm lựa chọn
                      <small>Tắt thì chỉ chủ phòng thêm</small>
                    </span>
                    <span className={cn("rs-sw", bundle.room.allow_member_options && "on")} aria-hidden />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="rs-opt"
                  role="switch"
                  aria-checked={bundle.room.anonymous}
                  onClick={() => void setAnonymous(!bundle.room.anonymous)}
                >
                  <span className="rs-oi"><Lock width={17} height={17} strokeWidth={1.9} className="shrink-0" aria-hidden /></span>
                  <span className="rs-grow">
                    Vote ẩn danh
                    <small>Không ai thấy ai chọn gì, kể cả chủ phòng</small>
                  </span>
                  <span className={cn("rs-sw", bundle.room.anonymous && "on")} aria-hidden />
                </button>
                <div className="rs-opt" style={{ display: "block" }}>
                  <span className="rs-grow">
                    Hiện kết quả
                    <small className="block mt-2 space-y-1">
                      {(["live", "after_vote", "after_close"] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          className={cn(
                            "mr-1 rounded-full px-2 py-1 text-xs font-bold",
                            bundle.room.results_visibility === v ? "bg-primary text-white" : "bg-muted",
                          )}
                          onClick={() => void setResultsVisibility(v)}
                        >
                          {v === "live" ? "Ngay" : v === "after_vote" ? "Sau khi vote" : "Khi chốt"}
                        </button>
                      ))}
                    </small>
                  </span>
                </div>
                {inLobbyish && isKnockoutMode ? (
                  <button
                    type="button"
                    className="rs-opt"
                    role="switch"
                    aria-checked={seeding === "manual"}
                    onClick={() => void setSeedingMode(seeding === "manual" ? "random" : "manual")}
                  >
                    <span className="rs-oi"><Wand2 width={17} height={17} strokeWidth={1.9} className="shrink-0" aria-hidden /></span>
                    <span className="rs-grow">
                      Chủ phòng tự xếp nhánh
                      <small>Đổi chỗ mẫu trên sơ đồ trước khi bắt đầu</small>
                    </span>
                    <span className={cn("rs-sw", seeding === "manual" && "on")} aria-hidden />
                  </button>
                ) : null}
                {canShuffle ? (
                  <button type="button" className="rs-opt" onClick={() => void shuffleBracket()}>
                    <span className="rs-oi"><Shuffle width={17} height={17} strokeWidth={1.9} className="shrink-0" aria-hidden /></span>
                    <span className="rs-grow">Xáo lại nhánh</span>
                  </button>
                ) : null}
              </div>
            </div>

            <div className="rs-grp">
              <h3>Thành viên ({bundle.members.length})</h3>
              <div className="rs-list">
                {bundle.members.map((member) => (
                  <div key={member.id} className="rs-mem">
                    <span className="rs-av">
                      <MemberAvatar member={member} className="size-[34px] text-[13px]" />
                      {onlineIds.has(member.id) ? <i className="rs-on-dot" /> : null}
                    </span>
                    <span className="rs-nm">
                      {member.id === me.id ? "Bạn" : member.display_name}
                      <small>{memberSub.get(member.id)}</small>
                    </span>
                    {member.is_host ? (
                      <span className="rs-host-tag">Chủ phòng</span>
                    ) : (
                      <button
                        type="button"
                        className="rs-kick"
                        onClick={() => askKick(member.id, member.display_name)}
                      >
                        Mời ra
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <div
            className={cn("rs-confirm", confirm && "open")}
            role="alertdialog"
            aria-modal="true"
            aria-hidden={!confirm}
            inert={!confirm}
            aria-labelledby="rs-confirm-title"
          >
            <b id="rs-confirm-title">{confirm?.title}</b>
            <p>{confirm?.body}</p>
            <div className="rs-acts">
              <button type="button" className="rs-btn rs-btn-ghost" onClick={() => setConfirm(null)}>
                Hủy
              </button>
              <button type="button" className="rs-btn rs-btn-red" disabled={busy} onClick={() => void runConfirm()}>
                {busy ? "Đang xử lý..." : confirm?.ok}
              </button>
            </div>
          </div>
        </>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="room-icon-btn room-gear"
        aria-label="Cài đặt phòng"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Settings width={20} height={20} strokeWidth={1.9} className="shrink-0" aria-hidden />
      </button>
      {layer}
    </>
  );
}
