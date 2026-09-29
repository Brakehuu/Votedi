import { MemberAvatar } from "@/components/room/member-avatar";
import type { Member } from "@/lib/types";

export function VoterStack({ members }: { members: Member[] }) {
  if (members.length === 0) {
    return <span className="text-xs text-muted-foreground">Chưa có phiếu</span>;
  }

  const shown = members.slice(0, 5);
  const extra = members.length - shown.length;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((member) => (
          <MemberAvatar
            key={member.id}
            member={member}
            className="size-7 ring-2 ring-card"
          />
        ))}
      </div>
      {extra > 0 ? <span className="ml-2 text-xs font-semibold">+{extra}</span> : null}
    </div>
  );
}
