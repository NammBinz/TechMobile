import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { formatPrice } from '../../utils/formatPrice'
import { getCurrentUser } from '../../utils/auth'
import { showToast } from '../../utils/shopActions'
import OrderInvoiceModal from '../../components/OrderInvoiceModal'

function OrderHistory() {
  const [orders, setOrders] = useState([])
  const [reviews, setReviews] = useState([])
  const [invoiceOrder, setInvoiceOrder] = useState(null)
  const [cancelOrder, setCancelOrder] = useState(null)
  const [cancelReason, setCancelReason] = useState('')

  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    order: null,
    product: null
  })

  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: ''
  })

  const currentUser = getCurrentUser()

  useEffect(() => {
    getOrders()
    getReviews()
  }, [])

  const getOrders = async () => {
    try {
      if (!currentUser) {
        setOrders([])
        return
      }

      const res = await api.get('/orders')

      const userOrders = res.data.filter((order) => {
        return order.userId === currentUser.id
      })

      setOrders([...userOrders].reverse())
    } catch (error) {
      console.log(error)
    }
  }

  const getReviews = async () => {
    try {
      const res = await api.get('/reviews')
      setReviews(res.data)
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

  const getCouponText = (coupon) => {
    if (!coupon) return ''

    if (coupon.discountType === 'amount') {
      return formatPrice(coupon.discount)
    }

    return `${coupon.discount}%`
  }

  const openCancelModal = (order) => {
    if (order.status !== 'pending') {
      showToast('Chỉ có thể hủy đơn hàng đang chờ xác nhận', 'warning')
      return
    }

    setCancelOrder(order)
    setCancelReason('')
  }

  const closeCancelModal = () => {
    setCancelOrder(null)
    setCancelReason('')
  }

  const handleSubmitCancelOrder = async (e) => {
    e.preventDefault()

    if (!cancelReason.trim()) {
      showToast('Vui lòng nhập lý do hủy đơn hàng', 'warning')
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
        cancelledBy: 'customer',
        cancelledAt: new Date().toLocaleDateString('vi-VN')
      })

      showToast('Đã hủy đơn hàng và hoàn lại tồn kho', 'info')
      closeCancelModal()
      getOrders()
    } catch (error) {
      console.log(error)
      showToast('Có lỗi xảy ra khi hủy đơn hàng', 'warning')
    }
  }

  const handleConfirmReceived = async (order) => {
    if (order.status !== 'delivered') {
      showToast('Chỉ xác nhận nhận hàng khi đơn đã được giao', 'warning')
      return
    }

    const confirmReceived = window.confirm(
      'Bạn xác nhận đã nhận được hàng? Sau khi xác nhận, đơn hàng sẽ hoàn thành.'
    )

    if (!confirmReceived) return

    const today = new Date().toLocaleDateString('vi-VN')

    const updateData = {
      status: 'completed',
      completedAt: today
    }

    if (order.paymentMethod === 'COD') {
      updateData.paymentStatus = 'paid'
      updateData.paidAt = today
      updateData.paidBy = 'customer_cod'
    }

    try {
      await api.patch(`/orders/${order.id}`, updateData)

      showToast('Cảm ơn bạn đã xác nhận nhận hàng', 'success')
      getOrders()
    } catch (error) {
      console.log(error)
      showToast('Có lỗi xảy ra khi xác nhận nhận hàng', 'warning')
    }
  }

  const hasReviewed = (orderId, productId) => {
    return reviews.some((review) => {
      return (
        review.orderId === orderId &&
        review.productId === productId &&
        review.userId === currentUser.id
      )
    })
  }

  const openReviewModal = (order, product) => {
    setReviewModal({
      isOpen: true,
      order,
      product
    })

    setReviewForm({
      rating: 5,
      comment: ''
    })
  }

  const closeReviewModal = () => {
    setReviewModal({
      isOpen: false,
      order: null,
      product: null
    })

    setReviewForm({
      rating: 5,
      comment: ''
    })
  }

  const handleReviewChange = (e) => {
    const { name, value } = e.target

    setReviewForm({
      ...reviewForm,
      [name]: value
    })
  }

  const handleSubmitReview = async (e) => {
    e.preventDefault()

    if (!reviewForm.comment.trim()) {
      showToast('Vui lòng nhập nội dung đánh giá', 'warning')
      return
    }

    const order = reviewModal.order
    const product = reviewModal.product

    if (!order || !product) return

    if (hasReviewed(order.id, product.productId)) {
      showToast('Bạn đã đánh giá sản phẩm này rồi', 'warning')
      return
    }

    const newReview = {
      id: Date.now().toString(),
      orderId: order.id,
      productId: product.productId,
      userId: currentUser.id,
      userName: currentUser.fullName,
      rating: Number(reviewForm.rating),
      comment: reviewForm.comment,
      createdAt: new Date().toLocaleDateString('vi-VN')
    }

    try {
      await api.post('/reviews', newReview)

      const reviewRes = await api.get('/reviews')

      const allReviews = reviewRes.data.filter((review) => {
        return review.productId === product.productId
      })

      const avgRating = Math.round(
        allReviews.reduce((sum, review) => {
          return sum + Number(review.rating)
        }, 0) / allReviews.length
      )

      await api.patch(`/products/${product.productId}`, {
        rating: avgRating,
        reviews: allReviews.length
      })

      showToast('Đánh giá sản phẩm thành công', 'success')
      closeReviewModal()
      getReviews()
    } catch (error) {
      console.log(error)
      showToast('Có lỗi xảy ra khi gửi đánh giá', 'warning')
    }
  }

  if (!currentUser) {
    return (
      <main className="main">
        <div className="container">
          <div className="product-not-found">
            <h2>Lịch sử mua hàng</h2>
            <p>Bạn cần đăng nhập để xem lịch sử mua hàng.</p>

            <Link to="/login" className="back-home-btn">
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      </main>
    )
  }

  if (orders.length === 0) {
    return (
      <main className="main">
        <div className="container">
          <div className="product-not-found">
            <h2>Lịch sử mua hàng</h2>
            <p>Bạn chưa có đơn hàng nào.</p>

            <Link to="/products" className="back-home-btn">
              Mua hàng ngay
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="main">
      <div className="container">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="col-lg-4">
            <h2 className="mb-1">Lịch sử mua hàng</h2>

            <p className="text-muted mb-0">
              Xin chào, {currentUser.fullName}
            </p>
          </div>

          <Link to="/products" className="btn btn-primary">
            Tiếp tục mua hàng
          </Link>
        </div>

        {orders.map((order) => (
          <div className="card shadow-sm mb-4" key={order.id}>
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <strong>Đơn hàng #{order.id}</strong>

                <span className="ms-3 text-muted">
                  Ngày đặt: {order.createdAt}
                </span>
              </div>

              <span className={getStatusBadge(order.status)}>
                {getStatusText(order.status)}
              </span>
            </div>

            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-6">
                  <p className="mb-1">
                    <strong>Người nhận:</strong> {order.receiverName}
                  </p>

                  <p className="mb-1">
                    <strong>Số điện thoại:</strong> {order.phone}
                  </p>

                  <p className="mb-1">
                    <strong>Địa chỉ:</strong> {order.address}
                  </p>
                </div>

                <div className="col-md-6">
                  <p className="mb-1">
                    <strong>Phương thức thanh toán:</strong>{' '}
                    {order.paymentMethod}
                  </p>

                  <p className="mb-1">
                    <strong>Trạng thái thanh toán:</strong>{' '}
                    {order.paymentStatus === 'paid' ? (
                      <span className="badge bg-success">Đã thanh toán</span>
                    ) : (
                      <span className="badge bg-secondary">Chưa thanh toán</span>
                    )}
                  </p>

                  <p className="mb-1">
                    <strong>Ghi chú:</strong> {order.note || 'Không có'}
                  </p>

                  {order.coupon && (
                    <p className="mb-1">
                      <strong>Mã giảm giá:</strong> {order.coupon.code} - giảm{' '}
                      {getCouponText(order.coupon)}
                    </p>
                  )}
                </div>
              </div>

              {order.status === 'cancelled' && order.cancelReason && (
                <div className="alert alert-danger py-2">
                  <strong>Lý do hủy:</strong> {order.cancelReason}

                  <br />

                  <small>
                    Người hủy:{' '}
                    {order.cancelledBy === 'admin'
                      ? 'Quản trị viên'
                      : 'Khách hàng'}
                    {order.cancelledAt ? ` - ${order.cancelledAt}` : ''}
                  </small>
                </div>
              )}

              {order.status === 'delivered' && order.deliveredAt && (
                <div className="alert alert-primary py-2">
                  <strong>Đã giao hàng:</strong> {order.deliveredAt}
                  <br />
                  <small>
                    Vui lòng xác nhận đã nhận hàng để hoàn thành đơn hàng.
                  </small>
                </div>
              )}

              {order.status === 'completed' && order.completedAt && (
                <div className="alert alert-success py-2">
                  <strong>Đơn hàng hoàn thành:</strong> {order.completedAt}
                </div>
              )}

              <div className="table-responsive">
                <table className="table table-bordered align-middle text-center">
                  <thead>
                    <tr>
                      <th>Ảnh</th>
                      <th>Sản phẩm</th>
                      <th>Giá</th>
                      <th>Số lượng</th>
                      <th>Thành tiền</th>
                      <th>Đánh giá</th>
                    </tr>
                  </thead>

                  <tbody>
                    {order.items.map((item, index) => (
                      <tr key={`${order.id}-${item.productId}-${index}`}>
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

                        <td>
                          {order.status !== 'completed' ? (
                            <span className="text-muted">
                              Chờ hoàn thành
                            </span>
                          ) : hasReviewed(order.id, item.productId) ? (
                            <span className="badge bg-success">
                              Đã đánh giá
                            </span>
                          ) : (
                            <button
                              className="btn btn-sm btn-warning"
                              onClick={() => openReviewModal(order, item)}
                            >
                              Đánh giá
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-3">
                <div className="d-flex gap-2 flex-wrap">
                  <button
                    className="btn btn-outline-primary"
                    onClick={() => setInvoiceOrder(order)}
                  >
                    Xem hóa đơn
                  </button>

                  {order.status === 'pending' && (
                    <button
                      className="btn btn-outline-danger"
                      onClick={() => openCancelModal(order)}
                    >
                      Hủy đơn hàng
                    </button>
                  )}

                  {order.status === 'delivered' && (
                    <button
                      className="btn btn-success"
                      onClick={() => handleConfirmReceived(order)}
                    >
                      Tôi đã nhận hàng
                    </button>
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
        ))}

        {reviewModal.isOpen && (
          <div className="review-modal-overlay">
            <div className="review-modal-box">
              <h3>Đánh giá sản phẩm</h3>

              <p className="text-muted">
                {reviewModal.product?.name}
              </p>

              <form onSubmit={handleSubmitReview}>
                <div className="mb-3">
                  <label className="form-label">Số sao</label>

                  <select
                    className="form-select"
                    name="rating"
                    value={reviewForm.rating}
                    onChange={handleReviewChange}
                  >
                    <option value="5">5 sao - Rất tốt</option>
                    <option value="4">4 sao - Tốt</option>
                    <option value="3">3 sao - Bình thường</option>
                    <option value="2">2 sao - Chưa tốt</option>
                    <option value="1">1 sao - Kém</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">Nội dung đánh giá</label>

                  <textarea
                    className="form-control"
                    rows="4"
                    name="comment"
                    value={reviewForm.comment}
                    onChange={handleReviewChange}
                    placeholder="Đánh giá trải nghiệm mua hàng của bạn..."
                  ></textarea>
                </div>

                <div className="d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeReviewModal}
                  >
                    Hủy
                  </button>

                  <button type="submit" className="btn btn-success">
                    Gửi đánh giá
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {cancelOrder && (
          <div className="review-modal-overlay">
            <div className="review-modal-box">
              <h3>Lý do hủy đơn hàng</h3>

              <p className="text-muted">
                Đơn hàng #{cancelOrder.id}
              </p>

              <form onSubmit={handleSubmitCancelOrder}>
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
                  onClick={closeCancelModal}
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
      </div>
    </main>
  )
}

export default OrderHistory