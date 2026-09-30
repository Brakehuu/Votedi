import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/home/footer";
import { BlogCtaBand } from "@/components/content/blog-cta";
import { BlogSearch } from "@/components/content/blog-search";
import { allTopicCounts, listContent, paginate } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";
import { breadcrumbList, jsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Blog Vote Đi",
  description: "Mẹo tổ chức bình chọn nhóm, chọn lịch, áo lớp và nhiều tình huống thực tế.",
  alternates: { canonical: absoluteUrl("/blog") },
};

const PER_PAGE = 12;

export default function BlogIndexPage() {
  const all = listContent("blog");
  const topics = allTopicCounts("blog");
  const { totalPages } = paginate(all, 1, PER_PAGE);
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
          ]),
        })}
      />
      <main className="blog-wrap">
        <header className="blog-hero">
          <div>
            <p className="text-sm font-semibold text-primary">Blog</p>
            <h1>
              Chốt cùng nhóm, <em>không cãi nhau</em>
            </h1>
            <p>Mẹo chọn ngày, áo lớp, quán ăn và cách tổ chức vote cho nhóm Zalo.</p>
          </div>
        </header>

        <BlogSearch posts={posts.slice(0, PER_PAGE)} topics={topics} allCount={all.length} />

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
    </>
  );
}
