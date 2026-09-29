import Link from "next/link";
import { MatchDemo } from "@/components/home/match-demo";

function Check() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden>
      <path
        d="M3 8.5 6.5 12 13 4.5"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HomeHero() {
  return (
    <div className="hero">
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
            Cả nhóm rủ nhau chọn mẫu nhưng <em>mãi không chốt được?</em>
          </span>
          <span className="a">
            <span className="pill">Vote Đi</span>
            <span>để chốt ngay!</span>
          </span>
        </h1>

        <p className="lead">
          Tải ảnh mẫu áo, logo, sản phẩm lên rồi gửi link cho cả nhóm. Vote vòng loại, đấu loại trực tiếp như World
          Cup. <strong>Hết giờ là có mẫu vô địch.</strong>
        </p>

        <div className="hero-cta" data-hero-cta>
          <Link href="/tao-phong" className="btn btn-primary">
            Tạo phòng miễn phí
          </Link>
          <a href="#cach-hoat-dong" className="btn btn-ghost">
            Xem cách hoạt động
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

      <MatchDemo />
    </div>
  );
}
