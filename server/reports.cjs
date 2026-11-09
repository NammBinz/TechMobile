// Calendar buckets use Vietnam time; never substitute createdAt for completedAt/paidAt.
function day(value) {
  if (!value) return null
  const text = String(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const date = new Date(text + 'T00:00:00Z')
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === text ? text : null
  }
  const parts = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (parts) return day(`${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}`)
  if (!text.includes('T')) return null
  const time = Date.parse(text)
  return Number.isFinite(time) ? new Date(time + 7 * 3600000).toISOString().slice(0, 10) : null
}
const finiteMoney = value => typeof value === 'number' && Number.isFinite(value) && value >= 0
function report(db, query = {}) {
  const { requireThat } = require('./domain.cjs')
  const from = query.from || null, to = query.to || null
  requireThat((!from || day(from) === from) && (!to || day(to) === to) && (!from || !to || from <= to), 'Khoảng ngày không hợp lệ')
  const within = value => value && (!from || value >= from) && (!to || value <= to)
  const rows = [], unknownDates = [], payments = [], unknownPayments = [], top = new Map(), monthly = new Map()
  for (const order of db.orders) {
    if (order.status === 'completed') {
      const date = day(order.completedAt)
      const snapshots = order.items.flatMap(i => i.deviceSnapshots || [])
      const expected = order.items.reduce((s, i) => s + i.quantity, 0)
      const known = snapshots.filter(s => finiteMoney(s.costSnapshot))
      const simulatedCostDevices = known.filter(s => s.costSnapshotSource?.type === 'demo_backfill').length
      const costTotal = known.reduce((s, i) => s + i.costSnapshot, 0)
      const missingCostDevices = Math.max(0, expected - known.length)
      const row = { orderId: order.id, date, revenue: Number(order.totalPrice || 0), quantity: expected, costTotal, simulatedCostDevices, missingCostDevices, grossProfit: missingCostDevices ? null : Number(order.totalPrice || 0) - costTotal }
      if (!date) unknownDates.push(row)
      else if (within(date)) {
        rows.push(row)
        const month = date.slice(0, 7), bucket = monthly.get(month) || { month, revenue: 0, orders: 0 }
        bucket.revenue += row.revenue; bucket.orders++; monthly.set(month, bucket)
        for (const item of order.items) {
          const key = JSON.stringify([String(item.productId), String(item.variantId || '')])
          const entry = top.get(key) || { productId: item.productId, variantId: item.variantId, name: item.name, color: item.color, storage: item.storage, ram: item.ram, quantity: 0 }
          entry.quantity += item.quantity; top.set(key, entry)
        }
      }
    }
    const entries = (order.paymentHistory || []).filter(h => ['paid', 'unpaid'].includes(h.status) && h.status !== h.previousStatus)
    const ledger = entries.length ? entries.map(h => ({ at: h.at, amount: typeof h.amount === 'number' ? h.amount : h.status === 'paid' ? Number(order.totalPrice || 0) : h.previousStatus === 'paid' ? -Number(order.totalPrice || 0) : 0, demo: String(h.action || '').includes('demo') || String(h.action || '').includes('owner_requested'), source: h.action })) : order.paymentStatus === 'paid' ? [{ at: order.paidAt, amount: Number(order.totalPrice || 0), demo: order.paymentStatusSource === 'demo_adjustment', source: order.paidBy || 'legacy' }] : []
    for (const entry of ledger) {
      const row = { orderId: order.id, date: day(entry.at), ...entry }
      if (!row.date) unknownPayments.push(row)
      else if (within(row.date)) payments.push(row)
    }
  }
  const missingCostOrders = rows.filter(r => r.missingCostDevices).length
  const states = {}, devices = {}
  for (const order of db.orders) states[order.status] = (states[order.status] || 0) + 1
  for (const device of db.devices.filter(d => !d.historicalOnly)) devices[device.status] = (devices[device.status] || 0) + 1
  const knownEvents = [...db.orders.flatMap(o => [o.completedAt, o.createdAtIso, o.createdAt, o.paidAt]), ...payments.map(p => p.at)].map(day).filter(Boolean)
  const years = [...new Set(knownEvents.map(d => d.slice(0, 4)))].sort().reverse()
  return { from, to, rows, unknownDates, payments, unknownPayments, monthly: [...monthly.values()].sort((a, b) => a.month.localeCompare(b.month)), topVariants: [...top.values()].sort((a, b) => b.quantity - a.quantity), years,
    totals: { revenue: rows.reduce((s, r) => s + r.revenue, 0), completedOrders: rows.length, costTotal: rows.reduce((s, r) => s + r.costTotal, 0), missingCostOrders, simulatedCostDevices: rows.reduce((s, r) => s + r.simulatedCostDevices, 0), missingCostDevices: rows.reduce((s, r) => s + r.missingCostDevices, 0), grossProfit: missingCostOrders ? null : rows.reduce((s, r) => s + r.grossProfit, 0), paymentRecorded: payments.filter(p => !p.demo).reduce((s, r) => s + r.amount, 0), demoPaymentRecorded: payments.filter(p => p.demo).reduce((s, r) => s + r.amount, 0) },
    current: { states, devices, products: db.products.length, customers: db.users.filter(u => u.role === 'customer').length, openClaims: db.warrantyClaims.filter(c => !['returned', 'rejected'].includes(c.status)).length, lowStock: require('./domain.cjs').projectProducts(db).flatMap(p => p.variants.filter(v => p.status === 'active' && v.status !== 'inactive' && v.quantity <= 5).map(v => ({ productId: p.id, name: p.name, variantId: v.id, color: v.color, storage: v.storage, ram: v.ram || p.ram, quantity: v.quantity }))) },
    latestOrders: [...db.orders].sort((a, b) => String(b.createdAtIso || '').localeCompare(String(a.createdAtIso || ''))).slice(0, 5).map(o => ({ id: o.id, status: o.status, totalPrice: o.totalPrice })) }
}
function timeline(order) {
  const events = [...(order.history || [])]
  const add = (event, at, to) => { if (at && !events.some(e => (event === 'transition' ? e.event === event && e.to === to : e.event === event))) events.push({ id: `legacy-${event}-${to || ''}`, event, at, to, legacy: true, actorRole: null }) }
  add('placed', order.createdAtIso || order.createdAt, 'pending')
  for (const [field, to] of [['confirmedAt', 'confirmed'], ['shippedAt', 'shipping'], ['deliveredAt', 'delivered'], ['completedAt', 'completed'], ['cancelledAt', 'cancelled']]) add(to === 'cancelled' ? 'cancel' : 'transition', order[field], to)
  for (const payment of order.paymentHistory || []) {
    if (!['paid', 'unpaid'].includes(payment.status) || events.some(e => e.event === 'payment' && e.at === payment.at)) continue
    const actor = events.find(e => e.at === payment.at && e.actorId === payment.actorId)
    events.push({ id: `payment-${events.length}`, event: 'payment', at: payment.at, actorId: payment.actorId || null, actorRole: actor?.actorRole || null, legacy: !payment.actorId, note: (payment.status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán') + (String(payment.action || '').includes('owner_requested') ? ' · Điều chỉnh dữ liệu demo, không xác minh giao dịch.' : '') })
  }
  // Unknown timestamps stay visible as unknown; do not invent an event for missing stages.
  return events.sort((a, b) => {
    const x = day(a.at), y = day(b.at)
    return String(x || '9999').localeCompare(String(y || '9999')) || String(a.at).localeCompare(String(b.at))
  })
}
function deviceProfile(db, imei) {
  const device = db.devices.find(d => d.imei === imei)
  if (!device) return null
  const orders = db.orders.filter(o => o.items.some(i => i.deviceSnapshots?.some(s => s.deviceId === device.id)) || String(device.assignment?.orderId) === String(o.id) || device.assignmentHistory?.some(h => String(h.orderId) === String(o.id)))
  const warranties = db.warranties.filter(w => w.deviceId === device.id)
  const product = db.products.find(p => String(p.id) === String(device.productId)), variant = product?.variants.find(v => String(v.id) === String(device.variantId))
  return { device, product: product?.name, variant: variant && { ...variant, ram: variant.ram || product.ram }, receipt: (db.purchaseReceipts || []).find(r => r.id === device.receiptId) || null,
    orders: orders.map(o => ({ id: o.id, status: o.status, userId: o.userId, history: timeline(o), snapshots: o.items.flatMap(i => i.deviceSnapshots || []).filter(s => s.deviceId === device.id) })), warranties, claims: db.warrantyClaims.filter(c => warranties.some(w => w.id === c.warrantyId)) }
}
module.exports = { report, day, timeline, deviceProfile }
