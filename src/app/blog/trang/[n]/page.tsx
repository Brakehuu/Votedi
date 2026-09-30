import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/home/footer";
import { BlogCtaBand } from "@/components/content/blog-cta";
import { BlogIndexView } from "@/components/content/blog-search";
import { toCard } from "@/app/blog/page";
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

  return (
    <div>
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
        <BlogIndexView
          posts={items.map(toCard)}
          topics={topics}
          allCount={all.length}
          heroChip="Blog Vote Đi"
          title={`Trang ${page}`}
          titleEm={`/ ${totalPages}`}
          lead="Tiếp tục khám phá mẹo chốt quyết định cùng nhóm."
        />

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
    </div>
  );
}
