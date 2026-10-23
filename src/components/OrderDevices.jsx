import { claimLabels, formatDate, warrantyLabel } from '../utils/variants'

function OrderDevices({ order, warranties = [], claims = [] }) {
  return <div className="device-order-details">
    <h6>Máy và bảo hành</h6>
    {order.items.map((item, index) => <div key={item.id || index} className="mb-3">
      <strong>{item.name} {item.color} {item.storage}</strong>
      {!item.deviceSnapshots?.length && <p className="text-muted mb-0">{order.status === 'cancelled' ? 'Đơn đã hủy.' : item.inventoryMode === 'imei' ? 'IMEI sẽ hiển thị khi xuất giao.' : 'Đơn cũ chưa ghi nhận IMEI.'}</p>}
      {(item.deviceSnapshots || []).map(device => {
        const warranty = warranties.find(w => String(w.deviceId) === String(device.deviceId) && String(w.orderId) === String(order.id))
        const tickets = warranty ? claims.filter(c => c.warrantyId === warranty.id) : []
        return <div key={device.deviceId} className="device-warranty-line">
          <div><strong>IMEI: {device.imei}</strong></div>
          {warranty ? <>
            <div>{warrantyLabel(warranty)} · {formatDate(warranty.startsAt)} – {formatDate(warranty.endsAt)}</div>
            {warranty.dateEstimated && <small className="text-muted">Mốc bảo hành ước tính từ dữ liệu cũ.</small>}
          </> : <div className="text-muted">Bảo hành được kích hoạt sau khi giao thành công.</div>}
          {tickets.map(ticket => <details key={ticket.id} className="mt-2">
            <summary>Phiếu #{ticket.id.slice(0, 8)} · {claimLabels[ticket.status]}</summary>
            <p className="mb-1">{ticket.reportedIssue}</p>
            <ol>{ticket.history.map((entry, i) => <li key={i}>{formatDate(entry.at)} · {claimLabels[entry.status]}: {entry.note}</li>)}</ol>
          </details>)}
        </div>
      })}
    </div>)}
  </div>
}
export default OrderDevices
