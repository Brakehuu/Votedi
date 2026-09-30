import type { Metadata } from "next";
import { SiteFooter } from "@/components/home/footer";
import { BlogCtaBand } from "@/components/content/blog-cta";
import { GuideIndexView } from "@/components/content/guide-index";
import { listContent } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Hướng dẫn dùng Vote Đi",
  description: "Từ tạo phòng đến chốt kết quả trong 3 bước. Cách mời bạn qua Zalo, dán Google Maps và chọn kiểu vote.",
  alternates: { canonical: absoluteUrl("/huong-dan") },
};

export default function HuongDanIndexPage() {
  const posts = listContent("huong-dan").map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    readingMinutes: p.readingMinutes,
    tags: p.tags,
  }));
  return (
    <div>
      <main className="blog-wrap">
        <GuideIndexView posts={posts} />
        <BlogCtaBand />
      </main>
      <SiteFooter />
    </div>
  );
}
