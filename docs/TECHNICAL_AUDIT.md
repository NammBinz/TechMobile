# TechMobile — audit kỹ thuật

**Kiểm chứng trình duyệt 17/10/2026:** [TEST_REPORT_2026-10-17.md](TEST_REPORT_2026-10-17.md) ghi 29/32 nhóm UI đạt, 3 lỗi tái hiện (chọn RAM tại Detail, đồng bộ compare panel, xử lý Detail 404), 22/22 domain/HTTP đạt, build đạt, lint baseline 30 errors/5 warnings. Đây là đợt kiểm thử, không sửa mã ứng dụng; các phát hiện tiếp nhận bên dưới vẫn là snapshot cũ.

**Tiến độ sau triển khai IMEI/bảo hành 16/10/2026:** tài liệu này giữ nguyên phát hiện/bằng chứng audit cũ để truy vết. [IMEI_WARRANTY.md](IMEI_WARRANTY.md) mô tả code và giới hạn hiện hành.

| Phát hiện cũ | Xử lý hiện tại |
|---|---|
| F02 mất variants/specs khi PUT | API merge có kiểm soát, giữ variants/specs; editor variant riêng; test HTTP và Chrome. |
| F03–F05 checkout giá/tồn, đơn dở dang, hủy lặp | Server quote/holds, command queue, draft/invariant/snapshot/idempotency/revision; không còn PATCH quantity client. Test concurrent/retry/lỗi writer. |
| F06–F08 đường mua/Wishlist/Compare thiếu variant | Dẫn tới Detail chọn variant, cart key cặp product/variant; endpoint kiểm lại. Compare sync cũ ngoài phạm vi mua vẫn cần cải thiện. |
| F01 quyền browser, F11 review | Token/ownership/role phía server; review validate/unique và aggregate cùng snapshot. Chưa hash password demo hoặc production auth. |
| F15 hóa đơn/keys/mốc ngày | Snapshot màu/storage/IMEI, line/cart keys, nhãn delivered; hiển thị mốc ISO qua helper. |
| F19 lint/bundle | Build vẫn cảnh báo chunk lớn; Node/HTTP tests và Chrome fixture pass. Full lint còn baseline hooks/dead code, không tắt rule để che lỗi. |

IMEI ngẫu nhiên được tạo theo yêu cầu mới của người dùng, chỉ dữ liệu demo, một IMEI/máy. Đã đối chiếu backup: toàn bộ giá trị có trước được giữ. Không kết luận đây là thông tin máy thực tế.

Ngày audit **16/10/2026**. Phạm vi: toàn bộ source ứng dụng, cấu hình, schema và quan hệ db, assets/CSS, build/lint/dependency cục bộ. Chỉ thêm tài liệu và AGENTS; không sửa ứng dụng, không ghi db, không commit/push. README đã được người dùng sửa trước audit và giữ nguyên.

## 1. Kết quả kiểm tra và giới hạn

| Kiểm tra | Kết quả | Phạm vi bằng chứng |
|---|---|---|
| `npm.cmd run build` | PASS, exit 0 | Vite 8.0.14, 675 modules, build 1,28s; không thấy lỗi import/export ở graph đang dùng |
| Bundle | WARNING | JS 788,39 kB, gzip 227,20 kB; CSS 286,80 kB, gzip 41,29 kB; chunk JS >500 kB |
| `npm.cmd run lint` | FAIL, exit 1 | 34 errors, 5 warnings; không chạy --fix |
| ESLint API tổng hợp | Cùng 34/5 | Dùng để lấy danh sách gọn vì output CLI dài; không thay config |
| `npm.cmd ls --depth=0` | PASS, exit 0 | Không có missing/invalid dependency cấp trực tiếp trong output |
| Test suite hiện có | Không có | package.json không có script test; không tìm thấy file test trong source được kiểm kê |
| Kiểm chứng helper/handler cô lập | PASS cho các khẳng định bên dưới | Source helper/handler thật; API/storage fixture trong bộ nhớ, không phải E2E browser |
| Schema/FK/assets | Hoàn tất thống kê | Không xuất mật khẩu, tên khách, email, phone, địa chỉ hoặc nội dung đơn/review |
| Browser, responsive, in hóa đơn, Excel | Chưa kiểm chứng | Không có Playwright/Puppeteer cục bộ; không cài thêm; không khẳng định đã chạy UI |
| Ngân hàng/QR | Không có triển khai để kiểm thử | BANK hiện chỉ là option và cập nhật thủ công |
| CVE/network/deploy | Chưa kiểm tra | Không chạy npm audit hoặc tra cứu mạng; không suy ra dependency an toàn chỉ từ build |

Môi trường lệnh: Windows PowerShell, Node 20.20.1, npm 10.8.2. Tiến trình sandbox không khởi chạy được (`setup refresh had errors`), các lệnh đọc/build/lint được chạy bằng cơ chế cấp quyền ngoài sandbox. Không cài/nâng cấp package.

## 2. Bằng chứng kiểm chứng cô lập

Script tạm qua stdin Node, không thêm test framework/file test vào repo. Với React handler: lấy nguyên đoạn khai báo handler từ source bằng ranh giới hàm, tạo closure bằng fixture/mocks, gọi handler; không chạy JSX/effect. Với json-server: router nhận object trong bộ nhớ, listen loopback port ngẫu nhiên, gửi PUT fixture và đóng server, không dùng `db.json` làm router.

| Ca | Fixture/hành động | Kết quả quan sát |
|---|---|---|
| V01 | Helper addToCart hai cartKey khác nhau cùng product | Hai dòng riêng, đúng ở đường helper |
| V02 | toggleWishlistProduct product có quantity/variant, đọc wishlist rồi add cart | quantity/variantId/cartKey không được giữ; addToCart vẫn thêm dòng thiếu quantity |
| V03 | Checkout handler, tồn 5, hai biến thể mỗi dòng mua 4 | POST một order, tồn cuối **-3** |
| V04 | Checkout handler, giá cart 1, GET latest giá 100 | Order items giữ **giá 1**, không cảnh báo |
| V05 | Checkout handler, POST thành công, PATCH stock ném lỗi | Order đã tồn tại, cart chưa clear, không rollback |
| V06 | Cancellation handler khách với cùng snapshot gọi lại hai lần, quantity 2 | Tồn **5→7→9**; thiếu cơ chế chống lặp |
| V07 | json-server 0.17.4 PUT fixture `{name}` lên product có variants | id theo route được giữ, **variants biến mất** |

V03–V06 xác nhận nhánh logic có thể gây sai dữ liệu, không có nghĩa dữ liệu demo hiện đã bị các lỗi đó. Race giữa phiên chưa được stress-test; được đánh dấu rủi ro từ kiến trúc read/modify/write.

## 3. Các phát hiện

### F01 — P0: API và quyền chỉ được bảo vệ ở trình duyệt

**Mức bằng chứng:** xác nhận từ code/config. Login.jsx:30–45 GET toàn users và so sánh password plain; api.js:4–6 không auth header/interceptor; server script chỉ json-server. ProtectedRoute.jsx:5–14 tin currentUser.role, không hỏi server hay kiểm blocked. Profile đổi password không yêu cầu password cũ. Login snapshot loại password trước lưu storage, nên không kết luận currentUser có password.

**Tái hiện để xác minh sau:** dùng dữ liệu giả trong môi trường demo riêng, gọi collection users/CRUD không đăng nhập hoặc đổi role của currentUser trong storage rồi vào admin; khóa user sau login và kiểm tra phiên cũ. Không cần đọc/xuất credentials thật để chứng minh thiết kế.

**Tác động:** quyền route/menu không bảo vệ API/ownership, dữ liệu user/đơn bị tải toàn bộ vào browser. db.json tracked và có trường tài khoản/thông tin nhận hàng; chưa xác minh mọi giá trị đều là dữ liệu giả. Không đưa file này lên dịch vụ công khai như backend có auth thật.

**Đề xuất:** giữ giới hạn demo hiện tại rõ ràng; khi được yêu cầu xử lý, dùng backend auth/authorization/hash password, kiểm active/session/ownership tại server, tối thiểu hóa response và dữ liệu mẫu. Không tự triển khai backend trong audit.

### F02 — P0: sửa sản phẩm làm mất variants và ghi đè specs

**Bằng chứng:** ProductManager.jsx:114–153 dựng productData từ form không có variants, gán lại sáu nhóm specs bằng mặc định; :175–201 handleEdit cũng không copy variants; :157 dùng PUT. V07 xác nhận PUT của json-server cài hiện tại bỏ trường bị thiếu. **35/35 sản phẩm hiện có variants (274 biến thể)**, nên đây là đường thao tác ảnh hưởng dữ liệu đang có, không chỉ một ý tưởng tương lai.

**Tái hiện an toàn:** trên bản sao dữ liệu, chọn sản phẩm có variants, sửa tên hoặc giá rồi lưu; GET lại và so trường variants/thông số chi tiết trước/sau. Chưa chạy thao tác này trên db thật.

**Đề xuất:** bảo toàn field cũ/patch có chủ đích; tách form biến thể và specs nếu cần; fixture hồi quy bảo toàn dữ liệu. Không chỉ thay PUT→PATCH mà bỏ qua các object specs vẫn bị ghi đè.

### F03 — P0: checkout có thể âm kho và tạo đơn dở dang

**Bằng chứng:** Checkout.jsx:137–159 kiểm từng dòng riêng; :194 POST order trước, :197–204 GET/PATCH kho từng dòng. V03 có stock -3 khi mua 4+4 từ stock 5; V05 giữ order sau lỗi PATCH. Không isSubmitting/idempotency/transaction/version hoặc rollback.

**Tái hiện:** fixture stock 5, hai cartKey cùng product mỗi dòng 4; hoặc mô phỏng lỗi PATCH sau POST. Giữ db gốc nguyên vẹn. Nhiều checkout đồng thời còn có rủi ro ghi đè/lost update giữa GET và PATCH, chưa đo runtime nhiều phiên.

**Đề xuất:** cộng số lượng theo định danh tồn đúng, kiểm số nguyên dương và giá/tồn mới nhất, chặn submit lặp. Để bảo đảm đồng thời cần giao dịch/điều kiện cập nhật ở server, không chỉ tuần tự hóa client.

### F04 — P0: giá/coupon không được xác thực lại khi đặt hàng

**Bằng chứng:** Checkout.jsx:39–70 tính tổng từ cart, :165–170 ghi item.price từ snapshot dù đã GET latestProduct; V04 xác nhận giá cũ được chấp nhận. appliedCoupon chỉ kiểm active lúc apply (:88–104), không tái kiểm tra lúc submit. Không xác thực variant/price/amount ở API.

**Tái hiện:** đổi giá sản phẩm sau khi thêm giỏ hoặc giữ giá fixture thấp, submit; apply coupon rồi admin ngừng/đổi coupon trước khi đặt. Không sửa giá/DB thật trong audit.

**Đề xuất:** checkout quote/order endpoint tính giá/discount từ dữ liệu tin cậy, thông báo thay đổi giá; kiểm coupon cùng giao dịch. Không tin localStorage dù UI không cho sửa trực tiếp.

### F05 — P0: hoàn kho khi hủy không bảo đảm đúng một lần

**Bằng chứng:** OrderHistory.jsx:109–141 và OrderManager.jsx:101–135 hoàn từng product trước PATCH cancelled, không flag stockRestored/transaction ID/guard trạng thái mới nhất. V06 xác nhận gọi lại cùng snapshot cộng thêm kho lần hai. Admin chỉ disable nút UI; submit không tự check status. Khách check pending lúc mở modal nhưng không check lại lúc submit.

**Tái hiện:** trên fixture/bản sao, để hoàn kho thành công nhưng PATCH order lỗi rồi retry; hoặc hai phiên cùng giữ modal cũ. Lỗi giữa nhiều item cũng có thể hoàn dở dang. Với concurrent GET cùng giá trị, kết quả còn phụ thuộc interleaving; không khẳng định mọi double-click đều chắc chắn cộng hai lần.

**Đề xuất:** cancellation idempotent và conditional status tại server, hoàn kho cùng transaction; ghi lý do/actor/time/audit; retry trả lại kết quả cũ, không cộng tiếp.

### F06 — P1: wishlist làm mất dữ liệu cần cho giỏ/compare

**Bằng chứng:** shopActions.js:137–148 chỉ copy một số trường, thiếu quantity/variantId/cartKey/color/full specs; Wishlist.jsx:36 chuyển snapshot đó trực tiếp vào addToCart. `Number(undefined)<=0` là false, nên V02 cho thêm sản phẩm thiếu quantity. Cart so sánh `newQuantity > undefined` không giới hạn; checkout kiểm lại tồn product nhưng không sửa lại giá/biến thể.

**Tái hiện:** yêu thích biến thể từ Detail, vào Wishlist thêm giỏ; so sánh payload trước/sau và specs Compare. Không khẳng định đặt inactive thành công vì checkout vẫn kiểm active mới nhất.

**Đề xuất:** wishlist lưu id/hydrate product mới; yêu cầu chọn variant hoặc giữ định danh đúng; helper từ chối quantity/price không hợp lệ.

### F07 — P1: định danh và thông số variant chưa thống nhất

**Bằng chứng:** ProductDetail.jsx:169–186 áp dụng price/image/storage/color nhưng không variant.ram/nested specs; specs tính từ product ở :162. Storage button :298 không tìm color hợp lệ, selectedVariant không có thì fallback product gốc. Card/related mua product gốc không buộc chọn variant. Checkout items bỏ color/variantId/storage dù cart có.

**Dữ liệu/rủi ro:** snapshot hiện đủ mọi tổ hợp color×storage của từng product; không báo “tổ hợp sai hiện có trong db”. Nguy cơ hiện rõ khi thêm bộ variants thưa hoặc sửa dữ liệu sau này. Tồn theo variant chưa triển khai.

**Đề xuất:** thống nhất một hàm chọn/validate variant và snapshot order có SKU/variant/color/storage; block tổ hợp thiếu; hydrate specs đúng. Thiết kế migration trước IMEI/warranty.

### F08 — P1: Compare page lệch với helper/panel và giỏ hàng

**Bằng chứng:** Compare.jsx:61–77 ghi/remove compareList không emit compareUpdated; effect :8 chỉ đọc một lần, không nghe event. FloatingPanels/ProductCard/Detail lại nghe compareUpdated. Compare.handleAddCart :80–97 merge bằng item.id và không kiểm active/quantity/cartKey, khác helper.

**Tái hiện browser cần làm:** chọn hai sản phẩm, mở `/compare`, xóa một trên page rồi quan sát mini panel; thay đổi panel quan sát page. Thêm variant từ detail vào compare rồi mua từ page có thể tăng dòng có cùng product.id khác variant đã có trong cart. Add inactive vào cart qua Compare vẫn bị checkout chặn khi submit.

**Đề xuất:** dùng helpers thống nhất và subscription đầy đủ, hydrate dữ liệu hiện tại; quyết định rõ compare theo product, add cart theo variant.

### F09 — P1: BANK/VietQR thiếu so với mô tả

**Bằng chứng:** đọc toàn Checkout chỉ có option BANK tại :300 và paymentMethod trong newOrder. Tìm toàn src không có VietQR/QR image URL hoặc transfer content. Không có account config/webhook/API payment service.

**Tái hiện cần làm:** chọn BANK tại checkout trên browser sẽ cần xác nhận trực quan rằng không hiện vùng QR; source hiện không có nhánh render vùng này.

**Đề xuất:** khi người dùng chọn hạng mục này, thêm thông tin chuyển khoản/QR gắn định danh order và lưu nội dung; vẫn unpaid cho tới kiểm tra thủ công. Không gọi đó là cổng thanh toán tự động.

### F10 — P1: trạng thái đơn, paid và dữ liệu cũ chưa đồng bộ

**Bằng chứng:** OrderHistory.jsx:144–178 chỉ đặt paid với COD, BANK delivered/unpaid vẫn có thể completed; OrderManager.jsx:194–219 cho đổi thanh toán non-COD cả khi cancelled/completed. handleMarkDelivered không tự kiểm status mới nhất. Hủy đơn paid không xử lý refund. Trong db, 7/12 completed **thiếu** paymentStatus, không phải 7 bản ghi explicitly unpaid; 14/23 orders thiếu field này.

**Tái hiện:** fixture delivered BANK unpaid rồi xác nhận; cancelled BANK vẫn chỉnh paid; nhìn dashboard completed sum không lọc paid.

**Đề xuất:** chốt state/payment/refund invariants, server transition có điều kiện, migration có xác minh dữ liệu cũ, lưu actor cụ thể thay chuỗi admin cho cả staff.

### F11 — P1: review chống trùng/điều kiện chỉ cục bộ

**Bằng chứng:** OrderHistory.jsx:181 strict khóa user/order/product trong array reviews đã tải; :226–275 không re-fetch order ownership/status, POST review rồi PATCH aggregate riêng. UI giới hạn completed tại :468; server không enforce. ProductReviews.jsx:17 strict productId. DB có 1 item.productId number có thể tạo review numeric sau này không hiện dưới product id string nếu không chuẩn hóa.

**Hiện trạng:** 5 review không trùng và đều tham chiếu completed trong snapshot. Chưa thử concurrent review UI; nguy cơ duplicate/stale rating suy ra từ hai thao tác không atomic/unique.

**Đề xuất:** unique key + ownership/completed/rating validation server, aggregate có kiểm soát; chuẩn hóa ID tại boundary, kiểm tra retry khi POST thành công nhưng PATCH lỗi.

### F12 — P1: localStorage/state không tách tài khoản và dễ lệch

**Bằng chứng:** auth.logout chỉ remove currentUser. Keys cart/compareList/wishlist không userId. Tất cả JSON.parse trực tiếp, không xử lý malformed/shape. ProductCard :27–29 và Detail :23–26 không nghe wishlistUpdated. Cart/Checkout/Compare chỉ hydrate lúc mount. Header không subscribe khi Profile saveCurrentUser nên tên có thể cũ tới lần render sau.

**Tái hiện browser cần làm:** cùng origin login A thêm wishlist/cart, logout/login B; mở hai tab; thay wishlist trên một nơi; đặt chuỗi JSON sai cho một key ở môi trường demo riêng.

**Đề xuất:** xác định guest/account policy, safe parse/schema version, store subscription thống nhất, auth state phản ứng được. Không tự xóa storage người dùng trong audit.

### F13 — P1: thiếu loading/error/404 và xử lý request đổi route

**Bằng chứng:** ProductDetail.jsx:43 catch chỉ console.log; product null render “Đang tải”, không phân biệt 404/error. Không reset product trước fetch id mới, không AbortController/request sequence. Checkout preflight :137–159 ở ngoài try :193 nên GET lỗi không đi qua toast catch. Home/List/managers mặc định []/0 và catch console, dễ hiển thị empty như dữ liệu thật. ProductReviews lỗi mạng cũng hiện chưa có review. App không catch-all.

**Tái hiện:** API tắt/GET 404; đổi id khi request trước chưa xong; checkout sản phẩm đã xóa/GET lỗi. Không gọi “app luôn crash”: hành vi phụ thuộc page và kiểu lỗi.

**Đề xuất:** loading/error/empty riêng, request cancellation/identity, đưa preflight vào try, route 404 và retry thông báo phù hợp.

### F14 — P1: validation và form tài khoản có thể mất metadata

**Bằng chứng:** ProductManager input price/quantity thiếu min/step và logic số hữu hạn/nguyên; `product.quantity || ''` ở :196 khiến edit stock 0 thành trống. UserManager.jsx:100/StaffManager.jsx:105 PUT form không createdAt, json-server thay thế như V07 nên field bị bỏ. Toggle admin có guard nhưng edit form vẫn cho đổi role/status, không bảo vệ admin cuối cùng. Register/Profile kiểm email trùng phía client bằng strict, chưa canonical hóa hoặc unique server.

**Tái hiện trên bản sao:** edit stock 0; nhập giá/tồn âm hoặc lượng thập phân; edit user rồi xem createdAt; dùng form tự hạ quyền admin. Không thao tác trực tiếp dữ liệu demo trong audit.

**Đề xuất:** schema/validation ở boundary và server, preserve metadata, trim/canonicalize email/code, guard last-admin/self-role theo quy tắc được thống nhất.

### F15 — P2: keys, hóa đơn và chi tiết UI chưa đủ

**Bằng chứng:** FloatingPanels.jsx:227 và Checkout.jsx:333 dùng key=item.id cho nhiều cartKey; OrderManager.jsx:350 và Invoice.jsx:80 dùng productId có thể lặp các dòng variant. Invoice getStatusText :10–16 thiếu delivered. Checkout newOrder không lưu productDiscount nhưng Invoice :92 dùng field đó. Invoice chỉ hiển thị name, thiếu color/variant. `index.html` lang en; thiếu favicon.svg. Product `4` có hai variant trỏ ảnh jet-black không tồn tại.

**Tái hiện:** cart hai biến thể cùng product kiểm console key warnings; xem invoice delivered/discount/new order; chọn hai variant màu đen bị thiếu ảnh. Chưa chạy React console/UI/in giấy trong đợt này; lỗi key xác định từ cấu trúc dữ liệu/key và nguy cơ reconciliation.

**Đề xuất:** dùng cartKey/lineId snapshot cho keys, đầy đủ label và variant, giữ fields tổng tiền, bổ sung/fix đường dẫn ảnh theo yêu cầu. Không tự đổi thiết kế.

### F16 — P1/P2: báo cáo và nhãn Bán chạy khác nghĩa dữ liệu

**Bằng chứng:** Dashboard.jsx:82 sum mọi completed không paid; :107–139 chart chỉ month, bỏ year dù parse có year. CSV :194–283 nhóm month/year nhưng file .csv, không .xlsx. Escape dấu nháy chưa neutralize cell bắt đầu `=`, `+`, `-`, `@`: rủi ro spreadsheet formula injection tùy ứng dụng khi mở dữ liệu người dùng, chưa exploit trong Excel. “Gần đây” reverse array, không sort createdAt. Home featured và ProductList bestseller sort reviews, không quantity sold.

**Tái hiện:** fixture completed tháng 1 của hai năm gộp một cột T1; BANK completed unpaid được cộng revenue. Mở CSV fixture chuỗi công thức bằng môi trường kiểm tra riêng nếu cần xác minh mức ảnh hưởng.

**Đề xuất:** chốt revenue semantics, year/date-range filter và kiểu ngày chuẩn; đặt tên CSV chính xác; sanitize spreadsheet cells; aggregate best-sellers từ đơn hợp lệ.

### F17 — P2: code chết/trùng và drift nghiệp vụ

**Bằng chứng:** services/productService.js export ProductCard JSX, không có import toàn src, không phải API service, extension .js. GET specs lặp ở Detail/Compare/FloatingPanels, status text/badge lặp nhiều nơi. UserManager/StaffManager gần trùng. DELETE handlers ở Category/Coupon/User/Staff có nút đã comment; OrderManager.handleDelete và handleCompleteOrder không có UI gọi. Lint báo unused cho các handler này.

**Tác động:** dễ sửa một nhánh quên nhánh khác; đừng coi handler cũ là chức năng đang hoạt động. Build pass không xác minh module chết nếu được import lại sau này.

**Đề xuất:** sau khi được yêu cầu, gom helpers có kiểm thử nghiệp vụ, xóa code chết có kiểm chứng; không khôi phục delete/completed handler trái quy tắc.

### F18 — P2: CSS có ghi đè cụ thể và nguy cơ responsive

**Bằng chứng đã đọc toàn file:**

- style.css:1923 đặt `.right-floating-panels` top 5.4rem/width 300px/max-height với `!important`; media :2600/:3389 đổi top auto/width auto không important nên không thắng các thuộc tính đó. Đây là xung đột cascade xác định tĩnh, mức che khuất/tràn cần browser viewport xác minh.
- `.promo-btn` :144–168 có top/right/transform `!important`; media <=560 :193 đổi right/bottom nhưng không xóa top hoặc thắng important, có thể lệch vị trí trên mobile.
- `.btn-primary` :1251 đặt width 100%, padding/margin/background toàn cục, ghi đè nút Bootstrap ở mọi page. Không tự kết luận tất cả nút bị hỏng.
- `.review-count` :736 bị block :797 ghi đè font-size/color; nhiều compare/modal/panel/toast blocks và keyframes lặp. Một phần repeated selectors là media hợp lệ, không tự coi mọi sự lặp là lỗi.
- style.css:4270 có selector `quick-specs-section` thiếu `.`; rule đó chọn tag, không chọn class. product-detail.css vẫn có class nên không kết luận quick specs mất toàn bộ style.
- product-detail.css global `.product-not-found` ghi đè padding/color ở các page khác vì được import trong main. CSS chủ yếu không scope theo page.
- body.modal-open chỉ remove khi closeCompareModal. Route bị ẩn panels trong khi modal mở không reset flag/body; không có effect cleanup hoặc Escape/focus trap. Có thể giữ body locked khi điều hướng bằng history; cần kiểm browser.

**Đề xuất:** capture UI ở desktop/tablet/mobile trước sửa, kiểm cascade/computed styles, gom rule theo component và breakpoint; bảo toàn màu/font/layout yêu cầu. Không dọn CSS dựa chỉ vào scan class vì có class động/Bootstrap.

### F19 — P2: baseline lint và bundle chưa đạt chất lượng mong muốn

**Bằng chứng:** build pass nhưng entry JS 788,39 kB; App import mọi page/chart đồng bộ. Lint thất bại với bảng bên dưới. Các lỗi hooks/immutability là kết quả rule/plugin hiện cài; việc gọi const handler từ effect sau render không được tự diễn giải thành lỗi TDZ runtime ở mọi component. Không nâng package hoặc tắt rule chỉ để đổi kết quả.

**Đề xuất:** xử lý từng nhóm hooks/dependencies/dead code, cân nhắc lazy route/chunks sau khi đo; thêm bộ kiểm thử meaningful cho checkout/cancel/PUT/review khi người dùng chọn sửa. Không tự sửa baseline trong audit.

## 4. Baseline ESLint có thể đối chiếu

| Rule | Số lượng | Mức |
|---|---:|---|
| react-hooks/immutability | 16 | error |
| react-hooks/set-state-in-effect | 10 | error |
| no-unused-vars | 7 | error |
| no-useless-assignment | 1 | error |
| react-hooks/exhaustive-deps | 5 | warning |

| File dưới src | Vị trí và rule |
|---|---|
| components/FloatingPanels.jsx | 48 set-state-in-effect |
| components/ProductCard.jsx | 18,28 set-state-in-effect |
| components/ProductReviews.jsx | 9 immutability; 10 exhaustive-deps warning |
| main.jsx | 1 no-unused-vars React |
| pages/admin/CategoryManager.jsx | 16,17 immutability; 101 no-unused-vars |
| pages/admin/CouponManager.jsx | 18 immutability; 143 no-unused-vars |
| pages/admin/Dashboard.jsx | 25 immutability |
| pages/admin/OrderManager.jsx | 16 immutability; 82,152 no-unused-vars |
| pages/admin/ProductManager.jsx | 38,39 immutability |
| pages/admin/StaffManager.jsx | 23 immutability; 167 no-unused-vars |
| pages/admin/UserManager.jsx | 23 immutability; 162 no-unused-vars |
| pages/client/Cart.jsx | 10 set-state-in-effect |
| pages/client/Checkout.jsx | 26 set-state-in-effect; 37 exhaustive-deps warning |
| pages/client/Compare.jsx | 10 set-state-in-effect |
| pages/client/Home.jsx | 19 set-state-in-effect |
| pages/client/OrderHistory.jsx | 30,31 immutability; 32 exhaustive-deps warning |
| pages/client/ProductDetail.jsx | 25 set-state-in-effect; 32,33 immutability; 40 exhaustive-deps warning |
| pages/client/ProductList.jsx | 28 immutability; 33 set-state-in-effect |
| pages/client/Profile.jsx | 28 set-state-in-effect; 37 exhaustive-deps warning |
| pages/client/Wishlist.jsx | 15 immutability |
| utils/shopActions.js | 127 no-useless-assignment |

## 5. Điểm khác giữa mô tả/README và source

| Mô tả/ý định | Source hiện tại |
|---|---|
| BANK có VietQR và nội dung chuyển khoản | Chưa có; chỉ option BANK + paid thủ công |
| Có lọc trạng thái thanh toán | Không có filter, chỉ select sửa từng order |
| Hoàn kho chính xác một lần | Chưa đảm bảo, handler fixture có thể cộng hai lần |
| Tồn được kiểm an toàn | Có pre-check từng dòng, vẫn âm kho khi cộng nhiều variant/race |
| Sửa sản phẩm bảo toàn dữ liệu lâu dài | PUT bỏ variants và ghi đè specs |
| Wishlist có thể thêm giỏ/so sánh đầy đủ | Mất quantity/variant/specs; helper cho qua quantity undefined |
| Compare đồng bộ | Page riêng dùng logic/events khác panel |
| Bán chạy | Xếp theo reviews, chưa số bán |
| Xuất Excel | Thực tế CSV có thể mở bằng Excel, không .xlsx |
| README cây source | Bỏ sót Compare.jsx và services/productService.js cũ |
| API qua env/deploy | README là ví dụ; api.js vẫn hardcode localhost, chưa cấu hình deploy |
| Admin có thể hoàn thành/xóa đơn | Hai handler cũ không có nút hoạt động; UI hiện theo delivered→khách completed, không xóa đơn |
| Dữ liệu đồng nhất | ID number/string lẫn ở order/items; payment/mốc thời gian thiếu theo đời dữ liệu |

## 6. Kiểm tra sau khi chọn sửa (chưa thực hiện E2E)

1. Cart nhiều variant cùng product, đổi giá/tồn/inactive khi đang mở checkout; hai phiên đặt đồng thời; lỗi giữa POST order và PATCH kho.
2. Hủy pending bằng khách/admin đồng thời, retry sau lỗi từng item/order; xác minh tồn hoàn một lần.
3. Mua từ Card/Detail/Wishlist/Compare, giữ đúng màu/storage/giá; sửa product giữ nguyên variants/specs.
4. COD và BANK theo mọi bước; đơn BANK delivered unpaid, cancelled paid; xác nhận điều kiện revenue/refund.
5. Review completed đúng user/item, trùng nhiều tab, retry lỗi aggregate, ID numeric cũ.
6. Auth blocked giữa phiên, dữ liệu giữa tài khoản, malformed storage, sync page/panel/tim/header giữa tab.
7. Viewport 360/768/1024/1440, panel/toast/modal/keyboard, ảnh missing, invoice print nhiều trang và CSV trong Excel.

Ưu tiên và phạm vi file được ghi trong [ROADMAP](ROADMAP.md). Mọi đề xuất cần yêu cầu phát triển tiếp theo, không được tự thực hiện từ tài liệu audit này.

## 7. Danh sách class CSS đã đối chiếu

Đọc selector bằng PostCSS; đọc literals/template quasis trong AST JS/JSX bằng Espree; tách token class và bổ sung class động rating-{sm,md,lg}, compare-count-{2,3}, toast-{success,warning,info}. Danh sách tham chiếu bao gồm source cũ chưa dùng, literals trong hàm trả class và class body modal-open; không thay thế browser CSS coverage và không đảm bảo mọi token đã xuất hiện trên DOM. Danh sách ứng viên không tham chiếu chỉ phục vụ audit, chưa xóa class nào.

### style.css

266 class; 187 có token tham chiếu, 79 ứng viên không có token tham chiếu.

**Có tham chiếu:**

`active`, `admin-image-error`, `admin-image-preview`, `admin-sidebar-title`, `admin-stat-card`, `back-home-btn`, `badge`, `brand-name`, `btn`, `btn-primary`, `buy-btn`, `buy-btn-container`, `card`, `card-body`, `cart-left-column`, `cart-mini-item`, `cart-mini-panel`, `cart-product-info`, `cart-quantity-badge`, `clear-cart-btn`, `compare-action`, `compare-btn`, `compare-cell`, `compare-count-2`, `compare-count-3`, `compare-label`, `compare-mini-panel`, `compare-modal`, `compare-modal-content`, `compare-modal-layout`, `compare-modal-overlay`, `compare-product-header`, `compare-product-main`, `compare-row`, `compare-row-head`, `compare-section`, `compare-side-nav`, `compare-table`, `container`, `dashboard-status-row`, `detail-buy-btn`, `detail-price`, `detail-specs-section`, `discount-badge`, `empty-action-btn`, `empty-compare-page`, `filter-reset-btn`, `filter-select`, `footer-benefit-item`, `footer-benefits`, `footer-bottom`, `footer-brand`, `footer-column`, `footer-contact`, `footer-grid`, `footer-hotline-box`, `footer-logo-box`, `footer-logo-img`, `footer-main`, `footer-socials`, `footer-top`, `form-control`, `form-select`, `fw-bold`, `header-shell`, `home-badge`, `home-brand-card`, `home-brand-grid`, `home-brand-section`, `home-feature-section`, `home-hero`, `home-hero-actions`, `home-hero-image`, `home-primary-btn`, `home-secondary-btn`, `home-section-title`, `installment-badge`, `invoice-actions`, `invoice-header`, `invoice-info-grid`, `invoice-logo-box`, `invoice-logo-img`, `invoice-modal-box`, `invoice-modal-overlay`, `invoice-print-area`, `invoice-total-box`, `main`, `mini-action-btn`, `mini-discount`, `mini-empty`, `mini-note`, `mini-old-price`, `mini-panel`, `mini-panel-header`, `mini-panel-list`, `mini-price-row`, `mini-product-info`, `mini-product-item`, `mini-product-scroll`, `mini-remove-btn`, `mini-saving`, `mini-summary`, `modal-open`, `nav-link`, `navbar-action-pill`, `navbar-actions`, `navbar-auth-box`, `navbar-brand-box`, `navbar-brand-text`, `navbar-login-btn`, `navbar-logo-img`, `navbar-logout-btn`, `navbar-register-btn`, `navbar-search-btn`, `navbar-search-form`, `navbar-search-icon`, `navbar-search-input`, `navbar-user-avatar`, `navbar-user-card`, `navbar-user-meta`, `no-print`, `option-btn`, `out-stock-badge`, `price-row`, `product-card`, `product-count`, `product-filter-left`, `product-filter-right`, `product-filter-toolbar`, `product-grid`, `product-image`, `product-image-container`, `product-info`, `product-msrp`, `product-name`, `product-not-found`, `product-price`, `product-price-section`, `product-rating`, `product-rating-left`, `product-review-section`, `product-section`, `profile-avatar`, `profile-card`, `profile-header`, `profile-page`, `promo-badge`, `promo-banner`, `promo-banners`, `promo-blue`, `promo-btn`, `promo-content`, `promo-price`, `promo-red`, `quick-specs-section`, `rating-lg`, `rating-md`, `rating-number`, `rating-sm`, `rating-star`, `rating-stars`, `related-buy-btn`, `related-price-row`, `review-count`, `review-header`, `review-item`, `review-list`, `review-modal-box`, `review-modal-overlay`, `right-floating-panels`, `site-footer`, `site-header`, `stat-blue`, `stat-green`, `stat-label`, `stat-orange`, `stat-red`, `tab-btn`, `table`, `text-danger`, `text-muted`, `toast`, `toast-container`, `toast-info`, `toast-success`, `toast-warning`, `wishlist-rating-btn`.

**Ứng viên không tham chiếu:**

`admin-sidebar`, `ai-recommendation`, `ai-sidebar`, `auth-form`, `auth-links`, `auth-subtitle`, `brand-btn`, `brand-list`, `brand-showcase`, `cart-btn`, `cart-count`, `compare-empty`, `compare-mini-cart`, `compare-mini-header`, `compare-mini-info`, `compare-mini-item`, `compare-mini-list`, `compare-mini-remove`, `compare-modal-close`, `compare-note`, `comparison-close`, `comparison-content`, `comparison-header`, `comparison-img`, `comparison-item`, `comparison-list`, `comparison-toggle`, `comparison-tray`, `empty`, `empty-cart-page`, `empty-compare`, `filled`, `form-group`, `header`, `header-avatar`, `header-content`, `header-left`, `header-line`, `header-logo-box`, `header-logo-img`, `header-logo-text`, `header-right`, `header-user-box`, `header-user-info`, `hidden`, `location-btn`, `login-btn`, `logo`, `logout-btn`, `mini-total`, `modal-close`, `modal-content`, `modal-overlay`, `navbar-wishlist-btn`, `open`, `open-compare-btn`, `recommendation-content`, `recommendation-image`, `recommendation-info`, `recommendation-name`, `recommendation-reason`, `recommendation-score`, `remove-compare-btn`, `review-stars`, `score-dot`, `search-container`, `search-icon`, `search-input`, `section-header`, `sidebar-close`, `sidebar-content`, `sidebar-header`, `sidebar-title`, `sidebar-toggle`, `star`, `stars`, `success-message`, `user-dropdown`, `user-menu`.

### product-detail.css

37 class; 37 có token tham chiếu, 0 ứng viên không có token tham chiếu.

**Có tham chiếu:**

`active`, `breadcrumb`, `detail-action-row`, `detail-brand`, `detail-buy-btn`, `detail-compare-btn`, `detail-discount`, `detail-image-box`, `detail-info-box`, `detail-msrp`, `detail-options`, `detail-price`, `detail-price-box`, `detail-rating`, `detail-specs-section`, `detail-specs-table`, `option-btn`, `option-list`, `product-detail-main`, `product-detail-page`, `product-not-found`, `promotion-box`, `quick-specs-grid`, `quick-specs-section`, `related-buy-btn`, `related-compare-btn`, `related-discount-badge`, `related-header`, `related-image-box`, `related-info`, `related-price-row`, `related-product-card`, `related-products-grid`, `related-products-section`, `related-rating`, `spec-group-title`, `spec-row`.

**Ứng viên không tham chiếu:**

Không có.
