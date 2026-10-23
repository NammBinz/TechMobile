# TechMobile — backlog đề xuất sau tiếp nhận

**Cập nhật 16/10/2026:** người dùng đã duyệt và đã triển khai kho IMEI/variant, tích hợp đơn/hóa đơn, bảo hành/tra cứu/phiếu/lịch sử. Xem [IMEI_WARRANTY.md](IMEI_WARRANTY.md). Các bảng dưới là backlog gốc trước triển khai, không phải toàn bộ trạng thái hiện hành.

- P0.1–P0.4: đã có bảo toàn variants/specs, kiểm giá/tồn/coupon server, giữ chỗ, hàng đợi/snapshot/idempotency, hủy/nhận lại; giữ giới hạn một tiến trình json-server.
- P1.1/P1.2/P1.4/P1.9, P3.1/P3.2: đã có phiên bản cơ bản và kiểm thử domain/HTTP/Chrome cho mô hình một IMEI/máy. Đổi máy/thay main, hạ tầng đa tiến trình và vòng đời bảo hành mở rộng còn backlog.
- P0.5/P3.4: bổ sung token phiên, role/ownership API; password hashing/production auth còn thiếu.
- Migration mới đã được người dùng cho phép sinh IMEI demo và suy luận variant cho dữ liệu cũ; không áp dụng quy tắc này vào dữ liệu thật.
- VietQR/payment filter, export nâng cao, shipping fee, email và các mục ngoài phạm vi chưa triển khai.

Ngày **16/10/2026**. **Chưa triển khai bất kỳ mục nào dưới đây.** Chờ người dùng lựa chọn phạm vi; không đổi framework/kiến trúc hoặc di trú db từ một yêu cầu audit.

Độ phức tạp: **S** = thay đổi hẹp ở một vài module; **M** = nhiều module/liên quan dữ liệu; **L** = thiết kế schema và kiểm thử tích hợp; **XL** = backend/hạ tầng hoặc nhiều hệ thống. Đây là độ lớn tương đối, không phải cam kết thời gian. Rủi ro là nguy cơ ảnh hưởng dữ liệu/tính năng khi triển khai. Fxx tham chiếu [TECHNICAL_AUDIT](TECHNICAL_AUDIT.md).

## P0 — lỗi nghiệp vụ, mất dữ liệu, bảo mật

| Hạng mục | Lý do/tiêu chí hoàn tất | Phức tạp | Rủi ro | File/phạm vi dự kiến |
|---|---|---|---|---|
| P0.1 Bảo toàn dữ liệu khi sửa product | F02: sửa tên/giá không mất variants/specs; fixture diff trước/sau, kể cả quantity=0 | M | Cao: dữ liệu product hiện tại | pages/admin/ProductManager.jsx; schema products; kiểm chứng json-server |
| P0.2 Checkout kiểm tồn, số lượng, giá/variant/coupon mới nhất | F03/F04: cộng số lượng theo định danh tồn, integer>0, active, giá đúng; không dùng giá cũ; coupon tái kiểm tra | L | Cao: đơn/kho/tổng tiền | pages/client/Checkout.jsx; utils/shopActions.js; Cart/Detail; API/schema |
| P0.3 Tạo đơn/trừ kho và chống submit lặp | F03: lỗi từng bước không tạo sai đơn/kho, retry không tạo đơn mới; kiểm concurrent checkout | L–XL | Cao | Checkout.jsx; orders/products API; backend transaction hoặc giới hạn demo được nêu rõ |
| P0.4 Hủy/hoàn kho đúng một lần | F05: status điều kiện mới nhất, lý do bắt buộc, retry/concurrent không cộng lặp, audit actor cụ thể | L–XL | Cao | OrderHistory.jsx; admin/OrderManager.jsx; orders/products; schema stock movement/backend |
| P0.5 Ranh giới bảo mật và dữ liệu demo | F01: xác định phạm vi demo; xác minh dữ liệu cá nhân/credentials trước công khai; auth/ownership/role/active không do client quyết định khi có backend thật | XL nếu triển khai auth | Cao: quyền truy cập, dữ liệu user/đơn | Login/Register/Profile, auth.js, ProtectedRoute, api.js, db.json, .gitignore, backend mới khi được yêu cầu |

Các kiểm tra client có thể giảm lỗi thao tác trong demo nhưng json-server read/modify/write không cung cấp bảo đảm giao dịch và authorization thương mại. Nếu giữ backend giả lập, phải ghi chính xác giới hạn thay vì gọi việc tắt nút là đã giải quyết race.

## P1 — cải thiện quan trọng

| Hạng mục | Tiêu chí/điểm phụ thuộc | Phức tạp | Rủi ro | File/phạm vi dự kiến |
|---|---|---|---|---|
| P1.1 Chuẩn hóa variant và tồn theo màu/dung lượng | Một SKU thống nhất giữa Card/Detail/Wishlist/Compare/Cart/Checkout; variant quantity; order snapshot có variant/color/storage; migration có bản sao | L | Cao | db.json schema; ProductManager; ProductDetail; ProductCard; shopActions; Cart/Checkout/OrderHistory/OrderManager/Invoice |
| P1.2 Đồng bộ order/payment/stock và transition | Chốt BANK unpaid có được completed; không paid đơn hủy tùy tiện; refund rõ; guard trạng thái mới nhất; COD paid đúng điểm; không auto-complete 3 ngày | L | Cao | Checkout, OrderHistory, OrderManager, Dashboard, BUSINESS_RULES; API/backend |
| P1.3 Chuẩn hóa dữ liệu cũ và ID | Một order.id number, một item.productId number; 14 order thiếu paymentStatus, 7 completed thiếu field. Chỉ migrate sau xác minh, không suy ra paid từ completed | M–L | Cao | db.json; helpers ID/date; OrderHistory/ProductReviews/Dashboard; công cụ migration được chọn sau |
| P1.4 Thống nhất các đường cart/compare/wishlist | Dùng helpers, hydrate quantity/price, giữ cartKey, emit/subscribe đầy đủ, active check nhất quán | M | Trung bình | shopActions; Compare; Wishlist; ProductCard/Detail; FloatingPanels; Cart |
| P1.5 Tài khoản và bảo toàn metadata | Khóa thay xóa, PUT không mất createdAt; admin cuối cùng/self-role; blocked session; dữ liệu shopping tách user/guest theo policy đã chọn | M–L | Cao | UserManager/StaffManager; Profile; auth; Header; ProtectedRoute; storage schema |
| P1.6 Review đúng quyền và chống trùng | completed, ownership/item thật, unique key, rating hợp lệ, retry/cập nhật aggregate an toàn | L | Cao | OrderHistory; ProductReviews; products/reviews API/backend |
| P1.7 BANK QR/nội dung chuyển khoản và lọc payment | QR/nội dung định danh order; vẫn unpaid đến khi đánh dấu thủ công; filter paymentStatus độc lập status; không gọi QR là xác thực ngân hàng | M | Trung bình/cao: thông tin chuyển khoản | Checkout; OrderManager; schema orders/config; tài liệu nghiệp vụ |
| P1.8 Loading/error/404 và dữ liệu bất hợp lệ | Preflight nằm trong try; empty≠error; cancel request đổi route; storage safe parse; validation số/email/code | M | Trung bình | Client/admin pages; api.js; auth/shopActions; App.jsx |
| P1.9 Kiểm thử tự động trọng yếu | Fixture cho PUT bảo toàn, checkout stock/price, cancel retry, review quyền/trùng, status/payment; test chức năng có ý nghĩa, không sao chép implementation | M–L | Trung bình | package/config tests khi được chọn; modules liên quan, CI sau này |

## P2 — trải nghiệm và tính năng mở rộng

| Hạng mục | Phạm vi/hiện trạng | Phức tạp | Rủi ro | File/phạm vi dự kiến |
|---|---|---|---|---|
| P2.1 Wishlist theo tài khoản | Hiện key chung origin; chọn local namespace hay backend theo kiến trúc được duyệt; giữ/merge guest dữ liệu | M–L | Trung bình | auth/shopActions; Wishlist; Card/Detail; db/API nếu cần |
| P2.2 Quản lý banner | Banner hiện hardcode; CRUD/active/link/preview được chọn sau | M | Thấp/trung bình | Home/ProductList; App/Sidebar; banner manager/schema mới |
| P2.3 Upload ảnh trực tiếp | Hiện chỉ input URL hoặc copy public/IMG; cần API/lưu trữ thật, validate file và preview | L | Cao nếu upload server | ProductManager; media API/storage; image rendering |
| P2.4 Báo cáo doanh thu nâng cao, khoảng ngày/năm | Chốt doanh thu trước; month/year/date range, đồng nhất chart và CSV; hiện chart trộn năm | M–L | Trung bình/cao: số liệu | Dashboard; date/revenue helpers; orders payment schema |
| P2.5 Sản phẩm bán chạy thực | Aggregate quantity từ đơn hợp lệ thay reviews; thống nhất Home/List/Dashboard | M | Trung bình | Dashboard/Home/ProductList; orders items/variant snapshot |
| P2.6 Export .xlsx và PDF | Hiện CSV + window.print, không có .xlsx/PDF generation; sanitize formula trong CSV hiện tại | M | Trung bình | Dashboard; OrderInvoiceModal; export helpers/dependency chỉ khi cần |
| P2.7 Tìm kiếm cấu hình nâng cao | RAM/ROM/chip/camera/pin, normalize units; hiện tên/hãng và giá | M | Thấp/trung bình | ProductList; schema specs; query/filter helpers |
| P2.8 Phí vận chuyển | Chưa có; chốt vùng/quy tắc/free-shipping, tính tổng và snapshot invoice | M | Trung bình/cao | Checkout/Cart/Invoice; orders schema; cấu hình phí |
| P2.9 Timeline theo dõi trạng thái | Hiện chỉ một vài ngày rời rạc; event history, actor/time và mốc giao/nhận/hủy | M–L | Trung bình | OrderHistory/OrderManager; orders history/backend; CSS |
| P2.10 Quyền nhân viên chi tiết | Hiện admin/staff chung quyền products/orders/dashboard; cần permission matrix được thống nhất | L | Cao | App/ProtectedRoute/Sidebar; admin pages; backend authorization |
| P2.11 Phân trang và truy vấn API | Hiện tải toàn collection rồi lọc client, kể cả users/orders/reviews | M | Trung bình | ProductList; managers; history/reviews; API query |
| P2.12 UI, CSS, assets và accessibility | Keys cartKey/lineId, delivered label, ảnh thiếu, lang, print; gom CSS cascade sau capture viewport; modal Escape/focus/body cleanup | M | Trung bình: dễ đổi UI đang tốt | style.css/product-detail.css; FloatingPanels; Invoice; index.html; assets |
| P2.13 Dọn code chết/trùng và tối ưu tải | productService cũ, DELETE/completed handlers unused, getSpecs/status/user forms lặp; lazy routes/chart; xử lý lint có chủ đích | M | Trung bình | App; components; managers; utils; ESLint config chỉ khi có lý do được thống nhất |

## P3 — mở rộng dài hạn

| Hạng mục | Phụ thuộc và mục tiêu | Phức tạp | Rủi ro | File/phạm vi dự kiến |
|---|---|---|---|---|
| P3.1 IMEI từng máy | Sau variant/SKU và stock movements; serial duy nhất, nhập/xuất/gán vào order, tránh bán hai lần | XL | Cao | Schema products/variants/inventory/IMEI mới; Product/Order managers; API/backend |
| P3.2 Bảo hành theo IMEI/đơn | Sau IMEI; thời hạn, tra cứu/tiếp nhận, trạng thái bảo hành, giữ lịch sử | XL | Cao | Warranty API/schema/pages mới, OrderHistory/Invoice/OrderManager |
| P3.3 Backend Node.js/Express + SQL | MySQL/PostgreSQL theo lựa chọn người dùng; migration/backup, transactions, constraints, không tự thay stack hiện tại | XL | Cao | Backend mới; api.js; schema/migrations; cấu hình và docs |
| P3.4 Auth/authorization an toàn và hash password | Hoàn thiện P0.5 trên backend, session/token policy, role/permission/active, password hash/đổi mật khẩu | XL | Cao | Auth endpoints/backend; Login/Register/Profile; auth/api/guards; db migration |
| P3.5 VNPay/MoMo và callback/webhook có xác minh | Sau backend/order/payment model; signature, idempotency, reconciliation/refund; không thay bằng việc hiển thị QR | XL | Cao: tài chính | Payment service/schema; Checkout/OrderManager/History; config bí mật server |
| P3.6 Email xác nhận đơn | Cần backend/outbox/provider, retry/idempotency/template; không gửi mail trong audit | L | Trung bình | Order workflow/backend; notification schema/templates/config |
| P3.7 Deploy frontend/backend/database online | Sau bảo mật và API env; SPA fallback, HTTPS/CORS, secrets, persistent storage/backup/monitoring | L–XL | Cao | Vite/api config, hosting/CI/backend/db/docs |
| P3.8 Logging, audit trail, giao dịch và CI | Stock/payment/order events, actor/requestId, backup/restore, observability, E2E và CI bảo vệ các luồng P0 | L–XL | Cao | Backend logs/transactions; schema audit/events; tests/CI |

## Gợi ý thứ tự chọn công việc

1. Bảo toàn product khi sửa (P0.1), vì thao tác hiện tại đụng trực tiếp 274 variants.
2. Checkout/giá/tồn và hủy/hoàn kho (P0.2–P0.4) cùng kiểm chứng fixture, chốt giới hạn json-server.
3. Variant snapshot, state/payment/ID và review (P1.1–P1.3/P1.6), đồng thời sửa đường Wishlist/Compare.
4. Sau đó chọn QR/payment filter, báo cáo và UI; chỉ mở IMEI/bảo hành sau khi có định danh máy/SKU và lịch sử kho ổn định.

Nếu mục tiêu tiếp theo là triển khai công khai, P0.5 và backend auth/transaction phải được ưu tiên trước công việc mở rộng giao diện. Nếu vẫn là demo cục bộ, có thể chọn phạm vi nhỏ phù hợp đồ án nhưng phải giữ rõ các giới hạn đã ghi nhận.

## Đối chiếu toàn bộ backlog người dùng

| Nhóm backlog gốc | Vị trí trong roadmap |
|---|---|
| Tồn variant, IMEI, bảo hành | P1.1, P3.1, P3.2 |
| Check tồn/không âm, chống hoàn kho lặp, đồng bộ order/payment/stock | P0.2–P0.4, P1.2 |
| Ngừng bán thay xóa; khóa user thay xóa | Đã có UI status/khóa; củng cố P1.1/P1.5/P0.5, không khôi phục nút delete |
| Kiểm transition, kiểm giá/dữ liệu checkout | P1.2, P0.2 |
| Wishlist account, banner, upload | P2.1–P2.3 |
| Revenue nâng cao, Excel/PDF, bestseller, date range | P2.4–P2.6 |
| Search specs, shipping, timeline, staff permissions, pagination | P2.7–P2.11 |
| Email | P3.6 |
| Backend/SQL/auth/password hash | P3.3–P3.4 và rủi ro P0.5 |
| Gateway/callback có xác minh, deploy | P3.5, P3.7 |
| Automated tests, transactions/logging/audit | P1.9, P0.3–P0.4, P3.8 |

Mỗi lần sửa cần cập nhật tài liệu tương ứng, chạy kiểm tra phù hợp và báo phần còn chưa kiểm chứng; không nâng trạng thái Implemented chỉ vì build pass.
