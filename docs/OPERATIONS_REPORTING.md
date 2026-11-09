# Nhập kho, hồ sơ IMEI và báo cáo — 02/11/2026

Cập nhật 06/11: [import Excel/CSV, giá tham chiếu và vốn mô phỏng được chủ dự án duyệt](IMPORT_AND_PRICES_2026-11-06.md). Giữ quyền admin cho nhập kho. Đây là ngoại lệ mới đối với quyết định trước không tự mô phỏng giá vốn cũ; chỉ áp dụng một lần cho dữ liệu đã có, không áp dụng vào lần nhập tương lai. Dashboard phân biệt lợi nhuận dùng vốn mô phỏng.

Đã triển khai theo sáu lựa chọn được chủ dự án duyệt. Giữ React/Vite/json-server runner, command/store transaction và schema IMEI hiện có. Không chạy migration hoặc ghi vào db dự án trong đợt phát triển; các collection mới là tùy chọn đối với db cũ, được tạo khi thực hiện lệnh nhập liệu liên quan. Không tự tạo giá nhập, phiếu nhập hay lịch sử giao hàng cho máy cũ.

## Giao diện và quyền

| Trang | Admin | Staff | Khách |
|---|---|---|---|
| Dashboard `/admin` | Báo cáo, giá vốn/lợi nhuận | Báo cáo không có giá vốn/lợi nhuận | Không |
| Nhà cung cấp `/admin/suppliers` | Thêm/sửa/ngừng | Không | Không |
| Phiếu nhập `/admin/receipts` | Nháp, xác nhận, điều chỉnh giá | Không | Không |
| Hồ sơ `/admin/imei?imei=...` | Toàn bộ, bổ sung giá vốn | Máy/đơn/bảo hành, không có giá vốn/phiếu | Không |
| Timeline đơn | Mốc, vai trò, ID người thao tác | Mốc và vai trò | Chỉ đơn của chính khách |

API kiểm quyền độc lập giao diện. Các trường purchaseCost/costSnapshot/costHistory/unitCost và các chỉ số giá vốn/lợi nhuận bị loại khỏi JSON cho non-admin, kể cả command result, đơn hàng và danh sách devices. Hồ sơ IMEI staff không trả phiếu nhập. Cập nhật giá vốn không lộ ghi chú tài chính ra timeline khách.

## Phiếu nhập

1. Tạo nhà cung cấp, hoặc chọn Chưa xác định.
2. Lập phiếu nháp với ngày nhận, nhiều dòng product/variant, giá nhập mỗi máy (có thể trống), IMEI thật hoặc nút Tạo IMEI demo.
3. Lưu nháp chưa tạo devices, chưa tăng tồn. Có thể sửa nháp, giữ revision để chống ghi đè.
4. Xác nhận phiếu kiểm toàn lô: checksum, trùng trong/giữa dòng và với db, quan hệ variant, nhà cung cấp còn active; mỗi dòng ít nhất một máy, tối đa 500 máy/phiếu. Thành công mới tạo máy available và chốt phiếu trong một transaction.
5. Retry cùng operation hoặc xác nhận lại không tăng tồn lần hai. Không sửa/xóa trực tiếp phiếu đã xác nhận. Điều chỉnh giá cần lý do và revision, giữ history; không xóa IMEI hoặc thay quan hệ của máy đã bán.

Nhập nhanh trên DeviceManager cũng tạo/xác nhận phiếu trong cùng command, có giá nhập/nhà cung cấp tùy chọn và giữ response devices cũ để tương thích. Không tạo phiếu cho các lần nhập trước đây.

Ví dụ dữ liệu (ID minh họa):

```json
{
  "suppliers": [{ "id": "s1", "name": "Nhà cung cấp", "status": "active", "revision": 1 }],
  "purchaseReceipts": [{
    "id": "r1", "status": "confirmed", "revision": 2,
    "supplierId": "s1", "supplierName": "Nhà cung cấp",
    "receivedAt": "2026-11-02T03:00:00.000Z",
    "lines": [{ "id": "l1", "productId": "p1", "variantId": "v1", "unitCost": 15000000, "imeis": ["<IMEI hợp lệ>"], "simulatedImeis": [] }],
    "history": [{ "at": "2026-11-02T03:00:00.000Z", "actorId": "admin-id", "event": "confirmed" }]
  }]
}
```

Máy mới có receiptId/receiptLineId/supplierId/purchaseCost. purchaseCost=null hoặc không có nghĩa là chưa biết; 0 là giá nhập đã biết bằng 0. Supplier ngừng hoạt động vẫn giữ nguyên phiếu cũ.

## Snapshot giá vốn và dữ liệu cũ

Khi shipping, từng deviceSnapshot lưu costSnapshot từ giá nhập hiện tại. Giá vốn này không thay theo điều chỉnh phiếu hoặc giá nhập máy về sau. Máy giao thất bại được nhận/kiểm tra và bán lại có snapshot độc lập cho lần bán mới; đơn cũ không bị đổi giá vốn đã biết.

Admin có thể dùng Hồ sơ IMEI → Bổ sung/điều chỉnh giá vốn với lý do bắt buộc. Lệnh này lưu costHistory, cập nhật giá máy hiện tại và chỉ điền các snapshot còn thiếu (kể cả đơn cũ), tăng revision và ghi sự kiện nội bộ của đơn. Snapshot đã biết không bị ghi đè. Đây là cập nhật báo cáo có chủ ý, không tự suy đoán giá. Bản ghi historicalOnly không được bổ sung giá để trở thành hàng bán.

Điều chỉnh đơn giá phiếu chỉ tác động giá máy hiện tại; nếu snapshot cũ chưa biết thì bổ sung qua hồ sơ máy để có dấu vết riêng. Không có công nợ, thanh toán nhà cung cấp, chi phí vận hành, giao nhiều đợt hoặc nhập Excel trong phạm vi này.

## Báo cáo

- Doanh thu = tổng totalPrice sau giảm giá của đơn completed, theo completedAt. Không lấy createdAt thay ngày hoàn thành.
- Giá vốn đã biết = tổng costSnapshot đã biết của các máy thuộc các đơn trong kỳ.
- Khi có máy thiếu giá vốn, lợi nhuận gộp toàn kỳ hiển thị Chưa đủ giá vốn. Khi đầy đủ: doanh thu − giá vốn. Chưa trừ vận chuyển, sửa chữa hay chi phí cửa hàng.
- Ghi nhận thanh toán theo paymentHistory/paidAt, tách nguồn điều chỉnh demo. Số âm là điều chỉnh giảm ghi nhận, không phải xác nhận hoàn tiền. Không gọi các số này là đối soát tiền thực thu.
- Đơn hoàn thành/ghi nhận thanh toán thiếu mốc có danh sách đối chiếu, không cộng vào số liệu theo kỳ. Không thay dữ liệu cũ bằng ngày giả.
- Ngày lọc theo múi giờ Việt Nam; khoảng đầu/cuối bao gồm cả ngày. Biểu đồ dùng YYYY-MM nên không gộp cùng tháng của nhiều năm.
- Bảng sales/payment và CSV dùng cùng dữ liệu lọc từ API. CSV escape dấu nháy và phòng công thức từ chuỗi. Kho, trạng thái đơn hiện tại và đơn gần đây ghi rõ toàn bộ, không bị hiểu là chỉ số theo kỳ.

## Timeline và hồ sơ máy

Các lệnh mới place/allocate/transition/cancel/accept-return/payment ghi history cùng transaction với thay đổi nghiệp vụ. COD completed cũng ghi paymentHistory; đổi thanh toán cùng trạng thái không tự dời paidAt hoặc tạo ghi nhận tiền mới. Retry operation không thêm sự kiện lặp.

API đọc dựng mốc legacy chỉ từ trường thời gian/history đã có, ghi rõ dữ liệu cũ và không biết người thao tác nếu chưa lưu; không persist lịch sử suy luận. Hồ sơ IMEI kết hợp assignmentHistory, statusHistory, mọi đơn có snapshot/phân bổ, quyền bảo hành và claims. Snapshot lịch sử không bị thay khi máy được bán cho đơn khác.

## API/lệnh

- `GET /suppliers`, `GET /purchaseReceipts`: admin.
- `GET /reports/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD`: admin/staff; staff không có trường tài chính nội bộ.
- `GET /devices/profile/:imei`: admin/staff, hồ sơ máy chính xác theo IMEI.
- `POST /commands/save-supplier`, `save-receipt`, `confirm-receipt`, `adjust-receipt`, `set-device-cost`: admin, token + Idempotency-Key; cập nhật thực thể cần expectedRevision.
- `receive-device` cũ vẫn dùng được, nhận thêm supplierId/purchaseCost tùy chọn.

Khởi động bằng `npm.cmd run server` rồi `npm.cmd run dev`. Nếu API là tiến trình trước cập nhật, cần restart và đăng nhập lại; không xóa lock của tiến trình đang sống. Không có migration bắt buộc cho db schemaVersion=2 đang dùng. Trước khi dùng với dữ liệu quan trọng vẫn cần backup và kiểm chứng khôi phục.
