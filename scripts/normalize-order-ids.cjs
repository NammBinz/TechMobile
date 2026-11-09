const fs = require('node:fs')
const path = require('node:path')
const { invariant } = require('../server/domain.cjs')
const { nextOrderId } = require('../server/order-ids.cjs')
const { writeSnapshot } = require('../server/store.cjs')

function normalizeOrderIds(source) {
  invariant(source)
  const db = structuredClone(source), mapping = new Map(), changes = []
  for (const order of db.orders) {
    const previous = String(order.id)
    if (/^\d{13}$/.test(previous)) { order.id = previous; continue }
    const preferred = Date.parse(order.createdAtIso || '')
    const target = nextOrderId(db, preferred)
    mapping.set(previous, target)
    changes.push({ previousId: order.id, id: target })
    order.id = target
    order.legacyIds = [...new Set([...(order.legacyIds || []).map(String), previous])]
    order.revision = (order.revision || 0) + 1
  }
  // Rewrite only typed order relationships and order-shaped cached results.
  // Never replace an arbitrary "1" or UUID in product/user/device IDs or audit text.
  const walk = value => {
    if (Array.isArray(value)) { value.forEach(walk); return }
    if (!value || typeof value !== 'object') return
    if (Array.isArray(value.items) && value.userId !== undefined && value.status !== undefined && mapping.has(String(value.id))) value.id = mapping.get(String(value.id))
    for (const [key, entry] of Object.entries(value)) {
      if (['orderId', 'sourceOrderId'].includes(key) && mapping.has(String(entry))) value[key] = mapping.get(String(entry))
      else if (key !== 'legacyIds') walk(entry)
    }
  }
  walk(db)
  invariant(db)
  return { db, changes }
}
if (require.main === module) {
  const root = path.resolve(__dirname, '..'), file = path.join(root, 'db.json'), apply = process.argv.includes('--apply'), lock = file + '.lock'
  if (apply) fs.writeFileSync(lock, String(process.pid), { flag: 'wx' })
  try {
    const original = fs.readFileSync(file, 'utf8'), source = JSON.parse(original), { db, changes } = normalizeOrderIds(source)
    let backup
    if (apply && JSON.stringify(source) !== JSON.stringify(db)) {
      const directory = path.join(root, 'backups'); fs.mkdirSync(directory, { recursive: true })
      backup = path.join(directory, `db-before-order-ids-${Date.now()}.json`)
      fs.writeFileSync(backup, original, { flag: 'wx', mode: 0o600 })
      writeSnapshot(file, db)
      fs.writeFileSync(backup.replace(/\.json$/, '-mapping.json'), JSON.stringify(changes, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
    }
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', changed: changes.length, changes, backup: backup && path.relative(root, backup) }, null, 2))
  } finally { if (apply) fs.unlinkSync(lock) }
}
module.exports = { normalizeOrderIds }
