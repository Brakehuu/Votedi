export function StepsSection() {
  return (
    <section className="sec" id="cach-hoat-dong">
      <div className="sec-h">
        <h2>Ba bước là cả nhóm có kết quả</h2>
        <p>Không cần cài app, không cần đăng ký. Gửi link là vào vote được.</p>
      </div>
      <div className="steps">
        <div className="step">
          <h3>Tạo phòng</h3>
          <p>Chọn kiểu đấu, thời gian vote (mật khẩu nếu muốn), tải ảnh các mẫu cần chọn lên.</p>
        </div>
        <div className="step">
          <h3>Gửi link cho nhóm</h3>
          <p>Chia sẻ qua Zalo, Messenger hoặc mã QR. Mỗi người tự đặt tên và avatar.</p>
        </div>
        <div className="step">
          <h3>Vote và chốt</h3>
          <p>Đủ người vote hoặc hết giờ là tự sang vòng sau, đến chung kết là có mẫu vô địch.</p>
        </div>
      </div>
    </section>
  );
}
