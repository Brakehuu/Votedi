"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AvatarPicker } from "@/components/room/avatar-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AVATAR_EMOJIS } from "@/lib/emojis";
import { reportError } from "@/lib/errors";
import { ensureUser, uploadPublicImage } from "@/lib/storage";
import type { RoomPreview } from "@/lib/types";

export function JoinForm({ preview }: { preview: RoomPreview }) {
  const router = useRouter();
  const needsPassword = preview.has_password !== false;
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState<string>(AVATAR_EMOJIS[0]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim().length < 1) {
      toast.error("Nhập tên hiển thị.");
      return;
    }
    if (needsPassword && password.length < 1) {
      toast.error("Nhập mật khẩu phòng.");
      return;
    }
    setBusy(true);
    try {
      const { supabase, user } = await ensureUser();
      let avatarUrl: string | null = null;
      if (file) {
        avatarUrl = await uploadPublicImage(
          `avatars/${user.id}/${crypto.randomUUID()}.webp`,
          file,
          "image/webp",
        );
      }
      const { error } = await supabase.rpc("join_room", {
        p_slug: preview.slug,
        p_password: needsPassword ? password : null,
        p_display_name: name.trim(),
        p_avatar_url: avatarUrl,
        p_avatar_emoji: file ? null : emoji,
      });
      if (error) throw error;
      const { track } = await import("@/lib/analytics");
      track("join_room", { via: "form" });
      router.refresh();
    } catch (error) {
      toast.error(reportError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8 pb-28">
      <div className="mb-6 space-y-2">
        <p className="text-sm font-semibold text-primary">Vào phòng</p>
        <h1 className="text-3xl font-extrabold tracking-tight">{preview.name}</h1>
        <p className="text-muted-foreground">
          {needsPassword
            ? "Nhập mật khẩu, chọn tên và avatar để bắt đầu vote."
            : "Chọn tên và avatar để bắt đầu vote."}
        </p>
      </div>
      <Card>
        <form className="space-y-4 p-5" onSubmit={onSubmit}>
          {needsPassword ? (
            <label className="block space-y-2">
              <span className="text-sm font-semibold">Mật khẩu phòng</span>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
          ) : null}
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Tên hiển thị</span>
            <Input value={name} maxLength={40} onChange={(event) => setName(event.target.value)} required />
          </label>
          <div className="space-y-2">
            <span className="text-sm font-semibold">Avatar</span>
            <AvatarPicker emoji={emoji} onEmoji={setEmoji} file={file} onFile={setFile} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Đang vào..." : "Vào phòng"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
