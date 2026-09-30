import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/home/footer";
import { BlogCtaBand } from "@/components/content/blog-cta";
import { BlogSearch } from "@/components/content/blog-search";
import { allTopicCounts, listContent, paginate } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";
import { breadcrumbList, jsonLd } from "@/lib/seo";

const PER_PAGE = 12;

export function generateStaticParams() {
  const total = listContent("blog").length;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  return Array.from({ length: pages }, (_, i) => ({ n: String(i + 1) })).filter((p) => p.n !== "1");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ n: string }>;
}): Promise<Metadata> {
  const { n } = await params;
  const page = Number(n);
  return {
    title: `Blog · Trang ${page}`,
    description: `Các bài viết trên Blog Vote Đi — trang ${page}.`,
    alternates: { canonical: absoluteUrl(`/blog/trang/${page}`) },
  };
}

export default async function BlogPagedPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const pageNum = Number(n);
  if (!Number.isFinite(pageNum) || pageNum < 2) notFound();

  const all = listContent("blog");
  const topics = allTopicCounts("blog");
  const { items, page, totalPages } = paginate(all, pageNum, PER_PAGE);
  if (pageNum > totalPages) notFound();

  const posts = items.map((p) => ({
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
            { name: `Trang ${page}`, path: `/blog/trang/${page}` },
          ]),
        })}
      />
      <main className="blog-wrap">
        <header className="blog-hero">
          <div>
            <p className="text-sm font-semibold text-primary">Blog</p>
            <h1>
              Trang {page} <em>/ {totalPages}</em>
            </h1>
            <p>Tiếp tục khám phá mẹo chốt quyết định cùng nhóm.</p>
          </div>
        </header>

        <BlogSearch posts={posts} topics={topics} allCount={all.length} />

        <nav className="blog-pager" aria-label="Phân trang">
          <Link href={page === 2 ? "/blog" : `/blog/trang/${page - 1}`} rel="prev" className="btn btn-g">
            Trang trước
          </Link>
          <span className="text-sm text-muted-foreground">
            Trang {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={`/blog/trang/${page + 1}`} rel="next" className="btn btn-g">
              Trang sau
            </Link>
          ) : (
            <span />
          )}
        </nav>

        <BlogCtaBand />
      </main>
      <SiteFooter />
    </>
  );
}
