"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function resultsShareImageUrl(slug: string, opts?: { v?: string | number | null; download?: boolean }) {
  const params = new URLSearchParams();
  if (opts?.v != null && opts.v !== "") params.set("v", String(opts.v));
  if (opts?.download) params.set("download", "1");
  const q = params.toString();
  return `/p/${slug}/ket-qua/share-image${q ? `?${q}` : ""}`;
}

export async function downloadOrShareResultsImage(slug: string, v?: string | number | null) {
  const url = resultsShareImageUrl(slug, { v, download: true });
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    if (!blob.type.includes("png") && blob.size < 100) throw new Error("empty");

    const file = new File([blob], "vote-di-ket-qua.png", { type: "image/png" });
    const canShareFile =
      typeof navigator !== "undefined" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] });

    if (canShareFile && typeof navigator.share === "function") {
      try {
        await navigator.share({
          files: [file],
          title: "Kết quả Vote Đi",
          text: "Ảnh kết quả phòng vote",
        });
        return;
      } catch (err) {
        // User cancel — don't toast as failure
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }

    // Anchor download (works with Content-Disposition + download attr)
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = "vote-di-ket-qua.png";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
    toast.success("Đã tải ảnh kết quả");
  } catch {
    toast.error("Chưa tạo được ảnh, thử lại");
  }
}

export function ShareImagePreview({
  slug,
  roomName,
  champTitle,
  version,
  className,
}: {
  slug: string;
  roomName: string;
  champTitle?: string | null;
  version?: string | number | null;
  className?: string;
}) {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const src = resultsShareImageUrl(slug, { v: version });

  return (
    <div
      className={cn(
        "relative aspect-[1200/630] overflow-hidden rounded-[26px] border border-[var(--line)] bg-[#F3F8F8] shadow-[0_30px_50px_-30px_rgba(8,80,90,.55)]",
        className,
      )}
    >
      {status === "loading" ? (
        <div className="absolute inset-0 animate-pulse bg-[linear-gradient(90deg,#E8F0F0_25%,#F5FAFA_50%,#E8F0F0_75%)] bg-[length:200%_100%]" />
      ) : null}

      {status !== "error" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt="Ảnh chia sẻ kết quả"
          className={cn("h-full w-full object-cover transition-opacity", status === "ok" ? "opacity-100" : "opacity-0")}
          onLoad={() => setStatus("ok")}
          onError={() => setStatus("error")}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-between gap-[4%] overflow-hidden p-[5%_6%]">
          <div
            className="pointer-events-none absolute -top-[30%] -left-[12%] aspect-square w-[60%] rounded-full bg-[radial-gradient(circle,rgba(25,201,167,.45),transparent_65%)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-[16%] -bottom-[40%] aspect-square w-[60%] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,.4),transparent_65%)]"
            aria-hidden
          />
          <div className="relative min-w-0">
            <div className="flex items-center gap-2 text-[clamp(11px,1.9vw,22px)] font-extrabold">
              <i className="block size-[1.7em] rounded-[0.5em] bg-[linear-gradient(135deg,#19C9A7,#0891B2)] not-italic" />
              Vote <span className="bg-[linear-gradient(135deg,#19C9A7,#0891B2)] bg-clip-text text-transparent">Đi</span>
            </div>
            <h4 className="mt-[6%] text-[clamp(14px,3.2vw,38px)] font-extrabold tracking-tight leading-[1.1]">
              {roomName}
            </h4>
            <p className="mt-[3%] text-[clamp(9px,1.5vw,18px)] font-semibold text-muted-foreground">Cả nhóm đã chốt</p>
            <span className="mt-[5%] inline-block rounded-full bg-[linear-gradient(135deg,#19C9A7,#0891B2)] px-[0.8em] py-[0.2em] text-[clamp(10px,1.8vw,22px)] font-extrabold text-white">
              {champTitle ? `${champTitle} vô địch` : "Kết quả Vote Đi"}
            </span>
          </div>
          <div className="relative aspect-square w-[38%] shrink-0 overflow-hidden rounded-[6%] bg-white shadow-[0_20px_40px_-18px_rgba(8,80,90,.6),0_0_0_3px_#fff]">
            <div className="grid h-full place-items-center bg-[linear-gradient(135deg,#19C9A7,#0891B2)] text-[clamp(28px,6vw,72px)] text-white">
              🏆
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
