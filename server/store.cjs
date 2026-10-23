const fs = require('node:fs')
const path = require('node:path')
const { createHash } = require('node:crypto')
const { invariant, requireThat, now } = require('./domain.cjs')

function writeSnapshot(file, data) {
  const temporary = file + '.tmp'
  const descriptor = fs.openSync(temporary, 'w', 0o600)
  try { fs.writeFileSync(descriptor, JSON.stringify(data, null, 2) + '\n'); fs.fsyncSync(descriptor) } finally { fs.closeSync(descriptor) }
  fs.renameSync(temporary, file)
}
function createStore(initial, file = null, writer = writeSnapshot) {
  let state = structuredClone(initial), queue = Promise.resolve()
  invariant(state)
  return {
    get state() { return state },
    transact(actor, operationId, action, payload, apply) {
      const operation = queue.then(() => {
        requireThat(typeof operationId === 'string' && operationId.length >= 8 && operationId.length <= 150, 'Thiếu mã thao tác')
        const fingerprint = createHash('sha256').update(JSON.stringify({ actorId: String(actor.id), action, payload })).digest('hex')
        const previous = state.inventoryOperations.find(op => op.id === operationId)
        if (previous) { requireThat(previous.fingerprint === fingerprint, 'Mã thao tác đã dùng cho nội dung khác', 409); return structuredClone(previous.result) }
        const draft = structuredClone(state)
        const result = apply(draft)
        invariant(draft)
        draft.inventoryOperations.push({ id: operationId, actorId: String(actor.id), action, fingerprint, committedAt: now(), result: structuredClone(result) })
        if (file) writer(path.resolve(file), draft)
        state = draft
        return structuredClone(result)
      })
      queue = operation.catch(() => {})
      return operation
    }
  }
}
module.exports = { createStore, writeSnapshot }
