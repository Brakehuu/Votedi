"use client";

import { useRouter } from "next/navigation";
import { HostMenu } from "@/components/room/host-menu";
import { MemberAvatar } from "@/components/room/member-avatar";
import { useRoom } from "@/components/room/room-context";

const MAX_AVATARS = 5;

/** Sticky one-row room header: back · name · N người · avatars · settings */
export function RoomTopBar() {
  const { bundle, onlineIds, me } = useRoom();
  const router = useRouter();
  const count = bundle.members.length;
  const extra = count - MAX_AVATARS;

  return (
    <header className="room-top">
      <div className="room-bar">
        <button type="button" className="room-icon-btn" aria-label="Quay lại" onClick={() => router.push("/")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <div className="room-meta">
          <b title={bundle.room.name}>{bundle.room.name}</b>
          <span>
            <i className="room-online-dot" aria-hidden />
            {me.is_host ? `${count} người · Bạn là chủ phòng` : `${count} người trong phòng`}
          </span>
        </div>
        <div className="room-people" aria-hidden>
          {bundle.members.slice(0, MAX_AVATARS).map((member) => (
            <span key={member.id} className="room-people-av">
              <MemberAvatar member={member} className="size-[30px] border-2 border-white text-[11px]" />
              {onlineIds.has(member.id) ? <i className="room-people-dot" /> : null}
            </span>
          ))}
          {extra > 0 ? <span className="room-people-more">+{extra}</span> : null}
        </div>
        {me.is_host ? <HostMenu /> : null}
      </div>
    </header>
  );
}
