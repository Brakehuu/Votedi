import Link from "next/link";
import { cn } from "@/lib/utils";

export function Chip({
  children,
  muted,
  href,
  className,
}: {
  children: React.ReactNode;
  muted?: boolean;
  href?: string;
  className?: string;
}) {
  const cls = cn("chip", muted && "chip-muted", className);
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return <span className={cls}>{children}</span>;
}

/** Hàng chip riêng — không inline với tiêu đề, không position:absolute. */
export function ChipRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("chip-row", className)}>{children}</div>;
}
