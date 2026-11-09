const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const { nextOrderId } = require('../server/order-ids.cjs')
const { normalizeOrderIds } = require('../scripts/normalize-order-ids.cjs')
const { migrate } = require('../scripts/migrate-imei.cjs')
const { invariant, command, id } = require('../server/domain.cjs')
const { createStore } = require('../server/store.cjs')
const { createApp } = require('../server/index.cjs')
const user = { id: '1', username: 'buyer', fullName: 'Fixture', password: 'fixture-password', role: 'customer', status: 'active' }
function fixture() {
  const uuid = 'cfa5656b-5467-47ec-9215-f6fb7cd14353'
  const db = migrate({ users: [user], products: [{ id: '1', name: 'Phone', status: 'active', quantity: 2, price: 100, variants: [{ id: 'v', color: 'Blue', storage: '128GB', price: 100 }] }], orders: [1, uuid].map(orderId => ({ id: orderId, userId: '1', status: 'completed', createdAt: '1/1/2026', totalPrice: 100, items: [{ productId: 1, name: 'Phone', quantity: 1, price: 100 }] })), reviews: [{ id: 'review', userId: '1', productId: '1', orderId: 1 }], coupons: [], categories: [] }).db
  db.devices[0].sourceOrderId = '1'
  db.devices[0].assignmentHistory = [{ orderId: '1', orderItemId: db.orders[0].items[0].id }]
  return db
}
test('normalization rewrites only order identities/relationships, resolves timestamp collisions and is repeatable', () => {
  const before = fixture(), { db, changes } = normalizeOrderIds(before)
  assert.equal(changes.length, 2)
  assert.ok(db.orders.every(o => typeof o.id === 'string' && /^\d{13}$/.test(o.id)))
  assert.equal(new Set(db.orders.map(o => o.id)).size, 2)
  assert.equal(db.orders[0].id, '1767225600000')
  assert.equal(db.orders[1].id, '1767225600001')
  assert.equal(before.orders[0].id, 1)
  assert.equal(db.orders[0].items[0].productId, 1)
  assert.equal(db.products[0].id, '1'); assert.equal(db.users[0].id, '1')
  assert.equal(db.devices[0].sourceOrderId, db.orders[0].id)
  assert.equal(db.devices[0].assignmentHistory[0].orderId, db.orders[0].id)
  assert.equal(db.reviews[0].orderId, db.orders[0].id)
  for (const device of db.devices.filter(d => d.assignment)) assert.ok(db.orders.some(o => o.id === device.assignment.orderId))
  for (const w of db.warranties) assert.ok(db.orders.some(o => o.id === w.orderId))
  assert.deepEqual(db.devices.map(d => [d.id, d.imei, d.status]), before.devices.map(d => [d.id, d.imei, d.status]))
  assert.deepEqual(db.orders.map(o => [o.totalPrice, o.status]), before.orders.map(o => [o.totalPrice, o.status]))
  assert.deepEqual(normalizeOrderIds(db), { db, changes: [] })
  invariant(db)
})
test('cached idempotent operation retains fingerprint while replay returns normalized order ID', async () => {
  const db = fixture(), old = db.orders[1], action = 'transition', payload = { orderId: old.id, expectedRevision: 0, status: 'confirmed' }, operationId = id()
  const fingerprint = createHash('sha256').update(JSON.stringify({ actorId: '1', action, payload })).digest('hex')
  db.inventoryOperations.push({ id: operationId, actorId: '1', action, fingerprint, result: structuredClone(old) })
  const normalized = normalizeOrderIds(db).db, store = createStore(normalized)
  const result = await store.transact(user, operationId, action, payload, () => { throw Error('Must replay, not execute') })
  assert.equal(result.id, normalized.orders[1].id)
  assert.equal(store.state.inventoryOperations[0].fingerprint, fingerprint)
})
test('new orders created concurrently get unique numeric 13-digit string IDs', async () => {
  assert.equal(nextOrderId({ orders: [{ id: '1790000000000' }, { id: '1790000000001' }] }, 1790000000000), '1790000000002')
  const store = createStore(normalizeOrderIds(fixture()).db)
  const payload = { items: [{ productId: '1', variantId: 'v', quantity: 1 }], shipping: { receiverName: 'Fixture', phone: 'fixture', address: 'fixture', paymentMethod: 'COD' } }
  const orders = await Promise.all([1, 2].map(() => store.transact(user, id(), 'place', payload, db => command(db, user, 'place', payload))))
  assert.ok(orders.every(o => /^\d{13}$/.test(o.id)))
  assert.notEqual(orders[0].id, orders[1].id)
})
test('old order URLs resolve through aliases and still enforce ownership', async t => {
  const source = fixture(), old = source.orders[1].id, { db } = normalizeOrderIds(source)
  db.users.push({ ...user, id: 'other', username: 'other' })
  const store = createStore(db), server = createApp(store).listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve)); t.after(() => new Promise(resolve => server.close(resolve)))
  const base = `http://127.0.0.1:${server.address().port}`
  const login = async account => (await (await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ account, password: 'fixture-password' }) })).json()).token
  const token = await login('buyer'), other = await login('other')
  const get = value => fetch(base + '/orders/' + old, { headers: { Authorization: 'Bearer ' + value } })
  assert.equal((await (await get(token)).json()).id, db.orders[1].id)
  assert.equal((await get(other)).status, 404)
})
