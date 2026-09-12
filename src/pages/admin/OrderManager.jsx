import { useEffect, useState } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import { formatPrice } from '../../utils/formatPrice'
import OrderInvoiceModal from '../../components/OrderInvoiceModal'

function OrderManager() {
  const [orders, setOrders] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [invoiceOrder, setInvoiceOrder] = useState(null)
  const [cancelOrder, setCancelOrder] = useState(null)
  const [cancelReason, setCancelReason] = useState('')

  useEffect(() => {
    getOrders()
  }, [])

  const getOrders = async () => {
    try {
      const res = await api.get('/orders')
      setOrders(res.data.reverse())
    } catch (error) {
      console.log(error)
    }
  }

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
    try {
      await api.patch(`/orders/${order.id}`, {
        status: newStatus
      })

      alert('Cập nhật trạng thái đơn hàng thành công')
      getOrders()
    } catch (error) {
      console.log(error)
      alert('Có lỗi xảy ra khi cập nhật trạng thái')
    }
  }

  const handleConfirmOrder = (order) => {
    if (order.status !== 'pending') {
      alert('Chỉ có thể xác nhận đơn đang chờ xác nhận')
      return
    }

    handleUpdateStatus(order, 'confirmed')
  }

  const handleShippingOrder = (order) => {
    if (order.status !== 'confirmed') {
      alert('Chỉ có thể giao hàng khi đơn đã được xác nhận')
      return
    }

    handleUpdateStatus(order, 'shipping')
  }

  const handleCompleteOrder = (order) => {
    if (order.status !== 'shipping') {
      alert('Chỉ có thể hoàn thành đơn đang giao hàng')
      return
    }

    handleUpdateStatus(order, 'completed')
  }

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

    if (!cancelReason.trim()) {
      alert('Vui lòng nhập lý do hủy đơn hàng')
      return
    }

    if (!cancelOrder) return

    try {
      for (const item of cancelOrder.items) {
        const productRes = await api.get(`/products/${item.productId}`)
        const product = productRes.data

        await api.patch(`/products/${item.productId}`, {
          quantity: Number(product.quantity) + Number(item.quantity)
        })
      }

      await api.patch(`/orders/${cancelOrder.id}`, {
        status: 'cancelled',
        cancelReason: cancelReason.trim(),
        cancelledBy: 'admin',
        cancelledAt: new Date().toLocaleDateString('vi-VN')
      })

      alert('Đã hủy đơn hàng và hoàn lại tồn kho')
      closeAdminCancelModal()
      getOrders()
    } catch (error) {
      console.log(error)
      alert('Có lỗi xảy ra khi hủy đơn hàng')
    }
  }

  const handleMarkDelivered = async (order) => {
    try {
      await api.patch(`/orders/${order.id}`, {
        status: 'delivered',
        deliveredAt: new Date().toLocaleDateString('vi-VN')
      })

      alert('Đã cập nhật đơn hàng sang trạng thái Đã giao hàng')
      getOrders()
    } catch (error) {
      console.log(error)
      alert('Có lỗi xảy ra khi cập nhật trạng thái đơn hàng')
    }
  }

  const handleDelete = async (order) => {
    if (order.status !== 'cancelled') {
      alert('Chỉ nên xóa đơn hàng đã hủy')
      return
    }

    const confirmDelete = window.confirm('Bạn có chắc muốn xóa đơn hàng này không?')

    if (!confirmDelete) return

    try {
      await api.delete(`/orders/${order.id}`)
      alert('Xóa đơn hàng thành công')
      getOrders()
    } catch (error) {
      console.log(error)
      alert('Có lỗi xảy ra khi xóa đơn hàng')
    }
  }

  const filteredOrders = orders.filter((order) => {
    const matchStatus = statusFilter === 'all' || order.status === statusFilter

    const matchSearch =
      order.id.toString().includes(search) ||
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
    if (order.paymentMethod === 'COD') {
      alert('Đơn COD sẽ tự chuyển thành Đã thanh toán khi khách xác nhận đã nhận hàng')
      return
    }

    const today = new Date().toLocaleDateString('vi-VN')

    try {
      await api.patch(`/orders/${order.id}`, {
        paymentStatus: newStatus,
        paidAt: newStatus === 'paid' ? today : null,
        paidBy: newStatus === 'paid' ? 'admin' : null
      })

      alert('Cập nhật trạng thái thanh toán thành công')
      getOrders()
    } catch (error) {
      console.log(error)
      alert('Có lỗi xảy ra khi cập nhật thanh toán')
    }
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
          <div className="card mb-4 shadow-sm" key={order.id}>
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
                      <tr key={item.productId}>
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

                        <td>{item.name}</td>

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
                    {order.cancelledAt ? ` - ${order.cancelledAt}` : ''}
                  </small>
                </div>
              )}

              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-3">
                <div className="d-flex flex-wrap gap-2 col-lg-5">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleConfirmOrder(order)}
                    disabled={order.status !== 'pending'}
                  >
                    Xác nhận đơn
                  </button>

                  <button
                    className="btn btn-info btn-sm text-dark"
                    onClick={() => handleShippingOrder(order)}
                    disabled={order.status !== 'confirmed'}
                  >
                    Giao hàng
                  </button>

                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => handleMarkDelivered(order)}
                    disabled={order.status !== 'shipping'}
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

                  <span className={getStatusBadge(order.status)} style={{ height: '30px', lineHeight: '20px', width: '165px' }}>
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
              <textarea
                className="form-control mb-3"
                rows="4"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do hủy đơn hàng..."
              />

              <button className="btn btn-danger me-2">
                Xác nhận hủy đơn
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeAdminCancelModal}
              >
                Đóng
              </button>
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