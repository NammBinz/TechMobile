# Chuẩn hóa mã đơn — 06/11/2026

Cập nhật tiếp theo: chủ dự án đã yêu cầu đồng bộ cả những nhóm ID còn lại. Xem [đợt đồng bộ toàn bộ mã quản lý](ENTITY_CODES_2026-11-06.md); bảng “chỉ báo cáo” bên dưới là trạng thái trước đợt tiếp theo, không còn là hiện trạng sau áp dụng.

Theo yêu cầu chủ dự án, mã đơn hiển thị và ID đơn hiện hành thống nhất **chuỗi 13 chữ số**. Không đổi mọi đơn thành cùng một mã ví dụ; mỗi đơn vẫn có mã riêng duy nhất. Các mã 13 chữ số có sẵn, gồm `1780367638373`, được giữ nguyên.

## Dữ liệu đã áp dụng

29 đơn gồm 22 mã 13 chữ số đã đúng, 6 UUID và một mã number `1`. Đã chuyển 7 mã chưa đúng:

| Mã cũ | Mã mới |
|---|---|
| `1` | `1779840000000` |
| `578d141e-f51a-42d1-b81c-1aa3c5401acd` | `1792224140811` |
| `e4dcfaf1-3aac-4339-b220-57ccfba6d687` | `1792227690651` |
| `275deb88-5e75-48ce-b0b2-a596df2b7db9` | `1792730645935` |
| `30a62de3-a9c4-4e0b-a10a-b317056c3486` | `1792730743633` |
| `e405be7d-a34d-4f09-baf5-924d86822d16` | `1792730961451` |
| `cfa5656b-5467-47ec-9215-f6fb7cd14353` | `1792730997126` |

Mã chuyển đổi dùng mốc createdAtIso đã lưu, tăng 1 khi trùng; không thay các trường thời gian hoặc giả định mã này là bằng chứng giờ tạo chính xác của dữ liệu cũ. Đơn mới dùng Date.now() và kiểm trùng trên toàn orders/aliases trong transaction, lưu kiểu string. UUID vẫn dùng cho các thực thể kỹ thuật khác.

Backup: `backups/db-before-order-ids-1793939727084.json`; mapping riêng cùng tên hậu tố `-mapping.json`. API đã dừng theo PID/lock/cổng trước khi ghi nguyên tử, rồi bật lại. Không commit/push.

## Bảo toàn quan hệ và tương thích

- Cập nhật orderId/sourceOrderId trong phân bổ hiện hành, assignmentHistory, warranties, reviews và cache kết quả lệnh.
- Chỉ sửa id của object có cấu trúc đơn (items/userId/status), không thay mọi giá trị `1` hoặc UUID trong dữ liệu. Product/user/device/item IDs, IMEI, giá vốn và trạng thái kho được giữ nguyên.
- Giữ nguyên fingerprint và operationId; cache trả kết quả có mã đơn mới khi retry payload cũ. Không xóa lịch sử idempotency để né migration.
- `legacyIds` giữ mã cũ. GET orders/:id, các command đơn và lookup đơn để review hỗ trợ alias; OrderManager tìm được query mã cũ. Các liên kết mới dùng ID mới, bookmark cũ vẫn tìm thấy đơn. Quyền sở hữu tiếp tục được kiểm tra khi resolve alias.
- Không đổi tổng tiền, giá bán snapshot, giảm giá, thanh toán, ngày hoàn thành hoặc trạng thái đơn. Tăng revision cho đơn đổi ID để yêu cầu tải lại khi có thao tác cũ.
- `node scripts/normalize-order-ids.cjs` mặc định dry-run; `--apply` lấy lock, backup, ghi nguyên tử. Chạy lại không đổi mã hoặc tạo thêm đơn.

## Các định dạng khác còn khác nhau — chỉ báo cáo

| Nhóm | Hiện trạng | Tạo mới hiện tại |
|---|---|---|
| Tài khoản | 2 ID số ngắn dạng string + 2 ID 13 chữ số dạng string | UUID |
| Danh mục | 8 ID số ngắn dạng string | UUID |
| Sản phẩm | 35 ID số ngắn dạng string | UUID |
| Mã giảm giá | 2 ID số ngắn + 1 ID 13 chữ số | UUID |
| Đánh giá | 5 ID 13 chữ số | UUID |
| Phiên bản | 274 ID dạng slug màu/RAM/dung lượng | UUID khi thêm phiên bản |
| Phiếu nhập / nhà cung cấp | Chưa có bản ghi ở db hiện hành | UUID; phiếu nhập hiển thị rút gọn 8 ký tự |
| Quyền bảo hành / phiếu bảo hành | 23 / 1 UUID | UUID; một số chỗ hiển thị rút gọn |

Còn một item.productId kiểu number, các tham chiếu productId còn lại chủ yếu string. Các helper server dùng so sánh String ở ranh giới liên quan; không tự migration sản phẩm/tài khoản hoặc sửa hàng loạt các ID này trong yêu cầu đổi mã đơn.

Devices (859 UUID), dòng đơn (41 UUID), ID sự kiện và mã thao tác kỹ thuật dùng UUID nhất quán. Máy được nhận diện nghiệp vụ bằng IMEI 15 chữ số. Những ID kỹ thuật này không cần cùng định dạng với mã đơn để bảo đảm quan hệ.

## Kiểm chứng

43/43 domain/HTTP đạt; thêm ca giữ ID product/user `1` khi đổi order `1`, cập nhật đồ thị quan hệ, collision timestamp, chạy lại không đổi, replay fingerprint cũ và alias có kiểm ownership. Chrome smoke/commerce/import và full 32/32 đạt; ghi test chỉ dùng fixture, đọc website thật chỉ đọc công khai. Build đạt, các file ID/migration/test mới sạch lint. Đối chiếu backup sau apply: 29 ID đơn đều string/13 chữ số và duy nhất; tiền/trạng thái/thanh toán/dòng hàng/kho/giá vốn không đổi, các mã 13 chữ số đã có không đổi.
