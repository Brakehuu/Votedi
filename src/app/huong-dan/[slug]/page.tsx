import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/home/footer";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { MdxBody } from "@/components/content/mdx-body";
import { TemplateCta } from "@/components/content/mdx-components";
import { extractToc, getContent, listContent, relatedContent } from "@/lib/content";
import { breadcrumbList, jsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export function generateStaticParams() {
  return listContent("huong-dan").map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getContent("huong-dan", slug);
  if (!doc) return { title: "Không tìm thấy" };
  return {
    title: doc.title,
    description: doc.description,
    alternates: { canonical: absoluteUrl(`/huong-dan/${doc.slug}`) },
    openGraph: {
      title: doc.title,
      description: doc.description,
      type: "article",
      url: absoluteUrl(`/huong-dan/${doc.slug}`),
    },
  };
}

export default async function HuongDanPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getContent("huong-dan", slug);
  if (!doc) notFound();
  const toc = extractToc(doc.body);
  const related = relatedContent("huong-dan", doc.slug);

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
            author: { "@type": "Organization", name: "Vote Đi" },
          },
          {
            "@context": "https://schema.org",
            ...breadcrumbList([
              { name: "Trang chủ", path: "/" },
              { name: "Hướng dẫn", path: "/huong-dan" },
              { name: doc.title, path: `/huong-dan/${doc.slug}` },
            ]),
          },
        ])}
      />
      <main className="mx-auto w-full max-w-2xl px-4 py-10 pb-24">
        <Breadcrumbs
          items={[
            { label: "Trang chủ", href: "/" },
            { label: "Hướng dẫn", href: "/huong-dan" },
            { label: doc.title },
          ]}
        />
        <h1 className="text-3xl font-extrabold tracking-tight">{doc.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {doc.readingMinutes} phút đọc · cập nhật {doc.updated ?? doc.date}
        </p>
        {toc.length ? (
          <nav className="glass mt-6 rounded-[18px] p-4 text-sm" aria-label="Mục lục">
            <p className="font-bold">Mục lục</p>
            <ul className="mt-2 space-y-1">
              {toc.map((item) => (
                <li key={item.id}>
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
          <section className="mt-10">
            <h2 className="text-lg font-extrabold">Bài liên quan</h2>
            <ul className="mt-2 space-y-1">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link href={`/huong-dan/${r.slug}`} className="font-semibold text-primary">
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
