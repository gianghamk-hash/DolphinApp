# Guest table write-back

Adds unassigned BKK forms to Dolphin Guest. The callable verifies the active, approved Staff ID, locates one exact BKK + STT in the selected tab, checks the old value and occupied table ranges, writes only column G using RAW, then reads it back. Source spreadsheet is fixed on the server. No client credentials are embedded.

## Activation required

Deploy `guestAssignTable` to project `dolphin-f6d67` after installing functions dependencies. Enable Google Sheets API in that project and grant the actual deployed function runtime service-account email Editor access to spreadsheet `1aZ34XVKqWwxMlOPSu6X0vApLT5DFxjDpza9fDRaXM2Q`. Obtain this email from the deployed function configuration; do not guess or expose a private key. Hosting alone does not deploy this callable.

Before production activation, test with an authorized test booking in a separate test spreadsheet using a test deployment. Confirm authenticated/unauthenticated access, exact row and column, stale assignments, occupied ranges, read-back and app refresh.

Application requests are serialized by maxInstances=1/concurrency=1. Google Sheets has no atomic compare-and-swap API: direct manual Sheet edits can race the read/write interval. This is not a guarantee of atomic coordination with external editors. A shared protected-column editing policy is needed for that guarantee.

Status: code and mock tests only; runtime account access, deployment and real Sheet write-back are not verified.

## Các bước bật đồng bộ (dành cho quản trị)

1. Mở Google Cloud project `dolphin-f6d67`, APIs & Services → Library → Google Sheets API → Enable.
2. Từ repository mới nhất, cài dependencies và triển khai riêng callable:

   ```bash
   npm install --prefix functions
   npx -y firebase-tools@latest login
   npx -y firebase-tools@latest deploy --only functions:guestAssignTable --project dolphin-f6d67
   ```

3. Trong Google Cloud Console, mở function `guestAssignTable` tại `asia-southeast1`, xem tài khoản dịch vụ chạy function. Có thể lấy bằng Cloud Shell:

   ```bash
   gcloud functions describe guestAssignTable --gen2 --region=asia-southeast1 --project=dolphin-f6d67 --format='value(serviceConfig.serviceAccountEmail)'
   ```

4. Mở Sheet nguồn → Chia sẻ → thêm đúng email ở bước 3 với quyền Người chỉnh sửa. Không sử dụng email tài khoản triển khai thay cho tài khoản chạy function. Không cần gửi khóa JSON cho ứng dụng hoặc đưa khóa vào repo.
5. Đăng nhập Dolphin Guest bằng Staff ID đã được duyệt. Dùng một booking thử được phép sửa: mở BKK chưa xếp bàn → nhập số bàn → Lưu vào Google Sheet. Kiểm tra cột G đúng tab ngày/tour, tải lại ứng dụng và xác nhận số bàn còn nguyên.
6. Chỉ báo hoàn thành sau khi đã thực hiện thành công bước 5. Nếu tab/cột G được bảo vệ, chủ Sheet cần cho phép tài khoản dịch vụ chỉnh sửa vùng đó.

Tài liệu: https://firebase.google.com/docs/functions/manage-functions ; https://developers.google.com/workspace/guides/create-credentials
