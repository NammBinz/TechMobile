const collections = ['users', 'categories', 'products', 'reviews', 'coupons', 'suppliers', 'purchaseReceipts', 'warranties', 'warrantyClaims']
const matchesId = (entity, value) => entity && (String(entity.id) === String(value) || (entity.legacyIds || []).some(old => String(old) === String(value)))
const findEntity = (db, collection, value) => (db[collection] || []).find(entity => String(entity.id) === String(value)) || (db[collection] || []).find(entity => matchesId(entity, value))
const findVariant = (product, value) => (product?.variants || []).find(v => String(v.id) === String(value)) || (product?.variants || []).find(v => matchesId(v, value))
function createIdAllocator(db) {
  const entities = [...collections.flatMap(key => db[key] || []), ...(db.orders || []), ...(db.products || []).flatMap(p => p.variants || [])]
  const used = new Set(entities.flatMap(entity => [String(entity.id), ...(entity.legacyIds || []).map(String)]))
  let cursor = Date.now()
  return (preferred = cursor) => {
    let candidate = Math.trunc(preferred)
    if (!Number.isSafeInteger(candidate) || candidate < 1000000000000 || candidate > 9999999999999) candidate = cursor
    while (used.has(String(candidate))) candidate++
    if (candidate > 9999999999999) throw Error('Không thể cấp mã 13 chữ số')
    used.add(String(candidate)); cursor = candidate + 1
    return String(candidate)
  }
}
const nextEntityId = db => createIdAllocator(db)()
module.exports = { collections, matchesId, findEntity, findVariant, createIdAllocator, nextEntityId }
