import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/home/footer";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { TemplateDemo } from "@/components/seo/template-demo";
import { TemplateIcon } from "@/components/seo/template-icon";
import { getFormat } from "@/lib/formats";
import { breadcrumbList, faqPage, jsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { TEMPLATES, getTemplate } from "@/lib/templates";

export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = getTemplate(slug);
  if (!t) return { title: "Không tìm thấy mẫu" };
  return {
    title: t.seoTitle.replace(/\s*\|\s*Vote Đi\s*$/i, ""),
    description: t.seoDescription,
    alternates: { canonical: absoluteUrl(`/mau/${t.slug}`) },
    openGraph: {
      title: t.seoTitle,
      description: t.seoDescription,
      url: absoluteUrl(`/mau/${t.slug}`),
      images: [{ url: absoluteUrl(`/mau/${t.slug}/opengraph-image`) }],
    },
  };
}

export default async function MauDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = getTemplate(slug);
  if (!t) notFound();
  const format = getFormat(t.format);
  const related = t.relatedSlugs.map((s) => getTemplate(s)).filter(Boolean);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd([
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: t.h1,
            description: t.seoDescription,
            url: absoluteUrl(`/mau/${t.slug}`),
          },
          {
            "@context": "https://schema.org",
            ...breadcrumbList([
              { name: "Trang chủ", path: "/" },
              { name: "Mẫu", path: "/mau" },
              { name: t.title, path: `/mau/${t.slug}` },
            ]),
          },
          { "@context": "https://schema.org", ...faqPage(t.faq) },
        ])}
      />
      <main className="blog-wrap" style={{ maxWidth: 760 }}>
        <Breadcrumbs
          items={[
            { label: "Trang chủ", href: "/" },
            { label: "Mẫu", href: "/mau" },
            { label: t.title },
          ]}
        />
        <TemplateIcon template={t} className="tpl-ic-lg" />
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{t.h1}</h1>
        <p className="mt-3 text-muted-foreground">{t.intro}</p>
        <p className="mt-2 text-sm">
          Kiểu vote:{" "}
          <Link href={`/kieu-vote/${format.slug}`} className="font-semibold text-primary">
            {format.name}
          </Link>
        </p>
        <Link href={`/tao-phong?mau=${t.slug}`} className="btn btn-primary mt-6 inline-flex min-h-12 px-6 text-base">
          Dùng mẫu này
        </Link>

        <div className="mt-10">
          <h2 className="mb-3 text-xl font-extrabold">Xem trước</h2>
          <TemplateDemo template={t} />
        </div>

        <section className="mt-12">
          <h2 className="text-xl font-extrabold">3 bước</h2>
          <ol className="mt-4 space-y-3">
            {t.steps.map((step, i) => (
              <li key={step} className="glass flex gap-3 rounded-[18px] p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-sm font-extrabold text-background">
                  {i + 1}
                </span>
                <span className="font-semibold">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-extrabold">Lợi ích</h2>
          <ul className="mt-4 space-y-2">
            {t.benefits.map((b) => (
              <li key={b} className="flex gap-2 text-sm">
                <span className="text-primary" aria-hidden>
                  ✓
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-extrabold">Câu hỏi thường gặp</h2>
          <div className="mt-4 space-y-3">
            {t.faq.map((item) => (
              <details key={item.q} className="glass rounded-[18px] p-4">
                <summary className="cursor-pointer font-bold">{item.q}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-extrabold">Mẫu liên quan</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {related.map((r) =>
              r ? (
                <Link key={r.slug} href={`/mau/${r.slug}`} className="glass rounded-[18px] p-4 text-center">
                  <TemplateIcon template={r} className="mx-auto" />
                  <b className="mt-2 block text-sm font-bold">{r.title}</b>
                </Link>
              ) : null,
            )}
          </div>
        </section>

        <section className="glass mt-12 rounded-[24px] p-6 text-center">
          <h2 className="text-2xl font-extrabold">Sẵn sàng chốt cùng nhóm?</h2>
          <p className="mt-2 text-sm text-muted-foreground">Tạo phòng từ mẫu này — miễn phí, không cần tài khoản.</p>
          <Link href={`/tao-phong?mau=${t.slug}`} className="btn btn-primary mt-4 inline-flex min-h-12">
            Dùng mẫu này
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
