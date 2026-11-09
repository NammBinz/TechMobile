const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const { migrate } = require('../scripts/migrate-imei.cjs')
const { normalizeEntityIds } = require('../scripts/normalize-entity-ids.cjs')
const { invariant, command, id } = require('../server/domain.cjs')
const { createStore } = require('../server/store.cjs')
const { createApp } = require('../server/index.cjs')
function fixture() {
  const db = migrate({ users: [{ id: '1', username: 'admin', fullName: 'Fixture', email: 'a@fixture.invalid', phone: 'fixture', password: 'fixture-password', status: 'active', role: 'admin' }], categories: [{ id: '1', name: 'Phones' }], products: ['1', '2'].map(productId => ({ id: productId, categoryId: '1', name: 'Phone ' + productId, ram: '8GB', status: 'active', quantity: 1, price: 100, variants: [{ id: 'shared', color: 'Blue', storage: '128GB', price: 100 }] })), orders: [{ id: '1790000000000', userId: '1', status: 'completed', createdAt: '1/1/2026', totalPrice: 100, items: [{ productId: 1, quantity: 1, name: 'Phone 1', price: 100 }] }], coupons: [{ id: '1', code: 'TEST', discount: 10, discountType: 'percent', status: 'active' }], reviews: [{ id: '1790000000001', userId: '1', productId: 1, orderId: '1790000000000', rating: 5, comment: 'Fixture' }] }).db
  const device = db.devices[0]
  db.suppliers = [{ id: '1', name: 'Supplier', status: 'active', revision: 0 }]
  db.purchaseReceipts = [{ id: '1', supplierId: '1', status: 'confirmed', revision: 0, lines: [{ id: 'receipt-line', productId: '1', variantId: 'shared', imeis: [device.imei] }], history: [] }]
  device.receiptId = '1'; device.receiptLineId = 'receipt-line'; device.supplierId = '1'
  return db
}
test('all management IDs normalize with scoped variants and typed foreign keys, while technical IDs/values remain unchanged', () => {
  const before = fixture(), { db, changes } = normalizeEntityIds(before)
  assert.ok(changes.length)
  for (const key of ['users', 'categories', 'products', 'coupons', 'reviews', 'warranties', 'suppliers', 'purchaseReceipts']) assert.ok(db[key].every(x => /^\d{13}$/.test(x.id) && typeof x.id === 'string'))
  assert.ok(db.products.every(p => p.variants.every(v => /^\d{13}$/.test(v.id))))
  assert.notEqual(db.users[0].id, db.products[0].id)
  assert.notEqual(db.products[0].variants[0].id, db.products[1].variants[0].id)
  assert.equal(db.orders[0].items[0].productId, db.products[0].id)
  assert.equal(db.orders[0].items[0].variantId, db.products[0].variants[0].id)
  assert.equal(db.devices.find(d => d.id === before.devices[1].id).variantId, db.products[1].variants[0].id)
  assert.equal(db.orders[0].userId, db.users[0].id)
  assert.equal(db.products[0].categoryId, db.categories[0].id)
  assert.equal(db.purchaseReceipts[0].supplierId, db.suppliers[0].id)
  assert.equal(db.devices[0].receiptId, db.purchaseReceipts[0].id)
  assert.equal(db.reviews[0].id, before.reviews[0].id)
  assert.equal(db.reviews[0].productId, db.products[0].id)
  assert.equal(db.devices[0].receiptLineId, before.devices[0].receiptLineId)
  assert.deepEqual(db.devices.map(d => [d.id, d.imei, d.status]), before.devices.map(d => [d.id, d.imei, d.status]))
  assert.deepEqual(db.orders.map(o => [o.id, o.totalPrice, o.status]), before.orders.map(o => [o.id, o.totalPrice, o.status]))
  assert.deepEqual(normalizeEntityIds(db), { db, changes: [] })
  invariant(db)
})
test('old actor/payload idempotency replays mapped result without changing fingerprint or executing twice', async () => {
  const db = fixture(), payload = { data: { name: 'Phones' } }, action = 'post-categories', key = id()
  const fingerprint = createHash('sha256').update(JSON.stringify({ actorId: '1', action, payload })).digest('hex')
  db.inventoryOperations.push({ id: key, actorId: '1', action, fingerprint, result: { ...db.categories[0] } })
  const { db: normalized } = normalizeEntityIds(db), store = createStore(normalized)
  const result = await store.transact(normalized.users[0], key, action, payload, () => { throw Error('Must replay') })
  assert.equal(result.id, normalized.categories[0].id)
  assert.equal(store.state.inventoryOperations[0].fingerprint, fingerprint)
  await assert.rejects(store.transact({ id: 'someone-else' }, key, action, payload, () => null), /Mã thao tác/)
})
test('legacy product/variant URLs and payloads resolve; all new management records use 13-digit IDs', async t => {
  const { db } = normalizeEntityIds(fixture()), store = createStore(db), server = createApp(store).listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve)); t.after(() => new Promise(resolve => server.close(resolve)))
  const base = `http://127.0.0.1:${server.address().port}`
  const token = (await (await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ account: 'admin', password: 'fixture-password' }) })).json()).token
  const request = (route, body, method = 'POST') => fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, 'Idempotency-Key': id() }, ...(body ? { body: JSON.stringify(body) } : {}) })
  assert.equal((await (await fetch(base + '/products/1')).json()).id, db.products[0].id)
  assert.equal((await (await fetch(base + '/categories/1')).json()).id, db.categories[0].id)
  const order = await (await request('/commands/place', { items: [{ productId: '2', variantId: 'shared', quantity: 1 }], shipping: { receiverName: 'Fixture', phone: 'fixture', address: 'fixture', paymentMethod: 'COD' } })).json()
  assert.equal(order.items[0].productId, db.products[1].id)
  assert.equal(order.items[0].variantId, db.products[1].variants[0].id)
  for (const route of ['/users', '/categories', '/coupons']) {
    const body = route === '/users' ? { fullName: 'New', username: 'new', email: 'n@fixture.invalid', phone: 'fixture', password: 'fixture-password', role: 'staff', status: 'active' } : route === '/coupons' ? { code: 'NEW', discount: 10, status: 'active' } : { name: 'New' }
    const response = await request(route, body); assert.equal(response.status, 200); assert.match((await response.json()).id, /^\d{13}$/)
  }
  const product = await (await request('/products', { name: 'New phone', price: 100, ram: '8GB', categoryId: '1', status: 'active', storage: '128GB' })).json()
  assert.match(product.id, /^\d{13}$/); assert.match(product.variants[0].id, /^\d{13}$/)
  assert.equal(product.categoryId, db.categories[0].id)
  assert.ok(/^\d{13}$/.test(command(store.state, db.users[0], 'save-supplier', { name: 'New supplier' }).id))
})
test('legacy stored cart/wishlist identifiers match current product and scoped variant aliases', async () => {
  const { matchesId } = await import('../src/utils/entityIds.js')
  const { withVariant } = await import('../src/utils/variants.js')
  const { db } = normalizeEntityIds(fixture()), p = db.products[0], v = p.variants[0]
  assert.equal(matchesId(p, '1'), true)
  assert.equal(matchesId(v, 'shared'), true)
  const item = withVariant(p, v)
  assert.equal(matchesId(item, '1'), true)
  assert.ok(item.variantLegacyIds.includes('shared'))
})
