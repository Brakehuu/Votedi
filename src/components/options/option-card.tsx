"use client";

import { ZoomButton } from "@/components/ui/zoom-button";
import { ExternalLink, MapPin, Navigation, RefreshCw } from "lucide-react";
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
        <MapPin width={28} height={28} strokeWidth={2} className="shrink-0" aria-hidden />
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

export function PlaceActionRow({
  place,
  price,
  onRefetch,
  refetching,
}: {
  place: PlaceData;
  price?: string | null;
  onRefetch?: () => void;
  refetching?: boolean;
}) {
  const lat = place.lat;
  const lng = place.lng;
  return (
    <div className="place-acts">
      {lat != null && lng != null ? (
        <a className="place-act" href={directionsUrl(lat, lng)} target="_blank" rel="noopener noreferrer">
          <Navigation aria-hidden size={13} />
          Chỉ đường
        </a>
      ) : null}
      {place.maps_url ? (
        <a className="place-act" href={place.maps_url} target="_blank" rel="noopener noreferrer">
          <ExternalLink aria-hidden size={13} />
          Mở Maps
        </a>
      ) : null}
      {place.booking_url ? (
        <a className="place-act" href={place.booking_url} target="_blank" rel="noopener noreferrer">
          <ExternalLink aria-hidden size={13} />
          Đặt phòng
        </a>
      ) : null}
      {onRefetch && (lat == null || lng == null) ? (
        <button type="button" className="place-act" disabled={refetching} onClick={onRefetch}>
          <RefreshCw aria-hidden size={13} className={refetching ? "animate-spin" : undefined} />
          Lấy lại vị trí
        </button>
      ) : null}
      {price ? <span className="place-price-chip">{price}</span> : null}
    </div>
  );
}

/** Map-first place card for vote-địa-điểm mode. */
export function PlaceVoteCard({
  option,
  rank,
  selected,
  closed,
  voters,
  onPick,
  onRefetch,
  refetching,
  children,
}: {
  option: OptionLike & { place: PlaceData | null };
  rank: number;
  selected?: boolean;
  closed?: boolean;
  voters?: React.ReactNode;
  onPick?: () => void;
  onRefetch?: () => void;
  refetching?: boolean;
  children?: React.ReactNode;
}) {
  const title = optionTitle(option);
  const place = option.place;
  const lat = place?.lat;
  const lng = place?.lng;
  return (
    <article className={cn("place-card", selected && "on")}>
      <div className="place-card-map">
        {lat != null && lng != null ? (
          <PlaceMapEmbed lat={lat} lng={lng} title={title} className="place-map place-map-card" />
        ) : (
          <div className="place-map-ph place-map-card grid place-items-center text-sm font-semibold text-muted-foreground">
            Chưa có toạ độ
          </div>
        )}
        <span className="place-card-rank">{rank}</span>
      </div>
      <div className="place-card-body">
        <b>{title}</b>
        {place?.address ? <p>{place.address}</p> : option.description ? <p>{option.description}</p> : null}
        {option.price_text ? <span className="place-price-chip">{option.price_text}</span> : null}
        {voters}
        {place ? (
          <PlaceActionRow place={place} onRefetch={onRefetch} refetching={refetching} />
        ) : null}
        <div className="place-card-foot">
          {!closed && onPick ? (
            <button type="button" className={cn("ql-pick", selected && "on")} onClick={onPick} aria-pressed={selected}>
              {selected ? "Đã chọn" : "Chọn"}
            </button>
          ) : null}
          {children}
        </div>
      </div>
    </article>
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

  if (option.item_type === "place" && showMap !== false) {
    const place = option.place;
    const lat = place?.lat;
    const lng = place?.lng;
    return (
      <article className={cn("place-card", selected && "on", className)}>
        <div className="place-card-map">
          {lat != null && lng != null ? (
            <PlaceMapEmbed lat={lat} lng={lng} title={title} className="place-map place-map-card" />
          ) : (
            <div className="place-map-ph place-map-card" />
          )}
          {badge ? <span className="place-card-rank">{badge}</span> : null}
        </div>
        <div className="place-card-body">
          <b title={title}>{title}</b>
          {place?.address ? <p>{place.address}</p> : null}
          {option.price_text ? <span className="place-price-chip">{option.price_text}</span> : null}
          {place ? <PlaceActionRow place={place} /> : null}
        </div>
        {children}
      </article>
    );
  }

  return (
    <article className={cn("opt-card", selected && "on", className)}>
      <div className="opt-card-media relative">
        {zoomable ? (
          <>
            <button type="button" className="opt-zoom-btn" aria-label={`Xem to ${title}`} onClick={onZoom}>
              <OptionMedia option={option} size="lg" />
            </button>
            <ZoomButton label={title} onClick={onZoom} />
          </>
        ) : (
          <OptionMedia option={option} size="lg" />
        )}
        {badge ? <span className="opt-badge">{badge}</span> : null}
      </div>
      <div className="opt-card-body">
        <b title={title}>{title}</b>
        {option.description ? <p>{option.description}</p> : null}
        {option.link?.site_name ? <p className="opt-site">{option.link.site_name}</p> : null}
        {option.price_text ? <span className="opt-price">{option.price_text}</span> : null}
        {option.item_type === "link" && option.link ? <LinkActions link={option.link} /> : null}
      </div>
      {children}
    </article>
  );
}
