"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { reportError } from "@/lib/errors";
import { MAX_ITEM_BYTES, MAX_ITEMS_PER_ROOM, prepareItemImage } from "@/lib/images";
import { createClient } from "@/lib/supabase/client";
import { uploadPublicImage } from "@/lib/storage";
import { cn } from "@/lib/utils";

type Progress = { name: string; pct: number };

export function ItemUploader({
  roomId,
  currentCount,
  maxItems = MAX_ITEMS_PER_ROOM,
  onDone,
}: {
  roomId: string;
  currentCount: number;
  maxItems?: number;
  onDone: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(
    async (list: File[]) => {
      if (list.length === 0) return;
      if (currentCount + list.length > maxItems) {
        toast.error(
          maxItems <= 16
            ? `Knockout tối đa ${maxItems} mẫu.`
            : `Mỗi phòng tối đa ${maxItems} mẫu.`,
        );
        return;
      }
      setBusy(true);
      const supabase = createClient();
      const rows: Progress[] = list.map((file) => ({ name: file.name, pct: 0 }));
      setProgress(rows);
      try {
        for (let index = 0; index < list.length; index += 1) {
          const file = list[index]!;
          if (file.size > MAX_ITEM_BYTES) {
            toast.error(`${file.name}: ảnh lớn hơn 10MB.`);
            continue;
          }
          const prepared = await prepareItemImage(file, (text) => {
            setProgress((current) =>
              current.map((row, i) => (i === index ? { ...row, pct: text.includes("%") ? Number(text.match(/\d+/)?.[0] ?? 40) : 40 } : row)),
            );
          });
          setProgress((current) => current.map((row, i) => (i === index ? { ...row, pct: 70 } : row)));
          const path = `${roomId}/${crypto.randomUUID()}.webp`;
          const imageUrl = await uploadPublicImage(path, prepared.blob, prepared.contentType);
          const { error } = await supabase.rpc("add_item", {
            p_room_id: roomId,
            p_image_url: imageUrl,
            p_is_transparent: prepared.transparent,
          });
          if (error) {
            await supabase.storage.from("items").remove([path]);
            throw error;
          }
          setProgress((current) => current.map((row, i) => (i === index ? { ...row, pct: 100 } : row)));
        }
        toast.success(list.length > 1 ? `Đã tải ${list.length} mẫu` : "Đã tải mẫu");
        await onDone();
      } catch (error) {
        toast.error(reportError(error));
      } finally {
        setBusy(false);
        setProgress([]);
      }
    },
    [currentCount, maxItems, onDone, roomId],
  );

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = [...(event.clipboardData?.files ?? [])].filter((file) => file.type.startsWith("image/"));
      if (files.length) {
        event.preventDefault();
        void uploadFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [uploadFiles]);

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "glass rounded-[22px] border-2 border-dashed border-border p-5 text-center transition",
          dragging && "border-primary bg-primary-soft/50",
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void uploadFiles([...event.dataTransfer.files].filter((file) => file.type.startsWith("image/")));
        }}
      >
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
          multiple
          disabled={busy}
          onChange={(event) => {
            void uploadFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={busy}
          className="btn btn-primary mx-auto min-h-11"
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Đang xử lý..." : "Tải mẫu lên"}
        </button>
        <p className="mt-3 text-sm text-muted-foreground">
          Chọn nhiều ảnh, kéo thả, hoặc dán từ clipboard. JPG / PNG / WEBP, tối đa 10MB mỗi ảnh
          {maxItems <= 16 ? `, tối đa ${maxItems} mẫu (knockout).` : `, tối đa ${maxItems} mẫu.`}
        </p>
      </div>
      {progress.length > 0 ? (
        <ul className="space-y-2">
          {progress.map((row) => (
            <li key={row.name} className="text-sm">
              <div className="mb-1 flex justify-between gap-2">
                <span className="truncate">{row.name}</span>
                <span>{row.pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-border">
                <i className="block h-full rounded-full" style={{ width: `${row.pct}%`, background: "var(--grad)" }} />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
