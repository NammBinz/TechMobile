import { formatDate } from '../utils/variants'

const states = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', shipping: 'Đã xuất giao', delivered: 'Đã giao hàng', completed: 'Hoàn thành', cancelled: 'Đã hủy' }
const events = { placed: 'Tạo đơn', allocate: 'Phân bổ máy', cancel: 'Hủy đơn', 'accept-return': 'Nhận máy trả về', payment: 'Ghi nhận thanh toán', 'cost-backfilled': 'Bổ sung giá vốn' }
export default function OrderTimeline({ order, admin = false }) {
  const history = (order.history || []).filter(e => admin || !['cost-backfilled', 'internal-update'].includes(e.event))
  return <details className="my-3 order-timeline"><summary>Lịch sử xử lý đơn ({history.length})</summary>
    {!history.length && <p className="text-muted">Đơn cũ chưa lưu các mốc xử lý.</p>}
    <ol className="mt-2">{history.map((entry, index) => <li className="mb-2" key={entry.id || index}><strong>{entry.event === 'transition' ? states[entry.to] || entry.to : events[entry.event] || entry.event}</strong> · {formatDate(entry.at)}<small className="d-block text-muted">{entry.legacy ? 'Mốc đã lưu từ dữ liệu cũ; người thao tác chưa xác định.' : entry.actorRole === 'customer' ? 'Khách hàng' : entry.actorRole === 'staff' ? 'Nhân viên' : entry.actorRole === 'admin' ? 'Quản trị viên' : 'Chưa ghi nhận người thao tác'}{admin && entry.actorId ? ` · ID ${entry.actorId}` : ''}</small>{entry.note && <span>{entry.note}</span>}</li>)}</ol>
  </details>
}
