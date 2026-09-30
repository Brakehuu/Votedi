import Image from "next/image";
import Link from "next/link";
import { getTemplate } from "@/lib/templates";
import { TemplateIcon } from "@/components/seo/template-icon";
import type { AssetMeta } from "@/lib/content";
import { slugifyHeading } from "@/lib/content";
import { Callout, MdxFigure, SummaryBox } from "@/components/content/article-chrome";

export function TemplateCta({ slug }: { slug: string }) {
  const t = getTemplate(slug);
  if (!t) return null;
  return (
    <aside className="blog-tcta">
      <span className="blog-tcta-ic" aria-hidden>
        <TemplateIcon template={t} className="tpl-ic-on-grad" />
      </span>
      <div>
        <b>Mẫu: {t.title}</b>
        <span>{t.intro}</span>
      </div>
      <Link href={`/tao-phong?mau=${t.slug}`} className="btn btn-primary btn-sm shrink-0">
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

function Heading({
  as: Tag,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & { as: "h2" | "h3" }) {
  const text = headingText(children);
  const id = props.id || slugifyHeading(text);
  return (
    <Tag id={id} className={Tag === "h2" ? "blog-prose-h2" : "blog-prose-h3"} {...props}>
      {children}
      <a className="blog-anchor" href={`#${id}`} aria-label="Liên kết mục này">
        #
      </a>
    </Tag>
  );
}

function headingText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(headingText).join("");
  if (children && typeof children === "object" && "props" in (children as object)) {
    return headingText((children as { props: { children?: React.ReactNode } }).props.children);
  }
  return String(children ?? "");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createMdxComponents(assetMap: Record<string, AssetMeta>): Record<string, any> {
  return {
    TemplateCta,
    Callout,
    Summary: SummaryBox,
    a: MdxLink,
    h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => <Heading as="h2" {...props} />,
    h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => <Heading as="h3" {...props} />,
    img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
      const src = String(props.src ?? "");
      const file = src.split("/").pop() ?? "";
      const meta = assetMap[file];
      const width = meta?.width ?? 1200;
      const height = meta?.height ?? 630;
      const alt = String(props.alt ?? "");
      const title = typeof props.title === "string" ? props.title : undefined;
      if (!src) return null;
      return <MdxFigure src={src} alt={alt} title={title} width={width} height={height} />;
    },
    table: (props: React.TableHTMLAttributes<HTMLTableElement>) => (
      <div className="blog-tbl">
        <table {...props} />
      </div>
    ),
  };
}

export function CoverImage({
  src,
  alt,
  width,
  height,
  priority,
  className,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
}) {
  if (src.includes("opengraph-image")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={className} />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 1200}
      height={height ?? 630}
      sizes="(min-width:1180px) 784px, 100vw"
      className={className}
      priority={priority}
    />
  );
}
