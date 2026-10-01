"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { HomeVideo } from "@/components/home/home-video";
import { HOME_VIDEO, HOME_VIDEO_PREVIEW } from "@/lib/home-video";

function HomeVideoGateInner() {
  const params = useSearchParams();
  if (HOME_VIDEO.enabled) {
    return <HomeVideo config={HOME_VIDEO} />;
  }
  if (params.get("preview-video") === "1") {
    return <HomeVideo config={HOME_VIDEO_PREVIEW} />;
  }
  return null;
}

export function HomeVideoGate() {
  return (
    <Suspense fallback={null}>
      <HomeVideoGateInner />
    </Suspense>
  );
}
