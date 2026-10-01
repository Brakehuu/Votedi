import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { FORMAT_LIST } from "@/lib/formats";
import { getTemplate } from "@/lib/templates";

/** Khớp thứ tự footer mockup v5. */
const FOOTER_POPULAR = [
  "hom-nay-an-gi",
  "chon-ngay-hop-lop",
  "chon-mau-ao-lop",
  "di-dau-choi-cuoi-tuan",
] as const;

export function SiteFooter() {
  const formats = FORMAT_LIST.filter((f) => f.available).slice(0, 4);
  const popular = FOOTER_POPULAR.map((s) => getTemplate(s)).filter(Boolean);

  return (
    <div className="wrap">
      <footer className="site-footer">
        <div>
          <Link href="/" className="brand" aria-label="Vote Đi">
            <Logo />
          </Link>
          <p>
            Trang web tạo bình chọn online giúp hội bạn, lớp và team chốt nhanh: địa điểm ăn chơi, ngày đi, mẫu áo.
          </p>
        </div>
        <div>
          <p className="footer-h">Kiểu vote</p>
          <ul>
            {formats.map((f) => (
              <li key={f.id}>
                <Link href={`/kieu-vote/${f.slug}`}>{f.name}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="footer-h">Mẫu phổ biến</p>
          <ul>
            {popular.map((t) =>
              t ? (
                <li key={t.slug}>
                  <Link href={`/mau/${t.slug}`}>{t.title}</Link>
                </li>
              ) : null,
            )}
          </ul>
        </div>
        <div>
          <p className="footer-h">Tài nguyên</p>
          <ul>
            <li>
              <Link href="/huong-dan">Hướng dẫn</Link>
            </li>
            <li>
              <Link href="/blog">Blog</Link>
            </li>
            <li>
              <Link href="/gioi-thieu">Giới thiệu</Link>
            </li>
            <li>
              <Link href="/lien-he">Liên hệ</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="footer-h">Pháp lý</p>
          <ul>
            <li>
              <Link href="/dieu-khoan">Điều khoản</Link>
            </li>
            <li>
              <Link href="/quyen-rieng-tu">Quyền riêng tư</Link>
            </li>
          </ul>
        </div>
        <div className="copy">© 2026 Vote Đi · votedi.vn</div>
      </footer>
    </div>
  );
}
