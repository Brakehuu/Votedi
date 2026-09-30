import type { Metadata } from "next";
import { SiteFooter } from "@/components/home/footer";
import { ContactForm } from "@/components/seo/contact-form";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Liên hệ / góp ý",
  description: "Gửi góp ý, báo lỗi hoặc ý tưởng cho đội ngũ Vote Đi.",
  alternates: { canonical: absoluteUrl("/lien-he") },
};

export default function LienHePage() {
  return (
    <>
      <main className="mx-auto w-full max-w-lg px-4 py-10 pb-24">
        <h1 className="text-3xl font-extrabold tracking-tight">Liên hệ</h1>
        <p className="mt-2 text-muted-foreground">
          Góp ý, báo lỗi hoặc đề xuất mẫu mới. Chúng mình đọc mọi tin gửi tới.
        </p>
        <div className="mt-8">
          <ContactForm />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
