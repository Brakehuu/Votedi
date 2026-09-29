"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { SettingsGroup, ToggleRow } from "@/components/create-room/fields";
import {
  BracketSettingsFields,
  DEFAULT_BRACKET_SETTINGS,
  bracketSettingsError,
  bracketSettingsPayload,
  type BracketSettingsValue,
} from "@/components/formats/bracket/settings-fields";
import { OptionEditor, type OptionDraft } from "@/components/formats/quick/option-editor";
import {
  DEFAULT_QUICK_SETTINGS,
  QuickSettingsFields,
  quickDeadlineIso,
  quickSettingsError,
  type QuickSettingsValue,
} from "@/components/formats/quick/settings-fields";
import { AvatarPicker } from "@/components/room/avatar-picker";
import { SharePanel } from "@/components/share-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AVATAR_EMOJIS } from "@/lib/emojis";
import { reportError } from "@/lib/errors";
import { FORMATS, FORMAT_LIST } from "@/lib/formats";
import { prepareItemImage } from "@/lib/images";
import { ensureUser, uploadPublicImage } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import type { FormatId, RoomMode } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEPS = ["Chốt gì", "Nội dung", "Cài đặt", "Bạn", "Chia sẻ"];
const WIZARD_FORMATS = FORMAT_LIST.filter((format) => format.available);
const IDENTITY_KEY = "votedi:identity";

const NAME_PLACEHOLDER: Partial<Record<FormatId, string>> = {
  quick: "Cuối tuần đi đâu chơi?",
  bracket: "Áo team đi Đà Lạt",
};

type CreatedRoom = { id: string | null; slug: string };

function readIdentity(): { name?: string; emoji?: string } {
  try {
    return JSON.parse(window.localStorage.getItem(IDENTITY_KEY) ?? "{}") as { name?: string; emoji?: string };
  } catch {
    return {};
  }
}

function saveIdentity(name: string, emoji: string | null) {
  try {
    window.localStorage.setItem(IDENTITY_KEY, JSON.stringify({ name, emoji: emoji || undefined }));
  } catch {
    /* private mode */
  }
}

function missingRpc(error: unknown) {
  const err = error as { code?: string; message?: string } | null;
  return err?.code === "PGRST202" || /Could not find the function/i.test(err?.message ?? "");
}

export function CreateRoomWizard({
  initialFormat,
  initialMode,
}: {
  initialFormat: FormatId | null;
  initialMode: RoomMode | null;
}) {
  const [step, setStep] = useState(initialFormat ? 1 : 0);
  const [format, setFormat] = useState<FormatId | null>(initialFormat);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<OptionDraft[]>([]);
  const [bracket, setBracket] = useState<BracketSettingsValue>({
    ...DEFAULT_BRACKET_SETTINGS,
    mode: initialMode ?? DEFAULT_BRACKET_SETTINGS.mode,
  });
  const [quick, setQuick] = useState<QuickSettingsValue>(DEFAULT_QUICK_SETTINGS);
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [emoji, setEmoji] = useState<string>(AVATAR_EMOJIS[0]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedRoom | null>(null);
  const [optionsSaved, setOptionsSaved] = useState(false);

  const def = format ? FORMATS[format] : null;

  function pickFormat(id: FormatId) {
    setFormat(id);
    setStep(1);
  }

  function stepError(): string | null {
    if (!def) return "Chọn kiểu vote.";
    if (step === 1) {
      if (name.trim().length < 1) return "Nhập tên phòng.";
      if (def.id === "quick") {
        if (options.length < def.minOptions) return `Cần ít nhất ${def.minOptions} lựa chọn.`;
        if (options.some((row) => !row.title.trim())) return "Có lựa chọn chưa có tên.";
        if (options.some((row) => row.type === "link" && !row.link?.url)) return "Có link chưa hợp lệ.";
      }
    }
    if (step === 2) {
      if (usePassword && (password.length < 4 || password.length > 72)) return "Mật khẩu phòng từ 4 đến 72 ký tự.";
      if (def.id === "bracket") return bracketSettingsError(bracket);
      if (def.id === "quick") return quickSettingsError(quick, options.length, Date.now());
    }
    if (step === 3 && displayName.trim().length < 1) return "Nhập tên của bạn.";
    return null;
  }

  function next() {
    const error = stepError();
    if (error) {
      toast.error(error);
      return;
    }
    if (step === 2 && !displayName) {
      const saved = readIdentity();
      if (saved.name) setDisplayName(saved.name.slice(0, 40));
      if (saved.emoji && !file) setEmoji(saved.emoji);
    }
    if (step === 3) {
      void createRoom();
      return;
    }
    setStep((value) => Math.min(3, value + 1));
  }

  async function saveOptions(roomId: string) {
    const supabase = createClient();
    const uploaded: string[] = [];
    const images = options.filter((row) => row.type === "image" || row.imageBlob).length;
    let done = 0;
    try {
      const payload = [];
      for (const row of options) {
        if (row.type === "image" && row.file) {
          done += 1;
          setProgress(`Đang tải ảnh ${done}/${images}...`);
          const prepared = await prepareItemImage(row.file);
          const path = `${roomId}/${crypto.randomUUID()}.webp`;
          const url = await uploadPublicImage(path, prepared.blob, prepared.contentType);
          uploaded.push(path);
          payload.push({
            item_type: "image",
            title: row.title.trim(),
            image_url: url,
            is_transparent: prepared.transparent,
          });
        } else if (row.type === "place") {
          payload.push({
            item_type: "place",
            title: row.title.trim(),
            description: row.description ?? null,
            price_text: row.price_text ?? null,
            place: {
              name: row.place?.name ?? row.title.trim(),
              address: row.place?.address ?? null,
              lat: row.place?.lat ?? null,
              lng: row.place?.lng ?? null,
              maps_url: row.place?.maps_url ?? null,
            },
          });
        } else if (row.type === "link" && row.link) {
          let imageUrl: string | null = null;
          if (row.imageBlob) {
            done += 1;
            setProgress(`Đang tải ảnh ${done}/${images}...`);
            const ext = row.imageContentType?.includes("png")
              ? "png"
              : row.imageContentType?.includes("webp")
                ? "webp"
                : "jpg";
            const path = `${roomId}/${crypto.randomUUID()}.${ext}`;
            imageUrl = await uploadPublicImage(path, row.imageBlob, row.imageContentType ?? "image/jpeg");
            uploaded.push(path);
          }
          payload.push({
            item_type: "link",
            title: row.title.trim(),
            description: row.description ?? null,
            price_text: row.price_text ?? null,
            link: {
              url: row.link.url,
              title: row.title.trim(),
              site_name: row.link.site_name ?? null,
              image_url: imageUrl,
            },
          });
        } else {
          payload.push({ item_type: "text", title: row.title.trim(), emoji: row.emoji });
        }
      }
      setProgress("Đang lưu lựa chọn...");
      const { error } = await supabase.rpc("add_options", { p_room_id: roomId, p_options: payload });
      if (error) throw error;
    } catch (error) {
      if (uploaded.length) await supabase.storage.from("items").remove(uploaded);
      throw error;
    } finally {
      setProgress(null);
    }
  }

  async function createRoom() {
    if (!def) return;
    setBusy(true);
    try {
      const { supabase, user } = await ensureUser();
      let room = created;
      if (!room) {
        let avatarUrl: string | null = null;
        if (file) {
          avatarUrl = await uploadPublicImage(`avatars/${user.id}/${crypto.randomUUID()}.webp`, file, "image/webp");
        }
        const identity = {
          p_display_name: displayName.trim(),
          p_avatar_url: avatarUrl,
          p_avatar_emoji: file ? null : emoji,
        };
        const { data, error } = await supabase.rpc("create_room_v2", {
          p_format: def.id,
          p_name: name.trim(),
          p_description: description.trim() || null,
          p_password: usePassword ? password : null,
          p_settings:
            def.id === "bracket"
              ? bracketSettingsPayload(bracket)
              : {
                  max_choices: quick.maxChoices,
                  tie_rule: quick.tieRule,
                  allow_member_options: quick.allowMemberOptions,
                },
          p_deadline: def.id === "quick" ? quickDeadlineIso(quick, Date.now()) : null,
          ...identity,
        });
        if (error && def.id === "bracket" && missingRpc(error)) {
          const payload = bracketSettingsPayload(bracket);
          const legacy = await supabase.rpc("create_room", {
            p_name: name.trim(),
            p_password: usePassword ? password : null,
            p_mode: payload.mode,
            p_votes_per_member: payload.votes_per_member,
            p_qualify_duration_minutes: payload.qualify_duration_minutes,
            p_knockout_size: payload.knockout_size,
            p_match_duration_minutes: payload.match_duration_minutes,
            p_tie_rule: payload.tie_rule,
            p_allow_member_upload: payload.allow_member_upload,
            p_seeding_mode: payload.seeding_mode,
            ...identity,
          });
          if (legacy.error) throw legacy.error;
          room = { id: null, slug: legacy.data as string };
        } else {
          if (error) throw error;
          room = data as CreatedRoom;
        }
        setCreated(room);
        saveIdentity(displayName.trim(), file ? null : emoji);
        if (def.id === "quick" && room.id && !quick.allowMemberOptions) {
          await supabase.rpc("host_set_member_options", {
            p_room_id: room.id,
            p_allow: false,
          });
        }
      }
      if (def.id !== "bracket" && !optionsSaved && room.id) {
        await saveOptions(room.id);
        setOptionsSaved(true);
      }
      setStep(4);
    } catch (error) {
      toast.error(reportError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8 pb-28">
      <div className="mb-6 flex gap-2">
        {STEPS.map((label, index) => (
          <div key={label} className="min-w-0 flex-1">
            <div
              className="mb-1 h-1.5 rounded-full"
              style={{ background: index <= step ? "var(--grad)" : "var(--border)" }}
            />
            <p className={cn("truncate text-xs", index === step ? "font-bold" : "text-muted-foreground")}>{label}</p>
          </div>
        ))}
      </div>

      {step === 0 ? (
        <section className="space-y-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Bạn muốn chốt gì?</h1>
            <p className="mt-1 text-muted-foreground">Chọn kiểu vote hợp với câu hỏi của nhóm.</p>
          </div>
          <div className="fmt-grid">
            {WIZARD_FORMATS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn("fmt-card glass", format === item.id && "on")}
                aria-pressed={format === item.id}
                onClick={() => pickFormat(item.id)}
              >
                <span className="fmt-ic">
                  <item.icon aria-hidden />
                </span>
                <span className="min-w-0">
                  <b>{item.name}</b>
                  <span className="d">{item.description}</span>
                  <span className="u">Dùng cho: {item.useFor}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {step === 1 && def ? (
        <section className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-primary">{def.name}</p>
            <h1 className="text-3xl font-extrabold tracking-tight">Nội dung</h1>
          </div>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Tên phòng</span>
            <Input
              value={name}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              placeholder={NAME_PLACEHOLDER[def.id] ?? "Tên phòng"}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">
              Mô tả <span className="font-normal text-muted-foreground">(tùy chọn)</span>
            </span>
            <textarea
              value={description}
              maxLength={300}
              rows={2}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="VD: Chốt trước thứ 6 nhé cả nhà"
              className="w-full resize-none rounded-2xl border border-input bg-card px-4 py-3 text-base text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
            />
          </label>
          {def.id === "quick" ? (
            <div className="space-y-2">
              <span className="text-sm font-semibold">Các lựa chọn</span>
              <OptionEditor value={options} max={def.maxOptions} onChange={setOptions} />
            </div>
          ) : (
            <p className="rounded-[22px] bg-primary-soft p-4 text-sm">
              Tạo phòng xong, bạn tải ảnh các mẫu ngay trong phòng.
            </p>
          )}
        </section>
      ) : null}

      {step === 2 && def ? (
        <section className="space-y-7">
          <h1 className="text-3xl font-extrabold tracking-tight">Cài đặt</h1>
          {def.id === "bracket" ? <BracketSettingsFields value={bracket} onChange={setBracket} /> : null}
          {def.id === "quick" ? (
            <QuickSettingsFields value={quick} optionCount={options.length} onChange={setQuick} />
          ) : null}
          <SettingsGroup title="Riêng tư">
            <ToggleRow
              title="Đặt mật khẩu phòng"
              body={usePassword ? "Người mới phải nhập mật khẩu để vào." : "Tắt thì ai có link cũng vào được."}
              checked={usePassword}
              onChange={setUsePassword}
            />
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
          </SettingsGroup>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-4">
          <h1 className="text-3xl font-extrabold tracking-tight">Bạn là ai?</h1>
          <p className="text-muted-foreground">Bạn là chủ phòng. Mọi người sẽ thấy tên và avatar này.</p>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Tên hiển thị</span>
            <Input value={displayName} maxLength={40} onChange={(event) => setDisplayName(event.target.value)} />
          </label>
          <AvatarPicker emoji={emoji} onEmoji={setEmoji} file={file} onFile={setFile} />
          {created && !optionsSaved && def?.id !== "bracket" ? (
            <p className="rounded-2xl bg-muted p-4 text-sm">
              Phòng đã tạo nhưng chưa lưu được lựa chọn. Bấm “Thử lại” để lưu tiếp.
            </p>
          ) : null}
        </section>
      ) : null}

      {step === 4 && created ? (
        <section>
          <div className="rise space-y-2">
            <p className="text-sm font-semibold text-primary">Phòng đã sẵn sàng</p>
            <h1 className="text-3xl font-extrabold tracking-tight">Gửi link cho cả nhóm</h1>
          </div>
          <Card className="mt-6 p-5">
            <SharePanel slug={created.slug} roomName={name.trim()} password={usePassword ? password : undefined} />
            <Button className="mt-4 w-full" render={<Link href={`/p/${created.slug}`} />}>
              Vào phòng
            </Button>
          </Card>
        </section>
      ) : null}

      {step >= 1 && step <= 3 ? (
        <div className="glass fixed inset-x-3 bottom-3 z-30 rounded-full p-2">
          <div className="mx-auto flex max-w-lg gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={busy || Boolean(created)}
              onClick={() => setStep((value) => value - 1)}
            >
              Quay lại
            </Button>
            <Button type="button" className="flex-1" disabled={busy} onClick={next}>
              {step < 3 ? "Tiếp tục" : busy ? (progress ?? "Đang tạo...") : created ? "Thử lại" : "Tạo phòng"}
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
