import Link from "next/link";
import { SiteFooter } from "@/components/home/footer";
import { POPULAR_TEMPLATE_SLUGS, getTemplate } from "@/lib/templates";

export default function NotFound() {
  const popular = POPULAR_TEMPLATE_SLUGS.map((s) => getTemplate(s)).filter(Boolean);

  return (
    <>
      <main className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-start justify-center gap-4 px-4 py-16">
        <h1 className="text-3xl font-extrabold">Không thấy trang này</h1>
        <p className="text-muted-foreground">Link có thể sai, hoặc trang đã đổi địa chỉ.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="btn btn-primary">
            Về trang chủ
          </Link>
          <Link href="/mau" className="btn btn-g">
            Xem mẫu
          </Link>
        </div>
        <div className="mt-6 w-full">
          <p className="text-sm font-bold">Mẫu phổ biến</p>
          <ul className="mt-2 space-y-2">
            {popular.map((t) =>
              t ? (
                <li key={t.slug}>
                  <Link href={`/mau/${t.slug}`} className="font-semibold text-primary">
                    {t.emoji} {t.title}
                  </Link>
                </li>
              ) : null,
            )}
          </ul>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
