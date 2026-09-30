import Link from "next/link";

export function BlogCtaBand() {
  return (
    <section className="blog-band">
      <div>
        <h2>Sẵn sàng chốt cùng nhóm?</h2>
        <p>Tạo phòng miễn phí, gửi link Zalo, cả nhóm vote trong vài phút.</p>
        <Link href="/tao-phong" className="btn">
          Tạo phòng miễn phí
        </Link>
      </div>
      <div className="blog-tpls">
        <Link href="/mau/chon-ngay-hop-lop">Chọn ngày họp lớp</Link>
        <Link href="/mau/hom-nay-an-gi">Hôm nay ăn gì</Link>
        <Link href="/mau/chon-mau-ao-lop">Chọn áo lớp</Link>
        <Link href="/mau">Xem tất cả mẫu</Link>
      </div>
    </section>
  );
}
