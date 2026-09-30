import Link from "next/link";

export function BlogCtaBand() {
  return (
    <section className="blog-band">
      <div>
        <h2>Cả nhóm còn đang cãi nhau?</h2>
        <p>Tạo phòng vote trong 1 phút, gửi link Zalo là cả nhóm vote được. Miễn phí, không cần tài khoản.</p>
        <Link href="/tao-phong" className="btn">
          Tạo phòng miễn phí
        </Link>
      </div>
      <div className="blog-tpls">
        <Link href="/mau/hom-nay-an-gi">Hôm nay ăn gì</Link>
        <Link href="/mau/chon-ngay-hop-lop">Chọn ngày họp lớp</Link>
        <Link href="/mau/di-dau-choi-cuoi-tuan">Đi đâu chơi cuối tuần</Link>
        <Link href="/mau/chon-mau-ao-lop">Chọn áo lớp</Link>
        <Link href="/mau/chon-ngay-di-du-lich">Chọn ngày du lịch</Link>
      </div>
    </section>
  );
}
