# Manager APK — điều chỉnh điểm nhân viên

## Phạm vi

Chỉ phiên Manager hiển thị công cụ **Cộng XP**, **Trừ XP**, **Trừ doanh thu** trong **Hồ sơ > Quản lý nhân viên > Danh bạ đã phê duyệt**. Mỗi thao tác phải chọn Staff ID đã được duyệt, nhập số nguyên dương và lý do từ 5–240 ký tự, rồi xác nhận.

**Phân quyền thực** dựa trên Firebase Auth UID ánh xạ đến `staffIdentity/<uid>` với Staff ID `DOL-0001` có `verified:true`, hồ sơ chủ quản lý hoạt động, không phải tài khoản tự đăng ký. User-agent/APK không tạo quyền. Staff APK, web, PWA và Staff ID khác không có công cụ và không qua được API sửa điểm. DOL-0001 có phòng thử XP riêng nên không tự chỉnh chính mình qua API này.

## XP nhân viên

- Hai hành động `xp_add`, `xp_deduct` thay đổi `staffRegistry/<employeeId>.xp` bằng giao dịch RTDB; mỗi lần từ 1 đến 1.000.000 XP.
- Không cho XP âm hoặc vượt giới hạn XP của hệ thống. Sau khi cộng sẽ tính Level và áp dụng quyền lợi/mở khóa mới; khi trừ giữ nguyên `levelPeak` và các hiệu ứng đã mở, theo chính sách hiện tại.
- Mỗi giao dịch có `requestId`, `reason`, `byUid`, `at`, giá trị trước và sau; biên nhận được ghi **cùng giao dịch** ở `staffRegistry/<employeeId>.managerScoreCorrections`. Gửi lại cùng mã không cộng/trừ lần thứ hai; gửi lại với dữ liệu khác bị từ chối.
- Không sửa các sự kiện XP nghiệp vụ, doanh thu, nhiệm vụ và sổ chống trùng cũ. Là khoản điều chỉnh thủ công ngoài các nguồn thưởng tự động. Khi cập nhật XP, backend yêu cầu làm mới bảng Level và phát tín hiệu hiện có.

## Điểm doanh thu xếp hạng

- Hành động `revenue_deduct`: giảm **doanh thu quy đổi phục vụ mục đích thi đua** (đơn vị VNĐ) của **tuần Việt Nam hiện tại**. Mỗi lần 1–100.000.000 VNĐ.
- RTDB lưu `staffRevenueScoreAdjustments/<Monday YYYY-MM-DD>/<employeeId>` với `totalDeducted` và biên nhận riêng cho từng request ID.
- Trang xếp hạng gọi `staffGetPublicRevenueDeductions` với Firebase Auth để nhận **tổng trừ theo Staff ID** cho tuần hiện hành, cập nhật định kỳ khi đang mở trang. Không trả lý do, tên quản lý hay lịch sử ra công khai.
- Điểm được hiển thị/xếp hạng: `max(0, doanh_thu_quy_đổi_từ_các_bàn - tổng_trừ_trong_tuần)`. Các số doanh thu theo đơn, chứng từ, lịch sử ca và Firestore bảng gốc **không thay đổi**. Hiển thị ghi chú khoản trừ trên thẻ nhân viên.
- Nếu dịch vụ điều chỉnh tạm thời không thể truy cập, BXH vẫn hiện theo dữ liệu gốc và ghi cảnh báo console. Không dùng bảng BXH làm báo cáo kế toán.

## Kiểm thử và triển khai

- `node --test functions/staff-manager-adjustments.test.cjs functions/manager-apk.test.cjs`
- `node scripts/manager-apk-browser.cjs` với Playwright Chromium.
- GitHub Actions `staff-access-production.yml` triển khai ba callable `staffManagerAdjustEmployee`, `staffManagerGetEmployeeAdjustments`, `staffGetPublicRevenueDeductions` sau khi merge vào main và vượt kiểm tra.
- Rebuild Manager APK từ pipeline Android; chỉ APK mới có nút giao diện, không áp dụng chỉ bằng việc deploy Cloud Functions.
- Kiểm thử thực tế trên Manager DOL-0001, một nhân viên đã duyệt, một thiết bị Staff và BXH trước khi sử dụng thật. Đặc biệt kiểm tra tín hiệu cấp độ, quyền quản trị, mở đồng thời nhiều thiết bị và khoản trừ BXH tuần.
- Các khoản điều chỉnh là điểm thưởng trò chơi/thi đua, không được dùng để điều chỉnh lương hoặc doanh thu kế toán.
