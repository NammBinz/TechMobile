import { useState } from 'react'
import { compareVariants } from '../utils/variants'
import api from '../services/api'
import { messageOf } from '../services/operations'
import { showToast } from '../utils/shopActions'
import AdminFormSection, { AdminFields } from './AdminFormSection'

export default function VariantEditor({ product, onSaved }) {
  const [variants, setVariants] = useState(() => product.variants.map(v => ({ ...v, ram: v.ram || product.ram || '' })).sort(compareVariants))
  const [busy, setBusy] = useState(false)
  const change = (index, key, value) => setVariants(previous => previous.map((v, i) => i === index ? { ...v, [key]: value } : v))
  const save = async event => {
    event.preventDefault(); setBusy(true)
    try {
      await api.patch(`/products/${product.id}`, { variants: variants.map(v => ({ ...v, price: Number(v.price), oldPrice: Number(v.oldPrice || v.price), warrantyMonths: Number(v.warrantyMonths) })) })
      showToast('Đã lưu phiên bản'); await onSaved()
    } catch (error) { showToast(messageOf(error), 'warning') } finally { setBusy(false) }
  }
  return <form className="card p-3 my-3 admin-entry-form" onSubmit={save}>
    <AdminFormSection title={`Phiên bản · ${product.name}`} description="Mỗi thẻ là một phiên bản riêng. Máy đã nhập kho giữ màu và dung lượng; có thể cập nhật giá, ảnh, thời hạn bảo hành hoặc ngừng bán.">
      {variants.map((v, index) => <section className="admin-variant-card" key={v.id}>
        <div className="admin-variant-heading"><strong>Phiên bản {index + 1} · {v.color || 'Chưa chọn màu'} · {v.ram ? `${v.ram} / ` : ''}{v.storage || 'Chưa nhập dung lượng'}</strong><span className={`badge ${v.status === 'inactive' ? 'bg-secondary' : 'bg-success'}`}>{v.status === 'inactive' ? 'Ngừng bán' : 'Đang bán'}</span></div>
        <AdminFields idPrefix={`variant-${v.id}`} values={v} onChange={e => change(index, e.target.name, e.target.value)} fields={[
          { name: 'color', label: 'Màu sắc', ariaLabel: 'color', required: true, width: 'col-sm-6 col-lg-3', placeholder: 'Ví dụ: Xanh đậm' },
          { name: 'ram', label: 'RAM', ariaLabel: 'ram', required: true, placeholder: '12GB', width: 'col-sm-6 col-lg-3' },
          { name: 'storage', label: 'Dung lượng', ariaLabel: 'storage', required: true, width: 'col-sm-6 col-lg-3', placeholder: '256GB' },
          { name: 'price', label: 'Giá bán (₫)', ariaLabel: 'price', type: 'number', min: 0, step: 1, required: true, width: 'col-sm-6 col-lg-3' },
          { name: 'oldPrice', label: 'Giá gốc (₫)', ariaLabel: 'oldPrice', type: 'number', min: 0, step: 1, width: 'col-sm-6 col-lg-3' },
          { name: 'image', label: 'Ảnh phiên bản', ariaLabel: 'image', placeholder: '/IMG/ten-anh.jpg hoặc URL ảnh', width: 'col-lg-6' },
          { name: 'warrantyMonths', label: 'Bảo hành (tháng)', ariaLabel: 'warrantyMonths', type: 'number', min: 1, max: 120, step: 1, required: true, width: 'col-sm-6 col-lg-3' },
          { name: 'status', label: 'Trạng thái', type: 'select', width: 'col-sm-6 col-lg-3', options: [{ value: 'active', label: 'Đang bán' }, { value: 'inactive', label: 'Ngừng bán' }] }
        ]} />
      </section>)}
    </AdminFormSection>
    <div className="admin-form-actions"><button disabled={busy} className="btn btn-success" type="submit">Lưu phiên bản</button><button type="button" disabled={busy} className="btn btn-outline-secondary" onClick={() => setVariants([...variants, { id: crypto.randomUUID(), color: '', ram: product.ram || '', storage: '', price: product.price, oldPrice: product.oldPrice, image: product.image, status: 'active', warrantyMonths: 12 }])}>Thêm phiên bản</button><small>Tồn kho được cập nhật từ danh sách IMEI.</small></div>
  </form>
}
