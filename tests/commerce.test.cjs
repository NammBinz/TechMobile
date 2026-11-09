const { test } = require('node:test')
const assert = require('node:assert/strict')
const { migrate } = require('../scripts/migrate-imei.cjs')
const { createStore } = require('../server/store.cjs')
const { command, id, demoImei, availability, invariant } = require('../server/domain.cjs')
const { report, day, timeline, deviceProfile } = require('../server/reports.cjs')
const { createApp } = require('../server/index.cjs')
const admin = { id: 'admin', username: 'admin', password: 'fixture-password', role: 'admin', status: 'active' }
const customer = { ...admin, id: 'customer', username: 'customer', role: 'customer' }, staff = { ...admin, id: 'staff', username: 'staff', role: 'staff' }
const seed = () => migrate({ users: [admin, customer, staff], products: [{ id: 'p', name: 'Phone', status: 'active', price: 100, quantity: 0, variants: [{ id: 'v', ram: '8GB', storage: '128GB', color: 'Blue', price: 100 }] }], orders: [], reviews: [], coupons: [], categories: [] }).db
const run = (store, action, payload, actor = admin, key = id()) => store.transact(actor, key, action, payload, db => command(db, actor, action, payload))
const line = (imei, cost = 60) => ({ productId: 'p', variantId: 'v', imeis: [imei], unitCost: cost })
const change = (store, order, status, actor = admin) => run(store, 'transition', { orderId: order.id, expectedRevision: order.revision, status }, actor)
const place = store => run(store, 'place', { items: [{ productId: 'p', variantId: 'v', quantity: 1 }], shipping: { receiverName: 'Fixture', phone: 'fixture', address: 'fixture', paymentMethod: 'COD' } }, customer)
async function receive(store, cost = 60) {
  const receipt = await run(store, 'save-receipt', { lines: [line(demoImei(new Set(store.state.devices.map(d => d.imei))), cost)] })
  return run(store, 'confirm-receipt', { receiptId: receipt.id, expectedRevision: receipt.revision })
}
async function complete(store) {
  let order = await place(store)
  for (const status of ['confirmed', 'shipping', 'delivered', 'completed']) order = await change(store, order, status, status === 'completed' ? customer : admin)
  return order
}
test('receipt drafts do not change stock; duplicates reject whole batch and confirmation retry is idempotent', async () => {
  const store = createStore(seed()), imei = demoImei(new Set())
  const draft = await run(store, 'save-receipt', { lines: [line(imei), line(imei)] })
  assert.equal(store.state.devices.length, 0)
  const before = structuredClone(store.state)
  await assert.rejects(run(store, 'confirm-receipt', { receiptId: draft.id, expectedRevision: draft.revision }), /tồn tại/)
  assert.deepEqual(store.state, before)
  const saved = await run(store, 'save-receipt', { id: draft.id, expectedRevision: draft.revision, lines: [line(imei, 0)] })
  const payload = { receiptId: saved.id, expectedRevision: saved.revision }, key = id()
  const confirmed = await run(store, 'confirm-receipt', payload, admin, key)
  assert.deepEqual(await run(store, 'confirm-receipt', payload, admin, key), confirmed)
  assert.deepEqual(await run(store, 'confirm-receipt', payload), confirmed)
  assert.equal(store.state.devices.length, 1); assert.equal(store.state.devices[0].purchaseCost, 0)
  assert.equal(availability(store.state, 'p', 'v').sellable, 1)
  await assert.rejects(run(store, 'save-receipt', { id: confirmed.id, expectedRevision: confirmed.revision, lines: [line(imei)] }), /không sửa/)
})
test('concurrent receipts cannot import the same IMEI; disk failure never publishes partial receipt or devices', async () => {
  const store = createStore(seed()), imei = demoImei(new Set())
  const a = await run(store, 'save-receipt', { lines: [line(imei)] }), b = await run(store, 'save-receipt', { lines: [line(imei)] })
  const results = await Promise.allSettled([a, b].map(r => run(store, 'confirm-receipt', { receiptId: r.id, expectedRevision: r.revision })))
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1)
  const failed = createStore(structuredClone(store.state), 'unused', () => { throw Error('write failure') }), before = structuredClone(failed.state)
  await assert.rejects(run(failed, 'receive-device', { productId: 'p', variantId: 'v', imeis: [demoImei(new Set([imei]))] }), /write failure/)
  assert.deepEqual(failed.state, before)
})
test('supplier disable preserves receipts; costs freeze at shipping and unknown legacy cost backfill is explicit', async () => {
  const store = createStore(seed())
  const supplier = await run(store, 'save-supplier', { name: 'Fixture supplier' })
  const draft = await run(store, 'save-receipt', { supplierId: supplier.id, lines: [line(demoImei(new Set()))] })
  await run(store, 'save-supplier', { ...supplier, expectedRevision: supplier.revision, status: 'inactive' })
  await assert.rejects(run(store, 'confirm-receipt', { receiptId: draft.id, expectedRevision: draft.revision }), /ngừng/)
  const receipt = await receive(store)
  const order = await complete(store), snapshot = structuredClone(order.items[0].deviceSnapshots)
  assert.equal(snapshot[0].costSnapshot, 60)
  await run(store, 'adjust-receipt', { receiptId: receipt.id, expectedRevision: receipt.revision, reason: 'Correct invoice', costs: [{ lineId: receipt.lines[0].id, unitCost: 70 }] })
  assert.deepEqual(store.state.orders.find(o => o.id === order.id).items[0].deviceSnapshots, snapshot)
  assert.equal(report(store.state).totals.grossProfit, 40)
  await receive(store, null)
  const unknown = await complete(store)
  assert.equal(report(store.state).totals.grossProfit, null)
  const device = store.state.devices.find(d => d.assignment?.orderId === unknown.id)
  await run(store, 'set-device-cost', { deviceId: device.id, expectedRevision: device.revision, purchaseCost: 30, reason: 'Recover missing invoice cost' })
  assert.equal(report(store.state).totals.grossProfit, 110)
  assert.equal(store.state.orders.find(o => o.id === unknown.id).history.at(-1).event, 'cost-backfilled')
  invariant(store.state)
})
test('reports separate years, unknown completion dates, payment dates, demo adjustments and missing costs', async () => {
  const store = createStore(seed()); await receive(store)
  const original = await complete(store), db = structuredClone(store.state)
  db.orders[0].completedAt = '2025-12-31T18:00:00Z' // Jan 1 in Vietnam
  db.orders[0].paymentHistory = [{ at: '2025-03-01T00:00:00Z', status: 'paid', previousStatus: 'unpaid', amount: 100, action: 'payment-recorded' }, { at: '2026-03-01T00:00:00Z', status: 'paid', previousStatus: 'unpaid', action: 'owner_requested_demo_adjustment' }]
  const legacy = structuredClone(db.orders[0]); legacy.id = 'legacy'; delete legacy.completedAt; legacy.paymentHistory = []; legacy.paymentStatus = 'unpaid'; db.orders.push(legacy)
  const out = report(db, { from: '2026-01-01', to: '2026-12-31' })
  assert.equal(out.totals.revenue, original.totalPrice)
  assert.equal(out.totals.paymentRecorded, 0); assert.equal(out.totals.demoPaymentRecorded, 100)
  assert.equal(out.unknownDates.length, 1); assert.equal(out.monthly[0].month, '2026-01')
  assert.equal(report(db, { from: '2025-01-01', to: '2025-12-31' }).totals.revenue, 0)
  assert.equal(day('31/2/2026'), null)
  assert.throws(() => report(db, { from: '2026-02-30' }), /Khoảng ngày/)
  assert.throws(() => report(db, { from: '2026-03-01', to: '2026-01-01' }), /Khoảng ngày/)
})
test('timeline preserves legacy facts and an IMEI profile shows both cancelled and successful resale', async () => {
  assert.deepEqual(timeline({ createdAt: '1/1/2020', deliveredAt: '3/1/2020', completedAt: '4/1/2020' }).map(e => e.to), ['pending', 'delivered', 'completed'])
  const store = createStore(seed()); await receive(store)
  let first = await place(store); first = await change(store, first, 'confirmed'); first = await change(store, first, 'shipping')
  first = await run(store, 'cancel', { orderId: first.id, expectedRevision: first.revision, reason: 'Delivery failed' })
  const device = store.state.devices[0]
  await run(store, 'accept-return', { orderId: first.id, expectedRevision: first.revision, deviceId: device.id })
  await run(store, 'device-status', { deviceId: device.id, expectedRevision: store.state.devices[0].revision, status: 'available', reason: 'Inspected' })
  const second = await complete(store), profile = deviceProfile(store.state, device.imei)
  assert.equal(profile.orders.length, 2)
  assert.ok(profile.orders.every(o => o.snapshots[0].imei === device.imei))
  assert.equal(profile.device.assignment.orderId, second.id)
  assert.equal(profile.warranties.length, 1)
  assert.ok(profile.orders.find(o => o.id === first.id).history.some(e => e.event === 'accept-return'))
})
test('staff/customer API never leaks cost values and only admin can write purchasing/cost commands', async t => {
  const store = createStore(seed()); await receive(store); const order = await complete(store)
  const server = createApp(store).listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); t.after(() => new Promise(resolve => server.close(resolve)))
  const base = `http://127.0.0.1:${server.address().port}`
  const login = async user => (await (await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ account: user, password: 'fixture-password' }) })).json()).token
  const staffToken = await login('staff'), customerToken = await login('customer')
  const get = (route, token) => fetch(base + route, { headers: { Authorization: 'Bearer ' + token } })
  for (const route of ['/orders', '/devices', '/reports/dashboard', '/devices/profile/' + store.state.devices[0].imei]) {
    const response = await get(route, staffToken); assert.equal(response.status, 200)
    assert.doesNotMatch(JSON.stringify(await response.json()), /purchaseCost|costSnapshot|costTotal|grossProfit|unitCost/)
  }
  assert.doesNotMatch(JSON.stringify(await (await get('/orders/' + order.id, customerToken)).json()), /costSnapshot|purchaseCost/)
  for (const route of ['/suppliers', '/purchaseReceipts']) assert.equal((await get(route, staffToken)).status, 403)
  assert.equal((await get('/reports/dashboard', customerToken)).status, 403)
  for (const action of ['save-receipt', 'save-supplier', 'adjust-receipt', 'set-device-cost']) {
    const response = await fetch(base + '/commands/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + staffToken, 'Idempotency-Key': id() }, body: '{}' })
    assert.equal(response.status, 403)
  }
})

test('payment history does not invent a debit for unknown legacy status or move paidAt for repeated paid', async () => {
  const store = createStore(seed()); await receive(store)
  let order = await place(store)
  await store.transact(admin, id(), 'fixture-legacy-payment', {}, db => {
    const saved = db.orders.find(o => o.id === order.id)
    saved.paymentMethod = 'BANK'; delete saved.paymentStatus
    return null
  })
  order = await run(store, 'payment', { orderId: order.id, expectedRevision: order.revision, status: 'unpaid' })
  assert.equal(order.paymentHistory.at(-1).amount, 0)
  order = await run(store, 'payment', { orderId: order.id, expectedRevision: order.revision, status: 'paid' })
  assert.equal(report(store.state).totals.paymentRecorded, order.totalPrice)
  const again = await run(store, 'payment', { orderId: order.id, expectedRevision: order.revision, status: 'paid' })
  assert.deepEqual(again, order)
  order = await run(store, 'payment', { orderId: order.id, expectedRevision: order.revision, status: 'unpaid' })
  assert.equal(report(store.state).totals.paymentRecorded, 0)
  assert.equal(order.paymentHistory.at(-1).amount, -order.totalPrice)
})
