// Real Chromium UI smoke test using CDP pipes; no browser dependency is installed.
// The API is an in-memory fixture; this script never opens the project's db.json.
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const net = require('node:net')
const { spawn } = require('node:child_process')
const assert = require('node:assert/strict')
const { migrate } = require('./migrate-imei.cjs')
const { createStore } = require('../server/store.cjs')
const { createApp } = require('../server/index.cjs')
const { command, id } = require('../server/domain.cjs')

async function main() {
  const browserPath = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file => fs.existsSync(file))
  assert.ok(browserPath, 'Set CHROME_PATH to a Chromium browser')
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'techmobile-ui-'))
  const artifacts = path.resolve(__dirname, '../browser-artifacts'); fs.mkdirSync(artifacts, { recursive: true })
  const user = role => ({ id: role, username: role, email: `${role}@fixture.invalid`, fullName: `Fixture ${role}`, password: 'fixture-password', phone: '0000000000', address: 'Fixture address', role, status: 'active' })
  const db = migrate({ users: [user('admin'), user('customer')], categories: [{ id: 'cat', name: 'Apple' }], coupons: [], orders: [], reviews: [], products: [{ id: 'fixture', name: 'Fixture phone', brand: 'Apple', categoryId: 'cat', status: 'active', quantity: 48, price: 10000000, oldPrice: 11000000, image: '/IMG/iphone-15.png', ram: '8GB', storage: '128GB', rating: 5, reviews: 0, variants: [{ id: 'blue', color: 'Xanh', storage: '128GB', price: 10000000, oldPrice: 11000000, image: '/IMG/iphone-15.png' }, { id: 'black', color: 'Đen', storage: '256GB', price: 12000000, oldPrice: 13000000, image: '/IMG/iphone-15.png' }] }] }).db
  // Include repeated storage/color with different RAM and overlapping local IDs.
  const extra = structuredClone(db.products[0])
  extra.id = 'fixture-extra'; extra.name = 'Fixture Galaxy'; extra.brand = 'Samsung'
  extra.variants = [{ ...extra.variants[0], ram: '12GB' }, { ...extra.variants[0], id: 'blue-high', ram: '16GB' }]
  const sibling = structuredClone(db.products[0])
  sibling.id = 'fixture-sibling'; sibling.name = 'Fixture phone Plus'; sibling.variants = [sibling.variants[1]]
  db.products.push(extra, sibling)
  const originalDevices = structuredClone(db.devices)
  const store = createStore(db)
  const api = createApp(store).listen(0, '127.0.0.1')
  await new Promise((resolve, reject) => { api.once('listening', resolve); api.once('error', reject) })
  const apiOrigin = `http://127.0.0.1:${api.address().port}`
  let vite, browser, uiOrigin
  const callbacks = new Map(), exceptions = []
  let counter = 0, pending = '', sessionId
  const send = (method, params = {}, session = sessionId) => new Promise((resolve, reject) => {
    const commandId = ++counter
    const timeout = setTimeout(() => { callbacks.delete(commandId); reject(Error('CDP timeout: ' + method)) }, 15000)
    callbacks.set(commandId, { resolve, reject, timeout })
    browser.stdio[3].write(JSON.stringify({ id: commandId, method, params, ...(session ? { sessionId: session } : {}) }) + '\0')
  })
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw Error(result.exceptionDetails.text + ': ' + result.exceptionDetails.exception?.description)
    return result.result?.value
  }
  const until = async (expression, label) => {
    for (let i = 0; i < 120; i++) { if (await evaluate(expression)) return; await new Promise(resolve => setTimeout(resolve, 100)) }
    throw Error('UI timeout: ' + label)
  }
  const goto = async route => { await send('Page.navigate', { url: uiOrigin + route }); await until('document.readyState === "complete"', route) }
  const fill = (selector, value) => evaluate(`(() => { const input = document.querySelector(${JSON.stringify(selector)}); if (!input) throw Error('Missing input'); const prototype = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : input.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', {bubbles:true})); input.dispatchEvent(new Event('change', {bubbles:true})); })()`)
  const click = label => evaluate(`(() => {const button = [...document.querySelectorAll('button')].find(b=>b.textContent.trim() === ${JSON.stringify(label)});if(!button)throw Error('Missing button: '+${JSON.stringify(label)});button.click()})()`)
  const screenshot = async name => { const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); fs.writeFileSync(path.join(artifacts, name + '.png'), Buffer.from(image.data, 'base64')) }
  const noDemo = async () => assert.ok(await evaluate('[...document.querySelectorAll(".badge,.order-item-imeis,.device-warranty-line,.invoice-print-area")].every(e=>!/(?:\\bDemo\\b|\\(demo\\))/i.test(e.innerText))'), 'IMEIs must not display Demo provenance labels')
  const login = async role => {
    await goto('/login'); await until('!!document.querySelector("input[name=account]")', 'login')
    await fill('input[name=account]', role); await fill('input[name=password]', 'fixture-password'); await click('Đăng nhập')
    await until(`location.pathname === ${JSON.stringify(role === 'admin' ? '/admin' : '/')}`, 'login redirect')
  }
  const logout = async () => { await click('Đăng xuất'); await until('location.pathname === "/login"', 'logout') }
  try {
    const { createServer } = await import('vite')
    // Isolated dynamic ports allow testing while the user's normal servers run.
    const probe = net.createServer().listen(0, '127.0.0.1')
    await new Promise(resolve => probe.once('listening', resolve))
    const port = probe.address().port
    await new Promise(resolve => probe.close(resolve))
    vite = await createServer({ define: { 'import.meta.env.VITE_API_URL': JSON.stringify(apiOrigin) }, server: { host: '127.0.0.1', port, strictPort: true }, logLevel: 'error' }); await vite.listen()
    uiOrigin = `http://127.0.0.1:${vite.httpServer.address().port}`
    browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-pipe', '--user-data-dir=' + profile], { windowsHide: true, stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] })
    browser.stdio[4].on('data', bytes => {
      pending += bytes.toString()
      let end
      while ((end = pending.indexOf('\0')) >= 0) {
        const raw = pending.slice(0, end); pending = pending.slice(end + 1)
        if (!raw) continue
        const message = JSON.parse(raw), callback = callbacks.get(message.id)
        if (callback) { clearTimeout(callback.timeout); callbacks.delete(message.id); if (message.error) callback.reject(Error(message.error.message)); else callback.resolve(message.result) }
        if (message.method === 'Page.javascriptDialogOpening') send('Page.handleJavaScriptDialog', { accept: true, promptText: 'Fixture service note' }, message.sessionId).catch(() => {})
        if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text)
      }
    })
    const target = await send('Target.createTarget', { url: 'about:blank' }, null)
    sessionId = (await send('Target.attachToTarget', { targetId: target.targetId, flatten: true }, null)).sessionId
    await send('Page.enable'); await send('Runtime.enable')
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
    await login('admin'); await goto('/admin/devices')
    await until('document.querySelectorAll(".variant-stock-table tbody tr").length === 5', 'grouped variant stock')
    assert.ok(await evaluate('!document.querySelector(".variant-device-list")'))
    await noDemo()
    await screenshot('devices-desktop')
    assert.ok(await evaluate('!document.querySelector(".admin-main").innerText.includes("Giữ chỗ") && !document.querySelector(".admin-main").innerText.includes("Có thể đặt")'))
    const headings = await evaluate('[...document.querySelectorAll(".variant-stock-table:first-of-type thead th")].slice(0,11).map(e=>e.innerText)')
    assert.deepEqual(headings, ['Màu', 'Dung lượng', 'Tổng kho', 'Đang xử lí', 'Sẵn bán', 'Đang giao', 'Đã bán', 'Bảo hành', 'Chờ nhận lại', 'Chờ kiểm tra', 'Thao tác'])
    const highlights = await evaluate('(() => {const row=document.querySelector(".variant-stock-table tbody tr");return ["shipping","sold","warranty"].map(name=>getComputedStyle(row.querySelector(".stock-col-"+name)).backgroundColor)})()')
    assert.equal(new Set(highlights).size, 3)
    await fill('#inventory-brand', 'Samsung')
    await until('document.querySelectorAll(".variant-stock-table tbody tr").length === 2', 'brand filter')
    assert.ok(await evaluate('![...document.querySelectorAll("#inventory-product option")].some(o=>o.value==="fixture")'))
    await fill('#inventory-product', 'fixture-extra')
    await fill('#inventory-variant', JSON.stringify(['16GB', '128GB']))
    await fill('#inventory-color', 'Xanh')
    await until('document.querySelectorAll(".variant-stock-table tbody tr").length === 1 && document.querySelector(".variant-stock-table tbody tr").dataset.variantId === "blue-high"', 'RAM/color filters distinguish variants')
    await fill('#inventory-brand', 'Apple')
    assert.ok(await evaluate('["product","variant","color"].every(name=>document.querySelector("#inventory-"+name).value==="")'))
    await until('document.querySelectorAll(".variant-stock-table tbody tr").length === 3', 'brand change resets child filters')
    await click('Xóa bộ lọc'); await until('document.querySelectorAll(".variant-stock-table tbody tr").length === 5', 'clear filters')
    await fill('#inventory-product', 'fixture')
    await fill('#inventory-variant', JSON.stringify(['8GB', '128GB']))
    assert.ok(await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="Nhập kho").disabled'))
    await fill('#inventory-color', 'Xanh')
    await until('document.querySelectorAll(".variant-stock-table tbody tr").length === 1', 'specific product version and color')
    await click('Tạo IMEI demo'); await until('document.querySelector("#receive-imeis").value.length === 15', 'demo IMEI preview')
    assert.equal(store.state.devices.length, 48)
    const generatedImei = await evaluate('document.querySelector("#receive-imeis").value')
    await click('Nhập kho'); await until('document.querySelector("#receive-imeis").value === ""', 'receive device')
    assert.equal(store.state.devices.length, 49)
    assert.equal(store.state.devices.find(d => d.imei === generatedImei).origin, 'demo_generated')
    await click('Xem IMEI'); await until('document.body.innerText.includes("25 máy phù hợp")', 'scoped devices')
    assert.equal(await evaluate('document.querySelectorAll(".variant-device-list tbody tr").length'), 20)
    await click('Trang sau'); await until('document.body.innerText.includes("Trang 2/2")', 'device pagination')
    assert.equal(await evaluate('document.querySelectorAll(".variant-device-list tbody tr").length'), 5)
    const imei = originalDevices.find(d => d.variantId === 'blue').imei
    await fill('#device-imei-search', imei); await until('document.body.innerText.includes("1 máy phù hợp")', 'IMEI search')
    await fill('#device-status-filter', 'sold'); await until('document.body.innerText.includes("0 máy phù hợp")', 'status filter empty')
    await fill('#device-status-filter', 'available'); await until('document.body.innerText.includes("1 máy phù hợp")', 'available filter')
    await fill('#device-imei-search', ''); await until('document.body.innerText.includes("25 máy phù hợp")', 'reset search')
    await noDemo()
    for (const [width, height] of [[1440, 1000], [1280, 600], [768, 900], [390, 844]]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 })
      await evaluate('window.scrollTo(0, 500)')
      await evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))')
      const layout = await evaluate('(() => {const sidebar=document.querySelector(".admin-sidebar"), s=sidebar.getBoundingClientRect(), h=document.querySelector(".site-header").getBoundingClientRect();return {top:s.top, bottom:s.bottom, header:h.bottom, width:document.documentElement.scrollWidth, viewport:innerWidth, scrollY, canScroll:sidebar.scrollHeight>sidebar.clientHeight}})()')
      assert.ok(layout.scrollY > 0, 'Long list must scroll')
      assert.ok(layout.top >= layout.header - 1 && layout.top <= layout.header + 2, `Sidebar below header at ${width}: ${JSON.stringify(layout)}`)
      assert.ok(layout.width <= layout.viewport + 1, `No page overflow at ${width}`)
      if (width === 1280) assert.ok(layout.canScroll, 'Short laptop sidebar must scroll independently')
      if (width < 768) {
        await click('Mở menu quản trị')
        assert.ok(await evaluate('getComputedStyle(document.querySelector(".admin-navigation")).display !== "none"'))
        await screenshot('devices-mobile'); await click('Thu gọn menu quản trị')
      } else await screenshot('devices-sticky-' + width)
    }
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
    await evaluate('window.scrollTo(0, 0)')
    await click('Đóng danh sách IMEI'); await until('!document.querySelector(".variant-device-list")', 'close scoped list')
    console.log('PASS brand/model/RAM/storage/color filters and reset, colored stock columns, scoped IMEI pagination; sticky sidebar at desktop/laptop/tablet/mobile')
    await goto('/admin/products'); await until('document.body.innerText.includes("Phiên bản")', 'product manager')
    await click('Phiên bản'); await until('!!document.querySelector("#variant-editor")', 'variant editor')
    await fill('#variant-editor input[aria-label=price]', '10000001'); await click('Lưu phiên bản')
    await until('!document.querySelector("#variant-editor")', 'saved variant')
    assert.equal(store.state.products[0].variants[0].price, 10000001)
    console.log('PASS admin imports an IMEI and edits variants without losing devices')
    await logout(); await login('customer'); await goto('/products/fixture')
    await until('!!document.querySelector(".detail-buy-btn:not(:disabled)")', 'variant available')
    await click('Mua ngay'); await goto('/cart')
    await until('document.body.innerText.includes("Xanh")', 'cart variant')
    await goto('/checkout'); await until('!!document.querySelector("form button[type=submit]")', 'checkout')
    await click('Xác nhận đặt hàng'); await until('location.pathname === "/orders" && document.body.innerText.includes("IMEI sẽ hiển thị")', 'placed order')
    assert.equal(store.state.orders.length, 1)
    console.log('PASS customer selects variant, cart, checkout and order history')
    await logout(); await login('admin'); await goto('/admin/orders')
    await until('!!document.querySelector("[data-order-revision]")', 'order manager')
    assert.ok(await evaluate('![...document.querySelectorAll(".admin-main button")].some(b=>["Xem IMEI","Thu gọn IMEI"].includes(b.textContent.trim()))'))
    await click('Xác nhận đơn'); await until('[...document.querySelectorAll("button")].some(b=>b.textContent.trim()==="Giao hàng"&&!b.disabled)', 'confirmed')
    await until('document.querySelector(".order-item-imeis")?.innerText.includes("IMEI:")', 'allocated IMEI is immediately visible in product row')
    assert.ok(await evaluate('!document.querySelector(".device-allocation")'))
    assert.equal(store.state.devices.filter(d => d.status === 'allocated').length, 1)
    await noDemo()
    await goto('/admin/devices'); await until('document.querySelectorAll(".variant-stock-table tbody tr").length === 5', 'stock after confirmation')
    assert.equal(await evaluate('document.querySelector("tr[data-variant-id=blue] .stock-col-processing").innerText'), '1')
    await click('Xem IMEI'); await until('!!document.querySelector("#device-status-filter")', 'open allocation filter')
    await fill('#device-status-filter', 'allocated'); await until('document.body.innerText.includes("1 máy phù hợp")', 'allocated device filter')
    assert.ok(await evaluate(`document.querySelector('.variant-device-list').innerText.includes(${JSON.stringify(store.state.orders[0].id)})`))
    await goto('/admin/orders'); await until('document.querySelector(".order-item-imeis")?.innerText.includes("IMEI:")', 'product row IMEI remains after navigation')
    await click('Giao hàng'); await until('[...document.querySelectorAll("button")].some(b=>b.textContent.trim()==="Đã giao hàng"&&!b.disabled)', 'shipping')
    await click('Đã giao hàng'); await until('document.body.innerText.includes("Đã giao hàng")', 'delivered')
    for (let i = 0; i < 50 && !store.state.warranties.length; i++) await new Promise(resolve => setTimeout(resolve, 100))
    assert.equal(store.state.warranties.length, 1)
    console.log('PASS confirmation automatically allocates and displays IMEI; shipping and warranty require no manual selection')
    await logout(); await login('customer'); await goto('/orders')
    await until('document.body.innerText.includes("Tôi đã nhận hàng")', 'received button'); await click('Tôi đã nhận hàng')
    await until('document.body.innerText.includes("Hoàn thành")', 'completed')
    assert.equal(store.state.orders[0].paymentStatus, 'paid')
    await click('Xem hóa đơn'); await until('!!document.querySelector(".invoice-print-area")', 'invoice')
    assert.ok(await evaluate('document.querySelector(".invoice-print-area").innerText.includes("IMEI:")'))
    await noDemo()
    await screenshot('invoice-desktop'); await evaluate('document.querySelector(".invoice-actions button").click()')
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
    await screenshot('orders-mobile')
    console.log('PASS customer completes COD and invoice shows the IMEI')
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
    await logout(); await login('admin'); await goto('/admin/warranties')
    await until('document.body.innerText.includes("Xem / tiếp nhận")', 'warranties'); await click('Xem / tiếp nhận')
    await fill('.card form textarea', 'Fixture reported fault'); await click('Tạo phiếu tiếp nhận')
    await until('document.body.innerText.includes("Đang kiểm tra")', 'claim')
    await goto('/admin/devices'); await until('document.querySelector("tr[data-variant-id=blue] .stock-col-warranty")?.innerText === "1"', 'active warranty count')
    await screenshot('devices-warranty-active')
    await goto('/admin/warranties'); await until('document.body.innerText.includes("Xem / tiếp nhận")', 'return to warranty'); await click('Xem / tiếp nhận')
    await until('[...document.querySelectorAll("button")].some(b=>b.textContent.trim()==="Đang kiểm tra")', 'open claim controls')
    await click('Đang kiểm tra'); await until('document.body.innerText.includes("Đang sửa")', 'inspection')
    await click('Đang sửa'); await until('document.body.innerText.includes("Sẵn sàng trả")', 'repair')
    await click('Sẵn sàng trả'); await until('document.body.innerText.includes("Đã trả máy")', 'ready')
    await click('Đã trả máy'); await until('document.body.innerText.includes("Fixture service note")', 'returned')
    await screenshot('warranty-desktop')
    await noDemo()
    await goto('/admin/devices'); await until('document.querySelectorAll(".variant-stock-table tbody tr").length === 5', 'stock after delivery')
    assert.equal(await evaluate('document.querySelector("tr[data-variant-id=blue] .stock-col-sold").innerText'), '1')
    assert.equal(await evaluate('document.querySelector("tr[data-variant-id=blue] .stock-col-warranty").innerText'), '0')
    await click('Xem IMEI'); await until('!!document.querySelector("#device-status-filter")', 'open sold filter')
    await fill('#device-status-filter', 'sold'); await until('document.body.innerText.includes("1 máy phù hợp")', 'sold IMEI visible')
    assert.ok(await evaluate(`document.querySelector('.variant-device-list').innerText.includes(${JSON.stringify(store.state.orders[0].id)})`))
    await noDemo()
    await logout(); await login('customer'); await goto('/orders')
    await until('document.body.innerText.includes("Phiếu #")', 'customer claim history')
    await noDemo()
    for (const original of originalDevices) {
      const current = store.state.devices.find(d => d.id === original.id)
      assert.equal(current.imei, original.imei); assert.equal(current.origin, original.origin)
      assert.ok(!Object.hasOwn(current, 'secondaryImeis'))
    }
    assert.equal(store.state.warrantyClaims[0].status, 'returned')
    assert.deepEqual(exceptions, [])
    console.log('PASS warranty ticket lifecycle and customer history; no uncaught browser exceptions')
    const fixtureAdmin = store.state.users.find(u => u.role === 'admin'), fixtureCustomer = store.state.users.find(u => u.role === 'customer')
    const execute = (actor, action, payload) => store.transact(actor, id(), action, payload, draft => command(draft, actor, action, payload))
    await store.transact(fixtureAdmin, id(), 'fixture-legacy-cancelled', {}, draft => {
      draft.orders.push({ id: 'legacy-cancelled-fixture', userId: fixtureCustomer.id, status: 'cancelled', revision: 0, items: [{ id: 'legacy-cancelled-line', productId: 'fixture', name: 'Legacy cancelled phone', quantity: 1, price: 10000000, inventoryState: 'released' }] })
      return { ok: true }
    })
    await logout(); await login('admin'); await goto('/admin/orders')
    await until('!!document.querySelector("[data-order-id=legacy-cancelled-fixture]")', 'legacy cancelled order')
    assert.ok(await evaluate('!document.querySelector("[data-order-id=legacy-cancelled-fixture]").innerText.includes("Máy chờ nhận lại")'))
    assert.ok(await evaluate('document.querySelector("[data-order-id=legacy-cancelled-fixture]").innerText.includes("Chưa ghi nhận IMEI")'))
    let returnOrder = await execute(fixtureCustomer, 'place', { items: [{ productId: 'fixture', variantId: 'blue', quantity: 2 }], shipping: { receiverName: 'Fixture return', phone: '0000000000', address: 'Fixture address', paymentMethod: 'COD' } })
    returnOrder = await execute(fixtureAdmin, 'transition', { orderId: returnOrder.id, expectedRevision: returnOrder.revision, status: 'confirmed' })
    await goto('/admin'); await until('document.querySelector(".admin-main")?.innerText.includes("Đã phân bổ (chờ giao): 2")', 'allocated count independent of sold count')
    assert.ok(await evaluate('document.querySelector(".admin-main").innerText.includes("Đã bán: 1")'))
    returnOrder = await execute(fixtureAdmin, 'transition', { orderId: returnOrder.id, expectedRevision: returnOrder.revision, status: 'shipping' })
    const returnImeis = returnOrder.items[0].deviceSnapshots.map(d => d.imei)
    returnOrder = await execute(fixtureAdmin, 'cancel', { orderId: returnOrder.id, expectedRevision: returnOrder.revision, reason: 'Fixture shipping cancellation' })
    await goto('/admin/orders'); const returnSelector = `[data-order-id="${returnOrder.id}"]`
    await until(`!!document.querySelector(${JSON.stringify(returnSelector)})`, 'cancelled shipping order')
    for (const imei of returnImeis) assert.ok(await evaluate(`document.querySelector(${JSON.stringify(returnSelector + ' .order-item-imeis')}).innerText.includes(${JSON.stringify(imei)})`))
    await click('Máy chờ nhận lại'); await until('!!document.querySelector(".device-allocation")', 'return panel')
    for (const imei of returnImeis) assert.ok(await evaluate(`document.querySelector('.device-allocation').innerText.includes(${JSON.stringify(imei)})`))
    await screenshot('returns-imei-before-receipt')
    await click('Đã nhận lại, chờ kiểm tra')
    await until('document.querySelectorAll(".device-allocation button").length === 1', 'one machine still awaiting return')
    await click('Đã nhận lại, chờ kiểm tra')
    await until('!document.querySelector(".device-allocation") && ![...document.querySelectorAll("button")].some(b=>b.textContent.trim()==="Máy chờ nhận lại")', 'no phantom return button after all received')
    for (const imei of returnImeis) assert.ok(await evaluate(`document.querySelector(${JSON.stringify(returnSelector + ' .order-item-imeis')}).innerText.includes(${JSON.stringify(imei)})`))
    assert.equal(store.state.devices.filter(d => returnImeis.includes(d.imei) && d.status === 'quarantine').length, 2)
    assert.equal(store.state.devices.filter(d => d.status === 'allocated').length, 0)
    assert.equal(store.state.devices.filter(d => d.status === 'sold').length, 1)
    await screenshot('returns-imei-after-receipt')
    assert.deepEqual(exceptions, [])
    console.log('PASS return IMEIs in product rows and return panel; legacy cancellations have no phantom return; received IMEIs persist; allocated and sold counts are separate')
    if (process.argv.includes('--full')) {
      const report = await require('./full-ui-cases.cjs')({ store, goto, fill, click, evaluate, until, screenshot, send, apiOrigin, uiOrigin, artifacts, exceptions })
      if (report.failed) process.exitCode = 1
    }
  } catch (error) {
    if (browser && sessionId) { try { await screenshot('failure'); console.error(await evaluate('document.body.innerText.slice(-2500)')) } catch { /* Preserve original failure. */ } }
    throw error
  } finally {
    if (browser) { try { await send('Browser.close', {}, null) } catch { /* Browser may close its pipe before acknowledging shutdown. */ } browser.kill() }
    for (const callback of callbacks.values()) clearTimeout(callback.timeout)
    await vite?.close(); await new Promise(resolve => api.close(resolve))
    assert.equal(path.dirname(path.resolve(profile)), path.resolve(os.tmpdir()))
    assert.ok(path.basename(profile).startsWith('techmobile-ui-'))
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }) } catch { /* Chrome may briefly retain profile handles on Windows. */ }
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
