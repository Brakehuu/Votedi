import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/home/footer";
import { BlogCtaBand } from "@/components/content/blog-cta";
import { BlogIndexView } from "@/components/content/blog-search";
import { toCard } from "@/app/blog/page";
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

  const matching = listContent("blog").filter(
    (p) => p.primaryTopicSlug === topic.slug || p.tags.includes(topic.name),
  );
  const topics = allTopicCounts("blog");
  if (!matching.length) notFound();

  return (
    <div>
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
        <BlogIndexView
          posts={matching.map(toCard)}
          topics={topics}
          allCount={listContent("blog").length}
          activeTopicSlug={topic.slug}
          heroChip="Blog Vote Đi"
          title={topic.name}
          lead={`${matching.length} bài về ${topic.name}.`}
        />
        <BlogCtaBand />
      </main>
      <SiteFooter />
    </div>
  );
}
