// Read only public pages. No project/customer data is sent to the retailer.
const fs = require('node:fs')
const path = require('node:path')
const { createHash } = require('node:crypto')
const directory = path.resolve(__dirname, '../browser-artifacts/prices')
const roots = ['iphone-17-pro-max','iphone-17-pro','iphone-air','iphone-17','iphone-17e','iphone-17-256gb','iphone-16-pro-max','iphone-15-pro-max','iphone-15-pro','iphone-14-pro','iphone-13','samsung-galaxy-z-fold-7','samsung-galaxy-z-flip-7','samsung-galaxy-s24-ultra','samsung-galaxy-s24-plus','samsung-galaxy-a55','samsung-galaxy-a35','xiaomi-14-ultra','xiaomi-14-pro','xiaomi-redmi-note-13-pro','xiaomi-redmi-13c','oppo-find-x7-ultra','oppo-reno12-pro','oppo-reno11-f','vivo-x100-pro','vivo-v40-pro','vivo-v30','realme-gt-6','realme-gt5-pro','realme-c65','google-pixel-9-pro-xl','google-pixel-8-pro','google-pixel-8a','oneplus-12','oneplus-12r','oneplus-nord-ce4-lite','iphone-17-512gb','iphone-17-pro-512gb','iphone-15-pro-512gb','samsung-galaxy-z-fold-7-512gb','samsung-galaxy-z-flip-7-512gb','samsung-galaxy-a55-256gb','samsung-galaxy-a35-256gb','xiaomi-redmi-note-13-pro-256gb','xiaomi-redmi-13c-4gb-128gb','oppo-reno-12-pro-5g','oppo-reno-11-f-5g','vivo-v30-5g','vivo-v40-pro-5g','vivo-x100-pro-5g','realme-gt-6-5g','realme-gt-5-pro','dien-thoai-realme-c65-8gb-128gb','dien-thoai-realme-c65-8gb-256gb']
function parse(html) {
  const objects = [], related = [], schemas = []
  const visit = value => {
    if (typeof value === 'string' && value.startsWith('{')) { try { visit(JSON.parse(value)) } catch { /* Non JSON content. */ } }
    else if (Array.isArray(value)) value.forEach(visit)
    else if (value && typeof value === 'object') {
      if ('special_price' in value) objects.push(value)
      if (value.url && value.productName) related.push(value)
      Object.values(value).forEach(visit)
    }
  }
  let flight = ''
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (match[1].includes('application/ld+json')) { try { schemas.push(JSON.parse(match[2])) } catch { /* Bad schema. */ } }
    const chunk = match[2].match(/^self\.__next_f\.push\(([\s\S]*)\)$/)
    if (chunk) { try { const data = JSON.parse(chunk[1]); if (typeof data[1] === 'string') flight += data[1] } catch { /* Not data. */ } }
  }
  for (const line of flight.split('\n')) { try { visit(JSON.parse(line.slice(line.indexOf(':') + 1))) } catch { /* React flight references/text. */ } }
  for (const match of html.matchAll(/<a\b[^>]*class="[^"]*button__change-color[^"]*"[^>]*>([\s\S]*?)<\/a>/g)) {
    const color = match[1].match(/<strong[^>]*class="item-variant-name"[^>]*>([^<]+)</)?.[1]
    const price = match[1].match(/<span[^>]*class="item-variant-price"[^>]*>\s*([\d.]+)/)?.[1]
    if (color && price) objects.push({ name: color, special_price: Number(price.replaceAll('.', '')), price: null })
  }
  for (const match of html.matchAll(/href=["'](\/[^"'#?]+\.html)["']/g)) related.push({ url: match[1], productName: 'link' })
  return { objects, related, product: schemas.find(s => s['@type'] === 'Product') }
}
async function main() {
  fs.mkdirSync(directory, { recursive: true })
  const queue = roots.map(slug => ({ slug, root: slug })), visited = new Set(), pages = []
  async function worker() {
    for (;;) {
      const job = queue.shift(); if (!job) return
      if (visited.has(job.slug)) continue
      visited.add(job.slug)
      const url = 'https://cellphones.com.vn/' + job.slug + '.html'
      try {
        const cached = path.join(directory, job.slug + '.html')
        const response = fs.existsSync(cached) ? { status: fs.readFileSync(cached, 'utf8').includes('application/ld+json') ? 200 : 404, url } : await fetch(url, { signal: AbortSignal.timeout(30000) })
        const html = fs.existsSync(cached) ? fs.readFileSync(cached, 'utf8') : await response.text(), data = parse(html)
        fs.writeFileSync(path.join(directory, job.slug + '.html'), html)
        const page = { url, root: job.root, status: response.status, finalUrl: response.url, fetchedAt: new Date().toISOString(), sha256: createHash('sha256').update(html).digest('hex'), product: data.product || null, colors: data.objects.filter(o => o.name).map(o => ({ name: o.name, price: o.price, specialPrice: o.special_price, stock: o.stock_available_id, displayPrice: o.display_price })) }
        pages.push(page)
        for (const item of data.related) {
          const slug = String(item.url).replace(/^https:\/\/cellphones.com.vn\//, '').replace(/^\//, '').replace(/\.html.*$/, '')
          if (slug.startsWith(job.root + '-') && !/(?:-cu|-doi-bao-hanh|-like-new|-99|-98|-95)/.test(slug) && !visited.has(slug)) queue.push({ slug, root: job.root })
        }
        console.log(JSON.stringify({ slug: job.slug, status: response.status, name: page.product?.name, offer: page.product?.offers?.price, colors: page.colors.length }))
      } catch (error) { pages.push({ url, root: job.root, error: error.message }); console.log(JSON.stringify({ slug: job.slug, error: error.message })) }
    }
  }
  await Promise.all([worker(), worker(), worker()])
  fs.writeFileSync(path.join(directory, 'cellphones-pages.json'), JSON.stringify(pages, null, 2))
  console.log('Pages: ' + pages.length)
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1 })
module.exports = { parse, roots }
