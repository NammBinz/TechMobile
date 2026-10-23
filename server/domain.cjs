const { randomUUID, randomInt } = require('node:crypto')

const id = () => randomUUID()
const same = (a, b) => String(a) === String(b)
const now = () => new Date().toISOString()
const fail = (message, status = 400) => { const error = new Error(message); error.status = status; throw error }
const requireThat = (condition, message, status) => { if (!condition) fail(message, status) }
const staff = user => requireThat(['admin', 'staff'].includes(user?.role), 'Bạn không có quyền thao tác', 403)
const admin = user => requireThat(user?.role === 'admin', 'Chỉ quản trị viên được thao tác', 403)
const productOf = (db, productId) => db.products.find(p => same(p.id, productId))
const variantOf = (db, productId, variantId) => productOf(db, productId)?.variants?.find(v => same(v.id, variantId))
const orderOf = (db, orderId) => { const order = db.orders.find(o => same(o.id, orderId)); requireThat(order, 'Không tìm thấy đơn', 404); return order }
const owns = (user, order) => requireThat(['admin', 'staff'].includes(user.role) || same(order.userId, user.id), 'Không có quyền xem đơn này', 403)
const integer = value => Number.isSafeInteger(value) && value > 0
const held = item => ['held', 'allocated'].includes(item.inventoryState)

function checksum(prefix) {
  let sum = 0
  for (let i = 0; i < 14; i++) { let digit = Number(prefix[i]); if (i % 2) { digit *= 2; if (digit > 9) digit -= 9 } sum += digit }
  return String((10 - sum % 10) % 10)
}
function validImei(value) { return typeof value === 'string' && /^\d{15}$/.test(value) && checksum(value.slice(0, 14)) === value[14] }
function demoImei(used) {
  let imei
  do { const prefix = '99' + Array.from({ length: 12 }, () => randomInt(10)).join(''); imei = prefix + checksum(prefix) } while (used.has(imei))
  used.add(imei)
  return imei
}
function availability(db, productId, variantId) {
  const available = db.devices.filter(d => same(d.productId, productId) && same(d.variantId, variantId) && d.status === 'available').length
  let holds = 0
  for (const order of db.orders) for (const item of order.items || []) {
    if (order.status === 'cancelled' || !held(item) || !same(item.productId, productId) || !same(item.variantId, variantId)) continue
    const assigned = db.devices.filter(d => d.status === 'allocated' && same(d.assignment?.orderId, order.id) && same(d.assignment?.orderItemId, item.id)).length
    holds += item.quantity - assigned
  }
  return { available, unallocatedHolds: holds, sellable: available - holds }
}
function projectProducts(db) {
  return db.products.map(product => {
    const variants = (product.variants || []).map(variant => ({ ...variant, quantity: availability(db, product.id, variant.id).sellable }))
    const active = variants.filter(variant => variant.status !== 'inactive')
    const cheapest = [...active].sort((a, b) => a.price - b.price)[0]
    return { ...product, variants, price: cheapest?.price ?? product.price, oldPrice: cheapest?.oldPrice ?? product.oldPrice, quantity: active.reduce((sum, variant) => sum + variant.quantity, 0) }
  })
}
function monthsAfter(iso, months) {
  const start = new Date(iso), result = new Date(iso), day = start.getUTCDate()
  result.setUTCDate(1); result.setUTCMonth(result.getUTCMonth() + months)
  const last = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()
  result.setUTCDate(Math.min(day, last))
  return result.toISOString()
}
function issueWarranty(db, device, order, item, startsAt, estimated = false) {
  const previous = db.warranties.find(w => same(w.deviceId, device.id) && same(w.orderId, order.id))
  if (previous) return previous
  const warranty = { id: id(), deviceId: device.id, orderId: String(order.id), orderItemId: item.id, customerId: String(order.userId), imeiSnapshot: device.imei, durationMonths: item.warrantyMonths || 12, startsAt, endsAt: monthsAfter(startsAt, item.warrantyMonths || 12), status: 'issued', dateEstimated: estimated, policyVersion: 'store-v1' }
  db.warranties.push(warranty)
  return warranty
}
function invariant(db) {
  for (const collection of ['users', 'products', 'orders', 'warranties', 'warrantyClaims']) {
    const ids = new Set()
    for (const entity of db[collection]) { requireThat(entity.id !== undefined && !ids.has(String(entity.id)), 'ID dữ liệu bị thiếu hoặc trùng'); ids.add(String(entity.id)) }
  }
  const imeis = new Set(), ids = new Set(), states = ['available', 'allocated', 'shipping', 'sold', 'return_pending', 'quarantine', 'retired']
  for (const device of db.devices) {
    requireThat(validImei(device.imei) && !imeis.has(device.imei), 'IMEI không hợp lệ hoặc bị trùng')
    requireThat(!ids.has(device.id) && states.includes(device.status), 'Máy hoặc trạng thái không hợp lệ')
    requireThat(variantOf(db, device.productId, device.variantId), 'Máy tham chiếu phiên bản không tồn tại')
    requireThat(!Object.hasOwn(device, 'secondaryImeis'), 'Mỗi máy chỉ có một IMEI')
    imeis.add(device.imei); ids.add(device.id)
    if (['allocated', 'shipping', 'sold', 'return_pending'].includes(device.status)) {
      const order = orderOf(db, device.assignment?.orderId)
      const item = order.items.find(i => same(i.id, device.assignment?.orderItemId))
      requireThat(item && same(order.userId, device.assignment.customerId) && same(item.productId, device.productId) && same(item.variantId, device.variantId), 'Liên kết máy/đơn/khách không hợp lệ')
    } else requireThat(!device.assignment, 'Máy trong kho không được giữ liên kết phân bổ')
  }
  for (const product of db.products) {
    const variantIds = new Set()
    for (const variant of product.variants || []) {
      requireThat(variant.id && !variantIds.has(String(variant.id)), 'Trùng ID phiên bản trong sản phẩm')
      variantIds.add(String(variant.id))
      requireThat(availability(db, product.id, variant.id).sellable >= 0, 'Tồn kho không đủ cho số máy của các đơn đang xử lí', 409)
    }
  }
  for (const order of db.orders) {
    requireThat(db.users.some(user => same(user.id, order.userId)), 'Đơn tham chiếu tài khoản không tồn tại')
    const lines = new Set()
    for (const item of order.items || []) {
      if (item.inventoryMode !== 'imei') continue
      requireThat(item.id && !lines.has(item.id) && integer(item.quantity), 'Dòng đơn không hợp lệ'); lines.add(item.id)
      requireThat(variantOf(db, item.productId, item.variantId), 'Phiên bản của đơn không tồn tại')
      const assigned = db.devices.filter(d => same(d.assignment?.orderId, order.id) && same(d.assignment?.orderItemId, item.id))
      requireThat(assigned.length <= item.quantity, 'Phân bổ vượt số lượng đơn')
      if (['shipping', 'delivered', 'completed'].includes(order.status)) requireThat(assigned.length === item.quantity, 'Chưa phân bổ đủ máy')
    }
  }
  const warrantyKeys = new Set()
  for (const w of db.warranties) {
    const device = db.devices.find(d => same(d.id, w.deviceId)), order = orderOf(db, w.orderId)
    const key = JSON.stringify([w.deviceId, w.orderId])
    requireThat(device && device.imei === w.imeiSnapshot && same(order.userId, w.customerId) && order.items.some(i => same(i.id, w.orderItemId) && i.deviceSnapshots?.some(d => same(d.deviceId, w.deviceId))) && !warrantyKeys.has(key), 'Liên kết bảo hành không hợp lệ')
    warrantyKeys.add(key)
  }
  const openClaims = new Set()
  for (const claim of db.warrantyClaims) {
    requireThat(db.warranties.some(w => same(w.id, claim.warrantyId)), 'Phiếu tham chiếu bảo hành không tồn tại')
    if (!['returned', 'rejected'].includes(claim.status)) { requireThat(!openClaims.has(claim.warrantyId), 'Máy đã có phiếu đang xử lý'); openClaims.add(claim.warrantyId) }
  }
}
function checkRevision(entity, expected) { requireThat(Number.isInteger(expected) && expected === (entity.revision || 0), 'Dữ liệu đã thay đổi. Vui lòng tải lại.', 409) }
function recordAssignment(device, actor, event, timestamp) {
  device.assignmentHistory ||= []
  device.assignmentHistory.push({ ...device.assignment, event, at: timestamp, actorId: String(actor.id) })
}
// Build the entire plan before changing any device. The store commits the plan
// and order status together, after validating every other order's holds.
function autoAllocate(db, order, actor, timestamp) {
  const chosen = new Set(), plan = []
  const received = device => Number.isFinite(Date.parse(device.receivedAt)) ? Date.parse(device.receivedAt) : Infinity
  const fifo = (a, b) => (received(a) - received(b)) || (String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0)
  for (const item of order.items) {
    if (item.inventoryMode !== 'imei') continue
    const assigned = db.devices.filter(d => same(d.assignment?.orderId, order.id) && same(d.assignment?.orderItemId, item.id))
    requireThat(assigned.every(d => d.status === 'allocated') && assigned.length <= item.quantity, 'Phân bổ hiện tại không hợp lệ. Vui lòng kiểm tra lại đơn.', 409)
    const stock = availability(db, item.productId, item.variantId)
    requireThat(stock.sellable >= 0, `Không đủ máy cho ${item.name} · ${item.color} · ${item.storage}; cần kiểm tra cả số máy của các đơn khác đang xử lí.`, 409)
    const missing = item.quantity - assigned.length
    const candidates = db.devices.filter(d => d.status === 'available' && same(d.productId, item.productId) && same(d.variantId, item.variantId) && !chosen.has(String(d.id))).sort(fifo).slice(0, missing)
    requireThat(candidates.length === missing, `Không đủ IMEI khả dụng cho ${item.name} · ${item.color} · ${item.storage}. Cần thêm ${missing - candidates.length} máy.`, 409)
    for (const device of candidates) chosen.add(String(device.id))
    plan.push({ item, candidates })
  }
  for (const { item, candidates } of plan) {
    for (const device of candidates) {
      device.status = 'allocated'
      device.assignment = { orderId: String(order.id), orderItemId: item.id, customerId: String(order.userId), allocatedAt: timestamp, allocatedBy: String(actor.id) }
      recordAssignment(device, actor, 'allocated', timestamp)
      device.revision = (device.revision || 0) + 1
    }
    item.inventoryState = 'allocated'
  }
}
function command(db, actor, action, payload) {
  requireThat(actor && actor.status !== 'blocked', 'Phiên đăng nhập không hợp lệ', 401)
  const timestamp = now()
  if (action === 'receive-device') {
    admin(actor)
    const variant = variantOf(db, payload.productId, payload.variantId)
    requireThat(variant, 'Chọn sản phẩm và phiên bản hợp lệ')
    const values = Array.isArray(payload.imeis) ? payload.imeis : [payload.imei]
    requireThat(values.length > 0 && values.length <= 500 && values.every(validImei), 'IMEI phải gồm 15 chữ số và đúng chữ số kiểm tra')
    const simulated = payload.simulatedImeis ?? []
    requireThat(Array.isArray(simulated) && simulated.every(value => values.includes(value)), 'Danh sách IMEI demo không hợp lệ')
    const existing = new Set(db.devices.map(d => d.imei))
    for (const imei of values) { requireThat(!existing.has(imei), 'IMEI đã tồn tại', 409); existing.add(imei) }
    const devices = values.map(imei => ({ id: id(), imei, productId: String(payload.productId), variantId: String(payload.variantId), status: 'available', assignment: null, receivedAt: timestamp, receivedBy: String(actor.id), origin: simulated.includes(imei) ? 'demo_generated' : 'manual', revision: 0 }))
    db.devices.push(...devices)
    return devices
  }
  if (action === 'device-status') {
    admin(actor)
    const device = db.devices.find(d => same(d.id, payload.deviceId))
    requireThat(device, 'Không tìm thấy máy', 404); checkRevision(device, payload.expectedRevision)
    requireThat(['available', 'quarantine', 'retired'].includes(device.status) && ['available', 'quarantine', 'retired'].includes(payload.status), 'Không thể thay đổi máy đã phân bổ/bán')
    requireThat(String(payload.reason || '').trim(), 'Cần ghi lý do thay đổi')
    device.status = payload.status; device.revision++; device.lastReason = payload.reason.trim()
    return device
  }
  if (action === 'place') {
    requireThat(Array.isArray(payload.items) && payload.items.length > 0 && payload.items.length <= 100, 'Giỏ hàng không hợp lệ')
    const combined = new Map()
    for (const input of payload.items) {
      requireThat(integer(input.quantity), 'Số lượng phải là số nguyên dương')
      const key = JSON.stringify([String(input.productId), String(input.variantId)])
      const prior = combined.get(key)
      combined.set(key, { productId: input.productId, variantId: input.variantId, quantity: (prior?.quantity || 0) + input.quantity })
    }
    const items = [...combined.values()].map(input => {
      const product = productOf(db, input.productId), variant = variantOf(db, input.productId, input.variantId)
      requireThat(product?.status === 'active' && variant && variant.status !== 'inactive', 'Sản phẩm/phiên bản không còn bán')
      requireThat(availability(db, product.id, variant.id).sellable >= input.quantity, 'Không đủ máy khả dụng', 409)
      requireThat(Number.isFinite(variant.price) && variant.price >= 0, 'Giá phiên bản không hợp lệ')
      return { id: id(), productId: String(product.id), variantId: String(variant.id), name: product.name, color: variant.color, storage: variant.storage, price: variant.price, oldPrice: variant.oldPrice || variant.price, image: variant.image || product.image, quantity: input.quantity, warrantyMonths: variant.warrantyMonths || 12, inventoryMode: 'imei', inventoryState: 'held', deviceSnapshots: [] }
    })
    const info = payload.shipping || {}
    requireThat(['receiverName', 'phone', 'address'].every(k => typeof info[k] === 'string' && info[k].trim()), 'Nhập đầy đủ thông tin nhận hàng')
    requireThat(['COD', 'BANK'].includes(info.paymentMethod), 'Phương thức thanh toán không hợp lệ')
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    if (payload.expectedTotal !== undefined) requireThat(total === payload.expectedTotal, 'Giá đã thay đổi. Vui lòng kiểm tra lại giỏ hàng.', 409)
    const coupon = payload.couponCode ? db.coupons.find(c => c.code.trim().toLowerCase() === payload.couponCode.trim().toLowerCase() && c.status === 'active') : null
    requireThat(!payload.couponCode || coupon, 'Mã giảm giá không còn hiệu lực', 409)
    const discount = coupon ? Math.min(total, coupon.discountType === 'amount' ? coupon.discount : Math.round(total * coupon.discount / 100)) : 0
    const order = { id: id(), schemaVersion: 2, userId: String(actor.id), customerName: actor.fullName, items, ...Object.fromEntries(['receiverName', 'phone', 'address', 'note', 'paymentMethod'].map(k => [k, String(info[k] || '').trim()])), coupon: coupon ? { code: coupon.code, discountType: coupon.discountType || 'percent', discount: coupon.discount } : null, productTotal: total, productDiscount: items.reduce((s, i) => s + Math.max(0, i.oldPrice - i.price) * i.quantity, 0), couponDiscount: discount, totalPrice: Math.max(0, total - discount), status: 'pending', paymentStatus: 'unpaid', paidAt: null, paidBy: null, createdAt: new Date().toLocaleDateString('vi-VN'), createdAtIso: timestamp, revision: 0 }
    db.orders.push(order)
    return order
  }
  if (['allocate', 'transition', 'cancel', 'accept-return', 'payment'].includes(action)) {
    const order = orderOf(db, payload.orderId)
    owns(actor, order)
    if (action === 'cancel' && order.status === 'cancelled') return order
    checkRevision(order, payload.expectedRevision)
    if (action === 'transition' && payload.status === 'confirmed' && order.status === 'confirmed') {
      staff(actor)
      requireThat(order.items.filter(i => i.inventoryMode === 'imei').every(i => db.devices.filter(d => d.status === 'allocated' && same(d.assignment?.orderId, order.id) && same(d.assignment?.orderItemId, i.id)).length === i.quantity), 'Đơn đã xác nhận chưa đủ máy. Vui lòng kiểm tra phân bổ.', 409)
      return order
    }
    const devices = db.devices.filter(d => same(d.assignment?.orderId, order.id))
    if (action === 'allocate') {
      staff(actor); requireThat(['pending', 'confirmed'].includes(order.status), 'Chỉ phân bổ trước khi giao')
      const item = order.items.find(i => same(i.id, payload.orderItemId))
      requireThat(item && Array.isArray(payload.deviceIds) && payload.deviceIds.length <= item.quantity && new Set(payload.deviceIds).size === payload.deviceIds.length, 'Danh sách máy không hợp lệ')
      requireThat(order.status !== 'confirmed' || payload.deviceIds.length === item.quantity, 'Thay máy của đơn đã xác nhận phải giữ đủ số lượng IMEI', 409)
      for (const deviceId of payload.deviceIds) {
        const device = db.devices.find(d => same(d.id, deviceId))
        requireThat(device && same(device.productId, item.productId) && same(device.variantId, item.variantId) && (device.status === 'available' || (device.status === 'allocated' && same(device.assignment?.orderId, order.id) && same(device.assignment?.orderItemId, item.id))), 'Máy đã được phân bổ hoặc không đúng phiên bản', 409)
      }
      for (const d of devices.filter(d => same(d.assignment.orderItemId, item.id))) { recordAssignment(d, actor, 'released', timestamp); d.status = 'available'; d.assignment = null; d.revision++ }
      for (const deviceId of payload.deviceIds) {
        const device = db.devices.find(d => same(d.id, deviceId))
        device.status = 'allocated'; device.assignment = { orderId: String(order.id), orderItemId: item.id, customerId: String(order.userId), allocatedAt: timestamp, allocatedBy: String(actor.id) }; device.revision++
        recordAssignment(device, actor, 'allocated', timestamp)
      }
      item.inventoryState = payload.deviceIds.length ? 'allocated' : 'held'
    } else if (action === 'cancel') {
      requireThat(order.status !== 'completed' && (actor.role !== 'customer' || order.status === 'pending'), 'Không thể hủy đơn ở trạng thái này', 409)
      requireThat(String(payload.reason || '').trim(), 'Vui lòng nhập lý do hủy')
      const inTransit = ['shipping', 'delivered'].includes(order.status)
      for (const d of devices) { recordAssignment(d, actor, inTransit ? 'return_pending' : 'released', timestamp); d.status = inTransit ? 'return_pending' : 'available'; if (!inTransit) d.assignment = null; d.revision++ }
      for (const item of order.items) item.inventoryState = inTransit ? 'return_pending' : 'released'
      for (const w of db.warranties.filter(w => same(w.orderId, order.id))) w.status = 'suspended'
      order.status = 'cancelled'; order.cancelReason = payload.reason.trim(); order.cancelledBy = actor.role === 'customer' ? 'customer' : 'admin'; order.cancelledByUserId = String(actor.id); order.cancelledAt = timestamp
    } else if (action === 'accept-return') {
      staff(actor); requireThat(order.status === 'cancelled', 'Đơn chưa hủy')
      const device = devices.find(d => same(d.id, payload.deviceId))
      requireThat(device?.status === 'return_pending', 'Máy không đang chờ nhận lại', 409)
      recordAssignment(device, actor, 'returned', timestamp)
      device.status = 'quarantine'; device.assignment = null; device.returnedAt = timestamp; device.revision++
      for (const w of db.warranties.filter(w => same(w.deviceId, device.id) && same(w.orderId, order.id))) { w.status = 'void'; w.voidReason = 'Đã nhận lại máy từ đơn hủy' }
      for (const item of order.items) if (!db.devices.some(d => same(d.assignment?.orderId, order.id) && same(d.assignment?.orderItemId, item.id))) item.inventoryState = 'returned'
    } else if (action === 'payment') {
      staff(actor); requireThat(order.paymentMethod === 'BANK' && order.status !== 'cancelled', 'Không thể đổi thanh toán của đơn này')
      requireThat(['paid', 'unpaid'].includes(payload.status), 'Trạng thái thanh toán không hợp lệ')
      order.paymentStatus = payload.status; order.paidAt = payload.status === 'paid' ? timestamp : null; order.paidBy = payload.status === 'paid' ? String(actor.id) : null
    } else {
      const next = { pending: 'confirmed', confirmed: 'shipping', shipping: 'delivered', delivered: 'completed' }[order.status]
      requireThat(next && payload.status === next, 'Bước chuyển trạng thái không hợp lệ', 409)
      if (next === 'completed') requireThat(same(actor.id, order.userId), 'Chỉ khách mua được xác nhận nhận hàng', 403)
      else staff(actor)
      if (next === 'confirmed') autoAllocate(db, order, actor, timestamp)
      if (next === 'shipping') {
        for (const item of order.items) {
          const allocated = devices.filter(d => same(d.assignment.orderItemId, item.id) && d.status === 'allocated')
          requireThat(allocated.length === item.quantity, 'Phải phân bổ đủ IMEI trước khi giao', 409)
          item.deviceSnapshots = allocated.map(d => ({ deviceId: d.id, imei: d.imei, simulated: ['demo_migration', 'demo_generated'].includes(d.origin) }))
          item.inventoryState = 'shipped'
        }
        for (const d of devices) { d.status = 'shipping'; d.shippedAt = timestamp; d.revision++ }
      }
      if (next === 'delivered') {
        order.deliveredAt = timestamp
        for (const d of devices) { d.status = 'sold'; d.deliveredAt = timestamp; d.revision++; issueWarranty(db, d, order, order.items.find(i => same(i.id, d.assignment.orderItemId)), timestamp) }
        for (const item of order.items) item.inventoryState = 'fulfilled'
      }
      if (next === 'completed') {
        order.completedAt = timestamp
        if (order.paymentMethod === 'COD') { order.paymentStatus = 'paid'; order.paidAt = timestamp; order.paidBy = 'customer_cod' }
      }
      order.status = next
    }
    order.revision = (order.revision || 0) + 1
    return order
  }
  if (action === 'create-claim') {
    staff(actor)
    const w = db.warranties.find(w => same(w.id, payload.warrantyId))
    requireThat(w?.status === 'issued', 'Bảo hành không khả dụng')
    requireThat(timestamp >= w.startsAt && timestamp < w.endsAt, 'Máy đã hết hạn hoặc chưa bắt đầu bảo hành')
    requireThat(String(payload.issue || '').trim(), 'Nhập tình trạng máy')
    requireThat(!db.warrantyClaims.some(c => same(c.warrantyId, w.id) && !['returned', 'rejected'].includes(c.status)), 'Máy đang có phiếu chưa đóng', 409)
    const claim = { id: id(), warrantyId: w.id, status: 'received', reportedIssue: payload.issue.trim(), receivedAt: timestamp, receivedBy: String(actor.id), revision: 0, history: [{ status: 'received', at: timestamp, actorId: String(actor.id), note: payload.issue.trim() }] }
    db.warrantyClaims.push(claim)
    return claim
  }
  if (action === 'transition-claim') {
    staff(actor)
    const claim = db.warrantyClaims.find(c => same(c.id, payload.claimId))
    requireThat(claim, 'Không tìm thấy phiếu', 404); checkRevision(claim, payload.expectedRevision)
    const next = { received: ['inspecting', 'rejected'], inspecting: ['repairing', 'rejected'], repairing: ['ready'], ready: ['returned'] }
    requireThat(next[claim.status]?.includes(payload.status), 'Bước xử lý phiếu không hợp lệ')
    requireThat(String(payload.note || '').trim(), 'Nhập nội dung xử lý')
    claim.status = payload.status; claim.revision++; claim.history.push({ status: payload.status, at: timestamp, actorId: String(actor.id), note: payload.note.trim() })
    return claim
  }
  fail('Lệnh không tồn tại', 404)
}
module.exports = { id, same, now, fail, requireThat, staff, admin, validImei, demoImei, availability, projectProducts, monthsAfter, issueWarranty, invariant, command, variantOf, productOf }
