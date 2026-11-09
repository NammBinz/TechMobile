# Đồng bộ mã quản lý — 06/11/2026

Theo yêu cầu tiếp theo của chủ dự án, thống nhất ID quản lý thành **string 13 chữ số**: tài khoản, danh mục, sản phẩm, phiên bản, đơn hàng, đánh giá, mã giảm giá, nhà cung cấp, phiếu nhập, quyền bảo hành và phiếu bảo hành. Mỗi collection giữ tính duy nhất, mã đã đúng định dạng không đổi.

Không đổi IMEI 15 chữ số, ID kỹ thuật devices, dòng đơn/dòng nhập, sự kiện hay operationId UUID. Các ID này đang nhất quán trong vai trò kỹ thuật; không dùng chúng thay mã quản lý hiển thị. Phiếu nhập/phiếu bảo hành hiển thị toàn bộ mã 13 chữ số, bỏ cách cắt còn 8 ký tự.

## Đã áp dụng

| Nhóm | Số mã đổi | Tổng hiện có |
|---|---:|---:|
| Tài khoản | 2 | 4 |
| Danh mục | 8 | 8 |
| Sản phẩm | 35 | 35 |
| Phiên bản | 274 | 274 |
| Mã giảm giá | 2 | 3 |
| Quyền bảo hành | 23 | 23 |
| Phiếu bảo hành | 1 | 1 |
| Đơn hàng | 0 | 29, đã chuẩn hóa ở đợt trước |
| Đánh giá | 0 | 5, mã cũ đã đúng định dạng |
| Nhà cung cấp / phiếu nhập | 0 | Chưa có; bộ cấp mã mới dùng 13 chữ số |

Tổng **345 mã được đổi**. Đồng thời chuẩn hóa các tham chiếu, gồm một item.productId number cũ sang string mã mới. Không coi mã dạng timestamp là chứng cứ thời điểm tạo cũ; ngày nghiệp vụ không bị thay thế.

Backup **`backups/db-before-entity-ids-1793941775488.json`**, kèm `db-before-entity-ids-1793941775488-mapping.json`. Dừng đúng API theo PID/lock/cổng, chờ thoát, backup và ghi nguyên tử rồi bật API lại. Không commit/push.

## Quan hệ và tương thích

- Ánh xạ theo loại thực thể, không thay mọi giá trị `1`: tài khoản `1`, sản phẩm `1`, danh mục `1`, coupon `1` là các đối tượng khác nhau.
- Variant được ánh xạ trong phạm vi product, vì slug như `den-128gb` có thể lặp ở nhiều sản phẩm. Order/device/receipt line dùng productId + variantId chuẩn hóa đúng cặp.
- Giữ legacyIds để lookup URL/payload cũ. API GET sản phẩm/tài khoản/danh mục/coupon/review/bảo hành, các command và thao tác ghi sản phẩm/variant/phiếu nhập chấp nhận alias phù hợp.
- Cache kết quả command được cập nhật theo cấu trúc/action của thực thể, không đổi operationId/fingerprint. Store chấp nhận fingerprint đúng actor ID hiện hành hoặc alias cũ của chính tài khoản đó; không cho tài khoản khác replay. Không xóa lịch sử để né kiểm idempotency.
- Server cấp mã mới, không tin ID do client gửi khi tạo. Với variants mới, UUID tạm ở React chỉ là key của form; ID lưu thực tế do server cấp. Aliases không cho client tự ghi đè.
- Giỏ cũ được hydrate qua alias product/variant, giữ số lượng. Thêm cùng SKU cũ/mới không tạo hai dòng. Yêu thích/so sánh nhận diện alias, link cũ vẫn mở đúng sản phẩm. Không xóa hoặc chuyển namespace localStorage; dữ liệu không có variant vẫn yêu cầu chọn lại như trước.
- File nhập theo ID cũ vẫn được preview qua alias và lưu ID chuẩn. Cột ID trong Excel nên để Text, IMEI bắt buộc Text để giữ chữ số.
- Đăng nhập lại sau API restart; tài khoản/mật khẩu/vai trò không đổi. Session không được di trú hoặc giả lập.

## Phạm vi bảo toàn

Không đổi giá bán, giá vốn, tổng tiền/giảm giá/thanh toán/trạng thái/ngày của đơn, snapshot máy, IMEI, số lượng máy hay trạng thái kho. Bảo hành/claims vẫn đúng máy, đơn và khách. Lịch sử người thao tác cập nhật ID nếu biết tài khoản tương ứng; nhãn kỹ thuật như demo_migration/customer_cod được giữ, không bịa người thao tác.

Các audit giá và kế hoạch backfill cũ trong docs/backups giữ nguyên để đối chiếu theo thời điểm. Không viết lại bằng chứng lịch sử hoặc tạo thêm giá vốn/phiếu nhập do chuyển ID. Những script backfill cũ không tự chạy lại.

`node scripts/normalize-entity-ids.cjs` mặc định dry-run, `--apply` lấy lock độc quyền và backup. Chạy lại không đổi mã hay tạo thêm record. Không xóa khóa khi tiến trình chủ còn chạy.

## Kiểm chứng

- **47/47 domain/HTTP đạt**: mapping theo collection, variant trùng slug giữa sản phẩm, quan hệ receipt/user/product/review, IDs kỹ thuật giữ nguyên, giá/trạng thái giữ nguyên, chạy lại không đổi, cache actor/payload cũ, không cho actor khác replay, URL cũ và mã quản lý tạo mới 13 chữ số.
- Chrome smoke/commerce/import và ca riêng sau migration fixture đạt: đăng nhập lại, URL sản phẩm cũ, giỏ cũ giữ số lượng/merge, yêu thích/so sánh cũ thao tác đúng.
- Đối chiếu backup sau apply: ID quản lý string 13 chữ số; FK danh mục/review và invariant đạt; snapshot tài chính/kho/IMEI/fingerprint giữ nguyên, API `/products/1` mở qua alias.
- Build đạt; lint baseline 28 errors/5 warnings, file ID/migration mới không có lỗi. Một lần chạy Chrome lỗi khởi tạo CDP Target.createTarget, thử lại khởi tạo thành công. Một lượt full sau đó đạt 31/32 do website thật cổng 5173 không chạy (ảnh ERR_CONNECTION_REFUSED), không phải assertion nghiệp vụ; đã bật Vite khi cổng trống để kiểm tra lại.
- **Lượt cuối sau bật Vite: full 32/32 đạt**, kèm Chrome migration fixture (URL/giỏ/yêu thích/so sánh cũ) đạt. Không skip nhóm đọc website thật. API và Vite hiện đang chạy, không yêu cầu khởi động thêm tiến trình trùng cổng.
