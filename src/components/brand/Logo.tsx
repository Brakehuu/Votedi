import { useId } from "react";
import { cn } from "@/lib/utils";

export function LogoMark({
  className,
  variant = "color",
}: {
  className?: string;
  variant?: "color" | "white";
}) {
  const raw = useId().replace(/:/g, "");
  const id = `vdg-${raw}`;

  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#19C9A7" />
          <stop offset=".5" stopColor="#0EA5A4" />
          <stop offset="1" stopColor="#0891B2" />
        </linearGradient>
      </defs>
      <rect
        width="40"
        height="40"
        rx="11"
        fill={variant === "white" ? "rgba(255,255,255,.16)" : `url(#${id})`}
      />
      <path
        d="M9 28h5l5-5"
        stroke="#fff"
        strokeOpacity=".6"
        strokeWidth="3.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 14h5l5 9 12-12"
        stroke="#fff"
        strokeWidth="3.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({
  className,
  variant = "lockup",
  tone = "color",
}: {
  className?: string;
  variant?: "icon" | "lockup";
  tone?: "color" | "white";
}) {
  if (variant === "icon") {
    return <LogoMark className={className} variant={tone === "white" ? "white" : "color"} />;
  }

  return (
    <span className={cn("brand", tone === "white" && "text-white", className)}>
      <LogoMark variant={tone === "white" ? "white" : "color"} />
      <span>
        Vote {tone === "white" ? <b className="text-white">Đi</b> : <b>Đi</b>}
      </span>
    </span>
  );
}
