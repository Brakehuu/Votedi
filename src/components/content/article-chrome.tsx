"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
export function MdxFigure({
  src,
  alt,
  title,
  width,
  height,
  priority,
}: {
  src: string;
  alt: string;
  title?: string;
  width: number;
  height: number;
  priority?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const caption = title || alt;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <figure className="blog-fig">
        <button type="button" className="blog-fig-btn" onClick={() => setOpen(true)} aria-label={`Phóng to: ${alt}`}>
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            sizes="(min-width:1180px) 784px, 100vw"
            className="blog-fig-img"
            priority={priority}
          />
          <span className="blog-fig-z" aria-hidden>
            ↗
          </span>
        </button>
        {caption ? <figcaption>{caption}</figcaption> : null}
      </figure>
      {open ? (
        <div className="blog-lb" role="dialog" aria-modal aria-label="Xem ảnh" onClick={() => setOpen(false)}>
          <button type="button" className="blog-lb-x" aria-label="Đóng" onClick={() => setOpen(false)}>
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} onClick={(e) => e.stopPropagation()} />
          {caption ? <p>{caption}</p> : null}
        </div>
      ) : null}
    </>
  );
}

export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  if (!items.length) return null;
  return (
    <div className="blog-faq">
      <h2 id="cau-hoi-thuong-gap" className="blog-prose-h2">
        Câu hỏi thường gặp
        <a className="blog-anchor" href="#cau-hoi-thuong-gap" aria-label="Liên kết mục này">
          #
        </a>
      </h2>
      {items.map((item) => (
        <details key={item.q}>
          <summary>{item.q}</summary>
          <p>{item.a}</p>
        </details>
      ))}
    </div>
  );
}

export function SummaryBox({ children }: { children: React.ReactNode }) {
  return (
    <aside className="blog-sumbox glass">
      <h4>Tóm tắt nhanh</h4>
      <div className="blog-sumbox-body">{children}</div>
    </aside>
  );
}

export function Callout({ children, title = "Lưu ý" }: { children: React.ReactNode; title?: string }) {
  return (
    <aside className="blog-callout" role="note">
      <strong>{title}</strong>
      <div>{children}</div>
    </aside>
  );
}

