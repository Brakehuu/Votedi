"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { MdxFigure, FaqAccordion, ShareButtons } from "@/components/content/article-chrome";

export { MdxFigure, FaqAccordion, ShareButtons };

export function ShareButtonsClient({ title, path }: { title: string; path: string }) {
  return <ShareButtons title={title} path={path} />;
}

/** Client search/filter for blog index cards (title + description). */
export function BlogSearch({
  posts,
  topics,
  activeTopicSlug,
  allCount,
}: {
  posts: {
    slug: string;
    title: string;
    description: string;
    date: string;
    readingMinutes: number;
    primaryTopic: string | null;
    primaryTopicSlug: string | null;
    cover: string | null;
    coverWidth: number | null;
    coverHeight: number | null;
    generatedCover: boolean;
  }[];
  topics: { name: string; slug: string; count: number }[];
  activeTopicSlug?: string | null;
  allCount?: number;
}) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const filtered = query
    ? posts.filter(
        (p) => p.title.toLowerCase().includes(query) || p.description.toLowerCase().includes(query),
      )
    : posts;

  const featured = !query && !activeTopicSlug ? filtered[0] : null;
  const rest = featured ? filtered.slice(1) : filtered;
  const totalLabel = allCount ?? topics.reduce((s, t) => s + t.count, 0);

  return (
    <>
      <div className="blog-search">
        <svg viewBox="0 0 24 24" aria-hidden>
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          placeholder="Tìm bài viết…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Tìm bài viết"
        />
      </div>

      <div className="blog-chips" role="navigation" aria-label="Chủ đề">
        <Link href="/blog" className={`blog-tab ${!activeTopicSlug ? "on" : ""}`}>
          Tất cả <small>{totalLabel}</small>
        </Link>
        {topics.map((t) => (
          <Link
            key={t.slug}
            href={`/blog/chu-de/${t.slug}`}
            className={`blog-tab ${activeTopicSlug === t.slug ? "on" : ""}`}
          >
            {t.name} <small>{t.count}</small>
          </Link>
        ))}
      </div>

      {featured ? (
        <Link href={`/blog/${featured.slug}`} className="blog-feat glass">
          <div className="blog-feat-im">
            <CardCover post={featured} priority />
          </div>
          <div className="blog-feat-tx">
            {featured.primaryTopic ? <span className="chip">{featured.primaryTopic}</span> : null}
            <h2>{featured.title}</h2>
            <p>{featured.description}</p>
            <div className="blog-meta">
              <span>{featured.readingMinutes} phút đọc</span>
              <i />
              <span>{featured.date}</span>
            </div>
          </div>
        </Link>
      ) : null}

      <div className="blog-cards">
        {rest.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`} className="blog-card">
            <div className="blog-thumb">
              <CardCover post={p} />
            </div>
            <div className="blog-card-bd">
              {p.primaryTopic ? <span className="chip">{p.primaryTopic}</span> : null}
              <h3>{p.title}</h3>
              <p>{p.description}</p>
              <div className="blog-meta">
                <span>{p.readingMinutes} phút</span>
                <i />
                <span>{p.date}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {!filtered.length ? (
        <p className="blog-empty">Không thấy bài khớp “{q}”. Thử từ khoá khác nhé.</p>
      ) : null}
    </>
  );
}

function CardCover({
  post,
  priority,
}: {
  post: {
    title: string;
    cover: string | null;
    coverWidth: number | null;
    coverHeight: number | null;
    generatedCover: boolean;
    slug: string;
  };
  priority?: boolean;
}) {
  const src = post.cover ?? `/blog/${post.slug}/opengraph-image`;
  if (post.generatedCover || src.includes("opengraph-image")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className="h-full w-full object-cover" />
    );
  }
  return (
    <Image
      src={src}
      alt=""
      width={post.coverWidth ?? 1200}
      height={post.coverHeight ?? 630}
      sizes="(min-width:1180px) 400px, (min-width:768px) 50vw, 100vw"
      className="h-full w-full object-cover"
      priority={priority}
    />
  );
}
