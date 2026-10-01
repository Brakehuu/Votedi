import Link from "next/link";
import { Chip, ChipRow } from "@/components/content/chip";
import { faqGroups } from "@/lib/faq";

export function FaqSection() {
  return (
    <section className="sec wrap" id="hoi-dap">
      <div className="faq-grid">
        <div className="faq-side">
          <div className="sec-h rv">
            <ChipRow>
              <Chip>Hỏi đáp</Chip>
            </ChipRow>
            <h2>Câu hỏi thường gặp</h2>
            <p>Mọi thứ cần biết trước khi tạo phòng đầu tiên.</p>
          </div>
          <div className="help glass">
            <b>Thử là hiểu nhanh nhất</b>
            <p>Tạo một phòng thử với vài lựa chọn, mở link trên điện thoại khác để xem người được mời thấy gì.</p>
            <Link href="/tao-phong" prefetch={false} className="btn btn-primary btn-p btn-sm">
              Tạo phòng thử
            </Link>
          </div>
        </div>
        <div>
          {faqGroups.map((group, groupIndex) => (
            <div key={group.title} className="fg">
              <h3>{group.title}</h3>
              {group.items.map((item, index) => (
                <details key={item.q} open={groupIndex === 0 && index === 0}>
                  <summary>{item.q}</summary>
                  <p>
                    {renderAnswer(item.q, item.a)}
                  </p>
                </details>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function renderAnswer(q: string, a: string) {
  if (q.includes("kiểu vote nào")) {
    const parts = a.split("mẫu có sẵn");
    if (parts.length === 2) {
      return (
        <>
          {parts[0]}
          <Link href="/mau">mẫu có sẵn</Link>
          {parts[1]}
        </>
      );
    }
  }
  if (q.includes("lưu bao lâu")) {
    const parts = a.split("Quyền riêng tư");
    if (parts.length === 2) {
      return (
        <>
          {parts[0]}
          <Link href="/quyen-rieng-tu">Quyền riêng tư</Link>
          {parts[1]}
        </>
      );
    }
  }
  return a;
}
