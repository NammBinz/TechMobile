# Kiểm chứng IMEI demo và form admin — 23/10/2026

## Kết quả mới nhất sau phạm vi A–E

`npm.cmd test`: **27/27 đạt**. Thêm HTTP test từ chối trùng tổ hợp kể cả khác hoa/thường/khoảng trắng, từ chối đổi RAM máy đã nhập và không ghi dở; vẫn cho thêm RAM mới khác tổ hợp. `npm.cmd run test:ui -- --full`: **32/32 nhóm đạt**, Chrome smoke đạt; ba lỗi UI cũ (404, Compare panel và RAM) đã được sửa. Ca RAM mở rộng kiểm bốn nhóm phiên bản, chọn 16GB/128GB đưa đúng variantId/RAM vào giỏ, giữ màu Xanh và chọn xem 16GB/1TB hết hàng với nút mua khóa. Ảnh `browser-artifacts/ram-storage-selection.png`. Kiểm sắp xếp RAM trước và TB/GB sau đạt; build đạt (cảnh báo chunk lớn giữ nguyên).

Lint toàn repo **29 errors/5 warnings**, giảm một lỗi so với baseline 30/5; lỗi hooks cũ của ProductDetail vẫn tồn tại, không tuyên bố toàn repo sạch lint. Harness chờ wishlist/product options tải trước khi thao tác, chọn dung lượng trước màu theo UI mới và kiểm thêm giỏ theo localStorage thay vì giả định điều hướng. Không bỏ assertion hay bỏ nhóm test. Test ghi vào fixture riêng, không sửa db dự án hoặc dừng API đang dùng. Source API mới cần khởi động lại `npm.cmd run server` để validation phiên bản có hiệu lực ở tiến trình đang chạy.

## Điều chỉnh trạng thái thanh toán theo yêu cầu chủ dự án

**Đính chính theo yêu cầu tiếp theo:** chuyển riêng 10 đơn cancelled hiện có về unpaid, xóa paidAt/paidBy hiện hành nhưng giữ giá trị trước trong paymentHistory. Đơn khác và tồn không đổi, invariant đạt. Backup `backups/db-before-cancelled-unpaid-1792731914776.json`; API đã restart và kiểm tra hoạt động. Đây chỉ là sửa dữ liệu demo hiện có, không thay quy tắc hủy đơn mới hoặc tự ghi nhận hoàn tiền. Kết quả “không còn đơn chưa paid” của thao tác trước dưới đây đã được thay thế bởi đính chính này.

Đã đánh dấu paid cho 17 đơn còn unpaid/thiếu paymentStatus: 9 cancelled, 7 completed, 1 pending. Đây là điều chỉnh dữ liệu demo được yêu cầu, không phải đối soát giao dịch hoặc chứng minh tiền thực thu. Lưu paymentHistory với trạng thái trước, thời điểm và lý do; paidBy=owner_requested_demo_adjustment, paymentStatusSource=demo_adjustment, tăng revision. paidAt là lúc đánh dấu, không suy tạo ngày nhận tiền cũ. Những đơn vốn paid không thay đổi.

Backup `backups/db-before-paid-adjustment-1792731660128.json`. Đã kiểm invariant, tồn/product projection và các collection ngoài orders không đổi; các field đơn ngoài thanh toán/history/revision không đổi. Sau ghi không còn đơn thiếu/chưa paid; API đã khởi động lại và GET products khớp dữ liệu. Không đổi quy tắc thanh toán cho đơn tạo mới, không tự paid khi server chạy, không commit/push dữ liệu.

## Bổ sung IMEI còn thiếu theo yêu cầu mới

Đã áp dụng script backfill có backup cho 10 đơn hủy/17 dòng/18 máy mô phỏng lịch sử. Không còn dòng thiếu cả snapshot và assignment tại lúc kiểm tra sau ghi. Invariant đạt; projectProducts (tồn/giá), mọi device đã có và mọi collection ngoài orders/devices so với backup đều không đổi. Chạy lại hàm backfill báo 0 IMEI. API 3000 đã restart và GET products khớp dữ liệu mới. Backup ở `backups/db-before-order-imei-backfill-1792731072717.json`, không đưa lên Git.

`npm.cmd test`: **26/26 đạt**, thêm ca bảo toàn dữ liệu nguồn/tồn/bảo hành, checksum/duy nhất qua invariant, số snapshot đúng quantity, chạy lại không tạo thêm, và chặn chuyển máy historicalOnly về available. Build và lint các file script/OrderDevices/DeviceManager đạt. Các kết quả cũ bên dưới giữ nguyên phạm vi thời điểm kiểm thử.

## Bổ sung sau khi chốt luồng bán lại

`npm.cmd test`: **25/25 đạt**, thêm hai ca hủy tại shipping/delivered rồi bán cùng máy cho khách khác: giữ snapshot đơn cũ, chặn mua khi chưa nhận/kiểm tra, bảo hành đơn mới đúng khách, void quyền đơn cũ nếu có, retry hủy/nhận đơn cũ không giải phóng máy sold, chặn đưa sold về available và bán tiếp. Backend đã có luồng này nên không thay schema hoặc migration.

`npm.cmd run test:ui`: Chrome smoke đạt, bổ sung hai máy nhận về → kiểm tra đạt → xuất cho đơn mới → completed; xác nhận cả hai đơn trong OrderManager vẫn hiển thị cùng IMEI và lịch sử khách có giải thích đơn hủy. `npm.cmd run build` đạt (cảnh báo chunk lớn giữ nguyên); lint OrderDevices và smoke harness đạt. Không chạy lại bộ UI `--full` trong lượt bổ sung này; kết quả 29/32 bên dưới thuộc lượt kiểm tra trước.

## Phạm vi

Nút Tạo IMEI demo, nhập kho, provenance của máy demo và giao diện nhập liệu trên các trang admin: sản phẩm/phiên bản, danh mục, tài khoản, nhân sự, mã giảm giá, IMEI/tồn kho, hủy đơn và bảo hành. Không chạy migration hoặc thao tác ghi qua API đang dùng. Test ghi dữ liệu trên fixture bộ nhớ/cổng riêng; kiểm tra website 5173/3000 chỉ đọc trang công khai.

## Kết quả

| Kiểm tra | Kết quả |
|---|---|
| `npm.cmd test` | 23/23 domain/HTTP đạt |
| Chrome smoke trong `npm.cmd run test:ui -- --full` | Đạt nhập IMEI demo, sửa variant, checkout, tự phân bổ, giao/hoàn thành COD, hóa đơn, trả máy và bảo hành |
| UI mở rộng | 29/32 nhóm đạt; exit 1 do ba lỗi cũ bên dưới |
| Form CRUD qua Chrome | Thêm/sửa danh mục, coupon, tài khoản, nhân sự, sản phẩm đạt; sửa variant và ghi chú xử lý máy/bảo hành đạt |
| Responsive | Các route admin/khách đạt ở 390/768/1280px; xem ảnh form sản phẩm và phiên bản desktop |
| `npm.cmd run build` | Đạt; cảnh báo chunk trên 500 kB còn như trước |
| ESLint toàn repo | 30 errors/5 warnings baseline; không có lỗi ở component form/modal mới và các file IMEI/harness đã kiểm tra |

Ba lỗi ứng dụng cũ vẫn tái hiện: nhóm 3 ProductDetail với ID không tồn tại kẹt loading; nhóm 11 xóa Compare chưa phát sự kiện cập nhật panel; nhóm 28 ProductDetail không chọn được RAM khác khi cùng màu/storage. Không sửa các module này trong yêu cầu giao diện admin.

Harness được cập nhật để điền hộp thoại ghi chú thay prompt và chờ nút thao tác đơn/navbar sau khi dữ liệu tải xong. Không bỏ assertion hoặc bỏ qua nhóm kiểm thử. Kết quả chi tiết và ảnh ở `browser-artifacts/` (ignored); kiểm thử có thể chạy lại bằng lệnh trên.

## Git và sử dụng

Đã push `8aca7e4 — Update IMEI` lên `origin/main` trước khi chỉnh giao diện form. Commit này gồm toàn bộ phần nguồn triển khai IMEI cần thiết, không chứa db đang dùng hoặc thay đổi README có sẵn. Các thay đổi form là phần tiếp theo trong working tree.

Nếu API đang chạy là tiến trình trước cập nhật, khởi động lại bằng `npm.cmd run server`, đăng nhập lại rồi tải lại trang. Chọn phiên bản/màu, chọn số mã và bấm Tạo IMEI demo; bấm Nhập kho để lưu. Việc tạo mã xem trước không làm tăng tồn.
