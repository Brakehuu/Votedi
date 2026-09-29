import { cn } from "@/lib/utils";
import type { Member } from "@/lib/types";

export function MemberAvatar({ member, className }: { member: Member; className?: string }) {
  if (member.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={member.avatar_url}
        alt=""
        className={cn("size-9 rounded-full object-cover", className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-grid size-9 place-items-center rounded-full bg-primary-soft text-base",
        className,
      )}
      aria-hidden
    >
      {member.avatar_emoji || "🙂"}
    </span>
  );
}
