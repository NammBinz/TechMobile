const fs = require('node:fs')
const path = require('node:path')
const { id, same, now, demoImei, issueWarranty, invariant, requireThat } = require('../server/domain.cjs')
const { writeSnapshot } = require('../server/store.cjs')

function dateIso(value) {
  if (!value) return null
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split('/').map(Number)
    return new Date(Date.UTC(year, month - 1, day)).toISOString()
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}
function migrate(input) {
  const db = structuredClone(input)
  if (db.inventoryMeta?.schemaVersion === 2) { invariant(db); return { db, changed: false } }
  requireThat(!db.devices?.length && !db.warranties?.length, 'Có dữ liệu IMEI chưa nhận diện. Dừng để tránh ghi đè.')
  db.devices = []; db.warranties = []; db.warrantyClaims = []; db.inventoryOperations = []
  const used = new Set(), timestamp = now()
  function device(product, variant, status, assignment = null) {
    const entry = { id: id(), imei: demoImei(used), productId: String(product.id), variantId: String(variant.id), status, assignment, origin: 'demo_migration', receivedAt: timestamp, revision: 0 }
    db.devices.push(entry)
    return entry
  }
  for (const product of db.products) {
    if (!product.variants?.length) product.variants = [{ id: id(), color: 'Mặc định', storage: product.storage || product.rom || 'Mặc định', price: product.price, oldPrice: product.oldPrice, image: product.image }]
    product.inventoryMode = 'imei'
    product.legacyQuantitySnapshot = product.quantity
    for (const variant of product.variants) { variant.status ||= 'active'; variant.warrantyMonths ||= 12 }
    requireThat(Number.isSafeInteger(product.quantity) && product.quantity >= 0, 'Tồn cũ không hợp lệ, không thể tự phân bổ')
    for (let i = 0; i < product.quantity; i++) device(product, product.variants[i % product.variants.length], 'available')
  }
  for (const order of db.orders) {
    order.revision ||= 0
    order.schemaVersion = 2
    order.createdAtIso = dateIso(order.createdAt)
    for (const item of order.items) {
      item.id ||= id()
      // Đơn hủy không tạo máy bán hoặc hoàn thêm vào tồn vốn đã lưu.
      if (order.status === 'cancelled') { item.inventoryState = 'released'; continue }
      const product = db.products.find(p => same(p.id, item.productId))
      requireThat(product && Number.isSafeInteger(item.quantity) && item.quantity > 0, 'Dòng đơn cũ không hợp lệ')
      const known = product.variants.find(v => same(v.id, item.variantId))
      const variant = known || product.variants.find(v => (item.name || '').toLowerCase().includes(v.storage.toLowerCase())) || product.variants[0]
      item.variantId = variant.id; item.color = variant.color; item.storage = variant.storage; item.inventoryMode = 'imei'; item.warrantyMonths = variant.warrantyMonths; item.legacyVariantInferred = !known
      item.deviceSnapshots = []
      const sold = ['delivered', 'completed'].includes(order.status)
      item.inventoryState = sold ? 'fulfilled' : order.status === 'shipping' ? 'shipped' : 'allocated'
      for (let i = 0; i < item.quantity; i++) {
        const entry = device(product, variant, sold ? 'sold' : order.status === 'shipping' ? 'shipping' : 'allocated', { orderId: String(order.id), orderItemId: item.id, customerId: String(order.userId), allocatedAt: timestamp, allocatedBy: 'demo_migration' })
        if (sold || order.status === 'shipping') item.deviceSnapshots.push({ deviceId: entry.id, imei: entry.imei, simulated: true })
        if (sold) {
          const recorded = dateIso(order.deliveredAt) || dateIso(order.completedAt)
          const start = recorded || order.createdAtIso
          requireThat(start, 'Thiếu ngày để mô phỏng bảo hành đơn cũ')
          entry.deliveredAt = start
          issueWarranty(db, entry, order, item, start, !recorded)
        }
      }
    }
  }
  db.inventoryMeta = { schemaVersion: 2, migratedAt: timestamp, imeiPolicy: 'one_per_device', generatedImeisAreSimulated: true, legacyStockDistribution: 'round_robin_preserve_product_total', legacyOrderVariants: 'storage_match_or_first_variant', note: 'IMEI ngẫu nhiên và biến thể suy luận theo yêu cầu người dùng cho dữ liệu demo; không xác minh thiết bị thật.' }
  invariant(db)
  return { db, changed: true }
}
if (require.main === module) {
  const file = path.resolve(__dirname, '../db.json'), original = fs.readFileSync(file, 'utf8'), { db, changed } = migrate(JSON.parse(original))
  requireThat(!fs.existsSync(file + '.lock'), 'Dừng API server trước khi migration')
  const report = { changed, products: db.products.length, devices: db.devices.length, availableDevices: db.devices.filter(d => d.status === 'available').length, warranties: db.warranties.length, inferredOrderLines: db.orders.flatMap(o => o.items).filter(i => i.legacyVariantInferred).length }
  if (changed && process.argv.includes('--apply')) {
    const directory = path.resolve(__dirname, '../backups'); fs.mkdirSync(directory, { recursive: true })
    const backup = path.join(directory, `db-before-imei-${Date.now()}.json`)
    fs.writeFileSync(backup, original, { flag: 'wx', mode: 0o600 })
    writeSnapshot(file, db)
    report.backup = path.relative(path.resolve(__dirname, '..'), backup)
  }
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'dry-run', ...report }, null, 2))
}
module.exports = { migrate, dateIso }
