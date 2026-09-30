import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/home/footer";
import { TemplateLibrary } from "@/components/seo/template-library";
import { absoluteUrl } from "@/lib/site";
import {
  TEMPLATE_TAB_SEO,
  getTemplateTab,
  isTemplateTabId,
  type TemplateTabId,
} from "@/lib/templates";

export function generateStaticParams() {
  return [
    { slug: "place" },
    { slug: "travel" },
    { slug: "food" },
    { slug: "fashion" },
    { slug: "school" },
    { slug: "work" },
    { slug: "family" },
    { slug: "community" },
  ] satisfies { slug: TemplateTabId }[];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isTemplateTabId(slug)) return { title: "Không tìm thấy danh mục" };
  const seo = TEMPLATE_TAB_SEO[slug];
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: absoluteUrl(`/mau/danh-muc/${slug}`) },
    openGraph: {
      title: `${seo.title} | Vote Đi`,
      description: seo.description,
      url: absoluteUrl(`/mau/danh-muc/${slug}`),
    },
  };
}

export default async function MauCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isTemplateTabId(slug)) notFound();
  const tab = getTemplateTab(slug)!;
  const seo = TEMPLATE_TAB_SEO[slug];

  return (
    <div>
      <main className="blog-wrap">
        <p className="text-sm font-semibold text-primary">Thư viện mẫu</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{tab.label}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {seo.description} Hoặc{" "}
          <Link href="/tao-phong" className="font-semibold text-primary">
            tự chọn kiểu vote
          </Link>
          .
        </p>
        <div className="mt-8">
          <TemplateLibrary activeTab={slug} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
