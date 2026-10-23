import { useEffect, useState } from 'react'
import api from '../services/api'
import { messageOf, runCommand } from '../services/operations'
import { showToast } from '../utils/shopActions'

function AllocationPanel({ order, onChange }) {
  const [result, setResult] = useState(null), [page, setPage] = useState(1)
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    Promise.resolve().then(async () => {
      setResult(null); setError('')
      try {
        const { data } = await api.get('/devices', { params: { orderId: order.id, status: 'return_pending', page, limit: 20 }, signal: controller.signal })
        if (!controller.signal.aborted) {
          if (page > data.totalPages) setPage(data.totalPages)
          else setResult(data)
        }
      } catch (error) { if (!controller.signal.aborted) setError(messageOf(error)) }
    })
    return () => controller.abort()
  }, [order.id, order.revision, page])
  const acceptReturn = async device => {
    setBusy(true)
    try { await runCommand('accept-return', { orderId: order.id, expectedRevision: order.revision || 0, deviceId: device.id }); showToast('Đã nhận lại máy, chờ kiểm tra'); await onChange() }
    catch (error) { showToast(messageOf(error), 'warning'); await onChange() }
    finally { setBusy(false) }
  }
  if (error) return <div className="alert alert-warning mt-2">{error} <button className="btn btn-sm btn-outline-secondary" onClick={onChange}>Tải lại</button></div>
  if (!result) return <p className="mt-2">Đang tải IMEI của đơn...</p>
  return <div className="device-allocation mt-3">
    <p className="text-muted">Máy đã xuất giao cần được nhận lại và kiểm tra trước khi bán tiếp.</p>
    {order.items.filter(item => result.items.some(d => String(d.assignment?.orderItemId) === String(item.id))).map(item => <div key={item.id} className="border rounded p-3 mb-2">
      <strong>{[item.name, item.color, item.storage].filter(Boolean).join(' · ')}</strong>
      {result.items.filter(d => String(d.assignment?.orderItemId) === String(item.id)).map(d => <div key={d.id} className="mt-1">IMEI: {d.imei}{d.status === 'return_pending' && <><span className="badge bg-warning text-dark ms-2">Chờ nhận lại</span><button disabled={busy} className="btn btn-sm btn-outline-warning ms-2" onClick={() => acceptReturn(d)}>Đã nhận lại, chờ kiểm tra</button></>}</div>)}
    </div>)}
    {!result.total && <p>Không còn máy chờ nhận lại của đơn này.</p>}
    {result.totalPages > 1 && <div className="d-flex align-items-center gap-2 mb-3"><button className="btn btn-sm btn-outline-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>IMEI trang trước</button><span>Trang {page}/{result.totalPages}</span><button className="btn btn-sm btn-outline-secondary" disabled={page >= result.totalPages} onClick={() => setPage(page + 1)}>IMEI trang sau</button></div>}
  </div>
}
export default function OrderDeviceAllocation(props) {
  const [open, setOpen] = useState(false)
  if (props.order.status !== 'cancelled') return null
  return <div className="mt-3 no-print"><button className="btn btn-outline-secondary btn-sm" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Thu gọn máy chờ nhận lại' : 'Máy chờ nhận lại'}</button>{open && <AllocationPanel {...props} />}</div>
}
