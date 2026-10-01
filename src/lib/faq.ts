/** FAQ — dùng chung cho UI trang chủ và JSON-LD FAQPage. */
export type FaqItem = {
  q: string;
  a: string;
};

export type FaqGroup = {
  title: string;
  items: FaqItem[];
};

export const faqGroups: FaqGroup[] = [
  {
    title: "Bắt đầu",
    items: [
      {
        q: "Vote Đi là gì và dùng để làm gì?",
        a: "Vote Đi là trang web tạo bình chọn online giúp hội bạn, lớp, team và gia đình chốt nhanh các quyết định chung: đi đâu chơi, ăn gì, ngày nào ai rảnh, chọn mẫu áo, đặt tên. Bạn tạo phòng, gửi link vào nhóm Zalo, cả nhóm vote ngay trên điện thoại.",
      },
      {
        q: "Vote Đi có miễn phí không?",
        a: "Miễn phí. Tạo phòng, mời người, thêm lựa chọn và vote đều không mất phí.",
      },
      {
        q: "Cả nhóm có phải tạo tài khoản không?",
        a: "Không. Mỗi người bấm link mời, đặt tên và chọn avatar hoặc emoji là vào phòng. Chủ phòng có thể đặt mật khẩu nếu muốn phòng riêng tư hơn.",
      },
      {
        q: "Dùng trên điện thoại được không?",
        a: "Được. Vote Đi làm cho điện thoại trước: vuốt để quẹt chọn, chạm để chấm sao, kéo thả để xếp hạng, và sơ đồ đấu xem được theo từng vòng.",
      },
    ],
  },
  {
    title: "Kiểu vote và lựa chọn",
    items: [
      {
        q: "Có những kiểu vote nào, nên chọn kiểu nào?",
        a: "Có 6 kiểu: Bình chọn nhanh (đi đâu, ăn gì), Đấu loại World Cup (mẫu áo, logo), Chọn lịch rảnh (ngày họp lớp, du lịch), Quẹt chọn (hôm nay ăn gì), Xếp hạng (đặt tên) và Chấm điểm (cuộc thi ảnh). Chưa biết chọn gì thì bắt đầu từ một mẫu có sẵn, mẫu đã chọn sẵn kiểu vote hợp lý.",
      },
      {
        q: "Dán link Google Maps để vote địa điểm được không?",
        a: "Được. Dán link Google Maps (kể cả link rút gọn maps.app.goo.gl), Vote Đi tự lấy tên và vị trí, hiện bản đồ nhỏ và nút chỉ đường. Bạn cũng có thể thêm giá và link đặt phòng cho từng địa điểm.",
      },
      {
        q: "Một phòng có bao nhiêu lựa chọn, bao nhiêu người?",
        a: "Phòng dùng được cho cả lớp hay cả team. Số lựa chọn tối đa tùy kiểu vote, ví dụ đấu loại trực tiếp có tối đa 16 mẫu, còn vòng loại rồi đấu loại nhận tối đa 32 mẫu.",
      },
      {
        q: "Hai lựa chọn bằng phiếu thì chốt thế nào?",
        a: "Theo luật chủ phòng chọn khi tạo phòng: bốc ngẫu nhiên, hoặc ưu tiên lựa chọn của chủ phòng. Với đấu loại, bảng xếp nhánh và luật hòa phiếu đều hiện rõ trước khi bắt đầu.",
      },
    ],
  },
  {
    title: "Riêng tư và dữ liệu",
    items: [
      {
        q: "Vote ẩn danh hoạt động thế nào?",
        a: "Khi bật ẩn danh, không ai thấy ai chọn gì, kể cả chủ phòng. Hệ thống chỉ hiện số lượng tổng hợp. Chủ phòng chỉ được bật ẩn danh, không tắt lại sau khi đã có người vote.",
      },
      {
        q: "Ảnh và dữ liệu phòng được lưu bao lâu?",
        a: "Phòng không hoạt động trong thời gian dài sẽ được tự dọn cùng ảnh trong phòng. Chi tiết xem ở trang Quyền riêng tư.",
      },
    ],
  },
];

export const faqs: FaqItem[] = faqGroups.flatMap((group) => group.items);
