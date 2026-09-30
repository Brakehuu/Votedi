import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/home/footer";
import { TemplateLibrary } from "@/components/seo/template-library";
import { absoluteUrl, siteDescription } from "@/lib/site";
import { TEMPLATES } from "@/lib/templates";

export const metadata: Metadata = {
  title: "Mẫu phòng vote có sẵn",
  description:
    "Thư viện mẫu Vote Đi: áo lớp, ăn gì, lịch rảnh, điểm du lịch… Chọn mẫu rồi tạo phòng trong vài phút.",
  alternates: { canonical: absoluteUrl("/mau") },
  openGraph: {
    title: "Mẫu phòng vote có sẵn | Vote Đi",
    description: siteDescription,
    url: absoluteUrl("/mau"),
  },
};

export default function MauIndexPage() {
  return (
    <div>
      <main className="blog-wrap">
        <p className="text-sm font-semibold text-primary">Thư viện mẫu</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Mẫu phòng vote có sẵn</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {TEMPLATES.length} mẫu theo từng tình huống. Chọn một mẫu để tạo phòng, hoặc{" "}
          <Link href="/tao-phong" className="font-semibold text-primary">
            tự chọn kiểu vote
          </Link>
          .
        </p>
        <div className="mt-8">
          <TemplateLibrary />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
