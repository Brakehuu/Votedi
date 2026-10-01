import { Chip, ChipRow } from "@/components/content/chip";
import { Eye, Flame, Heart, Link2, MapPin } from "lucide-react";

export function FeaturesSection() {
  return (
    <section className="sec wrap" id="tinh-nang">
      <div className="sec-h rv">
        <ChipRow>
          <Chip>Làm sẵn cho nhóm</Chip>
        </ChipRow>
        <h2>
          Những thứ nhóm hay cãi nhau, <em>Vote Đi làm sẵn</em>
        </h2>
      </div>
      <div className="bento">
        <div className="bt s4 rv">
          <h3>Dán link Google Maps là có bản đồ</h3>
          <p>
            Dán link quán, homestay, điểm du lịch, Vote Đi tự lấy tên và vị trí. Cả nhóm xem bản đồ và bấm chỉ đường ngay
            trong phòng.
          </p>
          <div className="vis" aria-hidden>
            <div className="map">
              <span className="pt" style={{ left: "34%", top: "30%" }}>
                <MapPin width={15} height={15} strokeWidth={2.4} className="shrink-0" aria-hidden />
              </span>
              <span className="pt" style={{ left: "64%", top: "46%" }}>
                <MapPin width={15} height={15} strokeWidth={2.4} className="shrink-0" aria-hidden />
              </span>
              <span className="pt" style={{ left: "80%", top: "18%" }}>
                <MapPin width={15} height={15} strokeWidth={2.4} className="shrink-0" aria-hidden />
              </span>
              <div className="card">
                <div>
                  Bán đảo Sơn Trà<small>Đà Nẵng · 4 phiếu</small>
                </div>
                <span>Chỉ đường</span>
              </div>
            </div>
          </div>
        </div>
        <div className="bt s2 rv">
          <h3>Vote ẩn danh</h3>
          <p>Không ai thấy ai chọn gì, kể cả chủ phòng. Khóa ngay ở cơ sở dữ liệu.</p>
          <div className="vis" aria-hidden>
            <div className="tg">
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Eye width={18} height={18} strokeWidth={1.9} />
                Ẩn danh
              </span>
              <span className="sw" />
            </div>
          </div>
        </div>
        <div className="bt s2 rv">
          <h3>Thả tim, bình luận</h3>
          <p>Phản ứng nhanh từng lựa chọn, bàn bạc ngay trong phòng.</p>
          <div className="vis" aria-hidden>
            <div className="rx">
              <span className="on" style={{ color: "#9F1239" }}>
                <Heart width={15} height={15} strokeWidth={1.9} />
                12
              </span>
              <span>
                <Flame width={15} height={15} strokeWidth={1.9} />
                5
              </span>
            </div>
            <div className="cm">
              <span className="av" style={{ background: "#0891B2" }}>
                L
              </span>
              <div>Cuối tuần này trời đẹp, đi Sơn Trà nhé</div>
            </div>
          </div>
        </div>
        <div className="bt s2 rv">
          <h3>Ảnh xem trước đẹp khi share</h3>
          <p>Dán link vào Zalo, Messenger là hiện thẻ có tên phòng và lựa chọn.</p>
          <div className="vis" aria-hidden>
            <div className="lp">
              <div className="im">
                <Link2 width={30} height={30} strokeWidth={1.9} />
              </div>
              <div className="tx">
                <small>votedi.vn</small>
                <b>Vote giúp nhóm: Cuối tuần đi đâu chơi?</b>
                <span>Bình chọn nhanh · 3 lựa chọn</span>
              </div>
            </div>
          </div>
        </div>
        <div className="bt s2 rv">
          <h3>Không cần tài khoản</h3>
          <p>Bấm link, đặt tên, chọn avatar là vào. Có thể đặt mật khẩu phòng nếu muốn.</p>
          <div className="vis" aria-hidden>
            <div className="pk">
              <span style={{ background: "#0EA5A4" }} className="sel">
                H
              </span>
              <span style={{ background: "#F59E0B" }}>M</span>
              <span style={{ background: "#E5484D" }}>T</span>
              <span style={{ background: "#6366F1" }}>K</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
