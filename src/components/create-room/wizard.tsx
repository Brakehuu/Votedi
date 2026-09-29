"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AvatarPicker } from "@/components/room/avatar-picker";
import { SharePanel } from "@/components/share-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AVATAR_EMOJIS } from "@/lib/emojis";
import { reportError } from "@/lib/errors";
import { ensureUser, uploadPublicImage } from "@/lib/storage";
import type { RoomMode, SeedingMode, TieRule } from "@/lib/types";
import { cn } from "@/lib/utils";

const QUALIFY_PRESETS = [
  { label: "15 phút", value: 15 },
  { label: "1 giờ", value: 60 },
  { label: "1 ngày", value: 1440 },
];

const MATCH_PRESETS = [
  { label: "5 phút", value: 5 },
  { label: "15 phút", value: 15 },
  { label: "30 phút", value: 30 },
  { label: "1 giờ", value: 60 },
];

export function CreateRoomWizard({ initialMode }: { initialMode: RoomMode | null }) {
  const [step, setStep] = useState(initialMode ? 1 : 0);
  const [mode, setMode] = useState<RoomMode>(initialMode ?? "qualify_knockout");
  const [name, setName] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [votes, setVotes] = useState(3);
  const [qualifyMinutes, setQualifyMinutes] = useState(60);
  const [customQualify, setCustomQualify] = useState("");
  const [size, setSize] = useState<2 | 4 | 8 | 16>(8);
  const [matchMinutes, setMatchMinutes] = useState(30);
  const [customMatch, setCustomMatch] = useState("");
  const [tieRule, setTieRule] = useState<TieRule>("random");
  const [seedingMode, setSeedingMode] = useState<SeedingMode>("random");
  const [allowUpload, setAllowUpload] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [emoji, setEmoji] = useState<string>(AVATAR_EMOJIS[0]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);

  const qualifyValue = customQualify ? Number(customQualify) : qualifyMinutes;
  const matchValue = customMatch ? Number(customMatch) : matchMinutes;
  const steps = useMemo(() => ["Chế độ", "Phòng", "Luật", "Bạn"], []);

  function next() {
    if (step === 1 && name.trim().length < 1) {
      toast.error("Nhập tên phòng.");
      return;
    }
    if (step === 1 && usePassword && password.length < 4) {
      toast.error("Mật khẩu phòng ít nhất 4 ký tự.");
      return;
    }
    if (step === 2 && (!Number.isFinite(qualifyValue) || qualifyValue < 1 || matchValue < 1)) {
      toast.error("Thời lượng phải là số phút lớn hơn 0.");
      return;
    }
    if (step === 3 && displayName.trim().length < 1) {
      toast.error("Nhập tên của bạn.");
      return;
    }
    setStep((value) => Math.min(3, value + 1));
  }

  async function createRoom() {
    if (displayName.trim().length < 1) {
      toast.error("Nhập tên của bạn.");
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
      const { data, error } = await supabase.rpc("create_room", {
        p_name: name.trim(),
        p_password: usePassword ? password : null,
        p_mode: mode,
        p_votes_per_member: votes,
        p_qualify_duration_minutes: mode === "qualify_knockout" ? qualifyValue : 60,
        p_knockout_size: size,
        p_match_duration_minutes: matchValue,
        p_tie_rule: tieRule,
        p_allow_member_upload: allowUpload,
        p_display_name: displayName.trim(),
        p_avatar_url: avatarUrl,
        p_avatar_emoji: file ? null : emoji,
        p_seeding_mode: seedingMode,
      });
      if (error) throw error;
      setSlug(data as string);
    } catch (error) {
      toast.error(reportError(error));
    } finally {
      setBusy(false);
    }
  }

  if (slug) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-8">
        <div className="rise space-y-2">
          <p className="text-sm font-semibold text-primary">Phòng đã sẵn sàng</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Gửi link cho cả nhóm</h1>
        </div>
        <Card className="mt-6 p-5">
          <SharePanel slug={slug} roomName={name.trim()} password={usePassword ? password : undefined} />
          <Button className="mt-4 w-full" render={<Link href={`/p/${slug}`} />}>
            Vào phòng
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8 pb-28">
      <div className="mb-6 flex gap-2">
        {steps.map((label, index) => (
          <div key={label} className="flex-1">
            <div
              className="mb-1 h-1.5 rounded-full"
              style={{ background: index <= step ? "var(--grad)" : "var(--border)" }}
            />
            <p className={cn("text-xs", index === step ? "font-bold" : "text-muted-foreground")}>{label}</p>
          </div>
        ))}
      </div>

      {step === 0 ? (
        <section className="space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight">Chọn cách đấu</h1>
          <ModeButton
            active={mode === "qualify_knockout"}
            title="Vòng loại → Knockout"
            body="Mọi người vote trước, top mẫu vào nhánh đấu."
            onClick={() => setMode("qualify_knockout")}
          />
          <ModeButton
            active={mode === "knockout"}
            title="Knockout trực tiếp"
            body="Đúng 4, 8 hoặc 16 mẫu vào sơ đồ luôn."
            onClick={() => setMode("knockout")}
          />
        </section>
      ) : null}

      {step === 1 ? (
        <section className="space-y-4">
          <h1 className="text-3xl font-extrabold tracking-tight">Đặt tên phòng</h1>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Tên phòng</span>
            <Input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="Áo team đi Đà Lạt" />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-2xl bg-card p-4">
            <span>
              <span className="block font-semibold">Đặt mật khẩu phòng</span>
              <span className="text-sm text-muted-foreground">
                {usePassword ? "Người mới phải nhập mật khẩu để vào." : "Tắt thì ai có link cũng vào được."}
              </span>
            </span>
            <Switch checked={usePassword} onCheckedChange={setUsePassword} aria-label="Đặt mật khẩu phòng" />
          </label>
          {usePassword ? (
            <label className="block space-y-2">
              <span className="text-sm font-semibold">Mật khẩu</span>
              <Input
                type="password"
                autoComplete="new-password"
                value={password}
                maxLength={72}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Ít nhất 4 ký tự"
              />
            </label>
          ) : null}
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-5">
          <h1 className="text-3xl font-extrabold tracking-tight">Luật chơi</h1>
          {mode === "qualify_knockout" ? (
            <label className="block space-y-2">
              <span className="text-sm font-semibold">Số phiếu mỗi người</span>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="icon" onClick={() => setVotes((value) => Math.max(1, value - 1))} aria-label="Giảm phiếu">
                  −
                </Button>
                <span className="w-8 text-center text-xl font-extrabold">{votes}</span>
                <Button type="button" variant="outline" size="icon" onClick={() => setVotes((value) => Math.min(10, value + 1))} aria-label="Tăng phiếu">
                  +
                </Button>
              </div>
            </label>
          ) : null}
          {mode === "qualify_knockout" ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">Thời gian vòng loại</legend>
              <div className="grid grid-cols-2 gap-2">
                {QUALIFY_PRESETS.map((preset) => (
                  <Choice
                    key={preset.value}
                    active={!customQualify && qualifyMinutes === preset.value}
                    onClick={() => {
                      setCustomQualify("");
                      setQualifyMinutes(preset.value);
                    }}
                  >
                    {preset.label}
                  </Choice>
                ))}
                <Input
                  inputMode="numeric"
                  placeholder="Phút tùy chỉnh"
                  value={customQualify}
                  onChange={(event) => setCustomQualify(event.target.value.replace(/[^\d]/g, ""))}
                />
              </div>
            </fieldset>
          ) : null}
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">
              {mode === "qualify_knockout" ? "Top mẫu vào knockout" : "Gợi ý cỡ nhánh (thực tế theo số mẫu tải lên)"}
            </legend>
            <div className="grid grid-cols-4 gap-2">
              {([2, 4, 8, 16] as const).map((value) => (
                <Choice key={value} active={size === value} onClick={() => setSize(value)}>
                  {value}
                </Choice>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Thời gian mỗi trận</legend>
            <div className="grid grid-cols-2 gap-2">
              {MATCH_PRESETS.map((preset) => (
                <Choice
                  key={preset.value}
                  active={!customMatch && matchMinutes === preset.value}
                  onClick={() => {
                    setCustomMatch("");
                    setMatchMinutes(preset.value);
                  }}
                >
                  {preset.label}
                </Choice>
              ))}
              <Input
                inputMode="numeric"
                placeholder="Phút tùy chỉnh"
                value={customMatch}
                onChange={(event) => setCustomMatch(event.target.value.replace(/[^\d]/g, ""))}
              />
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Luật hòa</legend>
            <div className="grid gap-2">
              <Choice active={tieRule === "random"} onClick={() => setTieRule("random")}>
                Ngẫu nhiên
              </Choice>
              <Choice active={tieRule === "host"} onClick={() => setTieRule("host")}>
                Host ưu tiên
              </Choice>
            </div>
          </fieldset>
          <label className="flex items-center justify-between gap-3 rounded-2xl bg-card p-4">
            <span>
              <span className="block font-semibold">Chủ phòng tự xếp nhánh</span>
              <span className="text-sm text-muted-foreground">
                {mode === "qualify_knockout"
                  ? "Sau vòng loại, host chỉnh chỗ trước khi bắt đầu đấu."
                  : "Tắt thì xếp ngẫu nhiên mỗi lần thêm/xóa mẫu."}
              </span>
            </span>
            <Switch
              checked={seedingMode === "manual"}
              onCheckedChange={(checked) => setSeedingMode(checked ? "manual" : "random")}
              aria-label="Chủ phòng tự xếp nhánh"
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-2xl bg-card p-4">
            <span>
              <span className="block font-semibold">Thành viên được tải mẫu</span>
              <span className="text-sm text-muted-foreground">Tắt thì chỉ chủ phòng tải ảnh.</span>
            </span>
            <Switch checked={allowUpload} onCheckedChange={setAllowUpload} aria-label="Cho thành viên tải mẫu" />
          </label>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-4">
          <h1 className="text-3xl font-extrabold tracking-tight">Bạn là host</h1>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Tên hiển thị</span>
            <Input value={displayName} maxLength={40} onChange={(event) => setDisplayName(event.target.value)} />
          </label>
          <AvatarPicker emoji={emoji} onEmoji={setEmoji} file={file} onFile={setFile} />
        </section>
      ) : null}

      <div className="glass fixed inset-x-3 bottom-3 z-30 rounded-full p-2">
        <div className="mx-auto flex max-w-lg gap-2">
          {step > 0 ? (
            <Button type="button" variant="outline" className="flex-1" onClick={() => setStep((value) => value - 1)}>
              Quay lại
            </Button>
          ) : null}
          {step < 3 ? (
            <Button type="button" className="flex-1" onClick={next}>
              Tiếp tục
            </Button>
          ) : (
            <Button type="button" className="flex-1" disabled={busy} onClick={() => void createRoom()}>
              {busy ? "Đang tạo..." : "Tạo phòng"}
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}

function ModeButton({
  active,
  title,
  body,
  onClick,
}: {
  active: boolean;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "glass w-full rounded-[22px] p-5 text-left",
        active && "win-glow border-2",
      )}
    >
      <span className="block text-lg font-extrabold">{title}</span>
      <span className="mt-1 block text-sm text-muted-foreground">{body}</span>
    </button>
  );
}

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-12 rounded-full border px-3 text-sm font-semibold",
        active ? "border-primary bg-primary-soft" : "glass",
      )}
    >
      {children}
    </button>
  );
}
