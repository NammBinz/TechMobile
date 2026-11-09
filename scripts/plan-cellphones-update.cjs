const fs = require('node:fs')
const path = require('node:path')
const { randomInt } = require('node:crypto')
const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]/g, '')
const model = value => norm(String(value).replace(/^điện thoại\s*/i, '').split('|')[0].replace(/\b\d+\s*(GB|TB)\b.*$/i, '').replace(/\b5G\b/gi, ''))
const capacity = value => { const n = norm(value); return /^\d+tb$/.test(n) ? parseInt(n) * 1024 + 'gb' : n }
const aliases = { denstarlight: 'den', timnebula: 'tim', denawesomenavy: 'den', xanhda: 'xanhnhat', denspaceblack: 'denkhonggian', trangcloudwhite: 'trangmay', vanglightgold: 'vangnhat', xanhskyblue: 'xanhdatroi', xanhmistblue: 'xanhlamkhoi', xanhsage: 'xanhlaxothom', hongsoftpink: 'hong', denjetblack: 'dentuyen', bacshadow: 'xambong', xanhshadow: 'xanhbong', vangamber: 'vang', denonyx: 'den', timcobalt: 'tim', xammarble: 'xam', xanhiceblue: 'xanhnhat', timlilac: 'tim', vanglemon: 'vang' }
function color(value) { const text = norm(String(value).split('-').at(-1)).replace(/^titan/, ''); return aliases[text] || text }
function buildPlan(db, pages) {
  const changes = [], skipped = [], costModels = []
  for (const product of db.products) {
    costModels.push({ productId: String(product.id), name: product.name, percent: randomInt(80, 91), variants: product.variants.map(v => ({ variantId: String(v.id), basePrice: v.price })) })
    for (const variant of product.variants) {
      const matching = pages.filter(page => page.status === 200 && page.product && model(page.product.name) === model(product.name) && !/cũ|đã kích hoạt|đổi bảo hành/i.test(page.product.name))
      const candidates = []
      for (const page of matching) {
        const props = page.product.additionalProperty || []
        const storage = props.find(p => /bộ nhớ trong/i.test(p.name))?.value || page.product.name.match(/\d+\s*(GB|TB)/gi)?.at(-1)
        const ram = props.find(p => /dung lượng RAM/i.test(p.name))?.value || (page.product.name.match(/\d+\s*GB/gi)?.length > 1 ? page.product.name.match(/\d+\s*GB/gi)[0] : null)
        if (capacity(storage) !== capacity(variant.storage)) continue
        if (ram && capacity(ram) !== capacity(variant.ram || product.ram)) continue
        if (!ram && new Set(product.variants.map(v => capacity(v.ram || product.ram))).size > 1) continue
        const prices = page.colors.filter(c => color(c.name) === color(variant.color) && Number.isSafeInteger(c.specialPrice) && c.specialPrice > 0)
        for (const source of prices) candidates.push({ price: source.specialPrice, sourceUrl: page.url, sourceTitle: page.product.name, sourceColor: source.name, observedAt: page.fetchedAt, sha256: page.sha256 })
      }
      const distinct = [...new Set(candidates.map(c => c.price))]
      if (distinct.length === 1) changes.push({ productId: String(product.id), variantId: String(variant.id), name: product.name, ram: variant.ram || product.ram, storage: variant.storage, color: variant.color, previousPrice: variant.price, ...candidates[0] })
      else skipped.push({ productId: String(product.id), variantId: String(variant.id), name: product.name, ram: variant.ram || product.ram, storage: variant.storage, color: variant.color, reason: distinct.length > 1 ? 'Nguồn cùng SKU có giá khác nhau; giữ nguyên' : 'Không có giá dương khớp mẫu/RAM/dung lượng/màu trên trang sản phẩm mới' })
    }
  }
  return { batchId: 'cellphones-demo-cost-2026-11-06', plannedAt: new Date().toISOString(), policy: 'Match public new-product color offer; no member/trade-in/used prices. Costs use old variant sale price times random 80-90 percent per model, rounded to 1000 VND. Historical-only records excluded.', changes, skipped, costModels }
}
if (require.main === module) {
  const db = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../db.json'), 'utf8')), pages = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../browser-artifacts/prices/cellphones-pages.json'), 'utf8'))
  const plan = buildPlan(db, pages), directory = path.resolve(__dirname, '../backups'); fs.mkdirSync(directory, { recursive: true })
  const target = path.join(directory, 'CELLPHONES_PRICE_COST_PLAN_2026-11-06.json')
  if (fs.existsSync(target)) throw Error('Plan already exists; do not regenerate random cost ratios silently')
  fs.writeFileSync(target, JSON.stringify(plan, null, 2) + '\n')
  console.log(JSON.stringify({ matchedVariants: plan.changes.length, products: new Set(plan.changes.map(c => c.productId)).size, skippedVariants: plan.skipped.length, models: plan.costModels.map(m => ({ name: m.name, percent: m.percent })) }))
}
module.exports = { buildPlan, color, model }
