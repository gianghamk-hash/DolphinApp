# Staff ID — cấp mã cố định bởi quản lý

## Trạng thái triển khai
- Đã kiểm tra ngày 31/10/2026: cả bốn callable Staff ID đang `ACTIVE` trên `dolphin-f6d67`, Node.js 22, vùng `asia-southeast1`; quyền Manager đã được cấu hình. Không cần tạo dự án Firebase mới.
- Repo có `firebase.json`, dependency lockfile và workflow `Firebase Staff Checks` để chạy kiểm thử bảo mật, nạp SDK thật trên Node.js 22, và kiểm tra cảnh báo thư viện.
- Cài đặt tái lập: `npm --prefix functions ci`. Kiểm thử Staff: `npm --prefix functions run test:staff`. Triển khai đúng bốn API Staff: `npm --prefix functions run deploy:staff`.
- Giữ `functions/.env.dolphin-f6d67` riêng trên máy triển khai; `.gitignore` loại trừ các tệp `.env`. Không chạy deploy nếu chưa có allowlist Manager chính xác. Lệnh triển khai Staff không triển khai các API Tactics.
- Frontend: `staff-id.js`, `staff-online.js`, `index.html`.
- Firebase Cloud Functions: `staffCreateProfile`, `staffIssueLinkCode`, `staffClaimLinkCode`, `staffGetIdentity`.
- **Các callable phải được deploy riêng lên Firebase**. Merge GitHub Pages **không tự triển khai** Cloud Functions.
- Với môi trường mới chưa cấu hình `STAFF_ADMIN_UIDS`, không ai có quyền tạo mã. Dự án hiện tại đã được cấu hình; giữ nguyên allowlist khi cập nhật.

## Kích hoạt
1. Xác định UID Firebase Authentication của tài khoản Manager APK được ủy quyền. Tại widget **Nhân sự online > Staff ID / Cấp mã**, UID sẽ hiển thị sau khi Firebase đăng nhập.
2. Chỉ người vận hành Firebase project `dolphin-f6d67` mới được thiết lập biến môi trường `STAFF_ADMIN_UIDS` gồm danh sách UID được phép cấp mã, phân tách bằng dấu phẩy. Đặt biến trong cấu hình môi trường Cloud Functions v2 khi deploy; **không commit UID quản trị hoặc mã bí mật vào repo công khai**.
3. Deploy các callable mới với Firebase CLI, bảo đảm project/region `asia-southeast1` và Firebase RTDB hoạt động. Ví dụ: `firebase deploy --only functions:staffCreateProfile,functions:staffIssueLinkCode,functions:staffClaimLinkCode,functions:staffGetIdentity --project dolphin-f6d67`. Cần cấu hình Firebase CLI phù hợp với nguồn trong thư mục `functions` trước khi chạy lệnh.
4. Kiểm tra Authentication Anonymous enabled và Security Rules chặn client tự ý sửa `staffRegistry`, `staffEnrollmentCodes` và `staffIdentity`. Admin SDK của callable có thể ghi bất chấp client rules.
5. Manager APK mở Staff ID, tạo `DOL-0001` với tên nhân viên; cấp link code một lần. Mỗi thiết bị Web/APK dùng một mã liên kết mới (có hiệu lực 10 phút).
6. Sau khi xác minh cùng Staff ID, widget online gộp những thiết bị đang hoạt động thành **một nhân viên**, hiển thị số thiết bị. Thiết bị chưa xác minh vẫn được đếm riêng để không gộp nhầm nhân viên trùng tên.

## Tương thích và bảo mật
- Không đổi các key `dolphinStaffName`, lịch sử order, dữ liệu bán hàng hoặc quy trình khóa tên cũ.
- `staff_online` vẫn có một document/thiết bị; trường mới `staffId` chỉ dùng để **tổng hợp màn hình**, không dùng để cấp quyền. Không được tin tưởng trường này để phân quyền vì nó do client gửi lên.
- Một thiết bị được xác thực bằng Firebase Auth UID; mã liên kết một lần 36 ký tự, hash SHA-256 lưu phía máy chủ, hết hạn 10 phút. Không dùng Staff ID làm mật khẩu.
- Các UID ẩn danh có thể khác nhau giữa Web và APK; đó là lý do liên kết từng thiết bị. Khi xóa dữ liệu ứng dụng hoặc đổi trình duyệt phải yêu cầu mã liên kết mới.
- Manager cần được cấp quyền máy chủ cụ thể qua `STAFF_ADMIN_UIDS`; chỉ có Manager APK/biểu tượng Master **không đủ** quyền cấp mã.
- **Chưa triển khai** chức năng vô hiệu hóa Staff ID, thu hồi thiết bị, audit log cấp mã, và security-rule migration; cần bổ sung và kiểm thử trước khi dùng danh tính này để phân quyền nghiệp vụ.
- Không dùng bộ đếm online làm bằng chứng xác thực cho các hành động nhạy cảm.

## Kiểm thử nghiệm thu
- Hai thiết bị dùng DOL-0001: 1 nhân viên, 2 thiết bị.
- Hai Staff ID cùng tên: 2 nhân viên.
- Không có Staff ID: mỗi phiên hiện riêng.
- Thiết bị mất heartbeat >90 giây: không còn online.
- UID thường gọi `staffCreateProfile`: phải bị từ chối.
- Mã link sai, quá hạn hoặc đã dùng: phải bị từ chối.
- Đổi app Web ↔ APK: không đổi tên trong lịch sử order.
- Merge vào main phải kích hoạt `.github/workflows/auto-bump.yml` (Auto Bump Version), sau đó workflow build APK. Xác nhận kết quả trên GitHub Actions trước khi phát hành.
