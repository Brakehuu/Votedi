"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function MobileBar() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const target = document.querySelector("[data-hero-cta]");
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => {
      setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={show ? "mbar glass show" : "mbar glass"} id="mbar">
      <Link href="/tao-phong" prefetch={false} className="btn btn-primary btn-p">
        Tạo phòng miễn phí
      </Link>
    </div>
  );
}
