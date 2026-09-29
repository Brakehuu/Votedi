"use client";

import { useState } from "react";

type Slot = [string | null, string | null];

const POOL: Slot[] = [
  ["Ngọc", "#0EA5A4"],
  ["Đen", "#0C1B20"],
  ["Trắng", "#E8EEEE"],
  ["Cam", "#F59E0B"],
  ["Biển", "#0891B2"],
  ["Đỏ", "#E5484D"],
  ["Tím than", "#334155"],
  [null, null],
];

function shuffle<T>(list: T[]) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

function SlotRow({ name, color }: { name: string | null; color: string | null }) {
  if (!name) return <div className="slot bye">Miễn đấu</div>;
  return (
    <div className="slot">
      <svg style={{ fill: color ?? "#0EA5A4" }} aria-hidden>
        <use href="#home-tee" />
      </svg>
      Mẫu {name}
    </div>
  );
}

export function DrawDemo() {
  const [sides, setSides] = useState(() => {
    const pool = shuffle(POOL);
    return { left: pool.slice(0, 4), right: pool.slice(4) };
  });
  const [label, setLabel] = useState("Bốc thăm thử");
  const [shuffling, setShuffling] = useState(false);

  function redraw() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setLabel("Bốc lại");
    if (reduce) {
      const pool = shuffle(POOL);
      setSides({ left: pool.slice(0, 4), right: pool.slice(4) });
      return;
    }
    setShuffling(true);
    window.setTimeout(() => {
      const pool = shuffle(POOL);
      setSides({ left: pool.slice(0, 4), right: pool.slice(4) });
      setShuffling(false);
    }, 260);
  }

  return (
    <>
      <svg width="0" height="0" className="absolute" aria-hidden>
        <symbol id="home-tee" viewBox="0 0 100 100">
          <path d="M34 14 44 10c2 5 10 5 12 0l10 4 20 13-8 15-10-5v51H32V37l-10 5-8-15z" />
        </symbol>
      </svg>
      <div className="draw">
        <div className="draw-side">
          {sides.left.map((slot, index) => (
            <div key={`l-${index}`} className={shuffling ? "slot-wrap shuffle" : "slot-wrap"}>
              <SlotRow name={slot[0]} color={slot[1]} />
            </div>
          ))}
        </div>
        <div className="draw-side">
          {sides.right.map((slot, index) => (
            <div key={`r-${index}`} className={shuffling ? "slot-wrap shuffle" : "slot-wrap"}>
              <SlotRow name={slot[0]} color={slot[1]} />
            </div>
          ))}
        </div>
      </div>
      <div className="draw-actions">
        <button type="button" className="btn btn-light" onClick={redraw}>
          {label}
        </button>
        <small>7 mẫu, 1 suất miễn đấu</small>
      </div>
    </>
  );
}
