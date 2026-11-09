const { matchesId } = require('./entity-ids.cjs')
const { validImei, requireThat } = require('./domain.cjs')
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').trim().toLowerCase().replace(/\s+/g, ' ')
const capacity = value => { const text = normalize(value).replace(/\s/g, ''); return /^\d+tb$/.test(text) ? parseInt(text) * 1024 + 'gb' : text }
function preview(db, rows) {
  requireThat(Array.isArray(rows) && rows.length > 0 && rows.length <= 500, 'File cần từ 1 đến 500 máy')
  const seen = new Set(), existing = new Set(db.devices.map(d => d.imei)), results = [], groups = new Map()
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index] || {}, errors = []
    const candidates = db.products.flatMap(p => (p.variants || []).map(v => ({ product: p, variant: v }))).filter(({ product: p, variant: v }) => {
      if (row.productId && !matchesId(p, row.productId)) return false
      if (row.variantId && !matchesId(v, row.variantId)) return false
      if (row.productName && normalize(p.name) !== normalize(row.productName)) return false
      if (row.ram && capacity(v.ram || p.ram) !== capacity(row.ram)) return false
      if (row.storage && capacity(v.storage) !== capacity(row.storage)) return false
      if (row.color && normalize(v.color) !== normalize(row.color)) return false
      return true
    })
    if (!(row.productId && row.variantId) && !(row.productName && row.ram && row.storage && row.color)) errors.push('Cần productId + variantId hoặc tên sản phẩm + RAM + dung lượng + màu')
    if (candidates.length !== 1) errors.push('Không xác định được đúng một phiên bản; kiểm tra ID/tên/RAM/dung lượng/màu')
    const imei = typeof row.imei === 'string' ? row.imei.trim() : ''
    if (!validImei(imei)) errors.push('IMEI phải là Text, đủ 15 chữ số và đúng checksum; không dùng số khoa học')
    if (seen.has(imei)) errors.push('IMEI trùng trong file')
    if (existing.has(imei)) errors.push('IMEI đã có trong kho/lịch sử')
    seen.add(imei)
    const value = row.unitCost
    const unitCost = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value.trim()) : NaN
    if (!Number.isSafeInteger(unitCost) || unitCost < 0) errors.push('Giá vốn bắt buộc là số nguyên không âm, không có dấu phân cách')
    const match = candidates.length === 1 ? candidates[0] : null
    results.push({ row: row.rowNumber || index + 2, imei: row.imei, productName: match?.product.name || row.productName, ram: match?.variant.ram || match?.product.ram, storage: match?.variant.storage, color: match?.variant.color, unitCost: Number.isFinite(unitCost) ? unitCost : null, errors })
    if (!errors.length) {
      const key = JSON.stringify([match.product.id, match.variant.id, unitCost]), line = groups.get(key) || { productId: String(match.product.id), variantId: String(match.variant.id), unitCost, imeis: [], simulatedImeis: [] }
      line.imeis.push(imei); groups.set(key, line)
    }
  }
  const lines = [...groups.values()]
  const errors = results.filter(r => r.errors.length).length
  return { rows: results, errors, valid: errors === 0 && lines.length <= 100, message: lines.length > 100 ? 'File tạo quá 100 nhóm phiên bản/giá vốn; tách thành phiếu nhỏ hơn' : '', lines: errors === 0 && lines.length <= 100 ? lines : [] }
}
module.exports = { preview }
