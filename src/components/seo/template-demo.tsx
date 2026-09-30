import Link from "next/link";
import { getFormat } from "@/lib/formats";
import { TemplateIcon } from "@/components/seo/template-icon";
import type { RoomTemplate } from "@/lib/templates";

/** Static (no client libs) preview of a template's suggested options. */
export function TemplateDemo({ template }: { template: RoomTemplate }) {
  const format = getFormat(template.format);
  const options = template.suggestedOptions.length
    ? template.suggestedOptions
    : ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C"];

  return (
    <section className="glass rounded-[24px] p-5" aria-label="Demo kiểu vote">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">
          {format.name}
        </span>
        <Link href={`/kieu-vote/${format.slug}`} className="text-xs font-semibold text-muted-foreground underline">
          Xem kiểu vote
        </Link>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{format.hint(template.defaultSettings)}</p>
      <ul className="space-y-2">
        {options.slice(0, 6).map((label, i) => (
          <li
            key={`${label}-${i}`}
            className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white/80 px-3 py-3 dark:bg-white/5"
          >
            <TemplateIcon template={template} className="tpl-ic-sm" />
            <span className="min-w-0 flex-1 truncate font-semibold">{label}</span>
            <span className="size-5 rounded-full border-2 border-[var(--line)]" aria-hidden />
          </li>
        ))}
      </ul>
      <p className="mt-3 text-center text-xs text-muted-foreground">Bản xem trước — bấm “Dùng mẫu này” để vote thật</p>
    </section>
  );
}
