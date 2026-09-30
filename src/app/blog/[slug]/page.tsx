import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/home/footer";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { MdxBody } from "@/components/content/mdx-body";
import { TemplateCta } from "@/components/content/mdx-components";
import {
  extractToc,
  getContent,
  listContent,
  relatedContent,
} from "@/lib/content";
import { breadcrumbList, jsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export function generateStaticParams() {
  // Include drafts so UI can be previewed; drafts stay noindex + out of sitemap.
  return listContent("blog", { includeDrafts: true }).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getContent("blog", slug, { includeDrafts: true });
  if (!doc) return { title: "Không tìm thấy" };
  return {
    title: doc.title,
    description: doc.description,
    alternates: { canonical: absoluteUrl(`/blog/${doc.slug}`) },
    robots: doc.draft ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: doc.title,
      description: doc.description,
      type: "article",
      url: absoluteUrl(`/blog/${doc.slug}`),
      images: [{ url: absoluteUrl(`/blog/${doc.slug}/opengraph-image`) }],
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getContent("blog", slug, { includeDrafts: true });
  if (!doc) notFound();
  const toc = extractToc(doc.body);
  const related = relatedContent("blog", doc.slug);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd([
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: doc.title,
            description: doc.description,
            datePublished: doc.date,
            dateModified: doc.updated ?? doc.date,
            author: { "@type": "Person", name: doc.author ?? "Vote Đi" },
            mainEntityOfPage: absoluteUrl(`/blog/${doc.slug}`),
          },
          {
            "@context": "https://schema.org",
            ...breadcrumbList([
              { name: "Trang chủ", path: "/" },
              { name: "Blog", path: "/blog" },
              { name: doc.title, path: `/blog/${doc.slug}` },
            ]),
          },
        ])}
      />
      <main className="mx-auto w-full max-w-2xl px-4 py-10 pb-24">
        <Breadcrumbs
          items={[
            { label: "Trang chủ", href: "/" },
            { label: "Blog", href: "/blog" },
            { label: doc.title },
          ]}
        />
        {doc.draft ? (
          <p className="mb-3 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 inline-flex">
            Nháp · không index
          </p>
        ) : null}
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{doc.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {doc.readingMinutes} phút đọc · cập nhật {doc.updated ?? doc.date}
        </p>
        {toc.length ? (
          <nav className="glass mt-6 rounded-[18px] p-4 text-sm" aria-label="Mục lục">
            <p className="font-bold">Mục lục</p>
            <ul className="mt-2 space-y-1">
              {toc.map((item) => (
                <li key={item.id} className={item.level === 3 ? "pl-3" : undefined}>
                  <a href={`#${item.id}`} className="text-primary">
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        <article className="mt-8">
          <MdxBody source={doc.body} />
        </article>
        {doc.templateSlug ? <TemplateCta slug={doc.templateSlug} /> : null}
        {related.length ? (
          <section className="mt-12">
            <h2 className="text-xl font-extrabold">Bài liên quan</h2>
            <ul className="mt-3 space-y-2">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link href={`/blog/${r.slug}`} className="font-semibold text-primary">
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
