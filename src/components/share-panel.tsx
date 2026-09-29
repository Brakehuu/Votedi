"use client";

import { useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SharePanel({
  slug,
  roomName,
  password,
  passwordNote,
}: {
  slug: string;
  roomName: string;
  password?: string;
  passwordNote?: string;
}) {
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
  const url = origin ? `${origin}/p/${slug}` : "";

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`Đã copy ${label}`);
    } catch {
      toast.error("Không copy được. Hãy chọn và copy thủ công.");
    }
  }

  async function share() {
    if (!url) return;
    const text = `Vào phòng "${roomName}" trên Vote Đi${password ? `. Mật khẩu: ${password}` : ""}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: roomName, text, url });
        return;
      } catch {
        return;
      }
    }
    toast.message("Máy này không có bảng chia sẻ. Copy link nhé.");
  }

  const zalo = url
    ? `https://button-share.zalo.me/share_external?layout=1&url=${encodeURIComponent(url)}&title=${encodeURIComponent(roomName)}`
    : "#";
  const facebook = url
    ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    : "#";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-muted p-4 break-all text-sm font-medium">{url || "Đang tạo link..."}</div>
      {password ? (
        <p className="text-sm">
          Mật khẩu: <span className="font-bold">{password}</span>
        </p>
      ) : null}
      {passwordNote ? <p className="text-sm text-muted-foreground">{passwordNote}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={() => url && copy(url, "link")}>
          <Copy />
          Copy link
        </Button>
        <Button type="button" onClick={share}>
          <Share2 />
          Chia sẻ
        </Button>
        <a
          className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#0068FF] px-4 font-semibold text-white"
          href={zalo}
          target="_blank"
          rel="noreferrer"
        >
          Zalo
        </a>
        <a
          className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#1877F2] px-4 font-semibold text-white"
          href={facebook}
          target="_blank"
          rel="noreferrer"
        >
          Messenger
        </a>
      </div>
      {password ? (
        <Button type="button" variant="secondary" className="w-full" onClick={() => copy(password, "mật khẩu")}>
          Copy mật khẩu
        </Button>
      ) : null}
      <div className="glass flex justify-center rounded-[22px] bg-white p-4">
        {url ? <QRCodeSVG value={url} size={180} /> : null}
      </div>
    </div>
  );
}
