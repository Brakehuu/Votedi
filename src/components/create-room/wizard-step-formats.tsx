"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  TEMPLATE_TABS,
  TEMPLATES,
  searchTemplates,
  templatesForTab,
  type RoomTemplate,
  type TemplateTabId,
} from "@/lib/templates";
import { FORMAT_LIST } from "@/lib/formats";
import { cn } from "@/lib/utils";

function TemplateCard({
  item,
  onPick,
}: {
  item: RoomTemplate;
  onPick: (item: RoomTemplate) => void;
}) {
  const format = FORMAT_LIST.find((f) => f.id === item.format);
  return (
    <button type="button" className="fmt-card glass text-left" onClick={() => onPick(item)}>
      <span className="fmt-ic text-2xl" aria-hidden>
        {item.emoji}
      </span>
      <span className="min-w-0">
        <b>{item.title}</b>
        <span className="d">{item.intro}</span>
        <span className="u">{format?.name ?? item.format}</span>
      </span>
    </button>
  );
}

export function WizardStepFormats({
  onPickTemplate,
  onPickFormat,
}: {
  onPickTemplate: (item: RoomTemplate) => void;
  onPickFormat: (id: string) => void;
}) {
  const [tab, setTab] = useState<TemplateTabId | "all">("place");
  const [q, setQ] = useState("");
  const formats = FORMAT_LIST.filter((f) => f.available);

  const list = useMemo(() => {
    if (q.trim()) return searchTemplates(q);
    if (tab === "all") return TEMPLATES;
    return templatesForTab(tab);
  }, [q, tab]);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Bạn muốn chốt gì?</h1>
        <p className="mt-1 text-muted-foreground">Chọn mẫu có sẵn hoặc tự chọn kiểu vote.</p>
      </div>

      <label className="block space-y-2">
        <span className="sr-only">Tìm mẫu</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm mẫu… (áo lớp, ăn gì, lịch họp…)"
          className="h-12 w-full rounded-2xl border border-input bg-card px-4 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        />
      </label>

      {!q.trim() ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Danh mục mẫu">
          {TEMPLATE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-2 text-sm font-semibold",
                tab === t.id
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-[var(--line)] bg-white text-muted-foreground",
              )}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="fmt-grid">
        {list.map((item) => (
          <TemplateCard key={item.slug} item={item} onPick={onPickTemplate} />
        ))}
      </div>
      {!list.length ? <p className="text-sm text-muted-foreground">Không thấy mẫu khớp. Thử từ khóa khác.</p> : null}

      <div className="space-y-3 border-t border-[var(--line)] pt-6">
        <h2 className="text-lg font-extrabold">Tự chọn kiểu vote</h2>
        <div className="fmt-grid">
          {formats.map((item) => (
            <button
              key={item.id}
              type="button"
              className="fmt-card glass"
              onClick={() => onPickFormat(item.id)}
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
        <p className="text-center text-sm">
          <Link href="/mau" className="font-semibold text-primary">
            Xem thư viện mẫu đầy đủ
          </Link>
        </p>
      </div>
    </section>
  );
}
