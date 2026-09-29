"use client";

import { useRef, useState } from "react";
import { ImagePlus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { OptionMedia } from "@/components/options/option-card";
import { Input } from "@/components/ui/input";
import { MAX_ITEM_BYTES } from "@/lib/images";

export type OptionDraft = {
  key: string;
  type: "text" | "image";
  title: string;
  emoji: string | null;
  file?: File;
  preview?: string;
};

const LEADING_EMOJI = new RegExp(
  "^(\\p{Extended_Pictographic}(?:\\uFE0F|\\u200D\\p{Extended_Pictographic}|\\p{Emoji_Modifier})*)\\s*",
  "u",
);

/** "🍜 Phở" → emoji "🍜", title "Phở". */
export function textDraft(line: string): OptionDraft | null {
  const raw = line.trim().slice(0, 100);
  if (!raw) return null;
  const match = raw.match(LEADING_EMOJI);
  const emoji = match?.[1] ?? null;
  const title = (match ? raw.slice(match[0].length) : raw).trim().slice(0, 80) || raw.slice(0, 80);
  return { key: crypto.randomUUID(), type: "text", title, emoji };
}

function fileTitle(name: string) {
  return name.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").trim().slice(0, 80);
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

  function addLines(text: string) {
    const lines = text
      .split(/\r?\n/)
      .map(textDraft)
      .filter((row): row is OptionDraft => Boolean(row));
    if (lines.length === 0) return false;
    return append(lines);
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

  function rename(key: string, title: string) {
    onChange(value.map((entry) => (entry.key === key ? { ...entry, title } : entry)));
  }

  function commitDraft() {
    if (addLines(draft)) setDraft("");
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={draft}
          maxLength={100}
          placeholder="VD: 🍲 Lẩu Thái"
          aria-label="Thêm lựa chọn"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitDraft();
            }
          }}
          onPaste={(event) => {
            const text = event.clipboardData.getData("text");
            if (text.includes("\n")) {
              event.preventDefault();
              addLines(text);
            }
          }}
        />
        <button
          type="button"
          className="btn btn-primary min-h-11 shrink-0 px-4"
          aria-label="Thêm lựa chọn"
          onClick={commitDraft}
        >
          <Plus aria-hidden size={18} />
        </button>
      </div>
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
        Gõ rồi Enter, hoặc dán nhiều dòng để thêm nhiều lựa chọn một lúc. Emoji đầu dòng sẽ làm hình minh hoạ.
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
                    description: null,
                    emoji: row.emoji,
                    price_text: null,
                  }}
                />
              </span>
              <Input
                value={row.title}
                maxLength={80}
                aria-label={`Tên lựa chọn ${index + 1}`}
                placeholder={row.type === "image" ? `Lựa chọn ${index + 1}` : "Tên lựa chọn"}
                onChange={(event) => rename(row.key, event.target.value)}
              />
              <button
                type="button"
                className="grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-muted"
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
