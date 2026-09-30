"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { TemplateIcon } from "@/components/seo/template-icon";
import {
  TEMPLATE_TABS,
  type TemplateTabId,
} from "@/lib/templates";
import { cn } from "@/lib/utils";

export type CategoryValue = TemplateTabId | "all";

export function CategoryFilter({
  value,
  counts,
  variant,
  onSelect,
}: {
  value: CategoryValue;
  counts: Record<string, number>;
  variant: "links" | "buttons";
  onSelect?: (id: CategoryValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const sheetId = useId();
  const startY = useRef(0);
  const current = TEMPLATE_TABS.find((t) => t.id === value);
  const label = current ? current.label : "Tất cả";

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(id: CategoryValue) {
    onSelect?.(id);
    setOpen(false);
  }

  const items: { id: CategoryValue; label: string; count: number }[] = [
    { id: "all", label: "Tất cả", count: counts.all ?? 0 },
    ...TEMPLATE_TABS.map((t) => ({ id: t.id, label: t.label, count: counts[t.id] ?? 0 })),
  ];

  return (
    <div className="cat-filter">
      <div className="cat-chips" role="navigation" aria-label="Danh mục mẫu">
        {items.map((item) => {
          const on = value === item.id;
          const cls = cn("blog-tab", on && "on");
          if (variant === "links") {
            return (
              <Link
                key={item.id}
                href={item.id === "all" ? "/mau" : `/mau/danh-muc/${item.id}`}
                scroll={false}
                className={cls}
              >
                {item.label} <small>{item.count}</small>
              </Link>
            );
          }
          return (
            <button key={item.id} type="button" className={cls} onClick={() => pick(item.id)}>
              {item.label} <small>{item.count}</small>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="cat-mob-trigger"
        aria-expanded={open}
        aria-controls={sheetId}
        onClick={() => setOpen(true)}
      >
        <span>
          Danh mục: <b>{label}</b>
        </span>
        <ChevronDown className="size-[18px]" strokeWidth={1.9} />
      </button>

      {value !== "all" ? (
        <div className="cat-active">
          <span className="chip">{label}</span>
          {variant === "links" ? (
            <Link href="/mau" scroll={false} className="cat-clear">
              <X className="size-3.5" strokeWidth={1.9} />
              Xóa lọc
            </Link>
          ) : (
            <button type="button" className="cat-clear" onClick={() => pick("all")}>
              <X className="size-3.5" strokeWidth={1.9} />
              Xóa lọc
            </button>
          )}
        </div>
      ) : null}

      <div className={cn("cat-scrim", open && "open")} onClick={() => setOpen(false)} />
      <div
        id={sheetId}
        className={cn("cat-sheet", open && "open")}
        role="dialog"
        aria-modal={open}
        aria-label="Danh mục mẫu"
        onTouchStart={(e) => {
          startY.current = e.touches[0]?.clientY ?? 0;
        }}
        onTouchEnd={(e) => {
          const dy = (e.changedTouches[0]?.clientY ?? 0) - startY.current;
          if (dy > 56) setOpen(false);
        }}
      >
        <div className="blog-grab" />
        <p className="cat-sheet-h">Danh mục</p>
        <div className="cat-grid">
          {items.map((item) => {
            const on = value === item.id;
            const inner = (
              <>
                {item.id === "all" ? (
                  <span className="tpl-ic tpl-ic-all" aria-hidden />
                ) : (
                  <TemplateIcon category={item.id} />
                )}
                <span className="min-w-0">
                  <b>{item.label}</b>
                  <small>{item.count} mẫu</small>
                </span>
              </>
            );
            const cls = cn("cat-tile", on && "on");
            if (variant === "links") {
              return (
                <Link
                  key={item.id}
                  href={item.id === "all" ? "/mau" : `/mau/danh-muc/${item.id}`}
                  scroll={false}
                  className={cls}
                  onClick={() => setOpen(false)}
                >
                  {inner}
                </Link>
              );
            }
            return (
              <button key={item.id} type="button" className={cls} onClick={() => pick(item.id)}>
                {inner}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
