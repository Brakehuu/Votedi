import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export function SiteFooter() {
  return (
    <div className="wrap">
      <footer className="site-footer">
        <div>
          <Link href="/" aria-label="Vote Đi">
            <Logo />
          </Link>
          <p>Bình chọn mẫu áo, logo, sản phẩm online kiểu World Cup cho nhóm bạn, lớp và team.</p>
        </div>
        <div className="flinks">
          <Link href="/tao-phong">Tạo phòng</Link>
          <Link href="/phong-cua-toi">Phòng của tôi</Link>
          <Link href="/#hoi-dap">Hỏi đáp</Link>
          <Link href="/dieu-khoan">Điều khoản</Link>
          <Link href="/quyen-rieng-tu">Quyền riêng tư</Link>
        </div>
        <div className="copy">© 2026 Vote Đi</div>
      </footer>
    </div>
  );
}
