import { useState } from 'react'
import api from '../services/api'
import { messageOf } from '../services/operations'
import { showToast } from '../utils/shopActions'

export default function VariantEditor({ product, onSaved }) {
  const [variants, setVariants] = useState(() => product.variants.map(v => ({ ...v })))
  const [busy, setBusy] = useState(false)
  const change = (index, key, value) => setVariants(previous => previous.map((v, i) => i === index ? { ...v, [key]: value } : v))
  const save = async event => {
    event.preventDefault(); setBusy(true)
    try {
      await api.patch(`/products/${product.id}`, { variants: variants.map(v => ({ ...v, price: Number(v.price), oldPrice: Number(v.oldPrice || v.price), warrantyMonths: Number(v.warrantyMonths) })) })
      showToast('Đã lưu phiên bản'); await onSaved()
    } catch (error) { showToast(messageOf(error), 'warning') } finally { setBusy(false) }
  }
  return <form className="card p-3 my-3" onSubmit={save}><h5>Phiên bản · {product.name}</h5><p>Tồn kho được tính từ IMEI. Phiên bản đã có máy không được đổi màu/dung lượng; có thể ngừng bán.</p><div className="table-responsive"><table className="table"><thead><tr><th>Màu</th><th>Dung lượng</th><th>Giá</th><th>Giá gốc</th><th>Ảnh</th><th>BH (tháng)</th><th>Trạng thái</th></tr></thead><tbody>{variants.map((v, index) => <tr key={v.id}>{['color', 'storage', 'price', 'oldPrice', 'image', 'warrantyMonths'].map(key => <td key={key}><input aria-label={key} className="form-control form-control-sm" required={key !== 'oldPrice' && key !== 'image'} type={['price', 'oldPrice', 'warrantyMonths'].includes(key) ? 'number' : 'text'} min={key === 'warrantyMonths' ? 1 : 0} step="1" value={v[key] ?? ''} onChange={e => change(index, key, e.target.value)} /></td>)}<td><select className="form-select form-select-sm" value={v.status || 'active'} onChange={e => change(index, 'status', e.target.value)}><option value="active">Đang bán</option><option value="inactive">Ngừng bán</option></select></td></tr>)}</tbody></table></div><div className="d-flex gap-2"><button type="button" className="btn btn-outline-secondary" onClick={() => setVariants([...variants, { id: crypto.randomUUID(), color: '', storage: '', price: product.price, oldPrice: product.oldPrice, image: product.image, status: 'active', warrantyMonths: 12 }])}>Thêm phiên bản</button><button disabled={busy} className="btn btn-success">Lưu phiên bản</button></div></form>
}
