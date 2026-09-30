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
      <main className="blog-wrap">
        <header className="blog-hero">
          <div>
            <p className="text-sm font-semibold text-primary">Hướng dẫn</p>
            <h1>
              Làm được <em>ngay trên điện thoại</em>
            </h1>
            <p>Tạo phòng, mời bạn, dán Maps và chọn kiểu vote — ngắn gọn, làm theo từng bước.</p>
          </div>
        </header>
        <div className="blog-cards" style={{ marginTop: 8 }}>
          {posts.map((p) => (
            <Link key={p.slug} href={`/huong-dan/${p.slug}`} className="blog-card">
              <div className="blog-card-bd">
                <span className="chip">Hướng dẫn</span>
                <h3>{p.title}</h3>
                <p>{p.description}</p>
                <div className="blog-meta">
                  <span>{p.readingMinutes} phút đọc</span>
                  <i />
                  <span>{p.updated}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
