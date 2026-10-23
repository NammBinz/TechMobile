// Extended browser checks. All writes target smoke-ui's isolated in-memory API.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { command, id, availability, demoImei } = require('../server/domain.cjs')

module.exports = async function fullUiChecks(context) {
  const { store, goto, fill, click, evaluate, until, screenshot, send, artifacts, apiOrigin, exceptions } = context
  const results = [], observations = [], startedAt = new Date().toISOString()
  const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))
  const poll = async (predicate, label) => { for (let i = 0; i < 80; i++) { if (predicate()) return; await pause(100) } throw Error('State timeout: ' + label) }
  const admin = store.state.users.find(u => u.role === 'admin')
  const customer = store.state.users.find(u => u.role === 'customer')
  const execute = (actor, action, payload) => store.transact(actor, id(), action, payload, db => command(db, actor, action, payload))
  const transition = (order, status) => execute(admin, 'transition', { orderId: order.id, expectedRevision: order.revision, status })
  const prepareOrder = () => execute(customer, 'place', { items: [{ productId: 'fixture', variantId: 'blue', quantity: 1 }], shipping: { receiverName: 'Fixture receiver', phone: '0000000000', address: 'Fixture address', paymentMethod: 'COD' } })
  const check = async (name, work) => {
    const index = results.length + 1
    try { await work(); results.push({ name, status: 'pass' }); console.log('FULL PASS ' + index + ': ' + name) }
    catch (error) { const artifact = 'full-failure-' + index; try { await screenshot(artifact) } catch { /* Keep failure. */ } results.push({ name, status: 'fail', error: error.message, screenshot: artifact + '.png' }); console.log('FULL FAIL ' + index + ': ' + name + ' - ' + error.message) }
  }
  const login = async (account, password = 'fixture-password') => {
    await goto('/login'); await until('!!document.querySelector("input[name=account]")', 'login form')
    await fill('input[name=account]', account); await fill('input[name=password]', password); await click('Đăng nhập')
    await until('location.pathname !== "/login"', 'login ' + account)
  }
  const domClick = selector => evaluate(`(() => {const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing '+${JSON.stringify(selector)});e.click()})()`)
  const rowClick = async (marker, label) => {
    await until(`[...document.querySelectorAll('tbody tr')].some(r=>r.innerText.includes(${JSON.stringify(marker)})&&[...r.querySelectorAll('button')].some(b=>b.textContent.trim()===${JSON.stringify(label)}&&!b.disabled))`, 'row action ' + label)
    return evaluate(`(() => {const row=[...document.querySelectorAll('tbody tr')].find(r=>r.innerText.includes(${JSON.stringify(marker)}));const button=row&&[...row.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)});if(!button)throw Error('Missing row action '+${JSON.stringify(marker + ' / ' + label)});button.click()})()`)
  }
  const orderClick = (orderId, label) => evaluate(`(() => {const card=[...document.querySelectorAll('[data-order-revision],.card')].find(r=>r.innerText.includes(${JSON.stringify(orderId)})&&[...r.querySelectorAll('button')].some(b=>b.textContent.trim()===${JSON.stringify(label)}));const b=card&&[...card.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)});if(!b||b.disabled)throw Error('Missing order action');b.click()})()`)
  const form = async values => { for (const [name, value] of Object.entries(values)) await fill(`[name="${name}"]`, String(value)) }
  const clearShopping = () => evaluate(`(() => {for(const key of ['cart','wishlist','compareList'])localStorage.removeItem(key);for(const event of ['cartUpdated','wishlistUpdated','compareUpdated'])dispatchEvent(new Event(event))})()`)
  const buy = async (color = 'Xanh') => { await goto('/products/fixture'); await until('!!document.querySelector(".detail-buy-btn:not(:disabled)")', 'buyable variant'); if (color !== 'Xanh') await click(color); await click('Mua ngay') }
  const tokenRequest = (route, method = 'GET', body) => evaluate(`(async () => {const r=await fetch(${JSON.stringify(apiOrigin + route)},{method:${JSON.stringify(method)},headers:{'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('authToken'),'Idempotency-Key':crypto.randomUUID()},${body ? 'body:JSON.stringify(' + JSON.stringify(body) + '),' : ''}});return {status:r.status,data:await r.json()}})()`)
  await store.transact(admin, id(), 'fixture-setup', {}, db => {
    db.users.push({ ...admin, id: 'staff', username: 'staff', email: 'staff@fixture.invalid', role: 'staff' })
    db.users.push({ ...customer, id: 'blocked', username: 'blocked', email: 'blocked@fixture.invalid', status: 'blocked' })
    db.coupons.push({ id: 'percent', code: 'FIX10', discountType: 'percent', discount: 10, status: 'active' }, { id: 'amount', code: 'FIX500', discountType: 'amount', discount: 500000, status: 'active' }, { id: 'off', code: 'FIXOFF', discountType: 'percent', discount: 10, status: 'inactive' })
    return { ok: true }
  })

  await check('Website đang chạy: trang chủ, danh sách, chi tiết và ảnh công khai (chỉ đọc)', async () => {
    const response = await fetch('http://localhost:3000/products'), products = await response.json()
    assert.equal(response.status, 200); assert.ok(products.length)
    for (const route of ['/', '/products', '/products/' + encodeURIComponent(products[0].id)]) {
      await send('Page.navigate', { url: 'http://localhost:5173' + route })
      await until('location.port === "5173" && !!document.querySelector("main") && document.body.innerText.includes("TechMobile")', 'live page')
      await until('!!document.querySelector(".product-card,.detail-info-box")', 'live products rendered')
      const broken = await evaluate('[...document.querySelectorAll("main img")].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.getAttribute("src"))')
      observations.push({ liveRoute: route, brokenImages: broken })
      assert.equal(broken.length, 0, 'Broken images: ' + broken.slice(0, 4).join(', '))
    }
    await screenshot('full-live-public')
  })
  await check('Tất cả route quản trị render được với admin', async () => {
    await login('admin')
    for (const route of ['/admin','/admin/products','/admin/categories','/admin/users','/admin/staffs','/admin/orders','/admin/coupons','/admin/devices','/admin/warranties']) {
      await goto(route); await until('!!document.querySelector(".admin-main h2")', route)
      assert.equal(await evaluate('location.pathname'), route)
    }
  })
  await check('Trang chủ, giỏ/yêu thích/so sánh rỗng, chi tiết không tồn tại', async () => {
    await login('customer'); await clearShopping()
    for (const [route, text] of [['/','Điện thoại chính hãng'],['/cart','Giỏ hàng'],['/wishlist','yêu thích'],['/compare','so sánh'],['/products/not-found','Không tìm thấy']]) {
      await goto(route); await until(`document.querySelector('main')?.innerText.toLowerCase().includes(${JSON.stringify(text.toLowerCase())})`, route)
    }
  })
  await check('Đăng ký: chặn mật khẩu không khớp và tạo khách hàng', async () => {
    await goto('/register'); await until('!!document.querySelector("input[name=username]")', 'register')
    await form({ fullName: 'Fixture registered', username: 'registered', email: 'registered@fixture.invalid', phone: '0000000000', address: 'Fixture address', password: 'fixture-password', confirmPassword: 'mismatch' })
    await click('Đăng ký'); assert.ok(!store.state.users.some(u => u.username === 'registered'))
    await fill('[name=confirmPassword]', 'fixture-password'); await click('Đăng ký')
    await poll(() => store.state.users.some(u => u.username === 'registered'), 'register save')
    assert.equal(store.state.users.find(u => u.username === 'registered').role, 'customer')
  })
  await check('Đăng ký trùng username/email bị từ chối', async () => {
    const count = store.state.users.length
    await goto('/register'); await until('!!document.querySelector("input[name=username]")', 'register duplicate')
    await form({ fullName: 'Fixture duplicate', username: 'registered', email: 'registered@fixture.invalid', phone: '0000000000', password: 'fixture-password', confirmPassword: 'fixture-password' }); await click('Đăng ký')
    await pause(300); assert.equal(store.state.users.length, count); assert.equal(await evaluate('location.pathname'), '/register')
  })
  await check('Hồ sơ: lưu thông tin, đổi mật khẩu, đăng xuất và đăng nhập lại', async () => {
    await login('registered'); await goto('/profile'); await until('!!document.querySelector("input[name=fullName]")', 'profile')
    await form({ fullName: 'Fixture renamed', phone: '0000000001', address: 'Fixture updated', password: 'fixture-new-password', confirmPassword: 'fixture-new-password' }); await click('Lưu thay đổi')
    await poll(() => store.state.users.some(u => u.username === 'registered' && u.fullName === 'Fixture renamed'), 'profile save')
    await click('Đăng xuất'); await until('location.pathname === "/login"', 'logout')
    await login('registered', 'fixture-new-password')
    assert.ok(await evaluate('document.querySelector(".navbar-user-card").innerText.includes("Fixture renamed")'))
  })
  await check('Đăng nhập sai mật khẩu và tài khoản bị khóa bị từ chối', async () => {
    for (const [account, password] of [['customer','wrong'],['blocked','fixture-password']]) {
      await goto('/login'); await until('!!document.querySelector("input[name=account]")', 'negative login')
      await fill('[name=account]', account); await fill('[name=password]', password); await click('Đăng nhập'); await pause(250)
      assert.equal(await evaluate('location.pathname'), '/login')
    }
  })
  await check('Tìm kiếm navbar, lọc hãng/giá, sắp xếp và xóa lọc', async () => {
    await login('customer'); await goto('/products'); await until('document.querySelectorAll(".product-card").length===3', 'catalog')
    await fill('.navbar-search-input', 'Galaxy'); await click('Tìm'); await until('document.querySelectorAll(".product-card").length===1', 'navbar search')
    assert.ok(await evaluate('document.querySelector(".product-name").innerText.includes("Galaxy")'))
    await click('Xóa lọc'); await until('document.querySelectorAll(".product-card").length===3', 'catalog reset')
    await click('Samsung'); await until('document.querySelectorAll(".product-card").length===1', 'brand tab')
    await fill('.filter-select', 'above30'); await until('document.body.innerText.includes("Không tìm thấy sản phẩm")', 'price filter')
    await click('Xóa lọc'); await fill('.filter-select:nth-of-type(2)', 'priceDesc')
    await until('document.querySelectorAll(".product-card").length===3', 'sort')
    const names = await evaluate('[...document.querySelectorAll(".product-name")].map(e=>e.innerText)')
    assert.equal(names[0], 'Fixture phone Plus')
  })
  await check('Yêu thích: thêm từ card, xem, dẫn chọn phiên bản và bỏ yêu thích', async () => {
    await clearShopping(); await goto('/products'); await until('!!document.querySelector(".wishlist-rating-btn")', 'wishlist card')
    await domClick('.product-card .wishlist-rating-btn'); await goto('/wishlist'); await until('!!document.querySelector(".wishlist-card")', 'wishlist page')
    await click('Thêm vào giỏ'); await until('location.pathname.startsWith("/products/")', 'wishlist buy selects variant')
    await goto('/wishlist'); await click('Bỏ yêu thích'); await until('!document.querySelector(".wishlist-card")', 'remove wishlist')
    assert.equal(await evaluate('JSON.parse(localStorage.getItem("wishlist")||"[]").length'), 0)
  })
  await check('So sánh: thêm 3 sản phẩm, mở modal và xem bảng thông số', async () => {
    await clearShopping(); await goto('/products'); await until('document.querySelectorAll(".product-card").length===3', 'compare cards')
    for (let i = 0; i < 3; i++) await domClick(`.product-card:nth-child(${i + 1}) .compare-btn`)
    await until('JSON.parse(localStorage.getItem("compareList")||"[]").length===3', 'compare stored')
    await domClick('.compare-action'); await until('!!document.querySelector("#compareModal")', 'compare modal')
    assert.ok(await evaluate('document.querySelectorAll("#compareModal .compare-section").length>0'))
    await goto('/compare'); await until('document.querySelectorAll(".compare-product-main").length===3', 'compare full page')
  })
  await check('So sánh: xóa trên trang phải đồng bộ panel nổi', async () => {
    await goto('/compare'); await until('document.querySelectorAll(".compare-product-main").length===3', 'compare before clear')
    await click('Xóa tất cả'); await until('JSON.parse(localStorage.getItem("compareList")||"[]").length===0', 'compare cleared storage')
    await until('document.querySelectorAll(".compare-mini-panel .mini-product-item").length===0', 'compare floating panel sync')
  })
  await check('Giỏ hàng: tách hai phiên bản, tăng/giảm số lượng và xóa dòng', async () => {
    await clearShopping(); await buy(); await buy('Đen'); await goto('/cart')
    await until('JSON.parse(localStorage.getItem("cart")||"[]").length===2', 'two cart lines')
    await until('[...document.querySelectorAll("main button")].some(b=>b.textContent.trim()==="+")', 'cart rendered')
    await click('+'); await until('JSON.parse(localStorage.getItem("cart"))[0].cartQuantity===2', 'cart plus')
    await click('-'); await until('JSON.parse(localStorage.getItem("cart"))[0].cartQuantity===1', 'cart minus')
    await click('Xóa'); await until('JSON.parse(localStorage.getItem("cart")).length===1', 'cart remove')
    await click('Xóa toàn bộ giỏ hàng'); await until('JSON.parse(localStorage.getItem("cart")).length===0', 'cart clear')
  })
  let bankOrder
  await check('Checkout: mã sai/ngừng, mã phần trăm/số tiền, BANK và snapshot giảm giá', async () => {
    await login('customer'); await clearShopping(); await buy(); await goto('/checkout'); await until('!!document.querySelector("[name=paymentMethod]")', 'checkout coupons')
    const couponSelector = 'input[placeholder="Nhập mã SALE100..."]'
    for (const code of ['MISSING','FIXOFF']) { await fill(couponSelector, code); await click('Áp dụng'); await pause(150); assert.ok(!await evaluate('[...document.querySelectorAll("button")].some(b=>b.textContent.trim()==="Bỏ mã")')) }
    await fill(couponSelector, 'FIX10'); await click('Áp dụng'); await until('[...document.querySelectorAll("button")].some(b=>b.textContent.trim()==="Bỏ mã")', 'percent applied')
    await click('Bỏ mã'); await fill(couponSelector, 'FIX500'); await click('Áp dụng'); await until('[...document.querySelectorAll("button")].some(b=>b.textContent.trim()==="Bỏ mã")', 'amount applied')
    await fill('[name=paymentMethod]', 'BANK'); const count = store.state.orders.length; await click('Xác nhận đặt hàng')
    await poll(() => store.state.orders.length === count + 1, 'BANK order')
    bankOrder = store.state.orders.at(-1)
    assert.equal(bankOrder.paymentMethod, 'BANK'); assert.equal(bankOrder.paymentStatus, 'unpaid'); assert.equal(bankOrder.couponDiscount, 500000)
    assert.equal(bankOrder.totalPrice, bankOrder.productTotal - 500000)
  })
  await check('BANK: admin đánh dấu thanh toán thủ công; tìm/lọc đơn và hóa đơn', async () => {
    assert.ok(bankOrder, 'BANK checkout prerequisite')
    await login('admin'); await goto('/admin/orders'); await until('!!document.querySelector("[data-order-revision]")', 'orders')
    await fill('input[placeholder="Mã đơn, khách hàng, người nhận, SĐT..."]', bankOrder.id)
    await until('document.querySelectorAll("[data-order-revision]").length===1', 'order search')
    await fill('[data-order-revision] select', 'paid'); await poll(() => store.state.orders.find(o => o.id === bankOrder.id).paymentStatus === 'paid', 'BANK paid')
    await click('Hóa đơn'); await until('!!document.querySelector(".invoice-print-area")', 'admin invoice'); await domClick('.invoice-actions button')
  })
  await check('Khách hủy pending có lý do, hoàn số máy đúng một lần', async () => {
    const order = await prepareOrder(), before = availability(store.state, 'fixture', 'blue').sellable
    await login('customer'); await goto('/orders'); await until(`document.body.innerText.includes(${JSON.stringify(order.id)})`, 'pending order')
    await orderClick(order.id, 'Hủy đơn hàng'); await until('!!document.querySelector(".review-modal-box textarea")', 'customer cancellation')
    await fill('.review-modal-box textarea', 'Fixture cancel reason'); await click('Xác nhận hủy đơn')
    await poll(() => store.state.orders.find(o => o.id === order.id).status === 'cancelled', 'cancel saved')
    assert.equal(availability(store.state, 'fixture', 'blue').sellable, before + 1)
    await goto('/orders'); await until(`document.body.innerText.includes(${JSON.stringify(order.id)})`, 'cancel persists')
    assert.equal(availability(store.state, 'fixture', 'blue').sellable, before + 1)
  })
  await check('Admin hủy shipping, nhận máy về quarantine và kiểm tra đưa về khả dụng', async () => {
    let order = await prepareOrder(); order = await transition(order, 'confirmed'); order = await transition(order, 'shipping')
    const device = store.state.devices.find(d => d.assignment?.orderId === order.id), before = availability(store.state, 'fixture', 'blue').sellable
    await login('admin'); await goto('/admin/orders'); await until(`document.body.innerText.includes(${JSON.stringify(order.id)})`, 'shipping order')
    await orderClick(order.id, 'Hủy đơn'); await until('!!document.querySelector(".review-modal-box textarea")', 'admin cancellation')
    await fill('.review-modal-box textarea', 'Fixture return reason'); await click('Xác nhận hủy đơn')
    await poll(() => store.state.devices.find(d => d.id === device.id).status === 'return_pending', 'return pending')
    assert.equal(availability(store.state, 'fixture', 'blue').sellable, before)
    await orderClick(order.id, 'Máy chờ nhận lại'); await until('document.body.innerText.includes("Đã nhận lại, chờ kiểm tra")', 'receive return button')
    await click('Đã nhận lại, chờ kiểm tra'); await poll(() => store.state.devices.find(d => d.id === device.id).status === 'quarantine', 'quarantine')
    await goto('/admin/devices'); await until('!!document.querySelector(".variant-stock-table")', 'return stock')
    await click('Xem IMEI'); await until('!!document.querySelector("#device-imei-search")', 'return IMEI list')
    await fill('#device-imei-search', device.imei); await until('document.body.innerText.includes("1 máy phù hợp")', 'return IMEI search')
    await fill('.variant-device-list select[aria-label="Đổi trạng thái máy"]', 'available')
    await poll(() => store.state.devices.find(d => d.id === device.id).status === 'available', 'inspection passed')
    assert.equal(availability(store.state, 'fixture', 'blue').sellable, before + 1)
  })
  await check('Đánh giá sau completed, hiển thị công khai và chống gửi trùng', async () => {
    await login('customer'); await goto('/orders'); await until('[...document.querySelectorAll("button")].some(b=>b.textContent.trim()==="Đánh giá")', 'review button')
    await click('Đánh giá'); await until('!!document.querySelector("textarea[name=comment]")', 'review modal')
    await fill('[name=rating]', '4'); await fill('[name=comment]', 'Fixture browser review'); await click('Gửi đánh giá')
    await poll(() => store.state.reviews.some(r => r.comment === 'Fixture browser review'), 'review saved')
    const review = store.state.reviews.find(r => r.comment === 'Fixture browser review')
    const duplicate = await tokenRequest('/reviews', 'POST', { orderId: review.orderId, productId: review.productId, rating: 4, comment: 'Duplicate fixture' })
    assert.equal(duplicate.status, 409)
    await goto('/products/' + review.productId); await until('document.body.innerText.includes("Fixture browser review")', 'public review')
  })
  await check('Danh mục: thêm và sửa qua giao diện', async () => {
    await login('admin'); await goto('/admin/categories'); await until('!!document.querySelector("input[name=name]")', 'categories')
    await form({ name: 'Fixture category', description: 'Fixture description' }); await click('Thêm mới')
    await poll(() => store.state.categories.some(c => c.name === 'Fixture category'), 'category added')
    await rowClick('Fixture category', 'Sửa'); await fill('[name=description]', 'Fixture edited'); await click('Cập nhật')
    await poll(() => store.state.categories.some(c => c.name === 'Fixture category' && c.description === 'Fixture edited'), 'category edited')
  })
  await check('Mã giảm giá: thêm, sửa, ngừng/kích hoạt và chống trùng', async () => {
    await login('admin'); await goto('/admin/coupons'); await until('!!document.querySelector("[name=code]")', 'coupons')
    await form({ code: 'FULLTEST', discountType: 'percent', discount: '15', status: 'active' }); await click('Thêm mới')
    await poll(() => store.state.coupons.some(c => c.code === 'FULLTEST'), 'coupon created')
    await rowClick('FULLTEST', 'Sửa'); await fill('[name=discount]', '20'); await click('Cập nhật')
    await poll(() => store.state.coupons.some(c => c.code === 'FULLTEST' && c.discount === 20), 'coupon edited')
    await rowClick('FULLTEST', 'Ngừng'); await poll(() => store.state.coupons.some(c => c.code === 'FULLTEST' && c.status === 'inactive'), 'coupon stopped')
    await rowClick('FULLTEST', 'Kích hoạt'); await poll(() => store.state.coupons.some(c => c.code === 'FULLTEST' && c.status === 'active'), 'coupon resumed')
    const count = store.state.coupons.length
    await form({ code: 'FULLTEST', discount: '10' }); await click('Thêm mới'); await pause(250); assert.equal(store.state.coupons.length, count)
  })
  await check('Tài khoản: thêm, sửa, khóa và mở khóa', async () => {
    await login('admin'); await goto('/admin/users'); await until('!!document.querySelector("[name=username]")', 'users')
    await form({ fullName: 'Fixture managed customer', username: 'managed-customer', email: 'managed@fixture.invalid', password: 'fixture-password', phone: '0000000000', role: 'customer', status: 'active' }); await click('Thêm mới')
    await poll(() => store.state.users.some(u => u.username === 'managed-customer'), 'user added')
    await rowClick('managed-customer', 'Sửa'); await fill('[name=fullName]', 'Fixture managed edited'); await click('Cập nhật')
    await poll(() => store.state.users.some(u => u.username === 'managed-customer' && u.fullName === 'Fixture managed edited'), 'user edited')
    await rowClick('managed-customer', 'Khóa'); await poll(() => store.state.users.some(u => u.username === 'managed-customer' && u.status === 'blocked'), 'user locked')
    await rowClick('managed-customer', 'Mở khóa'); await poll(() => store.state.users.some(u => u.username === 'managed-customer' && u.status === 'active'), 'user unlocked')
  })
  await check('Nhân sự: thêm nhân viên, sửa, khóa và mở khóa', async () => {
    await login('admin'); await goto('/admin/staffs'); await until('!!document.querySelector("[name=username]")', 'staff form')
    await form({ fullName: 'Fixture managed staff', username: 'managed-staff', email: 'managed-staff@fixture.invalid', password: 'fixture-password', phone: '0000000000', role: 'staff', status: 'active' }); await click('Thêm mới')
    await poll(() => store.state.users.some(u => u.username === 'managed-staff'), 'staff added')
    await rowClick('managed-staff', 'Sửa'); await fill('[name=fullName]', 'Fixture staff edited'); await click('Cập nhật')
    await poll(() => store.state.users.some(u => u.username === 'managed-staff' && u.fullName === 'Fixture staff edited'), 'staff edited')
    await rowClick('managed-staff', 'Khóa'); await poll(() => store.state.users.some(u => u.username === 'managed-staff' && u.status === 'blocked'), 'staff locked')
    await rowClick('managed-staff', 'Mở khóa'); await poll(() => store.state.users.some(u => u.username === 'managed-staff' && u.status === 'active'), 'staff unlocked')
  })
  await check('Sản phẩm: thêm/sửa/ngừng/bán lại và bảo toàn phiên bản', async () => {
    await login('admin'); await goto('/admin/products'); await until('!!document.querySelector("[name=name]")', 'product form')
    await form({ name: 'Fixture new phone', brand: 'Apple', categoryId: 'cat', image: '/IMG/iphone-15.png', price: '5000000', oldPrice: '6000000', storage: '128GB', ram: '8GB' }); await click('Thêm mới')
    await poll(() => store.state.products.some(p => p.name === 'Fixture new phone'), 'product created')
    const created = store.state.products.find(p => p.name === 'Fixture new phone'), variants = structuredClone(created.variants)
    await rowClick('Fixture new phone', 'Sửa'); await fill('[name=name]', 'Fixture new phone edited'); await click('Cập nhật')
    await poll(() => store.state.products.some(p => p.id === created.id && p.name.endsWith('edited')), 'product edit')
    assert.deepEqual(store.state.products.find(p => p.id === created.id).variants, variants)
    await rowClick('Fixture new phone edited', 'Ngừng bán'); await poll(() => store.state.products.find(p => p.id === created.id).status === 'inactive', 'stop selling')
    await rowClick('Fixture new phone edited', 'Bán lại'); await poll(() => store.state.products.find(p => p.id === created.id).status === 'active', 'resume selling')
  })
  await check('Dashboard: biểu đồ, số liệu và xuất CSV doanh thu', async () => {
    await login('admin'); await goto('/admin'); await until('document.querySelectorAll(".recharts-wrapper").length>=2', 'dashboard charts')
    await until(`document.querySelector('.admin-main')?.innerText.includes(${JSON.stringify(store.state.orders.at(-1).id)})`, 'dashboard data loaded')
    await evaluate(`(() => {window.__exportResult={};const originalURL=URL.createObjectURL,originalClick=HTMLAnchorElement.prototype.click;URL.createObjectURL=function(blob){window.__exportPromise=blob.text().then(text=>{window.__exportResult.text=text});return originalURL.call(this,blob)};HTMLAnchorElement.prototype.click=function(){window.__exportResult.filename=this.download};window.__restoreExport=()=>{URL.createObjectURL=originalURL;HTMLAnchorElement.prototype.click=originalClick}})()`)
    try { await click('Xuất doanh thu Excel'); await evaluate('window.__exportPromise'); const exported = await evaluate('window.__exportResult'); assert.ok(exported.filename.endsWith('.csv')); assert.ok(exported.text.includes(';')); fs.writeFileSync(path.join(artifacts, 'full-revenue.csv'), exported.text) }
    finally { await evaluate('window.__restoreExport()') }
  })
  await check('Phân quyền staff: các màn hình cho phép, chặn route/API chỉ admin', async () => {
    await login('staff')
    for (const route of ['/admin','/admin/products','/admin/orders','/admin/devices','/admin/warranties']) { await goto(route); await until('!!document.querySelector(".admin-main h2")', 'staff ' + route); assert.equal(await evaluate('location.pathname'), route) }
    await goto('/admin/users'); await until('location.pathname==="/"', 'staff route denied')
    assert.equal((await tokenRequest('/coupons', 'POST', { code: 'FORBIDDEN', discount: 10 })).status, 403)
    assert.equal((await tokenRequest('/commands/receive-device', 'POST', { productId: 'fixture', variantId: 'blue', imeis: [] })).status, 403)
  })
  await check('Khách: chặn trang admin, IMEI tồn kho và đơn/bảo hành của khách khác', async () => {
    await login('registered', 'fixture-new-password')
    await goto('/admin/orders'); await until('location.pathname==="/"', 'customer route denied')
    assert.equal((await tokenRequest('/devices')).status, 403)
    assert.equal((await tokenRequest('/devices/summary')).status, 403)
    assert.equal((await tokenRequest('/orders/' + store.state.orders[0].id)).status, 404)
    assert.equal((await tokenRequest('/warranties')).data.length, 0)
    assert.equal((await tokenRequest('/orders')).data.length, 0)
  })
  await check('Responsive khách hàng và admin ở 390/768/1280px', async () => {
    const overflow = []
    for (const role of ['customer','admin']) {
      await login(role)
      for (const width of [390,768,1280]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 })
        for (const route of role === 'customer' ? ['/','/products','/products/fixture','/orders'] : ['/admin','/admin/products','/admin/orders','/admin/devices']) {
          await goto(route); await until('!!document.querySelector("main,.admin-main")', 'responsive route'); await pause(100)
          const dimensions = await evaluate('({page:document.documentElement.scrollWidth,viewport:innerWidth})')
          if (dimensions.page > dimensions.viewport + 1) overflow.push({ role, route, width, page: dimensions.page })
        }
      }
    }
    observations.push({ responsiveOverflow: overflow })
    assert.deepEqual(overflow, [])
  })
  await check('Phiên bị khóa: API thu hồi quyền, chuyển về login và giữ giỏ hàng', async () => {
    await login('managed-customer'); await buy(); const before = await evaluate('localStorage.getItem("cart")')
    const managed = store.state.users.find(u => u.username === 'managed-customer')
    await store.transact(admin, id(), 'fixture-block', {}, db => { db.users.find(u => u.id === managed.id).status = 'blocked'; return { ok: true } })
    await goto('/orders'); await until('location.pathname==="/login"', 'blocked session invalidated')
    assert.equal(await evaluate('localStorage.getItem("cart")'), before)
  })
  await check('Chi tiết: chọn được phiên bản khác RAM khi cùng màu và dung lượng', async () => {
    const used = new Set(store.state.devices.map(d => d.imei))
    for (const variantId of ['blue','blue-high']) await execute(admin, 'receive-device', { productId: 'fixture-extra', variantId, imeis: [demoImei(used)] })
    await login('customer'); await goto('/products/fixture-extra'); await until('!!document.querySelector(".detail-info-box")', 'RAM variants detail')
    const choice = await evaluate('[...document.querySelectorAll(".detail-info-box button, .detail-info-box option")].some(e=>e.textContent.includes("16GB"))')
    assert.ok(choice, 'Có bản RAM 12GB và 16GB cùng màu Xanh/128GB trong API nhưng chi tiết không có lựa chọn RAM 16GB')
  })
  await check('Nhập IMEI: từ chối trùng và sai checksum, không tăng tồn', async () => {
    await login('admin'); await goto('/admin/devices'); await until('!!document.querySelector("#inventory-product")', 'IMEI import validation')
    await fill('#inventory-product', 'fixture'); await fill('#inventory-variant', JSON.stringify(['8GB','128GB'])); await fill('#inventory-color', 'Xanh')
    const count = store.state.devices.length, existing = store.state.devices.find(d => d.productId === 'fixture' && d.variantId === 'blue')
    await fill('#receive-imeis', existing.imei); await click('Nhập kho'); await until('document.querySelector("#toastContainer")?.innerText.includes("IMEI đã tồn tại")', 'duplicate IMEI blocked')
    assert.equal(store.state.devices.length, count)
    await fill('#receive-imeis', '123456789012345'); await click('Nhập kho'); await until('document.querySelector("#toastContainer")?.innerText.includes("chữ số kiểm tra")', 'invalid checksum blocked')
    assert.equal(store.state.devices.length, count)
  })
  await check('Bảo hành: tra cứu IMEI/mã đơn và chặn phiếu mở trùng', async () => {
    const warranty = store.state.warranties.find(w => w.status === 'issued')
    await login('admin'); await goto('/admin/warranties'); await until('!!document.querySelector(".admin-main input")', 'warranty search')
    await fill('input[placeholder="Nhập IMEI hoặc mã đơn..."]', warranty.imeiSnapshot); await until('document.querySelectorAll(".admin-main tbody tr").length===1', 'warranty IMEI match')
    assert.ok(await evaluate(`document.querySelector('.admin-main tbody').innerText.includes(${JSON.stringify(warranty.orderId)})`))
    await fill('input[placeholder="Nhập IMEI hoặc mã đơn..."]', warranty.orderId); await until(`document.querySelector('.admin-main tbody')?.innerText.includes(${JSON.stringify(warranty.imeiSnapshot)})`, 'warranty order match')
    await click('Xem / tiếp nhận'); await fill('.card form textarea', 'Fixture second service'); await click('Tạo phiếu tiếp nhận')
    await poll(() => store.state.warrantyClaims.some(c => c.warrantyId === warranty.id && c.status === 'received'), 'service created')
    const count = store.state.warrantyClaims.length
    await fill('.card form textarea', 'Duplicate service'); await click('Tạo phiếu tiếp nhận'); await pause(200)
    assert.equal(store.state.warrantyClaims.length, count)
  })
  await check('Giỏ cũ thiếu phiên bản bị chặn trước khi đặt đơn', async () => {
    await login('customer'); await clearShopping()
    const legacy = { ...store.state.products[0], cartQuantity: 1 }
    await evaluate(`localStorage.setItem('cart',${JSON.stringify(JSON.stringify([legacy]))})`)
    await goto('/cart'); await until('document.querySelector("main")?.innerText.includes("Chọn lại phiên bản")', 'legacy cart warning')
    const count = store.state.orders.length
    await goto('/checkout'); await until('!!document.querySelector("[name=paymentMethod]")', 'legacy checkout')
    await click('Xác nhận đặt hàng'); await until('location.pathname==="/cart"', 'legacy checkout blocked')
    assert.equal(store.state.orders.length, count)
  })
  await check('Checkout kiểm lại tồn khi máy đã thuộc các đơn khác', async () => {
    await login('customer'); await clearShopping(); await buy(); await goto('/checkout'); await until('!!document.querySelector("[name=paymentMethod]")', 'stock race checkout')
    const quantity = availability(store.state, 'fixture', 'blue').sellable
    const reserve = await execute(customer, 'place', { items: [{ productId: 'fixture', variantId: 'blue', quantity }], shipping: { receiverName: 'Fixture reservation', phone: '0000000000', address: 'Fixture', paymentMethod: 'COD' } })
    try {
      const count = store.state.orders.length
      await click('Xác nhận đặt hàng'); await until('document.querySelector("#toastContainer")?.innerText.includes("Không đủ máy khả dụng")', 'changed stock rejected')
      assert.equal(store.state.orders.length, count)
    } finally { await execute(admin, 'cancel', { orderId: reserve.id, expectedRevision: reserve.revision, reason: 'Fixture cleanup' }) }
  })
  const report = { startedAt, finishedAt: new Date().toISOString(), passed: results.filter(r => r.status === 'pass').length, failed: results.filter(r => r.status === 'fail').length, results, observations, uncaughtExceptions: exceptions }
  fs.writeFileSync(path.join(artifacts, 'full-ui-report.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(`FULL RESULT ${report.passed}/${results.length} passed; ${report.failed} failed`)
  return report
}
