"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Chip, ChipRow } from "@/components/content/chip";
import { formatDateVi, readingLabel } from "@/lib/content/display";

export type BlogCardPost = {
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
  tags?: string[];
};

export function BlogIndexView({
  posts,
  topics,
  allCount,
  activeTopicSlug,
  heroChip,
  title,
  titleEm,
  lead,
  featuredNewest,
}: {
  posts: BlogCardPost[];
  topics: { name: string; slug: string; count: number }[];
  allCount: number;
  activeTopicSlug?: string | null;
  heroChip: string;
  title: string;
  titleEm?: string;
  lead: string;
  featuredNewest?: boolean;
}) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const filtered = query
    ? posts.filter(
        (p) => p.title.toLowerCase().includes(query) || p.description.toLowerCase().includes(query),
      )
    : posts;

  const featured = featuredNewest && !query && !activeTopicSlug ? filtered[0] : null;
  const rest = featured ? filtered.slice(1) : filtered;

  return (
    <>
      <header className="blog-hero">
        <div>
          <ChipRow>
            <Chip>{heroChip}</Chip>
          </ChipRow>
          <h1>
            {title}
            {titleEm ? (
              <>
                {" "}
                <em>{titleEm}</em>
              </>
            ) : null}
          </h1>
          <p>{lead}</p>
        </div>
        <label className="blog-search">
          <svg viewBox="0 0 24 24" aria-hidden>
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            placeholder="Tìm bài viết..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Tìm bài viết"
          />
        </label>
      </header>

      <div className="blog-chips" role="navigation" aria-label="Chủ đề">
        <Link href="/blog" className={`blog-tab ${!activeTopicSlug ? "on" : ""}`}>
          Tất cả <small>{allCount}</small>
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
            <ChipRow>
              <Chip>Bài mới nhất</Chip>
              {featured.primaryTopic ? <Chip muted>{featured.primaryTopic}</Chip> : null}
            </ChipRow>
            <h2>{featured.title}</h2>
            <p>{featured.description}</p>
            <div className="blog-meta">
              <span>{formatDateVi(featured.date)}</span>
              <i />
              <span>{readingLabel(featured.readingMinutes)}</span>
            </div>
            <span className="btn btn-primary" style={{ alignSelf: "flex-start", marginTop: 4 }}>
              Đọc bài viết
            </span>
          </div>
        </Link>
      ) : null}

      {rest.length && featured ? <h2 className="blog-grid-h">Bài viết khác</h2> : null}

      <div className="blog-cards">
        {rest.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`} className="blog-card">
            <div className="blog-thumb">
              <CardCover post={p} />
            </div>
            <div className="blog-card-bd">
              <ChipRow>
                {p.primaryTopic ? <Chip>{p.primaryTopic}</Chip> : null}
              </ChipRow>
              <h3>{p.title}</h3>
              <p>{p.description}</p>
              <div className="blog-meta">
                <span>{formatDateVi(p.date)}</span>
                <i />
                <span>{readingLabel(p.readingMinutes)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {!filtered.length ? (
        <p className="blog-empty">Chưa có bài nào khớp. Thử từ khóa khác hoặc chọn &quot;Tất cả&quot;.</p>
      ) : null}
    </>
  );
}

function CardCover({
  post,
  priority,
}: {
  post: BlogCardPost;
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
