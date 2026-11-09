// Additive purchasing commands. All mutations run inside the existing store transaction.
const { findEntity, nextEntityId } = require('./entity-ids.cjs')
const helpers = () => require('./domain.cjs')
const money = value => Number.isSafeInteger(value) && value >= 0
function collections(db) { db.suppliers ||= []; db.purchaseReceipts ||= [] }
function receiptCommand(db, actor, action, payload) {
  const { admin, requireThat, same, now, id, validImei, variantOf, productOf } = helpers()
  admin(actor); collections(db)
  const at = now(), reason = String(payload.reason || '').trim()
  const revision = entity => requireThat(Number.isInteger(payload.expectedRevision) && payload.expectedRevision === entity.revision, 'Dữ liệu đã thay đổi. Vui lòng tải lại.', 409)
  if (action === 'save-supplier') {
    const existing = payload.id && findEntity(db, 'suppliers', payload.id)
    requireThat(!payload.id || existing, 'Không tìm thấy nhà cung cấp', 404)
    if (existing) revision(existing)
    requireThat(typeof payload.name === 'string' && payload.name.trim(), 'Nhập tên nhà cung cấp')
    requireThat(['active', 'inactive'].includes(payload.status || 'active'), 'Trạng thái không hợp lệ')
    const supplier = existing || { id: nextEntityId(db), revision: 0, createdAt: at }
    Object.assign(supplier, { name: payload.name.trim(), phone: String(payload.phone || '').trim(), address: String(payload.address || '').trim(), note: String(payload.note || '').trim(), status: payload.status || 'active', updatedAt: at })
    supplier.revision++
    if (!existing) db.suppliers.push(supplier)
    return supplier
  }
  if (action === 'set-device-cost') {
    const device = db.devices.find(d => same(d.id, payload.deviceId))
    requireThat(device && !device.historicalOnly, 'Máy không hợp lệ để bổ sung giá vốn')
    revision(device)
    requireThat(money(payload.purchaseCost) && reason, 'Nhập giá vốn nguyên không âm và lý do')
    device.costHistory ||= []
    device.costHistory.push({ at, actorId: String(actor.id), previousCost: device.purchaseCost ?? null, purchaseCost: payload.purchaseCost, reason })
    device.purchaseCost = payload.purchaseCost; device.purchaseCostSource = { type: 'manual', at, actorId: String(actor.id) }; device.revision++
    // Fill unknown costs explicitly; never replace a known shipping cost snapshot.
    for (const order of db.orders) {
      let changed = false
      for (const item of order.items) for (const snapshot of item.deviceSnapshots || []) {
        if (same(snapshot.deviceId, device.id) && snapshot.costSnapshot == null) { snapshot.costSnapshot = payload.purchaseCost; snapshot.costSnapshotSource = device.purchaseCostSource; changed = true }
      }
      if (changed) {
        order.history ||= []
        order.history.push({ id: id(), event: 'cost-backfilled', at, actorId: String(actor.id), actorRole: actor.role, note: reason })
        order.revision = (order.revision || 0) + 1
      }
    }
    return device
  }
  if (action === 'save-receipt') {
    const existing = payload.id && findEntity(db, 'purchaseReceipts', payload.id)
    requireThat(!payload.id || existing, 'Không tìm thấy phiếu nhập', 404)
    if (existing) { revision(existing); requireThat(existing.status === 'draft', 'Phiếu đã xác nhận không sửa trực tiếp', 409) }
    const supplier = payload.supplierId ? (findEntity(db, 'suppliers', payload.supplierId)?.status === 'active' ? findEntity(db, 'suppliers', payload.supplierId) : null) : null
    requireThat(!payload.supplierId || supplier, 'Nhà cung cấp đã ngừng hoặc không tồn tại')
    requireThat(Array.isArray(payload.lines) && payload.lines.length > 0 && payload.lines.length <= 100, 'Thêm từ 1 đến 100 dòng nhập')
    const receivedAt = payload.receivedAt || at
    requireThat(typeof receivedAt === 'string' && Number.isFinite(Date.parse(receivedAt)) && Date.parse(receivedAt) <= Date.now(), 'Ngày nhập không hợp lệ hoặc trong tương lai')
    const lines = payload.lines.map(line => {
      const variant = variantOf(db, line.productId, line.variantId), product = productOf(db, line.productId)
      requireThat(variant && Array.isArray(line.imeis) && line.imeis.length <= 500 && line.imeis.every(v => typeof v === 'string'), 'Chọn phiên bản và danh sách IMEI hợp lệ')
      const unitCost = line.unitCost === '' || line.unitCost == null ? null : line.unitCost
      requireThat(unitCost === null || money(unitCost), 'Giá nhập phải là số nguyên không âm hoặc để trống')
      const simulatedImeis = line.simulatedImeis || []
      requireThat(Array.isArray(simulatedImeis) && simulatedImeis.every(v => line.imeis.includes(v)), 'IMEI demo không thuộc dòng nhập')
      return { id: id(), productId: String(product.id), variantId: String(variant.id), name: product.name, color: variant.color, ram: variant.ram || product.ram || '', storage: variant.storage, unitCost, imeis: line.imeis.map(v => v.trim()), simulatedImeis }
    })
    const receipt = existing || { id: nextEntityId(db), status: 'draft', revision: 0, createdAt: at, createdBy: String(actor.id), history: [] }
    Object.assign(receipt, { supplierId: supplier?.id || null, supplierName: supplier?.name || null, receivedAt: new Date(receivedAt).toISOString(), note: String(payload.note || '').trim(), lines, updatedAt: at })
    receipt.revision++
    receipt.history.push({ at, actorId: String(actor.id), event: 'draft-saved' })
    if (!existing) db.purchaseReceipts.push(receipt)
    return receipt
  }
  const receipt = findEntity(db, 'purchaseReceipts', payload.receiptId)
  requireThat(receipt, 'Không tìm thấy phiếu nhập', 404)
  if (action === 'confirm-receipt' && receipt.status === 'confirmed') return receipt
  revision(receipt)
  if (action === 'confirm-receipt') {
    requireThat(receipt.status === 'draft', 'Phiếu không còn là nháp')
    requireThat(!receipt.supplierId || db.suppliers.some(s => same(s.id, receipt.supplierId) && s.status === 'active'), 'Nhà cung cấp đã ngừng sử dụng')
    const all = receipt.lines.flatMap(l => l.imeis), used = new Set(db.devices.map(d => d.imei))
    requireThat(all.length > 0 && all.length <= 500 && receipt.lines.every(l => l.imeis.length > 0), 'Mỗi dòng cần IMEI, tối đa 500 máy/phiếu')
    for (const imei of all) {
      requireThat(validImei(imei), 'IMEI phải gồm 15 chữ số và đúng chữ số kiểm tra')
      requireThat(!used.has(imei), 'IMEI đã tồn tại', 409); used.add(imei)
    }
    for (const line of receipt.lines) {
      requireThat(variantOf(db, line.productId, line.variantId), 'Phiên bản không còn tồn tại')
      for (const imei of line.imeis) db.devices.push({ id: id(), imei, productId: line.productId, variantId: line.variantId, status: 'available', assignment: null, receivedAt: receipt.receivedAt, receivedBy: String(actor.id), purchaseCost: line.unitCost, purchaseCostSource: line.unitCost == null ? null : { type: 'receipt', receiptId: receipt.id }, receiptId: receipt.id, receiptLineId: line.id, supplierId: receipt.supplierId, origin: line.simulatedImeis.includes(imei) ? 'demo_generated' : 'manual', revision: 0 })
    }
    receipt.status = 'confirmed'; receipt.confirmedAt = at; receipt.confirmedBy = String(actor.id)
    receipt.history.push({ at, actorId: String(actor.id), event: 'confirmed' })
  } else if (action === 'adjust-receipt') {
    requireThat(receipt.status === 'confirmed' && reason, 'Chỉ điều chỉnh phiếu đã nhập, cần lý do')
    requireThat(Array.isArray(payload.costs) && payload.costs.length > 0, 'Chọn dòng và giá nhập cần điều chỉnh')
    const touched = new Set()
    for (const input of payload.costs) {
      const line = receipt.lines.find(l => same(l.id, input.lineId))
      requireThat(line && !touched.has(line.id) && money(input.unitCost), 'Dòng/giá điều chỉnh không hợp lệ')
      touched.add(line.id)
      const previousCost = line.unitCost
      line.unitCost = input.unitCost
      for (const device of db.devices.filter(d => same(d.receiptId, receipt.id) && same(d.receiptLineId, line.id))) {
        device.costHistory ||= []; device.costHistory.push({ at, actorId: String(actor.id), previousCost: device.purchaseCost, purchaseCost: input.unitCost, reason })
        device.purchaseCost = input.unitCost; device.purchaseCostSource = { type: 'receipt_adjustment', at, receiptId: receipt.id }; device.revision++
      }
      receipt.history.push({ at, actorId: String(actor.id), event: 'cost-adjusted', lineId: line.id, previousCost, unitCost: input.unitCost, reason })
    }
    // Known shipping snapshots stay immutable. Unknown historic snapshots are filled only via set-device-cost.
  } else requireThat(false, 'Lệnh phiếu nhập không hợp lệ')
  receipt.revision++
  return receipt
}
function quickReceive(db, actor, payload) {
  const receipt = receiptCommand(db, actor, 'save-receipt', { supplierId: payload.supplierId, receivedAt: payload.receivedAt, note: 'Nhập nhanh từ trang IMEI', lines: [{ ...payload, unitCost: payload.purchaseCost ?? null, imeis: Array.isArray(payload.imeis) ? payload.imeis : [payload.imei] }] })
  receiptCommand(db, actor, 'confirm-receipt', { receiptId: receipt.id, expectedRevision: receipt.revision })
  return db.devices.filter(d => d.receiptId === receipt.id)
}
function validate(db) {
  const { requireThat, same } = helpers()
  for (const collection of ['suppliers', 'purchaseReceipts']) {
    const ids = new Set()
    for (const entry of db[collection] || []) { requireThat(entry.id && !ids.has(String(entry.id)), 'Trùng ID phiếu/nhà cung cấp'); ids.add(String(entry.id)) }
  }
  for (const device of db.devices) {
    requireThat(device.purchaseCost == null || money(device.purchaseCost), 'Giá vốn không hợp lệ')
    if (device.receiptId) requireThat((db.purchaseReceipts || []).some(r => same(r.id, device.receiptId) && r.status === 'confirmed' && r.lines.some(l => same(l.id, device.receiptLineId) && l.imeis.includes(device.imei))), 'Liên kết máy/phiếu nhập không hợp lệ')
  }
}
const privateKeys = new Set(['purchaseCost', 'costSnapshot', 'costHistory', 'unitCost', 'costTotal', 'grossProfit', 'knownCost', 'profitRevenue', 'missingCostDevices', 'missingCostOrders', 'receiptId', 'receiptLineId', 'supplierId', 'purchaseCostSource', 'costSnapshotSource', 'simulatedCostDevices'])
function redact(value) {
  if (Array.isArray(value)) return value.map(redact)
  if (!value || typeof value !== 'object') return value
  if (value.event === 'cost-backfilled') return { event: 'internal-update', at: value.at, note: 'Cập nhật nội bộ' }
  return Object.fromEntries(Object.entries(value).filter(([key]) => !privateKeys.has(key)).map(([key, entry]) => [key, redact(entry)]))
}
module.exports = { receiptCommand, quickReceive, validate, redact, money }
