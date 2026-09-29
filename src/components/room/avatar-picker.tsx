"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AVATAR_EMOJIS } from "@/lib/emojis";
import { reportError } from "@/lib/errors";
import { compressAvatar } from "@/lib/images";
import { cn } from "@/lib/utils";

export function AvatarPicker({
  emoji,
  onEmoji,
  file,
  onFile,
}: {
  emoji: string;
  onEmoji: (emoji: string) => void;
  file: File | null;
  onFile: (file: File | null) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  async function onChange(list: FileList | null) {
    const next = list?.[0];
    if (!next) return;
    try {
      const blob = await compressAvatar(next);
      const packed = new File([blob], "avatar.webp", { type: "image/webp" });
      onFile(packed);
      onEmoji("");
      setPreview(URL.createObjectURL(blob));
    } catch (error) {
      toast.error(reportError(error));
    }
  }

  return (
    <div className="space-y-3">
      <label className="flex h-12 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-border bg-card font-semibold">
        {file ? "Đổi ảnh đại diện" : "Tải ảnh đại diện"}
        <input
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => onChange(event.target.files)}
        />
      </label>
      {preview ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="size-14 rounded-full object-cover" />
          <button
            type="button"
            className="text-sm font-semibold text-muted-foreground"
            onClick={() => {
              onFile(null);
              setPreview(null);
              onEmoji(AVATAR_EMOJIS[0]);
            }}
          >
            Bỏ ảnh, chọn emoji
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-6 gap-2">
          {AVATAR_EMOJIS.map((item) => (
            <button
              key={item}
              type="button"
              aria-label={`Chọn ${item}`}
              aria-pressed={emoji === item}
              onClick={() => onEmoji(item)}
              className={cn(
                "grid h-12 place-items-center rounded-2xl bg-card text-xl transition-transform duration-200",
                emoji === item && "ring-2 ring-primary",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
