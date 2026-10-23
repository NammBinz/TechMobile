const fs = require('node:fs')
const path = require('node:path')
const { randomBytes } = require('node:crypto')
const jsonServer = require('json-server')
const { createStore } = require('./store.cjs')
const domain = require('./domain.cjs')
const { same, requireThat, staff, admin, id, command, projectProducts } = domain

const safeUser = user => Object.fromEntries(Object.entries(user).filter(([key]) => key !== 'password'))
function createApp(store) {
  const app = jsonServer.create(), sessions = new Map()
  app.use(jsonServer.defaults({ logger: false }))
  app.use(jsonServer.bodyParser)
  app.use((req, res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer /, '')
    const session = sessions.get(token)
    const user = session && session.expires > Date.now() ? store.state.users.find(u => same(u.id, session.userId) && u.status !== 'blocked') : null
    req.actor = user || null
    next()
  })
  const handler = fn => (req, res, next) => Promise.resolve().then(() => fn(req, res)).catch(next)
  const authenticated = req => { requireThat(req.actor, 'Vui lòng đăng nhập lại', 401); return req.actor }
  const transact = (req, action, payload, apply) => {
    const actor = authenticated(req)
    return store.transact(actor, req.headers['idempotency-key'] || id(), action, payload, db => {
      const current = db.users.find(user => same(user.id, actor.id))
      requireThat(current?.status !== 'blocked' && current?.role === actor.role, 'Quyền tài khoản đã thay đổi. Vui lòng đăng nhập lại.', 401)
      return apply(db)
    })
  }
  app.post('/auth/login', handler((req, res) => {
    const user = store.state.users.find(u => (u.email === req.body.account || u.username === req.body.account) && u.password === req.body.password)
    requireThat(user && user.status !== 'blocked', 'Tài khoản/mật khẩu không đúng hoặc đã bị khóa', 401)
    const token = randomBytes(32).toString('hex')
    sessions.set(token, { userId: String(user.id), expires: Date.now() + 8 * 60 * 60 * 1000 })
    res.json({ user: safeUser(user), token })
  }))
  app.post('/auth/logout', handler((req, res) => { sessions.delete(req.headers.authorization?.replace(/^Bearer /, '')); res.json({ ok: true }) }))
  function validateUser(db, data, userId) {
    requireThat(['fullName', 'username', 'email', 'phone'].every(k => typeof data[k] === 'string' && data[k].trim()), 'Thiếu thông tin tài khoản')
    requireThat(typeof data.password === 'string' && data.password.length >= 6, 'Mật khẩu cần ít nhất 6 ký tự')
    requireThat(['admin', 'staff', 'customer'].includes(data.role) && ['active', 'blocked'].includes(data.status), 'Vai trò/trạng thái không hợp lệ')
    requireThat(!db.users.some(u => !same(u.id, userId) && (u.username.toLowerCase() === data.username.toLowerCase() || u.email.toLowerCase() === data.email.toLowerCase())), 'Email hoặc tên đăng nhập đã tồn tại', 409)
  }
  app.post('/auth/register', handler(async (req, res) => {
    const result = await store.transact({ id: 'registration' }, req.headers['idempotency-key'] || id(), 'register', req.body, db => {
      const user = { ...Object.fromEntries(['fullName', 'username', 'email', 'password', 'phone', 'address'].map(k => [k, String(req.body[k] || '').trim()])), id: id(), role: 'customer', status: 'active', createdAt: new Date().toLocaleDateString('vi-VN') }
      validateUser(db, user, user.id); db.users.push(user); return safeUser(user)
    })
    res.status(201).json(result)
  }))
  app.put('/auth/profile', handler(async (req, res) => {
    const actor = authenticated(req)
    const result = await transact(req, 'profile', req.body, db => {
      const user = db.users.find(u => same(u.id, actor.id))
      for (const key of ['fullName', 'email', 'phone', 'address']) if (req.body[key] !== undefined) user[key] = String(req.body[key]).trim()
      if (req.body.password) user.password = req.body.password
      validateUser(db, user, user.id)
      return safeUser(user)
    })
    res.json(result)
  }))
  app.post('/commands/:action', handler(async (req, res) => {
    const actor = authenticated(req)
    requireThat(req.headers['idempotency-key'], 'Thiếu mã thao tác. Vui lòng tải lại trang.')
    res.json(await transact(req, req.params.action, req.body, db => command(db, actor, req.params.action, req.body)))
  }))
  app.get('/inventory/availability', handler((req, res) => res.json(projectProducts(store.state).flatMap(p => p.variants.map(v => ({ productId: p.id, variantId: v.id, quantity: v.quantity }))))))
  app.get('/products', handler((req, res) => res.json(projectProducts(store.state))))
  app.get('/products/:id', handler((req, res) => { const p = projectProducts(store.state).find(p => same(p.id, req.params.id)); requireThat(p, 'Không có sản phẩm', 404); res.json(p) }))
  app.post('/devices/demo-imeis', handler((req, res) => {
    admin(authenticated(req))
    const quantity = req.body.quantity ?? 1, exclude = req.body.exclude ?? []
    requireThat(Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= 500 && Array.isArray(exclude) && exclude.length <= 500 && exclude.every(value => typeof value === 'string' && value.length <= 30), 'Chọn từ 1 đến 500 IMEI, tối đa 500 mã mỗi lần nhập')
    requireThat(exclude.length + quantity <= 500, 'Mỗi lần nhập tối đa 500 IMEI')
    const used = new Set([...store.state.devices.map(d => d.imei), ...exclude])
    res.json({ imeis: Array.from({ length: quantity }, () => domain.demoImei(used)) })
  }))
  app.get('/devices/summary', handler((req, res) => {
    staff(authenticated(req))
    const counts = new Map()
    for (const d of store.state.devices) {
      const key = JSON.stringify([String(d.productId), String(d.variantId)])
      const row = counts.get(key) || {}
      row[d.status] = (row[d.status] || 0) + 1; counts.set(key, row)
    }
    // Count physical devices being serviced, not warranty entitlements or closed
    // claims. A device may also be counted as sold; service is not sale stock.
    const warrantyDevices = new Map(store.state.warranties.map(w => [String(w.id), String(w.deviceId)]))
    const underService = new Set(store.state.warrantyClaims.filter(c => ['received', 'inspecting', 'repairing', 'ready'].includes(c.status)).map(c => warrantyDevices.get(String(c.warrantyId))).filter(Boolean))
    const serviceCounts = new Map()
    for (const d of store.state.devices) if (underService.has(String(d.id))) {
      const key = JSON.stringify([String(d.productId), String(d.variantId)])
      serviceCounts.set(key, (serviceCounts.get(key) || 0) + 1)
    }
    res.json(store.state.products.flatMap(p => (p.variants || []).map(v => {
      const key = JSON.stringify([String(p.id), String(v.id)]), row = counts.get(key) || {}, stock = domain.availability(store.state, p.id, v.id)
      return { productId: p.id, variantId: v.id, counts: row, ...stock, inStock: (row.available || 0) + (row.allocated || 0) + (row.quarantine || 0), processing: stock.unallocatedHolds + (row.allocated || 0), readyToSell: p.status === 'active' && v.status !== 'inactive' ? stock.sellable : 0, underWarranty: serviceCounts.get(key) || 0 }
    })))
  }))
  app.get('/devices', handler((req, res) => {
    staff(authenticated(req))
    const rows = store.state.devices.filter(d => (!req.query.productId || same(d.productId, req.query.productId)) && (!req.query.variantId || same(d.variantId, req.query.variantId)) && (!req.query.imei || d.imei.includes(String(req.query.imei).trim())) && (!req.query.status || d.status === req.query.status) && (!req.query.orderId || same(d.assignment?.orderId, req.query.orderId)))
    // Keep the array response for existing dashboard/API consumers. New lists
    // explicitly request bounded pages; no stock IMEIs enter the summary API.
    if (req.query.page === undefined && req.query.limit === undefined) return res.json(rows)
    const page = Number(req.query.page || 1), limit = Number(req.query.limit || 20)
    requireThat(Number.isSafeInteger(page) && page > 0 && Number.isSafeInteger(limit) && limit > 0 && limit <= 100, 'Phân trang không hợp lệ')
    rows.sort((a, b) => Number(b.status === 'available') - Number(a.status === 'available') || String(a.receivedAt || '9999').localeCompare(String(b.receivedAt || '9999')) || String(a.id).localeCompare(String(b.id)))
    res.json({ items: rows.slice((page - 1) * limit, page * limit), total: rows.length, page, pageSize: limit, totalPages: Math.max(1, Math.ceil(rows.length / limit)) })
  }))
  for (const collection of ['orders', 'warranties', 'warrantyClaims', 'users']) app.get(`/${collection}/:id?`, handler((req, res) => {
    const actor = authenticated(req), privileged = ['admin', 'staff'].includes(actor.role), db = store.state
    let rows = db[collection]
    if (collection === 'orders' && !privileged) rows = rows.filter(o => same(o.userId, actor.id))
    if (collection === 'warranties' && !privileged) rows = rows.filter(w => same(w.customerId, actor.id))
    if (collection === 'warrantyClaims' && !privileged) rows = rows.filter(c => db.warranties.some(w => same(w.id, c.warrantyId) && same(w.customerId, actor.id)))
    if (collection === 'users') { if (!privileged) rows = rows.filter(u => same(u.id, actor.id)); if (actor.role !== 'admin') rows = rows.map(safeUser) }
    if (req.params.id) { const item = rows.find(r => same(r.id, req.params.id)); requireThat(item, 'Không tìm thấy dữ liệu', 404); return res.json(item) }
    res.json(rows)
  }))
  // json-server 0.17 uses Express 4: explicit optional parameter syntax.
  app.post('/reviews', handler(async (req, res) => {
    const actor = authenticated(req)
    res.status(201).json(await transact(req, 'review', req.body, db => {
      const order = db.orders.find(o => same(o.id, req.body.orderId))
      requireThat(order?.status === 'completed' && same(order.userId, actor.id) && order.items.some(i => same(i.productId, req.body.productId)), 'Chỉ người mua đơn hoàn thành được đánh giá', 403)
      requireThat(!db.reviews.some(r => same(r.orderId, order.id) && same(r.productId, req.body.productId) && same(r.userId, actor.id)), 'Bạn đã đánh giá sản phẩm này', 409)
      requireThat(Number.isInteger(req.body.rating) && req.body.rating >= 1 && req.body.rating <= 5 && String(req.body.comment || '').trim(), 'Đánh giá không hợp lệ')
      const review = { id: id(), orderId: order.id, productId: String(req.body.productId), userId: actor.id, userName: actor.fullName, rating: req.body.rating, comment: req.body.comment.trim(), createdAt: new Date().toLocaleDateString('vi-VN') }
      db.reviews.push(review)
      const all = db.reviews.filter(r => same(r.productId, review.productId)), product = db.products.find(p => same(p.id, review.productId))
      product.reviews = all.length; product.rating = Math.round(all.reduce((s, r) => s + Number(r.rating), 0) / all.length)
      return review
    }))
  }))
  for (const collection of ['products', 'categories', 'coupons', 'users']) for (const method of ['post', 'put', 'patch']) app[method](`/${collection}/:id?`, handler(async (req, res) => {
    const actor = authenticated(req)
    if (collection === 'products') staff(actor); else admin(actor)
    const result = await transact(req, `${method}-${collection}`, { id: req.params.id, data: req.body }, db => {
      const rows = db[collection], existing = req.params.id ? rows.find(row => same(row.id, req.params.id)) : null
      requireThat(method === 'post' ? !req.params.id : existing, 'Không tìm thấy dữ liệu', 404)
      const entry = existing || { id: id() }, data = structuredClone(req.body)
      delete data.id
      if (collection === 'products') {
        delete data.quantity; delete data.inventoryMode; delete data.legacyQuantitySnapshot
        if (existing?.variants?.length && data.variants === undefined) {
          for (const key of ['memory', 'displayCamera', 'batteryCharge', 'utilities', 'connection', 'design']) if (existing[key]) {
            data[key] = { ...existing[key] }
          }
          if (data.memory) { data.memory.ram = data.ram ?? existing.ram; data.memory.storage = data.storage ?? existing.storage }
          if (data.displayCamera) { data.displayCamera.display = data.screen ?? existing.screen; data.displayCamera.rearCamera = data.camera ?? existing.camera }
          if (data.batteryCharge) { data.batteryCharge.battery = data.battery ?? existing.battery; data.batteryCharge.charge = data.charge ?? existing.charge }
        }
        if (!existing && !data.variants?.length) data.variants = [{ id: id(), color: 'Mặc định', storage: data.storage || 'Mặc định', price: Number(data.price), oldPrice: Number(data.oldPrice || data.price), image: data.image, warrantyMonths: 12, status: 'active' }]
        if (data.variants) {
          const variantIds = new Set()
          for (const variant of data.variants) {
            variant.id ||= id(); variant.id = String(variant.id); delete variant.quantity
            requireThat(!variantIds.has(variant.id) && variant.color?.trim() && variant.storage?.trim() && Number.isFinite(variant.price) && variant.price >= 0 && Number.isInteger(variant.warrantyMonths) && variant.warrantyMonths >= 1 && variant.warrantyMonths <= 120, 'Phiên bản/giá/bảo hành không hợp lệ')
            variantIds.add(variant.id)
          }
          requireThat(!existing?.variants?.some(v => !variantIds.has(String(v.id))), 'Ngừng bán phiên bản thay vì xóa')
          for (const old of existing?.variants || []) {
            const next = data.variants.find(v => same(v.id, old.id))
            requireThat(!db.devices.some(d => same(d.productId, existing.id) && same(d.variantId, old.id)) || (old.color === next.color && old.storage === next.storage), 'Phiên bản có máy không được đổi màu/dung lượng')
          }
        }
        requireThat(data.price === undefined || (Number.isFinite(data.price) && data.price >= 0), 'Giá sản phẩm không hợp lệ')
        Object.assign(entry, data, { inventoryMode: 'imei' })
      } else if (collection === 'users') {
        Object.assign(entry, data); validateUser(db, entry, entry.id)
        requireThat(db.users.some(u => !same(u.id, entry.id) && u.role === 'admin' && u.status === 'active') || (entry.role === 'admin' && entry.status === 'active'), 'Phải giữ ít nhất một admin hoạt động')
      } else {
        Object.assign(entry, data)
        if (collection === 'coupons') requireThat(entry.code?.trim() && Number.isFinite(entry.discount) && entry.discount > 0 && (entry.discountType === 'amount' || entry.discount <= 100), 'Mã giảm giá không hợp lệ')
      }
      if (!existing) rows.push(entry)
      return entry
    })
    res.json(result)
  }))
  // Public read-only REST routes retain json-server behavior. No /db or write bypass.
  app.use((req, res, next) => {
    if (req.method !== 'GET' || !/^\/(categories|reviews|coupons)(\/[^/]+)?$/.test(req.path)) return res.status(404).json({ message: 'Endpoint không khả dụng; dùng lệnh nghiệp vụ' })
    if (req.query._expand || req.query._embed) return res.status(400).json({ message: 'Không hỗ trợ truy vấn mở rộng quan hệ tại endpoint công khai' })
    const router = jsonServer.router(structuredClone({ categories: store.state.categories, reviews: store.state.reviews, coupons: store.state.coupons }))
    router(req, res, next)
  })
  app.use((error, req, res, next) => { void next; res.status(error.status || 500).json({ message: error.status ? error.message : 'Không thể lưu thao tác; vui lòng thử lại' }) })
  return app
}
if (require.main === module) {
  const file = path.resolve(__dirname, '../db.json'), initial = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (initial.inventoryMeta?.schemaVersion !== 2) throw new Error('Chạy npm run migrate:imei -- --apply trước khi khởi động')
  // Exclusive lock prevents a second managed process from writing the same file.
  const lock = file + '.lock'
  try { fs.writeFileSync(lock, String(process.pid), { flag: 'wx' }) } catch (error) { throw new Error('db.json đang bị khóa. Kiểm tra tiến trình server trước khi xử lý db.json.lock.', { cause: error }) }
  const release = () => { try { fs.unlinkSync(lock) } catch { /* Lock may already be removed during shutdown. */ } }
  process.on('exit', release)
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => process.exit(0))
  createApp(createStore(initial, file)).listen(Number(process.env.PORT || 3000), '127.0.0.1', () => console.log('TechMobile json-server: http://localhost:' + (process.env.PORT || 3000)))
}
module.exports = { createApp }
