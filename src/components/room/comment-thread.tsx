"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MemberAvatar } from "@/components/room/member-avatar";
import type { Member } from "@/lib/types";

export type CommentRow = {
  id: string;
  room_id: string;
  item_id: string | null;
  member_id: string;
  body: string;
  created_at: string;
  deleted_at: string | null;
};

function linkify(text: string) {
  const parts = text.split(/(https?:\/\/\S+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary underline">
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function CommentThread({
  comments,
  members,
  me,
  anonymousComments,
  noteNotAnonymous,
  onSend,
  onDelete,
}: {
  comments: CommentRow[];
  members: Member[];
  me: Member;
  anonymousComments?: boolean;
  noteNotAnonymous?: boolean;
  onSend: (body: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const byId = new Map(members.map((m) => [m.id, m]));

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [comments.length]);

  async function submit() {
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    try {
      const ok = await onSend(body);
      if (ok) setText("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cmt">
      {noteNotAnonymous ? (
        <p className="cmt-note">Bình luận không ẩn danh — mọi người vẫn thấy tên bạn.</p>
      ) : null}
      <ul className="cmt-list">
        {comments.map((c) => {
          const author = byId.get(c.member_id);
          const name = anonymousComments ? "Thành viên ẩn danh" : author?.display_name || "Thành viên";
          return (
            <li key={c.id} className="cmt-row">
              {!anonymousComments && author ? <MemberAvatar member={author} className="size-8 text-xs" /> : (
                <span className="grid size-8 place-items-center rounded-full bg-muted text-xs">?</span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <b className="text-sm">{name}</b>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(c.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {c.deleted_at ? (
                  <p className="text-sm italic text-muted-foreground">Bình luận đã bị xoá</p>
                ) : (
                  <p className="text-sm break-words">{linkify(c.body)}</p>
                )}
              </div>
              {!c.deleted_at && (me.is_host || me.id === c.member_id) ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-muted-foreground"
                  onClick={() => void onDelete(c.id)}
                >
                  Xoá
                </button>
              ) : null}
            </li>
          );
        })}
        <div ref={endRef} />
      </ul>
      <div className="cmt-compose">
        <input
          value={text}
          maxLength={500}
          placeholder="Viết bình luận…"
          className="min-h-11 flex-1 rounded-full border border-input bg-card px-4 text-sm outline-none"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <button
          type="button"
          className="btn btn-primary min-h-11 shrink-0 px-4"
          disabled={busy || !text.trim()}
          onClick={() => void submit()}
        >
          Gửi
        </button>
      </div>
      {text.length > 450 ? (
        <p className="text-right text-xs text-muted-foreground">{text.length}/500</p>
      ) : null}
    </div>
  );
}

export function commentErrorToast(error: unknown) {
  toast.error(typeof error === "string" ? error : "Không gửi được bình luận");
}
