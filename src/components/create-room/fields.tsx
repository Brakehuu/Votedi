"use client";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function Choice({
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

export function ToggleRow({
  title,
  body,
  checked,
  onChange,
}: {
  title: string;
  body: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl bg-card p-4">
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="text-sm text-muted-foreground">{body}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
    </label>
  );
}

export function Stepper({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className="glass grid size-11 place-items-center rounded-full text-lg font-bold disabled:opacity-40"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label={`Giảm ${label}`}
      >
        −
      </button>
      <span className="w-8 text-center text-xl font-extrabold">{value}</span>
      <button
        type="button"
        className="glass grid size-11 place-items-center rounded-full text-lg font-bold disabled:opacity-40"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label={`Tăng ${label}`}
      >
        +
      </button>
    </div>
  );
}

export function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold tracking-wide text-muted-foreground uppercase">{title}</h2>
      {children}
    </section>
  );
}

export function AdvancedGroup({ children }: { children: React.ReactNode }) {
  return (
    <details className="group rounded-2xl">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-bold tracking-wide text-muted-foreground uppercase">
        Nâng cao
        <span className="text-base transition-transform group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="mt-3 space-y-5">{children}</div>
    </details>
  );
}
