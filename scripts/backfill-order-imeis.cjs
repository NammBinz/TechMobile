// Explicit, one-time demo history repair. Never runs during API startup.
const fs = require('node:fs')
const path = require('node:path')
const { demoImei, id, invariant, requireThat, same, now } = require('../server/domain.cjs')
const { writeSnapshot } = require('../server/store.cjs')

function backfillOrderImeis(source) {
  const db = structuredClone(source), timestamp = now()
  invariant(db)
  const used = new Set(db.devices.map(d => d.imei))
  for (const order of db.orders) for (const item of order.items) for (const snapshot of item.deviceSnapshots || []) used.add(snapshot.imei)
  const report = { orders: 0, lines: 0, imeis: 0, skipped: [] }
  for (const order of db.orders) {
    let changed = false
    for (const item of order.items) {
      const assigned = db.devices.filter(d => same(d.assignment?.orderId, order.id) && same(d.assignment?.orderItemId, item.id))
      if (item.deviceSnapshots?.length || assigned.length) continue
      // Current pending orders must use normal allocation; never invent shipment history.
      if (order.status !== 'cancelled' || item.inventoryState !== 'released') {
        report.skipped.push({ orderId: order.id, itemId: item.id, reason: 'Not a released cancellation' }); continue
      }
      const product = db.products.find(p => same(p.id, item.productId))
      requireThat(product?.variants?.length && Number.isSafeInteger(item.quantity) && item.quantity > 0 && item.id, 'Dòng đơn cũ không hợp lệ')
      const known = product.variants.find(v => same(v.id, item.variantId))
      const variant = known || product.variants.find(v => item.storage ? v.storage === item.storage : String(item.name || '').toLowerCase().includes(v.storage.toLowerCase())) || product.variants[0]
      const snapshots = []
      for (let i = 0; i < item.quantity; i++) {
        const device = { id: id(), imei: demoImei(used), productId: String(product.id), variantId: String(variant.id), status: 'retired', assignment: null, origin: 'demo_order_backfill', historicalOnly: true, sourceOrderId: String(order.id), sourceOrderItemId: String(item.id), createdAt: timestamp, revision: 0 }
        db.devices.push(device)
        snapshots.push({ deviceId: device.id, imei: device.imei, simulated: true, historicalOnly: true })
      }
      item.deviceSnapshots = snapshots
      item.imeiHistorySource = 'demo_backfill'
      item.imeiBackfilledAt = timestamp
      if (!known) { item.variantId = String(variant.id); item.legacyVariantInferred = true }
      report.lines++; report.imeis += snapshots.length; changed = true
    }
    if (changed) { order.revision = (order.revision || 0) + 1; report.orders++ }
  }
  invariant(db)
  return { db, report }
}

if (require.main === module) {
  const file = path.resolve(__dirname, '../db.json'), apply = process.argv.includes('--apply')
  const lock = file + '.lock'
  if (apply) fs.writeFileSync(lock, String(process.pid), { flag: 'wx' })
  try {
    const original = fs.readFileSync(file, 'utf8'), { db, report } = backfillOrderImeis(JSON.parse(original))
    let backup
    if (apply && report.imeis) {
      const directory = path.resolve(__dirname, '../backups'); fs.mkdirSync(directory, { recursive: true })
      backup = path.join(directory, `db-before-order-imei-backfill-${Date.now()}.json`)
      fs.writeFileSync(backup, original, { flag: 'wx', mode: 0o600 })
      writeSnapshot(file, db)
    }
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', ...report, backup: backup && path.relative(path.resolve(__dirname, '..'), backup) }, null, 2))
  } finally { if (apply) fs.unlinkSync(lock) }
}
module.exports = { backfillOrderImeis }
