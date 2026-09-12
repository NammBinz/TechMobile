import { formatPrice } from '../utils/formatPrice'

function OrderInvoiceModal({ order, onClose }) {
  if (!order) return null

  const handlePrint = () => {
    window.print()
  }

  const getStatusText = (status) => {
    if (status === 'pending') return 'Chờ xác nhận'
    if (status === 'confirmed') return 'Đã xác nhận'
    if (status === 'shipping') return 'Đang giao hàng'
    if (status === 'completed') return 'Hoàn thành'
    if (status === 'cancelled') return 'Đã hủy'
    return status
  }

  return (
    <div className="invoice-modal-overlay" onClick={onClose}>
      <div
        className="invoice-modal-box"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="invoice-print-area">
          <div className="invoice-header">
            <div className="invoice-logo-box">
              <img
                src="/IMG/logo.png"
                alt="TechMobile Logo"
                className="invoice-logo-img"
              />

              <div>
                <h2>TechMobile</h2>
                <p>Website bán điện thoại</p>
              </div>
            </div>

            <div className="text-end">
              <h3>HÓA ĐƠN BÁN HÀNG</h3>
              <p>Mã đơn: #{order.id}</p>
            </div>
          </div>

          <hr />

          <div className="invoice-info-grid">
            <div>
              <p><strong>Khách hàng:</strong> {order.customerName}</p>
              <p><strong>Người nhận:</strong> {order.receiverName}</p>
              <p><strong>Số điện thoại:</strong> {order.phone}</p>
              <p><strong>Địa chỉ:</strong> {order.address}</p>
            </div>

            <div>
              <p><strong>Ngày đặt:</strong> {order.createdAt}</p>
              <p><strong>Trạng thái đơn:</strong> {getStatusText(order.status)}</p>
              <p><strong>Phương thức:</strong> {order.paymentMethod}</p>
              <p>
                <strong>Thanh toán:</strong>{' '}
                {order.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
              </p>
            </div>
          </div>

          <table className="table table-bordered align-middle text-center mt-3">
            <thead>
              <tr>
                <th>STT</th>
                <th>Sản phẩm</th>
                <th>Giá</th>
                <th>Số lượng</th>
                <th>Thành tiền</th>
              </tr>
            </thead>

            <tbody>
              {order.items.map((item, index) => (
                <tr key={item.productId || index}>
                  <td>{index + 1}</td>
                  <td>{item.name}</td>
                  <td>{formatPrice(item.price)}</td>
                  <td>{item.quantity}</td>
                  <td>{formatPrice(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="invoice-total-box">
            {order.productDiscount > 0 && (
              <p>
                <span>Giảm giá sản phẩm:</span>
                <strong>-{formatPrice(order.productDiscount)}</strong>
              </p>
            )}

            {order.coupon && (
              <p>
                <span>Mã giảm giá:</span>
                <strong>{order.coupon.code}</strong>
              </p>
            )}

            {order.couponDiscount > 0 && (
              <p>
                <span>Giảm mã khuyến mãi:</span>
                <strong>-{formatPrice(order.couponDiscount)}</strong>
              </p>
            )}

            <h4>
              <span className="fs-5">Tổng thanh toán:</span>
              <strong className="fs-3">{formatPrice(order.totalPrice)}</strong>
            </h4>
          </div>
        </div>

        <div className="invoice-actions no-print">
          <button className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>

          <button className="btn btn-danger" onClick={handlePrint}>
            In hóa đơn
          </button>
        </div>
      </div>
    </div>
  )
}

export default OrderInvoiceModal