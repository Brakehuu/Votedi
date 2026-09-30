import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/home/footer";
import { listContent } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";

export function generateStaticParams() {
  return listContent("blog").flatMap((p) => (p.tags ?? []).map((tag) => ({ tag })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  return {
    title: `Blog · ${decoded}`,
    description: `Bài viết chủ đề ${decoded} trên Vote Đi.`,
    alternates: { canonical: absoluteUrl(`/blog/chu-de/${tag}`) },
  };
}

export default async function BlogTagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const posts = listContent("blog").filter((p) => p.tags?.includes(decoded));
  if (!posts.length) notFound();

  return (
    <>
      <main className="mx-auto w-full max-w-3xl px-4 py-10 pb-24">
        <p className="text-sm font-semibold text-primary">Chủ đề</p>
        <h1 className="mt-1 text-3xl font-extrabold">{decoded}</h1>
        <ul className="mt-8 space-y-4">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link href={`/blog/${p.slug}`} className="glass block rounded-[22px] p-5">
                <b className="text-lg font-extrabold">{p.title}</b>
                <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/blog" className="mt-6 inline-flex text-sm font-semibold text-primary">
          ← Tất cả bài
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
