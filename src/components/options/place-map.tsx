"use client";

import { useEffect, useRef, useState } from "react";

function embedSrc(lat: number, lng: number) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY;
  if (key) {
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${lat},${lng}`;
  }
  return `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
}

/** Lazy mini map iframe — only loads when scrolled into view. */
export function PlaceMapEmbed({
  lat,
  lng,
  title,
  className,
}: {
  lat: number;
  lng: number;
  title?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className ?? "place-map"}>
      {show ? (
        <iframe
          title={title ? `Bản đồ ${title}` : "Bản đồ"}
          src={embedSrc(lat, lng)}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <div className="place-map-ph" aria-hidden />
      )}
    </div>
  );
}

export function directionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
