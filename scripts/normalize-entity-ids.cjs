const fs = require('node:fs')
const path = require('node:path')
const { invariant } = require('../server/domain.cjs')
const { collections, createIdAllocator } = require('../server/entity-ids.cjs')
const { writeSnapshot } = require('../server/store.cjs')

function normalizeEntityIds(source) {
  invariant(source)
  const db = structuredClone(source), allocate = createIdAllocator(db), maps = {}, variantMaps = new Map(), changes = []
  for (const collection of collections) {
    maps[collection] = new Map()
    for (const entity of db[collection] || []) {
      const old = String(entity.id), target = /^\d{13}$/.test(old) ? old : allocate()
      maps[collection].set(old, target)
      for (const alias of entity.legacyIds || []) maps[collection].set(String(alias), target)
      if (target !== old) {
        entity.legacyIds = [...new Set([...(entity.legacyIds || []).map(String), old])]
        changes.push({ collection, previousId: entity.id, id: target })
      }
      entity.id = target
    }
  }
  for (const product of db.products) {
    const map = new Map(); variantMaps.set(product.id, map)
    for (const variant of product.variants || []) {
      const old = String(variant.id), target = /^\d{13}$/.test(old) ? old : allocate()
      map.set(old, target)
      for (const alias of variant.legacyIds || []) map.set(String(alias), target)
      if (target !== old) { variant.legacyIds = [...new Set([...(variant.legacyIds || []).map(String), old])]; changes.push({ collection: 'variants', productId: product.id, previousId: variant.id, id: target }) }
      variant.id = target
    }
  }
  const fields = { productId: 'products', categoryId: 'categories', userId: 'users', customerId: 'users', actorId: 'users', createdBy: 'users', receivedBy: 'users', allocatedBy: 'users', confirmedBy: 'users', paidBy: 'users', cancelledByUserId: 'users', supplierId: 'suppliers', receiptId: 'purchaseReceipts', warrantyId: 'warranties', claimId: 'warrantyClaims' }
  const mapId = (collection, value) => maps[collection]?.get(String(value)) ?? value
  const hintForAction = action => ({ register: 'users', profile: 'users', review: 'reviews', 'save-supplier': 'suppliers', 'save-receipt': 'purchaseReceipts', 'confirm-receipt': 'purchaseReceipts', 'adjust-receipt': 'purchaseReceipts', 'create-claim': 'warrantyClaims', 'transition-claim': 'warrantyClaims' })[action] || collections.find(key => String(action).endsWith('-' + key))
  const walk = (value, hint, productContext) => {
    if (Array.isArray(value)) { value.forEach(item => walk(item, hint, productContext)); return }
    if (!value || typeof value !== 'object') return
    if (!hint) {
      if (value.username && value.role) hint = 'users'
      else if (Array.isArray(value.variants)) hint = 'products'
      else if (value.reportedIssue && value.warrantyId) hint = 'warrantyClaims'
      else if (value.imeiSnapshot && value.deviceId) hint = 'warranties'
      else if (value.comment !== undefined && value.rating !== undefined && value.orderId) hint = 'reviews'
      else if (Array.isArray(value.lines) && value.receivedAt) hint = 'purchaseReceipts'
    }
    if (hint && maps[hint] && value.id != null) value.id = mapId(hint, value.id)
    for (const [field, collection] of Object.entries(fields)) if (value[field] != null) value[field] = mapId(collection, value[field])
    const productId = hint === 'products' ? String(value.id) : value.productId != null ? String(value.productId) : productContext
    if (value.variantId != null && productId) value.variantId = variantMaps.get(productId)?.get(String(value.variantId)) ?? value.variantId
    if (hint === 'variants' && productId && value.id != null) value.id = variantMaps.get(productId)?.get(String(value.id)) ?? value.id
    for (const [key, entry] of Object.entries(value)) {
      if (key === 'legacyIds' || key === 'fingerprint') continue
      const childHint = key === 'variants' ? 'variants' : collections.includes(key) ? key : key === 'result' ? hintForAction(value.action) : undefined
      walk(entry, childHint, productId)
    }
  }
  walk(db)
  invariant(db)
  return { db, changes }
}
if (require.main === module) {
  const root = path.resolve(__dirname, '..'), file = path.join(root, 'db.json'), lock = file + '.lock', apply = process.argv.includes('--apply')
  if (apply) fs.writeFileSync(lock, String(process.pid), { flag: 'wx' })
  try {
    const original = fs.readFileSync(file, 'utf8'), { db, changes } = normalizeEntityIds(JSON.parse(original))
    let backup
    if (apply && JSON.stringify(db) !== JSON.stringify(JSON.parse(original))) {
      const directory = path.join(root, 'backups'); fs.mkdirSync(directory, { recursive: true })
      backup = path.join(directory, `db-before-entity-ids-${Date.now()}.json`)
      fs.writeFileSync(backup, original, { flag: 'wx', mode: 0o600 }); writeSnapshot(file, db)
      fs.writeFileSync(backup.replace(/\.json$/, '-mapping.json'), JSON.stringify(changes, null, 2), { flag: 'wx', mode: 0o600 })
    }
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', changes: changes.length, collections: changes.reduce((out, item) => { out[item.collection] = (out[item.collection] || 0) + 1; return out }, {}), backup: backup && path.relative(root, backup) }, null, 2))
  } finally { if (apply) fs.unlinkSync(lock) }
}
module.exports = { normalizeEntityIds }
