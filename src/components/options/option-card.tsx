import { ExternalLink, MapPin, Navigation } from "lucide-react";
import { ZoomIcon } from "@/components/icons/zoom-icon";
import { PlaceMapEmbed, directionsUrl } from "@/components/options/place-map";
import type { Item, LinkData, PlaceData } from "@/lib/types";
import { cn } from "@/lib/utils";

export type OptionLike = Pick<
  Item,
  "item_type" | "image_url" | "is_transparent" | "title" | "description" | "emoji" | "price_text" | "place" | "link"
>;

export function optionTitle(option: Pick<Item, "title" | "place" | "link">) {
  return (
    option.title?.trim() ||
    option.place?.name?.trim() ||
    option.link?.title?.trim() ||
    "Lựa chọn"
  );
}

/** Square visual for an option. */
export function OptionMedia({
  option,
  className,
  size = "md",
}: {
  option: OptionLike;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  if ((option.item_type === "image" || option.item_type === "link") && option.image_url) {
    return (
      <span className={cn("opt-media", option.is_transparent && "opt-media-clear", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={option.image_url} alt="" loading="lazy" />
      </span>
    );
  }
  if (option.item_type === "link" && option.link?.image_url) {
    return (
      <span className={cn("opt-media", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={option.link.image_url} alt="" loading="lazy" />
      </span>
    );
  }
  if (option.item_type === "place") {
    return (
      <span className={cn("opt-media opt-media-text opt-place", `opt-${size}`, className)} aria-hidden>
        <MapPin />
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

function PlaceActions({ place, title }: { place: PlaceData; title: string }) {
  const lat = place.lat;
  const lng = place.lng;
  const maps = place.maps_url;
  return (
    <div className="opt-actions">
      {lat != null && lng != null ? (
        <a className="opt-act" href={directionsUrl(lat, lng)} target="_blank" rel="noopener noreferrer">
          <Navigation aria-hidden size={14} />
          Chỉ đường
        </a>
      ) : null}
      {maps ? (
        <a className="opt-act" href={maps} target="_blank" rel="noopener noreferrer">
          <ExternalLink aria-hidden size={14} />
          Mở Google Maps
        </a>
      ) : null}
      {lat != null && lng != null ? <PlaceMapEmbed lat={lat} lng={lng} title={title} /> : null}
    </div>
  );
}

function LinkActions({ link }: { link: LinkData }) {
  return (
    <div className="opt-actions">
      <a className="opt-act" href={link.url} target="_blank" rel="noopener noreferrer">
        <ExternalLink aria-hidden size={14} />
        Mở link{link.site_name ? ` · ${link.site_name}` : ""}
      </a>
    </div>
  );
}

/** Tile card rendered by item_type. */
export function OptionCard({
  option,
  selected,
  badge,
  onZoom,
  children,
  className,
  showMap,
}: {
  option: OptionLike;
  selected?: boolean;
  badge?: React.ReactNode;
  onZoom?: () => void;
  children?: React.ReactNode;
  className?: string;
  showMap?: boolean;
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
        {option.place?.address ? <p>{option.place.address}</p> : null}
        {option.description && option.item_type !== "place" ? <p>{option.description}</p> : null}
        {option.description && option.item_type === "place" && !option.place?.address ? (
          <p>{option.description}</p>
        ) : null}
        {option.link?.site_name ? <p className="opt-site">{option.link.site_name}</p> : null}
        {option.price_text ? <span className="opt-price">{option.price_text}</span> : null}
        {showMap !== false && option.item_type === "place" && option.place ? (
          <PlaceActions place={option.place} title={title} />
        ) : null}
        {option.item_type === "link" && option.link ? <LinkActions link={option.link} /> : null}
      </div>
      {children}
    </article>
  );
}
