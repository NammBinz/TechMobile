import { useCallback, useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import AdminFormSection, { AdminFields } from '../../components/AdminFormSection'
import api from '../../services/api'
import { messageOf, runCommand } from '../../services/operations'
import { showToast } from '../../utils/shopActions'

const blank = { name: '', phone: '', address: '', note: '', status: 'active' }
export default function SupplierManager() {
  const [items, setItems] = useState([]), [form, setForm] = useState(blank), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const load = useCallback(async () => { try { setItems((await api.get('/suppliers')).data); setError('') } catch (e) { setError(messageOf(e)) } }, [])
  useEffect(() => { Promise.resolve().then(load) }, [load])
  const submit = async e => {
    e.preventDefault(); setBusy(true)
    try { await runCommand('save-supplier', { ...form, expectedRevision: form.revision }); setForm(blank); await load(); showToast('Đã lưu nhà cung cấp') }
    catch (e) { setError(messageOf(e)) } finally { setBusy(false) }
  }
  return <AdminLayout><h2>Nhà cung cấp</h2>{error && <div role="alert" className="alert alert-danger">{error} <button className="btn btn-sm btn-outline-danger" onClick={load}>Thử lại</button></div>}
    <form className="card p-3 my-3" onSubmit={submit}><AdminFormSection title={form.id ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'} description="Ngừng sử dụng vẫn giữ liên kết với các phiếu nhập cũ."><AdminFields idPrefix="supplier" values={form} onChange={e => setForm({ ...form, [e.target.name]: e.target.value })} fields={[{ name: 'name', label: 'Tên nhà cung cấp', required: true }, { name: 'phone', label: 'Điện thoại', type: 'tel' }, { name: 'address', label: 'Địa chỉ' }, { name: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'active', label: 'Đang sử dụng' }, { value: 'inactive', label: 'Ngừng sử dụng' }] }, { name: 'note', label: 'Ghi chú', type: 'textarea', width: 'col-12' }]} /></AdminFormSection><div className="admin-form-actions"><button disabled={busy} className="btn btn-primary">Lưu nhà cung cấp</button><button disabled={busy} type="button" className="btn btn-outline-secondary" onClick={() => setForm(blank)}>Hủy sửa</button></div></form>
    <div className="card p-3"><div className="table-responsive"><table className="table"><thead><tr><th>Tên</th><th>Điện thoại</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{items.map(s => <tr key={s.id}><td>{s.name}</td><td>{s.phone}</td><td>{s.status === 'active' ? 'Đang sử dụng' : 'Ngừng sử dụng'}</td><td><button className="btn btn-sm btn-outline-primary" onClick={() => { setForm({ ...s }); window.scrollTo(0, 0) }}>Sửa</button></td></tr>)}</tbody></table></div>{!items.length && <p>Chưa có nhà cung cấp.</p>}</div>
  </AdminLayout>
}
