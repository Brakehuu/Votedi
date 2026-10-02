"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  chapterIndexAt,
  formatVideoTime,
  type HomeVideoChapterIcon,
  type HomeVideoConfig,
} from "@/lib/home-video";

const RATES = [0.75, 1, 1.25, 1.5, 2] as const;
const IDLE_MS = 2600;
const CHIP_MS = 2400;

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

function Icon({
  name,
  className,
  size = 22,
}: {
  name:
    | "play"
    | "pause"
    | "replay"
    | "rew"
    | "fwd"
    | "vol"
    | "mute"
    | "fs"
    | "xfs"
    | "check"
    | "spark"
    | "link"
    | "layers"
    | "cup"
    | "arrow"
    | "clock";
  className?: string;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    className,
    "aria-hidden": true as const,
  };
  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "play":
      return (
        <svg {...common}>
          <path
            d="M8 5.2v13.6a1 1 0 0 0 1.5.86l11-6.8a1 1 0 0 0 0-1.72l-11-6.8A1 1 0 0 0 8 5.2z"
            fill="currentColor"
          />
        </svg>
      );
    case "pause":
      return (
        <svg {...common}>
          <rect x="6" y="4.5" width="4.2" height="15" rx="1.4" fill="currentColor" />
          <rect x="13.8" y="4.5" width="4.2" height="15" rx="1.4" fill="currentColor" />
        </svg>
      );
    case "replay":
      return (
        <svg {...common}>
          <path d="M3.5 12a8.5 8.5 0 1 0 2.7-6.2M3.5 4v5h5" {...stroke} />
        </svg>
      );
    case "rew":
      return (
        <svg {...common}>
          <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4.5v4.8h4.8" {...stroke} />
          <text
            x="12"
            y="15.4"
            textAnchor="middle"
            fontSize="7.6"
            fontWeight="800"
            fill="currentColor"
          >
            10
          </text>
        </svg>
      );
    case "fwd":
      return (
        <svg {...common}>
          <path d="M20 12a8 8 0 1 1-2.4-5.7M20 4.5v4.8h-4.8" {...stroke} />
          <text
            x="12"
            y="15.4"
            textAnchor="middle"
            fontSize="7.6"
            fontWeight="800"
            fill="currentColor"
          >
            10
          </text>
        </svg>
      );
    case "vol":
      return (
        <svg {...common}>
          <path d="M4 9.5v5h3.6L13 19V5L7.6 9.5zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" {...stroke} />
        </svg>
      );
    case "mute":
      return (
        <svg {...common}>
          <path d="M4 9.5v5h3.6L13 19V5L7.6 9.5zM17 9.5l5 5M22 9.5l-5 5" {...stroke} />
        </svg>
      );
    case "fs":
      return (
        <svg {...common}>
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" {...stroke} />
        </svg>
      );
    case "xfs":
      return (
        <svg {...common}>
          <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" {...stroke} />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="m5 12.5 4.5 4.5L19 7.5" {...stroke} />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path
            d="M12 3l1.9 5.3L19.2 10l-5.3 1.9L12 17.2l-1.9-5.3L4.8 10l5.3-1.7zM18.5 16l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"
            {...stroke}
          />
        </svg>
      );
    case "link":
      return (
        <svg {...common}>
          <path
            d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"
            {...stroke}
          />
        </svg>
      );
    case "layers":
      return (
        <svg {...common}>
          <path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5" {...stroke} />
        </svg>
      );
    case "cup":
      return (
        <svg {...common}>
          <path
            d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"
            {...stroke}
          />
        </svg>
      );
    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h14M13 6l6 6-6 6" {...stroke} />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" {...stroke} />
          <path d="M12 7v5l3 2" {...stroke} />
        </svg>
      );
    default:
      return null;
  }
}

function ChapterIcon({ icon, size = 22 }: { icon: HomeVideoChapterIcon; size?: number }) {
  return <Icon name={icon} size={size} />;
}

export function HomeVideo({ config }: { config: HomeVideoConfig }) {
  const duration = config.durationSeconds;
  const chapters = config.chapters;

  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progRef = useRef<HTMLDivElement>(null);
  const lastMoveRef = useRef(0);
  const clickTO = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chipTO = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverRef = useRef(false);
  const dragRef = useRef(false);
  const wasPlayingRef = useRef(false);
  const srcAttached = useRef(false);
  const pendingSeek = useRef<number | null>(null);

  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [idle, setIdle] = useState(false);
  const [pseudoFs, setPseudoFs] = useState(false);
  const [fs, setFs] = useState(false);
  const [time, setTime] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [rate, setRate] = useState(1);
  const [muted, setMuted] = useState(false);
  const [vol, setVol] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chipShow, setChipShow] = useState(false);
  const [chipIdx, setChipIdx] = useState(0);
  const [flashIcon, setFlashIcon] = useState<"play" | "pause" | null>(null);
  const [dblSide, setDblSide] = useState<"l" | "r" | null>(null);
  const [tip, setTip] = useState<{ left: number; text: ReactNode } | null>(null);
  const [posterBroken, setPosterBroken] = useState(false);
  const [dragging, setDragging] = useState(false);

  const curChapter = chapterIndexAt(time, chapters);

  const bumpActivity = useCallback(() => {
    lastMoveRef.current = performance.now();
    setIdle(false);
  }, []);

  const chipIdxRef = useRef(-1);
  const showChapterChip = useCallback((idx: number) => {
    if (chipIdxRef.current === idx) return;
    chipIdxRef.current = idx;
    setChipIdx(idx);
    setChipShow(true);
    if (chipTO.current) clearTimeout(chipTO.current);
    chipTO.current = setTimeout(() => setChipShow(false), CHIP_MS);
  }, []);

  const seekTo = useCallback(
    (t: number) => {
      const el = videoRef.current;
      const next = clamp(t, 0, duration);
      setTime(next);
      if (started) showChapterChip(chapterIndexAt(next, chapters));
      if (el && srcAttached.current) {
        try {
          el.currentTime = next;
        } catch {
          pendingSeek.current = next;
        }
      } else {
        pendingSeek.current = next;
      }
      if (next < duration - 0.05) {
        setEnded(false);
      }
    },
    [chapters, duration, showChapterChip, started],
  );

  const attachAndPlay = useCallback(async () => {
    const el = videoRef.current;
    if (!el || !config.src) return;
    if (!srcAttached.current) {
      el.src = config.src;
      el.preload = "auto";
      srcAttached.current = true;
      el.load();
    }
    el.playbackRate = rate;
    el.muted = muted;
    el.volume = vol;
    const applyPending = () => {
      if (pendingSeek.current != null) {
        try {
          el.currentTime = pendingSeek.current;
          setTime(pendingSeek.current);
        } catch {
          /* ignore */
        }
        pendingSeek.current = null;
      }
    };
    if (el.readyState >= 1) applyPending();
    else el.addEventListener("loadedmetadata", applyPending, { once: true });
    try {
      await el.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }, [config.src, muted, rate, vol]);

  const play = useCallback(async () => {
    setStarted(true);
    showChapterChip(chapterIndexAt(pendingSeek.current ?? time, chapters));
    if (ended) {
      seekTo(0);
      setEnded(false);
    }
    await attachAndPlay();
  }, [attachAndPlay, chapters, ended, seekTo, showChapterChip, time]);

  const pause = useCallback(() => {
    videoRef.current?.pause();
    setPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (playing) pause();
    else void play();
  }, [pause, play, playing]);

  const flash = useCallback((icon: "play" | "pause") => {
    setFlashIcon(null);
    requestAnimationFrame(() => setFlashIcon(icon));
  }, []);

  const skip = useCallback(
    (delta: number) => {
      seekTo(time + delta);
      setDblSide(delta < 0 ? "l" : "r");
      window.setTimeout(() => setDblSide(null), 600);
    },
    [seekTo, time],
  );

  // bump chip when chapter changes during playback / seek
  const onTimeTick = useCallback(
    (t: number) => {
      if (!started) return;
      showChapterChip(chapterIndexAt(t, chapters));
    },
    [chapters, showChapterChip, started],
  );

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onTime = () => {
      if (dragRef.current) return;
      const t = el.currentTime;
      setTime(t);
      onTimeTick(t);
      if (el.buffered.length) {
        try {
          setBuffered(el.buffered.end(el.buffered.length - 1));
        } catch {
          /* ignore */
        }
      }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setEnded(true);
      setPlaying(false);
    };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    el.addEventListener("progress", onTime);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("progress", onTime);
    };
  }, [onTimeTick]);

  // Remove old effects that called showChapterChip / duplicate video listeners
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!playing || menuOpen) {
        setIdle(false);
        return;
      }
      setIdle(performance.now() - lastMoveRef.current > IDLE_MS);
    }, 400);
    return () => clearInterval(id);
  }, [playing, menuOpen]);

  useEffect(() => {
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (!t?.closest?.(".hv-menu, .hv-sp")) setMenuOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const toggleFs = useCallback(async () => {
    const root = rootRef.current;
    const el = videoRef.current;
    if (!root) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
      setPseudoFs(false);
      return;
    }
    if (root.requestFullscreen) {
      try {
        await root.requestFullscreen();
        return;
      } catch {
        /* fall through */
      }
    }
    const webkit = el as HTMLVideoElement & { webkitEnterFullscreen?: () => void };
    if (webkit?.webkitEnterFullscreen) {
      try {
        webkit.webkitEnterFullscreen();
        return;
      } catch {
        /* fall through */
      }
    }
    setPseudoFs((v) => !v);
  }, []);

  const applyVol = useCallback(
    (nextMuted: boolean, nextVol: number) => {
      setMuted(nextMuted);
      setVol(nextVol);
      const el = videoRef.current;
      if (el) {
        el.muted = nextMuted;
        el.volume = nextVol;
      }
    },
    [],
  );

  const tipAt = useCallback(
    (clientX: number) => {
      const pr = progRef.current;
      if (!pr) return null;
      const r = pr.getBoundingClientRect();
      const ratio = clamp((clientX - r.left) / r.width, 0, 1);
      const t = ratio * duration;
      const ci = chapterIndexAt(t, chapters);
      const x = clamp(clientX - r.left, 50, r.width - 50);
      return {
        left: x,
        text: (
          <>
            <b>{formatVideoTime(t)}</b> · {chapters[ci]?.title}
          </>
        ),
        time: t,
      };
    },
    [chapters, duration],
  );

  const onProgPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const pr = progRef.current;
    if (!pr) return;
    dragRef.current = true;
    setDragging(true);
    pr.setPointerCapture(e.pointerId);
    wasPlayingRef.current = playing;
    const info = tipAt(e.clientX);
    if (info) {
      seekTo(info.time);
      setTip({ left: info.left, text: info.text });
    }
    bumpActivity();
  };

  const onProgPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const info = tipAt(e.clientX);
    if (info) setTip({ left: info.left, text: info.text });
    if (dragRef.current && info) seekTo(info.time);
  };

  const onProgPointerUp = () => {
    if (!dragRef.current) return;
    dragRef.current = false;
    setDragging(false);
    if (wasPlayingRef.current && !ended) void play();
  };

  const onSurfaceClick = (e: React.MouseEvent) => {
    const t = e.target as Element;
    if (t.closest(".hv-ctrl, .hv-bigplay, .hv-menu, .hv-end, .hv-chip-ch")) return;
    bumpActivity();
    if (!started) {
      void play();
      return;
    }
    if (clickTO.current) clearTimeout(clickTO.current);
    if (e.detail >= 2) {
      const root = rootRef.current;
      if (!root) return;
      const r = root.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      if (x < 0.33) skip(-10);
      else if (x > 0.67) skip(10);
      else void toggleFs();
      return;
    }
    clickTO.current = setTimeout(() => {
      const nextPlay = !playing;
      toggle();
      flash(nextPlay ? "play" : "pause");
    }, 230);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (!(hoverRef.current || root.contains(document.activeElement))) return;
      const target = e.target as HTMLElement | null;
      if (target?.matches?.("input") || target?.closest?.(".hv-prog")) return;
      const k = e.key.toLowerCase();
      bumpActivity();
      if (k === " " || k === "k") {
        e.preventDefault();
        const nextPlay = !playing;
        toggle();
        flash(nextPlay ? "play" : "pause");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        skip(5);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        skip(-5);
      } else if (k === "l") skip(10);
      else if (k === "j") skip(-10);
      else if (k === "m") applyVol(!muted, vol === 0 ? 0.6 : vol);
      else if (k === "f") void toggleFs();
      else if (e.key === "ArrowUp") {
        e.preventDefault();
        applyVol(false, clamp(vol + 0.1, 0, 1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        applyVol(vol - 0.1 <= 0, clamp(vol - 0.1, 0, 1));
      } else if (k === "escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [applyVol, bumpActivity, flash, muted, playing, skip, toggle, toggleFs, vol]);

  const pc = clamp(time / duration, 0, 1);
  const bufPc = clamp(buffered / duration, 0, 1);
  const isFs = fs || pseudoFs;

  return (
    <section className="hv-sec wrap" id="video">
      <div className="hv-head rv">
        <span className="hv-tag">
          <i />
          Video 45 giây
        </span>
        <h2>
          Xem Vote Đi hoạt động
          <br />
          <em>trong 45 giây</em>
        </h2>
        <p>{config.description}</p>
      </div>

      <div className="hv-grid rv">
        <div className="hv-frame">
          <div
            ref={rootRef}
            className={[
              "hv-player",
              started ? "started" : "",
              playing ? "playing" : "",
              idle ? "idle" : "",
              ended ? "ended" : "",
              started ? "real" : "",
              pseudoFs ? "pseudo" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            tabIndex={0}
            aria-label="Trình phát video giới thiệu Vote Đi"
            onPointerEnter={() => {
              hoverRef.current = true;
            }}
            onPointerLeave={() => {
              hoverRef.current = false;
            }}
            onPointerMove={bumpActivity}
            onPointerDown={bumpActivity}
            onKeyDown={bumpActivity}
            onClick={onSurfaceClick}
          >
            <video ref={videoRef} playsInline preload="none" />

            {!posterBroken ? (
              <Image
                src={config.poster}
                alt=""
                fill
                sizes="(min-width: 980px) 720px, 100vw"
                className="hv-poster"
                priority={false}
                loading="lazy"
                onError={() => setPosterBroken(true)}
              />
            ) : (
              <div className="hv-poster hv-poster-fallback" aria-hidden />
            )}

            <div className="hv-veil" />

            <button
              type="button"
              className="hv-bigplay"
              aria-label="Phát video giới thiệu"
              onClick={(e) => {
                e.stopPropagation();
                void play();
              }}
            >
              <span>
                <Icon name="play" size={28} />
              </span>
            </button>

            <span className="hv-dur">
              <Icon name="clock" size={13} />
              0:45
            </span>

            <div className={`hv-chip-ch ${chipShow ? "show" : ""}`} aria-live="polite">
              <b>{chipIdx + 1}</b>
              <span>{chapters[chipIdx]?.title}</span>
            </div>

            <div className={`hv-dbl l ${dblSide === "l" ? "go" : ""}`}>
              <span>
                <Icon name="rew" size={26} />
                −10 giây
              </span>
            </div>
            <div className={`hv-dbl r ${dblSide === "r" ? "go" : ""}`}>
              <span>
                +10 giây
                <Icon name="fwd" size={26} />
              </span>
            </div>

            <div className={`hv-flash ${flashIcon ? "go" : ""}`}>
              {flashIcon ? <Icon name={flashIcon} size={32} /> : null}
            </div>

            <div className="hv-end">
              <div className="hv-end-in">
                <button
                  type="button"
                  className="btn btn-g"
                  onClick={(e) => {
                    e.stopPropagation();
                    void play();
                  }}
                >
                  <Icon name="replay" size={18} />
                  Xem lại
                </button>
                <Link href="/tao-phong" prefetch={false} className="btn btn-p" onClick={(e) => e.stopPropagation()}>
                  Tạo phòng miễn phí
                  <Icon name="arrow" size={18} />
                </Link>
              </div>
            </div>

            <div className={`hv-menu ${menuOpen ? "open" : ""}`} role="menu">
              {RATES.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="menuitemradio"
                  aria-checked={r === rate}
                  className={r === rate ? "on" : undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    setRate(r);
                    if (videoRef.current) videoRef.current.playbackRate = r;
                    setMenuOpen(false);
                  }}
                >
                  {r === 1 ? "Bình thường" : `${r}×`}
                  <Icon name="check" size={16} />
                </button>
              ))}
            </div>

            <div className="hv-ctrl" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="hv-cb pp"
                aria-label={playing ? "Tạm dừng" : "Phát"}
                onClick={() => {
                  const nextPlay = !playing;
                  toggle();
                  flash(nextPlay ? "play" : "pause");
                }}
              >
                <Icon name={playing ? "pause" : "play"} size={20} />
              </button>
              <button type="button" className="hv-cb rw" aria-label="Tua lùi 10 giây" onClick={() => skip(-10)}>
                <Icon name="rew" size={22} />
              </button>
              <button type="button" className="hv-cb fw" aria-label="Tua tới 10 giây" onClick={() => skip(10)}>
                <Icon name="fwd" size={22} />
              </button>
              <span className="hv-tm">
                <b>{formatVideoTime(time)}</b> / {formatVideoTime(duration)}
              </span>
              <div
                ref={progRef}
                className={`hv-prog ${dragging ? "drag" : ""}`}
                role="slider"
                tabIndex={0}
                aria-label="Tua video"
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={Math.floor(time)}
                aria-valuetext={`${formatVideoTime(time)} trên ${formatVideoTime(duration)}`}
                onPointerDown={onProgPointerDown}
                onPointerMove={onProgPointerMove}
                onPointerUp={onProgPointerUp}
                onPointerLeave={() => {
                  if (!dragging) setTip(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight") {
                    e.preventDefault();
                    e.stopPropagation();
                    seekTo(time + 5);
                  } else if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    e.stopPropagation();
                    seekTo(time - 5);
                  }
                }}
              >
                <div className="hv-tr">
                  <i className="hv-buf" style={{ width: `${bufPc * 100}%` }} />
                  <i className="hv-pl" style={{ width: `${pc * 100}%` }} />
                  <span className="hv-th" style={{ left: `${pc * 100}%` }} />
                  {chapters.slice(1).map((c) => (
                    <i key={c.start} className="hv-tk" style={{ left: `${(c.start / duration) * 100}%` }} />
                  ))}
                  {tip ? (
                    <span className="hv-tip" style={{ left: tip.left, opacity: 1 }}>
                      {tip.text}
                    </span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                className="hv-cb txt hv-sp"
                aria-label="Tốc độ phát"
                aria-haspopup="menu"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((o) => !o);
                }}
              >
                {rate}×
              </button>
              <div className="hv-vol">
                <button
                  type="button"
                  className="hv-cb"
                  aria-label={muted || vol === 0 ? "Bật tiếng" : "Tắt tiếng"}
                  onClick={() => {
                    if (!muted && vol > 0) applyVol(true, vol);
                    else applyVol(false, vol === 0 ? 0.6 : vol);
                  }}
                >
                  <Icon name={muted || vol === 0 ? "mute" : "vol"} size={22} />
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : vol}
                  aria-label="Âm lượng"
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    applyVol(next === 0, next);
                  }}
                />
              </div>
              <button
                type="button"
                className="hv-cb"
                aria-label={isFs ? "Thoát toàn màn hình" : "Toàn màn hình"}
                onClick={() => void toggleFs()}
              >
                <Icon name={isFs ? "xfs" : "fs"} size={22} />
              </button>
            </div>
          </div>
        </div>

        <aside className="hv-side">
          <ol className="hv-chaps">
            {chapters.map((ch, i) => {
              const next = chapters[i + 1]?.start ?? duration;
              const progress = started
                ? clamp((time - ch.start) / Math.max(0.001, next - ch.start), 0, 1)
                : 0;
              const on = started && i === curChapter;
              const done = started && i < curChapter;
              return (
                <li key={ch.start}>
                  <button
                    type="button"
                    className={["hv-chap", on ? "on" : "", done ? "done" : ""].filter(Boolean).join(" ")}
                    style={{ ["--p" as string]: progress }}
                    aria-label={`${ch.title}, bắt đầu ở ${formatVideoTime(ch.start)}`}
                    aria-current={on ? "true" : undefined}
                    onClick={() => {
                      seekTo(ch.start);
                      void play();
                    }}
                  >
                    <span className="hv-ct">
                      <ChapterIcon icon={ch.icon} />
                    </span>
                    <span className="hv-cn">{ch.title}</span>
                    <span className="hv-tm2">{formatVideoTime(ch.start)}</span>
                    <i className="hv-cp" />
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="hv-cta-card">
            <div>
              <b>Thử với nhóm của bạn</b>
              <span>Tạo phòng mất chưa tới 1 phút</span>
            </div>
            <Link href="/tao-phong" prefetch={false} className="btn">
              Tạo phòng miễn phí
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
