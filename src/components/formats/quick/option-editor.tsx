"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Link2, Loader2, MapPin, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { OptionMedia } from "@/components/options/option-card";
import { Input } from "@/components/ui/input";
import { ensureUser } from "@/lib/storage";
import { MAX_ITEM_BYTES } from "@/lib/images";
import { classifyOptionLine } from "@/lib/places/classify-line";
import type { LinkData, PlaceData } from "@/lib/types";
import { cn } from "@/lib/utils";

export type OptionDraft = {
  key: string;
  type: "text" | "image" | "place" | "link";
  title: string;
  emoji: string | null;
  description?: string | null;
  price_text?: string | null;
  file?: File;
  preview?: string;
  place?: PlaceData | null;
  link?: LinkData | null;
  imageBlob?: Blob;
  imageContentType?: string;
  /** Resolving Maps URL in background. */
  resolving?: boolean;
  /** Soft-fail: open name field for user edit. */
  needsName?: boolean;
};

const LEADING_EMOJI = new RegExp(
  "^(\\p{Extended_Pictographic}(?:\\uFE0F|\\u200D\\p{Extended_Pictographic}|\\p{Emoji_Modifier})*)\\s*",
  "u",
);

const PLACEHOLDER_NAME = "Địa điểm chưa rõ tên";

export function textDraft(line: string): OptionDraft | null {
  const classified = classifyOptionLine(line);
  if (classified.kind !== "text") return null;
  const raw = classified.value.slice(0, 100);
  if (!raw) return null;
  const match = raw.match(LEADING_EMOJI);
  const emoji = match?.[1] ?? null;
  const title = (match ? raw.slice(match[0].length) : raw).trim().slice(0, 80) || raw.slice(0, 80);
  return { key: crypto.randomUUID(), type: "text", title, emoji };
}

function fileTitle(name: string) {
  return name.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").trim().slice(0, 80);
}

async function resolvePlaceApi(url: string): Promise<{
  name: string | null;
  lat: number | null;
  lng: number | null;
  mapsUrl: string;
  incomplete?: boolean;
}> {
  await ensureUser();
  const res = await fetch("/api/places/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = (await res.json()) as {
    name?: string | null;
    lat?: number | null;
    lng?: number | null;
    mapsUrl?: string;
    incomplete?: boolean;
    error?: string;
  };
  if (res.status === 401 || res.status === 429) throw new Error(data.error ?? "UNAUTHENTICATED");
  // Soft payload even on partial failure
  return {
    name: data.name ?? null,
    lat: data.lat ?? null,
    lng: data.lng ?? null,
    mapsUrl: data.mapsUrl ?? url,
    incomplete: data.incomplete ?? (!data.name || data.lat == null),
  };
}

async function resolveLinkApi(url: string): Promise<OptionDraft> {
  await ensureUser();
  const res = await fetch("/api/unfurl", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = (await res.json()) as {
    url?: string;
    title?: string | null;
    siteName?: string | null;
    description?: string | null;
    image?: { contentType: string; base64: string } | null;
    error?: string;
  };
  if (res.status === 401 || res.status === 429) throw new Error(data.error ?? "UNAUTHENTICATED");
  let imageBlob: Blob | undefined;
  let preview: string | undefined;
  let imageContentType: string | undefined;
  if (data.image?.base64) {
    const bin = Uint8Array.from(atob(data.image.base64), (c) => c.charCodeAt(0));
    imageBlob = new Blob([bin], { type: data.image.contentType });
    preview = URL.createObjectURL(imageBlob);
    imageContentType = data.image.contentType;
  }
  const finalUrl = data.url ?? url;
  let host = "Link";
  try {
    host = new URL(finalUrl).hostname.replace(/^www\./, "");
  } catch {
    /* keep */
  }
  const title = (data.title ?? host).slice(0, 80);
  return {
    key: crypto.randomUUID(),
    type: "link",
    title,
    emoji: null,
    description: data.description ?? null,
    preview,
    imageBlob,
    imageContentType,
    link: { url: finalUrl, title, site_name: data.siteName ?? host, image_url: null },
  };
}

function placeDraftFromResolved(
  url: string,
  data: { name: string | null; lat: number | null; lng: number | null; mapsUrl: string },
): OptionDraft {
  const name = data.name?.trim() || PLACEHOLDER_NAME;
  return {
    key: crypto.randomUUID(),
    type: "place",
    title: name.slice(0, 80),
    emoji: null,
    needsName: !data.name?.trim(),
    place: {
      name: data.name?.trim() || null,
      lat: data.lat,
      lng: data.lng,
      maps_url: data.mapsUrl || url,
      address: null,
      booking_url: null,
      note: null,
    },
  };
}

export function OptionEditor({
  value,
  max,
  onChange,
  /** When true: primary UX is paste Maps links (vote địa điểm). */
  placeMode = false,
}: {
  value: OptionDraft[];
  max: number;
  onChange: (next: OptionDraft[]) => void;
  placeMode?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [bulk, setBulk] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  function replaceResolved(key: string, next: OptionDraft) {
    const updated = valueRef.current.map((row) => (row.key === key ? next : row));
    valueRef.current = updated;
    onChangeRef.current(updated);
  }

  function append(next: OptionDraft[]) {
    const room = max - valueRef.current.length;
    if (room <= 0) {
      toast.error(`Tối đa ${max} lựa chọn.`);
      return false;
    }
    if (next.length > room) toast.error(`Chỉ thêm được ${room} lựa chọn nữa (tối đa ${max}).`);
    const merged = [...valueRef.current, ...next.slice(0, room)];
    valueRef.current = merged;
    onChangeRef.current(merged);
    return true;
  }

  /** Insert skeleton place cards immediately, resolve in background. */
  async function ingestLines(text: string) {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) return false;

    const room = max - value.length;
    if (room <= 0) {
      toast.error(`Tối đa ${max} lựa chọn.`);
      return false;
    }

    const classified = lines.slice(0, room).map((line) => {
      try {
        return classifyOptionLine(line);
      } catch {
        return null;
      }
    }).filter((row): row is NonNullable<typeof row> => Boolean(row));

    if (placeMode) {
      // Force maps-only: non-maps URLs still become link; bare text rejected with toast
      for (const row of classified) {
        if (row.kind === "text") {
          toast.error("Chế độ địa điểm: hãy dán link Google Maps.");
          return false;
        }
      }
    }

    // Never create text options whose title is a URL — classify already prevents that.
    const skeletons: OptionDraft[] = [];
    const jobs: { key: string; kind: "place" | "link"; url: string }[] = [];

    for (const row of classified) {
      if (row.kind === "place") {
        const key = crypto.randomUUID();
        skeletons.push({
          key,
          type: "place",
          title: "Đang lấy vị trí…",
          emoji: null,
          resolving: true,
          place: { maps_url: row.value, name: null, lat: null, lng: null },
        });
        jobs.push({ key, kind: "place", url: row.value });
      } else if (row.kind === "link") {
        if (placeMode) {
          // In place mode, treat unknown URLs as booking links attached later — still create place? Spec says maps only for primary. Use link as booking hint on a place skeleton if it looks like booking... For simplicity toast + skip non-maps in placeMode already handled above for text; links that aren't maps shouldn't appear if classify is correct. Booking sites → link type not allowed in placeMode:
          toast.error("Chế độ địa điểm chỉ nhận link Google Maps. Link đặt phòng thêm sau khi có thẻ.");
          continue;
        }
        const key = crypto.randomUUID();
        skeletons.push({
          key,
          type: "link",
          title: "Đang đọc link…",
          emoji: null,
          resolving: true,
          link: { url: row.value, title: null, site_name: null, image_url: null },
        });
        jobs.push({ key, kind: "link", url: row.value });
      } else {
        const t = textDraft(row.value);
        if (t) skeletons.push(t);
      }
    }

    if (skeletons.length === 0) return false;
    const merged = [...valueRef.current, ...skeletons].slice(0, max);
    valueRef.current = merged;
    onChangeRef.current(merged);
    setBusy(true);
    try {
      for (const job of jobs) {
        if (job.kind === "place") {
          try {
            const data = await resolvePlaceApi(job.url);
            const done = placeDraftFromResolved(job.url, data);
            done.key = job.key;
            replaceResolved(job.key, done);
          } catch {
            const fallback = placeDraftFromResolved(job.url, {
              name: null,
              lat: null,
              lng: null,
              mapsUrl: job.url,
            });
            fallback.key = job.key;
            replaceResolved(job.key, fallback);
            toast.message("Chưa lấy được toạ độ — hãy sửa tên địa điểm.");
          }
        } else {
          try {
            const done = await resolveLinkApi(job.url);
            done.key = job.key;
            replaceResolved(job.key, done);
          } catch {
            let host = "Link";
            try {
              host = new URL(job.url).hostname.replace(/^www\./, "");
            } catch {
              /* */
            }
            replaceResolved(job.key, {
              key: job.key,
              type: "link",
              title: host,
              emoji: null,
              link: { url: job.url, title: host, site_name: host, image_url: null },
            });
          }
        }
      }
      return true;
    } finally {
      setBusy(false);
    }
  }

  function addFiles(list: File[]) {
    if (placeMode) {
      toast.error("Chế độ địa điểm không thêm ảnh làm lựa chọn.");
      return;
    }
    const images = list.filter((file) => /^image\/(png|jpeg|webp)$/.test(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name));
    if (images.length < list.length) toast.error("Chỉ nhận ảnh PNG, JPG hoặc WEBP.");
    const ok = images.filter((file) => file.size <= MAX_ITEM_BYTES);
    if (ok.length < images.length) toast.error("Có ảnh lớn hơn 10MB, đã bỏ qua.");
    append(
      ok.map((file) => ({
        key: crypto.randomUUID(),
        type: "image" as const,
        title: fileTitle(file.name),
        emoji: null,
        file,
        preview: URL.createObjectURL(file),
      })),
    );
  }

  function remove(key: string) {
    const row = value.find((entry) => entry.key === key);
    if (row?.preview) URL.revokeObjectURL(row.preview);
    onChange(value.filter((entry) => entry.key !== key));
  }

  function patch(key: string, partial: Partial<OptionDraft>) {
    onChange(
      value.map((entry) => {
        if (entry.key !== key) return entry;
        const next = { ...entry, ...partial };
        if (partial.place) next.place = { ...(entry.place ?? {}), ...partial.place };
        if (partial.title && next.place) {
          next.place = { ...next.place, name: partial.title };
          next.needsName = false;
        }
        return next;
      }),
    );
  }

  async function commitDraft() {
    if (!draft.trim()) return;
    if (await ingestLines(draft)) setDraft("");
  }

  async function commitBulk() {
    if (!bulk.trim()) return;
    if (await ingestLines(bulk)) setBulk("");
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={draft}
          maxLength={2048}
          placeholder={
            placeMode
              ? "Dán link Google Maps…"
              : "VD: 🍲 Lẩu Thái · hoặc dán link Maps / Shopee"
          }
          aria-label={placeMode ? "Dán link Google Maps" : "Thêm lựa chọn"}
          disabled={busy}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void commitDraft();
            }
          }}
          onPaste={(event) => {
            const text = event.clipboardData.getData("text");
            if (text.includes("\n") || classifyOptionLineSafe(text)?.kind === "place") {
              event.preventDefault();
              void ingestLines(text);
              setDraft("");
            }
          }}
        />
        <button
          type="button"
          className="btn btn-primary min-h-11 shrink-0 px-4"
          aria-label="Thêm"
          disabled={busy}
          onClick={() => void commitDraft()}
        >
          {busy ? <Loader2 className="animate-spin" aria-hidden size={18} /> : <Plus aria-hidden size={18} />}
        </button>
      </div>

      {placeMode ? (
        <p className="text-xs text-muted-foreground">
          Mở Google Maps → chọn địa điểm → Chia sẻ → Sao chép liên kết. Có thể dán nhiều link cùng lúc.
        </p>
      ) : (
        <label className="block space-y-2">
          <span className="text-sm font-semibold">Thêm nhanh</span>
          <textarea
            value={bulk}
            rows={3}
            disabled={busy}
            placeholder={"Dán nhiều dòng:\nlink Maps → địa điểm\nlink khác → thẻ link\nchữ → lựa chọn chữ"}
            className="w-full resize-none rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
            onChange={(event) => setBulk(event.target.value)}
          />
          <button type="button" className="btn btn-dark min-h-11 w-full" disabled={busy || !bulk.trim()} onClick={() => void commitBulk()}>
            Nhận diện và thêm
          </button>
        </label>
      )}

      {placeMode ? (
        <label className="block space-y-2">
          <span className="text-sm font-semibold">Thêm nhanh nhiều link Maps</span>
          <textarea
            value={bulk}
            rows={3}
            disabled={busy}
            placeholder={"Mỗi dòng một link:\nhttps://maps.app.goo.gl/…\nhttps://maps.app.goo.gl/…"}
            className="w-full resize-none rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
            onChange={(event) => setBulk(event.target.value)}
          />
          <button type="button" className="btn btn-dark min-h-11 w-full" disabled={busy || !bulk.trim()} onClick={() => void commitBulk()}>
            Thêm các địa điểm
          </button>
        </label>
      ) : null}

      {!placeMode ? (
        <>
          <input
            ref={fileRef}
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
            multiple
            onChange={(event) => {
              addFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
          <button
            type="button"
            className="glass flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-sm font-semibold"
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus aria-hidden size={18} />
            Thêm ảnh làm lựa chọn
          </button>
        </>
      ) : null}

      {value.length === 0 ? (
        <p className="rounded-[22px] border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {placeMode ? "Chưa có địa điểm. Dán link Google Maps để thêm." : "Chưa có lựa chọn nào. Cần ít nhất 2 lựa chọn."}
        </p>
      ) : (
        <ol className="space-y-3">
          {value.map((row, index) => (
            <li key={row.key} className={cn("opt-edit-row", row.resolving && "opacity-70")}>
              <span className="opt-thumb">
                {row.resolving ? (
                  <span className="opt-media opt-media-text opt-place opt-sm grid place-items-center">
                    <Loader2 className="animate-spin" size={18} aria-hidden />
                  </span>
                ) : (
                  <OptionMedia
                    size="sm"
                    option={{
                      item_type: row.type,
                      image_url: row.preview ?? null,
                      is_transparent: false,
                      title: row.title,
                      description: row.description ?? null,
                      emoji: row.emoji,
                      price_text: row.price_text ?? null,
                      place: row.place ?? null,
                      link: row.link ?? null,
                    }}
                  />
                )}
              </span>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                  {row.type === "place" ? <MapPin size={12} aria-hidden /> : null}
                  {row.type === "link" ? <Link2 size={12} aria-hidden /> : null}
                  {row.resolving
                    ? "Đang lấy vị trí…"
                    : row.type === "place"
                      ? "Địa điểm"
                      : row.type === "link"
                        ? "Link"
                        : row.type === "image"
                          ? "Ảnh"
                          : "Chữ"}
                </div>
                <Input
                  value={row.resolving ? "" : row.title}
                  maxLength={80}
                  disabled={row.resolving}
                  placeholder={row.needsName ? PLACEHOLDER_NAME : "Tên lựa chọn"}
                  aria-label={`Tên lựa chọn ${index + 1}`}
                  autoFocus={row.needsName}
                  onChange={(event) => patch(row.key, { title: event.target.value, needsName: false })}
                />
                {row.type === "place" && !row.resolving ? (
                  <>
                    <Input
                      value={row.place?.address ?? ""}
                      maxLength={120}
                      placeholder="Địa chỉ (tuỳ chọn)"
                      onChange={(event) => patch(row.key, { place: { address: event.target.value || null } })}
                    />
                    <Input
                      value={row.price_text ?? ""}
                      maxLength={40}
                      placeholder='Giá (VD: "450k/đêm", "150k/người")'
                      onChange={(event) => patch(row.key, { price_text: event.target.value || null })}
                    />
                    <Input
                      value={row.place?.note ?? row.description ?? ""}
                      maxLength={200}
                      placeholder="Ghi chú (tuỳ chọn)"
                      onChange={(event) =>
                        patch(row.key, {
                          description: event.target.value || null,
                          place: { note: event.target.value || null },
                        })
                      }
                    />
                    {placeMode || row.place?.booking_url !== undefined ? (
                      <Input
                        value={row.place?.booking_url ?? ""}
                        maxLength={2048}
                        placeholder="Link đặt phòng Booking/Agoda/Airbnb (tuỳ chọn)"
                        onChange={(event) => patch(row.key, { place: { booking_url: event.target.value || null } })}
                      />
                    ) : null}
                  </>
                ) : null}
                {(row.type === "link" || row.type === "place") && row.type !== "place" ? (
                  <Input
                    value={row.price_text ?? ""}
                    maxLength={40}
                    placeholder="Giá (VD: 250k/người)"
                    onChange={(event) => patch(row.key, { price_text: event.target.value || null })}
                  />
                ) : null}
              </div>
              <button
                type="button"
                className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                aria-label={`Xoá lựa chọn ${index + 1}`}
                onClick={() => remove(row.key)}
              >
                <X aria-hidden size={18} />
              </button>
            </li>
          ))}
        </ol>
      )}
      <p className="text-right text-xs text-muted-foreground">
        {value.length}/{max} lựa chọn
      </p>
    </div>
  );
}

function classifyOptionLineSafe(line: string) {
  try {
    return classifyOptionLine(line.trim());
  } catch {
    return null;
  }
}
