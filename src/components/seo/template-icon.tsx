import { cn } from "@/lib/utils";
import { CATEGORY_VISUAL, templateVisual, type RoomTemplate, type TemplateCategory } from "@/lib/templates";

export function TemplateIcon({
  template,
  category,
  className,
}: {
  template?: Pick<RoomTemplate, "slug" | "category">;
  category?: TemplateCategory;
  className?: string;
}) {
  const vis = template ? templateVisual(template) : CATEGORY_VISUAL[category ?? "place"];
  const Icon = vis.icon;
  return (
    <span className={cn("tpl-ic", className)} style={{ background: vis.bg, color: vis.fg }} aria-hidden>
      <Icon strokeWidth={1.9} />
    </span>
  );
}
