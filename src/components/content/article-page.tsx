import Link from "next/link";
import { SiteFooter } from "@/components/home/footer";
import { CoverImage, TemplateCta } from "@/components/content/mdx-components";
import { MdxBody } from "@/components/content/mdx-body";
import { FaqAccordion } from "@/components/content/article-chrome";
import { Chip, ChipRow } from "@/components/content/chip";
import { ShareButtons } from "@/components/content/share-buttons";
import { PostShell } from "@/components/content/post-shell";
import { TemplateIcon } from "@/components/seo/template-icon";
import type { ContentDoc } from "@/lib/content";
import { formatDateVi, readingLabel } from "@/lib/content/display";
import { getTemplate } from "@/lib/templates";
import { absoluteUrl } from "@/lib/site";
import { breadcrumbList, faqPage, jsonLd } from "@/lib/seo";

export function ArticlePage({
  doc,
  related,
  basePath,
  prev,
  next,
}: {
  doc: ContentDoc;
  related: ContentDoc[];
  basePath: "/blog" | "/huong-dan";
  prev?: ContentDoc | null;
  next?: ContentDoc | null;
}) {
  const path = `${basePath}/${doc.slug}`;
  const shareUrl = absoluteUrl(path);
  const template = doc.template ? getTemplate(doc.template) : null;
  const extraTags = doc.tags.filter((t) => t !== doc.primaryTopic).slice(0, 2);
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
      mainEntityOfPage: shareUrl,
    },
    { "@context": "https://schema.org", ...breadcrumbList(crumbs) },
  ];
  if (doc.faq.length) {
    json.push({ "@context": "https://schema.org", ...faqPage(doc.faq) });
  }

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(json)} />
      <main className={`blog-wrap ${basePath === "/huong-dan" ? "guide-prose" : ""}`}>
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
            <ChipRow>
              {doc.primaryTopic && doc.primaryTopicSlug && basePath === "/blog" ? (
                <Chip href={`/blog/chu-de/${doc.primaryTopicSlug}`}>{doc.primaryTopic}</Chip>
              ) : (
                <Chip>{basePath === "/blog" ? "Blog" : "Hướng dẫn"}</Chip>
              )}
              {extraTags.map((t) => (
                <Chip key={t} muted>
                  {t}
                </Chip>
              ))}
              {doc.draft ? <Chip muted>Nháp</Chip> : null}
            </ChipRow>
            <h1>{doc.title}</h1>
            <p className="blog-lede">{doc.description}</p>
            <div className="blog-by">
              <div>
                <b>{doc.author}</b>
                <small>
                  Cập nhật {formatDateVi(doc.updated)} · {readingLabel(doc.readingMinutes)}
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
              <ShareButtons title={doc.title} url={shareUrl} variant="mobile" />
              {basePath === "/huong-dan" ? (
                <aside className="blog-tcta">
                  <span className="blog-tcta-ic" aria-hidden>
                    +
                  </span>
                  <div>
                    <b>Tạo phòng thử</b>
                    <span>Miễn phí, không cần tài khoản. Gửi link Zalo là cả nhóm vote được.</span>
                  </div>
                  <Link href="/tao-phong" className="btn btn-primary btn-sm shrink-0">
                    Tạo phòng thử
                  </Link>
                </aside>
              ) : null}
              <aside className="blog-author glass">
                <div>
                  <b>{doc.author}</b>
                  <p>
                    Đội ngũ Vote Đi viết về cách chốt việc chung cho nhóm bạn, lớp và team. Có góp ý cho bài viết? Nhắn
                    cho chúng mình ở trang Liên hệ.
                  </p>
                </div>
              </aside>
              {prev || next ? (
                <nav className="guide-pager" aria-label="Hướng dẫn trước và tiếp theo">
                  {prev ? (
                    <Link href={`${basePath}/${prev.slug}`}>
                      <small>Hướng dẫn trước</small>
                      {prev.title}
                    </Link>
                  ) : (
                    <span />
                  )}
                  {next ? (
                    <Link href={`${basePath}/${next.slug}`}>
                      <small>Hướng dẫn tiếp theo</small>
                      {next.title}
                    </Link>
                  ) : null}
                </nav>
              ) : null}
            </article>
          }
          rail={
            <>
              {template ? (
                <div className="blog-rc glass">
                  <div className="blog-rc-ic" aria-hidden>
                    <TemplateIcon template={template} className="tpl-ic-on-grad" />
                  </div>
                  <h4>{template.title}</h4>
                  <p>{template.intro}</p>
                  <Link href={`/tao-phong?mau=${template.slug}`} className="btn btn-primary">
                    Dùng mẫu này
                  </Link>
                </div>
              ) : null}
              <div className="blog-rc glass">
                <small className="t">Chia sẻ bài viết</small>
                <ShareButtons title={doc.title} url={shareUrl} variant="rail" />
              </div>
              {related.length ? (
                <div className="blog-rc glass blog-rel">
                  <small className="t">Bài liên quan</small>
                  {related.map((r) => (
                    <Link key={r.slug} href={`${basePath}/${r.slug}`}>
                      {r.title}
                      <small>{readingLabel(r.readingMinutes)}</small>
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
                    <ChipRow>{r.primaryTopic ? <Chip>{r.primaryTopic}</Chip> : null}</ChipRow>
                    <h3>{r.title}</h3>
                    <div className="blog-meta">
                      <span>{formatDateVi(r.date)}</span>
                      <i />
                      <span>{readingLabel(r.readingMinutes)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {basePath === "/huong-dan" ? (
          <section className="blog-band" style={{ marginTop: 48 }}>
            <div>
              <h2>Tạo phòng thử</h2>
              <p>Miễn phí, không cần tài khoản. Gửi link Zalo là cả nhóm vote được.</p>
              <Link href="/tao-phong" className="btn">
                Tạo phòng miễn phí
              </Link>
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
