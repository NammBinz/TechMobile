# TechMobile — hướng dẫn làm việc trong repository

## Trạng thái hiện hành sau triển khai IMEI/bảo hành

Chủ dự án đã cho phép nút **Tạo IMEI demo** cho nhập kho mới: POST /devices/demo-imeis chỉ admin, tạo preview không ghi db; Nhập kho mới lưu với origin=demo_generated và simulated=true ở snapshot. Giữ origin=demo_migration của dữ liệu cũ. Không sinh lại máy/IMEI khi server chạy. Quyền commit/push `Update IMEI` được cấp trong yêu cầu hiện tại; giữ các thay đổi db.json/README có sẵn tại máy, không đưa dữ liệu phiên đang dùng vào commit nguồn.

Cập nhật 23/10/2026: OrderManager hiển thị IMEI từ snapshot hoặc assignment allocated/return_pending của đúng dòng đơn. Chỉ hiện Máy chờ nhận lại khi thực sự có device return_pending; nhận đủ thì ẩn nút, giữ IMEI lịch sử trên sản phẩm. Đơn hủy cũ chưa có snapshot/assignment hiển thị Chưa ghi nhận IMEI, không sinh số giả hoặc tự coi là máy cần nhận về. Dashboard tách Đã phân bổ (chờ giao) khỏi Đã bán; không cộng sold vào allocated. Một máy allocated hiện hành là dữ liệu migration của đơn pending, không phải máy đã bán.

Kiểm thử tổng thể 17/10: xem [docs/TEST_REPORT_2026-10-17.md](docs/TEST_REPORT_2026-10-17.md). `npm.cmd run test:ui -- --full` thêm 32 nhóm kiểm tra, có ca chỉ đọc website đang chạy 5173/3000; mọi thao tác ghi vẫn dùng fixture cổng riêng. Kết quả 29/32 đạt, 3 lỗi đã tái hiện và chưa sửa: ProductDetail không phân biệt RAM khi cùng màu/storage, Compare xóa không phát compareUpdated nên panel nổi cũ, ProductDetail 404 kẹt loading. Bộ domain 22/22 và smoke hiện có vẫn đạt; full trả exit 1 khi còn lỗi. Không coi smoke pass là toàn bộ chức năng đã hoàn chỉnh; không tự sửa lỗi từ yêu cầu chỉ kiểm thử.

UI OrderManager: không có nút Xem/Thu gọn IMEI riêng. Hiển thị IMEI trong dòng sản phẩm, dùng assignment máy allocated cho đơn chưa xuất giao và deviceSnapshots khi đã xuất giao; giữ nút Máy chờ nhận lại của đơn hủy. Không bỏ luồng accept-return khi giản lược giao diện đơn.

Quy ước UI kho mới 17/10: lọc hãng/dòng điện thoại/phiên bản RAM-dung lượng/màu; luôn phân biệt RAM khi cùng màu/storage. “Đang xử lí” thay nhãn “Giữ chỗ” trên UI/thông báo, đếm unallocatedHolds + allocated; “Sẵn bán” thay “Có thể đặt” (inactive hiển thị 0). Tổng kho = available + allocated + quarantine; Bảo hành = máy duy nhất có claim received/inspecting/repairing/ready, không tính quyền còn hạn hoặc phiếu đã đóng; chỉ số này có thể trùng Đã bán. Không đổi schema giữ số lượng nội bộ. API summary bổ sung inStock/processing/readyToSell/underWarranty, giữ fields cũ. Bảng có màu theo trạng thái và giải thích cách tính. Kiểm chứng cập nhật: 22 Node tests + UI Chrome + build pass; lint baseline 30 errors/5 warnings, không có lỗi mới.

Cập nhật 17/10/2026: `pending → confirmed` tự phân bổ đủ toàn bộ dòng trong cùng command/store transaction, FIFO receivedAt rồi ID (ngày thiếu xếp cuối), giữ máy đã gán hợp lệ, không trừ kho lần hai; thiếu một dòng không ghi gì. Retry giữ idempotency/revision. `assignmentHistory` trên devices lưu nối tiếp phân bổ/giải phóng/nhận lại cho thao tác mới, không suy tạo lịch sử cũ. API allocate vẫn giữ để tương thích, thay máy confirmed phải đủ quantity; UI OrderManager hiển thị IMEI trong dòng sản phẩm. Không còn nhãn Demo trên UI; tuyệt đối giữ origin/simulated/IMEI cũ. Devices có summary được bảo vệ và danh sách đúng cặp product/variant, lọc/tìm/phân trang 20 máy; không tải toàn kho vào trang này. Sidebar sticky dùng offset chiều cao navbar thực tế, menu mobile thu gọn. Không đổi db hoặc migration trong đợt này.

Đọc [docs/IMEI_WARRANTY.md](docs/IMEI_WARRANTY.md) trước khi sửa kho, đơn hoặc bảo hành. Người dùng đã duyệt giai đoạn 2–4 và yêu cầu mỗi máy **đúng một IMEI**, không có IMEI phụ. Người dùng đã cho phép sinh IMEI ngẫu nhiên cho dữ liệu demo cũ; migration đã áp dụng, backup ở `backups/`, không sinh lại khi server chạy. Không mặc định áp dụng quyền tạo dữ liệu giả này cho tác vụ/dữ liệu thật sau này.

Chạy API bằng `npm.cmd run server` (runner `server/index.cjs`), **không chạy CLI json-server cũ**. Tồn chuẩn là devices + giữ chỗ order items, product/variant.quantity trên API là phép tính, không PATCH cộng/trừ quantity. Ghi IMEI/đơn/bảo hành qua `/commands/:action` với token, Idempotency-Key và expectedRevision. Mọi máy chỉ phân bổ cho một dòng đơn, đủ IMEI mới shipping; hủy sau gửi hàng phải nhận về quarantine trước khi bán lại. Một warranty cho mỗi máy/lần bán, nhiều claim có lịch sử. Không xóa dữ liệu lịch sử hoặc bỏ lock khi tiến trình server còn chạy.

Có phiên đăng nhập server trong bộ nhớ (8 giờ, đăng nhập lại sau restart), kiểm ownership và role cho dữ liệu mới; password demo cũ chưa hash. `npm.cmd test` chạy kiểm thử domain/HTTP fixture; `npm.cmd run test:ui` chạy Chrome/Edge headless với API fixture trên cổng động riêng, không ghi db dự án, không dừng server đang dùng. Frontend hỗ trợ VITE_API_URL cho API riêng, mặc định vẫn localhost:3000. Kết quả 17/10: 21 Node tests + UI smoke + build pass; full lint 30 errors/5 warnings cũ, file sửa mới sạch lint. Thêm `npm.cmd run migrate:imei` để dry-run; chỉ dùng `-- --apply` khi được yêu cầu migration. Những mô tả audit dưới đây và trong năm tài liệu ban đầu là snapshot trước triển khai; ưu tiên tài liệu IMEI hiện hành khi có khác biệt.

## Mục tiêu và phạm vi

TechMobile là đồ án website bán điện thoại và quản lý cửa hàng, ưu tiên demo hoàn chỉnh, dễ hiểu và dễ bảo trì. Giữ React + Vite và json-server hiện tại trừ khi người dùng yêu cầu thay đổi. Source code thực tế là bằng chứng triển khai; README và backlog chỉ là ngữ cảnh.

Đọc tài liệu liên quan trước khi sửa:

- [Tổng quan, module, route và dữ liệu](docs/PROJECT_OVERVIEW.md).
- [Danh mục chức năng và mức kiểm chứng](docs/FEATURE_INVENTORY.md).
- [Quy tắc nghiệp vụ hiện tại và mong muốn](docs/BUSINESS_RULES.md).
- [Audit kỹ thuật và bằng chứng](docs/TECHNICAL_AUDIT.md).
- [Backlog theo mức ưu tiên](docs/ROADMAP.md).

Audit tiếp nhận ngày 16/10/2026 chỉ tạo tài liệu. Các vấn đề trong audit chưa được sửa. Không coi các tài liệu này là yêu cầu triển khai backlog.

## Công nghệ và vị trí mã

- React 19, Vite 8, React Router DOM 7; JSX/JavaScript ES modules.
- Axios instance tại `src/services/api.js`, base URL hiện là `http://localhost:3000`.
- json-server 0.17.4, dữ liệu `db.json`; không có backend xác thực riêng.
- Bootstrap + `src/assets/css/style.css` + `product-detail.css`; Recharts, React Icons.
- Pages tại `src/pages/client`, `src/pages/admin`; component dùng chung tại `src/components`.
- Dùng lại helpers trong `src/utils/shopActions.js`, `auth.js`, `formatPrice.js`.
- `src/services/productService.js` là component cũ không được import, không phải service API chuẩn.

## Quy tắc nghiệp vụ phải giữ khi được yêu cầu phát triển

- Luồng mục tiêu: `pending → confirmed → shipping → delivered → completed`; khách xác nhận nhận hàng tại `delivered`. Admin không trực tiếp hoàn thành; không tự hoàn thành sau ba ngày.
- Khách chỉ hủy `pending`; admin/staff hủy đơn chưa hoàn thành/chưa hủy. Bắt buộc lý do. Hoàn kho đúng một lần. Hiện code chưa đảm bảo tính nguyên tử và chống xử lý lặp.
- Không xóa thật lịch sử đơn hàng. Ngừng bán/bán lại sản phẩm bằng `status`; khóa/mở tài khoản, bảo toàn quan hệ.
- Sản phẩm inactive/hết hàng không được đặt mua mới. Kiểm tra lại dữ liệu tại checkout; phân biệt productId, variantId, cartKey. Không gộp các biến thể sai.
- Giữ snapshot mặt hàng trong đơn; việc sửa sản phẩm không được làm mất variants/thông số. Audit đã phát hiện `PUT` hiện có thể mất dữ liệu.
- Đơn COD mới `unpaid`; khi khách xác nhận nhận hàng chuyển `completed`, `paid`, lưu thời điểm/người xác nhận.
- BANK chỉ cập nhật paid thủ công sau kiểm tra giao dịch. Code hiện chưa có VietQR; không mô tả QR là xác thực giao dịch tự động. Không tự thêm cổng thanh toán/webhook.
- Review mục tiêu chỉ cho người mua của đơn completed, chống trùng theo user/order/product; code hiện mới kiểm soát một phần phía trình duyệt.
- Phân quyền hiện ở giao diện: admin/staff dùng dashboard/products/orders; categories/users/staffs/coupons chỉ admin. Không coi localStorage/ProtectedRoute là bảo mật API.
- cart/compareList/wishlist hiện dùng chung một trình duyệt, chưa gắn tài khoản. Không tự di trú/xóa storage khi chưa xác định phạm vi.

## Quy ước code và giao diện

- Theo phong cách file hiện có: function components, hooks, dấu nháy đơn, không thêm framework/state manager/dependency khi không cần.
- Tái sử dụng API instance, component, helpers và CSS; tránh sao chép logic giỏ hàng/so sánh/thông số/trạng thái.
- Kiểm tra kiểu ID thực tế trước khi so sánh; dữ liệu cũ có một order.id và một item.productId là number, phần lớn là string. Không tự đổi schema hàng loạt.
- Giữ giao diện hiện có: navbar pill/avatar, tim cạnh RatingStars bên phải, toast trên giữa, mini panels bên phải, compare modal overlay, badges và responsive.
- Không tự đổi màu, typography, bố cục đang hoạt động tốt. CSS có nhiều lớp ghi đè; kiểm tra cascade và Bootstrap trước khi thêm selector.

## Chạy và kiểm tra

Chạy hai terminal tại repository:

```powershell
npm.cmd run server
npm.cmd run dev
```

API mặc định cổng 3000, Vite thường cổng 5173. Dùng json-server cục bộ theo lockfile; không cần cài global phiên bản khác. `npm.cmd install` chỉ khi cần và được phép tải dependency; không nâng phiên bản ngoài phạm vi.

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd run preview
```

Chưa có script test hoặc bộ kiểm thử tự động. Baseline audit: build pass kèm cảnh báo chunk >500 kB; lint có 34 errors, 5 warnings. Lỗi lint không đồng nghĩa toàn bộ là lỗi runtime. Không dùng `--fix` khi chỉ được yêu cầu audit. Kiểm chứng nghiệp vụ cần dùng dữ liệu giả/bản sao, không chạy thao tác ghi vào `db.json` quan trọng.

## Quy trình phối hợp và điều không tự ý làm

1. Đọc `AGENTS.md`, tài liệu liên quan và code thật; xác định yêu cầu cùng file tác động.
2. Với thay đổi phức tạp, trình bày kế hoạch ngắn trước khi làm; tiếp tục trong phạm vi đã được yêu cầu.
3. Giữ tính năng đang tốt; hạn chế file/dependency mới. Không viết lại project hoặc đổi kiến trúc/công nghệ khi chưa được yêu cầu.
4. Không tự triển khai backlog, tự sửa lỗi nghiệp vụ trong một yêu cầu chỉ đọc/audit.
5. Không ghi đè dữ liệu mẫu, xóa dữ liệu, reset Git, tự commit/push. Giữ các thay đổi có sẵn của người dùng; README đã có thay đổi trước audit.
6. Không đọc/hiển thị giá trị `.env`, credentials, token hoặc dữ liệu cá nhân không cần thiết. Khi audit db chỉ xuất schema/thống kê; không sao chép thông tin tài khoản vào tài liệu.
7. Sau thay đổi được yêu cầu, chạy kiểm tra phù hợp, cập nhật tài liệu khi ảnh hưởng dữ liệu/nghiệp vụ; báo file đã sửa, kết quả và hạn chế còn lại bằng tiếng Việt.
8. Khi chỉ được yêu cầu tiếp nhận: hoàn tất tài liệu và báo cáo rồi chờ yêu cầu phát triển tiếp theo.
