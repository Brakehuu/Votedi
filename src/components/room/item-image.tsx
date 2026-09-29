import { cn } from "@/lib/utils";

export function ItemImage({
  src,
  alt,
  transparent,
  className,
}: {
  src: string | undefined;
  alt: string;
  transparent: boolean;
  className?: string;
}) {
  if (transparent) {
    return (
      <div
        className={cn(
          "relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-primary-soft to-[#F4F9F9] p-3 dark:to-[#0f2226]",
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-full w-full object-contain drop-shadow-lg" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={cn("aspect-square w-full rounded-2xl object-cover", className)} />
  );
}
