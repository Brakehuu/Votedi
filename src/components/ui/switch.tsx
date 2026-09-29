"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full bg-border transition-colors data-[checked]:bg-primary focus-visible:ring-3 focus-visible:ring-ring/40",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="size-6 translate-x-1 rounded-full bg-white shadow transition-transform data-[checked]:translate-x-7" />
    </SwitchPrimitive.Root>
  );
}
