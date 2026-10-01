import Link from "next/link";
import { Chip, ChipRow } from "@/components/content/chip";
import {
  CATEGORY_VISUAL,
  TEMPLATE_TABS,
  TEMPLATES,
  templatesForTab,
  type TemplateTabId,
} from "@/lib/templates";

const CAT_CLASS: Record<TemplateTabId, string> = {
  place: "c-teal",
  travel: "c-cyan",
  food: "c-amber",
  fashion: "c-sky",
  school: "c-green",
  work: "c-teal",
  family: "c-rose",
  community: "c-amber",
};

export function TemplatesSection() {
  const total = TEMPLATES.length;
  return (
    <section className="sec wrap" id="mau">
      <div className="sec-h rv">
        <ChipRow>
          <Chip>{total} mẫu có sẵn</Chip>
        </ChipRow>
        <h2>
          Chọn theo tình huống, <em>bấm một cái là tạo xong</em>
        </h2>
        <p>Mỗi mẫu đã chọn sẵn kiểu vote và cài đặt hợp lý. Bạn chỉ việc thêm lựa chọn rồi gửi link.</p>
      </div>
      <div className="cats">
        {TEMPLATE_TABS.map((tab) => {
          const samples = templatesForTab(tab.id).slice(0, 3);
          const vis = CATEGORY_VISUAL[tab.id];
          const Icon = vis.icon;
          return (
            <Link key={tab.id} className="cat rv" href={`/mau/danh-muc/${tab.id}`}>
              <span className={`ic ${CAT_CLASS[tab.id]}`}>
                <Icon width={23} height={23} strokeWidth={1.9} aria-hidden />
              </span>
              <h3>{tab.label}</h3>
              <ul>
                {samples.map((t) => (
                  <li key={t.slug}>{t.title}</li>
                ))}
              </ul>
              <span className="more">Xem mẫu →</span>
            </Link>
          );
        })}
      </div>
      <div className="all">
        <Link href="/mau" className="btn btn-g">
          Xem tất cả {total} mẫu
        </Link>
      </div>
    </section>
  );
}
