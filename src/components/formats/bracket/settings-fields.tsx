"use client";

import { AdvancedGroup, Choice, SettingsGroup, Stepper, ToggleRow } from "@/components/create-room/fields";
import { Input } from "@/components/ui/input";
import type { RoomMode, SeedingMode, TieRule } from "@/lib/types";
import { cn } from "@/lib/utils";

export type BracketSettingsValue = {
  mode: RoomMode;
  votes: number;
  qualifyMinutes: number;
  customQualify: string;
  size: 2 | 4 | 8 | 16;
  matchMinutes: number;
  customMatch: string;
  tieRule: TieRule;
  seedingMode: SeedingMode;
  allowUpload: boolean;
};

export const DEFAULT_BRACKET_SETTINGS: BracketSettingsValue = {
  mode: "qualify_knockout",
  votes: 3,
  qualifyMinutes: 60,
  customQualify: "",
  size: 8,
  matchMinutes: 30,
  customMatch: "",
  tieRule: "random",
  seedingMode: "random",
  allowUpload: false,
};

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

function minutes(custom: string, preset: number) {
  return custom ? Number(custom) : preset;
}

export function bracketSettingsError(value: BracketSettingsValue) {
  const qualify = minutes(value.customQualify, value.qualifyMinutes);
  const match = minutes(value.customMatch, value.matchMinutes);
  if (!Number.isFinite(qualify) || qualify < 1 || qualify > 10080 || !Number.isFinite(match) || match < 1 || match > 1440) {
    return "Thời lượng phải là số phút lớn hơn 0 (vòng loại tối đa 7 ngày, mỗi trận tối đa 1 ngày).";
  }
  return null;
}

/** Payload for create_room_v2 (p_settings) — forwarded to the legacy create_room. */
export function bracketSettingsPayload(value: BracketSettingsValue) {
  return {
    mode: value.mode,
    votes_per_member: value.votes,
    qualify_duration_minutes: value.mode === "qualify_knockout" ? minutes(value.customQualify, value.qualifyMinutes) : 60,
    knockout_size: value.size,
    match_duration_minutes: minutes(value.customMatch, value.matchMinutes),
    tie_rule: value.tieRule,
    allow_member_upload: value.allowUpload,
    seeding_mode: value.seedingMode,
  };
}

export function BracketSettingsFields({
  value,
  onChange,
}: {
  value: BracketSettingsValue;
  onChange: (next: BracketSettingsValue) => void;
}) {
  const set = <K extends keyof BracketSettingsValue>(key: K, next: BracketSettingsValue[K]) =>
    onChange({ ...value, [key]: next });
  const qualify = value.mode === "qualify_knockout";

  return (
    <div className="space-y-7">
      <SettingsGroup title="Cách đấu">
        <div className="grid gap-2">
          <ModeCard
            active={qualify}
            title="Vòng loại → Knockout"
            body="Mọi người vote trước, top mẫu vào nhánh đấu."
            onClick={() => set("mode", "qualify_knockout")}
          />
          <ModeCard
            active={!qualify}
            title="Knockout trực tiếp"
            body="Từ 2 đến 16 mẫu vào sơ đồ luôn."
            onClick={() => set("mode", "knockout")}
          />
        </div>
      </SettingsGroup>

      <SettingsGroup title="Cơ bản">
        {qualify ? (
          <div className="space-y-2">
            <span className="text-sm font-semibold">Số phiếu mỗi người</span>
            <Stepper value={value.votes} min={1} max={10} label="phiếu" onChange={(next) => set("votes", next)} />
          </div>
        ) : null}
        {qualify ? (
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Thời gian vòng loại</legend>
            <div className="grid grid-cols-2 gap-2">
              {QUALIFY_PRESETS.map((preset) => (
                <Choice
                  key={preset.value}
                  active={!value.customQualify && value.qualifyMinutes === preset.value}
                  onClick={() => onChange({ ...value, customQualify: "", qualifyMinutes: preset.value })}
                >
                  {preset.label}
                </Choice>
              ))}
              <Input
                inputMode="numeric"
                placeholder="Phút tùy chỉnh"
                aria-label="Số phút vòng loại tùy chỉnh"
                value={value.customQualify}
                onChange={(event) => set("customQualify", event.target.value.replace(/[^\d]/g, ""))}
              />
            </div>
          </fieldset>
        ) : null}
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">
            {qualify ? "Top mẫu vào knockout" : "Gợi ý cỡ nhánh (thực tế theo số mẫu tải lên)"}
          </legend>
          <div className="grid grid-cols-4 gap-2">
            {([2, 4, 8, 16] as const).map((size) => (
              <Choice key={size} active={value.size === size} onClick={() => set("size", size)}>
                {size}
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
                active={!value.customMatch && value.matchMinutes === preset.value}
                onClick={() => onChange({ ...value, customMatch: "", matchMinutes: preset.value })}
              >
                {preset.label}
              </Choice>
            ))}
            <Input
              inputMode="numeric"
              placeholder="Phút tùy chỉnh"
              aria-label="Số phút mỗi trận tùy chỉnh"
              value={value.customMatch}
              onChange={(event) => set("customMatch", event.target.value.replace(/[^\d]/g, ""))}
            />
          </div>
        </fieldset>
        <ToggleRow
          title="Thành viên được tải mẫu"
          body="Tắt thì chỉ chủ phòng tải ảnh."
          checked={value.allowUpload}
          onChange={(checked) => set("allowUpload", checked)}
        />
      </SettingsGroup>

      <AdvancedGroup>
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Luật hòa</legend>
          <div className="grid gap-2">
            <Choice active={value.tieRule === "random"} onClick={() => set("tieRule", "random")}>
              Ngẫu nhiên
            </Choice>
            <Choice active={value.tieRule === "host"} onClick={() => set("tieRule", "host")}>
              Host ưu tiên
            </Choice>
          </div>
        </fieldset>
        <ToggleRow
          title="Chủ phòng tự xếp nhánh"
          body={
            qualify
              ? "Sau vòng loại, host chỉnh chỗ trước khi bắt đầu đấu."
              : "Tắt thì xếp ngẫu nhiên mỗi lần thêm/xóa mẫu."
          }
          checked={value.seedingMode === "manual"}
          onChange={(checked) => set("seedingMode", checked ? "manual" : "random")}
        />
      </AdvancedGroup>
    </div>
  );
}

function ModeCard({
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
      className={cn("glass w-full rounded-[22px] p-4 text-left", active && "win-glow border-2")}
    >
      <span className="block font-extrabold">{title}</span>
      <span className="mt-1 block text-sm text-muted-foreground">{body}</span>
    </button>
  );
}
