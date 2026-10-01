import Link from "next/link";

export function HomeCta() {
  return (
    <div className="wrap">
      <section className="fin rv">
        <div>
          <h2>Còn tranh cãi thì cho vote luôn</h2>
          <p>Tạo phòng mất chưa tới một phút. Miễn phí, không cần tài khoản.</p>
          <Link href="/tao-phong" prefetch={false} className="btn">
            Tạo phòng miễn phí
          </Link>
        </div>
        <div className="tp">
          <Link href="/mau/hom-nay-an-gi">Hôm nay ăn gì</Link>
          <Link href="/mau/chon-ngay-hop-lop">Chọn ngày họp lớp</Link>
          <Link href="/mau/di-dau-choi-cuoi-tuan">Đi đâu chơi cuối tuần</Link>
          <Link href="/mau/chon-mau-ao-lop">Chọn áo lớp</Link>
          <Link href="/mau/chon-ngay-di-du-lich">Chọn ngày du lịch</Link>
        </div>
      </section>
    </div>
  );
}
