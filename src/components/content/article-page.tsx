import Link from "next/link";
import { SiteFooter } from "@/components/home/footer";
import { CoverImage, TemplateCta } from "@/components/content/mdx-components";
import { MdxBody } from "@/components/content/mdx-body";
import { FaqAccordion, ShareButtons } from "@/components/content/article-chrome";
import { PostShell } from "@/components/content/post-shell";
import type { ContentDoc } from "@/lib/content";
import { getTemplate } from "@/lib/templates";
import { absoluteUrl } from "@/lib/site";
import { breadcrumbList, faqPage, jsonLd } from "@/lib/seo";

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date(`${iso}T12:00:00+07:00`));
  } catch {
    return iso;
  }
}

export function ArticlePage({
  doc,
  related,
  basePath,
}: {
  doc: ContentDoc;
  related: ContentDoc[];
  basePath: "/blog" | "/huong-dan";
}) {
  const path = `${basePath}/${doc.slug}`;
  const template = doc.template ? getTemplate(doc.template) : null;
  const crumbs =
    basePath === "/blog"
      ? [
          { name: "Trang chủ", path: "/" },
          { name: "Blog", path: "/blog" },
          ...(doc.primaryTopicSlug
            ? [{ name: doc.primaryTopic!, path: `/blog/chu-de/${doc.primaryTopicSlug}` }]
            : []),
          { name: doc.title, path },
        ]
      : [
          { name: "Trang chủ", path: "/" },
          { name: "Hướng dẫn", path: "/huong-dan" },
          { name: doc.title, path },
        ];

  const coverSrc = doc.cover ?? `${path}/opengraph-image`;
  const json: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: doc.title,
      description: doc.description,
      datePublished: doc.date,
      dateModified: doc.updated,
      author: { "@type": "Organization", name: doc.author },
      image: absoluteUrl(coverSrc),
      mainEntityOfPage: absoluteUrl(path),
    },
    { "@context": "https://schema.org", ...breadcrumbList(crumbs) },
  ];
  if (doc.faq.length) {
    json.push({ "@context": "https://schema.org", ...faqPage(doc.faq) });
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(json)} />
      <main className="blog-wrap">
        <nav className="blog-crumb" aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <span key={`${c.path}-${i}`} className="inline-flex items-center gap-2">
              {i > 0 ? <span aria-hidden>/</span> : null}
              {i < crumbs.length - 1 ? <Link href={c.path}>{c.name}</Link> : <span className="line-clamp-1">{c.name}</span>}
            </span>
          ))}
        </nav>

        <header className="blog-ph">
          <div>
            {doc.primaryTopic && doc.primaryTopicSlug && basePath === "/blog" ? (
              <Link href={`/blog/chu-de/${doc.primaryTopicSlug}`} className="chip">
                {doc.primaryTopic}
              </Link>
            ) : (
              <span className="chip">{basePath === "/blog" ? "Blog" : "Hướng dẫn"}</span>
            )}
            {doc.draft ? (
              <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
                Nháp
              </span>
            ) : null}
            <h1>{doc.title}</h1>
            <p className="blog-lede">{doc.description}</p>
            <div className="blog-by">
              <div>
                <b>{doc.author}</b>
                <small>
                  Cập nhật {formatDate(doc.updated)} · {doc.readingMinutes} phút đọc
                </small>
              </div>
            </div>
          </div>
          <div className="blog-cv">
            <CoverImage
              src={coverSrc}
              alt={doc.title}
              width={doc.coverWidth ?? 1200}
              height={doc.coverHeight ?? 630}
              priority
              className="h-auto w-full object-cover"
            />
          </div>
        </header>

        <PostShell
          toc={doc.toc}
          readingMinutes={doc.readingMinutes}
          templateHref={template ? `/tao-phong?mau=${template.slug}` : null}
          templateLabel="Dùng mẫu này"
          article={
            <article id="blog-article">
              <MdxBody source={doc.body} assetMap={doc.assetMap} summary={doc.summary} />
              <FaqAccordion items={doc.faq} />
              {template ? <TemplateCta slug={template.slug} /> : null}
              <aside className="blog-author glass">
                <div>
                  <b>{doc.author}</b>
                  <p>Vote Đi giúp nhóm chốt quyết định nhanh: tạo phòng, gửi link, vote cùng nhau.</p>
                </div>
              </aside>
            </article>
          }
          rail={
            <>
              {template ? (
                <div className="blog-rc glass">
                  <div className="blog-rc-ic" aria-hidden>
                    {template.emoji}
                  </div>
                  <h4>{template.title}</h4>
                  <p>{template.intro}</p>
                  <Link href={`/tao-phong?mau=${template.slug}`} className="btn btn-primary">
                    Dùng mẫu này
                  </Link>
                </div>
              ) : null}
              <div className="blog-rc glass">
                <small className="t">Chia sẻ</small>
                <ShareButtons title={doc.title} path={path} />
              </div>
              {related.length ? (
                <div className="blog-rc glass blog-rel">
                  <small className="t">Bài liên quan</small>
                  {related.map((r) => (
                    <Link key={r.slug} href={`${basePath}/${r.slug}`}>
                      {r.title}
                      <small>
                        {r.readingMinutes} phút · {formatDate(r.date)}
                      </small>
                    </Link>
                  ))}
                </div>
              ) : null}
            </>
          }
        />

        {related.length ? (
          <section className="blog-more-h">
            <h2>Đọc tiếp</h2>
            <div className="blog-cards" style={{ marginTop: 16 }}>
              {related.slice(0, 3).map((r) => (
                <Link key={r.slug} href={`${basePath}/${r.slug}`} className="blog-card">
                  <div className="blog-thumb relative">
                    <CoverImage
                      src={r.cover ?? `${basePath}/${r.slug}/opengraph-image`}
                      alt={r.title}
                      width={r.coverWidth ?? 1200}
                      height={r.coverHeight ?? 630}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="blog-card-bd">
                    <h3>{r.title}</h3>
                    <p>{r.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
