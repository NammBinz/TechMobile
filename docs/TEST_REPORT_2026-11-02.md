# Kiểm chứng ba phần đã duyệt — 02/11/2026

## Phạm vi

Nhà cung cấp, phiếu nhập/nhập nhanh, giá vốn và điều chỉnh, timeline đơn, hồ sơ IMEI, Dashboard/báo cáo/CSV. Giữ stack và command/store hiện có; không sửa db.json, chạy migration, dừng API đang dùng, commit hoặc push trong lượt này. Mọi thao tác ghi kiểm thử dùng fixture riêng.

## Kết quả

| Kiểm tra | Kết quả |
|---|---|
| `npm.cmd test` | 34/34 domain/HTTP đạt, gồm 7 nhóm commerce mới |
| `npm.cmd run test:ui` | Đạt Chrome luồng cũ và commerce mới trên API/Vite fixture cổng động, gồm điều chỉnh giá phiếu qua UI |
| `npm.cmd run test:ui -- --full` | 31/32 nhóm đạt; nhóm 1 đọc website thật fetch failed do không có listener ở 3000/5173 khi kiểm tra. 31 nhóm fixture đạt; không bỏ/skip nhóm lỗi hạ tầng này |
| `npm.cmd run build` | Đạt, cảnh báo chunk >500 kB còn (bundle khoảng 845 kB trước gzip) |
| ESLint toàn repo | 28 errors/5 warnings còn lại, giảm từ 29/5 trước đợt. Các file commerce/report/page mới không có lỗi lint |
| Responsive | Các trang mới kiểm 390/768px; bộ full vẫn kiểm các route cũ ở 390/768/1280px |

## Bằng chứng nghiệp vụ

- Phiếu nháp không tăng tồn; trùng IMEI giữa dòng từ chối toàn lô; xác nhận/retry không tăng tồn hai lần. Hai phiếu đồng thời cùng IMEI chỉ một phiếu nhập được; lỗi ghi đĩa không publish phiếu/devices một phần.
- Nhà cung cấp ngừng vẫn giữ phiếu, chặn xác nhận phiếu nháp dùng nhà cung cấp đã ngừng.
- Giá vốn 0 khác thiếu giá vốn. Điều chỉnh phiếu sau khi xuất giao không thay costSnapshot; bổ sung giá vốn cũ có lý do chỉ điền snapshot còn thiếu.
- Báo cáo tách năm và thời điểm hoàn thành/thanh toán; test ranh giới ngày UTC/Việt Nam, ngày sai, khoảng đảo, nguồn demo, ngày hoàn thành thiếu và lợi nhuận chưa đủ giá vốn.
- Hồ sơ cùng IMEI thấy cả đơn hủy và lần bán thành công; timeline legacy không bịa mốc/người thao tác còn thiếu.
- Staff/khách không nhận purchaseCost/costSnapshot/unitCost/costTotal/grossProfit ở API, gồm đơn/devices/report/profile. Các lệnh mua hàng/giá vốn và đọc phiếu/nhà cung cấp chặn staff. Khách bị chặn báo cáo.
- Chrome tạo nhà cung cấp, phiếu hai dòng có một dòng chưa biết giá nhập, tạo mã xem trước, lưu nháp, xác nhận rồi mở hồ sơ IMEI. Sửa giá máy và điều chỉnh giá phiếu qua UI vẫn giữ snapshot của đơn đã hoàn thành. Timeline admin hiển thị xuất giao; lọc Dashboard đến năm không có đơn trả 0 và reset khôi phục. Xuất CSV vẫn được kiểm trong full.

Ảnh và dữ liệu kiểm thử ở `browser-artifacts/` (ignored): `purchasing-receipts.png`, `device-profile-history.png`, `dashboard-report.png`, `full-ui-report.json`, `full-revenue.csv`. Có một lần smoke assertion tìm innerText của ghi chú trong details đang đóng bị timeout dù điều chỉnh đã lưu; sửa assertion kiểm textContent và chạy lại, không sửa ứng dụng để né lỗi test.

## Sử dụng

Đọc [schema, quyền và cách tính](OPERATIONS_REPORTING.md). Chạy `npm.cmd run server` và `npm.cmd run dev`; đăng nhập admin để thấy Phiếu nhập kho/Nhà cung cấp/Hồ sơ IMEI. Staff chỉ thấy hồ sơ máy và Dashboard đã ẩn giá vốn/lợi nhuận. Db cũ không bị tự thêm giá hoặc phiếu; collection mới được tạo khi người dùng lưu lệnh tương ứng.
