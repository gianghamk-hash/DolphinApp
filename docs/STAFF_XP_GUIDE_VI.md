# XP và phần thưởng Dolphin

Đối chiếu mã nguồn ngày 01/11/2026. XP ở đây là XP nghề nghiệp của nhân viên, tách biệt điểm các trò chơi và bảng doanh thu theo tuần.

## Trạng thái thực tế

13 hàm Staff Profile/Prestige đã triển khai thành công vào Firebase production trong job 124802782664 của run 41290299901. Ảnh hồ sơ DOL-0001 đã hiển thị Lv.1, Bronze và 0 XP: chức năng đọc tiến độ đã hoạt động. Chưa có bằng chứng từ lần kiểm tra này rằng một sự kiện doanh thu thực tế đã được quản lý duyệt và cộng thành công vào hồ sơ đó.

Hiện chưa có cơ chế tự cộng ngay khi tạo/hoàn thành đơn. Luồng đang triển khai là: lịch sử đóng ca → đề xuất XP từ máy chủ → quản lý xem và chọn → duyệt → ghi XP theo Staff ID → cập nhật bảng xếp hạng. Không tự bấm duyệt số liệu thật chỉ để thử tính năng.

## 1. Danh tính và điều kiện nhận XP

- Hồ sơ và XP gắn với Staff ID. Các thiết bị liên kết cùng ID dùng chung hồ sơ, XP, cấp độ và đặc quyền.
- Hồ sơ phải đang hoạt động. Đối chiếu tên trong lịch sử dùng tên hiện tại và các tên cũ trong danh sách bí danh; chuẩn hóa khoảng trắng, chữ hoa/thường và Unicode.
- Tên phải khớp duy nhất với một hồ sơ. Trùng tên hoặc không khớp sẽ không tự được cấp XP.
- **Hồ sơ tự đăng ký (`registrationSource: self`) bị loại khỏi bước đối chiếu lịch sử**, kể cả đã có Staff ID và hiển thị “Đã đăng ký”. Trạng thái này không đồng nghĩa được xác minh để nhận XP lịch sử. Luồng hiện tại chưa có nút chuyển hồ sơ tự đăng ký thành hồ sơ được xác minh.
- Quản lý phải có đúng UID Firebase Authentication trong `STAFF_ADMIN_UIDS`. Dùng APK Manager hoặc có mã DOL không tự tạo quyền duyệt.

## 2. Quy đổi

XP doanh thu = phần nguyên của (doanh thu hợp lệ / 1.000đ). XP công việc = điểm công việc × 10, tối đa hai chữ số thập phân. Hai nguồn cộng vào cùng XP tích lũy.

Ví dụ: 1.000.000đ doanh thu + 2,5 điểm công việc = 1.000 + 25 = **1.025 XP** sau khi duyệt. Không chia doanh thu ra nhiều sự kiện khác với lịch sử: việc làm tròn được áp dụng theo từng sự kiện.

### Doanh thu

| Nguồn lịch sử | Người nhận | Giá trị hiện dùng | XP mỗi sự kiện |
|---|---|---:|---:|
| Lounge | Người mở bàn | 250.000đ × số khách | 250 × số khách |
| Bungalow | Người mở bàn | 2.000.000đ/bàn | 2.000 |
| Restaurant | Không cấp XP doanh thu trong luồng này | 0 | 0 |
| Show combo1 | Người bán | 1.390.000đ | 1.390 |
| Show combo2 | Người bán | 790.000đ | 790 |
| Show combo3 | Người bán | 2.000.000đ | 2.000 |
| Show singer1 / singer2 | Người bán | 2.290.000đ | 2.290 |
| Show singer3 | Người bán | 3.290.000đ | 3.290 |

Đây là bảng giá cố định trong bộ đối chiếu, không phải tổng tiền tự do đọc từ hóa đơn. Lounge giới hạn số khách từ 0 đến 999, lấy phần nguyên. Lounge/Bungalow bỏ qua thanh toán FOC, TA_UNPAID và KTOUR. Show hiện chỉ bỏ FOC; TA_UNPAID/KTOUR chưa bị loại bởi bộ lọc Show. Combo lạ không tạo XP doanh thu.

### Công việc

Chỉ lấy đơn có `status: completed` trong Lounge, Bungalow hoặc Restaurant. Show không cấp điểm công việc trong luồng đối chiếu này.

| Vai trò trên đơn hoàn tất | Lounge | Bungalow / Restaurant |
|---|---:|---:|
| Chỉ chuẩn bị | 0,1 điểm = 1 XP | 0,5 điểm = 5 XP |
| Hoàn thành, có hoặc không chuẩn bị | 0,25 điểm = 2,5 XP | 1 điểm = 10 XP |

Cùng một người vừa chuẩn bị vừa hoàn thành sẽ lấy mức hoàn thành, không cộng hai mức. Tên được tách bằng dấu `&`; mỗi người trong nhóm được tính mức của vai trò mình, không chia đều một quỹ XP chung. Trạng thái thanh toán bị loại cho **doanh thu** không đồng nghĩa đơn công việc hoàn tất cũng bị loại.

## 3. Duyệt và lưu trữ

- Quét bốn nguồn: `lounge_history_sessions`, `bun_history`, `res_history`, `show_history`.
- Mỗi nguồn đọc tối đa 120 bản ghi gần nhất theo ngày; bỏ ngày không đúng định dạng và lịch sử quá 90 ngày.
- Màn hình xem trước kiểm tra tối đa 120 ứng viên đầu tiên, bỏ các sự kiện đã có trong sổ XP. Đây chưa phải phân trang đầy đủ cho backlog lớn: nếu các ứng viên đầu đã duyệt hết, các sự kiện cũ hơn có thể chưa xuất hiện.
- Một lần duyệt chọn từ 1 đến 50 sự kiện. Máy chủ đọc lại lịch sử và tính lại giá trị; trình duyệt không quyết định số XP.
- Mỗi sự kiện có mã gắn nguồn lịch sử, ca, loại, vị trí và Staff ID. Sổ XP kiểm tra mã đó để chặn việc duyệt lại cùng sự kiện. Nếu nội dung/vị trí của lịch sử bị thay đổi sau khi duyệt, cần quản lý đối chiếu riêng.
- Sổ lưu nguồn, XP, người duyệt và thời điểm. XP không đặt lại vào tuần/tháng mới. Chỉ tài khoản quản lý được phép tạo khoản điều chỉnh, bao gồm điều chỉnh giảm; XP tối thiểu là 0.
- Cấp độ cao nhất (`levelPeak`) được giữ khi giảm XP, nên rank và phần thưởng đã mở vẫn còn. XP hiện tại vẫn thể hiện số đã điều chỉnh.

## 4. Level, rank và phần thưởng

Ngưỡng XP tích lũy để đạt Level L: **5.000 × (L − 1)²**. Cấp tối đa 60; XP vẫn có thể tiếp tục tích lũy. Ví dụ Lv.2 = 5.000 XP, Lv.3 = 20.000 XP, Lv.10 = 405.000 XP. Nếu chỉ có doanh thu, Lv.2 tương đương 5 triệu đồng doanh thu hợp lệ đã duyệt.

| Level | XP tích lũy tối thiểu | Mở khóa |
|---:|---:|---|
| 1 | 0 | Avatar cơ bản; Bronze; Dark/Light/Gray miễn phí |
| 3 | 20.000 | Tên phát sáng OnFlame |
| 5 | 80.000 | Avatar Ocean |
| 6 | 125.000 | Rank Silver |
| 8 | 245.000 | Chủ đề Dolphin |
| 10 | 405.000 | Mùa Xuân, Hè, Thu, Đông |
| 11 | 500.000 | Rank Gold |
| 15 | 980.000 | Avatar Legends |
| 20 | 1.805.000 | Tết, Valentine, Phụ Nữ, 30/4, Thiếu Nhi, Quốc Khánh, Trung Thu |
| 21 | 2.000.000 | Rank Platinum |
| 25 | 2.880.000 | OnFlame cao cấp; bản giao diện mới áp dụng nhịp phát sáng nhanh hơn trên tên hồ sơ |
| 30 | 4.205.000 | Halloween, Giáng Sinh, Tết Dương Lịch |
| 31 | 4.500.000 | Rank Diamond |
| 40 | 7.605.000 | Avatar Mythic |
| 41 | 8.000.000 | Rank Legend |
| 60 | 17.405.000 | Cấp tối đa |

Các khoảng rank: Bronze 1–5; Silver 6–10; Gold 11–20; Platinum 21–30; Diamond 31–40; Legend 41–60. Avatar và chủ đề bị khóa có kiểm tra cấp độ tại máy chủ khi lưu. Theme/OnFlame đã chọn được lưu theo Staff ID. Các phần thưởng hiện là quyền cá nhân hóa, không có quy đổi tiền/lương/quà vật chất trong mã hiện tại.

Mốc OnFlame cao cấp đã có trong danh sách thưởng trước đây nhưng giao diện cũ chưa áp dụng class hiệu ứng tương ứng. Phần chỉnh sửa giao diện này nối hiệu ứng cho tên trên trang hồ sơ; không thay đổi quy tắc tính XP.

## 5. Bảng xếp hạng và vinh danh

- Bảng được dựng lại sau cấp/duyệt XP hoặc khi quản lý gọi dựng lại. Không có trigger tự dựng lại chỉ vì mở hồ sơ hoặc tự đăng ký.
- Lấy hồ sơ đang hoạt động, có ID hợp lệ và có tên. Bộ dựng bảng này không loại hồ sơ tự đăng ký như bộ đối chiếu lịch sử.
- Sắp theo cấp độ hiển thị giảm dần, rồi XP giảm dần, rồi Staff ID tăng dần. Máy chủ giữ tối đa 25 người. Màn hình mới hiện 5 người đầu, bấm “Xem thêm” để mở rộng.
- Người đứng đầu nhận danh hiệu **Dolphin Emperor**. Mã hiện ghi những người có cùng XP với người đầu vào `tiedWith`; chỉ một người là champion hiển thị. Không có chức năng chọn đồng champion hoàn chỉnh trong giao diện.
- Khi người dẫn đầu thay đổi, tạo thông báo; các trang có mô-đun Prestige có thể hiển thị banner. Mỗi trình duyệt chỉ hiện một lần theo mã thông báo, trong 24 giờ.
- Legendary Wall lưu lần đầu một Staff ID dẫn đầu; tên/avatar/cấp tại bản ghi lịch sử đó không tự cập nhật trong lần dẫn đầu tiếp theo. API trả tối đa 25 bản ghi gần nhất.
- Tiến độ cá nhân và bảng được làm mới khoảng hai phút một lần khi trang đang hiển thị, và khi Staff ID thay đổi. Việc tải dữ liệu không tự cấp XP.

## 6. Trang hồ sơ mới

Màn hình chính: hồ sơ + tiến độ → bốn nút cài đặt → bảng xếp hạng → nút quản lý nếu tài khoản có quyền. Chỉnh tên/avatar, bộ chủ đề, mốc thưởng, thiết bị và Legendary Wall mở riêng trong hộp thoại. Không tạo hồ sơ mới, đổi liên kết hoặc cấp XP trong quá trình xem/đóng hộp thoại. Bản APK đã cài cần bản cập nhật chứa các tài nguyên giao diện mới; triển khai Cloud Functions không tự thay thế tài nguyên nhúng trong APK.

## Cấp XP tự động qua thao tác nhân viên xác minh (phiên bản thay thế trigger client-writable)

Mã nguồn có 6 Firestore triggers để tự cộng XP khi Lounge/Bungalow tạo bàn đủ thông tin, Show chọn combo hợp lệ, hoặc Lounge/Bungalow/Restaurant chuyển đơn sang `completed`. Triggers dùng bảng giá và định mức cũ, chỉ gán theo tên duy nhất trong hồ sơ do quản lý xác minh, ghi ledger một lần theo ID của vòng đời tài liệu. Không cần duyệt thủ công khi bật chế độ này. Trang hồ sơ nhận tín hiệu Firestore `staff_xp_updates/public` để làm mới gần tức thì, và tự kiểm tra lại sau mỗi hai phút nếu mất tín hiệu. Triển khai `firestore.rules` mới riêng biệt sau khi đánh giá rules production thực tế; không tự ghi đè các rules đang chạy.

**Không tự kích hoạt trên production**: `firestore.rules` vẫn cho phép ghi dữ liệu bảng và đơn từ client ngoài Push. Vì vậy kẻ khác có thể tạo giao dịch giả để tăng XP nếu mở chế độ tự động trước khi sửa rules/luồng xác thực ghi. `STAFF_AUTO_XP_ENABLED=false` là mặc định. Workflow sản xuất yêu cầu xác nhận Firestore staff-writes đã được bảo vệ trước khi chọn bật auto XP; việc chỉ tick ô không tự bảo vệ dữ liệu. Khi bật auto XP, phần duyệt lịch sử được vô hiệu hóa để tránh tính trùng. Trường hợp đổi chủ bàn/số khách/FOC sau lần cấp đầu hoặc tái sử dụng tài liệu mà không xóa cần xây thêm bút toán điều chỉnh; trong giai đoạn này chỉ cấp một lần cho mỗi incarnation của tài liệu.


### Luồng an toàn thay thế (2026-11-01)
Các app Lounge, Bungalow, Restaurant, Show gọi trực tiếp `staffRecordLiveAction` với Firebase Auth của Staff ID **đã được quản lý xác minh**. Máy chủ tự ghi thay đổi bàn/đơn lên Firestore và tự cộng XP qua sổ `staffXpLedger`. Bất kỳ thao tác ghi thẳng từ trình duyệt (gồm cả Guest hoặc nhân viên chưa xác minh) vẫn phục vụ nghiệp vụ cũ nhưng **không cấp XP**. Không yêu cầu Manager duyệt từng sự kiện. Sáu Firestore triggers thô phải luôn để `STAFF_AUTO_XP_ENABLED=false` để không cấp XP từ dữ liệu có thể sửa bởi client.

Các nguồn: Lounge/Bungalow bàn lần đầu trong ngày, Show đặt bàn đã xác minh + lưu combo, và thao tác nhận/hoàn thành đơn của Lounge/Bungalow/Restaurant do nhân viên xác minh thực hiện. Người nhận đơn được cộng XP mức chuẩn bị; khi hoàn thành, người làm được cộng mức còn lại hoặc mức hoàn thành đầy đủ. Số XP được quyết định ở backend, không từ tham số client. Sổ ledger và khóa yêu cầu doanh thu giới hạn một lần mỗi bàn mỗi ngày, kể cả đổi nhân viên hoặc gửi lại request.

**Giới hạn còn lại:** chế độ truy cập Firestore vận hành hiện tại vẫn rộng, nên dữ liệu nghiệp vụ thường có thể bị thay đổi; không lấy các thay đổi đó làm căn cứ trực tiếp cấp XP. Một nhân viên thật vẫn có thể tạo thao tác nghiệp vụ không đúng thực tế; cần kiểm toán thay vì xem XP như số liệu kế toán. Hồ sơ tự đăng ký chưa có bước xác minh sẽ không nhận XP tự động. Khi cập nhật APK cần kiểm tra từng outlet thực tế. Không bật sáu trigger cũ.
