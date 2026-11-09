# TechMobile — IMEI, tồn kho và bảo hành đã triển khai

## Lựa chọn phiên bản cập nhật 23/10/2026

Mỗi product giữ trang riêng, không gộp mẫu Plus/Ultra. Phiên bản active cùng RAM chỉ hiện dung lượng; nhiều RAM hiện RAM - dung lượng. Sắp RAM tăng trước, dung lượng tăng sau (quy đổi TB/GB); dùng cùng helper ở chi tiết, bộ lọc kho và editor. Giữ màu đang chọn nếu tổ hợp đó tồn tại; khi không tồn tại chọn màu đầu tiên của phiên bản mới để không tạo tổ hợp giả. Phiên bản/màu hết hàng vẫn chọn xem giá/thông số nhưng không mua được. Giá, tồn, thông số và cartKey/variantId lấy từ đúng variant.

Editor thêm trường RAM; API chống trùng RAM/dung lượng/màu (bỏ khoảng trắng/hoa thường, quy đổi TB), không xóa variant cũ hoặc đổi RAM/màu/dung lượng của variant có devices. RAM thiếu ở dữ liệu cũ dùng RAM product làm fallback; không migration db cho thay đổi này. Chỉnh RAM chung của sản phẩm cần bảo toàn định danh máy có sẵn.

## Bổ sung IMEI đơn hủy theo yêu cầu 23/10/2026

Chủ dự án đã yêu cầu điền IMEI cho các đơn còn thiếu, thay thế quyết định trước đó không bổ sung đơn hủy. Đã áp dụng `node scripts/backfill-order-imeis.cjs --apply` sau khi dừng API: **10 đơn, 17 dòng, 18 IMEI**. Backup: `backups/db-before-order-imei-backfill-1792731072717.json`. Khi bắt đầu thống kê có 9 đơn cũ; một đơn hủy mới phát sinh trong lúc làm được bổ sung cùng đợt. API đã khởi động lại, cần đăng nhập lại.

Đây là dữ liệu mô phỏng được bổ sung, không phải bằng chứng từng xuất giao: snapshot có `simulated=true`, `historicalOnly=true`; dòng đơn có `imeiHistorySource=demo_backfill` và thời điểm bổ sung. Máy tham chiếu riêng có `origin=demo_order_backfill`, status=retired, historicalOnly=true, không assignment. Không tính vào tồn bán, không tạo bảo hành; API chặn đưa máy lịch sử về available và UI ẩn nút đổi trạng thái. Không sửa máy đã có, snapshot đã có, trạng thái/thanh toán/giá đơn; biến thể thiếu được suy luận theo dung lượng trong dữ liệu, fallback phiên bản đầu và đánh dấu legacyVariantInferred. Không suy tạo ngày giao hoặc lịch sử phân bổ.

Script mặc định dry-run; apply lấy lock độc quyền, tạo backup trước khi ghi nguyên tử và không tự chạy khi bật server. Chạy lại không sinh thêm mã. Chỉ bổ sung dòng đơn hủy released chưa có snapshot/assignment; đơn đang xử lý phải dùng luồng phân bổ bình thường. Kiểm tra sau cập nhật: không còn dòng thiếu cả snapshot và assignment, tồn và tất cả collection ngoài orders/devices không đổi.

## Giao diện form admin 23/10/2026

- Form sản phẩm chia thông tin chung, giá/tồn, thông số và mô tả; có ảnh xem trước. Giá tổng khi sửa và tồn IMEI là trường chỉ đọc, có hướng dẫn nơi cập nhật.
- Form tài khoản/nhân sự chia liên hệ, đăng nhập, quyền/trạng thái; mật khẩu mặc định ẩn, có nút Hiện/Ẩn. Danh mục và mã giảm giá dùng cùng nhóm trường, nhãn bắt buộc và vùng lưu/hủy gọn.
- Phiên bản hiển thị dạng thẻ responsive, không phải bảng nhập quá rộng; giữ ID/metadata và API hiện có. RAM có sẵn được hiển thị cùng màu/dung lượng để phân biệt.
- Nhập IMEI và tiếp nhận bảo hành có hướng dẫn, nhãn liên kết trường; các bộ lọc dùng cùng kiểu input. Đổi trạng thái máy và xử lý phiếu bảo hành dùng hộp thoại ghi chú thay prompt trình duyệt, bắt buộc nội dung, khóa nút trong khi lưu, hỗ trợ Escape/Tab.
- Component dùng chung: `AdminFormSection`, `AdminFields`, `AdminField`, `AdminNoteModal`; CSS chỉ áp dụng trong `.admin-layout`. Không sửa dữ liệu kho hoặc chạy migration cho thay đổi giao diện.

## Tạo IMEI demo theo yêu cầu chủ dự án

Admin chọn số lượng rồi bấm **Tạo IMEI demo** để thêm mã hợp lệ vào ô nhập, giữ các mã đang có. Nút không nhập kho; bấm **Nhập kho** mới lưu máy vào đúng phiên bản đã chọn. Mỗi lần tối đa 500 máy. API `POST /devices/demo-imeis` chỉ admin, loại trùng với kho và danh sách đang soạn; kiểm trùng lại khi nhập qua transaction. Không sinh lại IMEI cũ. Máy tạo từ nút lưu `origin=demo_generated`; snapshot giao hàng giữ `simulated=true`. IMEI gõ tay vẫn kiểm checksum/trùng, origin=manual. Các mã demo là định danh mô phỏng theo yêu cầu chủ dự án, không xác minh từ nhà sản xuất.

Khi lấy source ở Git mà db vẫn thuộc schema cũ: đọc hướng dẫn migration bên dưới, chạy dry-run trên bản sao và backup trước khi áp dụng chuyển đổi demo. db đang dùng tại máy phát triển không được đưa vào commit này; không tự chạy migration khi khởi động server.

Ngày cập nhật: **23/10/2026**. Tài liệu này là quy tắc hiện hành cho các giai đoạn 2–4, thay thế phần mô tả chưa triển khai trong audit tiếp nhận. Người dùng đã duyệt triển khai và yêu cầu mới **mỗi máy đúng một IMEI**, đồng thời **cho phép sinh IMEI ngẫu nhiên cho dữ liệu demo cũ**. Không có IMEI phụ.

### Bổ sung 23/10/2026 — IMEI máy chờ trả và số đã phân bổ

- OrderManager tải máy allocated và return_pending, đối chiếu đủ orderId/orderItemId. IMEI hiện trong dòng sản phẩm từ snapshot đã xuất giao hoặc assignment hiện có, bao gồm máy chờ trả chưa có snapshot. Không lặp dấu phân cách màu/dung lượng khi dòng cũ thiếu thông tin.
- Chỉ hiện **Máy chờ nhận lại** cho đơn hủy có máy return_pending thật; panel chỉ liệt kê máy đang chờ trả và IMEI của từng máy. Nhận về từng máy chuyển quarantine; nhận hết ẩn nút. Snapshot IMEI trên dòng sản phẩm được giữ nguyên sau khi assignment được giải phóng.
- Các đơn hủy trước migration đã có inventoryState=released, không có device/snapshot/lịch sử IMEI. Chúng hiển thị **Chưa ghi nhận IMEI cho dòng đơn này**, không hiện nhầm nút chờ trả. Không tạo IMEI giả hoặc gán máy available hiện tại vào các đơn đó.
- **Đã phân bổ (chờ giao)** trên Dashboard chỉ đếm status=allocated. **Đang giao** đếm shipping; **Đã bán** đếm sold của máy đã giao thành công. Đây là các trạng thái hiện tại tách biệt, không bắt buộc có cùng số lượng và không cộng sold vào allocated.
- Kiểm tra dữ liệu ngày 23/10: 1 máy allocated thuộc đơn pending cũ (được gán từ demo_migration), 20 máy sold, không có máy return_pending; các đơn hủy cũ không có IMEI. Không sửa db hoặc chạy migration để thay đổi những số liệu này.
- Kiểm thử fixture bổ sung trong Chrome: đơn cũ thiếu IMEI không có nút chờ trả; hủy shipping hai máy thấy đủ IMEI ở sản phẩm và panel; nhận về lần lượt giữ snapshot/ẩn nút; Dashboard có allocated=2 và sold=1 độc lập. Domain test hủy/nhận lại kiểm snapshot IMEI không mất. 22/22 domain tests, Chrome smoke mở rộng và build đạt; lint giữ baseline 30 errors/5 warnings, không có lỗi mới. Kiểm thử không ghi db dự án. Hash đầu lượt đọc là D4FC2550AECC5970878C1F19B7D114DA6513AEBDF3BB95E3662725986B9440FE; cuối lượt là 8D1742EF7DF7E326E9F19ED3DE450E93A1112B694AB3693715B5E41E4D8A93F1. Trong lúc làm có thao tác create/transition claim trên phiên ứng dụng đang dùng; giữ nguyên những cập nhật này, không khôi phục file cũ. Invariant db cuối lượt vẫn đạt, số allocated=1 và sold=20 không đổi.

### Cập nhật giao diện kho và thuật ngữ 17/10

- Bộ lọc độc lập theo **Hãng → Dòng điện thoại → Phiên bản (RAM / dung lượng) → Màu**. Lọc phiên bản/màu được ngay trên nhiều dòng; đổi bộ lọc cha xóa lựa chọn con, có nút Xóa bộ lọc. Phiên bản phân biệt cả RAM để không nhập nhầm các máy cùng màu/dung lượng. Nhập kho phải chọn đúng một dòng, phiên bản và màu; quan hệ vẫn dùng productId/variantId gốc.
- Bảng tách **Màu, Dung lượng (kèm RAM), Tổng kho, Đang xử lí, Sẵn bán, Đang giao, Đã bán, Bảo hành, Chờ nhận lại, Chờ kiểm tra, Thao tác**. Cột xử lí vàng, sẵn bán xanh lá, giao xanh dương, đã bán xanh ngọc, bảo hành tím; vẫn có chữ/số để phân biệt ngoài màu sắc. Màn hình nhỏ cuộn ngang bên trong bảng.
- **Tổng kho** = available + allocated + quarantine. Không tính shipping/sold/return_pending/retired.
- **Đang xử lí** = số máy của đơn chưa gán IMEI (`unallocatedHolds`) + máy allocated. Con số không đổi khi xác nhận đơn chuyển từ chưa gán sang đã gán; giảm khi xuất giao hoặc hủy. Nhãn này thay cho “Giữ chỗ” trên UI và các thông báo; tên trường/schema và cơ chế giữ số lượng nội bộ không đổi.
- **Sẵn bán** thay cho “Có thể đặt” = available − unallocatedHolds; sản phẩm/phiên bản ngừng bán hiển thị 0.
- **Bảo hành** = số máy duy nhất có phiếu received/inspecting/repairing/ready, không đếm returned/rejected hoặc chỉ có quyền bảo hành còn hạn. Đây là chỉ số dịch vụ có thể trùng với Đã bán; không cộng vào tồn bán. Mỗi số đếm được lấy từ API bảo vệ `/devices/summary`; thêm `inStock`, `processing`, `readyToSell`, `underWarranty`, giữ các trường cũ để tương thích.
- Nút **Cách đọc số liệu kho** giải thích cách tính ngay trên trang. Danh sách IMEI vẫn theo cặp product/variant, tìm/lọc trạng thái/phân trang 20 máy; không tải toàn kho. Không thay đổi db, IMEI, giá, ID hoặc chạy migration trong đợt sửa giao diện này.
- Kiểm chứng: **22/22 Node/domain/HTTP tests**, UI Chrome fixture (lọc hãng/dòng/RAM/dung lượng/màu, reset bộ lọc, nhập đúng variant, màu cột, vòng đời số liệu/bảo hành, responsive), build pass. Lint toàn dự án còn **30 errors/5 warnings** baseline, không phát sinh lỗi mới; OrderHistory chỉ đổi câu thông báo và còn 2 errors/1 warning hooks đã có. Test dùng cổng động và dữ liệu trong bộ nhớ, không dừng API/Vite đang dùng. Build vẫn cảnh báo chunk >500 kB.

## 1. Cách chạy

```powershell
npm.cmd run server
npm.cmd run dev
```

API vẫn json-server 0.17.4 tại `http://localhost:3000`, frontend Vite tại `http://localhost:5173`. **Không dùng lại `npx json-server db.json --port 3000`**: CLI cũ bỏ qua toàn bộ kiểm tra kho/đơn/bảo hành. Runner hiện tại là `server/index.cjs`, lắng nghe loopback, sử dụng một tiến trình ghi file.

Đăng nhập lại sau khi khởi động lại API: phiên server có token ngẫu nhiên trong bộ nhớ, hạn 8 giờ. API không tin role/userId tự khai báo từ localStorage. Token hết hạn/không có được đưa về login, không xóa giỏ. Mật khẩu demo cũ vẫn giữ nguyên để tương thích; chưa có password hashing hoặc hệ thống production auth.

Trang mới:

- `/admin/devices`: admin/staff lọc hãng/dòng điện thoại/RAM-dung lượng/màu, xem bảng số liệu và mở IMEI theo phiên bản, lọc trạng thái/tìm IMEI/phân trang; chỉ admin nhập máy và đổi trạng thái kho.
- `/admin/warranties`: admin/staff tìm theo IMEI/mã đơn, xem thời hạn, tạo và xử lý phiếu.
- ProductManager có nút **Phiên bản** để thêm/chỉnh giá/ảnh/bảo hành/ngừng bán. Tồn không nhập trực tiếp nữa.
- OrderManager tự phân bổ FIFO trong cùng command khi **Xác nhận đơn**; IMEI hiển thị ngay trong dòng sản phẩm (máy allocated trước xuất giao, snapshot khi đã xuất giao). Bỏ nút Xem/Thu gọn IMEI và khối xem trùng lặp; giữ **Máy chờ nhận lại** cho đơn hủy.
- OrderHistory hiển thị máy được giao, bảo hành và các phiếu/lịch sử. Invoice hiển thị màu/dung lượng/IMEI. UI vận hành không còn nhãn Demo; origin/simulated được giữ nguyên.

## 2. Collection và định danh

Giữ sáu collection cũ, thêm bốn collection và một object metadata:

| Collection | Nội dung và nguồn chuẩn |
|---|---|
| `products[].variants[]` | Variant vẫn nhúng; quan hệ dùng cặp productId/variantId vì variant.id có thể lặp giữa sản phẩm. Thêm status/warrantyMonths. |
| `devices` | Một record/máy, id nội bộ UUID, imei string 15 chữ số đúng checksum, duy nhất ở mọi trạng thái. productId/variantId, status, assignment, origin, revision, các mốc thời gian. |
| `orders[].items[]` | ID dòng riêng, productId/variantId, snapshot tên/màu/storage/giá/ảnh, quantity, warrantyMonths, inventoryMode/inventoryState, deviceSnapshots. |
| `warranties` | Một quyền cho deviceId/orderId, liên kết orderItemId/customerId, imeiSnapshot, startsAt/endsAt/durationMonths/status/policyVersion/dateEstimated. |
| `warrantyClaims` | Một phiếu/lần tiếp nhận, warrantyId, reportedIssue, status, revision, lịch sử status/at/actorId/note. |
| `inventoryOperations` | operationId, actorId, action, fingerprint, committedAt, kết quả để trả lại khi retry. Không có endpoint công khai đọc collection này. |
| `inventoryMeta` | schemaVersion=2, thời điểm và chính sách migration demo, chỉ dẫn dữ liệu được sinh/suy luận. |

Ví dụ máy (IMEI là placeholder, không phải record để import):

```json
{
  "id": "device-uuid",
  "imei": "<15_CHU_SO_IMEI>",
  "productId": "product-id",
  "variantId": "variant-id",
  "status": "allocated",
  "origin": "manual",
  "assignment": {
    "orderId": "order-id",
    "orderItemId": "line-id",
    "customerId": "customer-id",
    "allocatedAt": "2026-10-16T03:00:00.000Z",
    "allocatedBy": "staff-id"
  },
  "revision": 1
}
```

Không tạo máy thứ hai cho một IMEI khác của cùng thiết bị. Không có chức năng sửa IMEI của máy đã nhập; không có xóa cứng máy/sản phẩm/đơn.

## 3. Tồn chuẩn và giữ chỗ

Tồn của variant = số `devices.status=available` trừ lượng giữ chỗ chưa gán IMEI trong các dòng đơn `held/allocated` còn hiệu lực. Số giữ chỗ chưa gán = quantity của dòng trừ số máy allocated cho dòng đó.

`GET /products` và `/products/:id` bổ sung `variants[].quantity` bằng phép tính này; tổng product.quantity chỉ cộng variant đang bán. Giá card là giá thấp nhất của variant đang bán, hiển thị “Từ”; sửa giá sản phẩm hiện có qua editor Phiên bản. Các quantity cũ trong file được giữ để bảo toàn dữ liệu nhưng **không được dùng làm nguồn cập nhật**. REST ghi quantity từ client bị bỏ qua; domain từ chối giao dịch nếu tồn tính ra âm. Dashboard sử dụng dữ liệu tính lại và hiển thị số máy phân bổ/đang giao/chờ nhận lại, số variant ít/hết hàng.

Ví dụ có 5 máy: đặt 2 → giữ chỗ 2, có thể bán thêm 3. Phân bổ 2 IMEI → còn 3 máy available, giữ chỗ chưa gán 0, vẫn bán thêm 3. Không trừ tồn lần thứ hai khi phân bổ hoặc giao.

Card/related/Wishlist/Compare dẫn tới Detail để khách chọn đúng variant. Detail áp dụng giá/ảnh/RAM/storage/tồn của variant, không fallback một tổ hợp không hợp lệ. Giỏ phân biệt cặp product/variant, refresh giá/tồn khi mở; giỏ legacy thiếu variant yêu cầu chọn lại, không tự đoán thay khách.

## 4. Lệnh và luồng đơn

Mọi thao tác domain đi qua `POST /commands/:action`, với token Bearer và header `Idempotency-Key`. API kiểm quyền từ phiên, trạng thái mới nhất và expectedRevision. Lệnh conflict trả 409; payload sai trả 400; thiếu phiên 401; thiếu quyền 403.

| action | Điều kiện và tác động |
|---|---|
| receive-device | Admin; kiểm variant, checksum/IMEI trùng trong lô và toàn db; nhận toàn lô hoặc không nhận gì. Máy available. |
| device-status | Admin; available/quarantine/retired; bắt buộc lý do và revision; không đổi trực tiếp máy đã phân bổ/bán. |
| place | Khách đã đăng nhập; validate số nguyên dương, variant đang bán, giá/coupon/tồn mới nhất; tạo pending và giữ chỗ cùng một snapshot. |
| allocate | Admin/staff, pending/confirmed; chọn danh sách deviceIds đúng dòng/variant, không trùng/không vượt quantity; không lấy máy đã gán đơn khác. Có thể thay hoặc giải phóng trước giao. |
| transition | pending→confirmed→shipping→delivered do admin/staff; shipping chỉ khi đủ IMEI. delivered→completed chỉ chính khách mua xác nhận. |
| payment | Admin/staff đổi paid/unpaid cho BANK chưa hủy; COD paid cùng bước khách completed. |
| cancel | Khách chỉ pending; admin/staff đơn chưa completed; lý do bắt buộc; gọi lại không hoàn kho thêm. |
| accept-return | Admin/staff ghi nhận từng máy return_pending đã về; chuyển quarantine, không bán ngay, void quyền bảo hành của lần bán bị hủy. |
| create-claim | Admin/staff, quyền issued đang trong hạn, có nội dung; chặn phiếu đang mở trùng máy. |
| transition-claim | Admin/staff; revision và bước xử lý hợp lệ; bắt buộc ghi chú, lưu lịch sử. |

device.assignment là nguồn chuẩn của phân bổ hiện hành. deviceSnapshots chỉ ghi khi shipping (hoặc migration lịch sử đã bán); bảo toàn IMEI trên đơn/invoice sau các thay đổi khác.

**Chốt luồng bán lại 23/10/2026:** một IMEI có thể xuất hiện trong snapshot của nhiều đơn lịch sử, nhưng chỉ có một assignment hiện hành. Đơn A đã shipping rồi hủy giữ snapshot vĩnh viễn; máy phải qua return_pending → quarantine → available trước khi gán cho đơn B. Đơn B delivered/completed giữ cùng IMEI, máy sold không được phân bổ hoặc đưa về available bằng lệnh đổi trạng thái. Bảo hành tra theo cả deviceId và orderId, thuộc khách của lần bán thành công; quyền của đơn hủy suspended khi chờ trả và void khi nhận lại. Retry hủy/nhận của đơn A không được giải phóng máy đang thuộc đơn B. Admin và lịch sử khách có giải thích IMEI lịch sử trên đơn hủy. Không gán ngược IMEI vào đơn cũ thiếu snapshot.

Hủy trước xuất giao: release hold và máy allocated về available. Hủy shipping/delivered: máy return_pending, không bán lại cho tới khi nhận về quarantine và admin kiểm tra chuyển available. Đơn paid bị hủy giữ nguyên thông tin paid để không che lịch sử thu tiền; hoàn tiền chưa tích hợp. Không có tự hoàn thành sau ba ngày, tự hết hạn pending hay giao nhiều đợt.

## 5. Bảo hành

Khi chuyển delivered, máy sold và quyền bảo hành được tạo một lần theo chính sách snapshot của dòng đơn. Mặc định 12 tháng, chỉnh được 1–120 tháng/variant. Mốc hết hạn cộng tháng theo UTC, chặn về ngày cuối tháng khi cần; còn hạn khi startsAt <= hiện tại < endsAt. status stored issued/suspended/void, nhãn còn hạn/hết hạn tính theo thời gian.

Khách completed không kích hoạt thêm lần nữa. Bảo hành/sửa chữa không chuyển máy sold về available. Phiếu có các bước received→inspecting→repairing→ready→returned, hoặc rejected từ received/inspecting. Một máy chỉ có một phiếu đang mở, giữ mọi phiếu đã đóng. Phiếu hợp lệ lúc nhận được tiếp tục xử lý sau ngày hết hạn.

Chưa có đổi máy, thay main/đổi IMEI, chi phí sửa ngoài hạn hoặc hoàn tiền tự động. Không sửa đơn/IMEI lịch sử để mô phỏng đổi máy.

## 6. Migration demo đã được người dùng cho phép

```powershell
npm.cmd run migrate:imei
npm.cmd run migrate:imei -- --apply
```

Mặc định dry-run; apply từ chối khi có lock server, tạo backup trước, rồi ghi snapshot. schemaVersion=2 khiến lần chạy lại chỉ kiểm invariant, không tạo thêm máy. Không chạy CLI json-server cũ đồng thời hoặc sửa tay db khi API đang hoạt động.

Kết quả áp dụng ngày 16/10/2026:

- **838 IMEI duy nhất**: 819 available, 1 allocated cho đơn pending, 18 sold.
- Giữ tổng tồn khả dụng cũ **819**; phân bố round-robin qua variants trong từng product. **9 variants không có máy khả dụng** vì số tồn product không đủ phủ mọi variant; không tự tăng tồn.
- Sinh thêm máy mô phỏng cho 19 đơn vị thuộc các đơn chưa hủy, vì chúng đã được trừ khỏi tồn cũ; không trừ lần nữa. Đơn hủy không tạo thêm máy bán hoặc cộng kho lần nữa.
- **18 quyền bảo hành** cho máy delivered/completed. Dùng deliveredAt/completedAt nếu có, nếu thiếu dùng createdAt và đánh dấu dateEstimated.
- **19 dòng đơn được suy luận variant**: match dung lượng trong tên hoặc variant đầu. Lưu legacyVariantInferred=true. Giá/tổng tiền/snapshot gốc không đổi.
- IMEI demo có origin=demo_migration, snapshot simulated=true và nhãn Demo trên giao diện. Số ngẫu nhiên có checksum không phải IMEI được xác minh từ máy thực tế hoặc GSMA.
- Đã đối chiếu đệ quy backup với db sau migration: tất cả giá trị có trước, ID, mảng variants/orders/reviews/users/coupons được giữ nguyên, chỉ bổ sung trường/collection.
- Backup tại `backups/db-before-imei-1792126070006.json`, bị gitignore. Chứa dữ liệu gốc, không chia sẻ công khai.

Đây là mô phỏng theo yêu cầu mới của người dùng, thay thế yêu cầu trước đó không sinh IMEI. Không áp dụng giả định này cho dữ liệu cửa hàng thật.

## 7. Lưu trữ, concurrency và bảo mật

`server/store.cjs` serialize các lệnh qua một Promise queue; kiểm invariant trên draft; ghi cùng snapshot gồm order/device/warranty/operation vào file tạm, fsync, rename, rồi mới publish state trong bộ nhớ. Lỗi writer không thay state. Lệnh retry giữ operationId; client giữ mã thao tác chưa rõ kết quả trong sessionStorage qua reload, không lưu payload vào key.

Runner tạo db.json.lock để ngăn hai runner cùng ghi. Nếu crash để lại lock, phải kiểm tra chắc chắn tiến trình cũ đã dừng trước khi bỏ lock. Không tự xóa lock còn hoạt động. Rename/file lock không biến json-server thành database ACID; vẫn cần backup và không hỗ trợ multi-process/đa máy.

API chặn /db, các REST write trực tiếp vào devices/orders/warranties/claims và DELETE. Sửa product bảo toàn variants/specs, không xóa/đổi màu-storage variant đã có máy; REST user/category/coupon hiện có vẫn được kiểm quyền và ghi qua store. Review được server kiểm ownership/completed/trùng/rating và cập nhật aggregate trong cùng snapshot.

GET devices chỉ staff/admin. Khách GET orders/warranties/claims chỉ nhận bản ghi thuộc mình. Staff xem users ở dạng không password; admin quản lý tài khoản theo chức năng demo cũ. Phiên chưa có HTTPS, password hashing, rate limiting hoặc cơ chế xác thực production; chỉ phục vụ demo loopback.

## 8. Kiểm tra và artifact

```powershell
npm.cmd test
npm.cmd run test:ui
npm.cmd run build
npm.cmd run lint
```

Node test dùng fixture và HTTP thực; không ghi db dự án. Bao phủ migration chạy lại, bảo toàn số liệu, holds/allocate/release, mua máy cuối đồng thời, phân bổ IMEI trùng, revision, giá/coupon/số lượng, giao thiếu IMEI, COD, cancellation/returns, warranty claims, lỗi ghi, auth/ownership và chặn write bypass.

UI smoke dùng Chrome/Edge headless CDP pipe, Vite thật và API fixture **trong bộ nhớ trên cổng động riêng**, không cần dừng API/Vite đang dùng. Vite kiểm thử dùng VITE_API_URL riêng; API ứng dụng mặc định vẫn localhost:3000. Có thể đặt CHROME_PATH nếu trình duyệt ở vị trí khác. Bao phủ bộ lọc hãng/dòng/RAM-dung lượng/màu, reset, số liệu/màu cột, IMEI phân trang, nhập đúng phiên bản, tự phân bổ/giao, customer completed, invoice, phiếu và lịch sử. Đã kiểm sidebar/responsive ở 1440/1280/768/390px. Ảnh fixture tại browser-artifacts, bị gitignore. Chưa kiểm nghiệm in giấy hoặc mọi kích thước/mọi nhánh lỗi giao diện.

Kết quả hiện tại: **22/22 Node/domain/HTTP tests pass**, Chrome UI smoke pass và không có uncaught exception trong luồng kiểm tra. Build pass, có cảnh báo chunk lớn như baseline. Full lint còn **30 errors, 5 warnings** thuộc hooks/dead code cũ; không phát sinh lỗi lint mới. OrderHistory chỉ đổi câu thông báo, còn 2 errors/1 warning hooks đã tồn tại. Không coi baseline audit 34/5 hoặc kết quả kiểm thử 16/10 là số hiện tại. Các kiểm thử dùng fixture/bản sao trong thư mục tạm, không ghi `db.json` dự án; không khôi phục hoặc ghi đè các thay đổi dữ liệu từ phiên ứng dụng đang dùng.
