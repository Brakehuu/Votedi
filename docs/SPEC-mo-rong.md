# Vote Đi – Đặc tả mở rộng nền tảng (SPEC)

> File này là nguồn sự thật duy nhất cho đợt mở rộng. Làm **lần lượt từng Phase**, xong mỗi Phase: chạy `npm run lint` + `npm run build` cho sạch lỗi, liệt kê file migration cần chạy, tự test theo checklist của Phase đó, rồi **DỪNG và báo cáo**. Không tự nhảy sang Phase sau.

---

## 0. Định vị sản phẩm

**Vote Đi** là trang web giúp hội bạn, lớp, team, gia đình **chốt nhanh mọi quyết định chung**: đi đâu chơi, ăn gì, quán nhậu nào, ngày nào cả nhóm rảnh, chọn mẫu áo nhóm, đặt tên, cuộc thi ảnh… Gửi link Zalo/Messenger là vote được, không cần tài khoản.

Nguyên tắc thiết kế:
- **Một khái niệm duy nhất cho người dùng: "phòng vote"**. Mỗi phòng có một **kiểu vote** (format). Không để người dùng phải hiểu thuật ngữ kỹ thuật.
- **Tạo phòng bắt đầu bằng câu hỏi "Bạn muốn chốt gì?"** → chọn mẫu có sẵn (template) hoặc tự chọn kiểu vote.
- **Mobile-first**, giữ nguyên hệ thiết kế liquid glass hiện tại (màu, font Be Vietnam Pro, bo góc, glass, gradient xanh ngọc). Mọi màn mới phải đồng bộ với màn knockout/vòng loại đã làm.
- **Không phá tính năng đang chạy**: bracket (Knockout, Vòng loại → Knockout) phải hoạt động y như cũ sau mỗi Phase.
- Toàn bộ chữ giao diện tiếng Việt, câu ngắn, dễ hiểu.

---

## 1. Các kiểu vote (formats)

Tạo registry duy nhất `src/lib/formats.ts` (id, tên hiển thị, slug URL, icon lucide, mô tả 1 câu, loại lựa chọn cho phép, cài đặt riêng, hàm tính kết quả). Mọi nơi (wizard, trang phòng, trang SEO, sitemap) đọc từ registry này.

| id | Tên hiển thị | Slug SEO | Dùng cho | Loại lựa chọn |
|---|---|---|---|---|
| `quick` | Bình chọn nhanh | `binh-chon-nhanh` | Đi đâu, ăn gì, quán nào, quà gì… | chữ, ảnh, địa điểm, link |
| `bracket` | Đấu loại World Cup | `dau-loai-world-cup` | Mẫu áo, logo, ảnh | ảnh (và chữ) |
| `schedule` | Chọn lịch rảnh | `chon-lich-ranh` | Ngày đi chơi, họp lớp, chuyến du lịch | ngày / buổi / khung giờ |
| `swipe` | Quẹt chọn | `quet-chon` | Hôm nay ăn gì, chọn phim, nhiều lựa chọn | chữ, ảnh, địa điểm, link |
| `ranking` | Xếp hạng | `xep-hang` | Đặt tên con, tên team, ưu tiên | chữ, ảnh |
| `rating` | Chấm điểm | `cham-diem` | Cuộc thi ảnh, thiết kế, món ăn | ảnh, chữ |

`bracket` có 3 biến thể (`bracket_mode`): `knockout` (đang có), `qualify_knockout` (đang có), `group_knockout` (mới – vòng bảng).

### 1.1 Bình chọn nhanh (`quick`)
- Chọn 1 hoặc chọn nhiều (`max_choices`: 1..n, mặc định 1).
- Kết quả: đếm phiếu, % và thanh ngang, avatar người vote (nếu không ẩn danh).
- Hòa: hiện "Đang hòa", khi chốt thì theo `tie_rule` (`random` | `host`).
- Có thể không đặt hạn giờ (vote tới khi host bấm "Chốt kết quả").

### 1.2 Đấu loại World Cup (`bracket`)
- Giữ nguyên toàn bộ logic hiện tại (auto xếp nhánh, hạt giống, bye, sheet vote, sơ đồ dọc/ngang).
- **Mới – Vòng bảng → Knockout (`group_knockout`)**: chia các lựa chọn thành bảng 4 (bảng A, B, C…) theo bốc thăm ngẫu nhiên hoặc host xếp. Trong mỗi bảng, mỗi người chọn **2 lựa chọn** mình thích. Hết giờ: nhất và nhì mỗi bảng vào sơ đồ knockout, xếp chéo kiểu World Cup (nhất A gặp nhì B, nhất B gặp nhì A…). Số lựa chọn 8–32. Giao diện vòng bảng: tab theo bảng, mỗi bảng là một bảng xếp hạng mini có vạch "Vào vòng trong".

### 1.3 Chọn lịch rảnh (`schedule`) – "Ai rảnh ngày nào?"
Chế độ (`schedule_mode`):
1. `days` – chọn ngày (VD: họp lớp).
2. `day_parts` – ngày + buổi (Sáng / Chiều / Tối).
3. `time_slots` – khung giờ tùy chỉnh (VD: 19:00–21:00).
4. `trip` – **chuyến đi nhiều ngày**: host đặt độ dài chuyến (`trip_length` N ngày) và khoảng ngày có thể đi; thành viên đánh dấu từng ngày; hệ thống tự tìm **các khung N ngày liên tiếp** tốt nhất.

Cách vote: mỗi ô có 3 trạng thái, chạm để xoay vòng: **Rảnh ✓** (1 điểm) → **Có thể ~** (0.5 điểm) → **Bận ✕** (0) → trống. Có ô ghi chú ngắn cho mỗi người ("mình rảnh sau 17h").

Hiển thị:
- Đầu trang: **"Ngày đẹp nhất"** – top 3 lựa chọn, mỗi cái ghi "5/6 người rảnh · 1 người có thể" và avatar ai bận.
- Desktop: lưới heatmap (hàng = người, cột = ngày/khung), màu đậm dần theo số người rảnh.
- Mobile: danh sách dọc theo ngày, nhóm theo tuần, mỗi dòng: ngày (T7, 12/10), thanh mức rảnh, avatar, 3 nút trạng thái của mình. Có nút "Rảnh tất cả" / "Bận tất cả" cho nhanh.
- `trip`: khối "Khung đẹp nhất" liệt kê các dải ngày (VD "Thứ 6 11/10 → Chủ nhật 13/10 · 5/6 người đi được") – chỉ tính người rảnh **tất cả** các ngày trong khung.
- Khi chốt: màn kết quả có nút **"Thêm vào lịch"** (tải file `.ics` + link Google Calendar) và nút chia sẻ.
- Múi giờ cố định `Asia/Ho_Chi_Minh`. Tên thứ tiếng Việt (T2…CN).

### 1.4 Quẹt chọn (`swipe`) – "Hôm nay ăn gì?"
- Chồng thẻ kiểu Tinder: quẹt phải = **Thích ❤️** (1 điểm), quẹt trái = **Bỏ qua** (0), quẹt lên = **Rất thích 🔥** (2 điểm, mỗi người tối đa 3 lần). Có 3 nút bấm tương ứng cho người không quen quẹt, hỗ trợ bàn phím ← → ↑.
- Thanh tiến độ "7/15". Quẹt hết → màn "Chờ mọi người" + kết quả tạm.
- Kết quả: xếp theo điểm; lựa chọn **cả nhóm đều thích** hiện nhãn **"Match cả nhóm 🎉"** và hiệu ứng pháo giấy.
- Cho phép "Quẹt lại" khi phòng còn mở.

### 1.5 Xếp hạng (`ranking`)
- Mỗi người kéo thả sắp xếp thứ tự (dùng `@dnd-kit`), trên mobile có tay cầm kéo và nút ↑ ↓.
- Tính điểm Borda: hạng 1 được N điểm, hạng cuối 1 điểm. Kết quả hiện điểm và hạng trung bình.
- Tối đa 20 lựa chọn.

### 1.6 Chấm điểm (`rating`)
- Chấm 1–5 sao từng lựa chọn. Kết quả: điểm trung bình (1 chữ số thập phân) + số lượt chấm; hòa thì ưu tiên nhiều lượt chấm hơn.
- Tùy chọn **Giám khảo**: host đánh dấu thành viên là giám khảo và đặt tỉ trọng (VD giám khảo 50% – khán giả 50%). Kết quả hiện cả điểm giám khảo, điểm khán giả và điểm tổng.

---

## 2. Loại lựa chọn (options)

Bảng `items` hiện tại mở rộng thành lựa chọn đa dạng (`item_type`):

| Loại | Dữ liệu | Hiển thị |
|---|---|---|
| `image` | ảnh (như hiện tại) | ảnh vuông, bấm xem to, ZoomIcon |
| `text` | tiêu đề + mô tả ngắn + emoji tùy chọn | thẻ chữ, emoji lớn làm "ảnh" |
| `place` | tên, địa chỉ, lat, lng, link Maps gốc, ảnh tùy chọn | thẻ địa điểm có bản đồ nhỏ |
| `link` | url, tiêu đề, ảnh, tên trang, giá (text) | thẻ xem trước link |

Mọi loại đều có: `title` (bắt buộc, ≤ 80 ký tự), `description` (≤ 200), `price_text` (tùy chọn, VD "250k/người"), `emoji` (tùy chọn).

### 2.1 Địa điểm Google Maps
**Thêm địa điểm:** dán một hoặc nhiều link Google Maps (mỗi dòng một link) → hệ thống tự tạo thẻ.

Route server `POST /api/places/resolve` nhận URL, trả `{ name, lat, lng, mapsUrl }`:
- Hỗ trợ: `maps.app.goo.gl/…`, `goo.gl/maps/…` (theo redirect phía server, tối đa 5 lần), `google.com/maps/place/<Tên>/@lat,lng,…`, `…/data=…!3d<lat>!4d<lng>` (ưu tiên toạ độ `!3d!4d` vì chính xác hơn `@`), `google.com/maps?q=lat,lng` hoặc `?q=<tên>`, `maps.google.com/?cid=…` (không có toạ độ thì chỉ lấy tên nếu có).
- Tên lấy từ đoạn `/place/<Tên>/`, giải mã `+` và `%xx`. Không lấy được tên thì để trống, người dùng tự gõ.
- Không dùng Places API trả phí. Người dùng sửa được tên, thêm địa chỉ, giá, ghi chú.

**Hiển thị địa điểm:**
- Thẻ: tên, địa chỉ (nếu có), giá, **bản đồ nhỏ** (iframe, chỉ tải khi thẻ vào màn hình – `loading="lazy"` + IntersectionObserver). Dùng Google Maps Embed API nếu có `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY` (`https://www.google.com/maps/embed/v1/place?key=…&q=lat,lng`), không có key thì dùng `https://maps.google.com/maps?q=lat,lng&z=16&output=embed`.
- 2 nút: **"Chỉ đường"** (`https://www.google.com/maps/dir/?api=1&destination=lat,lng`) và **"Mở Google Maps"** (link gốc).
- Phòng có từ 2 địa điểm trở lên: nút **"Xem trên bản đồ"** mở bản đồ tổng (Leaflet + OpenStreetMap, ghi nguồn OSM), marker đánh số theo thứ hạng hiện tại, bấm marker hiện thẻ nhỏ.

### 2.2 Link sản phẩm / homestay
Route `POST /api/unfurl` đọc thẻ Open Graph (`og:title`, `og:image`, `og:site_name`) của URL.
- **Chống SSRF bắt buộc**: chỉ `http/https`, phân giải DNS rồi chặn IP nội bộ (127.0.0.0/8, 10/8, 172.16/12, 192.168/16, 169.254/16, ::1, fc00::/7), timeout 5s, đọc tối đa 1MB, tối đa 3 redirect, User-Agent riêng.
- Rate limit theo user (VD 20 lần/phút).
- Không đọc được (Shopee, TikTok hay chặn) thì vẫn tạo thẻ với tên miền + cho người dùng tự nhập tên, giá, tải ảnh.
- Ảnh og:image được tải về và lưu vào Storage (không hotlink) để thẻ không bị vỡ.

### 2.3 Thêm lựa chọn hàng loạt
Trong wizard và lobby, ô "Thêm nhanh": dán nhiều dòng → tự nhận diện từng dòng: link Maps → `place`, link khác → `link`, còn lại → `text`. Kéo thả/chọn nhiều ảnh → `image`. Hiển thị trước danh sách sẽ thêm, cho sửa trước khi lưu.

### 2.4 Thành viên thêm lựa chọn
Cài đặt `allow_member_options` (mặc định bật cho `quick`, `swipe`, `schedule` không áp dụng; tắt cho `bracket`, `rating`). Giới hạn số lựa chọn: quick 30, swipe 50, ranking 20, rating 50, bracket như hiện tại.

---

## 3. Tính năng chung cho mọi phòng

### 3.1 Vote ẩn danh
- Cài đặt `anonymous` (mặc định tắt). Bật → **không ai** thấy ai vote gì, kể cả host (ghi rõ trong UI: "Ẩn danh: không ai thấy bạn chọn gì, kể cả chủ phòng").
- Thực thi ở database: khi phòng ẩn danh, RLS không cho select bảng phiếu (chỉ thấy phiếu của chính mình); số liệu lấy qua RPC tổng hợp chỉ trả số đếm.
- Đã có phiếu thì chỉ được chuyển **tắt → bật** ẩn danh, không được bật → tắt.
- Giao diện ẩn danh: thay avatar người vote bằng số đếm, có nhãn nhỏ "Ẩn danh" ở header.

### 3.2 Hiển thị kết quả
`results_visibility`: `live` (thấy ngay – mặc định), `after_vote` (vote xong mới thấy), `after_close` (chốt mới thấy – tránh a dua). Áp dụng ở cả RPC, không chỉ ẩn ở giao diện.

### 3.3 Thả tim và reaction
- Mỗi lựa chọn có nút **❤️** kèm số đếm (bấm lại để bỏ). Nhấn giữ (mobile) hoặc hover (desktop) mở thêm 😍 🔥 😂 👎.
- Mỗi người một reaction mỗi loại mỗi lựa chọn. Realtime. Reaction **không tính vào phiếu**.
- Phòng ẩn danh: chỉ hiện số đếm, không hiện ai thả.

### 3.4 Bình luận
- Hai cấp: **bình luận chung của phòng** (tab "Trò chuyện") và **bình luận từng lựa chọn** (mở từ thẻ lựa chọn, hiện số bình luận trên thẻ).
- Tối đa 500 ký tự, tối đa 1 bình luận / 3 giây / người, tự nhận link thành link bấm được, emoji thoải mái.
- Người viết xoá được bình luận của mình; host xoá được mọi bình luận. Bình luận xoá hiện "Bình luận đã bị xoá".
- Realtime, cuộn tới bình luận mới, badge số bình luận mới khi đang ở tab khác.
- Phòng ẩn danh: bình luận vẫn hiện tên (ghi chú rõ trong UI "Bình luận không ẩn danh"), hoặc host bật `anonymous_comments` để hiện "Thành viên ẩn danh".
- Host có thể tắt bình luận (`comments_enabled`).

### 3.5 Hạn giờ và chốt kết quả
- Mọi kiểu vote: hạn giờ **tùy chọn** (bracket bắt buộc như hiện tại). Không hạn giờ thì host bấm "Chốt kết quả".
- Đếm ngược hiện ở header khi có hạn.
- Chốt: lưu kết quả vào `rooms.result` (jsonb: người thắng, bảng điểm, thời điểm chốt), `status = 'closed'`. Hàm `close_room_if_due(room_id)` idempotent, gọi khi load trang, khi đếm ngược về 0 và sau mỗi phiếu (giống `advance_room`).
- Host có thể "Mở lại vote" khi phòng đã chốt (trừ bracket).

### 3.6 Màn kết quả chung
- Lựa chọn thắng lớn ở trên (ảnh/thẻ địa điểm/thẻ link/ngày), sau đó bảng xếp hạng đầy đủ.
- Nút theo loại: địa điểm → "Chỉ đường"; lịch → "Thêm vào lịch"; link → "Mở link".
- "Chia sẻ kết quả" (ảnh kết quả OG + Web Share), "Tạo phòng mới giống vậy" (nhân bản cài đặt và lựa chọn).
- Trang `/p/[slug]/ket-qua` mở rộng cho mọi kiểu vote.

### 3.7 Ảnh xem trước khi share link Zalo / Messenger / Facebook
- `generateMetadata` cho `/p/[slug]`: `og:title` = "Vote giúp nhóm: {tên phòng}", `og:description` = "{Kiểu vote} · {N} lựa chọn · {M} người đã tham gia. Bấm để vote, không cần tài khoản.", `og:image` tuyệt đối, `og:url`, `og:type=website`, `og:site_name=Vote Đi`, `og:locale=vi_VN`, `twitter:card=summary_large_image`.
- `/p/[slug]/opengraph-image` (1200×630, PNG, cố gắng < 300KB): logo, tên phòng (tối đa 2 dòng), nhãn kiểu vote, tối đa 4 ảnh/emoji lựa chọn dạng lưới, dòng "Vào vote ngay · votedi.vn". Phòng có mật khẩu: **không** hiện ảnh lựa chọn, chỉ hiện tên phòng và biểu tượng khoá. Phòng đã chốt: ảnh kết quả (lựa chọn thắng + "Nhóm đã chốt!").
- Dữ liệu OG lấy phía server bằng secret key, **chỉ các trường an toàn** (tên phòng, kiểu, số lựa chọn, số người, ảnh bìa).
- **Quan trọng cho Zalo**: bot của Zalo/Facebook không chạy JS và không có cookie. Kiểm tra `src/proxy.ts` và trang phòng: request không có session vẫn phải trả **HTTP 200** với đầy đủ thẻ meta trong HTML ban đầu (không redirect, không chặn). Việc đăng nhập ẩn danh chỉ xảy ra phía client.
- Trang chủ và trang SEO cũng có OG image riêng.
- Ghi vào README: dùng công cụ debug chia sẻ của Zalo và Facebook Sharing Debugger để làm mới cache khi đổi ảnh.

### 3.8 Mật khẩu, khoá phòng, mời ra
Giữ như hiện tại (mật khẩu tùy chọn, mặc định tắt).

---

## 4. Mẫu phòng có sẵn (templates)

File `src/lib/templates.ts` là nguồn duy nhất cho: bước chọn mẫu trong wizard, thư viện `/mau`, trang SEO `/mau/[slug]`, sitemap. Mỗi mẫu gồm: `slug`, `title` (tên nút), `seoTitle`, `seoDescription`, `h1`, `category`, `emoji`, `format`, cài đặt mặc định, **lựa chọn gợi ý** (placeholder người dùng sửa được), `intro` (2–3 câu), `steps` (3 bước), `faq` (4–6 câu), `relatedSlugs`.

Danh mục (`category`): Du lịch · Ăn uống · Thời trang & thiết kế · Lớp học & trường · Công ty & team · Gia đình · Cộng đồng & cuộc thi.

Danh sách mẫu ban đầu:

| slug | Tên | Kiểu | Ghi chú |
|---|---|---|---|
| `chon-mau-ao-nhom` | Chọn mẫu áo nhóm | bracket (qualify_knockout) | mẫu cốt lõi |
| `chon-mau-ao-lop` | Chọn áo lớp | bracket | |
| `chon-logo` | Chọn logo | bracket (knockout) | |
| `chon-concept-ky-yeu` | Chọn concept kỷ yếu | bracket | |
| `chon-dong-phuc-cong-ty` | Chọn đồng phục công ty | bracket | |
| `di-dau-choi-cuoi-tuan` | Cuối tuần đi đâu chơi | quick (place) | |
| `chon-diem-du-lich` | Chọn điểm du lịch | swipe (place) | |
| `chon-ngay-di-du-lich` | Chọn ngày đi du lịch | schedule (trip) | trip_length 3 |
| `chon-homestay-khach-san` | Chọn homestay, khách sạn | quick (link, có giá) | |
| `hom-nay-an-gi` | Hôm nay ăn gì | swipe (text + emoji) | gợi ý: Bún bò, Phở, Lẩu, Nướng, Cơm tấm, Mì cay… |
| `quan-nhau-toi-nay` | Tối nay nhậu quán nào | quick (place) | |
| `an-trua-van-phong` | Trưa nay team ăn gì | swipe (text) | |
| `chon-ngay-hop-lop` | Chọn ngày họp lớp | schedule (day_parts) | |
| `chon-ngay-teambuilding` | Chọn ngày teambuilding | schedule (days) | |
| `lich-hop-team` | Chọn giờ họp team | schedule (time_slots) | |
| `dat-ten-con` | Đặt tên cho bé | ranking (text) | |
| `dat-ten-team-thuong-hieu` | Đặt tên team, thương hiệu | ranking (text) | |
| `chon-qua-sinh-nhat` | Chọn quà sinh nhật | quick (link) | |
| `chon-qua-tang-sep` | Chọn quà tặng sếp / thầy cô | quick (link) | |
| `chon-phim-toi-nay` | Tối nay xem phim gì | swipe (text/link) | |
| `cuoc-thi-anh` | Cuộc thi ảnh đẹp | rating (image) | có giám khảo |
| `chon-mon-an-ngon-nhat` | Chấm điểm món ăn | rating | |
| `chon-ao-dai-cuoi` | Chọn áo dài, váy cưới | bracket | |
| `binh-chon-nhanh` | Tự tạo bình chọn | quick | mẫu trống |

---

## 5. Luồng tạo phòng mới (`/tao-phong`)

Wizard 5 bước, thanh tiến độ trên cùng, nút "Tiếp" dính đáy trên mobile. Hỗ trợ `?mau=<slug>` (bỏ qua bước 1) và `?kieu=<format>`.

1. **Bạn muốn chốt gì?** – Thẻ theo danh mục (tab ngang cuộn được), mỗi thẻ: emoji, tên mẫu, dòng mô tả, nhãn kiểu vote. Cuối trang: "Tự chọn kiểu vote" → 6 thẻ kiểu vote có hình minh hoạ nhỏ.
2. **Nội dung** – Tên phòng (điền sẵn theo mẫu, VD "Cuối tuần đi đâu chơi?"), mô tả tùy chọn, **thêm lựa chọn** theo đúng loại của kiểu vote (khu tải ảnh, ô "Thêm nhanh" dán nhiều dòng, dán link Maps, dán link sản phẩm). Với `schedule`: lịch chọn nhiều ngày (vuốt được, chọn theo dải), chọn chế độ, buổi/khung giờ, độ dài chuyến.
3. **Cài đặt** – Chỉ hiện cài đặt liên quan kiểu vote. Nhóm "Cơ bản": hạn giờ (Không giới hạn / 1 giờ / Hôm nay / 1 ngày / 3 ngày / tùy chỉnh), số lựa chọn mỗi người (quick), cho thành viên thêm lựa chọn. Nhóm "Riêng tư": ẩn danh, hiện kết quả khi nào, mật khẩu. Nhóm "Tương tác": bình luận, thả tim. Nhóm nâng cao gập lại mặc định.
4. **Bạn là ai** – tên + avatar (giữ như hiện tại, nhớ lựa chọn lần trước).
5. **Chia sẻ** – link, QR, nút Zalo / Messenger / Copy, **câu mời soạn sẵn** để copy: "Vote giúp nhóm mình: {tên phòng} 👉 {link}". Nút "Vào phòng".

Giữ tương thích: tạo phòng bracket vẫn chạy đúng như cũ.

---

## 6. Cấu trúc trang phòng (`/p/[slug]`)

- Header chung (đã có): quay lại, tên phòng, "N người · …", avatar, ⚙ (host), nhãn "Ẩn danh" nếu bật, đếm ngược nếu có.
- Card tóm tắt: nhãn kiểu vote, câu hướng dẫn 1 dòng theo kiểu ("Chạm để chọn tối đa 2 quán", "Chạm ô để báo bạn rảnh"…), trạng thái của mình ("Bạn chưa vote" / "Bạn đã vote").
- Tabs dưới card: **Vote** · **Kết quả** (ẩn theo `results_visibility`) · **Trò chuyện (n)** · **Bản đồ** (chỉ khi có ≥ 2 địa điểm).
- Dock đáy mobile theo kiểu vote (phiếu còn lại, tiến độ quẹt, nút lưu lịch…).
- Thành phần tách theo kiểu: `src/components/formats/<format>/{vote-view,results-view,settings-fields,option-editor}.tsx`. Trang phòng chọn component qua registry. Component dùng chung: `OptionCard` (render theo `item_type`), `ReactionBar`, `CommentThread`, `PlaceMap`, `LinkPreview`, `VoterStack`, `ResultPodium`.
- Sheet ⚙ cài đặt phòng (đã có) mở rộng: sửa tên/mô tả, hạn giờ, ẩn danh (chỉ bật), hiển thị kết quả, bình luận, cho thêm lựa chọn, chốt / mở lại, nhân bản phòng, xoá phòng (xác nhận 2 bước).

---

## 7. Cơ sở dữ liệu (Supabase)

Mỗi Phase một file migration mới (`0008_…`, `0009_…`), `create … if not exists` / `create or replace`, **không sửa file cũ**, **không dùng max/min trên uuid**, mọi thao tác ghi qua RPC `SECURITY DEFINER` có kiểm tra `auth.uid()`, quyền host, trạng thái phòng. Cuối mỗi file: `notify pgrst, 'reload schema';`.

Thay đổi chính:
- `rooms`: thêm `format text not null default 'bracket'`, `bracket_mode` (đổi tên/ánh xạ từ `mode` cũ, giữ tương thích), `settings jsonb not null default '{}'` (cài đặt riêng theo kiểu: max_choices, schedule_mode, trip_length, day_parts, judge_weight…), `description`, `anonymous bool default false`, `results_visibility text default 'live'`, `comments_enabled bool default true`, `reactions_enabled bool default true`, `allow_member_options bool`, `template_slug text`, `deadline timestamptz null`, `result jsonb`, `closed_at`. `status` thêm `'open'`, `'closed'` cho các kiểu không phải bracket.
- `items`: thêm `item_type text default 'image'`, `title`, `description`, `emoji`, `price_text`, `place jsonb` (name, address, lat, lng, maps_url), `link jsonb` (url, title, image_url, site_name), `created_by_member_id`, `position int`, `group_label text` (vòng bảng).
- `votes` (mới, dùng cho quick / swipe / ranking / rating / group stage): `id, room_id, item_id, member_id, value numeric, created_at, updated_at`, unique `(item_id, member_id)`. Ý nghĩa `value`: quick = 1; swipe = 0/1/2; ranking = vị trí; rating = 1–5; group = 1.
- `schedule_slots` (mới): `id, room_id, date date, part text null ('morning'|'afternoon'|'evening'), start_time time null, end_time time null, position`.
- `schedule_answers` (mới): `slot_id, member_id, answer text ('yes'|'maybe'|'no')`, unique `(slot_id, member_id)`; `schedule_notes`: `room_id, member_id, note` (≤ 120 ký tự).
- `reactions` (mới): `item_id, member_id, emoji`, unique `(item_id, member_id, emoji)`; emoji giới hạn trong ❤️ 😍 🔥 😂 👎.
- `comments` (mới): `id, room_id, item_id null, member_id, body, created_at, deleted_at, deleted_by`.
- `room_judges` (mới, rating): `room_id, member_id`.
- Bảng bracket cũ (`qualify_votes`, `matches`, `match_votes`) giữ nguyên.

RPC chính (tên gợi ý): `create_room_v2`, `add_options`, `update_option`, `remove_option`, `cast_vote` (theo format, kiểm tra giới hạn), `clear_my_votes`, `set_ranking(room_id, item_ids uuid[])`, `set_schedule_answers(room_id, answers jsonb, note)`, `toggle_reaction`, `add_comment`, `delete_comment`, `get_room_tallies(room_id)` (tôn trọng ẩn danh + results_visibility), `close_room(room_id)`, `reopen_room`, `close_room_if_due`, `duplicate_room`, `host_update_settings`, `set_judges`.

RLS: thành viên chưa bị kick mới đọc được dữ liệu phòng; `votes`/`schedule_answers` của phòng ẩn danh chỉ đọc được dòng của chính mình; `comments` đọc được bởi thành viên; ghi luôn qua RPC.

Realtime: bật publication cho `votes`, `schedule_answers`, `reactions`, `comments`, `items`, `rooms`. Client gộp cập nhật (throttle 300ms) để không giật.

Chỉ mục: `votes(room_id)`, `votes(item_id)`, `comments(room_id, created_at)`, `reactions(item_id)`, `schedule_answers(slot_id)`.

---

## 8. Kiến trúc trang và SEO

URL tiếng Việt không dấu, gạch ngang. Tất cả trang công khai có metadata đầy đủ, canonical, OG image, breadcrumb.

| Route | Nội dung | Index |
|---|---|---|
| `/` | Trang chủ (làm lại sau, Phase 7) | ✓ |
| `/tao-phong` | Wizard | ✓ |
| `/mau` | Thư viện mẫu theo danh mục, ô tìm kiếm | ✓ |
| `/mau/[slug]` | Trang đích SEO từng mẫu | ✓ |
| `/kieu-vote` | Tổng quan 6 kiểu vote | ✓ |
| `/kieu-vote/[slug]` | Trang đích từng kiểu vote | ✓ |
| `/huong-dan` + `/huong-dan/[slug]` | Trung tâm hướng dẫn (MDX) | ✓ |
| `/blog` + `/blog/[slug]` + `/blog/chu-de/[tag]` | Blog (MDX) | ✓ |
| `/gioi-thieu` | Giới thiệu Vote Đi | ✓ |
| `/lien-he` | Liên hệ / góp ý | ✓ |
| `/dieu-khoan`, `/quyen-rieng-tu` | Pháp lý (cập nhật cho bình luận, ẩn danh, địa điểm) | ✓ |
| `/phong-cua-toi` | Phòng đã tham gia | ✗ |
| `/p/[slug]`, `/p/[slug]/ket-qua` | Phòng | ✗ (noindex, nhưng có OG) |

**Trang đích mẫu `/mau/[slug]`** (khuôn chung, nội dung từ `templates.ts`): breadcrumb → H1 (VD "Tạo bình chọn chọn áo lớp online") → mô tả → nút lớn **"Dùng mẫu này"** (`/tao-phong?mau=slug`) → demo tĩnh của kiểu vote với lựa chọn gợi ý → "3 bước" → lợi ích (3–4 ý) → FAQ (có JSON-LD FAQPage) → mẫu liên quan → CTA cuối. Schema: `WebPage` + `BreadcrumbList` + `FAQPage`.

**Trang đích kiểu vote `/kieu-vote/[slug]`**: tương tự, H1 dạng "Bình chọn nhanh online cho nhóm", giải thích cách tính kết quả, các mẫu dùng kiểu này.

**Blog và hướng dẫn**: nội dung MDX trong `content/blog/*.mdx`, `content/huong-dan/*.mdx`, frontmatter: `title, description, slug, date, updated, cover, tags, author`. Tự sinh mục lục, thời gian đọc, bài liên quan, CTA giữa bài và cuối bài dẫn tới mẫu phù hợp (component MDX `<TemplateCta slug="…" />`), schema `Article` + `BreadcrumbList`. Ảnh dùng `next/image`. Tạo **3 bài nháp ngắn** để test giao diện (tôi sẽ tự viết nội dung thật sau): "Cách tạo bình chọn cho nhóm Zalo nhanh nhất", "Cả nhóm chọn ngày đi du lịch không cãi nhau", "Chọn áo lớp đẹp: cách để cả lớp cùng quyết".

**Kỹ thuật SEO**: `sitemap.ts` sinh từ templates + formats + MDX (có `lastModified`), `robots.ts` chặn `/p/` và `/phong-cua-toi`, metadata template `"%s | Vote Đi"`, title trang chủ: **"Vote Đi – Tạo bình chọn online miễn phí cho nhóm"**, OG image động cho mẫu, kiểu vote và bài blog, `hreflang` vi, trang 404 có gợi ý mẫu. Core Web Vitals: không chặn render bởi Leaflet/iframe (tải động), font `display: swap`, ảnh có kích thước.

**Điều hướng**: header: Logo · **Tạo vote** (dropdown: 6 kiểu vote + "Xem tất cả mẫu") · **Mẫu có sẵn** · **Hướng dẫn** · **Blog** · Phòng của tôi · nút "Tạo phòng". Mobile: menu toàn màn hình theo nhóm. Footer nhiều cột: Kiểu vote, Mẫu phổ biến (6 mẫu), Tài nguyên (Hướng dẫn, Blog, Giới thiệu), Pháp lý.

---

## 9. Chất lượng bắt buộc

- Kiểm tra ở 360px, 390px, 768px, 1366×768, 1440px: không cuộn ngang, không chữ đè chữ, touch target ≥ 44px, tương phản chữ đạt AA.
- Không lỗi hydration (không đọc window/navigator/localStorage/Date.now trong render).
- Trạng thái đầy đủ: loading skeleton, trống, lỗi (hiện lỗi thật dễ hiểu), mất mạng.
- Optimistic update + rollback khi RPC lỗi.
- Validate input bằng zod ở cả client và route server.
- `prefers-reduced-motion` tắt animation.
- Không lộ secret key ra client. Route server dùng secret key chỉ đọc trường an toàn.
- Mỗi Phase: `npm run lint`, `npm run build` sạch; cập nhật README (biến môi trường mới, migration cần chạy).

---

## 10. Lộ trình các Phase

**Phase 0 – Nền móng**
Registry formats, mở rộng `rooms`/`items`, bảng `votes`, `settings`, `close_room_if_due`, component dùng chung `OptionCard` (image/text), tách trang phòng theo format qua registry, wizard mới khung 5 bước (bước 1 tạm có kiểu Bracket + Bình chọn nhanh). Bracket cũ chạy nguyên vẹn.
*Test:* tạo lại phòng bracket cũ chạy đúng; tạo phòng quick với lựa chọn chữ và ảnh.

**Phase 1 – Bình chọn nhanh + lựa chọn đa dạng**
`quick` đầy đủ, `item_type` text/place/link, `/api/places/resolve`, `/api/unfurl` (SSRF an toàn), thẻ địa điểm có bản đồ nhỏ + chỉ đường, bản đồ tổng Leaflet, "Thêm nhanh" nhiều dòng, thành viên thêm lựa chọn, hạn giờ tùy chọn, chốt/mở lại, màn kết quả chung.
*Test:* dán 5 link Maps các dạng khác nhau (maps.app.goo.gl, /place/, ?q=) → đúng tên và vị trí; dán link Shopee/Booking → có thẻ; vote chọn nhiều; chốt.

**Phase 2 – Tương tác và chia sẻ**
Ẩn danh (thực thi ở DB), `results_visibility`, thả tim + reaction, bình luận phòng + từng lựa chọn, OG metadata + ảnh xem trước cho `/p/[slug]` và kết quả, kiểm tra bot không bị redirect, câu mời soạn sẵn.
*Test:* 2 trình duyệt: ẩn danh không lộ người vote (kiểm tra cả API trả về); bình luận realtime; `curl -A "facebookexternalhit/1.1" https://…/p/<slug>` trả 200 và có `og:image`.

**Phase 3 – Chọn lịch rảnh**
`schedule` 4 chế độ, lịch chọn ngày trong wizard, heatmap desktop, danh sách mobile, "Ngày đẹp nhất", khung chuyến đi N ngày, ghi chú, `.ics` + Google Calendar.
*Test:* chế độ trip 3 ngày với 3 người → khung tốt nhất tính đúng.

**Phase 4 – Quẹt chọn, Xếp hạng, Chấm điểm, Vòng bảng**
`swipe` (cử chỉ + nút + bàn phím, match cả nhóm), `ranking` (dnd-kit, Borda), `rating` (sao, giám khảo), `group_knockout`.
*Test:* mỗi kiểu 3 người vote, kết quả đúng công thức.

**Phase 5 – Mẫu phòng + trang SEO + nội dung**
`templates.ts` đủ danh sách mục 4, wizard bước 1 theo danh mục, `/mau`, `/mau/[slug]`, `/kieu-vote`, `/kieu-vote/[slug]`, MDX blog + hướng dẫn + 3 bài nháp, `/gioi-thieu`, `/lien-he`, header/footer mới, sitemap/robots/schema/OG cho mọi trang công khai.
*Test:* Lighthouse SEO 100 cho `/mau/hom-nay-an-gi`; sitemap liệt kê đủ trang.

**Phase 6 – Hoàn thiện**
Rà soát toàn bộ luồng mọi kiểu vote trên mobile thật, hiệu năng (bundle, lazy load bản đồ), accessibility, thông báo lỗi, `/phong-cua-toi` hiện đủ kiểu vote (icon kiểu, trạng thái, kết quả), nhân bản phòng, xoá phòng.

**Phase 7 – Làm lại trang chủ** (chỉ làm khi tôi yêu cầu, sẽ có mockup riêng).
