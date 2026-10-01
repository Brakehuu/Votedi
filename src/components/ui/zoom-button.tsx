"use client";

import { Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ZoomButtonProps = {
  label: string;
  size?: "md" | "sm";
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

/**
 * Nút phóng to ảnh dùng chung (lobby, vòng loại, kết quả).
 * Kích thước icon truyền thẳng vào SVG — không phụ thuộc CSS trang.
 */
export function ZoomButton({ label, size = "md", className, onClick }: ZoomButtonProps) {
  const box = size === "sm" ? 24 : 34;
  const icon = size === "sm" ? 12 : 16;
  return (
    <button
      type="button"
      aria-label={`Phóng to ${label}`}
      className={cn(
        "zbtn absolute z-[3] grid shrink-0 place-items-center rounded-full",
        "bg-[rgba(255,255,255,0.88)] text-[#0C1B20] shadow-[0_4px_12px_-2px_rgba(8,50,60,0.35)]",
        "backdrop-blur-[6px] transition-[transform,background] duration-150",
        "before:absolute before:content-[''] hover:scale-105 hover:bg-white",
        size === "sm" ? "top-[5px] right-[5px] before:inset-[-10px]" : "top-[10px] right-[10px] before:inset-[-6px]",
        className,
      )}
      style={{ width: box, height: box }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick?.(event);
      }}
    >
      <Maximize2 width={icon} height={icon} strokeWidth={2} aria-hidden className="shrink-0" />
    </button>
  );
}
