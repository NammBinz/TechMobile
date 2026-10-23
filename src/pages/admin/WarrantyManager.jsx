import { useCallback, useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'
import { messageOf, runCommand } from '../../services/operations'
import { claimLabels, formatDate, warrantyLabel } from '../../utils/variants'
import { showToast } from '../../utils/shopActions'

const nextStatuses = { received: ['inspecting', 'rejected'], inspecting: ['repairing', 'rejected'], repairing: ['ready'], ready: ['returned'] }
function WarrantyManager() {
  const [warranties, setWarranties] = useState([]), [claims, setClaims] = useState([])
  const [search, setSearch] = useState(''), [selectedId, setSelectedId] = useState(''), [issue, setIssue] = useState('')
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    try { const [w, c] = await Promise.all([api.get('/warranties'), api.get('/warrantyClaims')]); setWarranties(w.data); setClaims(c.data); setError('') }
    catch (error) { setError(messageOf(error)) } finally { setLoading(false) }
  }, [])
  useEffect(() => { let active = true; Promise.resolve().then(() => { if (active) return load() }); return () => { active = false } }, [load])
  const selected = warranties.find(w => w.id === selectedId)
  const submit = async event => {
    event.preventDefault(); setBusy(true)
    try { await runCommand('create-claim', { warrantyId: selectedId, issue }); setIssue(''); showToast('Đã tạo phiếu bảo hành'); await load() }
    catch (error) { showToast(messageOf(error), 'warning') } finally { setBusy(false) }
  }
  const advance = async (claim, status) => {
    const note = window.prompt('Nhập nội dung xử lý / lý do từ chối:')
    if (!note?.trim()) return
    setBusy(true)
    try { await runCommand('transition-claim', { claimId: claim.id, expectedRevision: claim.revision, status, note }); await load(); showToast('Đã cập nhật phiếu') }
    catch (error) { showToast(messageOf(error), 'warning') } finally { setBusy(false) }
  }
  const visible = warranties.filter(w => w.imeiSnapshot.includes(search.trim()) || String(w.orderId).includes(search.trim()))
  return <AdminLayout>
    <h2>Tra cứu IMEI và bảo hành</h2>
    {error && <div className="alert alert-danger">{error} <button className="btn btn-sm btn-outline-danger" onClick={load}>Tải lại</button></div>}
    <input className="form-control my-3" placeholder="Nhập IMEI hoặc mã đơn..." value={search} onChange={e => setSearch(e.target.value)} />
    <p>{loading ? 'Đang tải bảo hành...' : `${visible.length} máy đã kích hoạt bảo hành`}</p>
    <div className="table-responsive"><table className="table table-bordered"><thead><tr><th>IMEI</th><th>Đơn hàng</th><th>Thời hạn</th><th>Trạng thái</th><th>Chi tiết</th></tr></thead><tbody>{visible.map(w => <tr key={w.id}><td>{w.imeiSnapshot}</td><td>#{w.orderId}</td><td>{formatDate(w.startsAt)}<br />{formatDate(w.endsAt)}{w.dateEstimated && <small className="d-block text-muted">Ngày ước tính từ đơn cũ</small>}</td><td>{warrantyLabel(w)}</td><td><button className="btn btn-sm btn-outline-primary" onClick={() => setSelectedId(w.id)}>Xem / tiếp nhận</button></td></tr>)}{!loading && !visible.length && <tr><td colSpan="5">Chưa có bảo hành phù hợp. Máy chưa giao có thể tra tại trang IMEI.</td></tr>}</tbody></table></div>
    {selected && <div className="card p-3 mt-3"><h4>IMEI {selected.imeiSnapshot}</h4><p>{warrantyLabel(selected)} · Khách hàng #{selected.customerId}</p>
      <form onSubmit={submit}><label className="form-label">Tình trạng máy khách báo</label><textarea required rows="3" className="form-control mb-2" value={issue} onChange={e => setIssue(e.target.value)} /><button disabled={busy || warrantyLabel(selected) !== 'Còn bảo hành'} className="btn btn-success">Tạo phiếu tiếp nhận</button></form>
      <h5 className="mt-4">Lịch sử bảo hành</h5>
      {claims.filter(c => c.warrantyId === selectedId).map(c => <div className="border rounded p-3 mt-2" key={c.id}><strong>Phiếu #{c.id.slice(0, 8)} · {claimLabels[c.status]}</strong><p>{c.reportedIssue}</p><ol>{c.history.map((h, index) => <li key={index}>{formatDate(h.at)} · {claimLabels[h.status]}: {h.note}</li>)}</ol><div className="d-flex gap-2 flex-wrap">{(nextStatuses[c.status] || []).map(status => <button key={status} disabled={busy} className="btn btn-outline-primary btn-sm" onClick={() => advance(c, status)}>{claimLabels[status]}</button>)}</div></div>)}
      {!claims.some(c => c.warrantyId === selectedId) && <p>Chưa có phiếu bảo hành.</p>}
    </div>}
  </AdminLayout>
}
export default WarrantyManager
