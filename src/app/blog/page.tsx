import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/home/footer";
import { allTags, listContent } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Blog Vote Đi",
  description: "Mẹo tổ chức bình chọn nhóm, chọn lịch, áo lớp và nhiều tình huống thực tế.",
  alternates: { canonical: absoluteUrl("/blog") },
};

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tag = typeof sp["chu-de"] === "string" ? sp["chu-de"] : undefined;
  const all = listContent("blog");
  const tags = allTags("blog");
  const posts = tag ? all.filter((p) => p.tags?.includes(tag)) : all;

  return (
    <>
      <main className="mx-auto w-full max-w-3xl px-4 py-10 pb-24">
        <h1 className="text-3xl font-extrabold tracking-tight">Blog</h1>
        <p className="mt-2 text-muted-foreground">Góc chia sẻ cách chốt quyết định cùng nhóm.</p>
        {tags.length ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/blog"
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${!tag ? "border-primary bg-primary-soft text-primary" : "border-[var(--line)]"}`}
            >
              Tất cả
            </Link>
            {tags.map((t) => (
              <Link
                key={t}
                href={`/blog/chu-de/${encodeURIComponent(t)}`}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${tag === t ? "border-primary bg-primary-soft text-primary" : "border-[var(--line)]"}`}
              >
                {t}
              </Link>
            ))}
          </div>
        ) : null}
        <ul className="mt-8 space-y-4">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link href={`/blog/${p.slug}`} className="glass block rounded-[22px] p-5">
                <b className="text-lg font-extrabold">{p.title}</b>
                <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {p.readingMinutes} phút đọc · cập nhật {p.updated ?? p.date}
                </p>
              </Link>
            </li>
          ))}
        </ul>
        {!posts.length ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Bài mới đang soạn. Xem{" "}
            <Link href="/huong-dan" className="font-semibold text-primary">
              Hướng dẫn
            </Link>{" "}
            để bắt đầu ngay.
          </p>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
