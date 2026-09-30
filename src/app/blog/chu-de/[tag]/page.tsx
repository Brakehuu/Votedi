import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/home/footer";
import { BlogCtaBand } from "@/components/content/blog-cta";
import { BlogSearch } from "@/components/content/blog-search";
import { allTopicCounts, listContent, topicSlugFromParam } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";
import { breadcrumbList, jsonLd } from "@/lib/seo";

export function generateStaticParams() {
  return allTopicCounts("blog").map((t) => ({ tag: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const topic = topicSlugFromParam(tag);
  if (!topic) return { title: "Chủ đề" };
  return {
    title: `Blog · ${topic.name}`,
    description: `Bài viết chủ đề ${topic.name} trên Blog Vote Đi — mẹo chốt quyết định cùng nhóm.`,
    alternates: { canonical: absoluteUrl(`/blog/chu-de/${topic.slug}`) },
  };
}

export default async function BlogTagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const topic = topicSlugFromParam(tag);
  if (!topic) notFound();

  const all = listContent("blog").filter(
    (p) => p.primaryTopicSlug === topic.slug || p.tags.includes(topic.name),
  );
  const topics = allTopicCounts("blog");
  if (!all.length) notFound();

  const posts = all.map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    date: p.date,
    readingMinutes: p.readingMinutes,
    primaryTopic: p.primaryTopic,
    primaryTopicSlug: p.primaryTopicSlug,
    cover: p.cover,
    coverWidth: p.coverWidth,
    coverHeight: p.coverHeight,
    generatedCover: p.generatedCover,
  }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@context": "https://schema.org",
          ...breadcrumbList([
            { name: "Trang chủ", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: topic.name, path: `/blog/chu-de/${topic.slug}` },
          ]),
        })}
      />
      <main className="blog-wrap">
        <header className="blog-hero">
          <div>
            <p className="text-sm font-semibold text-primary">Chủ đề</p>
            <h1>{topic.name}</h1>
            <p>
              {all.length} bài ·{" "}
              <Link href="/blog" className="font-semibold text-primary">
                Tất cả bài viết
              </Link>
            </p>
          </div>
        </header>

        <BlogSearch
          posts={posts}
          topics={topics}
          activeTopicSlug={topic.slug}
          allCount={listContent("blog").length}
        />
        <BlogCtaBand />
      </main>
      <SiteFooter />
    </>
  );
}
