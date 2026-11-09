# TechMobile — hướng dẫn làm việc trong repository

Đồng bộ toàn bộ mã quản lý 06/11: xem docs/ENTITY_CODES_2026-11-06.md. Đã đổi 345 ID của users/categories/products/variants/coupons/warranties/warrantyClaims thành string 13 chữ số; orders/reviews đã đúng giữ nguyên, supplier/receipt tạo mới cũng dùng chuẩn này. server/entity-ids.cjs cấp mã; client không quyết định ID persist. Aliases theo loại entity, variant theo phạm vi product; không replace string toàn cục vì product/user/category có thể cùng mã cũ 1. Giữ legacyIds, cache result, fingerprint và replay actor alias cũ; không xóa idempotency log. Frontend giữ tương thích giỏ/wishlist/compare và file nhập/URL cũ, không xóa localStorage. UUID devices/orderItems/receiptLines/events/operationId là mã kỹ thuật nhất quán, không đổi; IMEI vẫn 15 chữ số. Phiếu nhập/bảo hành hiển thị ID đầy đủ thay slice(0,8). Backup db-before-entity-ids-1793941775488.json. API đã restart, cần đăng nhập lại. 47 tests + Chrome migration fixture + build đạt; không commit/push.

Chuẩn mã đơn 06/11: mọi đơn hiện hành dùng string 13 chữ số; nextOrderId kiểm trùng trong transaction, không dùng id() UUID khi place. Đã chuyển 7/29 đơn (6 UUID và number 1), giữ 22 mã 13 chữ số cũ; legacyIds làm alias cho URL/command cũ, không đổi ID của thực thể khác. Cập nhật FK orderId/sourceOrderId và cache order result nhưng giữ fingerprint/operationId để retry cũ vẫn an toàn. Backup db-before-order-ids-1793939727084.json. Script normalize-order-ids.cjs mặc định dry-run, không tự áp dụng lại. Xem docs/ORDER_CODES_2026-11-06.md; 43 domain/HTTP + build đạt. Không tự đổi UUID nội bộ devices/items/warranty hoặc các ID khác từ yêu cầu này.

Đợt 06/11 đã duyệt: import .xlsx/CSV chỉ admin, giữ nguyên role staff, không có nhân viên kho mới. Preview `/purchaseReceipts/import-preview` không ghi, mỗi dòng một IMEI Text/giá vốn, SKU/trùng/checksum được kiểm; còn lỗi không áp dụng một phần, tối đa 500 máy/100 nhóm. Xác nhận vẫn đi qua transaction. Giá CellphoneS đã đối chiếu: 129 SKU/18 model khớp, 127 giá đổi, 145 SKU giữ. Chủ dự án cho phép random vốn 80–90% theo mỗi model dựa giá bán trước đợt cập nhật; đã điền 841 máy và 23 snapshot thiếu, không đổi vốn đã biết, loại 18 historicalOnly. Không fake vốn tự động cho nhập mới. purchaseCostSource/costSnapshotSource là dữ liệu tài chính nội bộ, phải redact non-admin; Dashboard gắn dấu lợi nhuận ước tính khi có vốn demo. Kế hoạch riêng trong backups, audit giá public ở docs/data; Vite chặn db/backup/artifacts qua HTTP. Xem docs/IMPORT_AND_PRICES_2026-11-06.md. Backup db-before-price-cost-1793938828785.json. 39 tests + Chrome nhập CSV/XLSX thật + full 32/32 + build đạt, lint 28/5 cũ. Không commit/push.

Ba phần đã duyệt 02/11: xem `docs/OPERATIONS_REPORTING.md` và `docs/TEST_REPORT_2026-11-02.md`. Thêm suppliers/purchaseReceipts theo cách cộng thêm, không tự migration db cũ. Nhập nhanh cũng tạo phiếu trong transaction. Chỉ admin thấy/ghi giá nhập và lợi nhuận, API redact cho staff/customer kể cả snapshot trong đơn. Khi shipping lưu costSnapshot; chỉnh giá nhập không thay snapshot đã biết. set-device-cost có lý do chỉ backfill snapshot thiếu, lưu costHistory/history. Không suy giá vốn từ oldPrice, không tính thiếu giá vốn bằng 0. Báo cáo theo completedAt/paidAt, ngày Việt Nam, nguồn payment demo tách riêng; ngày thiếu không lấy createdAt thay. Timeline legacy chỉ dựng từ mốc có sẵn, không persist lịch sử giả. Hồ sơ IMEI giữ mọi lần bán/trả/claim. 34 domain/HTTP tests đạt; Chrome commerce/fixture đạt, full 31/32 vì website thật 3000/5173 chưa chạy, không coi đây là 32/32. Không commit/push hay ghi db dự án trong đợt này.

Phạm vi A–E ngày 23/10: ProductDetail chọn nhóm phiên bản RAM/dung lượng; cùng RAM ẩn RAM trên nhãn, nhiều RAM hiện cặp, sắp RAM trước rồi dung lượng (TB/GB). Giữ màu nếu có tổ hợp, fallback màu hợp lệ khi không có; hết hàng vẫn xem nhưng không mua. Editor có RAM, API chặn tổ hợp màu/RAM/dung lượng trùng và bảo vệ RAM của máy đã nhập (kể cả RAM kế thừa product). ProductDetail 404 hiện thông báo; Compare dùng helper và compareUpdated hai chiều. Không thay db hoặc migration cho A–E. Các ghi chú ba lỗi UI cũ phía dưới là snapshot trước sửa; xem báo cáo mới nhất.

Giao diện form admin 23/10: tái sử dụng `AdminFormSection`/`AdminFields` và `AdminNoteModal`, CSS trong `src/assets/css/admin-forms.css` giới hạn `.admin-layout`. Giữ liên kết label/id, trường chỉ đọc, native validation, vùng lưu/hủy và responsive. Trạng thái máy/phiếu bảo hành nhập ghi chú trong modal, không dùng prompt. Nút Tạo IMEI demo chỉ soạn mã; Nhập kho mới lưu, provenance `demo_generated` phải được giữ.

## Trạng thái hiện hành sau triển khai IMEI/bảo hành

Bổ sung theo yêu cầu mới 23/10: đã backfill 18 IMEI mô phỏng cho 10 đơn hủy thiếu mã, backup `backups/db-before-order-imei-backfill-1792731072717.json`. Đây là ngoại lệ được chủ dự án yêu cầu đối với hướng dẫn cũ không điền đơn hủy. `scripts/backfill-order-imeis.cjs` mặc định dry-run; không tự áp dụng lần nữa. Devices origin=demo_order_backfill/historicalOnly=true phải luôn retired và không assignment; tuyệt đối không cho đưa vào tồn bán. Snapshot historicalOnly và item.imeiHistorySource=demo_backfill là dữ liệu bổ sung, không được mô tả như bằng chứng đã xuất giao. Tồn và bảo hành không đổi.

Chốt bán lại 23/10: giữ deviceSnapshots của đơn đã xuất giao dù máy bán lại cho đơn khác. Assignment là hiện hành, snapshot là lịch sử; không áp unique deviceId xuyên mọi snapshot đơn. Bán lại phải nhận về quarantine và kiểm tra available; sold không phân bổ tiếp. Bảo hành gắn deviceId + orderId + khách của lần bán, không lấy quyền đơn mới hiển thị cho đơn hủy cũ. Test có cả hủy shipping/delivered, bán lại cho khách khác, retry đơn cũ không ảnh hưởng máy đã bán.

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
