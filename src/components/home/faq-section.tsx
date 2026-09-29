import Link from "next/link";
import { faqGroups } from "@/lib/faq";

export function FaqSection() {
  return (
    <section className="sec" id="hoi-dap">
      <div className="faq-grid">
        <div className="faq-side">
          <div className="sec-h">
            <h2>Câu hỏi thường gặp</h2>
            <p>Mọi thứ cần biết trước khi tạo phòng đầu tiên.</p>
          </div>
          <div className="help glass">
            <b>Thử là hiểu nhanh nhất</b>
            <p>Tạo một phòng thử với vài ảnh, mở link trên điện thoại khác để xem người được mời thấy gì.</p>
            <Link href="/tao-phong" className="btn btn-primary btn-sm">
              Tạo phòng thử
            </Link>
          </div>
        </div>

        <div>
          {faqGroups.map((group, groupIndex) => (
            <div key={group.title} className="faq-group">
              <h3>{group.title}</h3>
              {group.items.map((item, index) => (
                <details key={item.q} open={groupIndex === 0 && index === 0}>
                  <summary>{item.q}</summary>
                  <div>
                    <p>{item.a}</p>
                  </div>
                </details>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
