"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const EXTRA = ["😍", "🔥", "😂", "👎"] as const;

export function ReactionBar({
  counts,
  mine,
  disabled,
  anonymous,
  onToggle,
}: {
  counts: Record<string, number>;
  mine: Set<string>;
  disabled?: boolean;
  anonymous?: boolean;
  onToggle: (emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const hearts = counts["❤️"] ?? 0;

  const extras = useMemo(
    () => EXTRA.filter((e) => (counts[e] ?? 0) > 0 || mine.has(e)),
    [counts, mine],
  );

  return (
    <div className="react-bar">
      <button
        type="button"
        className={cn("react-btn", mine.has("❤️") && "on")}
        disabled={disabled}
        aria-label="Thả tim"
        onClick={() => onToggle("❤️")}
        onContextMenu={(event) => {
          event.preventDefault();
          setOpen((v) => !v);
        }}
        onMouseEnter={() => setOpen(true)}
      >
        ❤️ {hearts > 0 ? hearts : ""}
      </button>
      {extras.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className={cn("react-btn", mine.has(emoji) && "on")}
          disabled={disabled}
          onClick={() => onToggle(emoji)}
        >
          {emoji} {(counts[emoji] ?? 0) || ""}
        </button>
      ))}
      {open && !disabled ? (
        <div className="react-pop" onMouseLeave={() => setOpen(false)}>
          {EXTRA.map((emoji) => (
            <button key={emoji} type="button" onClick={() => { onToggle(emoji); setOpen(false); }}>
              {emoji}
            </button>
          ))}
        </div>
      ) : null}
      {anonymous ? <span className="sr-only">Ẩn danh: chỉ hiện số đếm</span> : null}
    </div>
  );
}
