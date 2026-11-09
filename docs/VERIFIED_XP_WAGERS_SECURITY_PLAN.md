# DolphinApp — Verified XP wagering (security gate)

## Trạng thái

**NỀN TẢNG CHƯA KÍCH HOẠT.** `functions/wagers/rules.cjs` là module thuần để kiểm tra stake, tính phân phối XP và tính level sau quyết toán. Nó **không được export** thành Cloud Function, không xuất hiện ở menu game và không đọc/ghi Firebase. Vì vậy không tạo hoặc khấu trừ cược trong production.

Lý do: ba game hiện dùng trạng thái multiplayer có thể được máy chủ phòng/client cập nhật, trong khi quy tắc Firestore cũ cho phép client ghi vào `mp_rooms`. Bật cộng/trừ XP dựa trên trạng thái đó sẽ cho phép giả mạo chiến thắng.

## Quy tắc sản phẩm

| Game | Người chơi | Quyết toán |
|---|---:|---|
| Battleship | 2 | Người thắng nhận stake của người thua |
| Cờ Caro | 2 | Người thắng nhận stake của người thua |
| Cờ Tướng | 2 | Người thắng nhận stake của người thua |
| Dolphin Tactics | 4 | Vị trí thứ nhất nhận tổng stake của ba đối thủ; các vị trí còn lại mất stake của mình |

- XP chỉ dùng trong trò chơi; không giao dịch tiền, vật phẩm mua bằng tiền hoặc quy đổi ra tiền.
- Stake là số nguyên dương và không vượt `floor(xp - xpReserved)` của nhân viên, kiểm tra tại **thời điểm khóa**. Các Staff ID phải khác nhau, có danh tính Firebase xác minh và đang hoạt động/được duyệt.
- Mỗi phòng dùng `roomId + seed/instanceId` không trùng lặp. Cả hai (hoặc bốn) người xác nhận XP trước khi bắt đầu ván; không được tự sửa cược sau khi tất cả khóa.
- Hòa hoặc hủy hợp lệ: hoàn trả 100% stake, không mất XP. Thoát trận/thất kết nối: chỉ quyết toán dựa trên luật kết quả chính thức của từng game, có thời hạn reconnect hợp lý.
- Tổng delta toàn trận = 0: không tự tạo hoặc làm mất XP. Người thắng lấy đối thủ đã cược, **không nhận thêm lần nữa stake của chính mình**.
- Chỉ nhân viên có danh tính xác minh mới được vào chế độ cược. Ván thường tiếp tục hoạt động như cũ.
- Level hiển thị hiện tại tính từ `levelForXP(profile.xp)`, có thể giảm khi thua; `levelPeak` là mốc unlock vĩnh viễn, không bị giảm để không mất khung, Aura, Title, avatar đã sở hữu.
- Ghi sổ giao dịch với mã trận, UID/Staff ID, số tiền cược, delta, before/after, trạng thái, thời gian, kết quả đã xác minh; ẩn khỏi client những thông tin nội bộ không cần thiết.

## Các lớp bảo mật còn phải triển khai trước khi mở cược

1. **Xác minh thắng/thua không dựa vào client:**
   - Caro: máy chủ duy trì bàn cờ và xác minh tất cả nước đi theo lượt, đúng luật thắng/hòa.
   - Cờ Tướng: máy chủ xác minh hợp lệ từng nước, chiếu/chiếu bí, cấm đi sai và đầu hàng.
   - Battleship: máy chủ lưu vị trí tàu đã khóa (hoặc commit/reveal có nonce, đủ để kiểm chứng), xác minh lượt bắn, trúng/chìm, tổng thắng.
   - Dolphin Tactics: chỉ đọc `rooms/<id>` thuộc bộ máy trận đấu có thẩm quyền; phải có 4 người đã chốt stake và `finalPlacements` hợp lệ. Phòng casual/client-authored không đủ điều kiện.
2. **Tách phòng cược khỏi Firestore client-write:** giới hạn ghi `mp_rooms`, các đối tượng game state và results; tạo Cloud Functions server-only cho move/accept/resolve. Không kích hoạt cược khi các rule cũ còn quyền ghi trực tiếp tới kết quả dùng để chuyển XP.
3. **Khóa tiền cược:** dùng `staffRegistry/<id>.xpReserved` cập nhật trong transaction để hai ván không khóa cùng XP. Ghi durable `wagerEscrows/<matchId>` để tracking người đã chấp nhận/khóa và hoàn tiền khi hủy. Transaction giữa nhiều user cần coordinator có retry/recovery; tuyệt đối không dựa vào nhiều `.update()` độc lập để tuyên bố hoàn tất.
4. **Quyết toán idempotent/recovery:** lưu chứng nhận kết quả server vào `wagerSettlements/<matchId>`; debit người thua trước, credit người thắng sau, mọi bước có receipt không thể replay; job reconciliation sau crash/timeouts. Ngăn người thua tiêu tiếp phần đã khóa. Hai bước thanh toán thất bại phải được khôi phục tự động; bảo toàn tổng XP. Cần tính trường hợp Manager chỉnh XP hoặc đồng thời trao XP từ order.
5. **Không ảnh hưởng order:** không sửa `staffRecordLiveAction`, đơn hàng, doanh thu, daily quests, collection Firestore đơn hàng. Hệ thống cược chạy qua Cloud Functions riêng với resource quota, rate-limit và timeout riêng.
6. **Level:** thay thế chỗ dùng `max(levelForXP(xp),levelPeak)` chỉ ở **hiển thị Level hiện tại và bảng xếp hạng đang sử dụng hiện tại**. Vẫn dùng `levelPeak` để kiểm soát quyền sở hữu phần thưởng và kho trang phục. Đây là thay đổi cross-module, phải kiểm thử Character Card, Level Up Cinematic, Manager điều chỉnh XP, rankings và user status.
7. **UI:** hiển thị XP hiện tại, XP đang khóa, XP khả dụng, cược của từng người, nút chấp nhận, timeout chấp nhận, tóm tắt win/lose/draw, delta và Level thay đổi. Không cho đặt cược khi chưa xác minh danh tính. Tách chế độ `Ván thường` và `Ván cược XP`; không tự bật mặc định.

## Kiểm thử bắt buộc trước release

- Hai yêu cầu khóa đồng thời vượt tổng số dư; hai thiết bị cùng Staff ID; người chưa duyệt; cược 0, số lẻ, âm hoặc vượt khả dụng.
- Join/leave cùng lúc, timeout, disconnect, hủy trước khi bắt đầu, hủy sau khi một người đã khóa.
- Kết quả từ phía host/browser bị chỉnh, replay move giả, đổi kết quả sau khi kết thúc, cố gọi callable của tài khoản khác.
- Hai lệnh settle đến đồng thời; retry sau khi trừ XP nhưng chưa cộng thắng; nhiều server worker cùng chạy; chết giữa transaction.
- Hòa, thắng, đầu hàng, không đủ 4 người trong Tactics, đổi thành viên lúc khóa cược.
- XP cập nhật từ order đúng lúc khóa/settle; Manager trừ XP khi stake đã được giữ chỗ; fallback khi Firebase lỗi.
- Dữ liệu XP trước/sau và tổng XP toàn trận chính xác; UI profile/leaderboard cập nhật tức thời; Level xuống đúng nhưng không mất unlock; không có ảnh hưởng order.

## Điều kiện phát hành

Không merge các callable chuyển XP hoặc bật nút đặt cược thật cho tới khi có:
- Validators phía server đầy đủ 4 game, Firestore/RTDB rules mới và kiểm thử bảo mật.
- Coordinator escrow + settlement crash-safe với ghi sổ và job khôi phục.
- End-to-end tests dùng Firebase Emulator, kiểm thử giao diện trên thiết bị và chạy thử với XP giả.

Thiết kế hiện tại chủ động **fail closed**: nếu thiếu một điều kiện, game vẫn là trận thường không cược.
