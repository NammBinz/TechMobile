# TechMobile — kiểm thử website ngày 17/10/2026

## Phạm vi và cách kiểm tra

- Dùng Chrome headless thật qua CDP, chạy React/Vite thật và API runner hiện hành.
- Truy cập website đang chạy ở `http://localhost:5173`: trang chủ, danh sách và một trang chi tiết; chỉ đọc dữ liệu công khai, không đăng nhập hoặc thao tác ghi trên phiên này.
- Các thao tác đăng ký, sửa hồ sơ, mua/hủy/giao đơn, nhập kho, bảo hành, quản trị đều chạy trên API fixture trong bộ nhớ và Vite ở cổng động riêng. Không cài dependency mới, chạy migration hoặc sửa mã ứng dụng trong đợt kiểm tra này.
- Bổ sung kịch bản `scripts/full-ui-cases.cjs`, gọi qua `npm.cmd run test:ui -- --full`. `npm.cmd run test:ui` vẫn chạy bộ smoke hiện có.
- Có kiểm tra domain/HTTP riêng, build và ESLint toàn dự án. Việc một ca đạt chỉ áp dụng cho dữ liệu/bước kiểm tra được ghi nhận; không suy ra mọi trường hợp đều đúng.

## Kết quả thực tế

- Domain/HTTP: **22/22 đạt**.
- UI smoke IMEI/kho/đơn/bảo hành hiện có: đạt.
- UI mở rộng: **29/32 nhóm đạt**, 3 nhóm lỗi ứng dụng đã tái hiện lại; không còn lỗi selector/timing của harness trong kết quả cuối.
- Uncaught JavaScript exceptions trong các luồng đã chạy: **0**. Các lỗi logic/UI phía dưới vẫn tồn tại dù không gây uncaught exception.
- Build: đạt; chunk JS khoảng 817 kB, cảnh báo >500 kB.
- ESLint: **30 errors, 5 warnings baseline**; hai file kiểm thử bổ sung/chỉnh sửa không có lỗi/warning.
- Lượt full cuối: 2026-10-17T09:56:51.939Z đến 2026-10-17T09:57:53.552Z (UTC; giờ Việt Nam cộng 7).

| # | Nhóm tình huống trên trình duyệt | Kết quả |
|---|---|---|
| 1 | Website đang chạy: trang chủ, danh sách, chi tiết và ảnh công khai (chỉ đọc) | Đạt |
| 2 | Tất cả route quản trị render được với admin | Đạt |
| 3 | Trang chủ, giỏ/yêu thích/so sánh rỗng, chi tiết không tồn tại | Không đạt |
| 4 | Đăng ký: chặn mật khẩu không khớp và tạo khách hàng | Đạt |
| 5 | Đăng ký trùng username/email bị từ chối | Đạt |
| 6 | Hồ sơ: lưu thông tin, đổi mật khẩu, đăng xuất và đăng nhập lại | Đạt |
| 7 | Đăng nhập sai mật khẩu và tài khoản bị khóa bị từ chối | Đạt |
| 8 | Tìm kiếm navbar, lọc hãng/giá, sắp xếp và xóa lọc | Đạt |
| 9 | Yêu thích: thêm từ card, xem, dẫn chọn phiên bản và bỏ yêu thích | Đạt |
| 10 | So sánh: thêm 3 sản phẩm, mở modal và xem bảng thông số | Đạt |
| 11 | So sánh: xóa trên trang phải đồng bộ panel nổi | Không đạt |
| 12 | Giỏ hàng: tách hai phiên bản, tăng/giảm số lượng và xóa dòng | Đạt |
| 13 | Checkout: mã sai/ngừng, mã phần trăm/số tiền, BANK và snapshot giảm giá | Đạt |
| 14 | BANK: admin đánh dấu thanh toán thủ công; tìm/lọc đơn và hóa đơn | Đạt |
| 15 | Khách hủy pending có lý do, hoàn số máy đúng một lần | Đạt |
| 16 | Admin hủy shipping, nhận máy về quarantine và kiểm tra đưa về khả dụng | Đạt |
| 17 | Đánh giá sau completed, hiển thị công khai và chống gửi trùng | Đạt |
| 18 | Danh mục: thêm và sửa qua giao diện | Đạt |
| 19 | Mã giảm giá: thêm, sửa, ngừng/kích hoạt và chống trùng | Đạt |
| 20 | Tài khoản: thêm, sửa, khóa và mở khóa | Đạt |
| 21 | Nhân sự: thêm nhân viên, sửa, khóa và mở khóa | Đạt |
| 22 | Sản phẩm: thêm/sửa/ngừng/bán lại và bảo toàn phiên bản | Đạt |
| 23 | Dashboard: biểu đồ, số liệu và xuất CSV doanh thu | Đạt |
| 24 | Phân quyền staff: các màn hình cho phép, chặn route/API chỉ admin | Đạt |
| 25 | Khách: chặn trang admin, IMEI tồn kho và đơn/bảo hành của khách khác | Đạt |
| 26 | Responsive khách hàng và admin ở 390/768/1280px | Đạt |
| 27 | Phiên bị khóa: API thu hồi quyền, chuyển về login và giữ giỏ hàng | Đạt |
| 28 | Chi tiết: chọn được phiên bản khác RAM khi cùng màu và dung lượng | Không đạt |
| 29 | Nhập IMEI: từ chối trùng và sai checksum, không tăng tồn | Đạt |
| 30 | Bảo hành: tra cứu IMEI/mã đơn và chặn phiếu mở trùng | Đạt |
| 31 | Giỏ cũ thiếu phiên bản bị chặn trước khi đặt đơn | Đạt |
| 32 | Checkout kiểm lại tồn khi máy đã thuộc các đơn khác | Đạt |

## Lỗi tái hiện được

### UI-01 — Không chọn được RAM khác khi cùng màu và dung lượng (ưu tiên cao)

**Bước tái hiện:** Có hai variant cùng màu Xanh, cùng 128GB nhưng RAM 12GB/16GB, mỗi variant có máy sẵn bán. Mở chi tiết sản phẩm và thử chọn bản 16GB.

**Thực tế:** Không có lựa chọn RAM 16GB. Trang chỉ có nút màu/dung lượng; `selectedVariant` dùng `find` theo color/storage nên luôn lấy variant đầu khớp. Khách không chọn mua được phiên bản RAM còn lại, và có thể thấy hết hàng khi variant đầu hết nhưng variant RAM khác còn hàng.

**Mong đợi:** Chọn được variant cụ thể theo RAM/màu/dung lượng hoặc ID, cập nhật đúng giá/ảnh/tồn/giỏ.

**Bằng chứng:** `src/pages/client/ProductDetail.jsx:166`, `:169`, `:239`, `:275`; ảnh `browser-artifacts/full-failure-28.png`. Dữ liệu hiện hành có productId `26` với ba tổ hợp màu/storage có RAM 12GB và 16GB; không thay đổi dữ liệu đó khi kiểm tra.

### UI-02 — Xóa so sánh không đồng bộ panel nổi (ưu tiên trung bình)

**Bước tái hiện:** Thêm ba sản phẩm so sánh, vào `/compare`, bấm **Xóa tất cả**.

**Thực tế:** Trang chính báo chưa chọn sản phẩm và localStorage đã rỗng, nhưng panel nổi vẫn có ba máy và nút “So sánh 3 sản phẩm”.

**Mong đợi:** Panel nổi cập nhật ngay theo danh sách mới.

**Nguyên nhân đối chiếu source:** `Compare.jsx` tự ghi/xóa localStorage, không phát `compareUpdated` như helper dùng chung. Source thao tác xóa từng sản phẩm cũng dùng đường lưu này; ca trình duyệt xác nhận trực tiếp thao tác Xóa tất cả.

**Bằng chứng:** `src/pages/client/Compare.jsx:62`, `:72`; `src/utils/shopActions.js:17`; ảnh `browser-artifacts/full-failure-11.png`.

### UI-03 — ID sản phẩm không tồn tại bị kẹt trạng thái tải (ưu tiên trung bình)

**Bước tái hiện:** Mở `/products/not-found` với ID không có trong API.

**Thực tế:** API trả 404 nhưng trang tiếp tục hiện “Đang tải sản phẩm...”, không có thông báo không tìm thấy/thử lại.

**Mong đợi:** Kết thúc trạng thái tải, thông báo không tồn tại và có đường quay về danh sách.

**Nguyên nhân đối chiếu source:** `getData` chỉ log lỗi trong catch, giữ product=null; nhánh null luôn render trạng thái tải.

**Bằng chứng:** `src/pages/client/ProductDetail.jsx:43`, `:58`, `:151`; ảnh `browser-artifacts/full-failure-3.png`.

## Kiểm tra API và dữ liệu đang dùng

- Invariant domain của db hiện hành đạt; 838 devices tương ứng 838 IMEI duy nhất, 25 orders, 20 warranties. Kiểm quan hệ tham chiếu và số lượng theo invariant hiện có.
- GET không đăng nhập `/devices`, `/devices/summary`, `/orders`, `/users` trả 401; `/db` trả 404; `/reviews?_expand=user` trả 400.
- Tồn trả qua `/products` khớp phép chiếu domain từ db trong thời điểm kiểm tra.
- SHA-256 db trước và sau các kiểm tra: `D4FC2550AECC5970878C1F19B7D114DA6513AEBDF3BB95E3662725986B9440FE`. Không ghi dữ liệu dự án từ các kịch bản kiểm thử.

## Giới hạn và phần chưa xác minh

- Chưa kiểm tra giao dịch ngân hàng thật, cổng thanh toán/webhook hoặc QR xác minh chuyển khoản; BANK hiện chỉ chọn phương thức và đánh dấu paid thủ công.
- Hóa đơn đã mở và kiểm nội dung IMEI trong trình duyệt; chưa in ra máy in giấy.
- Đã gọi nút xuất doanh thu và kiểm Blob/đuôi `.csv`, không phải `.xlsx`; chưa mở tệp bằng Microsoft Excel. Chưa xác minh số liệu kế toán với nhiều năm, hoàn tiền hoặc mọi trường hợp ngày cũ.
- Kiểm responsive qua Chrome ở 390/768/1280px với các trang chính; bộ smoke kho còn kiểm 1440×1000, 1280×600, 768×900, 390×844. Chưa kiểm mọi thiết bị, Safari/Firefox, trình đọc màn hình hoặc mọi tương tác bàn phím.
- Không có kiểm thử tải lớn/đa tiến trình, khôi phục sau mất điện, pentest hoặc xác thực production. Mật khẩu demo/plain và giới hạn một tiến trình json-server vẫn còn.
- Giới hạn tối đa ba sản phẩm so sánh, các tổ hợp lọc hiếm, mất mạng giữa mọi bước và mọi nhánh form chưa có ca trình duyệt riêng. Không coi các mục này đã được xác minh đầy đủ.

## Chạy lại

```powershell
npm.cmd test
npm.cmd run test:ui
npm.cmd run test:ui -- --full
npm.cmd run build
npm.cmd run lint
```

Chạy `--full` khi website/API ở cổng 5173/3000 đang hoạt động để có cả ca chỉ đọc website đang dùng; các ca ghi vẫn ở fixture riêng. Có thể đặt CHROME_PATH khi Chrome/Edge ở vị trí khác. Bộ full trả exit code 1 nếu tái hiện lỗi; đây là kết quả kiểm tra, không phải đã sửa lỗi ứng dụng. Artifacts JSON/ảnh/CSV ở `browser-artifacts/`, bị gitignore và chỉ dùng dữ liệu công khai hoặc fixture.
