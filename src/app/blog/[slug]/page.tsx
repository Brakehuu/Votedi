import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticlePage } from "@/components/content/article-page";
import { getContent, listContent, relatedContent } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";

export function generateStaticParams() {
  return listContent("blog", { includeDrafts: true }).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getContent("blog", slug, { includeDrafts: true, includeScheduled: true });
  if (!doc) return { title: "Không tìm thấy" };
  if (doc.scheduled && !doc.draft) {
    return { title: doc.title, robots: { index: false, follow: false } };
  }
  const cover = doc.cover ?? `/blog/${doc.slug}/opengraph-image`;
  return {
    title: doc.title,
    description: doc.description,
    alternates: { canonical: absoluteUrl(`/blog/${doc.slug}`) },
    robots: doc.draft || doc.scheduled ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: doc.title,
      description: doc.description,
      type: "article",
      url: absoluteUrl(`/blog/${doc.slug}`),
      images: [
        {
          url: absoluteUrl(cover),
          width: doc.coverWidth ?? 1200,
          height: doc.coverHeight ?? 630,
        },
      ],
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getContent("blog", slug, { includeDrafts: true, includeScheduled: true });
  if (!doc) notFound();
  // Hide future posts publicly (drafts still previewable)
  if (doc.scheduled && !doc.draft) notFound();
  const related = relatedContent("blog", doc.slug);
  return <ArticlePage doc={doc} related={related} basePath="/blog" />;
}
