"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, Layers, MapPin, Share2 } from "lucide-react";
import { Chip, ChipRow } from "@/components/content/chip";
import { readingLabel } from "@/lib/content/display";
import { GUIDE_FLOW, GUIDE_GROUPS as GROUP_DEFS } from "@/lib/guides";
import type { LucideIcon } from "lucide-react";

export type GuideCard = {
  slug: string;
  title: string;
  description: string;
  readingMinutes: number;
  tags?: string[];
};

const GROUP_ICONS: Record<string, LucideIcon> = {
  "Bắt đầu": CalendarDays,
  "Thêm lựa chọn": MapPin,
  "Các kiểu vote": Layers,
  "Mời bạn bè": Share2,
};

const QUICK = [
  { n: 1, title: "Tạo phòng", slug: "cach-tao-phong-vote", blurb: "Chọn mẫu hoặc kiểu vote, thêm lựa chọn, xong là có link." },
  { n: 2, title: "Mời bạn bè", slug: "cach-moi-ban-be-qua-zalo", blurb: "Gửi link Zalo. Bạn bè vào vote trên trình duyệt, không cài app." },
  { n: 3, title: "Vote và chốt", slug: "cac-kieu-vote-khac-nhau", blurb: "Cả nhóm vote, xem kết quả, host chốt một chạm." },
] as const;

export function GuideIndexView({ posts }: { posts: GuideCard[] }) {
  const [q, setQ] = useState("");
  const bySlug = useMemo(() => new Map(posts.map((p) => [p.slug, p])), [posts]);
  const query = q.trim().toLowerCase();
  const filtered = query
    ? posts.filter(
        (p) => p.title.toLowerCase().includes(query) || p.description.toLowerCase().includes(query),
      )
    : null;

  return (
    <>
      <header className="blog-hero is-guide">
        <div>
          <ChipRow>
            <Chip>Hướng dẫn</Chip>
          </ChipRow>
          <h1>
            Từ tạo phòng đến chốt kết quả <em>trong 3 bước</em>
          </h1>
          <p>Tạo phòng, mời bạn, thêm lựa chọn và chọn kiểu vote — ngắn gọn, làm theo từng bước trên điện thoại.</p>
        </div>
        <label className="blog-search">
          <svg viewBox="0 0 24 24" aria-hidden>
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            placeholder="Tìm hướng dẫn..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Tìm hướng dẫn"
          />
        </label>
      </header>

      {!filtered ? (
        <section className="guide-start" aria-label="Bắt đầu nhanh">
          {QUICK.map((item) => (
            <Link key={item.n} href={`/huong-dan/${item.slug}`} className="guide-start-card glass">
              <b className="n">{item.n}</b>
              <strong>{item.title}</strong>
              <span>{item.blurb}</span>
            </Link>
          ))}
        </section>
      ) : null}

      {filtered ? (
        <div className="guide-cards">
          {filtered.map((p) => (
            <GuideCardLink key={p.slug} post={p} Icon={Layers} />
          ))}
        </div>
      ) : (
        GROUP_DEFS.map((group) => {
          const items = group.slugs.map((s) => bySlug.get(s)).filter(Boolean) as GuideCard[];
          const extras = posts.filter(
            (p) => !GUIDE_FLOW.includes(p.slug) && group.title === "Bắt đầu",
          );
          const list = group.title === "Bắt đầu" ? [...items, ...extras] : items;
          if (!list.length) return null;
          const Icon = GROUP_ICONS[group.title] ?? Layers;
          return (
            <section key={group.title} className="guide-group">
              <h2>{group.title}</h2>
              <div className="guide-cards">
                {list.map((p) => (
                  <GuideCardLink key={p.slug} post={p} Icon={Icon} />
                ))}
              </div>
            </section>
          );
        })
      )}

      {filtered && !filtered.length ? (
        <p className="blog-empty">Chưa có hướng dẫn khớp. Thử từ khóa khác.</p>
      ) : null}
    </>
  );
}

function GuideCardLink({ post, Icon }: { post: GuideCard; Icon: LucideIcon }) {
  return (
    <Link href={`/huong-dan/${post.slug}`} className="guide-card glass">
      <span className="guide-card-ic" aria-hidden>
        <Icon strokeWidth={1.9} />
      </span>
      <ChipRow>
        <Chip>Hướng dẫn</Chip>
      </ChipRow>
      <h3>{post.title}</h3>
      <p>{post.description}</p>
      <div className="guide-card-go">
        <span>Xem hướng dẫn</span>
        <small>{readingLabel(post.readingMinutes)}</small>
      </div>
    </Link>
  );
}
