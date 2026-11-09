import { useCallback, useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import AdminFormSection from '../../components/AdminFormSection'
import AdminNoteModal from '../../components/AdminNoteModal'
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
  const [pendingTransition, setPendingTransition] = useState(null)
  const advance = async note => {
    const { claim, status } = pendingTransition
    setBusy(true)
    try { await runCommand('transition-claim', { claimId: claim.id, expectedRevision: claim.revision, status, note }); await load(); showToast('Đã cập nhật phiếu') }
    catch (error) { showToast(messageOf(error), 'warning') } finally { setBusy(false); setPendingTransition(null) }
  }
  const visible = warranties.filter(w => w.imeiSnapshot.includes(search.trim()) || String(w.orderId).includes(search.trim()))
  return <AdminLayout>
    <h2>Tra cứu IMEI và bảo hành</h2>
    {error && <div className="alert alert-danger">{error} <button className="btn btn-sm btn-outline-danger" onClick={load}>Tải lại</button></div>}
    <div className="admin-filter-panel my-3"><label htmlFor="warranty-search" className="form-label">Tra cứu máy đã mua</label><input id="warranty-search" className="form-control" placeholder="Nhập IMEI hoặc mã đơn..." value={search} onChange={e => setSearch(e.target.value)} /></div>
    <p>{loading ? 'Đang tải bảo hành...' : `${visible.length} máy đã kích hoạt bảo hành`}</p>
    <div className="table-responsive"><table className="table table-bordered"><thead><tr><th>IMEI</th><th>Đơn hàng</th><th>Thời hạn</th><th>Trạng thái</th><th>Chi tiết</th></tr></thead><tbody>{visible.map(w => <tr key={w.id}><td>{w.imeiSnapshot}</td><td>#{w.orderId}</td><td>{formatDate(w.startsAt)}<br />{formatDate(w.endsAt)}{w.dateEstimated && <small className="d-block text-muted">Ngày ước tính từ đơn cũ</small>}</td><td>{warrantyLabel(w)}</td><td><button className="btn btn-sm btn-outline-primary" onClick={() => setSelectedId(w.id)}>Xem / tiếp nhận</button></td></tr>)}{!loading && !visible.length && <tr><td colSpan="5">Chưa có bảo hành phù hợp. Máy chưa giao có thể tra tại trang IMEI.</td></tr>}</tbody></table></div>
    {selected && <div className="card p-3 mt-3"><h4>IMEI {selected.imeiSnapshot}</h4><p>{warrantyLabel(selected)} · Khách hàng #{selected.customerId}</p>
      <form onSubmit={submit}><AdminFormSection title="Tiếp nhận bảo hành" description="Ghi rõ triệu chứng, thời điểm phát sinh và tình trạng máy khi nhận."><label className="form-label" htmlFor="warranty-issue">Tình trạng máy khách báo <span className="admin-required">*</span></label><textarea id="warranty-issue" required rows="4" placeholder="Ví dụ: màn hình không hiển thị, phát sinh từ hôm qua…" className="form-control" value={issue} onChange={e => setIssue(e.target.value)} /></AdminFormSection><div className="admin-form-actions"><button type="submit" disabled={busy || warrantyLabel(selected) !== 'Còn bảo hành'} className="btn btn-success">Tạo phiếu tiếp nhận</button><small>Phiếu chỉ tạo được khi máy còn hạn bảo hành.</small></div></form>
      <h5 className="mt-4">Lịch sử bảo hành</h5>
      {claims.filter(c => c.warrantyId === selectedId).map(c => <div className="border rounded p-3 mt-2" key={c.id}><strong>Phiếu #{c.id} · {claimLabels[c.status]}</strong><p>{c.reportedIssue}</p><ol>{c.history.map((h, index) => <li key={index}>{formatDate(h.at)} · {claimLabels[h.status]}: {h.note}</li>)}</ol><div className="d-flex gap-2 flex-wrap">{(nextStatuses[c.status] || []).map(status => <button key={status} disabled={busy} className="btn btn-outline-primary btn-sm" onClick={() => setPendingTransition({ claim: c, status })}>{claimLabels[status]}</button>)}</div></div>)}
      {!claims.some(c => c.warrantyId === selectedId) && <p>Chưa có phiếu bảo hành.</p>}
    </div>}
    {pendingTransition && <AdminNoteModal title="Cập nhật phiếu bảo hành" description={`Phiếu #${pendingTransition.claim.id} · ${claimLabels[pendingTransition.status]}`} busy={busy} onClose={() => setPendingTransition(null)} onConfirm={advance} />}
  </AdminLayout>
}
export default WarrantyManager
