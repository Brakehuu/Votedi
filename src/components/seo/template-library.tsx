"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CategoryFilter } from "@/components/seo/category-filter";
import { TemplateIcon } from "@/components/seo/template-icon";
import {
  TEMPLATES,
  searchTemplates,
  templateTabCounts,
  templatesForTab,
  type TemplateTabId,
} from "@/lib/templates";
import { FORMATS } from "@/lib/formats";

export function TemplateLibrary({
  initialQuery = "",
  activeTab = "all",
}: {
  initialQuery?: string;
  activeTab?: TemplateTabId | "all";
}) {
  const [q, setQ] = useState(initialQuery);
  const counts = useMemo(() => templateTabCounts(), []);

  const list = useMemo(() => {
    if (q.trim()) return searchTemplates(q);
    if (activeTab === "all") return TEMPLATES;
    return templatesForTab(activeTab);
  }, [q, activeTab]);

  return (
    <div className="space-y-5">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tìm mẫu…"
        className="h-12 w-full rounded-2xl border border-input bg-card px-4 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        aria-label="Tìm mẫu"
      />
      {!q.trim() ? <CategoryFilter variant="links" value={activeTab} counts={counts} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((t) => {
          const format = FORMATS[t.format as keyof typeof FORMATS];
          return (
            <Link
              key={t.slug}
              href={`/mau/${t.slug}`}
              className="glass flex gap-3 rounded-[22px] p-4 transition hover:ring-2 hover:ring-primary/30"
            >
              <TemplateIcon template={t} />
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
