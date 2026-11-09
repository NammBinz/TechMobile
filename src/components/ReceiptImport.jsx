import { useState } from 'react'
import api from '../services/api'
import { messageOf } from '../services/operations'
import { parseCsv, importRows } from '../utils/receiptImport'

export default function ReceiptImport({ products, disabled, onApply }) {
  const [preview, setPreview] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [filename, setFilename] = useState('')
  const read = async event => {
    const file = event.target.files[0]; setPreview(null); setError(''); setFilename(file?.name || '')
    if (!file) return
    setBusy(true)
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('File tối đa 2 MB')
      let matrix
      if (/\.csv$/i.test(file.name)) matrix = parseCsv(await file.text())
      else if (/\.xlsx$/i.test(file.name)) {
        const { readSheet } = await import('read-excel-file/browser')
        matrix = await readSheet(file, { sheet: 1 })
      } else throw new Error('Chỉ nhận .xlsx hoặc .csv; hãy lưu file .xls thành .xlsx')
      const rows = importRows(matrix)
      setPreview((await api.post('/purchaseReceipts/import-preview', { rows })).data)
    } catch (e) { setError(e.response ? messageOf(e) : e.message) } finally { setBusy(false) }
  }
  const template = () => {
    const rows = [['productId', 'variantId', 'productName', 'ram', 'storage', 'color', 'imei', 'unitCost'], ...products.flatMap(p => p.variants.map(v => [p.id, v.id, p.name, v.ram || p.ram || '', v.storage, v.color, '', '']))]
    const csv = '\uFEFF' + rows.map(row => row.map(value => '"' + String(value).replaceAll('"', '""') + '"').join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), a = document.createElement('a')
    a.href = url; a.download = 'techmobile-nhap-kho-mau.csv'; a.click(); URL.revokeObjectURL(url)
  }
  return <section className="card p-3 my-3 receipt-import"><h5>Nhập hàng loạt Excel / CSV</h5><p>Chỉ admin. Mỗi dòng là một máy; điền IMEI dạng Text và giá vốn nguyên đồng, không có dấu phân cách. Đọc sheet đầu tiên, tối đa 500 máy / 2 MB. Xóa các dòng mẫu không nhập.</p>
    <div className="d-flex flex-wrap gap-2 align-items-center"><button type="button" className="btn btn-outline-secondary" disabled={!products.length || disabled || busy} onClick={template}>Tải mẫu CSV có danh sách phiên bản</button><div><label htmlFor="receipt-import-file" className="form-label">Chọn file .xlsx / .csv</label><input id="receipt-import-file" type="file" accept=".xlsx,.csv" className="form-control" disabled={disabled || busy} onChange={read} /></div></div>
    {busy && <p role="status">Đang đọc và kiểm tra file…</p>}{error && <div role="alert" className="alert alert-danger mt-2">{error}</div>}
    {preview && <><p className="mt-3">{filename}: {preview.rows.length} máy · {preview.errors} dòng lỗi. {preview.message}</p><div className="table-responsive" style={{ maxHeight: 350 }}><table className="table table-sm"><thead><tr><th>Dòng</th><th>Sản phẩm / phiên bản</th><th>IMEI</th><th>Giá vốn</th><th>Kết quả</th></tr></thead><tbody>{preview.rows.map((r, index) => <tr key={index} className={r.errors.length ? 'table-danger' : ''}><td>{r.row}</td><td>{r.productName} · {r.ram} / {r.storage} · {r.color}</td><td>{String(r.imei ?? '')}</td><td>{r.unitCost ?? 'Chưa hợp lệ'}</td><td>{r.errors.length ? r.errors.join('; ') : 'Hợp lệ'}</td></tr>)}</tbody></table></div><button type="button" className="btn btn-primary align-self-start" disabled={!preview.valid || disabled || busy} onClick={() => { onApply(preview.lines); setPreview(null) }}>Đưa dữ liệu hợp lệ vào phiếu nháp</button><p className="small text-muted mt-2">Chưa lưu phiếu, chưa tăng tồn. Không nhập một phần khi file còn lỗi; kiểm trùng được thực hiện lại khi xác nhận nhập kho.</p></>}
  </section>
}
