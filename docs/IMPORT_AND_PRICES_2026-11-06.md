# Import hàng loạt và cập nhật giá/vốn — 06/11/2026

## Quyền và cách nhập file

Giữ quyền hiện có: chỉ admin nhập/xác nhận phiếu, quản lý nhà cung cấp và giá vốn. Không thêm vai trò nhân viên kho hoặc nới quyền staff.

Trong Phiếu nhập kho:

1. Bấm **Tải mẫu CSV có danh sách phiên bản**; mở bằng Excel, định dạng cột IMEI là **Text** trước khi nhập. Có thể lưu lại thành `.xlsx` hoặc `.csv` UTF-8. Xóa các dòng mẫu không nhập hàng.
2. Mỗi dòng là một máy. Giữ `productId` + `variantId`, điền `imei` và `unitCost` nguyên đồng không dấu phân cách. Các cột tên/RAM/dung lượng/màu có sẵn giúp đối chiếu; nếu điền, chúng phải khớp với ID. Có thể dùng đủ tên + RAM + dung lượng + màu thay ID nếu xác định được duy nhất một phiên bản.
3. Chọn file (sheet đầu tiên với XLSX, tối đa 2 MB/500 máy). Bảng xem trước chỉ ra dòng sai, IMEI trùng trong file hoặc đã có trong db, IMEI số/khoa học/sai checksum, giá vốn thiếu/sai hoặc SKU không khớp.
4. File còn lỗi không được áp dụng một phần. File hợp lệ được nhóm theo product/variant/giá vốn, tối đa 100 nhóm. **Đưa dữ liệu vào phiếu nháp** chỉ soạn form; lưu nháp vẫn chưa tăng tồn. **Xác nhận nhập kho** mới kiểm lại trùng và tạo máy nguyên tử.
5. Không tự tạo sản phẩm/variant/IMEI hoặc giá vốn khi đọc file. Các dòng đã soạn trong form được giữ và nối thêm; nếu chúng trùng với dữ liệu file, cần sửa trước khi xác nhận. Kiểm tra tại thời điểm xác nhận bảo vệ cả thay đổi xảy ra sau preview.

Thư viện đọc XLSX `read-excel-file` 9.3.14 được tải động khi chọn Excel, CSV dùng parser cục bộ. Không hỗ trợ file `.xls` cũ hoặc đọc ảnh/PDF hóa đơn. Endpoint `POST /purchaseReceipts/import-preview` chỉ admin, không ghi dữ liệu; lưu/xác nhận vẫn dùng command với idempotency/revision.

## Giá CellphoneS

Đã đọc 74 URL trang mẫu/phiên bản và đối chiếu 274 variants trong 35 sản phẩm. Dùng giá công khai theo màu tại khu vực mặc định Hồ Chí Minh; không lấy giá Smember, thu cũ, mã thanh toán hoặc bảng giá trong phần bài mô tả. Trang đang tạm hết hàng nhưng vẫn công khai giá dương được ghi nhận như giá tham chiếu hiện hiển thị, không suy ra hàng đang bán được. Không thay trạng thái/tồn của TechMobile theo tồn của CellphoneS.

- **129 variants thuộc 18 sản phẩm** có giá khớp mẫu/RAM/dung lượng/màu; **127 giá thực sự thay đổi**, 2 đã đúng giá.
- **145 variants giữ nguyên** khi thiếu nguồn giá dương đúng SKU, không có trang, khác cấu hình/màu hoặc nguồn mâu thuẫn. Không lấy giá máy cũ/đã kích hoạt thay cho máy mới, không suy giá cho dung lượng còn thiếu.
- Một số tên màu marketing Anh/Việt được ánh xạ rõ nghĩa trong script, ví dụ Space Black ↔ Đen Không Gian, Cloud White ↔ Trắng Mây, Mist Blue ↔ Xanh Lam Khói. Tên không ánh xạ được giữ nguyên giá.
- Chỉ đổi giá bán hiện tại. Giữ các mức giá/tổng tiền/giảm giá/thanh toán đã chốt trong orders, không định giá lại đơn đang xử lý. oldPrice niêm yết cũ không tự thay khi không có nguồn đồng nhất theo màu.

Đối chiếu từng SKU, URL, thời điểm, hash HTML và lý do bỏ qua ở [audit giá công khai](data/CELLPHONES_PRICE_AUDIT_2026-11-06.json). HTML nguồn nằm trong browser-artifacts/prices (ignored). Giá quan sát có thể thay đổi theo thời gian/khu vực, không phải đồng bộ thời gian thực.

Nguồn mẫu: [iPhone 17 Pro Max](https://cellphones.com.vn/iphone-17-pro-max.html), [iPhone 17](https://cellphones.com.vn/iphone-17-256gb.html), [Galaxy S24 Ultra](https://cellphones.com.vn/samsung-galaxy-s24-ultra.html). Giá lấy từ phần chọn mua/màu, không từ các đoạn bảng giá biên tập trong mô tả.

## Vốn mô phỏng được chủ dự án duyệt

Theo câu trả lời của chủ dự án: random 80–90%, mỗi mẫu có thể khác nhau. Đã chọn một tỷ lệ nguyên riêng cho mỗi model và giữ cố định cho đợt này. Giá vốn từng variant = giá bán **đang lưu trước cập nhật CellphoneS** × tỷ lệ, làm tròn đến 1.000đ. Không dùng oldPrice gạch ngang hoặc giá mới làm cơ sở.

- Bổ sung **841 máy** còn thiếu vốn, giữ mọi giá vốn đã biết (kể cả 0).
- Bổ sung **23 snapshot còn thiếu ở 18 đơn**, không ghi đè snapshot đã biết.
- **18 records historicalOnly** giữ retired/không assignment, không fake vốn vì không phải máy trong kho bán.
- Lưu purchaseCostSource/costSnapshotSource, tỷ lệ, giá cơ sở, costHistory và sự kiện nội bộ. API không trả các nguồn vốn này cho staff/khách. Hồ sơ máy gắn nhãn vốn mô phỏng, Dashboard cảnh báo lợi nhuận ước tính nếu kỳ có vốn demo; CSV có số máy dùng vốn mô phỏng.
- Đây là bổ sung một lần, không chạy lúc server khởi động. Các lần nhập sau dùng giá vốn do admin cung cấp, không tự fake tiếp. Giá vốn thực nhập/điều chỉnh mới có nguồn receipt/manual riêng; snapshot đã biết vẫn bất biến.

Kế hoạch tỷ lệ vốn chứa thông tin nội bộ ở `backups/CELLPHONES_PRICE_COST_PLAN_2026-11-06.json` (ignored), không đưa lên Git. Vite giữ các deny mặc định và chặn db.json/lock/temp, backups, browser-artifacts qua HTTP.

## Áp dụng và backup

Đã dừng đúng tiến trình API theo lock/cổng, chờ tiến trình thoát rồi mới bỏ khóa, cập nhật nguyên tử và bật lại API. Backup: **`backups/db-before-price-cost-1793938828785.json`**.

Các script collect/plan/apply là công cụ của đợt này, không cron/sync. `node scripts/apply-price-cost-update.cjs` mặc định dry-run; batchId đã áp dụng khiến chạy lại không thay đổi. Apply đòi hỏi lock độc quyền. Không tự áp dụng lại hoặc tạo lại tỷ lệ vốn khi có nhập mới.

Kiểm tra sau ghi: invariant đạt, số máy/IMEI/tồn không đổi, users/warranties/claims/coupons/categories/reviews/phiếu nhập/nhà cung cấp không đổi; tổng/giá bán dòng đơn/trạng thái/thanh toán/ngày đơn giữ nguyên. API đã chạy với dữ liệu mới; cần đăng nhập lại sau restart.

## Kiểm thử

- **39/39 domain/HTTP đạt**: CSV BOM/quote/header, Excel thật giữ IMEI Text, kiểm SKU/giá vốn/trùng, quyền admin, preview không ghi, update giá/vốn giữ dữ liệu và chạy lại an toàn.
- **Chrome smoke + commerce + import đạt**: CSV lỗi bị khóa áp dụng, XLSX thật preview → form → lưu nháp (chưa tăng tồn) → xác nhận tăng đúng một máy với giá vốn trong file.
- **Full UI 32/32 đạt**, bao gồm đọc website thật đang chạy 5173/3000; mọi ghi test dùng fixture riêng.
- Build đạt; XLSX tải động thành chunk khoảng 66 kB, bundle chính vẫn có cảnh báo trên 500 kB. Lint giữ **28 errors/5 warnings** baseline; các file import/update mới sạch lint.
- Đã kiểm HTTP localhost:5173/db.json và đường dẫn kế hoạch trong backups đều trả **403**. Lần đầu kiểm bằng 127.0.0.1 thất bại kết nối vì Vite lắng nghe localhost/IPv6; kiểm lại đúng địa chỉ đạt.

Không commit/push. Giữ các thay đổi có sẵn của README và dữ liệu dự án.
