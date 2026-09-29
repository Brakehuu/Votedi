"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { formatRemaining } from "@/lib/bracket";

/** Server fetch time (epoch ms). First render uses it so SSR markup matches hydration. */
export const ServerClockContext = createContext<number | null>(null);

export function Countdown({
  deadline,
  onDone,
  className,
}: {
  deadline: string;
  onDone?: () => void;
  className?: string;
}) {
  const serverNow = useContext(ServerClockContext);
  const [clock, setClock] = useState<{ now: number | null; client: boolean }>({
    now: serverNow,
    client: false,
  });
  const firedFor = useRef<string | null>(null);

  useEffect(() => {
    const tick = () => setClock({ now: Date.now(), client: true });
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);

  const end = Date.parse(deadline);
  const diff = clock.now == null || Number.isNaN(end) ? null : end - clock.now;

  useEffect(() => {
    if (!clock.client || diff == null || diff > 0) return;
    if (firedFor.current === deadline) return;
    firedFor.current = deadline;
    onDone?.();
  }, [clock.client, deadline, diff, onDone]);

  return (
    <span
      className={cn("font-bold tabular-nums", diff != null && diff < 60_000 && diff > 0 && "text-warn", className)}
      aria-live="polite"
    >
      {diff == null ? "--:--" : diff <= 0 ? "Hết giờ" : formatRemaining(diff)}
    </span>
  );
}
