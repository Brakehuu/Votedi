import type { Metadata } from "next";
import { SiteFooter } from "@/components/home/footer";

export const metadata: Metadata = {
  title: "Quyền riêng tư",
  description: "Vote Đi thu thập những gì khi bạn tạo phòng và bình chọn.",
  alternates: { canonical: "/quyen-rieng-tu" },
};

export default function PrivacyPage() {
  return (
    <>
      <main className="wrap" style={{ padding: "48px 20px 80px", maxWidth: 760 }}>
        <h1 className="text-4xl font-extrabold tracking-tight">Quyền riêng tư</h1>
        <div className="mt-6 space-y-4 text-[15px] leading-7 text-muted-foreground">
          <p>Bạn không cần tài khoản. Lần đầu vào, trình duyệt được một phiên ẩn danh để nhớ phòng bạn đã tham gia.</p>
          <p>Trong phòng, Vote Đi lưu tên hiển thị, avatar, ảnh mẫu và phiếu bầu. Chỉ thành viên của phòng xem được các phiếu đó.</p>
          <p>Ảnh được lưu để cả nhóm xem và chốt mẫu. Vote Đi không bán dữ liệu và không dùng ảnh của bạn để huấn luyện hay quảng cáo.</p>
          <p>Mật khẩu phòng được băm trước khi lưu, không giữ bản gốc.</p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
