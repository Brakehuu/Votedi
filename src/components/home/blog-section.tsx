import Image from "next/image";
import Link from "next/link";
import { Chip, ChipRow } from "@/components/content/chip";
import { formatDateVi, readingLabel } from "@/lib/content/display";
import type { ContentDoc } from "@/lib/content";

export function BlogSection({ posts }: { posts: ContentDoc[] }) {
  return (
    <section className="sec wrap" id="blog">
      <div className="sec-row rv">
        <div className="sec-h">
          <ChipRow>
            <Chip>Blog</Chip>
          </ChipRow>
          <h2>
            Mẹo chốt việc <em>cho cả nhóm</em>
          </h2>
        </div>
        <Link href="/blog" className="btn btn-g">
          Xem tất cả bài viết
        </Link>
      </div>
      <div className="bl">
        {posts.map((p) => {
          const src = p.cover ?? `/blog/${p.slug}/opengraph-image`;
          const generated = p.generatedCover || src.includes("opengraph-image");
          return (
            <Link key={p.slug} className="card rv" href={`/blog/${p.slug}`}>
              <div className="thumb">
                {generated ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" width={1200} height={630} loading="lazy" />
                ) : (
                  <Image
                    src={src}
                    alt=""
                    width={p.coverWidth ?? 1200}
                    height={p.coverHeight ?? 630}
                    sizes="(min-width:1100px) 400px, (min-width:640px) 50vw, 100vw"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="bd">
                <ChipRow>{p.primaryTopic ? <Chip>{p.primaryTopic}</Chip> : null}</ChipRow>
                <h3>{p.title}</h3>
                <div className="meta">
                  <span>{formatDateVi(p.date)}</span>
                  <i />
                  <span>{readingLabel(p.readingMinutes)}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
