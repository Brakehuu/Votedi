import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticlePage } from "@/components/content/article-page";
import { getContent, listContent, relatedContent } from "@/lib/content";
import { GUIDE_FLOW } from "@/lib/guides";
import { absoluteUrl } from "@/lib/site";

export function generateStaticParams() {
  return listContent("huong-dan", { includeDrafts: true }).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getContent("huong-dan", slug, { includeDrafts: true, includeScheduled: true });
  if (!doc) return { title: "Không tìm thấy" };
  const cover = doc.cover ?? `/huong-dan/${doc.slug}/opengraph-image`;
  return {
    title: doc.title,
    description: doc.description,
    alternates: { canonical: absoluteUrl(`/huong-dan/${doc.slug}`) },
    robots: doc.draft || doc.scheduled ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: doc.title,
      description: doc.description,
      type: "article",
      url: absoluteUrl(`/huong-dan/${doc.slug}`),
      images: [{ url: absoluteUrl(cover) }],
    },
  };
}

export default async function HuongDanPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getContent("huong-dan", slug, { includeDrafts: true, includeScheduled: true });
  if (!doc) notFound();
  if (doc.scheduled && !doc.draft) notFound();
  const related = relatedContent("huong-dan", doc.slug);
  const all = listContent("huong-dan");
  const flow = GUIDE_FLOW.filter((s) => all.some((p) => p.slug === s));
  const extras = all.map((p) => p.slug).filter((s) => !flow.includes(s));
  const order = [...flow, ...extras];
  const idx = order.indexOf(doc.slug);
  const prev = idx > 0 ? getContent("huong-dan", order[idx - 1]) : null;
  const next = idx >= 0 && idx < order.length - 1 ? getContent("huong-dan", order[idx + 1]) : null;
  return <ArticlePage doc={doc} related={related} basePath="/huong-dan" prev={prev} next={next} />;
}
