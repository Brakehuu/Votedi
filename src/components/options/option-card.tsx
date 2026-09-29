import { ZoomIcon } from "@/components/icons/zoom-icon";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/utils";

export type OptionLike = Pick<
  Item,
  "item_type" | "image_url" | "is_transparent" | "title" | "description" | "emoji" | "price_text"
>;

export function optionTitle(option: Pick<Item, "title">) {
  return option.title?.trim() || "Lựa chọn";
}

/** Square visual for an option: the photo for image items, a big emoji / initial for text. */
export function OptionMedia({
  option,
  className,
  size = "md",
}: {
  option: OptionLike;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  if (option.item_type === "image" && option.image_url) {
    return (
      <span className={cn("opt-media", option.is_transparent && "opt-media-clear", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={option.image_url} alt="" loading="lazy" />
      </span>
    );
  }
  const glyph = option.emoji || optionTitle(option).charAt(0).toUpperCase();
  return (
    <span className={cn("opt-media opt-media-text", `opt-${size}`, !option.emoji && "opt-initial", className)} aria-hidden>
      {glyph}
    </span>
  );
}

/** Tile card rendered by item_type (image / text). `children` holds actions or tallies. */
export function OptionCard({
  option,
  selected,
  badge,
  onZoom,
  children,
  className,
}: {
  option: OptionLike;
  selected?: boolean;
  badge?: React.ReactNode;
  onZoom?: () => void;
  children?: React.ReactNode;
  className?: string;
}) {
  const title = optionTitle(option);
  const zoomable = Boolean(onZoom && option.item_type === "image" && option.image_url);
  return (
    <article className={cn("opt-card", selected && "on", className)}>
      <div className="opt-card-media">
        {zoomable ? (
          <button type="button" className="opt-zoom-btn" aria-label={`Xem to ${title}`} onClick={onZoom}>
            <OptionMedia option={option} size="lg" />
            <span className="ql-zoom" aria-hidden>
              <ZoomIcon />
            </span>
          </button>
        ) : (
          <OptionMedia option={option} size="lg" />
        )}
        {badge ? <span className="opt-badge">{badge}</span> : null}
      </div>
      <div className="opt-card-body">
        <b title={title}>{title}</b>
        {option.description ? <p>{option.description}</p> : null}
        {option.price_text ? <span className="opt-price">{option.price_text}</span> : null}
      </div>
      {children}
    </article>
  );
}
