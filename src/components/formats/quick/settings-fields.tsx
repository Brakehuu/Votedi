"use client";

import { AdvancedGroup, Choice, SettingsGroup, Stepper, ToggleRow } from "@/components/create-room/fields";
import { Input } from "@/components/ui/input";
import type { TieRule } from "@/lib/types";

export type DeadlinePreset = "none" | "1h" | "today" | "1d" | "3d" | "custom";

export type QuickSettingsValue = {
  maxChoices: number;
  deadline: DeadlinePreset;
  /** datetime-local value, used when deadline = "custom". */
  customDeadline: string;
  tieRule: TieRule;
  allowMemberOptions: boolean;
};

export const DEFAULT_QUICK_SETTINGS: QuickSettingsValue = {
  maxChoices: 1,
  deadline: "none",
  customDeadline: "",
  tieRule: "random",
  allowMemberOptions: true,
};

const DEADLINES: { value: DeadlinePreset; label: string }[] = [
  { value: "none", label: "Không giới hạn" },
  { value: "1h", label: "1 giờ" },
  { value: "today", label: "Hết hôm nay" },
  { value: "1d", label: "1 ngày" },
  { value: "3d", label: "3 ngày" },
  { value: "custom", label: "Tùy chỉnh" },
];

const HOUR = 3_600_000;
const VN_OFFSET = 7 * HOUR;

/** End of the current day in Asia/Ho_Chi_Minh (UTC+7, no DST). */
function endOfTodayVn(now: number) {
  const vn = new Date(now + VN_OFFSET);
  return Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate(), 23, 59, 0) - VN_OFFSET;
}

/** ISO deadline or null (no limit). Call from event handlers only. */
export function quickDeadlineIso(value: QuickSettingsValue, now: number): string | null {
  switch (value.deadline) {
    case "none":
      return null;
    case "1h":
      return new Date(now + HOUR).toISOString();
    case "today":
      return new Date(endOfTodayVn(now)).toISOString();
    case "1d":
      return new Date(now + 24 * HOUR).toISOString();
    case "3d":
      return new Date(now + 72 * HOUR).toISOString();
    case "custom": {
      const at = Date.parse(value.customDeadline);
      return Number.isNaN(at) ? null : new Date(at).toISOString();
    }
  }
}

export function quickSettingsError(value: QuickSettingsValue, optionCount: number, now: number) {
  if (value.maxChoices < 1 || value.maxChoices > Math.max(1, optionCount)) {
    return "Số lựa chọn mỗi người không được nhiều hơn số lựa chọn trong phòng.";
  }
  if (value.deadline === "custom") {
    const at = Date.parse(value.customDeadline);
    if (Number.isNaN(at)) return "Chọn thời điểm kết thúc.";
    if (at <= now + 60_000) return "Thời điểm kết thúc phải ở tương lai.";
    if (at > now + 30 * 24 * HOUR) return "Hạn vote tối đa 30 ngày.";
  }
  return null;
}

export function QuickSettingsFields({
  value,
  optionCount,
  onChange,
}: {
  value: QuickSettingsValue;
  optionCount: number;
  onChange: (next: QuickSettingsValue) => void;
}) {
  const set = <K extends keyof QuickSettingsValue>(key: K, next: QuickSettingsValue[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <div className="space-y-7">
      <SettingsGroup title="Cơ bản">
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Hạn vote</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DEADLINES.map((preset) => (
              <Choice key={preset.value} active={value.deadline === preset.value} onClick={() => set("deadline", preset.value)}>
                {preset.label}
              </Choice>
            ))}
          </div>
          {value.deadline === "custom" ? (
            <Input
              type="datetime-local"
              aria-label="Thời điểm kết thúc vote"
              value={value.customDeadline}
              onChange={(event) => set("customDeadline", event.target.value)}
            />
          ) : null}
          <p className="text-xs text-muted-foreground">
            {value.deadline === "none" ? "Vote tới khi chủ phòng chốt kết quả." : "Hết giờ phòng tự chốt kết quả."}
          </p>
        </fieldset>
        <div className="space-y-2">
          <span className="text-sm font-semibold">Mỗi người chọn tối đa</span>
          <Stepper
            value={value.maxChoices}
            min={1}
            max={Math.max(1, Math.min(optionCount, 30))}
            label="số lựa chọn"
            onChange={(next) => set("maxChoices", next)}
          />
          <p className="text-xs text-muted-foreground">
            {value.maxChoices === 1 ? "Mỗi người chọn 1, đổi ý thoải mái." : `Mỗi người chọn được tới ${value.maxChoices} lựa chọn.`}
          </p>
        </div>
        <ToggleRow
          title="Cho thành viên thêm lựa chọn"
          body="Mọi người trong phòng có thể dán thêm địa điểm / link / chữ."
          checked={value.allowMemberOptions}
          onChange={(next) => set("allowMemberOptions", next)}
        />
      </SettingsGroup>

      <AdvancedGroup>
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Khi hòa phiếu</legend>
          <div className="grid gap-2">
            <Choice active={value.tieRule === "random"} onClick={() => set("tieRule", "random")}>
              Bốc ngẫu nhiên
            </Choice>
            <Choice active={value.tieRule === "host"} onClick={() => set("tieRule", "host")}>
              Ưu tiên lựa chọn của chủ phòng
            </Choice>
          </div>
        </fieldset>
      </AdvancedGroup>
    </div>
  );
}
