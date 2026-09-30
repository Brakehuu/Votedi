import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/home/footer";
import { BlogCtaBand } from "@/components/content/blog-cta";
import { BlogIndexView } from "@/components/content/blog-search";
import { allTopicCounts, listContent, paginate } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";
import { breadcrumbList, jsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Blog Vote Đi",
  description: "Mẹo chọn ngày, chọn quán, chọn mẫu áo và cách dùng từng kiểu vote, viết ngắn gọn cho nhóm bạn, lớp và team.",
  alternates: { canonical: absoluteUrl("/blog") },
};

const PER_PAGE = 12;

export default function BlogIndexPage() {
  const all = listContent("blog");
  const topics = allTopicCounts("blog");
  const { totalPages } = paginate(all, 1, PER_PAGE);
  const posts = all.slice(0, PER_PAGE).map(toCard);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@context": "https://schema.org",
          ...breadcrumbList([
            { name: "Trang chủ", path: "/" },
            { name: "Blog", path: "/blog" },
          ]),
        })}
      />
      <main className="blog-wrap">
        <BlogIndexView
          posts={posts}
          topics={topics}
          allCount={all.length}
          featuredNewest
          heroChip="Blog Vote Đi"
          title="Chốt việc chung cho cả nhóm,"
          titleEm="không cãi nhau"
          lead="Mẹo chọn ngày, chọn quán, chọn mẫu áo và cách dùng từng kiểu vote, viết ngắn gọn cho nhóm bạn, lớp và team."
        />

        {totalPages > 1 ? (
          <nav className="blog-pager" aria-label="Phân trang">
            <span className="text-sm text-muted-foreground">Trang 1 / {totalPages}</span>
            <Link href="/blog/trang/2" rel="next" className="btn btn-g">
              Trang sau
            </Link>
          </nav>
        ) : null}

        <BlogCtaBand />
      </main>
      <SiteFooter />
    </div>
  );
}

export function toCard(p: ReturnType<typeof listContent>[number]) {
  return {
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
    tags: p.tags,
  };
}
