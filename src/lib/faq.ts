export type FaqItem = {
  q: string;
  a: string;
};

export type FaqGroup = {
  title: string;
  items: FaqItem[];
};

/** 12 câu FAQ — dùng chung cho UI và JSON-LD. */
export const faqGroups: FaqGroup[] = [
  {
    title: "Bắt đầu",
    items: [
      {
        q: "Vote Đi có miễn phí không?",
        a: "Miễn phí. Tạo phòng, mời người, tải ảnh và vote đều không mất phí.",
      },
      {
        q: "Người được mời có cần tải app hay đăng ký không?",
        a: "Không. Bấm link (nhập mật khẩu nếu phòng có đặt), đặt tên và chọn avatar hoặc emoji là vote được ngay trên trình duyệt điện thoại hay máy tính.",
      },
      {
        q: "Một phòng được bao nhiêu mẫu?",
        a: "Mỗi phòng tối đa 32 mẫu. Sơ đồ loại trực tiếp nhận từ 2 đến 16 mẫu; nhiều hơn thì dùng kiểu có vòng loại để lọc trước.",
      },
      {
        q: "Nên tải ảnh thế nào cho đẹp?",
        a: "Nhận ảnh JPG, PNG, WEBP, tối đa 10MB mỗi ảnh. Ảnh PNG nền trong suốt sẽ hiện nổi trên nền sáng, ảnh thường được cắt vuông và bo góc. Để đẹp nhất, chụp sản phẩm ở giữa khung, nền đơn giản, các mẫu cùng góc chụp.",
      },
    ],
  },
  {
    title: "Cách đấu",
    items: [
      {
        q: "Vòng loại và loại trực tiếp khác nhau thế nào?",
        a: "Vòng loại: tất cả mẫu hiện cùng lúc, mỗi người có số phiếu chủ phòng đặt. Hết giờ, các mẫu nhiều phiếu nhất vào sơ đồ. Loại trực tiếp: mẫu đấu từng cặp, mỗi người chọn 1 trong 2, mẫu thắng đi tiếp đến chung kết.",
      },
      {
        q: "Mẫu được xếp vào nhánh như thế nào?",
        a: "Bốc thăm ngẫu nhiên. Chủ phòng xem trước sơ đồ và có thể bốc lại trước khi bấm bắt đầu. Nếu số mẫu không chẵn 4, 8, 16 thì một số mẫu được miễn đấu vòng đầu, cũng do bốc thăm.",
      },
      {
        q: "Khi nào một cặp đấu kết thúc?",
        a: "Khi tất cả thành viên đã vote hoặc hết thời gian chủ phòng đặt. Chủ phòng có thể gia hạn thêm hoặc kết thúc sớm.",
      },
      {
        q: "Hai mẫu bằng phiếu thì sao?",
        a: "Theo luật chủ phòng chọn khi tạo phòng: bốc ngẫu nhiên, hoặc ưu tiên lựa chọn của chủ phòng.",
      },
    ],
  },
  {
    title: "Vote và riêng tư",
    items: [
      {
        q: "Vote nhầm có đổi được không?",
        a: "Được, miễn là cặp đấu hoặc vòng loại chưa hết giờ. Bấm vào mẫu còn lại để đổi.",
      },
      {
        q: "Người khác có thấy mình vote mẫu nào không?",
        a: "Có. Avatar của bạn hiện dưới mẫu bạn chọn, nên kết quả minh bạch, không ai nghi ai.",
      },
      {
        q: "Ai vào được phòng của tôi?",
        a: "Người có link, và thêm mật khẩu nếu chủ phòng bật. Chủ phòng có thể khóa phòng để không nhận thêm người, hoặc mời một thành viên ra.",
      },
      {
        q: "Xem lại kết quả ở đâu?",
        a: "Vào mục Phòng của tôi để mở lại các phòng đã tham gia. Trang kết quả có mẫu vô địch, toàn bộ sơ đồ và ai vote cặp nào.",
      },
    ],
  },
];

export const faqs: FaqItem[] = faqGroups.flatMap((group) => group.items);
