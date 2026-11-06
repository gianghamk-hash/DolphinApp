# Quy tắc XP Dolphin Crew Club — hiện hành (06/11/2026)

Quy tắc máy chủ xác thực: `functions/staff-xp-engine.cjs`, `functions/staff-xp-actions.js`, `functions/staff-daily-core.cjs`.

## 1. XP doanh thu — KHÔNG thay đổi

- 1 XP / mỗi 1.000 VND doanh thu đủ điều kiện. XP làm tròn xuống theo sự kiện.
- Lounge: 250 XP/khách. Bungalow: 2.000 XP/bàn.
- Show: combo1 1.390, combo2 790, combo3 2.000; singer1/2 2.290; singer3 3.290 XP.
- Restaurant không có XP doanh thu ở luồng này.
- Lounge/Bungalow không có doanh thu XP cho FOC, TA_UNPAID, KTOUR; Show không có doanh thu XP cho FOC.
- Doanh thu XP một lần / bàn / ngày Việt Nam, qua `staffRecordLiveAction` của Staff ID đã duyệt.

## 2. XP nghiệp vụ — TĂNG 100 LẦN từ phiên bản này

Công thức: **XP nghiệp vụ = điểm công việc × 1.000** (trước đây điểm công việc × 10). Công thức chỉ áp dụng cho thao tác nghiệp vụ đáng tin cậy, **không nhân XP doanh thu và XP thưởng nhiệm vụ hằng ngày**.

| Thao tác nghiệp vụ hợp lệ | Lounge | Bungalow / Restaurant |
|---|---:|---:|
| Nhận/đang chuẩn bị order | +200 XP | +500 XP |
| Hoàn thành sau khi chính mình đã nhận | +300 XP | +500 XP |
| Hoàn thành trực tiếp chưa nhận | +500 XP | +1.000 XP |
| Tổng nếu chính mình nhận rồi hoàn thành | **500 XP** | **1.000 XP** |

- XP chỉ cấp khi thao tác chuyển trạng thái được thực hiện qua Cloud Function `staffRecordLiveAction` với Staff ID đã xác minh.
- Nhận và hoàn thành bởi hai người khác nhau thì mỗi người có XP ứng với thao tác đã thực hiện.
- Một hành động có ID sự kiện đã ghi trong `staffXpLedger` sẽ không được cộng lần nữa.
- Từ 06/11/2026, riêng Lounge tăng gấp đôi XP nghiệp vụ nhận/hoàn thành order (điểm công việc tương ứng 0,2 / 0,3 / 0,5); Bungalow và Restaurant giữ nguyên.
- XP nghiệp vụ được tăng **chỉ đối với sự kiện mới** sau khi deploy; không tự nhân lại XP đã cấp trong quá khứ.

## 3. Nhiệm vụ hằng ngày — KHÔNG thay đổi

| Nhiệm vụ | XP một lần/ngày |
|---|---:|
| Điểm danh | 200 XP ngày đầu, +50/ngày liên tiếp, tối đa 500 XP từ ngày 7 |
| Hoàn thành một order | 400 |
| Mở một Bungalow | 300 |
| Mở một Lounge | 250 |
| Nhận một order | 150 |
| Đổi avatar | 100 |
| Rắn offline đạt 100 điểm hợp lệ | 500 |
| 2048 đạt 1.000 điểm hợp lệ | 1.000 |

Daily Missions reset lúc 00:00 Asia/Ho_Chi_Minh. XP nghiệp vụ và thưởng nhiệm vụ hằng ngày **cộng dồn**, nhưng số lần nhận thưởng nhiệm vụ không tăng theo số order sau lần đầu tiên.

## 4. Level và tính bền vững

- Tổng XP = XP doanh thu + XP nghiệp vụ + thưởng Daily Missions + điều chỉnh hợp lệ.
- Ngưỡng Lv. L = **2.450 × (L − 1)²**, cấp tối đa 60.
- XP tích lũy không reset hàng ngày. `levelPeak` lưu Level cao nhất từng đạt.
- Chỉ hồ sơ nhân viên active và được duyệt tham gia xếp hạng/cấp XP; tài khoản quản trị DOL-0001 có chế độ kiểm tra riêng và mặc định không xếp hạng.

## 5. An toàn

Luồng đồng bộ XP từ Firestore client cũ đã bị vô hiệu hóa. Các sự kiện doanh thu hoặc thao tác nghiệp vụ được cấp điểm phải đi qua máy chủ xác minh Staff ID. Không bật lại các Firestore trigger XP cũ trên những collection còn ghi được từ trình duyệt.
