import Link from "next/link";
import { getTemplate } from "@/lib/templates";

export function TemplateCta({ slug }: { slug: string }) {
  const t = getTemplate(slug);
  if (!t) return null;
  return (
    <aside className="not-prose my-8 rounded-[22px] border border-primary/25 bg-primary-soft/60 p-5">
      <p className="text-sm font-semibold text-primary">
        {t.emoji} Thử mẫu “{t.title}”
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{t.intro}</p>
      <Link href={`/tao-phong?mau=${t.slug}`} className="btn btn-primary mt-3 inline-flex min-h-11">
        Dùng mẫu này
      </Link>
    </aside>
  );
}

export function MdxLink(props: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const href = props.href ?? "";
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={props.className}>
        {props.children}
      </Link>
    );
  }
  return <a {...props} rel="noopener noreferrer" />;
}
