"use client";

import { Link2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden className="blog-share-ic">
      <path
        fill="currentColor"
        d="M14.5 8.5h2.2V5.6h-2.2c-2.4 0-4 1.5-4 4v1.6H8.3v2.9h2.2V22h3.1v-7.9h2.5l.5-2.9h-3V9.7c0-.7.3-1.2 1-1.2Z"
      />
    </svg>
  );
}

async function copyText(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Đã sao chép liên kết");
    return true;
  } catch {
    return false;
  }
}

export function ShareButtons({ title, url, variant }: { title: string; url: string; variant: "rail" | "mobile" }) {
  const [fallback, setFallback] = useState(false);
  const inputId = useId();
  const fallbackRef = useRef<HTMLInputElement>(null);
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  useEffect(() => {
    if (!fallback || !fallbackRef.current) return;
    fallbackRef.current.focus();
    fallbackRef.current.select();
  }, [fallback]);

  async function onCopy() {
    const ok = await copyText(url);
    if (!ok) setFallback(true);
  }

  async function onNativeShare() {
    if (!navigator.share) return onCopy();
    try {
      await navigator.share({ title, url });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
  }

  const fallbackField = fallback ? (
    <input
      ref={fallbackRef}
      id={inputId}
      className="blog-share-fallback"
      readOnly
      value={url}
      aria-label="Liên kết bài viết"
    />
  ) : null;

  if (variant === "rail") {
    return (
      <div className="blog-share">
        <button type="button" onClick={() => void onCopy()}>
          <Link2 className="blog-share-ic" strokeWidth={1.9} />
          Sao chép
        </button>
        <a href={fb} target="_blank" rel="noreferrer">
          <FacebookMark />
          Facebook
        </a>
        {fallbackField}
      </div>
    );
  }

  return (
    <div className="blog-share-mob">
      <button type="button" className="btn btn-primary blog-share-full" onClick={() => void onNativeShare()}>
        Chia sẻ
      </button>
      <button type="button" className="btn btn-g blog-share-full" onClick={() => void onCopy()}>
        Sao chép liên kết
      </button>
      {fallbackField}
    </div>
  );
}
