import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import OrderTimeline from '../../components/OrderTimeline'
import api from '../../services/api'
import { messageOf, runCommand } from '../../services/operations'
import { getCurrentUser } from '../../utils/auth'
import { formatDate, warrantyLabel, claimLabels } from '../../utils/variants'
import { formatPrice } from '../../utils/formatPrice'
import { showToast } from '../../utils/shopActions'

const statusLabels = { available: 'Sẵn trong kho', allocated: 'Đang xử lí', shipping: 'Đang giao', sold: 'Đã bán', return_pending: 'Chờ nhận lại', quarantine: 'Chờ kiểm tra', retired: 'Ngừng sử dụng' }
export default function DeviceProfile() {
  const [params, setParams] = useSearchParams(), imei = params.get('imei') || ''
  const [input, setInput] = useState(imei), [data, setData] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(false), [busy, setBusy] = useState(false)
  const [cost, setCost] = useState(''), [reason, setReason] = useState('')
  const isAdmin = getCurrentUser()?.role === 'admin'
  const load = useCallback(async () => {
    setData(null); setError(''); setCost(''); setReason('')
    if (!imei) return
    setLoading(true)
    try { setData((await api.get('/devices/profile/' + encodeURIComponent(imei))).data) }
    catch (e) { setError(messageOf(e)) } finally { setLoading(false) }
  }, [imei])
  useEffect(() => { Promise.resolve().then(load) }, [load])
  const saveCost = async e => {
    e.preventDefault(); setBusy(true)
    try { await runCommand('set-device-cost', { deviceId: data.device.id, expectedRevision: data.device.revision, purchaseCost: Number(cost), reason }); await load(); showToast('Đã lưu giá vốn và lịch sử bổ sung') }
    catch (e) { setError(messageOf(e)) } finally { setBusy(false) }
  }
  return <AdminLayout><h2>Hồ sơ IMEI</h2><p>Tra cứu trạng thái hiện tại và các lần nhập, xuất giao, nhận lại, bán lại, bảo hành của một máy.</p>
    <form className="card p-3 my-3" onSubmit={e => { e.preventDefault(); const next = input.trim(); if (imei === next) load(); else setParams({ imei: next }) }}><label htmlFor="profile-imei">IMEI 15 chữ số</label><div className="d-flex gap-2"><input id="profile-imei" required pattern="[0-9]{15}" maxLength="15" className="form-control" value={input} onChange={e => setInput(e.target.value)} /><button disabled={loading} className="btn btn-primary">Tra cứu IMEI</button></div></form>
    {loading && <p role="status">Đang tải hồ sơ máy…</p>}{error && <div role="alert" className="alert alert-danger">{error}</div>}
    {data && <>
      <section className="card p-3 my-3"><h4>{data.product}</h4><p>{data.variant?.ram} / {data.variant?.storage} · {data.variant?.color}</p><strong>{data.device.imei} · {statusLabels[data.device.status]}</strong><p>Ngày nhận kho: {formatDate(data.device.receivedAt)}</p>{data.device.historicalOnly && <p className="alert alert-warning">Bản ghi mô phỏng bổ sung lịch sử, không phải máy trong kho bán và không xác nhận từng xuất giao.</p>}
        {isAdmin && <><p>Giá nhập hiện tại: <strong>{data.device.purchaseCost == null ? 'Chưa có giá vốn' : formatPrice(data.device.purchaseCost)}</strong>{data.device.purchaseCostSource?.type === 'demo_backfill' && <small className="d-block text-warning">Vốn mô phỏng {data.device.purchaseCostSource.percent}% giá bán cũ, không phải giá nhập thực.</small>}</p>{data.receipt ? <p>Phiếu nhập: <Link to={'/admin/receipts?receipt=' + data.receipt.id}>{data.receipt.id}</Link> · {data.receipt.supplierName || 'Chưa xác định nhà cung cấp'}</p> : <p>Máy cũ chưa có phiếu nhập.</p>}
          {!data.device.historicalOnly && <details><summary>Bổ sung / điều chỉnh giá vốn</summary><form className="mt-3" onSubmit={saveCost}><p className="text-muted">Bổ sung snapshot còn thiếu; không thay snapshot giá vốn đã biết của đơn cũ.</p><label htmlFor="device-cost">Giá vốn (₫)</label><input id="device-cost" type="number" min="0" step="1" required className="form-control" value={cost} onChange={e => setCost(e.target.value)} /><label htmlFor="device-cost-reason">Lý do</label><textarea id="device-cost-reason" required className="form-control" value={reason} onChange={e => setReason(e.target.value)} /><button disabled={busy} className="btn btn-success mt-2">Lưu giá vốn</button></form></details>}
          <details className="mt-2"><summary>Lịch sử giá vốn</summary>{(data.device.costHistory || []).map((h, i) => <p key={i}>{formatDate(h.at)} · {h.previousCost == null ? 'Chưa biết' : formatPrice(h.previousCost)} → {formatPrice(h.purchaseCost)} · {h.reason} · {h.actorId}</p>)}</details>
        </>}
      </section>
      <section className="card p-3 my-3"><h5>Phân bổ và kiểm tra máy</h5>{(data.device.assignmentHistory || []).map((h, i) => <p key={i}>{formatDate(h.at)} · {({ allocated: 'Đã phân bổ', released: 'Giải phóng trước giao', return_pending: 'Chờ nhận lại', returned: 'Đã nhận lại' })[h.event] || h.event} · {h.orderId && <Link to={'/admin/orders?order=' + h.orderId}>Đơn #{h.orderId}</Link>}</p>)}{(data.device.statusHistory || []).map((h, i) => <p key={'status-' + i}>{formatDate(h.at)} · {statusLabels[h.from]} → {statusLabels[h.to]} · {h.note}</p>)}{!data.device.assignmentHistory?.length && !data.device.statusHistory?.length && <p>Chưa lưu lịch sử thao tác cho máy này.</p>}</section>
      <section className="card p-3 my-3"><h5>Các đơn liên quan ({data.orders.length})</h5>{data.orders.map(o => <div key={o.id} className="border-bottom py-2"><Link to={'/admin/orders?order=' + o.id}>Đơn #{o.id}</Link> · {o.status}<p>{o.snapshots.length ? 'Đơn có snapshot IMEI đã lưu; không thay đổi khi máy bán lại.' : 'Liên kết từ lịch sử phân bổ, chưa có snapshot xuất giao.'}</p><OrderTimeline order={o} admin={isAdmin} /></div>)}</section>
      <section className="card p-3"><h5>Bảo hành theo từng lần bán</h5>{!data.warranties.length && <p>Chưa có quyền bảo hành.</p>}{data.warranties.map(w => <div key={w.id} className="border-bottom py-2"><p>Đơn #{w.orderId} · {warrantyLabel(w)} · {formatDate(w.startsAt)} → {formatDate(w.endsAt)}</p>{data.claims.filter(c => c.warrantyId === w.id).map(c => <details key={c.id}><summary>Phiếu #{c.id} · {claimLabels[c.status]}</summary><p>{c.reportedIssue}</p><ol>{c.history.map((h, i) => <li key={i}>{formatDate(h.at)} · {claimLabels[h.status]} · {h.note}</li>)}</ol></details>)}</div>)}</section>
    </>}
  </AdminLayout>
}
