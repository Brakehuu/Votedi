import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/home/footer";
import { listContent } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Hướng dẫn dùng Vote Đi",
  description: "Cách tạo phòng, mời bạn qua Zalo, dán Google Maps và chọn kiểu vote phù hợp.",
  alternates: { canonical: absoluteUrl("/huong-dan") },
};

export default function HuongDanIndexPage() {
  const posts = listContent("huong-dan");
  return (
    <>
      <main className="mx-auto w-full max-w-3xl px-4 py-10 pb-24">
        <h1 className="text-3xl font-extrabold tracking-tight">Hướng dẫn</h1>
        <p className="mt-2 text-muted-foreground">Bắt đầu nhanh với Vote Đi — ngắn gọn, làm được ngay.</p>
        <ul className="mt-8 space-y-3">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link href={`/huong-dan/${p.slug}`} className="glass flex items-start justify-between gap-3 rounded-[20px] p-4">
                <span>
                  <b className="block font-extrabold">{p.title}</b>
                  <span className="mt-1 block text-sm text-muted-foreground">{p.description}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-muted-foreground">{p.readingMinutes} phút</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </>
  );
}
