const aliases = { productid: 'productId', masanpham: 'productId', variantid: 'variantId', maphienban: 'variantId', productname: 'productName', tensanpham: 'productName', ram: 'ram', storage: 'storage', dungluong: 'storage', color: 'color', mau: 'color', imei: 'imei', unitcost: 'unitCost', gianhap: 'unitCost', giavon: 'unitCost' }
const key = text => String(text || '').replace(/^\uFEFF/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z]/g, '')
export function parseCsv(text) {
  const first = text.replace(/^\uFEFF/, '').split(/\r?\n/)[0]
  const delimiter = first.includes(';') ? ';' : first.includes('\t') ? '\t' : ','
  const rows = [], row = []; let cell = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++ } else quoted = !quoted }
    else if (!quoted && (ch === delimiter || ch === '\n' || ch === '\r')) {
      row.push(cell); cell = ''
      if (ch !== delimiter) { rows.push([...row]); row.length = 0; if (ch === '\r' && text[i + 1] === '\n') i++ }
    } else cell += ch
  }
  if (quoted) throw new Error('CSV có dấu nháy chưa đóng')
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows
}
export function importRows(matrix) {
  if (!Array.isArray(matrix) || matrix.length < 2) throw new Error('File chưa có dòng dữ liệu')
  if (matrix.length > 1001) throw new Error('File quá nhiều dòng; tối đa 500 máy')
  const headers = matrix[0].map(value => aliases[key(value)] || null), used = headers.filter(Boolean)
  if (new Set(used).size !== used.length) throw new Error('File có cột trùng tên')
  if (!used.includes('imei') || !used.includes('unitCost')) throw new Error('File cần cột imei và unitCost (giá vốn)')
  const rows = matrix.slice(1).map((cells, index) => ({ rowNumber: index + 2, ...Object.fromEntries(headers.map((name, i) => [name, cells[i] ?? '']).filter(([name]) => name)) })).filter(row => Object.entries(row).some(([name, value]) => name !== 'rowNumber' && String(value).trim() !== ''))
  if (rows.length > 500) throw new Error('Tối đa 500 máy mỗi phiếu')
  return rows
}
