import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-transparent text-base font-semibold whitespace-nowrap transition-[transform,filter,background-color,box-shadow] duration-150 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/40 active:scale-95 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "text-white shadow-[0_0_0_4px_rgba(14,165,164,.14),inset_0_1px_0_rgba(255,255,255,.35),0_10px_24px_-10px_rgba(8,145,178,.7)] hover:brightness-107 [background:var(--grad)]",
        outline: "border-border bg-white/70 backdrop-blur-xl hover:bg-white dark:bg-white/5 dark:hover:bg-white/10",
        secondary: "bg-primary-soft text-foreground hover:bg-primary/15",
        ghost: "hover:bg-white/60 dark:hover:bg-white/10",
        destructive: "bg-lose text-white hover:opacity-90",
        soft: "bg-primary-soft text-foreground hover:bg-primary/15",
      },
      size: {
        default: "h-12 px-5",
        sm: "h-11 px-4 text-sm",
        lg: "h-14 px-6 text-lg",
        icon: "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
