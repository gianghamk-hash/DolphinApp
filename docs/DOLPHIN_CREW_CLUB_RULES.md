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

- Múi giờ cố định: `Asia/Ho_Chi_Minh`. Hệ thống có **8 nhiệm vụ**, chỉ nhận thưởng một lần mỗi ngày theo Staff ID đã duyệt.
- Từ **07/11/2026**, XP nhiệm vụ tăng **gấp 3** so với mức trước đó. Đây là XP Daily Missions, hoàn toàn độc lập với XP doanh thu và XP nghiệp vụ theo order.
- Điểm danh: ngày thứ 1 = **600 XP**, tăng **150 XP/ngày liên tiếp**, tối đa **1.500 XP/ngày** từ ngày thứ 7. Bỏ lỡ một ngày thì chuỗi trở về ngày 1.
- Hoàn thành một order: **1.200 XP** (chuyển trạng thái đơn sang hoàn thành qua máy chủ).
- Mở một Bungalow: **900 XP** (mở lượt phục vụ được xác minh).
- Mở một bàn Lounge: **750 XP** (mở lượt phục vụ được xác minh).
- Nhận một order: **450 XP** (nhận và bắt đầu chuẩn bị).
- Đổi avatar: **300 XP** (thực sự lưu avatar khác).
- Rắn Offline đạt 200 điểm hợp lệ: **1.500 XP**.
- Game 2048 đạt 1.000 điểm hợp lệ: **3.000 XP**.
- Tổng cộng **8.700–9.600 XP/ngày** nếu hoàn thành cả 8 nhiệm vụ, tùy chuỗi điểm danh. Bước sang 00:00, tiến độ hoàn thành làm mới, nhưng XP tích lũy và chuỗi điểm danh vẫn được giữ.
- Phần thưởng đã nhận trước khi triển khai phiên bản mới không được nhân lại hoặc cấp trùng. Việc sửa biên nhận lỗi của các phiên bản cũ vẫn tính theo định mức lịch sử đã phát hành.
- Chỉ `staffCheckInDaily` là thao tác do nhân viên gọi trực tiếp; các nhiệm vụ khác được cấp từ sự kiện đủ điều kiện trên máy chủ và bằng chứng trò chơi, không tin số XP do client gửi.
- Nút điểm danh và tiến độ nhiệm vụ nằm trong Hồ sơ, đồng bộ qua các thiết bị.

## Điều chỉnh ngưỡng Level tháng 11/2026

- Hệ số Level giảm thêm **30%**, từ **3.500** xuống **2.450**. Công thức: `XP(L) = 2.450 × (L − 1)²`, tối đa Level 60.
- Level 2: 2.450 XP; Level 3: 9.800 XP; Level 10: 198.450 XP; Level 60: 8.528.450 XP.
- XP tích lũy, sổ ghi thưởng, điều kiện nhiệm vụ và `levelPeak` không bị xóa hoặc đặt lại. Cấp và phần thưởng sẽ được tính lại theo công thức mới; Level đã mở trước đó không bị hạ.
- Bảng xếp hạng Level công khai tự được tính lại khi người dùng đầu tiên tải dữ liệu sau khi backend được triển khai (sửa bản snapshot cũ một lần có khóa tránh ghi đồng thời).
