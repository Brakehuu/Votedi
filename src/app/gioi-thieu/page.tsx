import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/home/footer";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Giới thiệu Vote Đi",
  description:
    "Vote Đi là công cụ tạo bình chọn online miễn phí cho nhóm: áo lớp, quán ăn, lịch rảnh… Không cần tài khoản.",
  alternates: { canonical: absoluteUrl("/gioi-thieu") },
};

export default function GioiThieuPage() {
  return (
    <>
      <main className="mx-auto w-full max-w-2xl space-y-10 px-4 py-10 pb-24">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Vote Đi là gì?</h1>
          <p className="mt-3 text-muted-foreground">
            Vote Đi giúp nhóm bạn chốt một quyết định nhanh và công bằng: tạo phòng, thêm lựa chọn, gửi
            link Zalo. Mọi người vote trên điện thoại, kết quả rõ ràng ngay.
          </p>
        </div>
        <section>
          <h2 className="text-xl font-extrabold">Dùng cho ai?</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Lớp học chọn áo, concept kỷ yếu, ngày họp lớp</li>
            <li>Team công ty chọn logo, đồng phục, giờ họp, teambuilding</li>
            <li>Nhóm bạn chọn quán, phim, điểm chơi cuối tuần</li>
            <li>Gia đình đặt tên, chọn quà, lịch đi chơi</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-extrabold">Cách hoạt động</h2>
          <ol className="mt-3 space-y-3">
            {[
              "Tạo phòng từ mẫu hoặc kiểu vote",
              "Thêm lựa chọn (ảnh, chữ, Maps, link) hoặc khoảng ngày",
              "Gửi link — bạn bè vào vote không cần đăng ký",
              "Chốt kết quả, chia sẻ hoặc xuất lịch",
            ].map((s, i) => (
              <li key={s} className="glass flex gap-3 rounded-[16px] p-3 text-sm font-semibold">
                <span className="grid size-8 place-items-center rounded-full bg-foreground text-background">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </section>
        <section className="glass rounded-[22px] p-5">
          <h2 className="text-xl font-extrabold">Cam kết</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>✓ Miễn phí để tạo và tham gia vote nhóm</li>
            <li>✓ Không bắt buộc tài khoản — vào bằng link</li>
            <li>✓ Có thể đặt mật khẩu phòng và chế độ ẩn danh</li>
          </ul>
        </section>
        <Link href="/tao-phong" className="btn btn-primary inline-flex min-h-12">
          Tạo phòng miễn phí
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
