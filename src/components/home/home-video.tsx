"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Chip, ChipRow } from "@/components/content/chip";
import type { HomeVideoConfig } from "@/lib/home-video";

function formatTime(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function HomeVideo({ config }: { config: HomeVideoConfig }) {
  const [playing, setPlaying] = useState(false);
  const [chapter, setChapter] = useState(0);
  const [posterBroken, setPosterBroken] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pendingSeek = useRef<number | null>(null);

  const seekAndPlay = useCallback((sec: number) => {
    const el = videoRef.current;
    if (!el) {
      pendingSeek.current = sec;
      return;
    }
    const apply = () => {
      try {
        el.currentTime = sec;
      } catch {
        /* ignore until metadata */
      }
      void el.play().catch(() => undefined);
    };
    if (el.readyState >= 1) apply();
    else el.addEventListener("loadedmetadata", apply, { once: true });
  }, []);

  const playFrom = useCallback(
    (index: number) => {
      const start = config.chapters[index]?.start ?? 0;
      setChapter(index);
      setPlaying(true);
      if (config.provider === "mp4") {
        // Video may mount on next paint; seek after mount via effect + pendingSeek
        pendingSeek.current = start;
        if (videoRef.current) seekAndPlay(start);
      }
    },
    [config, seekAndPlay],
  );

  useEffect(() => {
    if (!playing || config.provider !== "mp4") return;
    const el = videoRef.current;
    if (!el) return;
    const sec = pendingSeek.current ?? config.chapters[chapter]?.start ?? 0;
    pendingSeek.current = null;
    seekAndPlay(sec);
  }, [playing, chapter, config.provider, config.chapters, seekAndPlay]);

  const youtubeSrc =
    config.provider === "youtube" && config.youtubeId
      ? `https://www.youtube-nocookie.com/embed/${config.youtubeId}?autoplay=1&rel=0&start=${config.chapters[chapter]?.start ?? 0}`
      : null;

  return (
    <section className="sec wrap" id="video">
      <div className="sec-h c rv">
        <ChipRow>
          <Chip>Video 45 giây</Chip>
        </ChipRow>
        <h2>
          Xem Vote Đi hoạt động <em>trong 45 giây</em>
        </h2>
        <p>{config.description}</p>
      </div>
      <div className="vid rv">
        <div>
          <div className={`player ${playing ? "playing" : ""}`}>
            {!playing ? (
              <div
                className="poster"
                role="button"
                tabIndex={0}
                onClick={() => playFrom(chapter)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    playFrom(chapter);
                  }
                }}
              >
                {config.poster && !posterBroken ? (
                  <Image
                    src={config.poster}
                    alt=""
                    fill
                    sizes="(min-width: 1100px) 720px, 100vw"
                    className="poster-img"
                    priority={false}
                    loading="lazy"
                    onError={() => setPosterBroken(true)}
                  />
                ) : null}
                <div className="in">
                  <span className="lg">Vote Đi</span>
                  <h3>
                    Cả nhóm chốt xong
                    <br />
                    trong vài phút
                  </h3>
                  <p>Video giới thiệu · 45 giây</p>
                  <div className="play" aria-hidden>
                    <svg viewBox="0 0 24 24">
                      <path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z" />
                    </svg>
                  </div>
                </div>
                <div className="pbadge">
                  <span>0:45</span>
                  <span>Có phụ đề tiếng Việt</span>
                </div>
              </div>
            ) : null}

            {playing && youtubeSrc ? (
              <iframe
                title={config.title}
                src={youtubeSrc}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : null}

            {playing && config.provider === "mp4" && config.src ? (
              <video
                ref={videoRef}
                src={config.src}
                controls
                playsInline
                preload="none"
                autoPlay
              >
                {config.captionsUrl ? (
                  <track kind="captions" srcLang="vi" src={config.captionsUrl} default label="Tiếng Việt" />
                ) : null}
              </video>
            ) : null}
          </div>

          <details className="tr">
            <summary>Xem nội dung video dạng văn bản</summary>
            <p>{config.transcript}</p>
          </details>
        </div>

        <div className="chap">
          <h3>Nội dung video</h3>
          {config.chapters.map((ch, i) => (
            <button
              key={ch.start}
              type="button"
              className={chapter === i ? "on" : undefined}
              onClick={() => playFrom(i)}
            >
              <span className="t">{formatTime(ch.start)}</span>
              <span>
                <b>{ch.title}</b>
                <small>{ch.summary}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
