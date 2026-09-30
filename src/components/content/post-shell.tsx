"use client";

import { useCallback, useEffect, useId, useState } from "react";

type TocNode = { id: string; text: string; level: 2 | 3; children?: TocNode[] };

function TocList({
  toc,
  activeId,
  onNavigate,
}: {
  toc: TocNode[];
  activeId: string | null;
  onNavigate?: () => void;
}) {
  return (
    <ol>
      {toc.map((item) => {
        const on = activeId === item.id || item.children?.some((c) => c.id === activeId);
        return (
          <li key={item.id} className={on ? "on" : undefined}>
            <a href={`#${item.id}`} onClick={onNavigate}>
              {item.text}
            </a>
            {item.children?.length ? (
              <ul>
                {item.children.map((c) => (
                  <li key={c.id} className={activeId === c.id ? "sub" : undefined}>
                    <a href={`#${c.id}`} onClick={onNavigate}>
                      {c.text}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function PostShell({
  toc,
  readingMinutes,
  templateHref,
  templateLabel,
  article,
  rail,
}: {
  toc: TocNode[];
  readingMinutes: number;
  templateHref?: string | null;
  templateLabel?: string | null;
  article: React.ReactNode;
  rail: React.ReactNode;
}) {
  const [progress, setProgress] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(toc[0]?.id ?? null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [barShow, setBarShow] = useState(false);
  const sheetId = useId();
  const flat = toc.flatMap((t) => [t, ...(t.children ?? [])]);

  const onScroll = useCallback(() => {
    const el = document.getElementById("blog-article");
    if (!el) return;
    const total = el.offsetHeight - window.innerHeight;
    const scrolled = Math.min(1, Math.max(0, -el.getBoundingClientRect().top / Math.max(1, total)));
    setProgress(Math.round(scrolled * 100));
    setBarShow(window.scrollY > 280);
    let current = toc[0]?.id ?? null;
    for (const item of flat) {
      const node = document.getElementById(item.id);
      if (node && node.getBoundingClientRect().top <= 140) current = item.id;
    }
    setActiveId(current);
  }, [flat, toc]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => onScroll());
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [onScroll]);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  const activeText = flat.find((t) => t.id === activeId)?.text ?? "Mục lục";
  const remain = Math.max(1, Math.ceil(readingMinutes * (1 - progress / 100)));
  const closeSheet = () => setSheetOpen(false);

  return (
    <>
      <div className="blog-rp" style={{ width: `${progress}%` }} aria-hidden />

      {toc.length ? (
        <details className="blog-mtoc glass">
          <summary>Mục lục</summary>
          <nav className="blog-toc" aria-label="Mục lục">
            <TocList toc={toc} activeId={activeId} onNavigate={closeSheet} />
          </nav>
        </details>
      ) : null}

      <div className="blog-pg">
        {toc.length ? (
          <nav className="blog-side blog-toc" aria-label="Mục lục">
            <div className="blog-toc-h">
              <b>Mục lục</b>
              <span>{progress}%</span>
            </div>
            <div className="blog-toc-bar">
              <i style={{ width: `${progress}%` }} />
            </div>
            <TocList toc={toc} activeId={activeId} />
            <p className="blog-toc-foot">Còn khoảng {remain} phút</p>
          </nav>
        ) : (
          <div />
        )}

        <div>{article}</div>
        <aside className="blog-rail">{rail}</aside>
      </div>

      <div className={`blog-mbar glass ${barShow ? "show" : ""}`}>
        <button type="button" className="blog-mbar-sec" onClick={() => setSheetOpen(true)} aria-controls={sheetId}>
          <span>
            <small>Đang đọc</small>
            <b>{activeText}</b>
          </span>
        </button>
        {templateHref ? (
          <a href={templateHref} className="btn btn-primary blog-mbar-cta">
            {templateLabel ?? "Dùng mẫu này"}
          </a>
        ) : null}
      </div>

      <div className={`blog-scrim ${sheetOpen ? "open" : ""}`} onClick={closeSheet} />
      <div
        id={sheetId}
        className={`blog-tsheet ${sheetOpen ? "open" : ""}`}
        role="dialog"
        aria-modal={sheetOpen}
        aria-label="Mục lục"
      >
        <div className="blog-grab" />
        <nav className="blog-toc">
          <div className="blog-toc-h">
            <b>Mục lục</b>
            <span>{progress}%</span>
          </div>
          <TocList toc={toc} activeId={activeId} onNavigate={closeSheet} />
        </nav>
      </div>
    </>
  );
}
