"use client";

import { useEffect, useState } from "react";
import { ZoomButton } from "@/components/ui/zoom-button";

type Side = "a" | "b";
type Voter = { id: string; letter: string; color: string; fresh?: boolean };

const NAMES: Record<Side, string> = { a: "Mẫu Ngọc", b: "Mẫu Đen" };
const COLORS: Record<Side, string> = { a: "#0EA5A4", b: "#0C1B20" };

function Tee({ fill, className }: { fill: string; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={88} height={88} className={className} style={{ fill }} aria-hidden>
      <path d="M34 14 44 10c2 5 10 5 12 0l10 4 20 13-8 15-10-5v51H32V37l-10 5-8-15z" />
    </svg>
  );
}

export function MatchDemo() {
  const [seconds, setSeconds] = useState(299);
  const [votes, setVotes] = useState({ a: 3, b: 2 });
  const [mine, setMine] = useState<Side | null>(null);
  const [lightbox, setLightbox] = useState<Side | null>(null);
  const [people, setPeople] = useState<{ a: Voter[]; b: Voter[] }>({
    a: [
      { id: "m", letter: "M", color: "#F59E0B" },
      { id: "t", letter: "T", color: "#E5484D" },
      { id: "k", letter: "K", color: "#6366F1" },
    ],
    b: [
      { id: "l", letter: "L", color: "#0891B2" },
      { id: "p", letter: "P", color: "#10B981" },
    ],
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      setSeconds((value) => (value > 0 ? value - 1 : 299));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const total = votes.a + votes.b;
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  function vote(side: Side) {
    if (mine === side) return;
    setVotes((current) => {
      const next = { ...current };
      if (mine) next[mine] -= 1;
      next[side] += 1;
      return next;
    });
    setPeople((current) => {
      const next = {
        a: current.a.filter((person) => person.id !== "me"),
        b: current.b.filter((person) => person.id !== "me"),
      };
      next[side] = [...next[side], { id: "me", letter: "B", color: "#19C9A7", fresh: true }];
      return next;
    });
    setMine(side);
    try {
      navigator.vibrate?.(10);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="stage">
      <div className="match-chip glass c1">
        <span className="av" style={{ background: "#0891B2", width: 22, height: 22, fontSize: 10, margin: 0 }}>
          L
        </span>
        Linh vừa chọn Mẫu Đen
      </div>
      <div className="match-chip glass c2">🏆 Thắng cặp này vào chung kết</div>

      <div className="match glass" role="group" aria-label="Demo cặp đấu">
        <div className="match-head">
          <div className="round">
            <b>Bán kết</b>
            <span>Phòng Áo team 2026</span>
          </div>
          <span className="timer">
            <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden className="shrink-0">
              <circle cx="8" cy="9" r="5.5" />
              <path d="M8 6.5V9l1.6 1.2M6.5 2h3" strokeLinecap="round" />
            </svg>
            <span>{clock}</span>
          </span>
        </div>

        <div className="duel">
          <Pick
            side="a"
            label={NAMES.a}
            fill={COLORS.a}
            votes={votes.a}
            width={(votes.a / total) * 100}
            people={people.a}
            chosen={mine === "a"}
            onVote={() => vote("a")}
            onView={() => setLightbox("a")}
          />
          <div className="vs">VS</div>
          <Pick
            side="b"
            label={NAMES.b}
            fill={COLORS.b}
            votes={votes.b}
            width={(votes.b / total) * 100}
            people={people.b}
            chosen={mine === "b"}
            onVote={() => vote("b")}
            onView={() => setLightbox("b")}
          />
        </div>

        <div className="match-foot">
          <span>
            <strong>{mine ? "6/6" : "5/6"}</strong> người đã vote
          </span>
          <span>{mine ? "Đủ người, đang chốt…" : "Bấm ảnh để xem to"}</span>
        </div>
      </div>

      {lightbox ? (
        <div
          className="home-lb open"
          role="dialog"
          aria-modal
          aria-label="Xem ảnh mẫu"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="close"
            aria-label="Đóng"
            onClick={(event) => {
              event.stopPropagation();
              setLightbox(null);
            }}
          >
            ×
          </button>
          <div className="home-lb-img" onClick={(event) => event.stopPropagation()}>
            <Tee fill={COLORS[lightbox]} />
          </div>
          <p>
            {NAMES[lightbox]} · {votes[lightbox]} phiếu
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Pick({
  label,
  fill,
  votes,
  width,
  people,
  chosen,
  onVote,
  onView,
}: {
  side: Side;
  label: string;
  fill: string;
  votes: number;
  width: number;
  people: Voter[];
  chosen: boolean;
  onVote: () => void;
  onView: () => void;
}) {
  return (
    <div className={chosen ? "pick chosen" : "pick"}>
      <div className="relative">
        <button type="button" className="shot" aria-label={`Xem to ${label}`} onClick={onView}>
          <Tee fill={fill} className="tee" />
        </button>
        <ZoomButton label={label} onClick={onView} className="!top-[7px] !right-[7px]" />
      </div>
      <div className="pick-name">
        {label} <small>{votes} phiếu</small>
      </div>
      <div className="bar-v">
        <i style={{ width: `${width}%` }} />
      </div>
      <div className="voters">
        {people.map((person) => (
          <span
            key={person.id}
            className={person.fresh ? "av new" : "av"}
            style={
              person.id === "me"
                ? { background: "linear-gradient(135deg,#19C9A7,#0891B2)" }
                : { background: person.color }
            }
          >
            {person.letter}
          </span>
        ))}
      </div>
      <button type="button" className="vote-btn" onClick={onVote}>
        {chosen ? "Bạn đã chọn ✓" : "Chọn mẫu này"}
      </button>
    </div>
  );
}
