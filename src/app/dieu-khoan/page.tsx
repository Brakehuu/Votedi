import type { Metadata } from "next";
import { SiteFooter } from "@/components/home/footer";

export const metadata: Metadata = {
  title: "Điều khoản",
  description: "Điều khoản sử dụng Vote Đi khi tạo phòng và bình chọn mẫu.",
  alternates: { canonical: "/dieu-khoan" },
};

export default function TermsPage() {
  return (
    <>
      <main className="wrap" style={{ padding: "48px 20px 80px", maxWidth: 760 }}>
        <h1 className="text-4xl font-extrabold tracking-tight">Điều khoản</h1>
        <div className="mt-6 space-y-4 text-[15px] leading-7 text-muted-foreground">
          <p>Vote Đi là công cụ để nhóm bạn bình chọn mẫu. Bạn tự chịu trách nhiệm với nội dung và ảnh mình tải lên.</p>
          <p>Không dùng Vote Đi cho nội dung vi phạm pháp luật, xâm phạm bản quyền, hoặc làm phiền người khác.</p>
          <p>Ai có link đều vào được phòng, trừ khi chủ phòng bật mật khẩu. Hãy chỉ gửi link (và mật khẩu, nếu có) cho người bạn muốn mời. Vote Đi không khôi phục mật khẩu đã quên.</p>
          <p>Dịch vụ đang ở dạng miễn phí và có thể thay đổi, tạm ngừng, hoặc xóa phòng không còn hoạt động.</p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
