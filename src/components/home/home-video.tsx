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
  const videoRef = useRef<HTMLVideoElement>(null);
  const start = config.chapters[chapter]?.start ?? 0;

  const playFrom = useCallback(
    (index: number) => {
      setChapter(index);
      setPlaying(true);
      if (config.provider === "mp4" && videoRef.current) {
        videoRef.current.currentTime = config.chapters[index]?.start ?? 0;
        void videoRef.current.play();
      }
    },
    [config],
  );

  useEffect(() => {
    if (!playing || config.provider !== "mp4" || !videoRef.current) return;
    videoRef.current.currentTime = start;
    void videoRef.current.play();
  }, [playing, start, config.provider]);

  const youtubeSrc =
    config.provider === "youtube" && config.youtubeId
      ? `https://www.youtube-nocookie.com/embed/${config.youtubeId}?autoplay=1&rel=0&start=${start}`
      : null;

  function onPosterActivate() {
    playFrom(chapter);
  }

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
                aria-label="Phát video giới thiệu Vote Đi"
                onClick={onPosterActivate}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onPosterActivate();
                  }
                }}
              >
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
                {config.poster ? (
                  <Image
                    src={config.poster}
                    alt=""
                    fill
                    sizes="(min-width:1100px) 720px, 100vw"
                    className="object-cover opacity-0"
                    priority={false}
                  />
                ) : null}
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
              <video ref={videoRef} src={config.src} controls playsInline preload="none">
                {config.captionsUrl ? (
                  <track kind="captions" srcLang="vi" src={config.captionsUrl} default label="Tiếng Việt" />
                ) : null}
              </video>
            ) : null}
          </div>

          <details className="tr">
            <summary>Xem nội dung video dạng văn bản</summary>
            <p>
              {config.chapters.map((ch) => (
                <span key={ch.start}>
                  <b>
                    {formatTime(ch.start)} {ch.title}.
                  </b>{" "}
                  {ch.summary}{" "}
                </span>
              ))}
            </p>
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
