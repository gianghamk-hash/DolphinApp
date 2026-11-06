# Quy tắc thống nhất xác minh Staff ID và vận hành (04/11/2026)

## Hợp đồng xác minh

1. **Cổng vào:** nhân viên chỉ được sử dụng các module nghiệp vụ sau khi `staffGetIdentity` trả về `verified:true`, Staff ID hợp lệ, hồ sơ hoạt động, đã phê duyệt (nếu tự đăng ký), và không cần sửa tên.
2. **Mọi thao tác có thưởng XP:** phải gọi `DolphinStaffId.performLiveAction` đến Cloud Function `staffRecordLiveAction` bằng Firebase Auth UID thực của thiết bị. Server kiểm tra lại cùng hồ sơ qua `staffIdentity/{uid}` và `staffRegistry/{employeeId}`.
3. **Không tin dữ liệu cục bộ:** tên nhân viên gõ tay, localStorage, cờ `verified` cũ ở frontend, nhãn người bán và loại APK không được quyết định quyền hoặc nơi cấp XP. Backend gắn sự kiện và điểm với Staff ID đã xác minh.
4. **Không có fallback âm thầm:** nếu Cloud Function lỗi/xác thực hết hiệu lực, hiển thị lỗi và giữ nguyên trạng thái trước thao tác; không lưu trực tiếp một giao dịch nghiệp vụ không cấp XP rồi báo thành công.
5. **Không truy thu XP từ dữ liệu client-writable:** các bảng/đơn từ luồng cũ chỉ có thể nhận XP sau khi đi qua bước xác minh lại tại backend, có bằng chứng đáng tin cậy. Giữ nguyên ledger chống trùng.

## Các khu vực

| Khu vực | Mở / lưu bàn | Nhận và hoàn thành order | XP |
|---|---|---|---|
| Bungalow | `bun_tables/booking` | `bun_orders/preparing,completed` | Doanh thu 2.000 XP/bàn đủ điều kiện, nhiệm vụ mở bàn 300 XP/ngày lần đầu; XP nghiệp vụ 500 + 500 hoặc 1.000 trực tiếp |
| Lounge | `lounge_tables/booking,update` | `lounge_orders/preparing,completed` | Doanh thu 250 XP/khách đủ điều kiện, nhiệm vụ mở bàn 250 XP/ngày lần đầu; XP nghiệp vụ 200 + 300 hoặc 500 trực tiếp |
| Show | `show_tables/booking,combo` | Không có XP nghiệp vụ order trong quy tắc này | Combo được cấp doanh thu theo bảng giá và bằng chứng đặt bàn do server xác minh; không cấp XP khi thiếu bằng chứng |
| Restaurant | `res_tables/booking` | `res_orders/preparing,completed` | Mở bàn: 0 XP doanh thu; XP nghiệp vụ 500 + 500 hoặc 1.000 trực tiếp |

XP và mọi trường hợp FOC/TA_UNPAID/KTOUR thực hiện theo [STAFF_XP_RULES_CURRENT_VI.md](STAFF_XP_RULES_CURRENT_VI.md). Không tự thay đổi định mức.

## Kiểm thử bắt buộc trước khi production

- UID chưa liên kết, chưa duyệt hoặc hồ sơ bị khóa: không vào giao diện nghiệp vụ và backend không cho lưu.
- UID đã duyệt với cờ `staffIdentity.verified:false` cũ: khi cổng vào trả về `verified:true`, thao tác nghiệp vụ vẫn được xác minh lại bằng UID server và cấp XP nếu đủ điều kiện.
- Tên cục bộ khác tên hồ sơ: server luôn dùng tên/Staff ID chính thức, không rơi vào đường ghi Firestore không XP.
- Bungalow/Lounge/Show mở bàn và ghi nhận XP đúng người. Restaurant mở bàn có người cập nhật xác minh, không tự phát sinh XP doanh thu.
- Nhận đơn, hoàn thành đơn, hoàn thành trực tiếp với từng khu vực: ghi đúng người, đúng XP, không nhân đôi khi retry.
- Combo Show lưu được cho bàn cũ; nếu chưa có bằng chứng đặt bàn hợp lệ thì vẫn lưu phục vụ nhưng không cấp XP dựa vào dữ liệu khách tự sửa; thử xác minh lại bằng server.
- Khi Firebase lỗi tạm thời: không báo lưu thành công, không gắn XP nhầm người.
- Sau khi merge, xem `staff-xp-secure-production.yml` thành công **và** xác nhận frontend mới đã được xuất bản lên domain trước khi thử thiết bị thật.

## Phạm vi

Đây là quy tắc cho **nhân viên** khi sử dụng hệ thống nội bộ; luồng Guest order của khách vẫn là nghiệp vụ tách biệt và không tự nhận XP nhân viên. Các thao tác hủy/xóa bàn, chỉnh các trường dịch vụ không có XP tiếp tục theo phân quyền riêng; không dùng mã Master trên client thay cho quyền server.
