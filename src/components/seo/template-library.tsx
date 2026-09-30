"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  TEMPLATE_TABS,
  TEMPLATES,
  searchTemplates,
  templatesForTab,
  type TemplateTabId,
} from "@/lib/templates";
import { FORMATS } from "@/lib/formats";
import { cn } from "@/lib/utils";

export function TemplateLibrary({ initialQuery = "" }: { initialQuery?: string }) {
  const [tab, setTab] = useState<TemplateTabId | "all">("all");
  const [q, setQ] = useState(initialQuery);

  const list = useMemo(() => {
    if (q.trim()) return searchTemplates(q);
    if (tab === "all") return TEMPLATES;
    return templatesForTab(tab);
  }, [q, tab]);

  return (
    <div className="space-y-5">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tìm mẫu…"
        className="h-12 w-full rounded-2xl border border-input bg-card px-4 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        aria-label="Tìm mẫu"
      />
      {!q.trim() ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button
            type="button"
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-2 text-sm font-semibold",
              tab === "all" ? "border-primary bg-primary-soft text-primary" : "border-[var(--line)] bg-white",
            )}
            onClick={() => setTab("all")}
          >
            Tất cả
          </button>
          {TEMPLATE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
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
      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((t) => {
          const format = FORMATS[t.format as keyof typeof FORMATS];
          return (
            <Link
              key={t.slug}
              href={`/mau/${t.slug}`}
              className="glass flex gap-3 rounded-[22px] p-4 transition hover:ring-2 hover:ring-primary/30"
            >
              <span className="text-3xl" aria-hidden>
                {t.emoji}
              </span>
              <span className="min-w-0">
                <b className="block font-extrabold">{t.title}</b>
                <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">{t.intro}</span>
                <span className="mt-2 inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold">
                  {format?.name ?? t.format}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
      {!list.length ? <p className="text-sm text-muted-foreground">Không có mẫu khớp.</p> : null}
    </div>
  );
}
