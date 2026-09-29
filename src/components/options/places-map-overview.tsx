"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import type { Item } from "@/lib/types";
import { optionTitle } from "@/components/options/option-card";

type MarkerPlace = {
  id: string;
  title: string;
  rank: number;
  lat: number;
  lng: number;
};

function toMarkers(items: Item[], ranks: Map<string, number>): MarkerPlace[] {
  const out: MarkerPlace[] = [];
  for (const item of items) {
    const lat = item.place?.lat;
    const lng = item.place?.lng;
    if (item.item_type !== "place" || lat == null || lng == null) continue;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    out.push({
      id: item.id,
      title: optionTitle(item),
      rank: ranks.get(item.id) ?? out.length + 1,
      lat,
      lng,
    });
  }
  return out;
}

/** Leaflet + OSM overview. Dynamically imported CSS/JS — no SSR. */
export function PlacesMapOverview({
  items,
  ranks,
  open,
  onClose,
}: {
  items: Item[];
  ranks: Map<string, number>;
  open: boolean;
  onClose: () => void;
}) {
  const mapId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const markers = useMemo(() => toMarkers(items, ranks), [items, ranks]);
  const markerKey = markers.map((m) => `${m.id}:${m.lat},${m.lng},${m.rank}`).join("|");

  useEffect(() => {
    if (!open || markers.length === 0) return;
    let cancelled = false;
    let map: import("leaflet").Map | null = null;

    async function boot() {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current) return;

      map = L.map(containerRef.current, { scrollWheelZoom: false });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const bounds = L.latLngBounds([]);
      for (const m of markers) {
        const icon = L.divIcon({
          className: "place-pin",
          html: `<span>${m.rank}</span>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const marker = L.marker([m.lat, m.lng], { icon }).addTo(map!);
        marker.bindPopup(`<b>#${m.rank}</b> ${m.title}`);
        bounds.extend([m.lat, m.lng]);
      }
      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.2));
      } else {
        map.setView([markers[0]!.lat, markers[0]!.lng], 14);
      }
    }

    void boot();
    return () => {
      cancelled = true;
      map?.remove();
    };
    // markerKey captures marker identity without depending on array identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, markerKey]);

  if (!open) return null;

  return (
    <div className="place-ov" role="dialog" aria-modal="true" aria-label="Bản đồ các địa điểm">
      <button type="button" className="place-ov-scrim" aria-label="Đóng" onClick={onClose} />
      <div className="place-ov-sheet glass">
        <div className="place-ov-head">
          <b>Xem trên bản đồ</b>
          <button type="button" className="rs-x" aria-label="Đóng" onClick={onClose}>
            ×
          </button>
        </div>
        {markers.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Chưa có địa điểm nào có toạ độ.</p>
        ) : (
          <div ref={containerRef} id={`map-${mapId}`} className="place-ov-map" />
        )}
        <p className="place-ov-src">© OpenStreetMap</p>
      </div>
    </div>
  );
}
