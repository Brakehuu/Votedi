"use client";

import { useRef, useState } from "react";
import { ImagePlus, Link2, Loader2, MapPin, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { OptionMedia } from "@/components/options/option-card";
import { Input } from "@/components/ui/input";
import { ensureUser } from "@/lib/storage";
import { MAX_ITEM_BYTES } from "@/lib/images";
import { isGoogleMapsHost, isMapsShortLink } from "@/lib/places/parse-maps-url";
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
  /** Staging image from unfurl (upload on save). */
  imageBlob?: Blob;
  imageContentType?: string;
};

const LEADING_EMOJI = new RegExp(
  "^(\\p{Extended_Pictographic}(?:\\uFE0F|\\u200D\\p{Extended_Pictographic}|\\p{Emoji_Modifier})*)\\s*",
  "u",
);

function looksLikeUrl(line: string) {
  return /^https?:\/\//i.test(line.trim());
}

function isMapsLine(line: string) {
  try {
    const url = new URL(line.trim());
    return isGoogleMapsHost(url.hostname) || isMapsShortLink(url);
  } catch {
    return false;
  }
}

/** "🍜 Phở" → emoji + title. */
export function textDraft(line: string): OptionDraft | null {
  const raw = line.trim().slice(0, 100);
  if (!raw || looksLikeUrl(raw)) return null;
  const match = raw.match(LEADING_EMOJI);
  const emoji = match?.[1] ?? null;
  const title = (match ? raw.slice(match[0].length) : raw).trim().slice(0, 80) || raw.slice(0, 80);
  return { key: crypto.randomUUID(), type: "text", title, emoji };
}

function fileTitle(name: string) {
  return name.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").trim().slice(0, 80);
}

async function resolvePlace(url: string): Promise<OptionDraft> {
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
    error?: string;
  };
  if (!res.ok) throw new Error(data.error ?? "INVALID");
  const place: PlaceData = {
    name: data.name ?? null,
    lat: data.lat ?? null,
    lng: data.lng ?? null,
    maps_url: data.mapsUrl ?? url,
  };
  return {
    key: crypto.randomUUID(),
    type: "place",
    title: (data.name ?? "").slice(0, 80) || "Địa điểm",
    emoji: null,
    place,
  };
}

async function resolveLink(url: string): Promise<OptionDraft> {
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
  if (res.status === 400 || res.status === 401 || res.status === 429) {
    throw new Error(data.error ?? "INVALID");
  }
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
    link: {
      url: finalUrl,
      title,
      site_name: data.siteName ?? host,
      image_url: null,
    },
  };
}

export function OptionEditor({
  value,
  max,
  onChange,
}: {
  value: OptionDraft[];
  max: number;
  onChange: (next: OptionDraft[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [bulk, setBulk] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function append(next: OptionDraft[]) {
    const room = max - value.length;
    if (room <= 0) {
      toast.error(`Tối đa ${max} lựa chọn.`);
      return false;
    }
    if (next.length > room) toast.error(`Chỉ thêm được ${room} lựa chọn nữa (tối đa ${max}).`);
    onChange([...value, ...next.slice(0, room)]);
    return true;
  }

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

    setBusy(true);
    try {
      const next: OptionDraft[] = [];
      for (const line of lines.slice(0, room)) {
        if (looksLikeUrl(line) && isMapsLine(line)) {
          try {
            next.push(await resolvePlace(line));
          } catch {
            toast.error(`Không đọc được link Maps: ${line.slice(0, 40)}…`);
          }
        } else if (looksLikeUrl(line)) {
          try {
            next.push(await resolveLink(line));
          } catch {
            let host = "Link";
            try {
              host = new URL(line).hostname.replace(/^www\./, "");
            } catch {
              /* */
            }
            next.push({
              key: crypto.randomUUID(),
              type: "link",
              title: host,
              emoji: null,
              link: { url: line, title: host, site_name: host, image_url: null },
            });
          }
        } else {
          const row = textDraft(line);
          if (row) next.push(row);
        }
      }
      if (next.length === 0) return false;
      return append(next);
    } finally {
      setBusy(false);
    }
  }

  function addFiles(list: File[]) {
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

  function patch(key: string, patch: Partial<OptionDraft>) {
    onChange(value.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry)));
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
          placeholder="VD: 🍲 Lẩu Thái · hoặc dán link Maps / Shopee"
          aria-label="Thêm lựa chọn"
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
            if (text.includes("\n")) {
              event.preventDefault();
              void ingestLines(text);
            }
          }}
        />
        <button
          type="button"
          className="btn btn-primary min-h-11 shrink-0 px-4"
          aria-label="Thêm lựa chọn"
          disabled={busy}
          onClick={() => void commitDraft()}
        >
          {busy ? <Loader2 className="animate-spin" aria-hidden size={18} /> : <Plus aria-hidden size={18} />}
        </button>
      </div>

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
      <p className="text-xs text-muted-foreground">
        Gõ rồi Enter, dán nhiều dòng, hoặc dùng Thêm nhanh. Link Maps → địa điểm, link khác → thẻ link.
      </p>

      {value.length === 0 ? (
        <p className="rounded-[22px] border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Chưa có lựa chọn nào. Cần ít nhất 2 lựa chọn.
        </p>
      ) : (
        <ol className="space-y-2">
          {value.map((row, index) => (
            <li key={row.key} className="opt-edit-row">
              <span className="opt-thumb">
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
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                  {row.type === "place" ? <MapPin size={12} aria-hidden /> : null}
                  {row.type === "link" ? <Link2 size={12} aria-hidden /> : null}
                  {row.type === "place" ? "Địa điểm" : row.type === "link" ? "Link" : row.type === "image" ? "Ảnh" : "Chữ"}
                </div>
                <Input
                  value={row.title}
                  maxLength={80}
                  aria-label={`Tên lựa chọn ${index + 1}`}
                  placeholder={row.type === "image" ? `Lựa chọn ${index + 1}` : "Tên lựa chọn"}
                  onChange={(event) => patch(row.key, { title: event.target.value })}
                />
                {row.type === "place" ? (
                  <Input
                    value={row.place?.address ?? ""}
                    maxLength={120}
                    placeholder="Địa chỉ (tuỳ chọn)"
                    aria-label={`Địa chỉ ${index + 1}`}
                    onChange={(event) =>
                      patch(row.key, {
                        place: { ...(row.place ?? {}), address: event.target.value || null },
                      })
                    }
                  />
                ) : null}
                {(row.type === "place" || row.type === "link") && (
                  <Input
                    value={row.price_text ?? ""}
                    maxLength={40}
                    placeholder="Giá (VD: 250k/người)"
                    aria-label={`Giá ${index + 1}`}
                    onChange={(event) => patch(row.key, { price_text: event.target.value || null })}
                  />
                )}
              </div>
              <button
                type="button"
                className={cn("grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted")}
                aria-label={`Xoá ${row.title || `lựa chọn ${index + 1}`}`}
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
