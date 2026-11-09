// Business-facing order IDs are 13-digit strings; UUIDs remain internal IDs elsewhere.
function nextOrderId(db, preferred = Date.now()) {
  const used = new Set((db.orders || []).flatMap(o => [String(o.id), ...(o.legacyIds || []).map(String)]))
  let candidate = Math.trunc(preferred)
  if (!Number.isSafeInteger(candidate) || candidate < 1000000000000 || candidate > 9999999999999) candidate = Date.now()
  while (used.has(String(candidate))) candidate++
  if (candidate > 9999999999999) throw Error('Không thể cấp mã đơn 13 chữ số')
  return String(candidate)
}
function resolveOrderId(db, value) {
  const key = String(value)
  const current = db.orders.find(o => String(o.id) === key)
  return current ? String(current.id) : String(db.orders.find(o => (o.legacyIds || []).some(alias => String(alias) === key))?.id ?? key)
}
module.exports = { nextOrderId, resolveOrderId }
