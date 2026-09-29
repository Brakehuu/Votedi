import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "soft",
  ...props
}: React.ComponentProps<"span"> & { tone?: "soft" | "warn" | "solid" }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold",
        tone === "soft" && "bg-primary-soft text-foreground",
        tone === "warn" && "bg-warn/15 text-foreground",
        tone === "solid" && "bg-primary text-primary-foreground",
        className,
      )}
      {...props}
    />
  );
}
