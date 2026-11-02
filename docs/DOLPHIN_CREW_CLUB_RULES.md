# Dolphin Crew Club — quy ước lâu dài

Hồ Sơ Nhân Viên, Level, XP, avatar, chủ đề, danh hiệu và bảng Level/XP chỉ phục vụ **giải trí / for fun**.

- **Không** dùng XP, Level, danh hiệu hoặc các phần thưởng ảo làm cơ sở chấm công, đánh giá hiệu suất thực tế, khen thưởng tiền, tiền lương hoặc kỷ luật.
- Staff ID **DOL-0001** là tài khoản **Admin thử nghiệm Crew Club**. Thiết bị phải liên kết đúng Staff ID và đã được xác minh trên Firebase.
- Admin được cộng XP thử nghiệm và đặt lại XP/Level **chỉ của chính DOL-0001** trong Hồ Sơ Cá Nhân.
- DOL-0001 bị loại khỏi bảng xếp hạng Level/XP, danh hiệu Dolphin Emperor và Legendary Wall, để việc test cấp cao không ảnh hưởng cuộc đua vui của nhân viên khác.
- Bảng xếp hạng doanh thu và công việc vẫn sử dụng số liệu gốc của các app vận hành. Không thay đổi các số liệu này qua nút test XP.
- Reset XP đặt Level và phần mở khóa về mặc định, không xóa hồ sơ, không sửa order, không xóa sổ sự kiện XP đã ghi nhận.
- Giữ trải nghiệm đơn giản và vui vẻ; chỉ kiểm soát quyền ghi sao cho nhân viên khác không thể vô tình sửa XP hay hồ sơ của nhau.

Quy ước này áp dụng khi phát triển, chỉnh sửa, kiểm thử và thiết kế UI cho Dolphin Crew Club.

## Mốc phần thưởng thẩm mỹ

- Level 3: 🔥 Tên phát sáng (`name_flame`)
- Level 5: Khung avatar Bronze (`frame_bronze`)
- Level 8: Chủ đề Dolphin (`theme_dolphin`)
- Level 10: Bộ chủ đề 4 mùa (`theme_seasons`)
- Level 12: Danh hiệu Rookie Star (`title_rookie`)
- Level 15: Banner Sóng Biển (`banner_wave`)
- Level 20: Bộ chủ đề lễ hội (`theme_festival`)
- Level 22: Khung avatar Silver (`frame_silver`)
- Level 25: Danh hiệu Wave Rider (`title_wave`)
- Level 30: Bộ chủ đề đặc biệt (`theme_special`)
- Level 35: Banner Ánh Kim (`banner_gold`)
- Level 40: Khung avatar Gold (`frame_gold`)
- Level 45: Tên gradient (`name_gradient`)
- Level 50: Danh hiệu Dolphin Legend (`title_legend`)
- Level 60: Khung avatar Mythic (`frame_mythic`)
- Level 60: Banner Mythic (`banner_mythic`)

Mở khóa tự động theo levelPeak; trang Hồ Sơ cho chọn khung, danh hiệu, banner và hiệu ứng đã đạt. Bộ quy tắc trung tâm nằm trong `functions/staff-xp-engine.cjs`, xác thực bởi `staffSetPersonalStyle`.

## Nhiệm vụ hằng ngày — reset 00:00 (Việt Nam)

- Múi giờ cố định: `Asia/Ho_Chi_Minh`. Không cần job xóa dữ liệu: tiến độ được tách theo ngày Việt Nam tại máy chủ. Bước sang 00:00, 6 nhiệm vụ sẽ trở về chưa hoàn thành, còn chuỗi điểm danh và kỷ lục vẫn được giữ.
- Điểm danh: ngày thứ 1 = **200 XP**, mỗi ngày liên tiếp tăng **50 XP** tới mức trần **500 XP/ngày** từ ngày thứ 7 (hệ số x10 từ ngày 02/11/2026). Nếu đã điểm danh trước khi cập nhật x10 trong **cùng ngày giờ Việt Nam**, hệ thống tự bù phần chênh lệch một lần khi mở Hồ sơ (ví dụ từ 20 lên 200 XP: cộng thêm 180 XP). Không cộng bù những ngày cũ đã qua 00:00. Bản ghi thưởng được cập nhật để hiển thị đúng x10, không cho nhận trùng. Bỏ qua một ngày thì chuỗi bắt đầu lại từ 1, kỷ lục không mất.
- Hoàn thành một order: **40 XP** (chuyển trạng thái đơn sang hoàn thành trên máy chủ).
- Mở một Bungalow: **30 XP** (tạo lượt mới bằng Staff ID đã xác minh).
- Mở một bàn Lounge: **25 XP** (tạo bàn mới bằng Staff ID đã xác minh).
- Nhận một order: **15 XP** (chuyển đơn từ pending sang preparing bằng Staff ID).
- Đổi avatar: **10 XP** (thực sự lưu avatar khác với avatar hiện tại).
- Mỗi nhiệm vụ chỉ thưởng tối đa **một lần/ngày** theo Staff ID (tối đa **320–620 XP/ngày**, tùy chuỗi). XP cộng vào `staffRegistry/{employeeId}.xp`, dùng lại công thức Level và `levelPeak` hiện có.
- Chỉ `staffCheckInDaily` là thao tác do nhân viên gọi trực tiếp. Các nhiệm vụ công việc/đổi avatar được ghi nhận từ callable nghiệp vụ có kiểm tra Staff ID và thao tác thực tế. Không có callable để client tự gửi task/XP tùy ý; dữ liệu Firestore viết trực tiếp theo luồng cũ không phải bằng chứng nhận XP nhiệm vụ.
- Nút **Điểm danh** và danh sách nhiệm vụ xuất hiện tại Hồ sơ; kết quả đồng bộ giữa thiết bị. Mốc công việc nhận thưởng ngay sau khi thao tác đủ điều kiện, không phải nhấn nhận thủ công.
- Giữ nguyên quy ước Dolphin Crew Club chỉ để giải trí, **không** dùng làm căn cứ lương hay đánh giá.

## Điều chỉnh ngưỡng Level tháng 11/2026

- Hệ số Level giảm thêm **30%**, từ **3.500** xuống **2.450**. Công thức: `XP(L) = 2.450 × (L − 1)²`, tối đa Level 60.
- Level 2: 2.450 XP; Level 3: 9.800 XP; Level 10: 198.450 XP; Level 60: 8.528.450 XP.
- XP tích lũy, sổ ghi thưởng, điều kiện nhiệm vụ và `levelPeak` không bị xóa hoặc đặt lại. Cấp và phần thưởng sẽ được tính lại theo công thức mới; Level đã mở trước đó không bị hạ.
- Bảng xếp hạng Level công khai tự được tính lại khi người dùng đầu tiên tải dữ liệu sau khi backend được triển khai (sửa bản snapshot cũ một lần có khóa tránh ghi đồng thời).
