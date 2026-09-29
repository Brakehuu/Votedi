import type { ReactNode } from "react";
import { DrawDemo } from "@/components/home/draw-demo";

const FEATURES: { title: string; body: string; icon: ReactNode }[] = [
  {
    title: "Thấy ai vote mẫu nào",
    body: "Avatar hiện ngay dưới mẫu, cập nhật trực tiếp.",
    icon: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M3 19c.8-3 3.2-4.5 6-4.5s5.2 1.5 6 4.5M16 5a3.5 3.5 0 0 1 0 7M18 14.8c1.6.6 2.6 2 3 4.2" />
      </>
    ),
  },
  {
    title: "Bấm ảnh để xem to",
    body: "Phóng to, vuốt qua lại giữa hai mẫu rồi mới chọn.",
    icon: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5M11 8v6M8 11h6" />
      </>
    ),
  },
  {
    title: "Hẹn giờ tự đóng vote",
    body: "Đủ người hoặc hết giờ là tự sang vòng sau.",
    icon: (
      <>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l3 2M9 2h6" />
      </>
    ),
  },
  {
    title: "Chủ phòng điều khiển",
    body: "Gia hạn giờ, kết thúc sớm, khóa phòng, mời ra.",
    icon: (
      <>
        <path d="M4 6h16M4 12h10M4 18h7" />
        <circle cx="18" cy="16" r="3" />
      </>
    ),
  },
  {
    title: "Mật khẩu tùy chọn",
    body: "Mặc định có link là vào. Cần riêng tư thì bật mật khẩu phòng.",
    icon: (
      <>
        <rect x="5" y="11" width="14" height="10" rx="3" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </>
    ),
  },
  {
    title: "Ảnh kết quả để khoe",
    body: "Mẫu vô địch thành ảnh đẹp, gửi thẳng vào nhóm chat.",
    icon: <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />,
  },
];

export function FeaturesSection() {
  return (
    <section className="sec" id="tinh-nang">
      <div className="sec-h">
        <h2>Công bằng, rõ ràng, không ai cãi được</h2>
        <p>Những thứ nhóm hay tranh luận khi chọn mẫu, Vote Đi làm sẵn.</p>
      </div>
      <div className="feat">
        <div className="feat-main">
          <h3>Bốc thăm ngẫu nhiên vào nhánh</h3>
          <p>Không ai xếp nhánh theo ý mình. Chủ phòng xem trước sơ đồ, muốn thì bốc lại trước khi bắt đầu.</p>
          <DrawDemo />
        </div>
        <div className="feat-list">
          {FEATURES.map((item) => (
            <div key={item.title} className="fi">
              <span className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  {item.icon}
                </svg>
              </span>
              <div>
                <h4>{item.title}</h4>
                <p>{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
