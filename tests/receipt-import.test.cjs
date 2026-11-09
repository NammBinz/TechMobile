const { test } = require('node:test')
const assert = require('node:assert/strict')
const { preview } = require('../server/receipt-import.cjs')
const { migrate } = require('../scripts/migrate-imei.cjs')
const { demoImei, id } = require('../server/domain.cjs')
const { createStore } = require('../server/store.cjs')
const { createApp } = require('../server/index.cjs')
const { update } = require('../scripts/apply-price-cost-update.cjs')
const admin = { id: 'admin', username: 'admin', role: 'admin', password: 'fixture-password', status: 'active' }
const staff = { ...admin, id: 'staff', username: 'staff', role: 'staff' }
const fixture = () => migrate({ users: [admin, staff], products: [{ id: 'p', name: 'Phone', ram: '8GB', status: 'active', quantity: 2, price: 10000000, variants: [{ id: 'v', color: 'Blue', storage: '256GB', price: 10000000 }] }], orders: [], reviews: [], coupons: [], categories: [] }).db
test('import preview validates all rows without stock writes, detects wrong composite SKU/duplicate/numeric IMEI/cost', () => {
  const db = fixture(), before = structuredClone(db), imei = demoImei(new Set(db.devices.map(d => d.imei)))
  const row = { productId: 'p', variantId: 'v', imei, unitCost: '8000000' }
  const result = preview(db, [row]); assert.equal(result.valid, true); assert.equal(result.lines[0].unitCost, 8000000)
  assert.deepEqual(db, before)
  assert.equal(preview(db, [row, row]).valid, false)
  for (const patch of [{ imei: Number(imei) }, { unitCost: '' }, { unitCost: '-1' }, { unitCost: '8,000,000' }, { ram: '12GB' }, { variantId: 'missing' }]) assert.equal(preview(db, [{ ...row, ...patch }]).valid, false)
  assert.equal(preview(db, [{ productName: 'Phone', ram: '8 GB', storage: '256 GB', color: 'blue', imei, unitCost: 0 }]).valid, true)
  assert.throws(() => preview(db, Array(501).fill(row)))
})
test('CSV handles BOM, semicolon/comma quotes and blank rows; malformed header/quotes reject', async () => {
  const { parseCsv, importRows } = await import('../src/utils/receiptImport.js')
  const matrix = parseCsv('\uFEFFproductId;variantId;imei;unitCost\r\np;v;"099999999999999";8000000\r\n\r\n')
  assert.equal(importRows(matrix)[0].imei, '099999999999999')
  assert.equal(importRows(matrix).length, 1)
  assert.equal(parseCsv('a,b\n"name, with comma","a""b"')[1][1], 'a"b')
  assert.throws(() => parseCsv('a,b\n"unfinished'))
  assert.throws(() => importRows([['imei','imei','unitCost'],['a','b','1']]))
})

test('real XLSX reader preserves Text IMEI and numeric unit cost', async () => {
  const { readSheet } = require('read-excel-file/node')
  const { workbook } = require('../scripts/receipt-xlsx-fixture.cjs')
  const { importRows } = await import('../src/utils/receiptImport.js')
  const matrix = await readSheet(workbook([['productId', 'variantId', 'imei', 'unitCost'], ['p', 'v', '099999999999999', 8000000]]), { sheet: 1 })
  assert.equal(importRows(matrix)[0].imei, '099999999999999')
  assert.equal(importRows(matrix)[0].unitCost, 8000000)
})
test('only admin can preview import; preview does not change persistent fixture state', async t => {
  const store = createStore(fixture()), server = createApp(store).listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve)); t.after(() => new Promise(resolve => server.close(resolve)))
  const base = `http://127.0.0.1:${server.address().port}`
  const login = async account => (await (await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ account, password: 'fixture-password' }) })).json()).token
  const post = token => fetch(base + '/purchaseReceipts/import-preview', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify({ rows: [{ productId: 'p', variantId: 'v', imei: demoImei(new Set()), unitCost: 1 }] }) })
  assert.equal((await post()).status, 401)
  assert.equal((await post(await login('staff'))).status, 403)
  const before = structuredClone(store.state)
  assert.equal((await post(await login('admin'))).status, 200)
  assert.deepEqual(store.state, before)
})
test('price/cost update uses pre-update sale prices, preserves existing costs/orders/stock, excludes historical devices and is repeatable', () => {
  const db = fixture(), device = db.devices[0]
  db.devices[1].purchaseCost = 123
  db.devices.push({ ...device, id: 'history', imei: demoImei(new Set(db.devices.map(d => d.imei))), status: 'retired', historicalOnly: true })
  db.orders.push({ id: 'old', userId: 'admin', status: 'cancelled', revision: 0, totalPrice: 11000000, paymentStatus: 'paid', items: [{ id: 'line', quantity: 1, price: 11000000, productId: 'p', deviceSnapshots: [{ deviceId: device.id, imei: device.imei }] }] })
  const plan = { batchId: id(), skipped: [], costModels: [{ productId: 'p', percent: 87, variants: [{ variantId: 'v', basePrice: 10000000 }] }], changes: [{ productId: 'p', variantId: 'v', previousPrice: 10000000, price: 9000000, sourceUrl: 'https://cellphones.com.vn/phone.html' }] }
  const before = structuredClone(db), result = update(db, plan)
  assert.deepEqual(db, before)
  assert.equal(result.db.devices[0].purchaseCost, 8700000)
  assert.equal(result.db.devices[1].purchaseCost, 123)
  assert.equal(result.db.devices[2].purchaseCost, undefined)
  assert.equal(result.db.products[0].variants[0].price, 9000000)
  assert.equal(result.db.orders[0].totalPrice, 11000000)
  assert.equal(result.db.orders[0].items[0].price, 11000000)
  assert.equal(result.db.orders[0].items[0].deviceSnapshots[0].costSnapshot, 8700000)
  assert.equal(result.db.devices.length, before.devices.length)
  assert.deepEqual(update(result.db, plan).db, result.db)
  assert.throws(() => update({ ...before, products: [{ ...before.products[0], variants: [{ ...before.products[0].variants[0], price: 1 }] }] }, plan), /Giá đã thay đổi/)
})
