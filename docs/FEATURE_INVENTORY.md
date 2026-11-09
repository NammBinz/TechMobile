# TechMobile — đối chiếu chức năng

**06/11 — toàn bộ mã quản lý:** sau yêu cầu tiếp theo đã chuẩn hóa 345 ID và quan hệ, cấp mới string 13 chữ số, giữ alias/giỏ cũ/cache idempotency. UUID kỹ thuật và IMEI giữ nguyên. [Bằng chứng và backup](ENTITY_CODES_2026-11-06.md), 47 domain/HTTP + Chrome migration fixture + build đạt.

**06/11 — mã đơn:** đã chuẩn hóa 29 mã đơn thành string 13 chữ số (đổi 6 UUID + một mã number 1, giữ 22 mã cũ), cấp mã mới chống trùng và giữ alias/quan hệ/cache retry. 43 domain/HTTP, Chrome và full 32/32, build đạt. [Mapping, backup và danh sách định dạng ID khác](ORDER_CODES_2026-11-06.md). Chưa đổi ID các thực thể ngoài đơn hàng.

**06/11/2026:** import .xlsx/CSV admin-only có xem trước lỗi theo dòng, IMEI Text/giá vốn/SKU/trùng; áp dụng vào phiếu nháp rồi xác nhận nguyên tử. Đã cập nhật giá có nguồn cho 129 SKU (127 giá đổi), giữ 145 SKU chưa khớp; fake vốn một lần theo yêu cầu 80–90% giá bán trước cập nhật cho 841 máy/23 snapshot thiếu. Không fake nhập mới. [Nguồn, backup và kiểm chứng](IMPORT_AND_PRICES_2026-11-06.md): 39 domain/HTTP, Chrome nhập Excel thật và full 32/32 đạt.

**02/11/2026:** đã triển khai ba phần được duyệt: nhà cung cấp/phiếu nhập/giá vốn, timeline đơn/hồ sơ IMEI và Dashboard tổng hợp có lọc ngày/năm/CSV. Quyền giá vốn/lợi nhuận chỉ admin; dữ liệu cũ thiếu giữ rõ unknown, không sinh giá. [Phạm vi và schema](OPERATIONS_REPORTING.md), [kiểm chứng 34 domain/HTTP và UI](TEST_REPORT_2026-11-02.md). Full 31/32 do nhóm đọc website thật chưa có server, 31 nhóm fixture đạt. Những kết quả cũ bên dưới giữ nguyên theo thời điểm.

**Kết quả mới nhất A–E 23/10:** lựa chọn phiên bản theo RAM/dung lượng, xem hết hàng nhưng chặn mua, giữ màu hợp lệ; editor có RAM, API chặn trùng tổ hợp và bảo vệ SKU đã có máy. Đã sửa 404 kẹt tải và đồng bộ Compare/panel. **27/27 domain/HTTP, 32/32 UI mở rộng và Chrome smoke/build đạt**; lint 29 errors/5 warnings cũ còn lại. Không sửa db trong lượt này. Các ghi chú 29/32 và ba lỗi dưới đây thuộc trước lần sửa; xem TEST_REPORT_2026-10-23.md.

Kiểm chứng đợt IMEI demo/form admin: **23/23 domain/API**, Chrome smoke đạt, **29/32 UI mở rộng** (ba lỗi cũ giữ nguyên), build đạt; lint baseline 30 errors/5 warnings. Xem [báo cáo 23/10](TEST_REPORT_2026-10-23.md).

**Cập nhật 23/10/2026:** có nút **Tạo IMEI demo** trong trang kho, chọn số lượng để tạo mã hợp lệ không trùng rồi bấm **Nhập kho** mới lưu. Giữ provenance `demo_generated`, không sinh lại dữ liệu cũ. Form admin được chia nhóm, đồng bộ nhãn/trường bắt buộc, ảnh xem trước, mật khẩu ẩn/hiện, thẻ phiên bản responsive và hộp thoại ghi chú cho máy/phiếu bảo hành. Xem [thiết kế hiện hành](IMEI_WARRANTY.md). Commit phần IMEI: `8aca7e4 — Update IMEI` đã push trước khi chỉnh form; không đưa db đang dùng vào commit.

**Kiểm thử tổng thể 17/10/2026:** đã trực tiếp mở website đang chạy (chỉ đọc trang công khai), kiểm invariant/API thật và chạy các thao tác ghi qua Chrome + API fixture riêng. **22/22 domain/HTTP tests**, smoke IMEI và build đạt; **29/32 nhóm UI mở rộng đạt**, 3 lỗi còn tồn tại: chi tiết không chọn được RAM khác cùng màu/storage, xóa so sánh không đồng bộ panel nổi, ID sản phẩm không tồn tại kẹt trạng thái tải. Không sửa mã ứng dụng hoặc db trong đợt kiểm tra. Xem [báo cáo, ma trận và bước tái hiện](TEST_REPORT_2026-10-17.md). Các trạng thái audit cũ bên dưới cần đọc cùng kết quả này; không khẳng định mọi tính năng đã hoàn chỉnh.

**Bổ sung giao diện kho 17/10/2026:** bộ lọc hãng/dòng điện thoại/phiên bản RAM-dung lượng/màu; tách cột màu/dung lượng; số liệu Tổng kho, Đang xử lí, Sẵn bán, Đang giao, Đã bán, Bảo hành đang mở và nhận lại/kiểm tra, tô màu cột trạng thái. Thuật ngữ “Giữ chỗ” không còn trên UI/thông báo. Bảo hành đếm máy có phiếu đang mở; có hướng dẫn trên trang. **22 Node/HTTP tests + Chrome UI + build pass**, lint giữ baseline 30 errors/5 warnings. Không chạy migration hoặc ghi db dự án trong quá trình sửa/kiểm thử.

**Cập nhật 17/10/2026:** đã kiểm chứng tự phân bổ FIFO nguyên tử khi xác nhận (giữ phân bổ cũ, nhiều dòng, thiếu hàng rollback, concurrent/retry), bỏ nhãn Demo nhưng giữ metadata, bảng tồn theo phiên bản với danh sách IMEI phân trang/lọc/tìm qua API bảo vệ. Sidebar sticky theo navbar thực tế; Chrome đã kiểm desktop/laptop/tablet/mobile và chuyển route. 21 domain/HTTP tests + UI smoke + build pass; lint còn 30 errors/5 warnings cũ. Chi tiết và giới hạn ở [IMEI_WARRANTY.md](IMEI_WARRANTY.md); dữ liệu dự án không thay đổi trong đợt này.

**Cập nhật triển khai 16/10/2026:** bảng audit A/B bên dưới là snapshot tiếp nhận. Đối với các hàng đã thay đổi, ưu tiên bảng này và [IMEI_WARRANTY.md](IMEI_WARRANTY.md). “Implemented” ở đây dựa trên kiểm thử domain/HTTP và luồng Chrome headless fixture đã chạy, không chỉ build.

| Feature | Status | File liên quan | API/Data | Ghi chú |
|---|---|---|---|---|
| Một máy một IMEI, tra cứu/nhập kho/lọc | Implemented | DeviceManager, server/domain.cjs | devices; receive-device/device-status | Không có IMEI phụ; nhập trùng bị từ chối toàn lô; Chrome đã thử nhập kho. |
| Tồn theo variant, giữ chỗ, chống phân bổ/bán trùng | Implemented | domain/store, Detail/Cart/Checkout | devices + orders.items | Test concurrent máy cuối, trùng IMEI, bảo toàn tồn khi allocate. |
| A07–A11, A24–A25: chọn variant và đường mua hàng | Implemented | Detail/Cart/Checkout/Card/Wishlist/Compare/shopActions | place command | Card/Wishlist/Compare dẫn chọn variant; Chrome đã mua từ Detail qua Cart/Checkout. Chưa E2E mọi entry point. |
| A16–A18, B19–B22: hủy/giao/nhận/IMEI hóa đơn | Implemented | OrderManager/History/Invoice/Allocation | cancel/transition/accept-return | Domain test hủy/nhận lại; Chrome đã phân bổ/giao/customer COD completed/invoice. |
| B09–B10: bảo toàn dữ liệu và sửa variant | Implemented | ProductManager/VariantEditor/server | products REST guarded | HTTP kiểm PUT không mất variant; Chrome sửa giá variant. |
| IMEI và bảo hành trong lịch sử khách | Implemented | OrderDevices/OrderHistory | warranties/claims theo ownership | Chrome customer xem IMEI, thời hạn, phiếu. |
| Tra cứu hạn, tiếp nhận và xử lý bảo hành | Implemented | WarrantyManager/domain | warranties/warrantyClaims | Chuỗi nhận/kiểm tra/sửa/sẵn sàng/trả, chống phiếu mở trùng. |
| Migration IMEI demo dữ liệu cũ | Implemented | scripts/migrate-imei.cjs | devices/warranties/metadata | Đã apply, backup; 838 IMEI, 18 warranty, bảo toàn dữ liệu gốc; lặp lại không đổi. |
| Xác thực và quyền API cần cho tính năng | Partial | server/index.cjs, Login/Register/Profile/api/auth | token phiên 8 giờ | Ownership/role server có test; còn password plain demo, không production auth. |
| Đổi máy/IMEI do thay main, hoàn tiền | Not implemented | — | — | Giữ ngoài phạm vi nhận/sửa/trả máy hiện tại. |

Snapshot **16/10/2026**. Mỗi hàng A/B tương ứng một mục trong yêu cầu tiếp nhận. Đường dẫn ngắn trong cột file nằm dưới `src/` trừ khi ghi khác.

## Cách đọc trạng thái

- **Implemented**: có code/luồng và bằng chứng chạy được trong phạm vi ghi chú.
- **Partial**: có triển khai nhưng thiếu logic/tích hợp hoặc có lỗi đã xác định.
- **Not implemented**: không tìm thấy triển khai trong source hiện tại.
- **Needs verification**: code đã được đọc và truy vết, chưa chạy đầy đủ chức năng qua trình duyệt/API. Đây không phải kết luận tính năng bị thiếu.

Không có kiểm thử E2E hoặc xác nhận responsive/in giấy trong đợt này. Build pass không chứng minh chức năng nghiệp vụ hoạt động. Kiểm chứng cô lập dùng handler/helper thật với mock API/storage và fixture, không ghi vào db demo. Các mã Fxx trỏ tới [TECHNICAL_AUDIT](TECHNICAL_AUDIT.md).

## A. Khách hàng

| Feature | Status | File liên quan | API/Data | Ghi chú |
|---|---|---|---|---|
| A01. Trang chủ, banner quảng cáo | Needs verification | pages/client/Home.jsx; ProductList.jsx | GET products; ảnh hero; promo tĩnh | Có hero/link hãng và banner clickable ở list; chưa xác minh render browser. Không có banner API. |
| A02. Danh sách điện thoại | Needs verification | pages/client/ProductList.jsx; components/ProductCard.jsx | GET products | Có active filter, grid, empty state; Home/related không lọc active giống list. |
| A03. Tìm kiếm theo tên | Needs verification | components/Header.jsx; pages/client/ProductList.jsx | query search; name/brand | Header encode query; list search không phân biệt hoa thường, có cả hãng. |
| A04. Lọc thương hiệu, giá | Needs verification | pages/client/ProductList.jsx | brand; price | Tabs hãng hardcode, bốn khoảng giá; không dùng categories API. |
| A05. Sắp xếp sản phẩm | Partial | pages/client/ProductList.jsx | price/rating/reviews | Giá/sao/lượt review có code; tab Bán chạy chỉ sort reviews, chưa tính số bán. F16. |
| A06. Chi tiết sản phẩm | Partial | pages/client/ProductDetail.jsx | GET products/:id, products | Có specs/related/reviews; 404/network lỗi mắc ở Đang tải, không reset dữ liệu khi đổi id. F13. |
| A07. Chọn màu/dung lượng, đổi giá/ảnh | Partial | pages/client/ProductDetail.jsx:169 | product.variants | Có cartKey riêng, giá/ảnh thay đổi; RAM/specs vẫn từ product gốc, không quản lý tồn variant. Tổ hợp thiếu fallback product gốc; db hiện đủ tổ hợp. F07. |
| A08. Thêm vào giỏ | Partial | utils/shopActions.js; ProductCard; ProductDetail; Wishlist; Compare | localStorage.cart | Helper đã chạy xác nhận tách cartKey; Wishlist mất quantity/variant; Compare dùng đường gộp theo id riêng. F06/F08. |
| A09. Giỏ hàng mini | Partial | components/FloatingPanels.jsx | cart; cartUpdated/storage | Có tổng/xóa/tiết kiệm, ẩn đúng nhóm trang đã khai báo. React key dùng item.id trùng khi nhiều variant; chưa kiểm tra UI. F15. |
| A10. Giỏ chính, số lượng, xóa | Partial | pages/client/Cart.jsx | cart; saveCart | Có +/- min 1, remove/clear confirm; giới hạn quantity snapshot từng dòng, không đồng bộ mới/multi-tab. F03/F12. |
| A11. Checkout và đặt hàng | Partial | pages/client/Checkout.jsx:118 | GET products/:id, POST orders, PATCH products | Handler thật đã kiểm chứng có thể âm kho, dùng giá cũ, tạo đơn dở dang; chưa có transaction/submit lock. F02–F04. |
| A12. Mã giảm phần trăm/số tiền | Partial | Checkout.jsx; admin/CouponManager.jsx | GET coupons; order.coupon snapshot | Có hai công thức, amount cap tổng; chỉ kiểm tra active lúc apply, không kiểm tra lại trước submit; không expiry/usage/min-order. F04. |
| A13. COD | Partial | Checkout.jsx; OrderHistory.jsx:144 | unpaid→paid khi completed; paidAt/paidBy | Nhánh xử lý có đủ; dữ liệu cũ có 7 completed thiếu paymentStatus; chưa E2E xác nhận nhận hàng. F10. |
| A14. VietQR cho BANK | Not implemented | Checkout.jsx toàn file; api.js | Chỉ paymentMethod=BANK | Không có QR URL/component, thông tin tài khoản hoặc nội dung chuyển khoản lưu vào order. F09. |
| A15. Lịch sử đơn | Needs verification | pages/client/OrderHistory.jsx:34 | GET orders; userId strict | Có lọc user và reverse array; tải toàn đơn về browser, chưa server authorization. F01. |
| A16. Khách hủy đơn kèm lý do | Partial | OrderHistory.jsx:94,109 | PATCH products, orders.cancel* | UI/open modal chỉ pending, trim lý do; submit không re-fetch/guard trạng thái, hoàn kho lặp đã kiểm chứng. F05. |
| A17. Khách xác nhận nhận hàng | Needs verification | OrderHistory.jsx:144 | PATCH completed/completedAt; COD paid | Guard delivered trên object đã tải; chưa kiểm chứng đồng bộ nhiều phiên/đổi trạng thái từ server. BANK có thể completed khi chưa paid. F10. |
| A18. Xem/in hóa đơn | Partial | components/OrderInvoiceModal.jsx; style.css print | order/items snapshot; window.print | Có modal và lệnh in; chưa in browser, thiếu nhãn delivered/variant/color; productDiscount mới không được checkout lưu. F15. |
| A19. Đánh giá sau completed | Partial | OrderHistory.jsx:181,226; ProductReviews.jsx | POST reviews, GET reviews, PATCH products | Nút chỉ ở completed, check trùng local; submit không kiểm tra lại ownership/status server, không unique/atomic cập nhật rating. F11. |
| A20. Đăng ký/nhập/xuất | Needs verification | Register.jsx; Login.jsx; Header.jsx; utils/auth.js | users; currentUser | Đủ các handler demo; chưa chạy browser. Plain password/client role không phải auth an toàn. F01. |
| A21. Hồ sơ/đổi mật khẩu | Partial | Profile.jsx; Header.jsx | GET users/user, PUT user; currentUser | Có sửa và kiểm tra email/password >=6; không password cũ, Header không subscribe cập nhật tên; phiên blocked không bị thu hồi. F01/F12. |
| A22. Wishlist trong trình duyệt | Implemented | utils/shopActions.js:104 | wishlist; wishlistUpdated | Đã chạy toggle/get và snapshot helper; UI page chưa E2E. Phạm vi chỉ localStorage chung origin, chưa theo tài khoản. |
| A23. Tim trên Card và Detail | Partial | ProductCard.jsx:25; ProductDetail.jsx:21 | isInWishlist/toggleWishlistProduct | Đúng vị trí cạnh sao trên card; không nghe wishlistUpdated nên các card đã mount có thể lệch trạng thái. F12. |
| A24. Wishlist thêm giỏ/so sánh/bỏ tim | Partial | Wishlist.jsx; shopActions.js:137 | wishlist→cart/compareList | Có nút; snapshot thiếu quantity, color/variant/full specs làm thao tác thêm/so sánh không đủ dữ liệu. Đã kiểm chứng mất trường. F06. |
| A25. Compare panel và modal | Partial | FloatingPanels.jsx; Compare.jsx; shopActions.js | compareList; compareUpdated | Helper giới hạn 3, modal cần >=2; page riêng không emit khi remove/clear, add cart theo id; không đồng bộ với panel. F08. |
| A26. Cuộn lên đầu khi chuyển trang | Needs verification | components/ScrollToTop.jsx; main/App | pathname; window.scrollTo | Có effect smooth theo pathname, không theo query; cần browser xác nhận. |

## B. Quản trị viên và nhân viên

| Feature | Status | File liên quan | API/Data | Ghi chú |
|---|---|---|---|---|
| B01. Dashboard | Needs verification | pages/admin/Dashboard.jsx | GET products/users/orders | Có layout, stats/chart/tables; chưa render browser. |
| B02. Tổng sản phẩm/tài khoản/đơn/doanh thu | Partial | Dashboard.jsx:82 | products.length/users.length/orders.length; completed sum | Counts có code; doanh thu chỉ dựa completed, chưa đối chiếu paid, dữ liệu cũ thiếu paymentStatus. F10/F16. |
| B03. Chart doanh thu theo tháng | Partial | Dashboard.jsx:107 | createdAt dd/MM/yyyy; completed | Cộng T1–T12 của mọi năm, không lọc năm; dùng ngày tạo, không ngày thu tiền. F16. |
| B04. Chart trạng thái đơn | Needs verification | Dashboard.jsx | 6 status counts; PieChart | Có đủ sáu trạng thái và màu; chưa browser. |
| B05. Thống kê customer/staff/admin | Needs verification | Dashboard.jsx | users.role | Filter counts client-side. |
| B06. Cảnh báo hết/sắp hết | Needs verification | Dashboard.jsx; ProductManager.jsx | quantity<=0, 0<quantity<=5 | Chỉ tồn product, chưa variant; không lọc inactive trong dashboard. |
| B07. Đơn gần đây | Needs verification | Dashboard.jsx:105 | reverse orders, slice 0..5 | Theo thứ tự array, không sort ngày; chưa kiểm tra trường hợp import dữ liệu sai thứ tự. |
| B08. Xuất CSV mở Excel | Needs verification | Dashboard.jsx:194 | completed, Blob, BOM, delimiter ; | Có download .csv, không phải .xlsx. Escape dấu nháy, chưa neutralize formula; chưa mở file bằng Excel. F16. |
| B09. Quản lý sản phẩm | Partial | ProductManager.jsx | GET/POST/PUT/PATCH products | Có tìm/lọc/form/status; chỉnh sửa làm mất variants và ghi đè specs. F02. |
| B10. Thêm/sửa/cập nhật sản phẩm | Partial | ProductManager.jsx:99,175 | productData; PUT products/:id | Không có form variants, validation số yếu; PUT omission được xác minh bằng json-server in-memory. F02/F14. |
| B11. Ngừng bán/bán lại thay xóa | Needs verification | ProductManager.jsx:206,226 | PATCH status inactive/active | Có nút và handler, không DELETE products; checkout kiểm tra lại active. Compare vẫn add cart inactive nhưng checkout chặn. |
| B12. Quản lý danh mục | Needs verification | CategoryManager.jsx | GET/POST/PUT categories; GET products | Có thêm/sửa/count; nút delete comment, guard có trong handler cũ. |
| B13. Tài khoản khách hàng | Partial | UserManager.jsx | GET/POST/PUT/PATCH users | Thực tế quản lý mọi role; khóa/mở có, createdAt bị bỏ khi PUT; admin có thể đổi role/status bằng form. F14. |
| B14. Nhân sự | Partial | StaffManager.jsx | users filtered admin/staff | Có form/khóa/mở; PUT mất createdAt, gần trùng UserManager; không phân quyền chi tiết. F14/F17. |
| B15. Phân quyền ba vai trò | Partial | App.jsx; ProtectedRoute.jsx; AdminSidebar.jsx | currentUser.role | Route/menu có role guard, API không bảo vệ, blocked session vẫn dùng được. F01. |
| B16. Quản lý đơn hàng | Partial | OrderManager.jsx | GET/PATCH orders, products | Có next-step/cancel/invoice/payment; chưa server state machine/atomicity. F05/F10. |
| B17. Tìm kiếm/lọc đơn | Needs verification | OrderManager.jsx:172 | id/customerName/receiverName/phone, status | Có search + sáu trạng thái, reset; chưa browser. |
| B18. Lọc trạng thái thanh toán | Not implemented | OrderManager.jsx | Không payment filter state | Select thanh toán trên từng đơn là chỉnh dữ liệu, không phải bộ lọc. |
| B19. Cập nhật trạng thái đơn | Partial | OrderManager.jsx:49–148; OrderHistory.jsx:144 | PATCH status/deliveredAt/completedAt | UI đi đúng pending→confirmed→shipping→delivered; handler giao xong không tự guard trạng thái mới nhất; completed handler cũ không có nút gọi. |
| B20. Admin hủy kèm lý do | Partial | OrderManager.jsx:91,101 | cancelReason/cancelledBy/cancelledAt | Nút disabled completed/cancelled, submit chỉ check lý do; staff cũng dùng và ghi cancelledBy=admin. F05. |
| B21. Hoàn kho khi hủy | Partial | OrderHistory.jsx:120; OrderManager.jsx:112 | GET/PATCH product.quantity trước PATCH cancelled | Có hoàn số lượng product; không đúng-một-lần/transaction, không variant. Handler hủy chạy hai lần đã xác nhận cộng hai lần. F05. |
| B22. Xem hóa đơn | Partial | OrderManager.jsx; OrderInvoiceModal.jsx | order/items | Modal dùng chung; thiếu biến thể và nhãn delivered. F15. |
| B23. Mã giảm giá | Needs verification | CouponManager.jsx | coupons | Có percent/amount, duplicate check, active/inactive; nút delete comment. Chưa E2E CRUD. |
| B24. Đánh dấu BANK paid thủ công | Needs verification | OrderManager.jsx:194 | paymentStatus, paidAt, paidBy | COD bị disabled; non-COD được đổi cả paid↔unpaid, kể cả cancelled; không xác thực giao dịch ngân hàng. F10. |

## C–E. Quy trình, dữ liệu và các khoảng trống đối chiếu

| Feature | Status | File liên quan | API/Data | Ghi chú |
|---|---|---|---|---|
| Khách chỉ mở hủy pending, có lý do | Partial | OrderHistory.jsx | order.status/cancel* | Guard trước mở modal, thiếu kiểm tra lại khi submit. |
| Admin không có nút completed/xóa đơn | Implemented | OrderManager.jsx | Không có UI gọi hai handler cũ | Đã đối chiếu toàn JSX; đây là xác nhận cấu trúc UI, không cam kết API cấm thao tác. |
| Không tự hoàn thành sau ba ngày | Implemented | Toàn src, nhất là OrderHistory/OrderManager | Không timer/cron theo đơn | Không tìm thấy luồng auto-complete; setTimeout hiện tại chỉ toast/chuyển trang. |
| Giữ lịch sử đơn, snapshot tên/giá/ảnh | Partial | Checkout.jsx; OrderInvoiceModal.jsx | orders.items | Có snapshot cơ bản, thiếu color/variant; UI không DELETE order, API vẫn CRUD. |
| Chỉ hoàn kho một lần | Partial | Hai cancellation handlers | quantity, status | Có hoàn nhưng thiếu cơ chế chống lặp. |
| Lưu nội dung chuyển khoản/QR | Not implemented | Checkout.jsx | Không transferContent/QR | BANK chỉ option, không có thông tin giao dịch. |
| Không tự xác nhận BANK khi hiện QR | Implemented | Checkout.jsx; OrderManager.jsx | unpaid khi tạo; paid thủ công | Không có QR và không có tự xác thực BANK; không diễn giải thành gateway. |
| Tồn kho từng màu/dung lượng | Not implemented | db.json; ProductDetail/ProductManager | quantity chỉ ở product | Không variants.quantity hoặc API stock movement. |
| Chặn inactive khi truy cập detail/checkout | Partial | ProductDetail.jsx; Checkout.jsx; Compare.jsx | status | Detail vẫn xem được nhưng nút mua chính disabled; checkout chặn mới; Compare bypass add-cart guard. |
| Cart luôn phân biệt biến thể | Partial | shopActions.js; Compare.jsx | cartKey / id | Helper phân biệt được, Compare/Wishlist và dòng mua trực tiếp từ card chưa thống nhất định danh. |
| Wishlist theo tài khoản | Not implemented | shopActions.js; auth.js | key wishlist chung origin | Không userId/key namespace/backend wishlist. |
| IMEI/bảo hành theo máy | Not implemented | db.json/toàn src | Không collection/route | Nội dung bảo hành/trả góp trên UI là tĩnh. |

Danh sách backlog đầy đủ được nhóm theo độ ưu tiên, độ phức tạp và file ảnh hưởng trong [ROADMAP](ROADMAP.md). Không có mục backlog nào được triển khai trong lần tiếp nhận.
