# Quy trình Staff ID: khóa chờ duyệt và chuẩn hóa tên (03/11/2026)

## Chờ quản lý duyệt
- Một thiết bị có hồ sơ self-registration đang hoạt động nhưng chưa được DOL-0001 phê duyệt chỉ được xem trạng thái và **Kiểm tra lại**.
- Ẩn và chặn cả trên máy chủ: đăng ký tài khoản thứ hai, cấp mã liên kết thiết bị, đổi sang Staff ID khác, và yêu cầu quên tài khoản.
- Sau khi được duyệt, thiết bị tự vào Landing nếu họ tên đã hợp lệ.

## Họ tên duy nhất
- Tên mới phải dài từ **7 đến 64 ký tự**, sau khi chuẩn hóa khoảng trắng.
- So sánh không phân biệt chữ hoa/thường và dấu tiếng Việt (Nguyễn và Nguyen được coi là trùng).
- Tên của hồ sơ đã đăng ký được giữ chỗ kể cả hồ sơ ngừng hoạt động; chỉ người có chính Staff ID bị từ chối mới có thể đăng ký lại bằng tên cũ của chính mình.
- Việc kiểm tra trùng và cấp ID/đổi tên được thực hiện trong cùng giao dịch RTDB tại `staffRegistry`, không chỉ kiểm tra ở trình duyệt.

## Hồ sơ cũ
- Nếu tên ngắn hoặc trùng tên với hồ sơ khác, `staffGetIdentity` trả `requiresNameChange:true` và `verified:false`.
- Với tên trùng, hồ sơ đang hoạt động tạo trước được giữ tên; hồ sơ đến sau phải đổi.
- Biểu mẫu sửa tên chỉ mở cho chính thiết bị đã liên kết Staff ID, qua callable `staffRepairMyName`.
- Đổi tên **không thay Staff ID**, không ghi đè XP, `levelPeak`, ledger, điểm công việc, doanh thu, avatar, bảng xếp hạng hay lịch sử order.
- Tên cũ được thêm vào `nameAliases` để đối chiếu lịch sử. Những báo cáo dùng tên dạng văn bản có thể cần làm mới cache để hiển thị tên mới.
- Tài khoản chưa đổi tên không thể nhận XP nghiệp vụ, Daily Missions hoặc sử dụng các callable Crew Prestige.

## Triển khai
- Firebase Cloud Functions phải deploy `staffGetIdentity`, `staffRegisterSelfProfile`, `staffRepairMyName`, `staffClaimLinkCode`, `staffCreateProfile`, `staffIssueOwnLinkCode`, `staffRequestNameRecovery`.
- Workflow `Deploy Dolphin Staff Access Gate` triển khai các callable trên; workflow XP/prestige triển khai các bảo vệ bổ sung.
- Kiểm thử trên một thiết bị đang chờ duyệt, một tài khoản đã duyệt tên hợp lệ, một tài khoản cũ tên ngắn, và hai tài khoản cũ trùng tên trước khi rollout diện rộng.
