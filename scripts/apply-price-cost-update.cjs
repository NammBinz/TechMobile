// Explicit owner-authorized data update. Defaults to dry-run; never runs at startup.
const fs = require('node:fs')
const path = require('node:path')
const { invariant, requireThat } = require('../server/domain.cjs')
const { writeSnapshot } = require('../server/store.cjs')
function update(source, plan) {
  const db = structuredClone(source), at = new Date().toISOString()
  invariant(db)
  if (db.inventoryMeta?.appliedPriceCostBatches?.includes(plan.batchId)) return { db, report: { alreadyApplied: true, changedPrices: 0, generatedCosts: 0, snapshots: 0 } }
  const bases = new Map(), report = { changedPrices: 0, matchedVariants: plan.changes.length, skippedVariants: plan.skipped.length, generatedCosts: 0, historicalOnlyExcluded: 0, snapshots: 0, orders: 0 }
  for (const model of plan.costModels) {
    requireThat(Number.isInteger(model.percent) && model.percent >= 80 && model.percent <= 90, 'Tỷ lệ vốn không hợp lệ')
    const product = db.products.find(p => String(p.id) === model.productId)
    requireThat(product, 'Sản phẩm kế hoạch không còn tồn tại')
    for (const v of model.variants) {
      const current = product.variants.find(x => String(x.id) === v.variantId)
      requireThat(current && current.price === v.basePrice && Number.isSafeInteger(v.basePrice) && v.basePrice > 0, 'Giá đã thay đổi sau khi lập kế hoạch; dừng để tránh ghi đè')
      bases.set(JSON.stringify([model.productId, v.variantId]), { basePrice: v.basePrice, percent: model.percent })
    }
  }
  for (const device of db.devices) {
    if (device.historicalOnly) { report.historicalOnlyExcluded++; continue }
    if (device.purchaseCost != null) continue
    const basis = bases.get(JSON.stringify([String(device.productId), String(device.variantId)]))
    requireThat(basis, 'Không tìm được giá cũ cho máy')
    const cost = Math.round(basis.basePrice * basis.percent / 100 / 1000) * 1000
    device.purchaseCost = cost
    device.purchaseCostSource = { type: 'demo_backfill', batchId: plan.batchId, at, basis: 'sale_price_before_cellphones_update', ...basis }
    device.costHistory ||= []
    device.costHistory.push({ at, actorId: 'owner_requested_demo_cost', previousCost: null, purchaseCost: cost, reason: `Vốn mô phỏng ${basis.percent}% giá bán trước cập nhật, theo yêu cầu chủ dự án`, simulated: true })
    device.revision = (device.revision || 0) + 1; report.generatedCosts++
  }
  for (const order of db.orders) {
    let changed = false
    for (const item of order.items) for (const snapshot of item.deviceSnapshots || []) {
      if (snapshot.costSnapshot != null) continue
      const device = db.devices.find(d => d.id === snapshot.deviceId)
      if (!device || device.historicalOnly || device.purchaseCost == null) continue
      snapshot.costSnapshot = device.purchaseCost
      snapshot.costSnapshotSource = device.purchaseCostSource || { type: 'existing_cost' }
      changed = true; report.snapshots++
    }
    if (changed) {
      order.history ||= []
      order.history.push({ id: `${plan.batchId}:${order.id}`, event: 'cost-backfilled', at, actorId: 'owner_requested_demo_cost', actorRole: 'admin', note: 'Bổ sung giá vốn còn thiếu; vốn mô phỏng được đánh dấu riêng, không thay giá/tổng tiền bán của đơn.' })
      order.revision = (order.revision || 0) + 1; report.orders++
    }
  }
  const touched = new Set()
  for (const change of plan.changes) {
    requireThat(change.sourceUrl.startsWith('https://cellphones.com.vn/') && Number.isSafeInteger(change.price) && change.price > 0, 'Nguồn hoặc giá không hợp lệ')
    const product = db.products.find(p => String(p.id) === change.productId), variant = product?.variants.find(v => String(v.id) === change.variantId)
    requireThat(variant && variant.price === change.previousPrice, 'Phiên bản thay đổi sau kế hoạch')
    const priceSource = { url: change.sourceUrl, title: change.sourceTitle, color: change.sourceColor, observedAt: change.observedAt, sha256: change.sha256, batchId: plan.batchId }
    variant.priceHistory ||= []
    variant.priceHistory.push({ at, previousPrice: variant.price, price: change.price, source: priceSource })
    if (variant.price !== change.price) report.changedPrices++
    variant.price = change.price; variant.priceSource = priceSource; touched.add(product.id)
  }
  for (const product of db.products.filter(p => touched.has(p.id))) {
    const cheapest = product.variants.filter(v => v.status !== 'inactive').sort((a, b) => a.price - b.price)[0]
    if (cheapest) product.price = cheapest.price
    product.revision = (product.revision || 0) + 1
  }
  db.inventoryMeta ||= {}
  db.inventoryMeta.appliedPriceCostBatches ||= []; db.inventoryMeta.appliedPriceCostBatches.push(plan.batchId)
  invariant(db)
  return { db, report }
}
if (require.main === module) {
  const root = path.resolve(__dirname, '..'), file = path.join(root, 'db.json'), apply = process.argv.includes('--apply'), lock = file + '.lock'
  if (apply) fs.writeFileSync(lock, String(process.pid), { flag: 'wx' })
  try {
    const original = fs.readFileSync(file, 'utf8'), plan = JSON.parse(fs.readFileSync(path.join(root, 'backups/CELLPHONES_PRICE_COST_PLAN_2026-11-06.json'), 'utf8'))
    const { db, report } = update(JSON.parse(original), plan)
    if (apply && !report.alreadyApplied) {
      const directory = path.join(root, 'backups'); fs.mkdirSync(directory, { recursive: true })
      const backup = path.join(directory, `db-before-price-cost-${Date.now()}.json`)
      fs.writeFileSync(backup, original, { flag: 'wx', mode: 0o600 }); writeSnapshot(file, db)
      report.backup = path.relative(root, backup)
    }
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', ...report }, null, 2))
  } finally { if (apply) fs.unlinkSync(lock) }
}
module.exports = { update }
