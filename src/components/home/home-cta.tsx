import Link from "next/link";

export function HomeCta() {
  return (
    <div className="cta">
      <div>
        <h2>Còn tranh cãi thì cho đấu luôn</h2>
        <p>Tạo phòng mất chưa tới một phút.</p>
      </div>
      <Link href="/tao-phong" className="btn">
        Tạo phòng miễn phí
      </Link>
    </div>
  );
}
