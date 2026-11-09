import OrderTimeline from '../../components/OrderTimeline'
import { getCurrentUser } from '../../utils/auth'
import { Link, useSearchParams } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import { formatPrice } from '../../utils/formatPrice'
import OrderInvoiceModal from '../../components/OrderInvoiceModal'
import OrderDeviceAllocation from '../../components/OrderDeviceAllocation'
import { messageOf, runCommand } from '../../services/operations'
import { formatDate } from '../../utils/variants'

function OrderManager() {
  const [orders, setOrders] = useState([])
  const [orderDevices, setOrderDevices] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [params] = useSearchParams()
  const [search, setSearch] = useState(params.get('order') || '')
  const [invoiceOrder, setInvoiceOrder] = useState(null)
  const [cancelOrder, setCancelOrder] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [busyOrderId, setBusyOrderId] = useState(null)

  const getOrders = useCallback(async () => {
    try {
      const [res, allocated, returns] = await Promise.all([api.get('/orders'), api.get('/devices', { params: { status: 'allocated' } }), api.get('/devices', { params: { status: 'return_pending' } })])
      setOrders(res.data.reverse())
      setOrderDevices([...allocated.data, ...returns.data])
    } catch (error) {
      console.log(error)
    }
  }, [])

  useEffect(() => {
    Promise.resolve().then(getOrders)
  }, [getOrders])

  const getStatusText = (status) => {
    if (status === 'pending') return 'Chờ xác nhận'
    if (status === 'confirmed') return 'Đã xác nhận'
    if (status === 'shipping') return 'Đang giao hàng'
    if (status === 'delivered') return 'Đã giao hàng'
    if (status === 'completed') return 'Hoàn thành'
    if (status === 'cancelled') return 'Đã hủy'

    return status
  }

  const getStatusBadge = (status) => {
    if (status === 'pending') return 'badge bg-warning text-dark'
    if (status === 'confirmed') return 'badge bg-primary'
    if (status === 'shipping') return 'badge bg-info text-dark'
    if (status === 'delivered') return 'badge bg-primary'
    if (status === 'completed') return 'badge bg-success'
    if (status === 'cancelled') return 'badge bg-danger'

    return 'badge bg-secondary'
  }

  const handleUpdateStatus = async (order, newStatus) => {
    setBusyOrderId(order.id)
    try { await runCommand('transition', { orderId: order.id, expectedRevision: order.revision || 0, status: newStatus }); await getOrders() }
    catch (error) { alert(messageOf(error)); await getOrders() }
    finally { setBusyOrderId(null) }
  }
  const handleConfirmOrder = order => handleUpdateStatus(order, 'confirmed')
  const handleShippingOrder = order => handleUpdateStatus(order, 'shipping')

  const openAdminCancelModal = (order) => {
    setCancelOrder(order)
    setCancelReason('')
  }

  const closeAdminCancelModal = () => {
    setCancelOrder(null)
    setCancelReason('')
  }

  const handleSubmitAdminCancelOrder = async (e) => {
    e.preventDefault()
    if (!cancelOrder || !cancelReason.trim()) { alert('Nhập lý do hủy'); return }
    try {
      await runCommand('cancel', { orderId: cancelOrder.id, expectedRevision: cancelOrder.revision || 0, reason: cancelReason.trim() })
      closeAdminCancelModal(); await getOrders()
      alert('Đã hủy đơn. Máy đã xuất giao phải được nhận lại trước khi bán tiếp.')
    } catch (error) { alert(messageOf(error)); await getOrders() }
  }
  const handleMarkDelivered = order => handleUpdateStatus(order, 'delivered')

  const filteredOrders = orders.filter((order) => {
    const matchStatus = statusFilter === 'all' || order.status === statusFilter

    const matchSearch =
      order.id.toString().includes(search) ||
      (order.legacyIds || []).some(value => String(value).includes(search)) ||
      order.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      order.receiverName?.toLowerCase().includes(search.toLowerCase()) ||
      order.phone?.includes(search)

    return matchStatus && matchSearch
  })

  const getPaymentStatusText = (status) => {
    if (status === 'paid') return 'Đã thanh toán'
    return 'Chưa thanh toán'
  }

  const getPaymentStatusBadge = (status) => {
    if (status === 'paid') return 'badge bg-success'
    return 'badge bg-secondary'
  }

  const handleChangePaymentStatus = async (order, newStatus) => {
    try { await runCommand('payment', { orderId: order.id, expectedRevision: order.revision || 0, status: newStatus }); await getOrders() }
    catch (error) { alert(messageOf(error)); await getOrders() }
  }

  return (
    <AdminLayout>
      <h2 className="mb-4">Quản lý đơn hàng</h2>

      <div className="card mb-4">
        <div className="card-body">
          <div className="row">
            <div className="col-md-4 mb-2">
              <label className="form-label">Tìm kiếm đơn hàng</label>

              <input
                type="text"
                className="form-control"
                placeholder="Mã đơn, khách hàng, người nhận, SĐT..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="col-md-4 mb-2">
              <label className="form-label">Lọc theo trạng thái</label>

              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tất cả đơn hàng</option>
                <option value="pending">Chờ xác nhận</option>
                <option value="confirmed">Đã xác nhận</option>
                <option value="shipping">Đang giao hàng</option>
                <option value="delivered">Đã giao hàng</option>
                <option value="completed">Hoàn thành</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>

            <div className="col-md-4 mb-2">
              <label className="form-label">Thao tác</label>

              <button
                className="btn btn-outline-danger w-100"
                onClick={() => {
                  setSearch('')
                  setStatusFilter('all')
                }}
              >
                Xóa lọc
              </button>
            </div>
          </div>

          <div className="alert alert-info mb-0 mt-3">
            Tổng số đơn hàng đang hiển thị: <strong>{filteredOrders.length}</strong>
          </div>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="alert alert-warning">
          Chưa có đơn hàng nào.
        </div>
      ) : (
        filteredOrders.map((order) => (
          <div className="card mb-4 shadow-sm" key={order.id} data-order-id={order.id} data-order-revision={order.revision || 0}>
            <div className="card-header d-flex justify-content-between align-items-center">
              <div>
                <strong>Mã đơn hàng: #{order.id}</strong>
                <span className="ms-3">Ngày đặt: {order.createdAt}</span>
              </div>

              <span className={getStatusBadge(order.status)}>
                {getStatusText(order.status)}
              </span>
            </div>

            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-6">
                  <p>
                    <strong>Khách hàng:</strong> {order.customerName || 'Chưa có thông tin'}
                  </p>

                  <p>
                    <strong>Người nhận:</strong> {order.receiverName}
                  </p>

                  <p>
                    <strong>Số điện thoại:</strong> {order.phone}
                  </p>
                </div>

                <div className="col-md-6">
                  <p>
                    <strong>Địa chỉ:</strong> {order.address}
                  </p>

                  <p>
                    <strong>Phương thức:</strong> {order.paymentMethod}
                  </p>

                  <p>
                    <strong>Trạng thái thanh toán:</strong>{' '}
                    <span className={getPaymentStatusBadge(order.paymentStatus)}>
                      {getPaymentStatusText(order.paymentStatus)}
                    </span>
                  </p>

                  <p>
                    <strong>Ghi chú:</strong> {order.note || 'Không có'}
                  </p>
                </div>
              </div>

              {order.status === 'cancelled' && orderDevices.some(d => d.status === 'return_pending' && String(d.assignment?.orderId) === String(order.id)) && <OrderDeviceAllocation order={order} onChange={getOrders} />}
              {order.status === 'cancelled' && order.items.some(item => item.deviceSnapshots?.length > 0) && !order.items.some(item => item.imeiHistorySource === 'demo_backfill') && <p className="small text-muted mb-2">IMEI đã xuất giao được lưu theo đơn này, kể cả khi máy đã nhận về và bán cho đơn khác. Chỉ được bán lại sau khi nhận về và kiểm tra đạt.</p>}
              {order.items.some(item => item.imeiHistorySource === 'demo_backfill') && <p className="small text-muted">Đơn cũ đã được bổ sung IMEI mô phỏng theo yêu cầu; không xác nhận máy đã từng xuất giao và không tính vào tồn bán.</p>}
              <OrderTimeline order={order} admin={getCurrentUser()?.role === 'admin'} />
              <div className="table-responsive">
                <table className="table table-bordered align-middle text-center">
                  <thead>
                    <tr>
                      <th>Ảnh</th>
                      <th>Sản phẩm</th>
                      <th>Giá</th>
                      <th>Số lượng</th>
                      <th>Thành tiền</th>
                    </tr>
                  </thead>

                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id || item.productId}>
                        <td>
                          <img
                            src={item.image}
                            alt={item.name}
                            style={{
                              width: '70px',
                              height: '70px',
                              objectFit: 'contain'
                            }}
                          />
                        </td>

                        <td>{item.name}{(item.color || item.storage) && <><br />{[item.color, item.storage].filter(Boolean).join(' · ')}</>}<div className="order-item-imeis">{(item.deviceSnapshots?.length ? item.deviceSnapshots : orderDevices.filter(d => String(d.assignment?.orderId) === String(order.id) && String(d.assignment?.orderItemId) === String(item.id))).map(d => <small className="d-block" key={d.deviceId || d.id}>IMEI: <Link to={'/admin/imei?imei=' + d.imei}>{d.imei}</Link></small>)}{!item.deviceSnapshots?.length && !orderDevices.some(d => String(d.assignment?.orderId) === String(order.id) && String(d.assignment?.orderItemId) === String(item.id)) && <small className="text-muted">{order.status === 'cancelled' ? 'Chưa ghi nhận IMEI cho dòng đơn này.' : 'Chưa phân bổ IMEI.'}</small>}</div></td>

                        <td>{formatPrice(item.price)}</td>

                        <td>{item.quantity}</td>

                        <td className="text-danger fw-bold">
                          {formatPrice(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {order.status === 'cancelled' && order.cancelReason && (
                <div className="alert alert-danger py-2 mb-3">
                  <strong>Lý do hủy:</strong> {order.cancelReason}
                  <br />
                  <small>
                    Người hủy:{' '}
                    {order.cancelledBy === 'admin' ? 'Quản trị viên' : 'Khách hàng'}
                    {order.cancelledAt ? ` - ${formatDate(order.cancelledAt)}` : ''}
                  </small>
                </div>
              )}

              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-3">
                <div className="d-flex flex-wrap gap-2 col-lg-5">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleConfirmOrder(order)}
                    disabled={order.status !== 'pending' || busyOrderId === order.id}
                  >
                    Xác nhận đơn
                  </button>

                  <button
                    className="btn btn-info btn-sm text-dark"
                    onClick={() => handleShippingOrder(order)}
                    disabled={order.status !== 'confirmed' || busyOrderId === order.id}
                  >
                    Giao hàng
                  </button>

                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => handleMarkDelivered(order)}
                    disabled={order.status !== 'shipping' || busyOrderId === order.id}
                  >
                    Đã giao hàng
                  </button>

                  <button
                    className="btn btn-warning btn-sm"
                    onClick={() => openAdminCancelModal(order)}
                    disabled={order.status === 'completed' || order.status === 'cancelled'}
                  >
                    Hủy đơn
                  </button>

                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => setInvoiceOrder(order)}
                  >
                    Hóa đơn
                  </button>

                  <span className={getStatusBadge(order.status)} style={{ height: '30px', lineHeight: '20px', width: '110px' }}>
                    {getStatusText(order.status)}
                  </span>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <label className="fw-bold">Thanh toán:</label>

                  <select
                    className="form-select form-select-sm"
                    style={{ width: '170px' }}
                    value={order.paymentStatus || 'unpaid'}
                    disabled={order.paymentMethod === 'COD'}
                    onChange={(e) => handleChangePaymentStatus(order, e.target.value)}
                  >
                    <option value="unpaid">Chưa thanh toán</option>
                    <option value="paid">Đã thanh toán</option>
                  </select>

                  {order.paymentMethod === 'COD' && (
                    <small className="text-muted d-block">
                      COD tự thanh toán khi khách xác nhận nhận hàng
                    </small>
                  )}
                </div>

                <h5 className="mb-0">
                  Tổng tiền:{' '}
                  <span className="text-danger">
                    {formatPrice(order.totalPrice)}
                  </span>
                </h5>
              </div>
            </div>
          </div>
        ))
      )}

      {cancelOrder && (
        <div className="review-modal-overlay">
          <div className="review-modal-box">
            <h3>Lý do hủy đơn hàng</h3>

            <form onSubmit={handleSubmitAdminCancelOrder}>
              <label htmlFor="admin-cancel-reason" className="form-label">Lý do hủy <span className="admin-required">*</span></label>
              <textarea
                className="form-control mb-3"
                rows="4"
                id="admin-cancel-reason" required value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do hủy đơn hàng..."
              />

              <div className="admin-form-actions">
              <button type="submit" className="btn btn-danger">
                Xác nhận hủy đơn
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeAdminCancelModal}
              >
                Đóng
              </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {invoiceOrder && (
        <OrderInvoiceModal
          order={invoiceOrder}
          onClose={() => setInvoiceOrder(null)}
        />
      )}

    </AdminLayout>
  )
}

export default OrderManager
