export type TemplateCategory =
  | "place"
  | "travel"
  | "food"
  | "fashion"
  | "school"
  | "work"
  | "family"
  | "community";

export type TemplateTabId =
  | "place"
  | "travel"
  | "food"
  | "fashion"
  | "school"
  | "work"
  | "family"
  | "community";

export type RoomTemplate = {
  slug: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  h1: string;
  category: TemplateCategory;
  emoji: string;
  format: "quick" | "bracket" | "swipe" | "ranking" | "rating" | "schedule";
  group?: "place" | "other";
  optionKind?: "place" | "any" | "link" | "image";
  mode?: "qualify_knockout" | "knockout" | "group_knockout";
  defaultSettings: {
    max_choices?: number;
    option_kind?: "place" | "any";
    judge_weight?: number;
    schedule_mode?: "days" | "day_parts" | "time_slots" | "trip";
    trip_length?: number;
    day_parts?: ("morning" | "afternoon" | "evening")[];
    time_slots?: { start: string; end: string }[];
    mode?: string;
  };
  suggestedOptions: string[];
  optionPlaceholder: string;
  intro: string;
  steps: [string, string, string];
  benefits: string[];
  faq: { q: string; a: string }[];
  relatedSlugs: [string, string, string];
};

export const TEMPLATE_TABS: { id: TemplateTabId; label: string }[] = [
  { id: "place", label: "Chọn địa điểm" },
  { id: "travel", label: "Du lịch" },
  { id: "food", label: "Ăn uống" },
  { id: "fashion", label: "Thời trang & thiết kế" },
  { id: "school", label: "Lớp học & trường" },
  { id: "work", label: "Công ty & team" },
  { id: "family", label: "Gia đình" },
  { id: "community", label: "Cộng đồng & cuộc thi" },
];

export const POPULAR_TEMPLATE_SLUGS = [
  "chon-mau-ao-lop",
  "hom-nay-an-gi",
  "di-dau-choi-cuoi-tuan",
  "chon-ngay-di-du-lich",
  "dat-ten-con",
  "cuoc-thi-anh",
] as const;

export const TEMPLATES: RoomTemplate[] = [
  {
    slug: "chon-mau-ao-nhom",
    title: "Chọn mẫu áo nhóm",
    seoTitle: "Tạo bình chọn mẫu áo nhóm online | Vote Đi",
    seoDescription:
      "Tải ảnh từng mẫu áo nhóm, vòng loại rồi đấu loại trực tiếp. Gửi link Zalo cho cả team vote, không cần tài khoản.",
    h1: "Chọn mẫu áo nhóm nào?",
    category: "fashion",
    emoji: "👕",
    format: "bracket",
    group: "other",
    optionKind: "image",
    mode: "qualify_knockout",
    defaultSettings: { mode: "qualify_knockout" },
    suggestedOptions: [],
    optionPlaceholder: "Tải ảnh mẫu áo…",
    intro:
      "Mỗi thiết kế một ảnh. Vòng loại chọn mẫu yêu thích, sau đó đấu loại kiểu World Cup đến khi chốt một mẫu duy nhất.",
    steps: [
      "Tạo phòng và tải ảnh các mẫu áo",
      "Gửi link cho nhóm vote vòng loại",
      "Theo dõi sơ đồ đấu loại đến khi chốt mẫu thắng",
    ],
    benefits: [
      "Vòng loại + knockout giảm tranh cãi khi nhiều mẫu",
      "Sơ đồ trực quan, ai cũng thấy tiến trình",
      "Vote trên điện thoại, không cần cài app",
      "Host chốt kết quả một chạm khi cả nhóm đồng ý",
    ],
    faq: [
      {
        q: "Cần bao nhiêu mẫu áo để chạy vòng loại?",
        a: "Nên từ 4 mẫu trở lên. Hệ thống tự xếp nhánh và xử lý bye nếu số mẫu lẻ.",
      },
      {
        q: "Mỗi người vote được mấy mẫu ở vòng loại?",
        a: "Theo cài đặt vòng loại (thường chọn vài mẫu yêu thích). Vòng knockout mỗi trận chọn 1.",
      },
      {
        q: "Có thể đổi ảnh sau khi tạo phòng không?",
        a: "Host có thể chỉnh lựa chọn trước khi mọi người vote nhiều. Nên chốt ảnh trước khi gửi link.",
      },
      {
        q: "Nhóm chưa có tài khoản Vote Đi thì sao?",
        a: "Không cần đăng ký. Mở link, nhập tên là vote được ngay.",
      },
      {
        q: "Hòa phiếu ở một trận đấu thì xử lý thế nào?",
        a: "Host có thể bấm vote lại trận đó hoặc chốt theo quy tắc hòa đã cài trong phòng.",
      },
    ],
    relatedSlugs: ["chon-mau-ao-lop", "chon-dong-phuc-cong-ty", "chon-logo"],
  },
  {
    slug: "chon-mau-ao-lop",
    title: "Chọn áo lớp",
    seoTitle: "Tạo bình chọn áo lớp online miễn phí | Vote Đi",
    seoDescription:
      "Lớp tải ảnh thiết kế áo đồng phục, đấu loại trực tiếp đến một mẫu thắng. Chia sẻ link Zalo, cả lớp vote không cần đăng nhập.",
    h1: "Chọn mẫu áo lớp",
    category: "school",
    emoji: "🎓",
    format: "bracket",
    group: "other",
    optionKind: "image",
    mode: "knockout",
    defaultSettings: { mode: "knockout" },
    suggestedOptions: [],
    optionPlaceholder: "Tải ảnh thiết kế áo lớp…",
    intro:
      "Đưa các phương án áo lớp lên một phòng. Cả lớp đối đầu từng cặp cho đến khi còn một thiết kế được lớp chọn.",
    steps: [
      "Tạo phòng, đặt tên lớp và tải ảnh mẫu",
      "Gửi link vào nhóm lớp Zalo/Messenger",
      "Vote từng vòng và chốt mẫu áo cuối cùng",
    ],
    benefits: [
      "Phù hợp lớp đông, không phải họp trực tiếp",
      "Ảnh mẫu xem rõ trên điện thoại",
      "Theo dõi realtime ai đã vote",
      "Lưu kết quả để in áo và làm hợp đồng",
    ],
    faq: [
      {
        q: "Lớp 40 người dùng được không?",
        a: "Được. Không giới hạn số người tham gia vote trong một phòng.",
      },
      {
        q: "Có bắt buộc đặt hạn giờ không?",
        a: "Bracket thường nên có deadline từng vòng. Bạn chọn hạn trong bước cài đặt.",
      },
      {
        q: "Thêm mẫu áo giữa chừng được không?",
        a: "Nên thêm trước khi gửi link. Sau khi đã vote, thêm mẫu có thể làm lại sơ đồ.",
      },
      {
        q: "File ảnh nên để dạng gì?",
        a: "JPG hoặc PNG, nền sáng, thấy rõ màu và logo lớp.",
      },
      {
        q: "Giáo viên chủ nhiệm có thể là host không?",
        a: "Có. Người tạo phòng là host, quản lý cài đặt và chốt kết quả.",
      },
      {
        q: "Vote xong có xem lại lịch sử trận không?",
        a: "Sơ đồ đấu loại giữ lại các trận đã kết thúc để lớp đối chiếu.",
      },
    ],
    relatedSlugs: ["chon-concept-ky-yeu", "chon-mau-ao-nhom", "chon-ngay-hop-lop"],
  },
  {
    slug: "chon-logo",
    title: "Chọn logo",
    seoTitle: "Bình chọn logo team online đấu loại | Vote Đi",
    seoDescription:
      "Đưa các phương án logo lên phòng vote, đấu knockout từng cặp. Phù hợp startup, CLB, dự án — chia sẻ link, chốt logo chung nhanh.",
    h1: "Logo nào đại diện team?",
    category: "work",
    emoji: "✨",
    format: "bracket",
    group: "other",
    optionKind: "image",
    mode: "knockout",
    defaultSettings: { mode: "knockout" },
    suggestedOptions: [],
    optionPlaceholder: "Tải ảnh logo…",
    intro:
      "So sánh logo side-by-side qua từng vòng đấu. Phù hợp khi team có 2–16 phương án và cần quyết định dứt khoát.",
    steps: [
      "Tạo phòng và tải các file logo",
      "Mời designer và stakeholder vào link",
      "Chốt logo thắng sau vòng chung kết",
    ],
    benefits: [
      "Knockout giúp loại dần, tránh vote dàn trải",
      "Minh bạch: mọi người thấy cùng một sơ đồ",
      "Không cần gửi ảnh qua lại trên chat",
      "Kết quả dễ export để brief in ấn",
    ],
    faq: [
      {
        q: "Logo vector hay ảnh chụp màn hình?",
        a: "Nên PNG nền trong hoặc JPG chất lượng cao để mọi người so sánh công bằng.",
      },
      {
        q: "Có thể kết hợp logo và slogan không?",
        a: "Mỗi lựa chọn là một ảnh. Bạn gộp slogan vào mockup trước khi tải lên.",
      },
      {
        q: "Knockout khác vòng loại thế nào?",
        a: "Knockout đi thẳng vào đối đầu từng cặp, không có bước chọn nhiều ở vòng đầu.",
      },
      {
        q: "Khách mời ngoài công ty vote được không?",
        a: "Ai có link đều vote được. Có thể đặt mật khẩu phòng nếu cần kín.",
      },
      {
        q: "Hòa ở chung kết thì sao?",
        a: "Host mở lại trận chung kết hoặc chọn quy tắc hòa (random/host) trong cài đặt.",
      },
    ],
    relatedSlugs: ["chon-dong-phuc-cong-ty", "dat-ten-team-thuong-hieu", "chon-mau-ao-nhom"],
  },
  {
    slug: "chon-concept-ky-yeu",
    title: "Chọn concept kỷ yếu",
    seoTitle: "Vote concept chụp kỷ yếu online | Vote Đi",
    seoDescription:
      "Lớp đưa moodboard, poster concept kỷ yếu vào phòng đấu loại. Cả lớp chọn một concept thống nhất trước ngày chụp, qua link Zalo.",
    h1: "Concept kỷ yếu nào?",
    category: "school",
    emoji: "📸",
    format: "bracket",
    group: "other",
    optionKind: "image",
    mode: "knockout",
    defaultSettings: { mode: "knockout" },
    suggestedOptions: [],
    optionPlaceholder: "Tải ảnh concept / moodboard…",
    intro:
      "Vintage, preppy, cinematic… Mỗi concept một ảnh tham chiếu. Lớp vote đấu loại để thống nhất phong cách chụp kỷ yếu.",
    steps: [
      "Thu thập ảnh concept từ lớp hoặc studio",
      "Tạo phòng và tải lên các phương án",
      "Vote và chốt concept gửi ekip chụp",
    ],
    benefits: [
      "Tránh lớp chia phe concept lúc sát ngày chụp",
      "Ảnh moodboard dễ hình dung hơn mô tả bằng lời",
      "Lớp trưởng host, giáo viên có thể theo dõi",
      "Kết quả rõ để báo giá đồng phục và props",
    ],
    faq: [
      {
        q: "Chưa chốt studio vẫn vote concept được không?",
        a: "Được. Concept độc lập với studio; bạn gửi kết quả cho bên chụp sau.",
      },
      {
        q: "Có thể thêm mô tả dưới mỗi ảnh không?",
        a: "Mỗi lựa chọn có tiêu đề và mô tả ngắn (VD: tone màu, địa điểm gợi ý).",
      },
      {
        q: "Bao nhiêu concept là hợp lý?",
        a: "4–8 concept là dễ vote. Quá nhiều nên gom nhóm trước.",
      },
      {
        q: "Lớp muốn vòng loại thay vì knockout?",
        a: "Tạo phòng bracket và đổi chế độ sang vòng loại trong cài đặt nếu cần.",
      },
      {
        q: "Vote xong có chia sẻ lại cho phụ huynh không?",
        a: "Có nút chia sẻ kết quả và link xem phòng đã chốt.",
      },
    ],
    relatedSlugs: ["chon-mau-ao-lop", "chon-ngay-hop-lop", "chon-ao-dai-cuoi"],
  },
  {
    slug: "chon-dong-phuc-cong-ty",
    title: "Chọn đồng phục công ty",
    seoTitle: "Bình chọn đồng phục công ty online | Vote Đi",
    seoDescription:
      "HR tải mẫu áo sơ mi, polo, vest đồng phục; nhân viên vote đấu loại. Chốt một thiết kế trước khi đặt may hàng loạt, không họp dài.",
    h1: "Đồng phục công ty kiểu nào?",
    category: "work",
    emoji: "👔",
    format: "bracket",
    group: "other",
    optionKind: "image",
    mode: "knockout",
    defaultSettings: { mode: "knockout" },
    suggestedOptions: [],
    optionPlaceholder: "Tải ảnh mẫu đồng phục…",
    intro:
      "Đưa các phương án từ nhà cung cấp lên một phòng. Toàn công ty hoặc từng phòng ban vote đến khi chốt mẫu in logo.",
    steps: [
      "HR tạo phòng và tải ảnh từ NCC",
      "Gửi link nội bộ (email, Teams, Zalo)",
      "Chốt mẫu thắng và đặt hàng",
    ],
    benefits: [
      "Giảm email ping-pong khi nhiều mẫu",
      "Nhân viên vote lúc rảnh trên mobile",
      "Có thể đặt deadline từng vòng",
      "Kết quả minh bạch cho ban lãnh đạo",
    ],
    faq: [
      {
        q: "Chỉ phòng ban nhỏ vote được không?",
        a: "Được. Tạo phòng riêng từng ban hoặc một phòng chung tùy quy trình HR.",
      },
      {
        q: "Có hiển thị size và chất liệu không?",
        a: "Ghi trong mô tả từng ảnh mẫu. Vote chọn thiết kế, size thường thu sau.",
      },
      {
        q: "Phòng mật khẩu có được không?",
        a: "Có. Bật mật khẩu phòng trong bước cài đặt wizard.",
      },
      {
        q: "NCC có thể xem kết quả không?",
        a: "Chia sẻ link phòng đã chốt hoặc ảnh kết quả cho NCC.",
      },
      {
        q: "Knockout mất bao lâu?",
        a: "Tùy số mẫu và deadline bạn đặt. 8 mẫu cần 3 vòng knockout.",
      },
      {
        q: "Có thể vote ẩn danh không?",
        a: "Có tùy chọn ẩn danh trong cài đặt phòng.",
      },
    ],
    relatedSlugs: ["chon-logo", "chon-mau-ao-nhom", "chon-ngay-teambuilding"],
  },
  {
    slug: "di-dau-choi-cuoi-tuan",
    title: "Cuối tuần đi đâu chơi",
    seoTitle: "Tạo bình chọn đi chơi cuối tuần | Vote Đi",
    seoDescription:
      "Hội bạn dán link Google Maps từng quán, công viên, homestay gần. Vote chọn một địa điểm cuối tuần, xem bản đồ và chỉ đường ngay trên thẻ.",
    h1: "Cuối tuần này đi đâu?",
    category: "travel",
    emoji: "🛵",
    format: "quick",
    group: "place",
    optionKind: "place",
    defaultSettings: { max_choices: 1, option_kind: "place" },
    suggestedOptions: [],
    optionPlaceholder: "Dán link Google Maps địa điểm…",
    intro:
      "Mỗi người góp một chỗ bằng link Maps. Cả nhóm chọn một nơi; thẻ có bản đồ nhỏ và nút chỉ đường.",
    steps: [
      "Tạo phòng và dán link Maps các điểm",
      "Gửi link cho hội bạn vote",
      "Chốt địa điểm thắng và hẹn giờ đi",
    ],
    benefits: [
      "Không cần copy địa chỉ dài trong chat",
      "So sánh nhiều quán trên cùng một màn",
      "Tab bản đồ khi có từ 2 địa điểm",
      "Vote nhanh trên điện thoại",
    ],
    faq: [
      {
        q: "Link Maps rút gọn maps.app.goo.gl dùng được không?",
        a: "Có. Hệ thống tự đọc tên và toạ độ khi bạn dán link.",
      },
      {
        q: "Chọn được nhiều địa điểm cùng lúc không?",
        a: "Mặc định chọn 1. Bạn đổi số lựa chọn tối đa trong cài đặt.",
      },
      {
        q: "Không có toạ độ trên link thì sao?",
        a: "Vẫn tạo thẻ; bạn sửa tên và thêm địa chỉ tay.",
      },
      {
        q: "Cần tài khoản Google không?",
        a: "Không. Chỉ cần link chia sẻ công khai từ Maps.",
      },
      {
        q: "Thành viên thêm địa điểm được không?",
        a: "Có nếu bật cho phép thành viên thêm lựa chọn.",
      },
    ],
    relatedSlugs: ["chon-diem-du-lich", "quan-nhau-toi-nay", "chon-homestay-khach-san"],
  },
  {
    slug: "chon-diem-du-lich",
    title: "Chọn điểm du lịch",
    seoTitle: "Quẹt chọn điểm du lịch cho nhóm | Vote Đi",
    seoDescription:
      "Thêm điểm đến bằng link Maps, cả nhóm quẹt thích hoặc bỏ qua. Món match cả nhóm được gắn nhãn — chốt điểm đến chuyến đi dễ hơn chat dài.",
    h1: "Đi du lịch ở đâu?",
    category: "travel",
    emoji: "🏝️",
    format: "swipe",
    group: "place",
    optionKind: "place",
    defaultSettings: { option_kind: "place" },
    suggestedOptions: [],
    optionPlaceholder: "Dán link Google Maps điểm đến…",
    intro:
      "Kiểu quẹt thẻ: thích, rất thích hoặc bỏ qua từng điểm đến. Hợp khi nhóm có nhiều gợi ý và muốn tìm chỗ mọi người cùng hứng thú.",
    steps: [
      "Tạo phòng, thêm điểm đến bằng Maps",
      "Mời nhóm quẹt trên điện thoại",
      "Xem bảng điểm và chốt điểm đến",
    ],
    benefits: [
      "Vui hơn danh sách dài trong nhóm chat",
      "Nhãn match khi ai cũng quẹt thích",
      "Kết hợp bản đồ trên từng thẻ địa điểm",
      "Quẹt lại được khi phòng còn mở",
    ],
    faq: [
      {
        q: "Quẹt lên 'rất thích' giới hạn mấy lần?",
        a: "Mỗi người tối đa 3 lần rất thích để tránh lệch điểm.",
      },
      {
        q: "Chưa quẹt hết có xem kết quả tạm không?",
        a: "Có. Sau khi bạn quẹt xong sẽ thấy xếp hạng tạm thời.",
      },
      {
        q: "Mix địa điểm trong nước và nước ngoài được không?",
        a: "Được. Mỗi link Maps là một thẻ riêng.",
      },
      {
        q: "Desktop không quẹt được thì sao?",
        a: "Có nút Thích / Bỏ qua / Rất thích và phím mũi tên.",
      },
      {
        q: "Thêm điểm sau khi mọi người đã quẹt?",
        a: "Host có thể thêm; thành viên quẹt bổ sung thẻ mới.",
      },
    ],
    relatedSlugs: ["chon-ngay-di-du-lich", "chon-homestay-khach-san", "di-dau-choi-cuoi-tuan"],
  },
  {
    slug: "chon-ngay-di-du-lich",
    title: "Chọn ngày đi du lịch",
    seoTitle: "Chọn ngày đi chơi cả nhóm rảnh | Vote Đi",
    seoDescription:
      "Đặt chuyến 3 ngày, mọi người đánh dấu rảnh từng ngày. Hệ thống gợi ý khung ngày liên tiếp đẹp nhất — chốt lịch du lịch không cần gọi họp.",
    h1: "Ngày nào cả nhóm đi được?",
    category: "travel",
    emoji: "🗓️",
    format: "schedule",
    group: "other",
    defaultSettings: {
      schedule_mode: "trip",
      trip_length: 3,
    },
    suggestedOptions: [],
    optionPlaceholder: "Chọn dải ngày trên lịch…",
    intro:
      "Chế độ chuyến đi: host chọn độ dài 3 ngày và khoảng ngày có thể đi. Mọi người báo rảnh/bận; app gợi ý dải ngày liên tiếp tốt nhất.",
    steps: [
      "Tạo phòng, chọn chế độ chuyến 3 ngày",
      "Thành viên đánh dấu lịch rảnh",
      "Chốt khung ngày và thêm vào lịch",
    ],
    benefits: [
      "Tự tìm dải ngày liên tiếp thay vì đếm tay",
      "Heatmap ai rảnh ngày nào",
      "Xuất file lịch và link Google Calendar",
      "Múi giờ Việt Nam, tên thứ quen thuộc",
    ],
    faq: [
      {
        q: "Chuyến 2 ngày hoặc 4 ngày được không?",
        a: "Được. Đổi độ dài chuyến (trip_length) trong cài đặt phòng.",
      },
      {
        q: "'Có thể' khác 'Rảnh' thế nào?",
        a: "Rảnh tính đủ điểm; 'Có thể' tính nửa điểm khi xếp hạng ngày.",
      },
      {
        q: "Một người bận một ngày trong dải 3 ngày?",
        a: "Khung chuyến chỉ tính người rảnh cả 3 ngày liên tiếp.",
      },
      {
        q: "Ghi chú 'chiều mới rảnh' được không?",
        a: "Có ô ghi chú ngắn cho từng thành viên.",
      },
      {
        q: "Chốt xong có gửi lại nhóm không?",
        a: "Có nút chia sẻ kết quả và tải file .ics.",
      },
      {
        q: "Host có thể đổi dải ngày cho phép chọn không?",
        a: "Host chỉnh khoảng ngày trước khi mọi người vote xong.",
      },
    ],
    relatedSlugs: ["chon-diem-du-lich", "chon-homestay-khach-san", "chon-ngay-teambuilding"],
  },
  {
    slug: "chon-homestay-khach-san",
    title: "Chọn homestay, khách sạn",
    seoTitle: "Vote chọn homestay khách sạn nhóm | Vote Đi",
    seoDescription:
      "So sánh chỗ ở: dán Maps hoặc link Booking, ghi giá/đêm. Cả nhóm bình chọn nhanh một nơi lưu trú, có bản đồ và link đặt phòng trên thẻ.",
    h1: "Ở homestay hay khách sạn nào?",
    category: "travel",
    emoji: "🏡",
    format: "quick",
    group: "place",
    optionKind: "place",
    defaultSettings: { max_choices: 1, option_kind: "place" },
    suggestedOptions: [],
    optionPlaceholder: "Dán link Maps hoặc link đặt phòng…",
    intro:
      "Mỗi chỗ ở một thẻ: Maps để xem vị trí, thêm giá và link Agoda/Booking nếu có. Vote chọn một nơi ngủ cho cả đoàn.",
    steps: [
      "Thêm từng homestay/khách sạn",
      "Ghi giá và link đặt (tuỳ chọn)",
      "Vote và chốt, chia sẻ cho người đặt phòng",
    ],
    benefits: [
      "Gom link rải rác vào một phòng",
      "So sánh vị trí trên bản đồ",
      "Ghi giá/đêm ngay trên thẻ",
      "Chốt nhanh trước khi hết phòng",
    ],
    faq: [
      {
        q: "Chỉ có link Booking không có Maps?",
        a: "Dán link sản phẩm; hệ thống lấy tiêu đề và ảnh xem trước nếu được.",
      },
      {
        q: "Shopee/TikTok chặn đọc link thì sao?",
        a: "Vẫn tạo thẻ; bạn tự nhập tên, giá và tải ảnh.",
      },
      {
        q: "Vote chọn top 2 để đặt dự phòng?",
        a: "Tăng max_choices lên 2 trong cài đặt bình chọn nhanh.",
      },
      {
        q: "Có hiển thị khoảng cách giữa các chỗ không?",
        a: "Dùng tab bản đồ chung để xem vị trí tương đối.",
      },
      {
        q: "Thành viên góp thêm homestay được không?",
        a: "Bật cho phép thành viên thêm lựa chọn trong cài đặt.",
      },
    ],
    relatedSlugs: ["chon-diem-du-lich", "chon-ngay-di-du-lich", "di-dau-choi-cuoi-tuan"],
  },
  {
    slug: "hom-nay-an-gi",
    title: "Hôm nay ăn gì",
    seoTitle: "Quẹt chọn hôm nay ăn gì miễn phí | Vote Đi",
    seoDescription:
      "Thêm món bằng chữ và emoji, cả nhóm quẹt thích hoặc bỏ qua. Tìm món match cả nhóm — giải quyết câu hỏi 'ăn gì' trong vài phút trên Zalo.",
    h1: "Hôm nay ăn gì?",
    category: "food",
    emoji: "🍽️",
    format: "swipe",
    group: "other",
    optionKind: "any",
    defaultSettings: {},
    suggestedOptions: ["Bún bò", "Phở", "Lẩu", "Nướng", "Cơm tấm", "Mì cay"],
    optionPlaceholder: "Thêm món (có thể kèm emoji)…",
    intro:
      "Gợi ý sẵn vài món quen; bạn thêm hoặc sửa. Quẹt phải thích, trái bỏ qua, lên rất thích — xem món nào cả nhóm cùng chọn.",
    steps: [
      "Tạo phòng, chỉnh danh sách món",
      "Gửi link cho roommate hoặc vợ/chồng",
      "Quẹt và chốt món ăn tối",
    ],
    benefits: [
      "Emoji giúp nhìn nhanh trên mobile",
      "Match cả nhóm nổi bật trên kết quả",
      "Không cần gọi điện hỏi từng người",
      "Thêm món mới giữa chừng được",
    ],
    faq: [
      {
        q: "Thêm món bằng cách dán nhiều dòng?",
        a: "Có ô thêm nhanh: mỗi dòng một món.",
      },
      {
        q: "Ăn chay riêng một người?",
        a: "Thêm món chay vào list; mỗi người quẹt theo gu.",
      },
      {
        q: "Kết hợp tên quán thay vì món?",
        a: "Được. Tiêu đề thẻ là tên quán hoặc món tuỳ bạn.",
      },
      {
        q: "Hết món mà chưa ai quẹt?",
        a: "Host thêm món hoặc mời thêm người vào link.",
      },
      {
        q: "Có giới hạn số món không?",
        a: "Swipe hỗ trợ tới 50 lựa chọn.",
      },
    ],
    relatedSlugs: ["quan-nhau-toi-nay", "an-trua-van-phong", "chon-mon-an-ngon-nhat"],
  },
  {
    slug: "quan-nhau-toi-nay",
    title: "Tối nay nhậu quán nào",
    seoTitle: "Bình chọn quán nhậu tối nay | Vote Đi",
    seoDescription:
      "Dán link Google Maps từng quán nhậu, bia hơi, lẩu. Nhóm vote chọn một quán tối nay — có bản đồ, chỉ đường và so sánh trên cùng một phòng.",
    h1: "Tối nay nhậu quán nào?",
    category: "food",
    emoji: "🍻",
    format: "quick",
    group: "place",
    optionKind: "place",
    defaultSettings: { max_choices: 1, option_kind: "place" },
    suggestedOptions: [],
    optionPlaceholder: "Dán link Google Maps quán…",
    intro:
      "Mỗi quán một link Maps. Vote nhanh chọn một nơi nhậu; xem ai vote quán nào và mở chỉ đường một chạm.",
    steps: [
      "Dán link Maps các quán nhậu",
      "Gửi link nhóm bạn",
      "Chốt quán và hẹn giờ tụ",
    ],
    benefits: [
      "Tránh cả nhóm spam link trong chat",
      "Thấy bản đồ trước khi đi",
      "Ghi giá trung bình trên thẻ nếu cần",
      "Vote xong chia sẻ kết quả lên story",
    ],
    faq: [
      {
        q: "Quán chưa có trên Maps?",
        a: "Dán link gần đúng hoặc tạo thẻ chữ rồi sửa tên và địa chỉ.",
      },
      {
        q: "Chọn 2 quán đi luân phiên?",
        a: "Đặt max_choices = 2 nếu muốn top 2.",
      },
      {
        q: "Đặt bàn trước khi vote xong?",
        a: "Nên chốt vote trước; host bấm chốt kết quả để mọi người thấy rõ.",
      },
      {
        q: "Có ẩn danh khi vote quán?",
        a: "Bật ẩn danh nếu không muốn lộ ai chọn quán nào.",
      },
      {
        q: "Thêm quán lúc đang vote?",
        a: "Host hoặc thành viên (nếu được phép) thêm link mới.",
      },
    ],
    relatedSlugs: ["hom-nay-an-gi", "di-dau-choi-cuoi-tuan", "an-trua-van-phong"],
  },
  {
    slug: "an-trua-van-phong",
    title: "Trưa nay team ăn gì",
    seoTitle: "Quẹt chọn cơm trưa văn phòng | Vote Đi",
    seoDescription:
      "Team thêm quán ship cơm trưa hoặc tên món, quẹt chọn nhanh trước giờ break. Chốt trưa nay ăn gì trong vài phút, không họp Zoom.",
    h1: "Trưa nay team ăn gì?",
    category: "work",
    emoji: "🥗",
    format: "swipe",
    group: "other",
    optionKind: "any",
    defaultSettings: {},
    suggestedOptions: ["Cơm văn phòng", "Bún", "Salad", "Pizza", "Cơm tấm ship"],
    optionPlaceholder: "Thêm quán hoặc món…",
    intro:
      "Dành cho team văn phòng: danh sách quán quen hoặc món ship. Quẹt nhanh trước 11h30 để một người gom order.",
    steps: [
      "Thêm quán/món team hay gọi",
      "Gửi link channel nội bộ",
      "Quẹt và chốt, người gom order đặt",
    ],
    benefits: [
      "Tiết kiệm 10 phút hỏi 'trưa ăn gì' mỗi ngày",
      "Match nhóm giúp tránh chia order lẻ",
      "Dùng lại phòng, chỉ cập nhật món",
      "Mobile-first cho nhân viên đi làm",
    ],
    faq: [
      {
        q: "Gắn link GrabFood/ShopeeFood được không?",
        a: "Dán link quán; nếu đọc được sẽ có xem trước tiêu đề.",
      },
      {
        q: "Team 5 người có cần tất cả quẹt?",
        a: "Nên; kết quả chính xác hơn khi đủ người tham gia.",
      },
      {
        q: "Ai không ăn vẫn vào phòng được không?",
        a: "Được; chỉ cần không quẹt hoặc bỏ qua hết.",
      },
      {
        q: "Lặp lại mỗi tuần?",
        a: "Dùng 'Tạo phòng mới giống vậy' sau khi chốt.",
      },
      {
        q: "Có deadline trưa không?",
        a: "Đặt hạn giờ 11h00 trong cài đặt để nhắc team.",
      },
    ],
    relatedSlugs: ["hom-nay-an-gi", "lich-hop-team", "quan-nhau-toi-nay"],
  },
  {
    slug: "chon-ngay-hop-lop",
    title: "Chọn ngày họp lớp",
    seoTitle: "Chọn ngày họp lớp cả lớp rảnh | Vote Đi",
    seoDescription:
      "Chọn lịch theo ngày và buổi sáng/chiều/tối. Lớp đánh dấu rảnh, xem ngày nào đông người nhất — chốt họp mặt, tiệc lớp không gọi từng bạn.",
    h1: "Ngày nào họp lớp được?",
    category: "school",
    emoji: "🎉",
    format: "schedule",
    group: "other",
    defaultSettings: {
      schedule_mode: "day_parts",
      day_parts: ["morning", "afternoon", "evening"],
    },
    suggestedOptions: [],
    optionPlaceholder: "Thêm các ngày trên lịch…",
    intro:
      "Phù hợp họp lớp sau nhiều năm: mỗi ngày chia sáng, chiều, tối. Mọi người báo rảnh; top ngày hiện số người tham gia.",
    steps: [
      "Thêm các ngày cuối tuần hoặc lễ",
      "Gửi link lớp Zalo/Facebook",
      "Chốt ngày và buổi đông người nhất",
    ],
    benefits: [
      "Buổi sáng/chiều/tối tách riêng",
      "Avatar ai bận ngày nào",
      "Thêm vào lịch cá nhân sau khi chốt",
      "Không cần file Excel lịch rảnh",
    ],
    faq: [
      {
        q: "Chỉ chọn ngày, không chia buổi?",
        a: "Đổi schedule_mode sang 'days' trong cài đặt.",
      },
      {
        q: "Lớp 50 người có lag không?",
        a: "Lịch tối ưu mobile; dữ liệu cập nhật theo từng người.",
      },
      {
        q: "Một người rảnh cả ngày phải bấm 3 buổi?",
        a: "Có nút nhanh; vẫn nên đánh dấu từng buổi nếu khác nhau.",
      },
      {
        q: "Alumni ở tỉnh khác vote được không?",
        a: "Có link là tham gia; ghi chú nếu chỉ online.",
      },
      {
        q: "Host là lớp trưởng hay cựu?",
        a: "Ai tạo phòng là host, có quyền chốt và chỉnh lịch.",
      },
    ],
    relatedSlugs: ["chon-mau-ao-lop", "chon-concept-ky-yeu", "chon-ngay-teambuilding"],
  },
  {
    slug: "chon-ngay-teambuilding",
    title: "Chọn ngày teambuilding",
    seoTitle: "Vote ngày teambuilding công ty | Vote Đi",
    seoDescription:
      "HR thêm các ngày ứng viên, nhân viên báo rảnh/bận. Heatmap và top ngày giúp chốt lịch teambuilding ngoài trời hoặc resort nhanh, minh bạch.",
    h1: "Teambuilding ngày nào?",
    category: "work",
    emoji: "🤝",
    format: "schedule",
    group: "other",
    defaultSettings: {
      schedule_mode: "days",
    },
    suggestedOptions: [],
    optionPlaceholder: "Chọn các ngày ứng viên…",
    intro:
      "Chế độ chọn ngày: HR đưa vài cuối tuần hoặc ngày nghỉ bù. Team đánh dấu rảnh; ngày đẹp nhất hiện đầu trang với tỉ lệ tham gia.",
    steps: [
      "Thêm 3–6 ngày ứng viên",
      "Gửi link toàn công ty hoặc phòng ban",
      "Chốt ngày và book địa điểm",
    ],
    benefits: [
      "Minh bạch với ban giám đốc",
      "Giảm email hỏi lịch rảnh",
      "Xuất kết quả chốt kèm lịch",
      "Phù hợp hybrid (ghi chú online)",
    ],
    faq: [
      {
        q: "Có tích hợp Google Calendar công ty không?",
        a: "Sau khi chốt có link thêm sự kiện Google Calendar cá nhân.",
      },
      {
        q: "Nhân viên mới chưa vào link?",
        a: "Host gửi lại link; họ chỉ cần đánh dấu phần còn lại.",
      },
      {
        q: "Đổi ngày ứng viên sau khi gửi?",
        a: "Host chỉnh trước khi chốt; nên thông báo nhóm khi đổi.",
      },
      {
        q: "Ẩn danh khi báo bận?",
        a: "Có thể bật ẩn danh; số đếm vẫn hiện, không lộ cá nhân.",
      },
      {
        q: "So với Doodle khác gì?",
        a: "Giao diện tiếng Việt, tích hợp Vote Đi và chia sẻ Zalo quen thuộc.",
      },
    ],
    relatedSlugs: ["lich-hop-team", "chon-dong-phuc-cong-ty", "chon-ngay-di-du-lich"],
  },
  {
    slug: "lich-hop-team",
    title: "Chọn giờ họp team",
    seoTitle: "Chọn khung giờ họp team online | Vote Đi",
    seoDescription:
      "Tạo các khung giờ họp (VD 9h–10h, 14h–15h), thành viên báo rảnh. Chốt slot đông người nhất cho weekly sync — hợp team remote và hybrid.",
    h1: "Giờ nào họp team được?",
    category: "work",
    emoji: "⏰",
    format: "schedule",
    group: "other",
    defaultSettings: {
      schedule_mode: "time_slots",
      time_slots: [
        { start: "09:00", end: "10:00" },
        { start: "14:00", end: "15:00" },
        { start: "16:30", end: "17:30" },
      ],
    },
    suggestedOptions: [],
    optionPlaceholder: "Thêm hoặc sửa khung giờ…",
    intro:
      "Thay vì hỏi 'chiều nay 3h được không', host tạo vài khung giờ trong tuần. Mọi người chọn rảnh; slot tốt nhất nổi lên đầu.",
    steps: [
      "Đặt tên phòng và các khung giờ",
      "Gửi link Slack/Zalo team",
      "Chốt slot và gửi invite calendar",
    ],
    benefits: [
      "Rõ ràng hơn poll emoji trong chat",
      "Sửa khung giờ trước deadline",
      "Ghi chú múi giờ hoặc 'chỉ online'",
      "Kết quả một chỗ cho PM lưu",
    ],
    faq: [
      {
        q: "Họp recurring mỗi tuần?",
        a: "Tạo phòng mới mỗi tuần hoặc duplicate phòng cũ.",
      },
      {
        q: "Khung giờ qua nửa đêm?",
        a: "Nhập start/end theo định dạng 24h, VD 19:00–20:30.",
      },
      {
        q: "Chỉ 3 người trong team 8?",
        a: "Kết quả vẫn hiện; nên nhắc thành viên còn lại.",
      },
      {
        q: "Kết hợp nhiều ngày trong tuần?",
        a: "Thêm slot kèm ngày cụ thể trên lịch schedule.",
      },
      {
        q: "Timezone khác Việt Nam?",
        a: "Phòng dùng Asia/Ho_Chi_Minh; ghi chú nếu member overseas.",
      },
    ],
    relatedSlugs: ["an-trua-van-phong", "chon-ngay-teambuilding", "chon-qua-tang-sep"],
  },
  {
    slug: "dat-ten-con",
    title: "Đặt tên cho bé",
    seoTitle: "Xếp hạng đặt tên cho bé online | Vote Đi",
    seoDescription:
      "Hai họ kéo thả xếp thứ tự tên em bé, tính điểm Borda công bằng. Chọn tên con chung trên điện thoại — ông bà, cô chú cũng vote qua link.",
    h1: "Đặt tên cho bé thế nào?",
    category: "family",
    emoji: "👶",
    format: "ranking",
    group: "other",
    optionKind: "any",
    defaultSettings: {},
    suggestedOptions: [],
    optionPlaceholder: "Thêm tên gợi ý…",
    intro:
      "Mỗi tên một lựa chọn. Mọi người kéo thả thứ tự yêu thích; điểm Borda cộng lại để chọn tên hài hoà, tránh tranh cãi kéo dài.",
    steps: [
      "Gom list tên từ hai họ",
      "Gửi link cho người thân vote",
      "Xem bảng điểm và chốt tên",
    ],
    benefits: [
      "Borda công bằng hơn vote 1 lần",
      "Kéo thả dễ trên mobile",
      "Tối đa 20 tên — đủ cho shortlist",
      "Kết quả lưu làm kỷ niệm",
    ],
    faq: [
      {
        q: "Bao nhiêu người nên tham gia?",
        a: "Càng nhiều người thân càng phản ánh ý chung; 5–15 người là ổn.",
      },
      {
        q: "Thêm tên giữa chừng?",
        a: "Nên chốt list trước vote. Thêm tên mới khiến người chưa xếp lại.",
      },
      {
        q: "Hai tên hòa điểm?",
        a: "Xem điểm trung bình và số người xếp hạng; host quyết định cuối.",
      },
      {
        q: "Giữ kín tên trước khi sinh?",
        a: "Đặt mật khẩu phòng hoặc chỉ gửi link người thân tin cậy.",
      },
      {
        q: "Có thể kèm ý nghĩa tên không?",
        a: "Ghi trong mô tả từng lựa chọn.",
      },
    ],
    relatedSlugs: ["dat-ten-team-thuong-hieu", "chon-qua-sinh-nhat", "chon-ao-dai-cuoi"],
  },
  {
    slug: "dat-ten-team-thuong-hieu",
    title: "Đặt tên team, thương hiệu",
    seoTitle: "Xếp hạng đặt tên thương hiệu | Vote Đi",
    seoDescription:
      "Startup xếp hạng tên sản phẩm, dự án nội bộ bằng kéo thả Borda. Co-founder và team vote qua link — chốt tên thương hiệu có căn cứ số liệu.",
    h1: "Tên team / thương hiệu nào?",
    category: "work",
    emoji: "🏷️",
    format: "ranking",
    group: "other",
    optionKind: "any",
    defaultSettings: {},
    suggestedOptions: [],
    optionPlaceholder: "Thêm tên đề xuất…",
    intro:
      "Brainstorm tên xong đưa vào phòng ranking. Mỗi người sắp xếp ưu tiên; tên đứng đầu bảng Borda là ứng viên sáng giá nhất.",
    steps: [
      "Thu thập tên từ team marketing",
      "Mọi người xếp hạng cá nhân",
      "Chốt top 1–3 để check trademark",
    ],
    benefits: [
      "Tránh quyết định theo người nói to nhất",
      "So sánh nhiều tên cùng lúc",
      "Export kết quả cho agency",
      "Vote remote cho team đa quốc gia",
    ],
    faq: [
      {
        q: "Có nên ẩn danh?",
        a: "Tùy văn hoá team. Ẩn danh giảm áp lực khi vote sếp.",
      },
      {
        q: "Tên tiếng Anh và Việt chung list?",
        a: "Được. Mỗi tên một dòng lựa chọn.",
      },
      {
        q: "Sau ranking vẫn tranh luận?",
        a: "Dùng top 3 làm shortlist họp ngắn thay vì 20 tên.",
      },
      {
        q: "Investor vote được không?",
        a: "Gửi link; họ nhập tên hiển thị là tham gia.",
      },
      {
        q: "Giới hạn ký tự tên?",
        a: "Tiêu đề mỗi lựa chọn tối đa 80 ký tự.",
      },
    ],
    relatedSlugs: ["chon-logo", "dat-ten-con", "chon-dong-phuc-cong-ty"],
  },
  {
    slug: "chon-qua-sinh-nhat",
    title: "Chọn quà sinh nhật",
    seoTitle: "Bình chọn quà sinh nhật bạn bè | Vote Đi",
    seoDescription:
      "Dán link Shopee, Tiki, quà handmade — nhóm vote chọn một món quà sinh nhật. Xem trước link, ghi giá, chốt quà chung không hỏi đi hỏi lại.",
    h1: "Tặng quà sinh nhật gì?",
    category: "family",
    emoji: "🎁",
    format: "quick",
    group: "other",
    optionKind: "link",
    defaultSettings: { max_choices: 1 },
    suggestedOptions: [],
    optionPlaceholder: "Dán link sản phẩm quà…",
    intro:
      "Mỗi người góp link quà trong ngân sách. Cả nhóm chọn một món; thẻ hiện ảnh và giá nếu đọc được từ trang web.",
    steps: [
      "Thêm link quà trong budget",
      "Gửi link nhóm bạn surprise",
      "Chốt quà và một người đặt hàng",
    ],
    benefits: [
      "Gom ý tưởng quà một chỗ",
      "Tránh trùng quà hoặc vượt budget",
      "Link preview tiết kiệm mở tab",
      "Vote nhanh trước party",
    ],
    faq: [
      {
        q: "Link Shopee không hiện ảnh?",
        a: "Tự tải ảnh và ghi giá tay — vẫn vote bình thường.",
      },
      {
        q: "Góp tiền chung mua quà đắt?",
        a: "Ghi giá trên thẻ; chọn quà trong ngân sách đã thống nhất.",
      },
      {
        q: "Người sinh nhật vào link có sao không?",
        a: "Dùng ẩn danh hoặc gửi link subgroup không có birthday person.",
      },
      {
        q: "Chọn top 2 quà dự phòng?",
        a: "Tăng max_choices lên 2.",
      },
      {
        q: "Quà là voucher chữ không link?",
        a: "Thêm lựa chọn dạng chữ mô tả voucher.",
      },
    ],
    relatedSlugs: ["chon-qua-tang-sep", "dat-ten-con", "chon-phim-toi-nay"],
  },
  {
    slug: "chon-qua-tang-sep",
    title: "Chọn quà tặng sếp / thầy cô",
    seoTitle: "Vote quà tặng sếp thầy cô | Vote Đi",
    seoDescription:
      "Lớp hoặc phòng ban góp link quà 20/11, 8/3, tri ân sếp. Bình chọn nhanh một món lịch sự, trong ngân sách — minh bạch, không ai phải gom tiền mù.",
    h1: "Quà tặng sếp / thầy cô gì?",
    category: "work",
    emoji: "💐",
    format: "quick",
    group: "other",
    optionKind: "link",
    defaultSettings: { max_choices: 1 },
    suggestedOptions: [],
    optionPlaceholder: "Dán link quà gợi ý…",
    intro:
      "Phù hợp quỹ lớp hoặc phòng ban: đề xuất quà bằng link, vote chọn một phương án phù hợp văn hoá công ty hoặc trường.",
    steps: [
      "Thống nhất ngân sách, thêm link quà",
      "Vote kín hoặc công khai",
      "Chốt và ủy quyền người mua",
    ],
    benefits: [
      "Tránh quà không phù hợp gu người nhận",
      "Minh bạch với quỹ chung",
      "Lưu lịch sử năm ngoái tặng gì",
      "Gửi link Zalo lớp dễ dàng",
    ],
    faq: [
      {
        q: "Quà hiện vật không có link?",
        a: "Thêm mô tả chữ + ảnh tải lên thay link.",
      },
      {
        q: "Lớp 40 người vote ẩn danh?",
        a: "Bật ẩn danh để không ai biết bạn chọn quà nào.",
      },
      {
        q: "Hòa phiếu giữa hai quà?",
        a: "Host chốt hoặc mở vote lại giữa top 2.",
      },
      {
        q: "Kết hợp quà + thiệp chung?",
        a: "Một lựa chọn có thể mô tả combo trong phần mô tả.",
      },
      {
        q: "Deadline trước ngày lễ?",
        a: "Đặt hạn giờ phòng để kịp đặt hàng ship.",
      },
    ],
    relatedSlugs: ["chon-qua-sinh-nhat", "chon-ngay-hop-lop", "lich-hop-team"],
  },
  {
    slug: "chon-phim-toi-nay",
    title: "Tối nay xem phim gì",
    seoTitle: "Quẹt chọn phim tối nay cả nhóm | Vote Đi",
    seoDescription:
      "Thêm tên phim hoặc link Netflix, VieON — quẹt thích/bỏ qua. Tìm phim match cả nhóm cho movie night, không spoil tranh cãi trong group chat.",
    h1: "Tối nay xem phim gì?",
    category: "community",
    emoji: "🎬",
    format: "swipe",
    group: "other",
    optionKind: "any",
    defaultSettings: {},
    suggestedOptions: ["Hài", "Kinh dị", "Hoạt hình", "Tài liệu", "Hàn Quốc", "Marvel"],
    optionPlaceholder: "Tên phim hoặc link…",
    intro:
      "Roommate hoặc hội bạn thêm phim đang muốn xem. Quẹt chọn; phim được nhiều 'rất thích' và match nhóm nổi bật trên kết quả.",
    steps: [
      "Thêm phim hoặc link streaming",
      "Mời mọi người quẹt",
      "Chốt phim và bật TV",
    ],
    benefits: [
      "Giảm 'em không xem thể loại đó'",
      "Link giúp mở đúng app",
      "Match cả nhóm có hiệu ứng vui",
      "Quẹt nhanh hơn đọc review dài",
    ],
    faq: [
      {
        q: "Thêm phim theo mood emoji?",
        a: "Ghi emoji vào tiêu đề thẻ phim.",
      },
      {
        q: "Một người muốn xem 2 phim?",
        a: "Quẹt thích cả hai; điểm cộng cho cả hai trên bảng xếp hạng.",
      },
      {
        q: "Phim chiếu rạp vs Netflix chung phòng?",
        a: "Được. Ghi rõ trong mô tả từng lựa chọn.",
      },
      {
        q: "Spoiler trong bình luận?",
        a: "Host có thể tắt bình luận hoặc nhắc rule trong mô tả phòng.",
      },
      {
        q: "Chưa ai quẹt hết?",
        a: "Xem tiến độ trên header; nhắc bạn bè qua Zalo.",
      },
    ],
    relatedSlugs: ["hom-nay-an-gi", "binh-chon-nhanh", "cuoc-thi-anh"],
  },
  {
    slug: "cuoc-thi-anh",
    title: "Cuộc thi ảnh đẹp",
    seoTitle: "Tạo cuộc thi ảnh chấm điểm online | Vote Đi",
    seoDescription:
      "Tải ảnh dự thi, khán giả chấm 1–5 sao; host chỉ định giám khảo với tỉ trọng 50%. Phù hợp CLB, trường, event — công bằng và minh bạch.",
    h1: "Cuộc thi ảnh đẹp",
    category: "community",
    emoji: "📷",
    format: "rating",
    group: "other",
    optionKind: "image",
    defaultSettings: { judge_weight: 0.5 },
    suggestedOptions: [],
    optionPlaceholder: "Tải ảnh dự thi…",
    intro:
      "Mỗi ảnh một thẻ. Mọi người chấm sao; host gán giám khảo để điểm chuyên môn chiếm một phần. Kết quả hiện điểm TB và tách giám khảo/khán giả.",
    steps: [
      "Tạo phòng, bật giám khảo nếu cần",
      "Thí sinh tải ảnh",
      "Chấm điểm và công bố giải",
    ],
    benefits: [
      "Không cần Google Form + tính tay",
      "Giám khảo có trọng số riêng",
      "Ảnh xem to, zoom chi tiết",
      "Realtime khi đang chấm",
    ],
    faq: [
      {
        q: "Một người chấm nhiều ảnh?",
        a: "Mỗi người chấm từng ảnh một lần; có thể sửa điểm trước deadline.",
      },
      {
        q: "Giám khảo là ai?",
        a: "Host chọn thành viên trong phòng làm giám khảo.",
      },
      {
        q: "Ẩn danh khi chấm?",
        a: "Có thể bật ẩn danh; chỉ hiện điểm tổng hợp.",
      },
      {
        q: "Giới hạn dung lượng ảnh?",
        a: "Tuân theo giới hạn upload của Vote Đi; nên nén ảnh hợp lý.",
      },
      {
        q: "Hòa điểm giải nhất?",
        a: "Ưu tiên ảnh có nhiều lượt chấm hơn.",
      },
      {
        q: "Khán giả không trong phòng chấm được không?",
        a: "Cần vào phòng qua link; không cần tài khoản đăng ký.",
      },
    ],
    relatedSlugs: ["chon-mon-an-ngon-nhat", "chon-concept-ky-yeu", "chon-phim-toi-nay"],
  },
  {
    slug: "chon-mon-an-ngon-nhat",
    title: "Chấm điểm món ăn",
    seoTitle: "Chấm điểm món ăn ngon nhất | Vote Đi",
    seoDescription:
      "Potluck, tiệc lớp, food tour — mỗi món một thẻ, chấm 1–5 sao. Xem điểm trung bình và số lượt chấm để tìm món ngon nhất buổi party.",
    h1: "Món nào ngon nhất?",
    category: "food",
    emoji: "⭐",
    format: "rating",
    group: "other",
    optionKind: "any",
    defaultSettings: {},
    suggestedOptions: [],
    optionPlaceholder: "Thêm món (ảnh hoặc tên)…",
    intro:
      "Sau liên hoan hoặc cooking contest, mọi người chấm từng món. Bảng xếp hạng theo điểm TB — vui, không cần ban giám khảo chính thức.",
    steps: [
      "Thêm món kèm ảnh nếu có",
      "Mời mọi người chấm sao",
      "Công bố món thắng và reaction",
    ],
    benefits: [
      "Khích lệ người nấu được ghi nhận",
      "Điểm số rõ ràng, ít cãi",
      "Kết hợp ảnh món trên thẻ",
      "Dùng lại cho hội chợ ẩm thực",
    ],
    faq: [
      {
        q: "Khác cuộc thi ảnh thế nào?",
        a: "Cùng format rating nhưng tập trung món ăn; giám khảo tùy chọn.",
      },
      {
        q: "Chấm điểm ẩn danh?",
        a: "Bật ẩn danh nếu sợ nể người nấu.",
      },
      {
        q: "Một món nhiều người nấu chung?",
        a: "Một thẻ một món; ghi tên người nấu trong mô tả.",
      },
      {
        q: "Cho phép half star?",
        a: "Chấm nguyên sao 1–5 theo thiết kế Vote Đi.",
      },
      {
        q: "Export kết quả?",
        a: "Chia sẻ màn kết quả hoặc chụp bảng xếp hạng.",
      },
    ],
    relatedSlugs: ["hom-nay-an-gi", "cuoc-thi-anh", "quan-nhau-toi-nay"],
  },
  {
    slug: "chon-ao-dai-cuoi",
    title: "Chọn áo dài, váy cưới",
    seoTitle: "Vote áo dài váy cưới đấu loại | Vote Đi",
    seoDescription:
      "Cô dâu chú rể tải ảnh áo dài, váy cưới — họ hàng vote bracket chọn một thiết kế. Chốt trang phục đám cưới online, tiện cho người ở xa.",
    h1: "Áo dài / váy cưới nào?",
    category: "family",
    emoji: "👰",
    format: "bracket",
    group: "other",
    optionKind: "image",
    mode: "knockout",
    defaultSettings: { mode: "knockout" },
    suggestedOptions: [],
    optionPlaceholder: "Tải ảnh áo dài hoặc váy…",
    intro:
      "Mỗi mẫu một ảnh chụp thử. Gia đình hai bên vote đấu loại để chọn outfit chính hoặc lễ vu quy — minh bạch và vui.",
    steps: [
      "Tải ảnh các mẫu đã thử",
      "Gửi link nhóm họ hàng",
      "Chốt mẫu thắng cho tailor",
    ],
    benefits: [
      "Giảm áp lực chọn trong tiệm",
      "Người xa vote qua điện thoại",
      "Sơ đồ bracket dễ giải thích",
      "Lưu kết quả làm kỷ niệm cưới",
    ],
    faq: [
      {
        q: "Ảnh chụp bằng điện thoại có được không?",
        a: "Được nếu rõ màu và form váy; tránh filter quá mạnh.",
      },
      {
        q: "Tách áo dài lễ và tiệc?",
        a: "Tạo hai phòng riêng hoặc gom hết vào một bracket lớn.",
      },
      {
        q: "Mẹ chồng là host được không?",
        a: "Ai tạo phòng là host; có thể chuyển quyền trong cài đặt nếu hỗ trợ.",
      },
      {
        q: "Bao nhiêu mẫu là đủ?",
        a: "4–8 mẫu là hợp lý cho knockout.",
      },
      {
        q: "Vote xong đổi ý?",
        a: "Trước khi chốt có thể tạo phòng mới với list cập nhật.",
      },
    ],
    relatedSlugs: ["dat-ten-con", "chon-qua-sinh-nhat", "chon-concept-ky-yeu"],
  },
  {
    slug: "binh-chon-nhanh",
    title: "Tự tạo bình chọn",
    seoTitle: "Tạo bình chọn nhanh online miễn phí | Vote Đi",
    seoDescription:
      "Mẫu trống: tự đặt câu hỏi, thêm lựa chọn chữ/ảnh/địa điểm/link. Bình chọn nhanh 1 hoặc nhiều đáp án — gửi link Zalo, không cần đăng ký.",
    h1: "Tạo bình chọn của bạn",
    category: "community",
    emoji: "✅",
    format: "quick",
    group: "other",
    optionKind: "any",
    defaultSettings: { max_choices: 1 },
    suggestedOptions: [],
    optionPlaceholder: "Thêm lựa chọn…",
    intro:
      "Không gắn chủ đề cụ thể: hội thảo chọn chủ đề, nhóm chọn màu sơn, CLB chọn slogan… Bạn tự điền câu hỏi và lựa chọn.",
    steps: [
      "Đặt tên phòng và câu hỏi",
      "Thêm lựa chọn tuỳ ý",
      "Chia sẻ link và thu phiếu",
    ],
    benefits: [
      "Linh hoạt mọi tình huống vote",
      "Hỗ trợ nhiều loại lựa chọn",
      "Cài max chọn 1 hoặc nhiều",
      "Miễn phí, không cần app",
    ],
    faq: [
      {
        q: "Khác Google Form thế nào?",
        a: "Giao diện mobile nhanh, realtime, chia sẻ Zalo quen thuộc tại VN.",
      },
      {
        q: "Có deadline không?",
        a: "Tuỳ chọn: không hạn hoặc đặt giờ đóng vote.",
      },
      {
        q: "Ẩn kết quả đến khi vote?",
        a: "Cài results_visibility trong bước cài đặt.",
      },
      {
        q: "Thành viên thêm option?",
        a: "Bật allow_member_options nếu muốn cộng tác.",
      },
      {
        q: "Xoá phòng sau khi xong?",
        a: "Host có thể xoá phòng trong cài đặt (xác nhận 2 bước).",
      },
      {
        q: "Export Excel?",
        a: "Xem kết quả trên web; có thể chụp hoặc copy số liệu hiển thị.",
      },
    ],
    relatedSlugs: ["hom-nay-an-gi", "di-dau-choi-cuoi-tuan", "chon-phim-toi-nay"],
  },
];

/** @deprecated Use `templatesForTab("place")` or filter by `group === "place"`. */
export const PLACE_TEMPLATES = TEMPLATES.filter((t) => t.group === "place");

/** @deprecated Use `TEMPLATES.filter((t) => t.group !== "place")`. */
export const OTHER_TEMPLATES = TEMPLATES.filter((t) => t.group !== "place");

export function getTemplate(slug: string | null | undefined): RoomTemplate | null {
  if (!slug) return null;
  return TEMPLATES.find((t) => t.slug === slug) ?? null;
}

export function templatesByCategory(category: TemplateCategory): RoomTemplate[] {
  return TEMPLATES.filter((t) => t.category === category);
}

export function templatesForTab(tabId: TemplateTabId): RoomTemplate[] {
  if (tabId === "place") {
    return TEMPLATES.filter((t) => t.group === "place" || t.category === "place");
  }
  return TEMPLATES.filter((t) => t.category === tabId);
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export function searchTemplates(query: string): RoomTemplate[] {
  const q = normalizeSearchText(query);
  if (!q) return [...TEMPLATES];
  return TEMPLATES.filter((t) => {
    const haystack = normalizeSearchText(
      [t.slug, t.title, t.intro, t.h1, t.seoTitle, t.seoDescription, ...t.suggestedOptions].join(" "),
    );
    return haystack.includes(q);
  });
}

export function templatesByFormat(format: RoomTemplate["format"]): RoomTemplate[] {
  return TEMPLATES.filter((t) => t.format === format);
}
