import { Chip, ChipRow } from "@/components/content/chip";

export function StepsSection() {
  return (
    <section className="sec wrap" id="cach-hoat-dong">
      <div className="sec-h rv">
        <ChipRow>
          <Chip>Cách hoạt động</Chip>
        </ChipRow>
        <h2>
          Một link, ba bước là <em>cả nhóm chốt xong</em>
        </h2>
        <p>Không cần cài ứng dụng, không cần đăng ký. Người được mời chỉ cần đặt tên và chọn avatar.</p>
      </div>
      <div className="steps">
        <div className="step rv">
          <span className="n">1</span>
          <h3>Tạo phòng</h3>
          <p>Chọn mẫu có sẵn hoặc tự chọn kiểu vote, thêm lựa chọn (ảnh, chữ, link Google Maps).</p>
          <div className="mini" aria-hidden>
            <div className="fld">Cuối tuần đi đâu chơi?</div>
            <div className="chips-r">
              <span className="chip">Bình chọn nhanh</span>
              <span className="chip n">Hạn 1 ngày</span>
              <span className="chip n">Ẩn danh: tắt</span>
            </div>
          </div>
        </div>
        <div className="step rv">
          <span className="n">2</span>
          <h3>Gửi link vào nhóm</h3>
          <p>Chia sẻ qua Zalo, Messenger hoặc mã QR. Link hiện ảnh xem trước đẹp ngay trong khung chat.</p>
          <div className="mini" aria-hidden>
            <div className="lnk">votedi.vn/p/K3Q3LHuZ</div>
            <div className="sh">
              <span style={{ background: "#0068FF" }}>Zalo</span>
              <span style={{ background: "#0066CC" }}>Messenger</span>
              <span style={{ background: "#0C1B20" }}>QR</span>
            </div>
          </div>
        </div>
        <div className="step rv">
          <span className="n">3</span>
          <h3>Vote và chốt</h3>
          <p>Ai vote gì hiện rõ (hoặc ẩn danh). Đủ người hoặc hết giờ là tự có kết quả.</p>
          <div className="mini" aria-hidden>
            <div className="done">
              <div className="stack">
                <span className="av" style={{ background: "#0EA5A4" }}>
                  H
                </span>
                <span className="av" style={{ background: "#0891B2" }}>
                  L
                </span>
                <span className="av" style={{ background: "#F59E0B" }}>
                  M
                </span>
                <span className="av" style={{ background: "#E5484D" }}>
                  T
                </span>
                <span className="av" style={{ background: "#6366F1" }}>
                  K
                </span>
              </div>
              <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>6/6 đã vote</span>
            </div>
            <div className="done">
              <div className="b">Đã chốt: Bán đảo Sơn Trà</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
