import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { TemplateIcon } from "@/components/seo/template-icon";
import { FORMAT_LIST } from "@/lib/formats";
import { POPULAR_TEMPLATE_SLUGS, getTemplate } from "@/lib/templates";

export function SiteFooter() {
  const formats = FORMAT_LIST.filter((f) => f.available);
  const popular = POPULAR_TEMPLATE_SLUGS.map((s) => getTemplate(s)).filter(Boolean);

  return (
    <div className="wrap">
      <footer className="site-footer !grid-cols-1 gap-8 sm:!grid-cols-2 lg:!grid-cols-4">
        <div>
          <Link href="/" aria-label="Vote Đi">
            <Logo />
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">
            Tạo bình chọn online miễn phí cho nhóm — không cần tài khoản.
          </p>
        </div>
        <div>
          <p className="mb-2 text-sm font-extrabold">
            <Link href="/kieu-vote">Kiểu vote</Link>
          </p>
          <div className="flinks !flex-col !items-start gap-1.5">
            {formats.map((f) => (
              <Link key={f.id} href={`/kieu-vote/${f.slug}`}>
                {f.name}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-extrabold">Mẫu phổ biến</p>
          <div className="flinks !flex-col !items-start gap-1.5">
            {popular.map((t) =>
              t ? (
                <Link key={t.slug} href={`/mau/${t.slug}`} className="inline-flex items-center gap-2">
                  <TemplateIcon template={t} className="tpl-ic-sm" />
                  {t.title}
                </Link>
              ) : null,
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-extrabold">Tài nguyên</p>
            <div className="flinks !flex-col !items-start gap-1.5">
              <Link href="/huong-dan">Hướng dẫn</Link>
              <Link href="/blog">Blog</Link>
              <Link href="/gioi-thieu">Giới thiệu</Link>
              <Link href="/lien-he">Liên hệ</Link>
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-extrabold">Pháp lý</p>
            <div className="flinks !flex-col !items-start gap-1.5">
              <Link href="/dieu-khoan">Điều khoản</Link>
              <Link href="/quyen-rieng-tu">Quyền riêng tư</Link>
            </div>
          </div>
        </div>
        <div className="copy sm:col-span-2 lg:col-span-4">© 2026 Vote Đi</div>
      </footer>
    </div>
  );
}
