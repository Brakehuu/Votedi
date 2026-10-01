import Link from "next/link";
import { HeroShowcase } from "@/components/home/hero-showcase";

function Check() {
  return (
    <svg viewBox="0 0 16 16" width={15} height={15} aria-hidden>
      <path
        d="M3 8.5 6.5 12 13 4.5"
        stroke="currentColor"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HomeHero() {
  return (
    <section className="hero wrap">
      <div>
        <div className="proof glass">
          <div className="stack">
            <span className="av" style={{ background: "#0EA5A4" }}>
              H
            </span>
            <span className="av" style={{ background: "#0891B2" }}>
              L
            </span>
            <span className="av" style={{ background: "#F59E0B" }}>
              M
            </span>
            <span className="av" style={{ background: "#E5484D" }}>
              T
            </span>
          </div>
          <span className="live" />
          <span>
            <strong>Cả nhóm vote cùng lúc</strong>, thấy ai chọn gì
          </span>
        </div>

        <h1>
          <span className="q">
            Cả nhóm rủ nhau chọn nhưng <em>mãi không chốt được?</em>
          </span>
          <span className="a">
            <span className="pill">Vote Đi</span>
            <span>để chốt ngay!</span>
          </span>
        </h1>

        <p className="lead">
          Trang web tạo bình chọn online giúp hội bạn, lớp và team chốt nhanh: đi đâu chơi, ăn gì, ngày nào ai rảnh, mẫu
          áo nào. Gửi link Zalo là vote được. <strong>Hết giờ là có kết quả.</strong>
        </p>

        <div className="cta" data-hero-cta>
          <Link href="/tao-phong" prefetch={false} className="btn btn-primary btn-p">
            Tạo phòng miễn phí
          </Link>
          <a href="#kieu-vote" className="btn btn-g">
            Xem các kiểu vote
          </a>
        </div>
        <div className="ticks">
          <span>
            <Check />
            Không cần tài khoản
          </span>
          <span>
            <Check />
            Có link là vào
          </span>
          <span>
            <Check />
            Làm cho điện thoại
          </span>
        </div>
      </div>

      <HeroShowcase />
    </section>
  );
}
