"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CalendarDays, MapPin, Trophy } from "lucide-react";

type Side = "a" | "b";
type Voter = { id: string; letter: string; color: string };

const INTERVAL_MS = 6500;

function Tee({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" className="tee" style={{ color }} aria-hidden>
      <path d="M34 14 44 10c2 5 10 5 12 0l10 4 20 13-8 15-10-5v51H32V37l-10 5-8-15z" />
    </svg>
  );
}

function HeatMap() {
  const cols = ["T5", "T6", "T7", "CN"];
  const days = [16, 17, 18, 19];
  const rows = [
    { label: "Sáng", sub: "8–12h", cells: ["y", "y", "m", "n"] as const },
    { label: "Chiều", sub: "13–17h", cells: ["m", "y", "y", "y"] as const },
    { label: "Tối", sub: "18–22h", cells: ["n", "m", "y", "y"] as const },
  ];
  const style: Record<string, { bg: string; color: string; label: string }> = {
    y: { bg: "#DDF7EA", color: "#0F8F5A", label: "R" },
    m: { bg: "#FFF1D6", color: "#B86E00", label: "C" },
    n: { bg: "#F1F4F4", color: "#8AA0A4", label: "B" },
  };
  return (
    <div className="hm" aria-hidden>
      <span />
      {cols.map((c, i) => (
        <div key={c} className="ch">
          {c}
          <span>{days[i]}</span>
        </div>
      ))}
      {rows.map((row) => (
        <div key={row.label} style={{ display: "contents" }}>
          <div className="rl">
            {row.label}
            <small>{row.sub}</small>
          </div>
          {row.cells.map((cell, i) => {
            const s = style[cell];
            return (
              <div key={`${row.label}-${i}`} className="c" style={{ background: s.bg, color: s.color }}>
                {s.label}
                {cell === "y" && row.label === "Tối" && i === 2 ? <i>★</i> : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function HeroShowcase() {
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(261);
  const [votes, setVotes] = useState({ a: 3, b: 2 });
  const [mine, setMine] = useState<Side | null>(null);
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
  const reduceRef = useRef(false);
  const tabId = useId();

  useEffect(() => {
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (paused || reduceRef.current) return;
    const id = window.setInterval(() => setSlide((s) => (s + 1) % 3), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  useEffect(() => {
    if (slide !== 0) return;
    const id = window.setInterval(() => setSeconds((v) => (v > 0 ? v - 1 : 261)), 1000);
    return () => window.clearInterval(id);
  }, [slide]);

  const go = useCallback((n: number) => setSlide(n), []);

  function vote(side: Side) {
    if (mine === side) return;
    setVotes((cur) => {
      const next = { ...cur };
      if (mine) next[mine] -= 1;
      next[side] += 1;
      return next;
    });
    setPeople((cur) => {
      const next = {
        a: cur.a.filter((p) => p.id !== "me"),
        b: cur.b.filter((p) => p.id !== "me"),
      };
      next[side] = [...next[side], { id: "me", letter: "B", color: "#19C9A7" }];
      return next;
    });
    setMine(side);
  }

  const total = votes.a + votes.b || 1;
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const done = 5 + (mine ? 1 : 0);

  const tabs = [
    { label: "Đấu loại", Icon: Trophy },
    { label: "Chọn ngày", Icon: CalendarDays },
    { label: "Đi đâu chơi", Icon: MapPin },
  ] as const;

  return (
    <div
      className="stage"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setPaused(false);
      }}
    >
      <div className="mchip glass mc1">
        <span className="av" style={{ background: "#0891B2" }}>
          L
        </span>
        Linh vừa chọn xong
      </div>
      <div className="mchip glass mc2">
        <Trophy width={14} height={14} strokeWidth={1.9} style={{ color: "#F5A524" }} aria-hidden />
        Hết giờ là tự chốt
      </div>

      <div className="match glass" aria-live="off">
        <div className="slides">
          <div className={`slide ${slide === 0 ? "on" : ""}`} data-s="0">
            <div className="mh">
              <div>
                <b>Bán kết</b>
                <small>Phòng Áo team 2026</small>
              </div>
              <span className="timer">{clock}</span>
            </div>
            <div className="duel">
              <Pick
                name="Mẫu Ngọc"
                color="#0EA5A4"
                votes={votes.a}
                width={(votes.a / total) * 100}
                people={people.a}
                chosen={mine === "a"}
                onVote={() => vote("a")}
              />
              <div className="vs">VS</div>
              <Pick
                name="Mẫu Đen"
                color="#0C1B20"
                votes={votes.b}
                width={(votes.b / total) * 100}
                people={people.b}
                chosen={mine === "b"}
                onVote={() => vote("b")}
              />
            </div>
            <div className="mf">
              <span>
                <strong>
                  {done}/6
                </strong>{" "}
                người đã vote
              </span>
              <span>Bấm ảnh để xem to</span>
            </div>
          </div>

          <div className={`slide ${slide === 1 ? "on" : ""}`} data-s="1">
            <div className="mh">
              <div>
                <b>Chọn lịch rảnh</b>
                <small>Họp lớp 12A1</small>
              </div>
              <span className="okc">6/6 đã trả lời</span>
            </div>
            <HeatMap />
            <div className="best">
              <div>
                <small>Ngày đẹp nhất</small>
                <b>Tối T7 17/10</b>
              </div>
              <div className="r">
                <b>5/6</b>
                <small>người rảnh</small>
              </div>
            </div>
            <div className="mf">
              <span>Rảnh = 1 điểm · Có thể = ½</span>
              <span>Thêm vào lịch</span>
            </div>
          </div>

          <div className={`slide ${slide === 2 ? "on" : ""}`} data-s="2">
            <div className="mh">
              <div>
                <b>Cuối tuần đi đâu chơi?</b>
                <small>Chọn 1 địa điểm</small>
              </div>
              <span className="timer">1 ngày</span>
            </div>
            <div className="opts">
              <PlaceOpt
                lead
                title="Bán đảo Sơn Trà"
                meta="Ngắm hoàng hôn · 80k/người"
                color="#0EA5A4"
                width={80}
                count={4}
                avatars={[
                  { letter: "M", color: "#F59E0B" },
                  { letter: "T", color: "#E5484D" },
                  { letter: "K", color: "#6366F1" },
                ]}
              />
              <PlaceOpt
                title="Phố cổ Hội An"
                meta="Ăn tối + đi bộ · 150k/người"
                color="#0891B2"
                width={40}
                count={2}
                avatars={[
                  { letter: "H", color: "#0EA5A4" },
                  { letter: "L", color: "#0891B2" },
                ]}
              />
              <PlaceOpt
                title="Bà Nà Hills"
                meta="Cả ngày · 900k/người"
                color="#F59E0B"
                width={0}
                count={0}
                empty
              />
            </div>
            <div className="mf">
              <span>
                <strong>6/6</strong> người đã vote
              </span>
              <span>Có bản đồ và chỉ đường</span>
            </div>
          </div>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Xem thử các kiểu vote">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            type="button"
            role="tab"
            id={`${tabId}-${i}`}
            aria-label={t.label}
            aria-selected={slide === i}
            className={slide === i ? "on" : undefined}
            onClick={() => go(i)}
          >
            <t.Icon className="ico" width={15} height={15} strokeWidth={1.9} aria-hidden />
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Pick({
  name,
  color,
  votes,
  width,
  people,
  chosen,
  onVote,
}: {
  name: string;
  color: string;
  votes: number;
  width: number;
  people: Voter[];
  chosen: boolean;
  onVote: () => void;
}) {
  return (
    <div className={`pick ${chosen ? "chosen" : ""}`}>
      <div className="shot">
        <Tee color={color} />
      </div>
      <div className="pn">
        {name}
        <small>{votes} phiếu</small>
      </div>
      <div className="bar-v">
        <i style={{ width: `${width}%` }} />
      </div>
      <div className="vt">
        {people.map((p) => (
          <span key={p.id} className="av" style={{ background: p.color }}>
            {p.letter}
          </span>
        ))}
      </div>
      <button type="button" className="vb" onClick={onVote}>
        Chọn mẫu này
      </button>
    </div>
  );
}

function PlaceOpt({
  lead,
  title,
  meta,
  color,
  width,
  count,
  avatars,
  empty,
}: {
  lead?: boolean;
  title: string;
  meta: string;
  color: string;
  width: number;
  count: number;
  avatars?: { letter: string; color: string }[];
  empty?: boolean;
}) {
  return (
    <div className={`opt ${lead ? "lead" : ""}`}>
      <span className="pin" style={{ background: color }} aria-hidden>
        <MapPin width={24} height={24} strokeWidth={1.9} />
      </span>
      <div>
        <b>{title}</b>
        <small>{meta}</small>
        <div className="row">
          <div className="bar-v">
            <i style={{ width: `${width}%` }} />
          </div>
          {empty ? (
            <small>Chưa ai chọn</small>
          ) : (
            <span className="stack">
              {avatars?.map((a) => (
                <span key={a.letter} className="av" style={{ background: a.color }}>
                  {a.letter}
                </span>
              ))}
            </span>
          )}
        </div>
      </div>
      <div className="cnt">
        <b>{count}</b>
        phiếu
      </div>
    </div>
  );
}
