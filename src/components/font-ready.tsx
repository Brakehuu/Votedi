"use client";

import { useEffect } from "react";

/** Đánh dấu khi web font sẵn sàng để bật letter-spacing âm an toàn. */
export function FontReady() {
  useEffect(() => {
    const root = document.documentElement;
    let done = false;
    const mark = () => {
      if (done) return;
      done = true;
      root.classList.add("fonts-ready");
    };

    if (typeof document.fonts === "undefined") {
      mark();
      return;
    }

    if (document.fonts.status === "loaded") {
      mark();
      return;
    }

    void document.fonts.ready.then(mark).catch(mark);
    // Fallback nếu Font Loading API treo
    const t = window.setTimeout(mark, 1500);
    return () => window.clearTimeout(t);
  }, []);

  return null;
}
